"""
Google Cloud Storage service for file management.

This service provides a unified interface for uploading, downloading,
and managing files in Google Cloud Storage with organized folder structure.

Folder structure: /{company_name}/{domain}/{filename}
Example: /acme_corp/candidates/john_doe_cv.pdf
"""

import os
import json
import uuid
import logging
from typing import Optional, Dict, Any, BinaryIO, Union
from pathlib import Path
from datetime import timedelta
from django.conf import settings
from google.cloud import storage
from google.cloud.exceptions import GoogleCloudError, NotFound
from google.oauth2 import service_account
from .enums import StorageDomain


logger = logging.getLogger(__name__)


class StorageService:
    """
    Service for managing file uploads and downloads in Google Cloud Storage.
    
    Features:
    - Automatic folder organization by company and domain
    - Unique filename generation
    - Public and signed URL generation
    - File existence checking
    - File deletion
    - Metadata management
    """
    
    def __init__(
        self,
        bucket_name: Optional[str] = None,
        credentials_json: Optional[str] = None
    ):
        """
        Initialize storage service.
        
        Args:
            bucket_name: GCP bucket name (defaults to settings.GCP_BUCKET_NAME)
            credentials_json: JSON string with service account credentials (defaults to settings.GCP_CREDENTIALS_JSON)
        """
        self.bucket_name = bucket_name or getattr(settings, 'GCP_BUCKET_NAME', None)
        self.credentials_json = credentials_json or getattr(settings, 'GCP_CREDENTIALS_JSON', None)
        
        if not self.bucket_name:
            raise ValueError("GCP_BUCKET_NAME must be set in settings or provided")
        
        self._client = None
        self._bucket = None
        self._credentials = None
    
    def _get_credentials(self) -> Optional[service_account.Credentials]:
        """
        Parse and create credentials from JSON string.
        
        Returns:
            Service account credentials or None
        """
        if self._credentials is None and self.credentials_json:
            try:
                # Parse JSON string to dict
                credentials_dict = json.loads(self.credentials_json)
                
                # Create credentials from dict
                self._credentials = service_account.Credentials.from_service_account_info(
                    credentials_dict
                )
                
                logger.info("GCP credentials loaded successfully from JSON string")
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse GCP credentials JSON: {str(e)}")
                raise ValueError(f"Invalid GCP_CREDENTIALS_JSON format: {str(e)}")
            except Exception as e:
                logger.error(f"Failed to create GCP credentials: {str(e)}")
                raise ValueError(f"Failed to create GCP credentials: {str(e)}")
        
        return self._credentials
    
    @property
    def client(self) -> storage.Client:
        """Lazy load GCP storage client."""
        if self._client is None:
            credentials = self._get_credentials()
            
            if credentials:
                # Use credentials from JSON string
                self._client = storage.Client(
                    credentials=credentials,
                    project=getattr(settings, 'GCP_PROJECT_ID', None)
                )
                logger.info("GCP Storage client initialized with credentials from env")
            else:
                # Try to use default credentials (for Cloud Run, Compute Engine, etc.)
                self._client = storage.Client()
                logger.info("GCP Storage client initialized with default credentials")
        
        return self._client
    
    @property
    def bucket(self) -> storage.Bucket:
        """Lazy load GCP storage bucket."""
        if self._bucket is None:
            self._bucket = self.client.bucket(self.bucket_name)
        return self._bucket
    
    def _normalize_company_name(self, company_name: str) -> str:
        """
        Normalize company name for folder path.
        
        Args:
            company_name: Raw company name
            
        Returns:
            Normalized company name (lowercase, underscores, no special chars)
        """
        import re
        # Remove special characters and replace spaces with underscores
        normalized = re.sub(r'[^\w\s-]', '', company_name.lower())
        normalized = re.sub(r'[-\s]+', '_', normalized)
        return normalized.strip('_')
    
    def _generate_unique_filename(
        self,
        original_filename: str,
        use_uuid: bool = True
    ) -> str:
        """
        Generate a unique filename.
        
        Args:
            original_filename: Original file name
            use_uuid: Whether to prepend UUID to filename
            
        Returns:
            Unique filename with extension
        """
        # Extract extension
        file_path = Path(original_filename)
        extension = file_path.suffix.lower()
        name = file_path.stem
        
        # Sanitize filename
        import re
        name = re.sub(r'[^\w\s-]', '', name)
        name = re.sub(r'[-\s]+', '_', name)
        
        if use_uuid:
            unique_id = uuid.uuid4().hex[:12]
            return f"{unique_id}_{name}{extension}"
        
        return f"{name}{extension}"
    
    def _build_blob_path(
        self,
        company_name: str,
        domain: Union[StorageDomain, str],
        filename: str
    ) -> str:
        """
        Build the full blob path in storage.
        
        Args:
            company_name: Company identifier
            domain: Storage domain (e.g., 'candidates', 'documents')
            filename: File name
            
        Returns:
            Full blob path: {company}/{domain}/{filename}
        """
        normalized_company = self._normalize_company_name(company_name)
        domain_str = domain.value if isinstance(domain, StorageDomain) else domain
        
        return f"{normalized_company}/{domain_str}/{filename}"
    
    def upload_file(
        self,
        file: Union[BinaryIO, bytes, str],
        company_name: str,
        domain: Union[StorageDomain, str],
        filename: Optional[str] = None,
        content_type: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None,
        make_public: bool = False,
        use_unique_filename: bool = True
    ) -> Dict[str, Any]:
        """
        Upload a file to Google Cloud Storage.
        
        Args:
            file: File object, bytes, or file path
            company_name: Company identifier
            domain: Storage domain
            filename: Original filename (auto-detected if file path provided)
            content_type: MIME type (auto-detected if not provided)
            metadata: Custom metadata dict
            make_public: Whether to make file publicly accessible
            use_unique_filename: Whether to generate unique filename
            
        Returns:
            Dict with upload results:
            {
                'success': bool,
                'blob_name': str,
                'public_url': str or None,
                'bucket': str,
                'size': int,
                'content_type': str
            }
            
        Raises:
            GoogleCloudError: If upload fails
        """
        try:
            # Handle different file input types
            if isinstance(file, str):
                # File path provided
                if not filename:
                    filename = os.path.basename(file)
                with open(file, 'rb') as f:
                    file_data = f.read()
            elif isinstance(file, bytes):
                # Bytes provided
                file_data = file
                if not filename:
                    filename = f"file_{uuid.uuid4().hex[:8]}"
            else:
                # File object provided
                if hasattr(file, 'name') and not filename:
                    filename = os.path.basename(file.name)
                file_data = file.read()
            
            # Generate unique filename if requested
            if use_unique_filename:
                filename = self._generate_unique_filename(filename)
            
            # Build blob path
            blob_path = self._build_blob_path(company_name, domain, filename)
            
            # Create blob
            blob = self.bucket.blob(blob_path)
            
            # Set metadata
            if metadata:
                blob.metadata = metadata
            
            # Auto-detect content type if not provided
            if not content_type:
                import mimetypes
                content_type, _ = mimetypes.guess_type(filename)
                content_type = content_type or 'application/octet-stream'
            
            # Upload file
            blob.upload_from_string(
                file_data,
                content_type=content_type
            )
            
            # Make public if requested
            public_url = None
            if make_public:
                blob.make_public()
                public_url = blob.public_url
            
            logger.info(f"File uploaded successfully: {blob_path}")
            
            return {
                'success': True,
                'blob_name': blob_path,
                'public_url': public_url,
                'bucket': self.bucket_name,
                'size': len(file_data),
                'content_type': content_type,
                'filename': filename
            }
        
        except GoogleCloudError as e:
            logger.error(f"Failed to upload file to GCS: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'blob_name': None
            }
    
    def download_file(
        self,
        blob_name: str,
        destination: Optional[str] = None
    ) -> Union[bytes, bool]:
        """
        Download a file from Google Cloud Storage.
        
        Args:
            blob_name: Full blob path in storage
            destination: Local file path to save (if None, returns bytes)
            
        Returns:
            File bytes if destination is None, True if saved successfully, False on error
        """
        try:
            blob = self.bucket.blob(blob_name)
            
            if not blob.exists():
                logger.error(f"Blob does not exist: {blob_name}")
                return False
            
            if destination:
                # Download to file
                os.makedirs(os.path.dirname(destination), exist_ok=True)
                blob.download_to_filename(destination)
                logger.info(f"File downloaded to: {destination}")
                return True
            else:
                # Return bytes
                return blob.download_as_bytes()
        
        except GoogleCloudError as e:
            logger.error(f"Failed to download file from GCS: {str(e)}")
            return False
    
    def delete_file(self, blob_name: str) -> bool:
        """
        Delete a file from Google Cloud Storage.
        
        Args:
            blob_name: Full blob path in storage
            
        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            blob = self.bucket.blob(blob_name)
            blob.delete()
            logger.info(f"File deleted: {blob_name}")
            return True
        
        except NotFound:
            logger.warning(f"File not found for deletion: {blob_name}")
            return False
        
        except GoogleCloudError as e:
            logger.error(f"Failed to delete file from GCS: {str(e)}")
            return False
    
    def file_exists(self, blob_name: str) -> bool:
        """
        Check if a file exists in storage.
        
        Args:
            blob_name: Full blob path in storage
            
        Returns:
            True if file exists, False otherwise
        """
        try:
            blob = self.bucket.blob(blob_name)
            return blob.exists()
        except GoogleCloudError as e:
            logger.error(f"Error checking file existence: {str(e)}")
            return False
    
    def generate_signed_url(
        self,
        blob_name: str,
        expiration: timedelta = timedelta(hours=1),
        method: str = 'GET'
    ) -> Optional[str]:
        """
        Generate a signed URL for temporary access to a file.
        
        Args:
            blob_name: Full blob path in storage
            expiration: URL expiration time (default: 1 hour)
            method: HTTP method (GET, PUT, POST, DELETE)
            
        Returns:
            Signed URL string or None if failed
        """
        try:
            blob = self.bucket.blob(blob_name)
            
            url = blob.generate_signed_url(
                version="v4",
                expiration=expiration,
                method=method
            )
            
            return url
        
        except GoogleCloudError as e:
            logger.error(f"Failed to generate signed URL: {str(e)}")
            return None
    
    def list_files(
        self,
        company_name: str,
        domain: Optional[Union[StorageDomain, str]] = None,
        prefix: Optional[str] = None,
        max_results: Optional[int] = None
    ) -> list:
        """
        List files in a specific company/domain folder.
        
        Args:
            company_name: Company identifier
            domain: Storage domain (optional, lists all domains if None)
            prefix: Additional prefix filter
            max_results: Maximum number of results
            
        Returns:
            List of blob names
        """
        try:
            normalized_company = self._normalize_company_name(company_name)
            
            if domain:
                domain_str = domain.value if isinstance(domain, StorageDomain) else domain
                base_prefix = f"{normalized_company}/{domain_str}/"
            else:
                base_prefix = f"{normalized_company}/"
            
            if prefix:
                base_prefix = f"{base_prefix}{prefix}"
            
            blobs = self.client.list_blobs(
                self.bucket_name,
                prefix=base_prefix,
                max_results=max_results
            )
            
            return [blob.name for blob in blobs]
        
        except GoogleCloudError as e:
            logger.error(f"Failed to list files: {str(e)}")
            return []
    
    def get_file_metadata(self, blob_name: str) -> Optional[Dict[str, Any]]:
        """
        Get metadata for a file.
        
        Args:
            blob_name: Full blob path in storage
            
        Returns:
            Dict with file metadata or None if not found
        """
        try:
            blob = self.bucket.blob(blob_name)
            blob.reload()
            
            return {
                'name': blob.name,
                'size': blob.size,
                'content_type': blob.content_type,
                'created': blob.time_created,
                'updated': blob.updated,
                'metadata': blob.metadata or {},
                'public_url': blob.public_url if blob.public_url else None
            }
        
        except NotFound:
            logger.warning(f"File not found: {blob_name}")
            return None
        
        except GoogleCloudError as e:
            logger.error(f"Failed to get file metadata: {str(e)}")
            return None
    
    def copy_file(
        self,
        source_blob_name: str,
        dest_company_name: str,
        dest_domain: Union[StorageDomain, str],
        dest_filename: Optional[str] = None
    ) -> Optional[str]:
        """
        Copy a file to a new location within the same bucket.
        
        Args:
            source_blob_name: Source blob path
            dest_company_name: Destination company
            dest_domain: Destination domain
            dest_filename: Destination filename (uses source name if None)
            
        Returns:
            Destination blob name or None if failed
        """
        try:
            source_blob = self.bucket.blob(source_blob_name)
            
            if not dest_filename:
                dest_filename = os.path.basename(source_blob_name)
            
            dest_blob_name = self._build_blob_path(
                dest_company_name,
                dest_domain,
                dest_filename
            )
            
            dest_blob = self.bucket.copy_blob(
                source_blob,
                self.bucket,
                dest_blob_name
            )
            
            logger.info(f"File copied: {source_blob_name} -> {dest_blob_name}")
            return dest_blob_name
        
        except GoogleCloudError as e:
            logger.error(f"Failed to copy file: {str(e)}")
            return None


# Singleton instance
_storage_service = None


def get_storage_service() -> StorageService:
    """
    Get or create storage service singleton instance.
    
    Returns:
        StorageService instance
    """
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service

