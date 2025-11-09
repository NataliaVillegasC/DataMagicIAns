"""
Skill and Technology Mapper Service.

Maps extracted skills/keywords from Gemini CV extraction to standardized
O*NET Skills and Technologies for better candidate-vacancy matching.
"""

import logging
from typing import List, Dict, Tuple, Set
from django.db.models import Q
from difflib import SequenceMatcher

from data.models import Skill, Technology, TechnologyCategory

logger = logging.getLogger(__name__)


class SkillTechnologyMapper:
    """
    Maps extracted skills and keywords to O*NET standardized taxonomy.
    
    Uses multiple strategies:
    1. Exact matching (case-insensitive)
    2. Partial matching (contains)
    3. Fuzzy matching (similarity threshold)
    4. Technology category matching
    """
    
    # Minimum similarity score for fuzzy matching (0.0 to 1.0)
    FUZZY_THRESHOLD = 0.75
    
    # Common skill aliases/variations
    SKILL_ALIASES = {
        'python': ['python programming', 'python development', 'python3'],
        'javascript': ['js', 'javascript programming', 'node.js', 'nodejs'],
        'sql': ['structured query language', 'database queries', 'sql queries'],
        'machine learning': ['ml', 'machine learning algorithms', 'ml models'],
        'data analysis': ['data analytics', 'analyzing data', 'data science'],
        'programming': ['coding', 'software development', 'software engineering'],
        'communication': ['verbal communication', 'written communication', 'interpersonal skills'],
        'leadership': ['team leadership', 'leading teams', 'management'],
    }
    
    # Technology name normalization
    TECH_ALIASES = {
        'react': ['reactjs', 'react.js', 'react js'],
        'node.js': ['nodejs', 'node js', 'node'],
        'postgresql': ['postgres', 'psql'],
        'mongodb': ['mongo', 'mongo db'],
        'aws': ['amazon web services', 'amazon aws'],
        'gcp': ['google cloud platform', 'google cloud'],
        'docker': ['docker containers', 'containerization'],
        'kubernetes': ['k8s', 'kube'],
    }
    
    def __init__(self):
        """Initialize the mapper with caching."""
        self._skill_cache = {}
        self._tech_cache = {}
        self._category_cache = {}
    
    def map_skills_and_technologies(
        self, 
        generic_skills: List[str], 
        keywords: List[str]
    ) -> Tuple[List[Skill], List[Technology]]:
        """
        Map extracted skills and keywords to O*NET entities.
        
        Args:
            generic_skills: List of skills from CV (e.g., ["Python", "Django"])
            keywords: List of keywords from CV (broader terms)
            
        Returns:
            Tuple of (matched_skills, matched_technologies)
        """
        # Combine and deduplicate
        all_terms = list(set(generic_skills + keywords))
        
        logger.info(f"Mapping {len(all_terms)} terms to O*NET taxonomy")
        
        matched_skills = []
        matched_technologies = []
        
        for term in all_terms:
            if not term or not isinstance(term, str):
                continue
            
            term_clean = term.strip()
            if not term_clean:
                continue
            
            # Try to match as technology first (more specific)
            tech = self._match_technology(term_clean)
            if tech:
                matched_technologies.append(tech)
                logger.debug(f"Matched technology: {term_clean} → {tech.example}")
                continue
            
            # Try to match as skill
            skill = self._match_skill(term_clean)
            if skill:
                matched_skills.append(skill)
                logger.debug(f"Matched skill: {term_clean} → {skill.element_name}")
        
        # Deduplicate
        unique_skills = list({s.id: s for s in matched_skills}.values())
        unique_techs = list({t.id: t for t in matched_technologies}.values())
        
        logger.info(
            f"Mapping complete: {len(unique_skills)} skills, "
            f"{len(unique_techs)} technologies from {len(all_terms)} terms"
        )
        
        return unique_skills, unique_techs
    
    def _match_technology(self, term: str) -> Technology:
        """
        Match a term to a Technology in O*NET database.
        
        Strategy:
        1. Exact match (case-insensitive)
        2. Check aliases
        3. Partial match (contains)
        4. Fuzzy match
        """
        term_lower = term.lower()
        
        # Check cache
        if term_lower in self._tech_cache:
            return self._tech_cache[term_lower]
        
        # 1. Exact match
        try:
            tech = Technology.objects.get(example__iexact=term)
            self._tech_cache[term_lower] = tech
            return tech
        except Technology.DoesNotExist:
            pass
        except Technology.MultipleObjectsReturned:
            # Return first match
            tech = Technology.objects.filter(example__iexact=term).first()
            self._tech_cache[term_lower] = tech
            return tech
        
        # 2. Check aliases
        for canonical, aliases in self.TECH_ALIASES.items():
            if term_lower in aliases or term_lower == canonical:
                try:
                    tech = Technology.objects.get(example__iexact=canonical)
                    self._tech_cache[term_lower] = tech
                    return tech
                except Technology.DoesNotExist:
                    pass
        
        # 3. Partial match (contains)
        techs = Technology.objects.filter(
            Q(example__icontains=term) | Q(example__icontains=term_lower)
        )[:5]  # Limit results
        
        if techs.exists():
            # Return best match (shortest name = more specific)
            best_match = min(techs, key=lambda t: len(t.example))
            self._tech_cache[term_lower] = best_match
            return best_match
        
        # 4. Fuzzy match
        all_techs = Technology.objects.all()[:1000]  # Limit for performance
        best_score = 0
        best_tech = None
        
        for tech in all_techs:
            score = self._similarity(term_lower, tech.example.lower())
            if score > best_score and score >= self.FUZZY_THRESHOLD:
                best_score = score
                best_tech = tech
        
        if best_tech:
            self._tech_cache[term_lower] = best_tech
            return best_tech
        
        return None
    
    def _match_skill(self, term: str) -> Skill:
        """
        Match a term to a Skill in O*NET database.
        
        Strategy:
        1. Exact match (case-insensitive)
        2. Check aliases
        3. Partial match (contains)
        4. Fuzzy match
        """
        term_lower = term.lower()
        
        # Check cache
        if term_lower in self._skill_cache:
            return self._skill_cache[term_lower]
        
        # 1. Exact match
        try:
            skill = Skill.objects.get(element_name__iexact=term)
            self._skill_cache[term_lower] = skill
            return skill
        except Skill.DoesNotExist:
            pass
        except Skill.MultipleObjectsReturned:
            skill = Skill.objects.filter(element_name__iexact=term).first()
            self._skill_cache[term_lower] = skill
            return skill
        
        # 2. Check aliases
        for canonical, aliases in self.SKILL_ALIASES.items():
            if term_lower in aliases or term_lower == canonical:
                try:
                    skill = Skill.objects.get(element_name__icontains=canonical)
                    self._skill_cache[term_lower] = skill
                    return skill
                except (Skill.DoesNotExist, Skill.MultipleObjectsReturned):
                    pass
        
        # 3. Partial match (contains)
        skills = Skill.objects.filter(
            Q(element_name__icontains=term) | Q(element_name__icontains=term_lower)
        )[:5]
        
        if skills.exists():
            # Return best match (shortest name = more specific)
            best_match = min(skills, key=lambda s: len(s.element_name))
            self._skill_cache[term_lower] = best_match
            return best_match
        
        # 4. Fuzzy match
        all_skills = Skill.objects.all()[:500]  # Limit for performance
        best_score = 0
        best_skill = None
        
        for skill in all_skills:
            score = self._similarity(term_lower, skill.element_name.lower())
            if score > best_score and score >= self.FUZZY_THRESHOLD:
                best_score = score
                best_skill = skill
        
        if best_skill:
            self._skill_cache[term_lower] = best_skill
            return best_skill
        
        return None
    
    def _similarity(self, a: str, b: str) -> float:
        """Calculate similarity ratio between two strings."""
        return SequenceMatcher(None, a, b).ratio()
    
    def get_matching_statistics(
        self, 
        generic_skills: List[str], 
        keywords: List[str]
    ) -> Dict:
        """
        Get detailed statistics about the mapping process.
        
        Returns:
            Dictionary with mapping statistics
        """
        all_terms = list(set(generic_skills + keywords))
        
        matched_skills, matched_technologies = self.map_skills_and_technologies(
            generic_skills, keywords
        )
        
        return {
            'total_terms': len(all_terms),
            'matched_skills': len(matched_skills),
            'matched_technologies': len(matched_technologies),
            'total_matched': len(matched_skills) + len(matched_technologies),
            'unmatched': len(all_terms) - (len(matched_skills) + len(matched_technologies)),
            'match_rate': round(
                (len(matched_skills) + len(matched_technologies)) / len(all_terms) * 100, 2
            ) if all_terms else 0,
            'skills': [s.element_name for s in matched_skills],
            'technologies': [t.example for t in matched_technologies],
        }


# Singleton instance
_mapper = None


def get_skill_mapper() -> SkillTechnologyMapper:
    """Get or create singleton mapper instance."""
    global _mapper
    if _mapper is None:
        _mapper = SkillTechnologyMapper()
    return _mapper

