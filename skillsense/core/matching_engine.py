"""
Candidate-Vacancy Matching Engine.

Implements sophisticated algorithms for calculating synergy/affinity between
candidates and job vacancies based on skills and technologies.

Uses weighted scoring with multiple matching strategies for robust results.
"""

import logging
from typing import Dict, List, Tuple, Set
from decimal import Decimal
from dataclasses import dataclass


logger = logging.getLogger(__name__)


@dataclass
class MatchingWeights:
    """Configurable weights for different matching components."""

    # Primary weights (sum should be 1.0)
    skills_weight: float = 0.60  # 60% - Skills are most important
    technologies_weight: float = 0.35  # 35% - Technologies are second
    other_factors_weight: float = 0.05  # 5% - Future: location, experience, etc.

    # Sub-weights for skills matching
    required_skills_weight: float = 0.70  # 70% of skills score
    optional_skills_weight: float = 0.30  # 30% of skills score

    # Penalties and bonuses
    missing_required_skill_penalty: float = 0.15  # -15% per missing required skill
    extra_skill_bonus: float = 0.05  # +5% bonus for extra relevant skills (max 20%)


class VacancyCandidateMatcher:
    """
    Engine for matching candidates to vacancies.

    Uses a sophisticated weighted algorithm that considers:
    - Skills matching (with required vs optional distinction)
    - Technologies matching (exact and partial matches)
    - Configurable weights for different components

    Algorithm design:
    1. Exact matching for core requirements
    2. Partial matching for additional skills
    3. Weighted scoring with penalties for missing required skills
    4. Bonuses for extra relevant skills (up to limit)
    """

    def __init__(self, weights: MatchingWeights = None):
        """
        Initialize matcher with configurable weights.

        Args:
            weights: Custom MatchingWeights instance. Uses defaults if None.
        """
        self.weights = weights or MatchingWeights()
        self._validate_weights()

    def _validate_weights(self):
        """Validate that weights sum to 1.0."""
        total = (
            self.weights.skills_weight +
            self.weights.technologies_weight +
            self.weights.other_factors_weight
        )
        if not (0.99 <= total <= 1.01):  # Allow small floating point error
            logger.warning(
                f"Matching weights sum to {total}, not 1.0. "
                "Results may not be normalized properly."
            )

    def calculate_match_score(
        self,
        candidate_skills: Set[int],
        candidate_technologies: Set[int],
        vacancy_required_skills: Set[int],
        vacancy_optional_skills: Set[int],
        vacancy_technologies: Set[int],
    ) -> Tuple[Decimal, Dict]:
        """
        Calculate comprehensive match score between candidate and vacancy.

        Args:
            candidate_skills: Set of skill IDs the candidate has
            candidate_technologies: Set of technology IDs the candidate has
            vacancy_required_skills: Set of required skill IDs for vacancy
            vacancy_optional_skills: Set of optional skill IDs for vacancy
            vacancy_technologies: Set of technology IDs for vacancy

        Returns:
            Tuple of (total_score, details_dict)
            - total_score: Decimal from 0 to 100
            - details_dict: Breakdown of scoring components
        """
        # Calculate skills score
        skills_score, skills_details = self._calculate_skills_score(
            candidate_skills,
            vacancy_required_skills,
            vacancy_optional_skills
        )

        # Calculate technologies score
        tech_score, tech_details = self._calculate_technology_score(
            candidate_technologies,
            vacancy_technologies
        )

        # Calculate other factors score (placeholder for future enhancements)
        other_score = 0.0

        # Weighted total score
        total_score = (
            (skills_score * self.weights.skills_weight) +
            (tech_score * self.weights.technologies_weight) +
            (other_score * self.weights.other_factors_weight)
        )

        # Compile details
        details = {
            'total_score': float(total_score),
            'skills': skills_details,
            'technologies': tech_details,
            'weights_used': {
                'skills': self.weights.skills_weight,
                'technologies': self.weights.technologies_weight,
                'other': self.weights.other_factors_weight
            }
        }

        # Convert to Decimal for database storage
        return Decimal(str(round(total_score, 2))), details

    def _calculate_skills_score(
        self,
        candidate_skills: Set[int],
        required_skills: Set[int],
        optional_skills: Set[int]
    ) -> Tuple[float, Dict]:
        """
        Calculate skills matching score with penalties for missing required skills.

        Returns:
            Tuple of (score, details_dict)
        """
        # Required skills matching
        matched_required = candidate_skills & required_skills
        missing_required = required_skills - candidate_skills

        required_match_rate = (
            len(matched_required) / len(required_skills)
            if required_skills else 1.0
        )

        # Optional skills matching
        matched_optional = candidate_skills & optional_skills
        optional_match_rate = (
            len(matched_optional) / len(optional_skills)
            if optional_skills else 0.0
        )

        # Extra skills (candidate has skills not in vacancy requirements)
        all_vacancy_skills = required_skills | optional_skills
        extra_skills = candidate_skills - all_vacancy_skills

        # Calculate base score
        base_score = (
            (required_match_rate * self.weights.required_skills_weight) +
            (optional_match_rate * self.weights.optional_skills_weight)
        ) * 100

        # Apply penalties for missing required skills
        penalty = len(missing_required) * self.weights.missing_required_skill_penalty * 100

        # Apply bonus for extra relevant skills (capped)
        max_bonus = 20.0  # Maximum 20% bonus
        bonus = min(
            len(extra_skills) * self.weights.extra_skill_bonus * 100,
            max_bonus
        )

        # Final score (cannot be negative)
        final_score = max(0, base_score - penalty + bonus)

        details = {
            'score': round(final_score, 2),
            'required_skills': {
                'total': len(required_skills),
                'matched': len(matched_required),
                'missing': len(missing_required),
                'match_rate': round(required_match_rate * 100, 2)
            },
            'optional_skills': {
                'total': len(optional_skills),
                'matched': len(matched_optional),
                'match_rate': round(optional_match_rate * 100, 2)
            },
            'extra_skills_count': len(extra_skills),
            'penalty_applied': round(penalty, 2),
            'bonus_applied': round(bonus, 2)
        }

        return final_score, details

    def _calculate_technology_score(
        self,
        candidate_tech: Set[int],
        vacancy_tech: Set[int]
    ) -> Tuple[float, Dict]:
        """
        Calculate technology matching score.

        Returns:
            Tuple of (score, details_dict)
        """
        if not vacancy_tech:
            # No technology requirements
            score = 100.0 if candidate_tech else 50.0
            details = {
                'score': score,
                'total': 0,
                'matched': 0,
                'match_rate': 100.0,
                'note': 'No technology requirements specified'
            }
            return score, details

        # Exact matches
        matched = candidate_tech & vacancy_tech
        missing = vacancy_tech - candidate_tech
        extra = candidate_tech - vacancy_tech

        match_rate = len(matched) / len(vacancy_tech)

        # Base score from match rate
        base_score = match_rate * 100

        # Small bonus for extra technologies (shows broader skillset)
        extra_bonus = min(len(extra) * 2, 10)  # Max 10% bonus

        final_score = min(100, base_score + extra_bonus)

        details = {
            'score': round(final_score, 2),
            'total': len(vacancy_tech),
            'matched': len(matched),
            'missing': len(missing),
            'extra': len(extra),
            'match_rate': round(match_rate * 100, 2),
            'bonus_applied': round(extra_bonus, 2)
        }

        return final_score, details


