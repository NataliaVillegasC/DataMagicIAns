"""
Signals for automatic candidate-vacancy matching.

Creates SUGGESTED applications when:
- A new candidate is created → match with ACTIVE vacancies
- A new vacancy is created → match with all candidates
- Technologies/skills are added to an ACTIVE vacancy → match with candidates
"""

import logging
from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from django.db import transaction
from decimal import Decimal

from users.models import Candidate
from .models import Vacancy, Application, ApplicationStatus, VacancyStatus
from .matching_engine import get_vacancy_matcher


logger = logging.getLogger(__name__)

# Configuration
AUTO_MATCH_MIN_SCORE = 60.0  # Only create suggestions for matches >= 60%
AUTO_MATCH_TOP_N = 5  # Max number of suggestions to create per candidate/vacancy

# Flag to prevent duplicate runs
_matching_in_progress = set()


@receiver(post_save, sender=Candidate)
def auto_match_candidate_to_vacancies(sender, instance, created, **kwargs):
    """
    When a new candidate is created, automatically find matching vacancies
    and create SUGGESTED applications.

    Only runs on creation, not updates.
    """
    if not created:
        # Only run for new candidates
        return

    # Skip if candidate has no skills or technologies (nothing to match)
    if not instance.skills.exists() and not instance.technologies.exists():
        logger.info(
            f"Skipping auto-match for candidate {instance.id}: "
            "No skills or technologies"
        )
        return

    logger.info(f"Auto-matching new candidate {instance.id} to vacancies...")

    # Get company from candidate's registrator
    company = instance.registrated_by.company

    # Get all ACTIVE vacancies for this company
    active_vacancies = Vacancy.objects.filter(
        company=company,
        status=VacancyStatus.ACTIVE
    ).prefetch_related('skill_requirements', 'technologies')

    if not active_vacancies.exists():
        logger.info(f"No ACTIVE vacancies found for company {company.id}")
        return

    # Prepare candidate data
    candidate_skills = set(instance.skills.values_list('id', flat=True))
    candidate_technologies = set(instance.technologies.values_list('id', flat=True))

    # Get matcher
    matcher = get_vacancy_matcher()

    # Calculate matches for each vacancy
    matches = []
    for vacancy in active_vacancies:
        # Check if application already exists
        if Application.objects.filter(
            candidate=instance,
            vacancy=vacancy
        ).exists():
            logger.debug(
                f"Application already exists for candidate {instance.id} "
                f"and vacancy {vacancy.id}"
            )
            continue

        # Get vacancy requirements
        vacancy_required_skills = set(
            vacancy.skill_requirements.filter(required=True).values_list('skill_id', flat=True)
        )
        vacancy_optional_skills = set(
            vacancy.skill_requirements.filter(required=False).values_list('skill_id', flat=True)
        )
        vacancy_technologies = set(vacancy.technologies.values_list('id', flat=True))

        # Calculate match score
        score, details = matcher.calculate_match_score(
            candidate_skills=candidate_skills,
            candidate_technologies=candidate_technologies,
            vacancy_required_skills=vacancy_required_skills,
            vacancy_optional_skills=vacancy_optional_skills,
            vacancy_technologies=vacancy_technologies
        )

        if float(score) >= AUTO_MATCH_MIN_SCORE:
            matches.append({
                'vacancy': vacancy,
                'score': score,
                'details': details
            })

    # Sort by score (descending) and take top N
    matches.sort(key=lambda x: x['score'], reverse=True)
    top_matches = matches[:AUTO_MATCH_TOP_N]

    # Create SUGGESTED applications
    created_count = 0
    with transaction.atomic():
        for match in top_matches:
            Application.objects.create(
                candidate=instance,
                vacancy=match['vacancy'],
                status=ApplicationStatus.SUGGESTED,
                affinity_score=match['score']
            )
            created_count += 1
            logger.info(
                f"Created SUGGESTED application: "
                f"Candidate {instance.id} → Vacancy {match['vacancy'].id} "
                f"(Score: {match['score']}%)"
            )

    if created_count > 0:
        logger.info(
            f"Auto-match complete: Created {created_count} SUGGESTED applications "
            f"for candidate {instance.id}"
        )
    else:
        logger.info(
            f"Auto-match complete: No matches above {AUTO_MATCH_MIN_SCORE}% "
            f"for candidate {instance.id}"
        )


