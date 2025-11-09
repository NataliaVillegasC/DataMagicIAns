"""
Custom storage configurations for users app.

Provides pre-configured storage instances for different file types.
"""

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from datetime import timedelta
import os

# Use local storage in development if GCP credentials are not available
if settings.DEBUG and not getattr(settings, 'GCP_CREDENTIALS_JSON', None):
    # Local file system storage for development
    candidate_cv_storage = FileSystemStorage(
        location=os.path.join(settings.MEDIA_ROOT, 'candidate_cvs'),
        base_url='/media/candidate_cvs/'
    )
else:
    # GCP Storage for production
    from utils.gcp_storage import GCPStorage
    from utils.enums import StorageDomain
    
    candidate_cv_storage = GCPStorage(
        domain=StorageDomain.CANDIDATES,
        generate_signed_urls=True,
        signed_url_expiration=timedelta(hours=24)
    )


def get_candidate_cv_upload_path(instance, filename):
    """
    Generate upload path for candidate CVs.
    
    Format: {company_name}/candidates/{candidate_id}_{filename}
    
    Args:
        instance: Candidate model instance
        filename: Original filename
        
    Returns:
        Upload path string
    """
    company_name = instance.registrated_by.company.name if getattr(instance, 'registrated_by', None) else 'default'
    candidate_id = str(instance.id) if instance.id else 'new'
    return f"{company_name}/candidates/{candidate_id}_{filename}"

