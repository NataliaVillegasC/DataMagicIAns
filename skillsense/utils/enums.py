"""
Enums for the project
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from enum import Enum


class CandidateStatus(models.TextChoices):
    """Candidate status"""
    ACTIVE = "ACTIVE", _("Active")
    INACTIVE = "INACTIVE", _("Inactive")
    PENDING = "PENDING", _("Pending")
    REJECTED = "REJECTED", _("Rejected")
    HIRED = "HIRED", _("Hired")
    ON_HOLD = "ON_HOLD", _("On Hold")
    CANCELLED = "CANCELLED", _("Cancelled")
    EXPIRED = "EXPIRED", _("Expired")
    OTHER = "OTHER", _("Other")


class StorageDomain(str, Enum):
    """
    Storage domain paths for organizing files in cloud storage.
    
    Each domain represents a top-level folder category in the storage bucket.
    """
    CANDIDATES = "candidates"
    COMPANIES = "companies"
    JOB_POSTINGS = "job_postings"
    CONTRACTS = "contracts"
    PROFILES = "profiles"
    DOCUMENTS = "documents"
    REPORTS = "reports"
    TEMP = "temp"
    EXPORTS = "exports"
    IMPORTS = "imports"
    
    @classmethod
    def choices(cls):
        """Return choices for Django model field."""
        return [(item.value, item.name.replace('_', ' ').title()) for item in cls]