class CandidateRanker:
    """
    Ranks multiple candidates for a vacancy.

    Provides utilities for sorting and filtering candidates based on
    match scores with configurable thresholds.
    """

    def __init__(self, matcher: VacancyCandidateMatcher = None):
        """
        Initialize ranker with a matcher instance.

        Args:
            matcher: VacancyCandidateMatcher instance. Creates default if None.
        """
        self.matcher = matcher or VacancyCandidateMatcher()

    def rank_candidates(
        self,
        candidates_data: List[Dict],
        vacancy_data: Dict,
        min_score: float = 0.0
    ) -> List[Dict]:
        """
        Rank multiple candidates for a vacancy.

        Args:
            candidates_data: List of dicts with candidate info:
                {
                    'candidate_id': UUID,
                    'skills': Set[int],
                    'technologies': Set[int]
                }
            vacancy_data: Dict with vacancy requirements:
                {
                    'required_skills': Set[int],
                    'optional_skills': Set[int],
                    'technologies': Set[int]
                }
            min_score: Minimum score threshold (0-100)

        Returns:
            List of candidate match results, sorted by score (descending)
        """
        results = []

        for candidate in candidates_data:
            score, details = self.matcher.calculate_match_score(
                candidate_skills=candidate['skills'],
                candidate_technologies=candidate['technologies'],
                vacancy_required_skills=vacancy_data['required_skills'],
                vacancy_optional_skills=vacancy_data['optional_skills'],
                vacancy_technologies=vacancy_data['technologies']
            )

            if float(score) >= min_score:
                results.append({
                    'candidate_id': candidate['candidate_id'],
                    'score': score,
                    'details': details
                })

        # Sort by score (descending)
        results.sort(key=lambda x: x['score'], reverse=True)

        return results

    def get_top_candidates(
        self,
        candidates_data: List[Dict],
        vacancy_data: Dict,
        top_n: int = 10,
        min_score: float = 50.0
    ) -> List[Dict]:
        """
        Get top N candidates for a vacancy.

        Args:
            candidates_data: List of candidate info dicts
            vacancy_data: Vacancy requirements dict
            top_n: Number of top candidates to return
            min_score: Minimum score threshold

        Returns:
            List of top N candidate match results
        """
        ranked = self.rank_candidates(candidates_data, vacancy_data, min_score)
        return ranked[:top_n]


def get_vacancy_matcher(weights: MatchingWeights = None) -> VacancyCandidateMatcher:
    """
    Factory function to get a matcher instance.

    Args:
        weights: Optional custom weights

    Returns:
        VacancyCandidateMatcher instance
    """
    return VacancyCandidateMatcher(weights)


def get_candidate_ranker(matcher: VacancyCandidateMatcher = None) -> CandidateRanker:
    """
    Factory function to get a ranker instance.

    Args:
        matcher: Optional custom matcher

    Returns:
        CandidateRanker instance
    """
    return CandidateRanker(matcher)
