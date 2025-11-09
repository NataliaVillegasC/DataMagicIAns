"""
Utility modules for the project.

Provides common functionality like storage, file handling, and base models.
"""

from .storage_service import StorageService, get_storage_service
from .gcp_storage import (
    GCPStorage,
    candidate_cv_storage,
    company_document_storage,
    profile_picture_storage,
    job_posting_storage,
    report_storage,
)
from .file_helpers import (
    validate_file_extension,
    validate_file_size,
    get_file_category,
    format_file_size,
    sanitize_filename,
    get_mime_type,
    is_image,
    is_document,
    is_spreadsheet,
)
from .enums import StorageDomain, CandidateStatus

__all__ = [
    # Storage
    'StorageService',
    'get_storage_service',
    'GCPStorage',
    'candidate_cv_storage',
    'company_document_storage',
    'profile_picture_storage',
    'job_posting_storage',
    'report_storage',
    # File helpers
    'validate_file_extension',
    'validate_file_size',
    'get_file_category',
    'format_file_size',
    'sanitize_filename',
    'get_mime_type',
    'is_image',
    'is_document',
    'is_spreadsheet',
    # Enums
    'StorageDomain',
    'CandidateStatus',
]

