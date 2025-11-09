"""
Models for O*NET data management.

This module defines the data structure for occupations, skills,
technologies, and their relationships based on the O*NET dataset.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _


class Occupation(models.Model):
    """
    Model representing an occupation according to O*NET-SOC.
    
    Represents standardized occupations with O*NET-SOC code,
    title, and detailed description.
    """
    onet_soc_code = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        verbose_name=_('O*NET-SOC Code'),
        help_text=_('Unique O*NET-SOC occupation code (e.g. 11-1011.00)')
    )
    title = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name=_('Title'),
        help_text=_('Official occupation title')
    )
    description = models.TextField(
        verbose_name=_('Description'),
        help_text=_('Detailed occupation description')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Created at'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('Updated at'))
    
    class Meta:
        verbose_name = _('Occupation')
        verbose_name_plural = _('Occupations')
        ordering = ['onet_soc_code']
        indexes = [
            models.Index(fields=['onet_soc_code']),
            models.Index(fields=['title']),
        ]
    
    def __str__(self):
        return f"{self.onet_soc_code} - {self.title}"


class OccupationAlternateTitle(models.Model):
    """
    Alternate titles for occupations.
    
    Enables search and matching using alternative names
    for occupations (e.g. CEO for Chief Executive Officer).
    """
    occupation = models.ForeignKey(
        Occupation,
        on_delete=models.CASCADE,
        related_name='alternate_titles',
        verbose_name=_('Occupation')
    )
    alternate_title = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name=_('Alternate title'),
        help_text=_('Alternative name for the occupation')
    )
    short_title = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_('Short title'),
        help_text=_('Abbreviated version of title (e.g. CEO)')
    )
    source = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name=_('Source'),
        help_text=_('Source code for alternate title')
    )
    
    class Meta:
        verbose_name = _('Alternate title')
        verbose_name_plural = _('Alternate titles')
        ordering = ['occupation', 'alternate_title']
        indexes = [
            models.Index(fields=['alternate_title']),
            models.Index(fields=['occupation', 'alternate_title']),
        ]
        unique_together = ['occupation', 'alternate_title']
    
    def __str__(self):
        return f"{self.alternate_title} ({self.occupation.onet_soc_code})"


class Skill(models.Model):
    """
    Model for individual skills.
    
    Represents unique skills from the O*NET dataset with their
    identifier and element name.
    """
    element_id = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        verbose_name=_('Element ID'),
        help_text=_('Unique element identifier (e.g. 2.A.1.a)')
    )
    element_name = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name=_('Skill name'),
        help_text=_('Skill name (e.g. Reading Comprehension)')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Created at'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('Updated at'))
    
    class Meta:
        verbose_name = _('Skill')
        verbose_name_plural = _('Skills')
        ordering = ['element_id']
        indexes = [
            models.Index(fields=['element_id']),
            models.Index(fields=['element_name']),
        ]
    
    def __str__(self):
        return f"{self.element_id} - {self.element_name}"


class OccupationSkill(models.Model):
    """
    Relationship between occupations and skills with metrics.
    
    Junction table relating occupations with skills,
    including importance and required level metrics.
    """
    
    SCALE_IMPORTANCE = 'IM'
    SCALE_LEVEL = 'LV'
    SCALE_CHOICES = [
        (SCALE_IMPORTANCE, _('Importance')),
        (SCALE_LEVEL, _('Level')),
    ]
    
    occupation = models.ForeignKey(
        Occupation,
        on_delete=models.CASCADE,
        related_name='occupation_skills',
        verbose_name=_('Occupation')
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name='skill_occupations',
        verbose_name=_('Skill')
    )
    scale_id = models.CharField(
        max_length=2,
        choices=SCALE_CHOICES,
        verbose_name=_('Scale'),
        help_text=_('Metric type: Importance (IM) or Level (LV)')
    )
    scale_name = models.CharField(
        max_length=50,
        verbose_name=_('Scale name')
    )
    data_value = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        verbose_name=_('Value'),
        help_text=_('Metric value (0-10)')
    )
    
    # Statistical metadata
    n = models.IntegerField(
        verbose_name=_('Sample size'),
        help_text=_('Number of observations')
    )
    standard_error = models.DecimalField(
        max_digits=6,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name=_('Standard error')
    )
    lower_ci_bound = models.DecimalField(
        max_digits=6,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name=_('Lower CI bound')
    )
    upper_ci_bound = models.DecimalField(
        max_digits=6,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name=_('Upper CI bound')
    )
    recommend_suppress = models.CharField(
        max_length=1,
        default='N',
        verbose_name=_('Recommend suppress')
    )
    not_relevant = models.CharField(
        max_length=1,
        blank=True,
        null=True,
        verbose_name=_('Not relevant')
    )
    date = models.CharField(
        max_length=10,
        verbose_name=_('Date'),
        help_text=_('Data date (MM/YYYY format)')
    )
    domain_source = models.CharField(
        max_length=50,
        verbose_name=_('Domain source')
    )
    
    class Meta:
        verbose_name = _('Occupation skill')
        verbose_name_plural = _('Occupation skills')
        ordering = ['occupation', 'skill', 'scale_id']
        indexes = [
            models.Index(fields=['occupation', 'skill']),
            models.Index(fields=['scale_id']),
            models.Index(fields=['data_value']),
        ]
        unique_together = ['occupation', 'skill', 'scale_id']
    
    def __str__(self):
        return f"{self.occupation.title} - {self.skill.element_name} ({self.scale_name}: {self.data_value})"


class TechnologyCategory(models.Model):
    """
    Technology categories.
    
    Classifies technologies into standard categories
    (e.g. Database software, Accounting software).
    """
    commodity_code = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        verbose_name=_('Category code'),
        help_text=_('Unique technology category code')
    )
    commodity_title = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name=_('Category title'),
        help_text=_('Technology category name')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Created at'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('Updated at'))
    
    class Meta:
        verbose_name = _('Technology category')
        verbose_name_plural = _('Technology categories')
        ordering = ['commodity_title']
        indexes = [
            models.Index(fields=['commodity_code']),
            models.Index(fields=['commodity_title']),
        ]
    
    def __str__(self):
        return self.commodity_title


class Technology(models.Model):
    """
    Specific technologies and tools.
    
    Represents individual technologies, software, and tools
    used in occupations.
    """
    example = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name=_('Technology name'),
        help_text=_('Name of technology or software')
    )
    category = models.ForeignKey(
        TechnologyCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='technologies',
        verbose_name=_('Category')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Created at'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('Updated at'))
    
    class Meta:
        verbose_name = _('Technology')
        verbose_name_plural = _('Technologies')
        ordering = ['example']
        indexes = [
            models.Index(fields=['example']),
        ]
    
    def __str__(self):
        return self.example


class OccupationTechnology(models.Model):
    """
    Relationship between occupations and technologies.
    
    Junction table relating occupations with technologies,
    including demand and trend indicators.
    """
    occupation = models.ForeignKey(
        Occupation,
        on_delete=models.CASCADE,
        related_name='occupation_technologies',
        verbose_name=_('Occupation')
    )
    technology = models.ForeignKey(
        Technology,
        on_delete=models.CASCADE,
        related_name='technology_occupations',
        verbose_name=_('Technology')
    )
    hot_technology = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name=_('Hot technology'),
        help_text=_('Indicates if it is an emerging or high-demand technology')
    )
    in_demand = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name=_('In demand'),
        help_text=_('Indicates if the technology is currently in high demand')
    )
    
    class Meta:
        verbose_name = _('Occupation technology')
        verbose_name_plural = _('Occupation technologies')
        ordering = ['occupation', 'technology']
        indexes = [
            models.Index(fields=['occupation', 'technology']),
            models.Index(fields=['hot_technology']),
            models.Index(fields=['in_demand']),
        ]
        unique_together = ['occupation', 'technology']
    
    def __str__(self):
        flags = []
        if self.hot_technology:
            flags.append('HOT')
        if self.in_demand:
            flags.append('DEMAND')
        flag_str = f" [{', '.join(flags)}]" if flags else ""
        return f"{self.occupation.title} - {self.technology.example}{flag_str}"
