"""
Django admin configuration for core app.

Defines the admin interface for managing skill requirements, vacancies, and applications.
"""

from django.contrib import admin
from django.db.models import Count, Avg, Q
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from django.urls import reverse
from .models import SkillRequirement, Vacancy, Application


@admin.register(SkillRequirement)
class SkillRequirementAdmin(admin.ModelAdmin):
    """Admin interface for SkillRequirement model."""
    
    list_display = (
        'id',
        'skill_name',
        'occupation_name',
        'required',
        'vacancy_count',
        'candidate_count',
        'created_at',
    )
    list_filter = (
        'required',
        'created_at',
        'updated_at',
    )
    search_fields = (
        'skill__element_name',
        'occupation__alternate_title',
    )
    readonly_fields = ('id', 'created_at', 'updated_at')
    autocomplete_fields = ['skill', 'occupation']
    
    fieldsets = (
        (_('Skill Information'), {
            'fields': ('skill', 'occupation', 'required')
        }),
        (_('Metadata'), {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize query with select_related and annotations."""
        qs = super().get_queryset(request)
        return qs.select_related(
            'skill',
            'occupation',
            'occupation__occupation'
        ).annotate(
            _vacancy_count=Count('vacancies', distinct=True),
            _candidate_count=Count('candidates', distinct=True),
        )
    
    @admin.display(description=_('Skill'), ordering='skill__element_name')
    def skill_name(self, obj):
        return obj.skill.element_name if obj.skill else '-'
    
    @admin.display(description=_('Occupation'), ordering='occupation__alternate_title')
    def occupation_name(self, obj):
        return obj.occupation.alternate_title if obj.occupation else '-'
    
    @admin.display(description=_('Vacancies'), ordering='_vacancy_count')
    def vacancy_count(self, obj):
        return obj._vacancy_count
    
    @admin.display(description=_('Candidates'), ordering='_candidate_count')
    def candidate_count(self, obj):
        return obj._candidate_count


class VacancyTechnologyInline(admin.TabularInline):
    """Inline for vacancy technologies."""
    model = Vacancy.technologies.through
    extra = 1
    verbose_name = _('Technology')
    verbose_name_plural = _('Technologies')
    autocomplete_fields = ['technology']


class VacancySkillRequirementInline(admin.TabularInline):
    """Inline for vacancy skill requirements."""
    model = Vacancy.skill_requirements.through
    extra = 1
    verbose_name = _('Skill Requirement')
    verbose_name_plural = _('Skill Requirements')
    autocomplete_fields = ['skillrequirement']


@admin.register(Vacancy)
class VacancyAdmin(admin.ModelAdmin):
    """Admin interface for Vacancy model."""
    
    list_display = (
        'title',
        'company',
        'location',
        'status',
        'status_badge',
        'tech_count',
        'skill_count',
        'application_count',
        'created_at',
    )
    list_filter = (
        'status',
        'company',
        'created_at',
        'updated_at',
    )
    search_fields = (
        'title',
        'description',
        'location',
        'company__name',
    )
    readonly_fields = ('id', 'created_at', 'updated_at', 'vacancy_stats')
    autocomplete_fields = ['company']
    filter_horizontal = ['technologies', 'skill_requirements']
    
    fieldsets = (
        (_('Basic Information'), {
            'fields': ('company', 'title', 'status')
        }),
        (_('Details'), {
            'fields': ('description', 'location')
        }),
        (_('Requirements'), {
            'fields': ('technologies', 'skill_requirements'),
        }),
        (_('Statistics'), {
            'fields': ('vacancy_stats',),
            'classes': ('collapse',)
        }),
        (_('Metadata'), {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize query with select_related and annotations."""
        qs = super().get_queryset(request)
        return qs.select_related('company').annotate(
            _tech_count=Count('technologies', distinct=True),
            _skill_count=Count('skill_requirements', distinct=True),
            _application_count=Count('applications', distinct=True),
            _pending_count=Count(
                'applications',
                filter=Q(applications__status='PENDING'),
                distinct=True
            ),
            _hired_count=Count(
                'applications',
                filter=Q(applications__status='HIRED'),
                distinct=True
            ),
            _avg_affinity=Avg('applications__affinity_score'),
        )
    
    @admin.display(description=_('Status'))
    def status_badge(self, obj):
        colors = {
            'ACTIVE': '#28a745',
            'INACTIVE': '#6c757d',
            'FILL': '#17a2b8',
            'CANCELLED': '#dc3545',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    
    @admin.display(description=_('Technologies'), ordering='_tech_count')
    def tech_count(self, obj):
        return obj._tech_count
    
    @admin.display(description=_('Skills'), ordering='_skill_count')
    def skill_count(self, obj):
        return obj._skill_count
    
    @admin.display(description=_('Applications'), ordering='_application_count')
    def application_count(self, obj):
        count = obj._application_count
        if count > 0:
            url = reverse('admin:core_application_changelist')
            return format_html(
                '<a href="{}?vacancy__id__exact={}">{}</a>',
                url, obj.id, count
            )
        return '0'
    
    @admin.display(description=_('Statistics'))
    def vacancy_stats(self, obj):
        if not obj.id:
            return 'Save vacancy first to see statistics'
        
        return format_html(
            '<div style="line-height: 1.8;">'
            '<strong>Total Applications:</strong> {}<br>'
            '<strong>Pending:</strong> {}<br>'
            '<strong>Hired:</strong> {}<br>'
            '<strong>Avg. Affinity Score:</strong> {:.2f}%<br>'
            '</div>',
            obj._application_count,
            obj._pending_count,
            obj._hired_count,
            obj._avg_affinity or 0
        )


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    """Admin interface for Application model."""
    
    list_display = (
        'id',
        'candidate_name',
        'vacancy_title',
        'company_name',
        'status',
        'status_badge',
        'affinity_score',
        'affinity_bar',
        'created_at',
    )
    list_filter = (
        'status',
        'vacancy__company',
        'vacancy__status',
        'created_at',
    )
    search_fields = (
        'candidate__full_name',
        'candidate__email',
        'vacancy__title',
        'vacancy__company__name',
    )
    readonly_fields = ('id', 'created_at', 'updated_at', 'application_details')
    autocomplete_fields = ['vacancy', 'candidate']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        (_('Application Information'), {
            'fields': ('vacancy', 'candidate', 'status', 'affinity_score')
        }),
        (_('Details'), {
            'fields': ('application_details',),
        }),
        (_('Metadata'), {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize query with select_related."""
        qs = super().get_queryset(request)
        return qs.select_related(
            'candidate',
            'candidate__cv_file',
            'vacancy',
            'vacancy__company'
        )
    
    @admin.display(description=_('Candidate'), ordering='candidate__full_name')
    def candidate_name(self, obj):
        url = reverse('admin:users_candidate_change', args=[obj.candidate.id])
        return format_html('<a href="{}">{}</a>', url, obj.candidate.full_name)
    
    @admin.display(description=_('Vacancy'), ordering='vacancy__title')
    def vacancy_title(self, obj):
        url = reverse('admin:core_vacancy_change', args=[obj.vacancy.id])
        return format_html('<a href="{}">{}</a>', url, obj.vacancy.title)
    
    @admin.display(description=_('Company'), ordering='vacancy__company__name')
    def company_name(self, obj):
        return obj.vacancy.company.name
    
    @admin.display(description=_('Status'))
    def status_badge(self, obj):
        colors = {
            'SUGGESTED': '#9c27b0',  # Purple for AI suggestions
            'PENDING': '#ffc107',
            'REJECTED': '#dc3545',
            'HIRED': '#28a745',
            'ON_HOLD': '#17a2b8',
            'CANCELLED': '#6c757d',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    
    @admin.display(description=_('Affinity %'), ordering='affinity_score')
    def affinity_bar(self, obj):
        score = float(obj.affinity_score)
        color = '#28a745' if score >= 70 else '#ffc107' if score >= 50 else '#dc3545'
        return format_html(
            '<div style="width: 100px; background-color: #e9ecef; '
            'border-radius: 3px; overflow: hidden;">'
            '<div style="width: {}%; background-color: {}; '
            'height: 20px; text-align: center; color: white; '
            'font-size: 11px; line-height: 20px;">{:.1f}%</div>'
            '</div>',
            score, color, score
        )
    
    @admin.display(description=_('Application Details'))
    def application_details(self, obj):
        if not obj.id:
            return 'Save application first to see details'
        
        cv_info = 'No CV' if not obj.candidate.cv_file else format_html(
            '<a href="{}" target="_blank">View CV</a>',
            obj.candidate.get_cv_url()
        )
        
        return format_html(
            '<div style="line-height: 1.8;">'
            '<h3>Candidate Information</h3>'
            '<strong>Name:</strong> {}<br>'
            '<strong>Email:</strong> {}<br>'
            '<strong>Phone:</strong> {}<br>'
            '<strong>Location:</strong> {}<br>'
            '<strong>CV:</strong> {}<br>'
            '<br>'
            '<h3>Vacancy Information</h3>'
            '<strong>Title:</strong> {}<br>'
            '<strong>Company:</strong> {}<br>'
            '<strong>Location:</strong> {}<br>'
            '<strong>Status:</strong> {}<br>'
            '</div>',
            obj.candidate.full_name,
            obj.candidate.email,
            obj.candidate.phone or '-',
            obj.candidate.location or '-',
            cv_info,
            obj.vacancy.title,
            obj.vacancy.company.name,
            obj.vacancy.location,
            obj.vacancy.get_status_display()
        )
    
    actions = ['mark_as_pending', 'mark_as_hired', 'mark_as_rejected', 'mark_as_suggested']

    @admin.action(description=_('Mark selected as Suggested'))
    def mark_as_suggested(self, request, queryset):
        updated = queryset.update(status='SUGGESTED')
        self.message_user(request, f'{updated} applications marked as Suggested.')

    @admin.action(description=_('Mark selected as Pending'))
    def mark_as_pending(self, request, queryset):
        updated = queryset.update(status='PENDING')
        self.message_user(request, f'{updated} applications marked as Pending.')

    @admin.action(description=_('Mark selected as Hired'))
    def mark_as_hired(self, request, queryset):
        updated = queryset.update(status='HIRED')
        self.message_user(request, f'{updated} applications marked as Hired.')

    @admin.action(description=_('Mark selected as Rejected'))
    def mark_as_rejected(self, request, queryset):
        updated = queryset.update(status='REJECTED')
        self.message_user(request, f'{updated} applications marked as Rejected.')