@receiver(post_save, sender=Vacancy)
def auto_match_vacancy_to_candidates(sender, instance, created, **kwargs):
    """
    When a new vacancy is created, automatically find matching candidates
    and create SUGGESTED applications.

    Only runs on creation, not updates.
    """
    if not created:
        # Only run for new vacancies
        return

    # Only auto-match for ACTIVE vacancies
    if instance.status != VacancyStatus.ACTIVE:
        logger.info(
            f"Skipping auto-match for vacancy {instance.id}: "
            f"Status is {instance.status}, not ACTIVE"
        )
        return

    # Skip if vacancy has no requirements (nothing to match)
    if not instance.skill_requirements.exists() and not instance.technologies.exists():
        logger.info(
            f"Skipping auto-match for vacancy {instance.id}: "
            "No skill requirements or technologies"
        )
        return

    logger.info(f"Auto-matching new vacancy {instance.id} to candidates...")

    # Get all candidates for this company
    candidates = Candidate.objects.filter(
        registrated_by__company=instance.company
    ).prefetch_related('skills', 'technologies')

    if not candidates.exists():
        logger.info(f"No candidates found for company {instance.company.id}")
        return

    # Prepare vacancy data
    vacancy_required_skills = set(
        instance.skill_requirements.filter(required=True).values_list('skill_id', flat=True)
    )
    vacancy_optional_skills = set(
        instance.skill_requirements.filter(required=False).values_list('skill_id', flat=True)
    )
    vacancy_technologies = set(instance.technologies.values_list('id', flat=True))

    # Get matcher
    matcher = get_vacancy_matcher()

    # Calculate matches for each candidate
    matches = []
    for candidate in candidates:
        # Check if application already exists
        if Application.objects.filter(
            candidate=candidate,
            vacancy=instance
        ).exists():
            logger.debug(
                f"Application already exists for candidate {candidate.id} "
                f"and vacancy {instance.id}"
            )
            continue

        # Get candidate skills/tech
        candidate_skills = set(candidate.skills.values_list('id', flat=True))
        candidate_technologies = set(candidate.technologies.values_list('id', flat=True))

        # Skip if candidate has no skills or tech
        if not candidate_skills and not candidate_technologies:
            continue

        # Calculate match score
        score, details = matcher.calculate_match_score(
            candidate_skills=candidate_skills,
            candidate_technologies=candidate_technologies,
            vacancy_required_skills=vacancy_required_skills,
            vacancy_optional_skills=vacancy_optional_skills,
            vacancy_technologies=vacancy_technologies
        )

        if float(score) >= AUTO_MATCH_MIN_SCORE:
            matches.append({
                'candidate': candidate,
                'score': score,
                'details': details
            })

    # Sort by score (descending) and take top N
    matches.sort(key=lambda x: x['score'], reverse=True)
    top_matches = matches[:AUTO_MATCH_TOP_N]

    # Create SUGGESTED applications
    created_count = 0
    with transaction.atomic():
        for match in top_matches:
            Application.objects.create(
                candidate=match['candidate'],
                vacancy=instance,
                status=ApplicationStatus.SUGGESTED,
                affinity_score=match['score']
            )
            created_count += 1
            logger.info(
                f"Created SUGGESTED application: "
                f"Candidate {match['candidate'].id} → Vacancy {instance.id} "
                f"(Score: {match['score']}%)"
            )

    if created_count > 0:
        logger.info(
            f"Auto-match complete: Created {created_count} SUGGESTED applications "
            f"for vacancy {instance.id}"
        )
    else:
        logger.info(
            f"Auto-match complete: No matches above {AUTO_MATCH_MIN_SCORE}% "
            f"for vacancy {instance.id}"
        )


