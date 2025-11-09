"""
Tests for Data app.

Tests to verify proper functioning of models
and relationships in the O*NET data app.
"""

from django.test import TestCase
from decimal import Decimal
from .models import (
    Occupation,
    OccupationAlternateTitle,
    Skill,
    OccupationSkill,
    TechnologyCategory,
    Technology,
    OccupationTechnology,
)


class OccupationModelTest(TestCase):
    """Tests for Occupation model."""
    
    def setUp(self):
        """Initial test setup."""
        self.occupation = Occupation.objects.create(
            onet_soc_code='11-1011.00',
            title='Chief Executives',
            description='Test description for chief executives'
        )
    
    def test_occupation_creation(self):
        """Test occupation creation."""
        self.assertEqual(self.occupation.onet_soc_code, '11-1011.00')
        self.assertEqual(self.occupation.title, 'Chief Executives')
        self.assertIsNotNone(self.occupation.created_at)
    
    def test_occupation_str(self):
        """Test Occupation __str__ method."""
        expected = '11-1011.00 - Chief Executives'
        self.assertEqual(str(self.occupation), expected)


class OccupationAlternateTitleModelTest(TestCase):
    """Tests for OccupationAlternateTitle model."""
    
    def setUp(self):
        """Initial test setup."""
        self.occupation = Occupation.objects.create(
            onet_soc_code='11-1011.00',
            title='Chief Executives',
            description='Test description'
        )
        self.alt_title = OccupationAlternateTitle.objects.create(
            occupation=self.occupation,
            alternate_title='Chief Executive Officer',
            short_title='CEO',
            source='Test'
        )
    
    def test_alternate_title_creation(self):
        """Test alternate title creation."""
        self.assertEqual(self.alt_title.alternate_title, 'Chief Executive Officer')
        self.assertEqual(self.alt_title.short_title, 'CEO')
        self.assertEqual(self.alt_title.occupation, self.occupation)
    
    def test_alternate_title_relationship(self):
        """Test relationship with Occupation."""
        self.assertEqual(
            self.occupation.alternate_titles.count(), 1
        )
        self.assertEqual(
            self.occupation.alternate_titles.first(), self.alt_title
        )


class SkillModelTest(TestCase):
    """Tests for Skill model."""
    
    def setUp(self):
        """Initial test setup."""
        self.skill = Skill.objects.create(
            element_id='2.A.1.a',
            element_name='Reading Comprehension'
        )
    
    def test_skill_creation(self):
        """Test skill creation."""
        self.assertEqual(self.skill.element_id, '2.A.1.a')
        self.assertEqual(self.skill.element_name, 'Reading Comprehension')
    
    def test_skill_str(self):
        """Test Skill __str__ method."""
        expected = '2.A.1.a - Reading Comprehension'
        self.assertEqual(str(self.skill), expected)


class OccupationSkillModelTest(TestCase):
    """Tests for OccupationSkill model."""
    
    def setUp(self):
        """Initial test setup."""
        self.occupation = Occupation.objects.create(
            onet_soc_code='11-1011.00',
            title='Chief Executives',
            description='Test description'
        )
        self.skill = Skill.objects.create(
            element_id='2.A.1.a',
            element_name='Reading Comprehension'
        )
        self.occ_skill = OccupationSkill.objects.create(
            occupation=self.occupation,
            skill=self.skill,
            scale_id='IM',
            scale_name='Importance',
            data_value=Decimal('4.12'),
            n=8,
            date='08/2023',
            domain_source='Analyst'
        )
    
    def test_occupation_skill_creation(self):
        """Test occupation-skill relationship creation."""
        self.assertEqual(self.occ_skill.occupation, self.occupation)
        self.assertEqual(self.occ_skill.skill, self.skill)
        self.assertEqual(self.occ_skill.data_value, Decimal('4.12'))
    
    def test_occupation_skill_relationship(self):
        """Test relationships."""
        self.assertEqual(
            self.occupation.occupation_skills.count(), 1
        )
        self.assertEqual(
            self.skill.skill_occupations.count(), 1
        )


class TechnologyModelTest(TestCase):
    """Tests for technology models."""
    
    def setUp(self):
        """Initial test setup."""
        self.category = TechnologyCategory.objects.create(
            commodity_code='43232202',
            commodity_title='Document management software'
        )
        self.technology = Technology.objects.create(
            example='Adobe Acrobat',
            category=self.category
        )
        self.occupation = Occupation.objects.create(
            onet_soc_code='11-1011.00',
            title='Chief Executives',
            description='Test description'
        )
        self.occ_tech = OccupationTechnology.objects.create(
            occupation=self.occupation,
            technology=self.technology,
            hot_technology=True,
            in_demand=False
        )
    
    def test_technology_category_creation(self):
        """Test technology category creation."""
        self.assertEqual(self.category.commodity_code, '43232202')
        self.assertEqual(
            self.category.commodity_title, 'Document management software'
        )
    
    def test_technology_creation(self):
        """Test technology creation."""
        self.assertEqual(self.technology.example, 'Adobe Acrobat')
        self.assertEqual(self.technology.category, self.category)
    
    def test_occupation_technology_creation(self):
        """Test occupation-technology relationship creation."""
        self.assertEqual(self.occ_tech.occupation, self.occupation)
        self.assertEqual(self.occ_tech.technology, self.technology)
        self.assertTrue(self.occ_tech.hot_technology)
        self.assertFalse(self.occ_tech.in_demand)
    
    def test_technology_relationships(self):
        """Test technology relationships."""
        self.assertEqual(
            self.category.technologies.count(), 1
        )
        self.assertEqual(
            self.occupation.occupation_technologies.count(), 1
        )
