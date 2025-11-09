"""
Django admin configuration for users app.

Defines the admin interface for managing companies, users, candidates, and CV files.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.db.models import Count, Q
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from django.urls import reverse
from .models import Company, User, CVFile, Candidate


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    """Admin interface for Company model."""
    
    list_display = (
        'name',
        'email',
        'phone',
        'website',
        'user_count',
        'candidate_count',
        'vacancy_count',
        'created_at',
    )
    list_filter = ('created_at', 'updated_at')
    search_fields = ('name', 'email', 'phone', 'website')
    readonly_fields = ('id', 'created_at', 'updated_at')
    
    fieldsets = (
        (_('Basic Information'), {
            'fields': ('name', 'email', 'phone')
        }),
        (_('Additional Information'), {
            'fields': ('address', 'website')
        }),
        (_('Metadata'), {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize query with annotations."""
        qs = super().get_queryset(request)
        return qs.annotate(
            _user_count=Count('users', distinct=True),
            _candidate_count=Count('users__registrated_by_users', distinct=True),
            _vacancy_count=Count('vacancies', distinct=True),
        )
    
    @admin.display(description=_('Users'), ordering='_user_count')
    def user_count(self, obj):
        return obj._user_count
    
    @admin.display(description=_('Candidates'), ordering='_candidate_count')
    def candidate_count(self, obj):
        return obj._candidate_count
    
    @admin.display(description=_('Vacancies'), ordering='_vacancy_count')
    def vacancy_count(self, obj):
        return obj._vacancy_count


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for custom User model."""
    
    list_display = (
        'email',
        'username',
        'company',
        'is_verified',
        'has_mfa',
        'is_staff',
        'is_active',
        'date_joined',
    )
    list_filter = (
        'is_staff',
        'is_active',
        'is_verified',
        'has_mfa',
        'mfa_verified',
        'company',
        'date_joined',
    )
    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    readonly_fields = ('id', 'date_joined', 'last_login', 'is_verified_at', 'mfa_verified_at')
    
    fieldsets = (
        (None, {
            'fields': ('id', 'email', 'username', 'password')
        }),
        (_('Personal info'), {
            'fields': ('first_name', 'last_name', 'company')
        }),
        (_('Email Verification'), {
            'fields': (
                'is_verified',
                'is_verified_at',
                'verification_token',
                'verification_token_expires_at',
            ),
            'classes': ('collapse',)
        }),
        (_('MFA Settings'), {
            'fields': (
                'has_mfa',
                'mfa_verified',
                'mfa_verified_at',
                'mfa_secret',
            ),
            'classes': ('collapse',)
        }),
        (_('Permissions'), {
            'fields': (
                'is_active',
                'is_staff',
                'is_superuser',
                'groups',
                'user_permissions',
            ),
        }),
        (_('Important dates'), {
            'fields': ('last_login', 'date_joined'),
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'company', 'password1', 'password2'),
        }),
    )


@admin.register(CVFile)
class CVFileAdmin(admin.ModelAdmin):
    """Admin interface for CVFile model."""
    
    list_display = (
        'id',
        'file_name',
        'file_link',
        'has_extraction',
        'candidate_link',
        'created_at',
    )
    list_filter = ('created_at', 'updated_at')
    search_fields = ('hash', 'file')
    readonly_fields = ('id', 'created_at', 'updated_at', 'file_preview')
    
    fieldsets = (
        (_('File Information'), {
            'fields': ('file', 'file_preview', 'hash')
        }),
        (_('Extraction Results'), {
            'fields': ('extraction_result',),
            'classes': ('collapse',)
        }),
        (_('Metadata'), {
            'fields': ('metadata', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description=_('File Name'))
    def file_name(self, obj):
        if obj.file:
            return obj.file.name.split('/')[-1]
        return '-'
    
    @admin.display(description=_('File'))
    def file_link(self, obj):
        if obj.file:
            try:
                # Try to get candidate for proper URL generation
                candidate = obj.candidate
                url = candidate.get_cv_url()
                return format_html(
                    '<a href="{}" target="_blank">Download</a>',
                    url
                )
            except:
                return format_html('<span>File exists</span>')
        return '-'
    
    @admin.display(description=_('Preview'), boolean=False)
    def file_preview(self, obj):
        if obj.file:
            try:
                candidate = obj.candidate
                url = candidate.get_cv_url()
                return format_html(
                    '<a href="{}" target="_blank" class="button">Download CV</a>',
                    url
                )
            except:
                return 'No preview available'
        return 'No file'
    
    @admin.display(description=_('Extracted'), boolean=True)
    def has_extraction(self, obj):
        return bool(obj.extraction_result)
    
    @admin.display(description=_('Candidate'))
    def candidate_link(self, obj):
        try:
            candidate = obj.candidate
            url = reverse('admin:users_candidate_change', args=[candidate.id])
            return format_html('<a href="{}">{}</a>', url, candidate.full_name)
        except:
            return '-'


class SkillInline(admin.TabularInline):
    """Inline for candidate skills."""
    model = Candidate.skills.through
    extra = 1
    verbose_name = _('Skill')
    verbose_name_plural = _('Skills')
    autocomplete_fields = ['skillrequirement']


class TechnologyInline(admin.TabularInline):
    """Inline for candidate technologies."""
    model = Candidate.technologies.through
    extra = 1
    verbose_name = _('Technology')
    verbose_name_plural = _('Technologies')
    autocomplete_fields = ['technology']


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    """Admin interface for Candidate model."""
    
    list_display = (
        'full_name',
        'email',
        'phone',
        'location',
        'has_cv',
        'skill_count',
        'tech_count',
        'application_count',
        'registrated_by',
        'created_at',
    )
    list_filter = (
        'created_at',
        'updated_at',
        'registrated_by__company',
    )
    search_fields = (
        'full_name',
        'email',
        'phone',
        'location',
        'linkedin_url',
        'github_url',
    )
    readonly_fields = ('id', 'created_at', 'updated_at', 'cv_preview')
    autocomplete_fields = ['cv_file', 'registrated_by']
    filter_horizontal = ['skills', 'technologies']
    inlines = []  # Skills and techs are managed via filter_horizontal
    
    fieldsets = (
        (_('Basic Information'), {
            'fields': ('full_name', 'email', 'phone', 'location')
        }),
        (_('CV Information'), {
            'fields': ('cv_file', 'cv_preview')
        }),
        (_('Online Profiles'), {
            'fields': ('linkedin_url', 'github_url', 'portfolio_url', 'other_url'),
            'classes': ('collapse',)
        }),
        (_('Skills & Technologies'), {
            'fields': ('skills', 'technologies'),
        }),
        (_('Registration'), {
            'fields': ('registrated_by',)
        }),
        (_('Metadata'), {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize query with annotations and select_related."""
        qs = super().get_queryset(request)
        return qs.select_related(
            'cv_file',
            'registrated_by',
            'registrated_by__company'
        ).annotate(
            _skill_count=Count('skills', distinct=True),
            _tech_count=Count('technologies', distinct=True),
            _application_count=Count('applications', distinct=True),
        )
    
    @admin.display(description=_('CV'), boolean=True)
    def has_cv(self, obj):
        return bool(obj.cv_file_id)
    
    @admin.display(description=_('CV Preview'))
    def cv_preview(self, obj):
        if obj.cv_file and obj.cv_file.file:
            url = obj.get_cv_url()
            file_name = obj.cv_file.file.name.split('/')[-1]
            return format_html(
                '<div>'
                '<strong>File:</strong> {}<br>'
                '<a href="{}" target="_blank" class="button">Download CV</a>'
                '</div>',
                file_name,
                url
            )
        return 'No CV uploaded'
    
    @admin.display(description=_('Skills'), ordering='_skill_count')
    def skill_count(self, obj):
        return obj._skill_count
    
    @admin.display(description=_('Technologies'), ordering='_tech_count')
    def tech_count(self, obj):
        return obj._tech_count
    
    @admin.display(description=_('Applications'), ordering='_application_count')
    def application_count(self, obj):
        return obj._application_count
    
    def save_model(self, request, obj, form, change):
        """Auto-set registrated_by if not set."""
        if not change and not obj.registrated_by_id:
            obj.registrated_by = request.user
        super().save_model(request, obj, form, change)
