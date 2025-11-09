"""
Custom storage configurations for users app.

Provides pre-configured storage instances for different file types.
"""

from utils.gcp_storage import GCPStorage
from utils.enums import StorageDomain
from datetime import timedelta


# Storage for candidate CVs
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

