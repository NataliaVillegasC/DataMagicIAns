"""
Django custom storage backend for Google Cloud Storage.

Integrates the StorageService with Django's file storage system,
allowing seamless use with FileField and ImageField.
"""

import os
from io import BytesIO
from datetime import timedelta
from typing import Optional
from django.core.files.base import File
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible
from .storage_service import get_storage_service
from .enums import StorageDomain


@deconstructible
class GCPStorage(Storage):
    """
    Django storage backend for Google Cloud Storage.
    
    Usage in models:
        cv_file = models.FileField(
            upload_to='candidates/',
            storage=GCPStorage(domain=StorageDomain.CANDIDATES)
        )
    """
    
    def __init__(
        self,
        domain: StorageDomain = StorageDomain.DOCUMENTS,
        company_name: str = 'default',
        generate_signed_urls: bool = True,
        signed_url_expiration: timedelta = timedelta(hours=1)
    ):
        """
        Initialize GCP storage backend.
        
        Args:
            domain: Storage domain for organizing files
            company_name: Company identifier (can be overridden per file)
            generate_signed_urls: Whether to generate signed URLs for file access
            signed_url_expiration: Expiration time for signed URLs
        """
        self.domain = domain
        self.company_name = company_name
        self.generate_signed_urls = generate_signed_urls
        self.signed_url_expiration = signed_url_expiration
        self._storage_service = None
    
    @property
    def storage_service(self):
        """Lazy load storage service."""
        if self._storage_service is None:
            self._storage_service = get_storage_service()
        return self._storage_service
    
    def _get_company_from_path(self, name: str) -> tuple[str, str]:
        """
        Extract company name from path if present.
        
        Expected format: {company_name}/{filename} or just {filename}
        
        Args:
            name: File path/name
            
        Returns:
            Tuple of (company_name, filename)
        """
        parts = name.split('/', 1)
        if len(parts) == 2 and not parts[0].startswith('_'):
            # Assume first part is company name
            return parts[0], parts[1]
        return self.company_name, name
    
    def _save(self, name: str, content: File) -> str:
        """
        Save file to GCP storage.
        
        Args:
            name: File name/path
            content: File content
            
        Returns:
            The name of the saved file (blob path)
        """
        # Extract company and filename
        company_name, filename = self._get_company_from_path(name)
        
        # Read file content
        content.seek(0)
        file_content = content.read()
        
        # Upload to GCS
        result = self.storage_service.upload_file(
            file=file_content,
            company_name=company_name,
            domain=self.domain,
            filename=filename,
            content_type=getattr(content, 'content_type', None),
            use_unique_filename=True
        )
        
        if result['success']:
            return result['blob_name']
        else:
            raise IOError(f"Failed to upload file: {result.get('error', 'Unknown error')}")
    
    def _open(self, name: str, mode: str = 'rb') -> File:
        """
        Open and read file from GCP storage.
        
        Args:
            name: File name/path (blob name)
            mode: File open mode
            
        Returns:
            File object
        """
        content = self.storage_service.download_file(name)
        
        if content:
            file_obj = BytesIO(content)
            file_obj.name = os.path.basename(name)
            return File(file_obj)
        else:
            raise IOError(f"File not found: {name}")
    
    def delete(self, name: str) -> bool:
        """
        Delete file from GCP storage.
        
        Args:
            name: File name/path (blob name)
            
        Returns:
            True if deleted successfully
        """
        return self.storage_service.delete_file(name)
    
    def exists(self, name: str) -> bool:
        """
        Check if file exists in GCP storage.
        
        Args:
            name: File name/path (blob name)
            
        Returns:
            True if file exists
        """
        return self.storage_service.file_exists(name)
    
    def size(self, name: str) -> int:
        """
        Get file size.
        
        Args:
            name: File name/path (blob name)
            
        Returns:
            File size in bytes
        """
        metadata = self.storage_service.get_file_metadata(name)
        return metadata['size'] if metadata else 0
    
    def url(self, name: str) -> str:
        """
        Get URL for file access.
        
        Args:
            name: File name/path (blob name)
            
        Returns:
            File URL (signed if configured)
        """
        if self.generate_signed_urls:
            url = self.storage_service.generate_signed_url(
                blob_name=name,
                expiration=self.signed_url_expiration
            )
            return url or ''
        else:
            # Return public URL (will only work if file is public)
            metadata = self.storage_service.get_file_metadata(name)
            return metadata.get('public_url', '') if metadata else ''
    
    def get_accessed_time(self, name: str) -> Optional[any]:
        """Get last accessed time (not supported by GCS)."""
        return None
    
    def get_created_time(self, name: str) -> Optional[any]:
        """
        Get file creation time.
        
        Args:
            name: File name/path (blob name)
            
        Returns:
            Creation datetime or None
        """
        metadata = self.storage_service.get_file_metadata(name)
        return metadata['created'] if metadata else None
    
    def get_modified_time(self, name: str) -> Optional[any]:
        """
        Get file modification time.
        
        Args:
            name: File name/path (blob name)
            
        Returns:
            Modification datetime or None
        """
        metadata = self.storage_service.get_file_metadata(name)
        return metadata['updated'] if metadata else None


# Pre-configured storage instances for common use cases
candidate_cv_storage = GCPStorage(
    domain=StorageDomain.CANDIDATES,
    generate_signed_urls=True,
    signed_url_expiration=timedelta(hours=24)
)

company_document_storage = GCPStorage(
    domain=StorageDomain.COMPANIES,
    generate_signed_urls=True,
    signed_url_expiration=timedelta(hours=1)
)

profile_picture_storage = GCPStorage(
    domain=StorageDomain.PROFILES,
    generate_signed_urls=True,
    signed_url_expiration=timedelta(days=7)
)

job_posting_storage = GCPStorage(
    domain=StorageDomain.JOB_POSTINGS,
    generate_signed_urls=True,
    signed_url_expiration=timedelta(hours=24)
)

report_storage = GCPStorage(
    domain=StorageDomain.REPORTS,
    generate_signed_urls=True,
    signed_url_expiration=timedelta(hours=12)
)

