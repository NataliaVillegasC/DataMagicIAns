from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _
import uuid
from utils.models import TimestampModel, UserRegistratedBy
from utils.enums import CandidateStatus
from .storage import candidate_cv_storage, get_candidate_cv_upload_path

# Create your models here.
class Company(TimestampModel):
    """
    Company model
    """
    name = models.CharField(_('name'), max_length=255, unique=True)
    email = models.EmailField(_('email address'), unique=True, null=True, blank=True)
    phone = models.CharField(_('phone number'), max_length=20, null=True, blank=True)
    address = models.TextField(_('address'), null=True, blank=True)
    website = models.URLField(_('website'), null=True, blank=True)


class UserManager(BaseUserManager):
    """
    Custom user manager for email-based authentication
    """
    def create_user(self, email, password=None, **extra_fields):
        """
        Create and save a regular user with the given email and password.
        """
        if not email:
            raise ValueError(_('The Email field must be set'))
        email = self.normalize_email(email)

        # Handle company requirement
        if 'company' not in extra_fields or extra_fields['company'] is None:
            # Create or get default company for regular users
            company, _ = Company.objects.get_or_create(
                name='Default Company',
                defaults={'email': 'default@company.com'}
            )
            extra_fields['company'] = company

        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and save a superuser with the given email and password.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_verified', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        # Create or get a default company for superusers
        if 'company' not in extra_fields or extra_fields['company'] is None:
            company, _ = Company.objects.get_or_create(
                name='Admin Company',
                defaults={'email': 'admin@company.com'}
            )
            extra_fields['company'] = company

        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    """
    Custom User model with UUID primary key
    Uses email as the unique identifier for authentication
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_('email address'), unique=True)  # Make email unique
    
    objects = UserManager()

    # MFA fields
    has_mfa = models.BooleanField(_('has MFA'), default=False)
    mfa_secret = models.CharField(_('MFA secret'), max_length=255, null=True, blank=True)
    mfa_verified = models.BooleanField(_('MFA verified'), default=False)
    mfa_verified_at = models.DateTimeField(_('MFA verified at'), null=True, blank=True)

    # Email verification
    is_verified = models.BooleanField(_('is verified'), default=False)
    is_verified_at = models.DateTimeField(_('verified at'), null=True, blank=True)
    verification_token = models.CharField(_('verification token'), max_length=255, null=True, blank=True)
    verification_token_expires_at = models.DateTimeField(_('verification token expires at'), null=True, blank=True)

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='users')

    # Fix related_name clashes with auth.User
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name=_('groups'),
        blank=True,
        related_name='custom_user_set',
        related_query_name='custom_user',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name=_('user permissions'),
        blank=True,
        related_name='custom_user_set',
        related_query_name='custom_user',
    )

    # Use custom manager
    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []  # username is not required

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")
    
    def __str__(self):
        return self.email


class CVFile(TimestampModel):
    """
    CV file model
    """
    file = models.FileField(
        _('CV file'),
        upload_to=get_candidate_cv_upload_path,
        storage=candidate_cv_storage,
        max_length=500,  # Increased for long GCP paths
        null=True,
        blank=True,
        help_text=_('Candidate CV/Resume file (PDF, DOC, DOCX)')
    )
    hash = models.CharField(_('hash'), max_length=355, null=True, blank=True)
    extraction_result = models.JSONField(_('extraction result'), null=True, blank=True)
    metadata = models.JSONField(_('metadata'), null=True, blank=True)

class Candidate(UserRegistratedBy):
    """
    Candidate model with CV storage in GCP.
    
    The CV file is stored in GCP Cloud Storage using custom storage backend.
    Files are organized as: {company_name}/candidates/{unique_filename}
    
    Data Flow:
    - cv_file.extraction_result: Raw JSON data extracted by Gemini AI
    - supervised_data: Corrected/validated data reviewed by HR person
    """
    full_name = models.CharField(_('full name'), max_length=255)
    email = models.EmailField(_('email address'))
    phone = models.CharField(_('phone number'), max_length=20, null=True, blank=True)
    location = models.CharField(_('location'), max_length=255, null=True, blank=True)
    linkedin_url = models.URLField(_('linkedin url'), null=True, blank=True)
    github_url = models.URLField(_('github url'), null=True, blank=True)
    portfolio_url = models.URLField(_('portfolio url'), null=True, blank=True)
    other_url = models.URLField(_('other url'), null=True, blank=True)
    
    # CV file stored in GCP Cloud Storage (optional - can be added later)
    cv_file = models.OneToOneField(
        CVFile, 
        on_delete=models.CASCADE, 
        related_name='candidate',
        null=True,
        blank=True
    )
    
    # Supervised/corrected data validated by HR (used for candidate creation)
    supervised_data = models.JSONField(
        _('supervised data'), 
        null=True, 
        blank=True,
        help_text=_('Corrected candidate data reviewed and validated by HR person')
    )
    
    # Direct relationships with O*NET taxonomy for matching
    skills = models.ManyToManyField('data.Skill', related_name='candidates', blank=True)
    technologies = models.ManyToManyField('data.Technology', related_name='candidates', blank=True)

    
    class Meta:
        verbose_name = _('Candidate')
        verbose_name_plural = _('Candidates')
    
    def __str__(self):
        return self.full_name
    
    def get_cv_url(self, expiration_hours: int = 24):
        """
        Get temporary signed URL for CV download.
        
        Args:
            expiration_hours: URL expiration time in hours
            
        Returns:
            Signed URL string or None if no CV
        """
        if not self.cv_file:
            return None
        
        from datetime import timedelta
        from utils import get_storage_service
        
        storage = get_storage_service()
        return storage.generate_signed_url(
            blob_name=self.cv_file.name,
            expiration=timedelta(hours=expiration_hours)
        )
    
    def delete_cv(self):
        """Delete CV file from storage."""
        if self.cv_file:
            self.cv_file.delete(save=False)
            self.save(update_fields=['cv_file'])
