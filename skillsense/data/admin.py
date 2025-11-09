"""
Django admin panel configuration for Data app.

Defines the admin interface for managing occupations,
skills, technologies, and their relationships.
"""

from django.contrib import admin
from django.db.models import Count, Q
from django.utils.translation import gettext_lazy as _
from .models import (
    Occupation,
    OccupationAlternateTitle,
    Skill,
    OccupationSkill,
    TechnologyCategory,
    Technology,
    OccupationTechnology,
)


class OccupationAlternateTitleInline(admin.TabularInline):
    """Inline to display alternate titles in occupation view."""
    model = OccupationAlternateTitle
    extra = 1
    fields = ('alternate_title', 'short_title', 'source')


class OccupationSkillInline(admin.TabularInline):
    """Inline to display skills in occupation view."""
    model = OccupationSkill
    extra = 0
    fields = ('skill', 'scale_id', 'data_value', 'date')
    readonly_fields = ('date',)
    
    def get_queryset(self, request):
        """Optimize query with select_related."""
        qs = super().get_queryset(request)
        return qs.select_related('skill')


class OccupationTechnologyInline(admin.TabularInline):
    """Inline to display technologies in occupation view."""
    model = OccupationTechnology
    extra = 0
    fields = ('technology', 'hot_technology', 'in_demand')
    
    def get_queryset(self, request):
        """Optimize query with select_related."""
        qs = super().get_queryset(request)
        return qs.select_related('technology', 'technology__category')