def perform_vacancy_matching(vacancy):
    """
    Helper function to perform matching for a vacancy.

    Can be called from post_save or m2m_changed signals.
    """
    # Prevent duplicate runs
    vacancy_key = f"vacancy_{vacancy.id}"
    if vacancy_key in _matching_in_progress:
        logger.debug(f"Matching already in progress for vacancy {vacancy.id}, skipping")
        return

    try:
        _matching_in_progress.add(vacancy_key)

        # Only auto-match for ACTIVE vacancies
        if vacancy.status != VacancyStatus.ACTIVE:
            logger.debug(
                f"Skipping auto-match for vacancy {vacancy.id}: "
                f"Status is {vacancy.status}, not ACTIVE"
            )
            return

        # Skip if vacancy has no requirements (nothing to match)
        if not vacancy.skill_requirements.exists() and not vacancy.technologies.exists():
            logger.debug(
                f"Skipping auto-match for vacancy {vacancy.id}: "
                "No skill requirements or technologies"
            )
            return

        logger.info(f"Auto-matching vacancy {vacancy.id} to candidates...")

        # Get all candidates for this company
        candidates = Candidate.objects.filter(
            registrated_by__company=vacancy.company
        ).prefetch_related('skills', 'technologies')

        if not candidates.exists():
            logger.info(f"No candidates found for company {vacancy.company.id}")
            return

        # Prepare vacancy data
        vacancy_required_skills = set(
            vacancy.skill_requirements.filter(required=True).values_list('skill_id', flat=True)
        )
        vacancy_optional_skills = set(
            vacancy.skill_requirements.filter(required=False).values_list('skill_id', flat=True)
        )
        vacancy_technologies = set(vacancy.technologies.values_list('id', flat=True))

        # Get matcher
        matcher = get_vacancy_matcher()

        # Calculate matches for each candidate
        matches = []
        for candidate in candidates:
            # Check if application already exists
            if Application.objects.filter(
                candidate=candidate,
                vacancy=vacancy
            ).exists():
                logger.debug(
                    f"Application already exists for candidate {candidate.id} "
                    f"and vacancy {vacancy.id}"
                )
                continue

            # Get candidate skills/tech
            candidate_skills = set(candidate.skills.values_list('id', flat=True))
            candidate_technologies = set(candidate.technologies.values_list('id', flat=True))

            # Skip if candidate has no skills or tech
            if not candidate_skills and not candidate_technologies:
                continue

            # Calculate match score
            score, details = matcher.calculate_match_score(
                candidate_skills=candidate_skills,
                candidate_technologies=candidate_technologies,
                vacancy_required_skills=vacancy_required_skills,
                vacancy_optional_skills=vacancy_optional_skills,
                vacancy_technologies=vacancy_technologies
            )

            if float(score) >= AUTO_MATCH_MIN_SCORE:
                matches.append({
                    'candidate': candidate,
                    'score': score,
                    'details': details
                })

        # Sort by score (descending) and take top N
        matches.sort(key=lambda x: x['score'], reverse=True)
        top_matches = matches[:AUTO_MATCH_TOP_N]

        # Create SUGGESTED applications
        created_count = 0
        with transaction.atomic():
            for match in top_matches:
                Application.objects.create(
                    candidate=match['candidate'],
                    vacancy=vacancy,
                    status=ApplicationStatus.SUGGESTED,
                    affinity_score=match['score']
                )
                created_count += 1
                logger.info(
                    f"Created SUGGESTED application: "
                    f"Candidate {match['candidate'].id} → Vacancy {vacancy.id} "
                    f"(Score: {match['score']}%)"
                )

        if created_count > 0:
            logger.info(
                f"Auto-match complete: Created {created_count} SUGGESTED applications "
                f"for vacancy {vacancy.id}"
            )
        else:
            logger.info(
                f"Auto-match complete: No matches above {AUTO_MATCH_MIN_SCORE}% "
                f"for vacancy {vacancy.id}"
            )
    finally:
        _matching_in_progress.discard(vacancy_key)


@receiver(m2m_changed, sender=Vacancy.technologies.through)
def vacancy_technologies_changed(sender, instance, action, **kwargs):
    """
    When technologies are added to an ACTIVE vacancy, trigger auto-matching.

    This handles the case where a vacancy is created and then technologies
    are added via the API (which happens after post_save).
    """
    if action == 'post_add':
        logger.debug(f"Technologies added to vacancy {instance.id}, triggering auto-match")
        perform_vacancy_matching(instance)


@receiver(m2m_changed, sender=Vacancy.skill_requirements.through)
def vacancy_skill_requirements_changed(sender, instance, action, **kwargs):
    """
    When skill requirements are added to an ACTIVE vacancy, trigger auto-matching.

    This handles the case where a vacancy is created and then skill requirements
    are added via the API (which happens after post_save).
    """
    if action == 'post_add':
        logger.debug(f"Skill requirements added to vacancy {instance.id}, triggering auto-match")
        perform_vacancy_matching(instance)
