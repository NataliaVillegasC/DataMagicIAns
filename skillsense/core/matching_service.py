"""
Matching Service for candidate-vacancy affinity calculation.

Calculates compatibility scores between candidates and vacancies
based on skills, technologies, and other factors.
"""

import logging
from typing import Dict, List, Optional
from decimal import Decimal
from django.db.models import Count


logger = logging.getLogger(__name__)


class MatchingService:
    """
    Service for calculating candidate-vacancy match scores.
    
    Scoring algorithm:
    - Skills: 60% weight (required skills fully matched is critical)
    - Technologies: 35% weight (percentage of technologies matched)
    - Other factors: 5% weight (location, etc.)
    """
    
    # Weights for scoring
    SKILL_WEIGHT = 0.60
    TECHNOLOGY_WEIGHT = 0.35
    OTHER_WEIGHT = 0.05
    
    # Penalties and bonuses
    MISSING_REQUIRED_SKILL_PENALTY = 20.0  # Per missing required skill
    EXTRA_SKILL_BONUS = 2.0  # Per extra skill candidate has
    MAX_EXTRA_SKILL_BONUS = 15.0
    
    def calculate_match(self, vacancy, candidate) -> Dict:
        """
        Calculate match score between vacancy and candidate.
        
        Args:
            vacancy: Vacancy instance
            candidate: Candidate instance
            
        Returns:
            Dict with match details and total score
        """
        # Calculate skill match
        skill_details = self._calculate_skill_match(vacancy, candidate)
        
        # Calculate technology match
        tech_details = self._calculate_technology_match(vacancy, candidate)
        
        # Calculate other factors
        other_score = self._calculate_other_factors(vacancy, candidate)
        
        # Weighted total score
        total_score = (
            skill_details['score'] * self.SKILL_WEIGHT +
            tech_details['score'] * self.TECHNOLOGY_WEIGHT +
            other_score * self.OTHER_WEIGHT
        )
        
        # Ensure score is between 0-100
        total_score = max(0.0, min(100.0, total_score))
        
        return {
            'total_score': round(total_score, 2),
            'skills': skill_details,
            'technologies': tech_details,
            'weights_used': {
                'skills': self.SKILL_WEIGHT,
                'technologies': self.TECHNOLOGY_WEIGHT,
                'other': self.OTHER_WEIGHT,
            }
        }
    
    def _calculate_skill_match(self, vacancy, candidate) -> Dict:
        """Calculate skill matching score."""
        # Get required and optional skills from vacancy
        vacancy_skill_reqs = vacancy.skill_requirements.all()
        required_skills = [sr.skill for sr in vacancy_skill_reqs if sr.required]
        optional_skills = [sr.skill for sr in vacancy_skill_reqs if not sr.required]
        
        # Get candidate skills (direct M2M with Skill model)
        candidate_skill_ids = set(candidate.skills.values_list('id', flat=True))
        
        # Calculate required skills match
        required_skill_ids = set(s.id for s in required_skills)
        matched_required = required_skill_ids & candidate_skill_ids
        missing_required = required_skill_ids - candidate_skill_ids
        
        required_match_rate = (
            len(matched_required) / len(required_skill_ids) * 100
            if required_skill_ids else 100.0
        )
        
        # Calculate optional skills match
        optional_skill_ids = set(s.id for s in optional_skills)
        matched_optional = optional_skill_ids & candidate_skill_ids
        
        optional_match_rate = (
            len(matched_optional) / len(optional_skill_ids) * 100
            if optional_skill_ids else 0.0
        )
        
        # Calculate extra skills (candidate has more than required)
        all_vacancy_skills = required_skill_ids | optional_skill_ids
        extra_skills = candidate_skill_ids - all_vacancy_skills
        extra_skills_count = len(extra_skills)
        
        # Base score on required skills
        base_score = required_match_rate
        
        # Apply penalties for missing required skills
        penalty = len(missing_required) * self.MISSING_REQUIRED_SKILL_PENALTY
        
        # Apply bonus for optional skills matched
        optional_bonus = (optional_match_rate / 100) * 10  # Max 10 points bonus
        
        # Apply bonus for extra skills (shows broader experience)
        extra_bonus = min(extra_skills_count * self.EXTRA_SKILL_BONUS, self.MAX_EXTRA_SKILL_BONUS)
        
        # Final skill score
        final_score = base_score - penalty + optional_bonus + extra_bonus
        final_score = max(0.0, min(100.0, final_score))
        
        return {
            'score': round(final_score, 2),
            'required_skills': {
                'total': len(required_skill_ids),
                'matched': len(matched_required),
                'missing': len(missing_required),
                'match_rate': round(required_match_rate, 2),
            },
            'optional_skills': {
                'total': len(optional_skill_ids),
                'matched': len(matched_optional),
                'match_rate': round(optional_match_rate, 2),
            },
            'extra_skills_count': extra_skills_count,
            'penalty_applied': round(penalty, 2),
            'bonus_applied': round(optional_bonus + extra_bonus, 2),
        }
    
    def _calculate_technology_match(self, vacancy, candidate) -> Dict:
        """Calculate technology matching score."""
        vacancy_tech_ids = set(vacancy.technologies.values_list('id', flat=True))
        candidate_tech_ids = set(candidate.technologies.values_list('id', flat=True))
        
        if not vacancy_tech_ids:
            # No technologies required, perfect match
            return {
                'score': 100.0,
                'total': 0,
                'matched': 0,
                'match_rate': 100.0,
            }
        
        matched_techs = vacancy_tech_ids & candidate_tech_ids
        match_rate = len(matched_techs) / len(vacancy_tech_ids) * 100
        
        return {
            'score': round(match_rate, 2),
            'total': len(vacancy_tech_ids),
            'matched': len(matched_techs),
            'match_rate': round(match_rate, 2),
        }
    
    def _calculate_other_factors(self, vacancy, candidate) -> float:
        """Calculate other matching factors (location, etc.)."""
        score = 50.0  # Base score
        
        # Location match bonus
        if vacancy.location and candidate.location:
            if vacancy.location.lower() in candidate.location.lower() or \
               candidate.location.lower() in vacancy.location.lower():
                score += 50.0
        
        return min(100.0, score)
    
    def match_vacancy_to_candidates(
        self,
        vacancy,
        min_score: float = 50.0,
        top_n: int = 10
    ) -> List[Dict]:
        """
        Find best matching candidates for a vacancy.
        
        Args:
            vacancy: Vacancy instance
            min_score: Minimum match score to include (0-100)
            top_n: Maximum number of candidates to return
            
        Returns:
            List of candidate matches sorted by score (descending)
        """
        from users.models import Candidate
        
        # Get all candidates from same company
        candidates = Candidate.objects.filter(
            registrated_by__company=vacancy.company
        ).prefetch_related(
            'skills',
            'technologies',
            'cv_file'
        )
        
        matches = []
        
        for candidate in candidates:
            match_result = self.calculate_match(vacancy, candidate)
            
            if match_result['total_score'] >= min_score:
                matches.append({
                    'candidate': {
                        'id': str(candidate.id),
                        'full_name': candidate.full_name,
                        'email': candidate.email,
                        'phone': candidate.phone,
                        'location': candidate.location,
                        'skills_count': candidate.skills.count(),
                        'technologies_count': candidate.technologies.count(),
                    },
                    'match_score': match_result['total_score'],
                    'match_details': match_result,
                })
        
        # Sort by score (descending) and limit
        matches.sort(key=lambda x: x['match_score'], reverse=True)
        return matches[:top_n]
    
    def get_total_candidates(self) -> int:
        """Get total number of candidates evaluated."""
        from users.models import Candidate
        return Candidate.objects.count()