@admin.register(Occupation)
class OccupationAdmin(admin.ModelAdmin):
    """Occupation administration."""
    
    list_display = (
        'onet_soc_code',
        'title',
        'skill_count',
        'technology_count',
        'alternate_title_count',
        'updated_at',
    )
    list_filter = ('updated_at', 'created_at')
    search_fields = (
        'onet_soc_code',
        'title',
        'description',
        'alternate_titles__alternate_title',
    )
    readonly_fields = ('created_at', 'updated_at')
    inlines = [
        OccupationAlternateTitleInline,
        OccupationSkillInline,
        OccupationTechnologyInline,
    ]
    
    fieldsets = (
        (_('Basic information'), {
            'fields': ('onet_soc_code', 'title', 'description')
        }),
        (_('Metadata'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize query with annotations."""
        qs = super().get_queryset(request)
        return qs.annotate(
            _skill_count=Count('occupation_skills', distinct=True),
            _technology_count=Count('occupation_technologies', distinct=True),
            _alternate_title_count=Count('alternate_titles', distinct=True),
        )
    
    @admin.display(description=_('Skills'), ordering='_skill_count')
    def skill_count(self, obj):
        return obj._skill_count
    
    @admin.display(description=_('Technologies'), ordering='_technology_count')
    def technology_count(self, obj):
        return obj._technology_count
    
    @admin.display(description=_('Alt. titles'), ordering='_alternate_title_count')
    def alternate_title_count(self, obj):
        return obj._alternate_title_count


@admin.register(OccupationAlternateTitle)
class OccupationAlternateTitleAdmin(admin.ModelAdmin):
    """Alternate titles administration."""
    
    list_display = (
        'alternate_title',
        'short_title',
        'occupation',
        'source',
    )
    list_filter = ('source',)
    search_fields = (
        'alternate_title',
        'short_title',
        'occupation__title',
        'occupation__onet_soc_code',
    )
    autocomplete_fields = ['occupation']
    
    fieldsets = (
        (None, {
            'fields': ('occupation', 'alternate_title', 'short_title', 'source')
        }),
    )


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    """Skills administration."""
    
    list_display = (
        'element_id',
        'element_name',
        'occupation_count',
        'updated_at',
    )
    list_filter = ('updated_at', 'created_at')
    search_fields = ('element_id', 'element_name')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        (_('Basic information'), {
            'fields': ('element_id', 'element_name')
        }),
        (_('Metadata'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize query with annotations."""
        qs = super().get_queryset(request)
        return qs.annotate(
            _occupation_count=Count('skill_occupations__occupation', distinct=True)
        )
    
    @admin.display(description=_('Occupations'), ordering='_occupation_count')
    def occupation_count(self, obj):
        return obj._occupation_count


@admin.register(OccupationSkill)
class OccupationSkillAdmin(admin.ModelAdmin):
    """Occupation-skill relationships administration."""
    
    list_display = (
        'occupation',
        'skill',
        'scale_id',
        'data_value',
        'date',
    )
    list_filter = (
        'scale_id',
        'recommend_suppress',
        'date',
        'domain_source',
    )
    search_fields = (
        'occupation__title',
        'occupation__onet_soc_code',
        'skill__element_name',
        'skill__element_id',
    )
    autocomplete_fields = ['occupation', 'skill']
    
    fieldsets = (
        (_('Relationship'), {
            'fields': ('occupation', 'skill')
        }),
        (_('Metrics'), {
            'fields': ('scale_id', 'scale_name', 'data_value')
        }),
        (_('Statistics'), {
            'fields': (
                'n',
                'standard_error',
                'lower_ci_bound',
                'upper_ci_bound',
            ),
            'classes': ('collapse',)
        }),
        (_('Metadata'), {
            'fields': (
                'recommend_suppress',
                'not_relevant',
                'date',
                'domain_source',
            ),
            'classes': ('collapse',)
        }),
    )


@admin.register(TechnologyCategory)
class TechnologyCategoryAdmin(admin.ModelAdmin):
    """Technology categories administration."""
    
    list_display = (
        'commodity_code',
        'commodity_title',
        'technology_count',
        'updated_at',
    )
    list_filter = ('updated_at', 'created_at')
    search_fields = ('commodity_code', 'commodity_title')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        (_('Basic information'), {
            'fields': ('commodity_code', 'commodity_title')
        }),
        (_('Metadata'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize query with annotations."""
        qs = super().get_queryset(request)
        return qs.annotate(
            _technology_count=Count('technologies', distinct=True)
        )
    
    @admin.display(description=_('Technologies'), ordering='_technology_count')
    def technology_count(self, obj):
        return obj._technology_count


@admin.register(Technology)
class TechnologyAdmin(admin.ModelAdmin):
    """Technologies administration."""
    
    list_display = (
        'example',
        'category',
        'occupation_count',
        'hot_count',
        'demand_count',
        'updated_at',
    )
    list_filter = (
        'category',
        'updated_at',
        'created_at',
    )
    search_fields = (
        'example',
        'category__commodity_title',
    )
    autocomplete_fields = ['category']
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        (_('Basic information'), {
            'fields': ('example', 'category')
        }),
        (_('Metadata'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize query with annotations."""
        qs = super().get_queryset(request)
        return qs.select_related('category').annotate(
            _occupation_count=Count('technology_occupations__occupation', distinct=True),
            _hot_count=Count(
                'technology_occupations',
                filter=Q(technology_occupations__hot_technology=True),
                distinct=True
            ),
            _demand_count=Count(
                'technology_occupations',
                filter=Q(technology_occupations__in_demand=True),
                distinct=True
            ),
        )
    
    @admin.display(description=_('Occupations'), ordering='_occupation_count')
    def occupation_count(self, obj):
        return obj._occupation_count
    
    @admin.display(description=_('Hot tech'), ordering='_hot_count')
    def hot_count(self, obj):
        return obj._hot_count
    
    @admin.display(description=_('In demand'), ordering='_demand_count')
    def demand_count(self, obj):
        return obj._demand_count


@admin.register(OccupationTechnology)
class OccupationTechnologyAdmin(admin.ModelAdmin):
    """Occupation-technology relationships administration."""
    
    list_display = (
        'occupation',
        'technology',
        'hot_technology',
        'in_demand',
    )
    list_filter = (
        'hot_technology',
        'in_demand',
        'technology__category',
    )
    search_fields = (
        'occupation__title',
        'occupation__onet_soc_code',
        'technology__example',
    )
    autocomplete_fields = ['occupation', 'technology']
    
    fieldsets = (
        (_('Relationship'), {
            'fields': ('occupation', 'technology')
        }),
        (_('Indicators'), {
            'fields': ('hot_technology', 'in_demand')
        }),
    )
