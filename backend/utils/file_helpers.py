"""
File helper utilities for common file operations.

Provides helpers for file validation, processing, and conversion.
"""

import os
import mimetypes
from typing import Optional, Tuple, List
from pathlib import Path


# Allowed file extensions by category
ALLOWED_EXTENSIONS = {
    'documents': ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
    'images': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'],
    'spreadsheets': ['.xls', '.xlsx', '.csv', '.ods'],
    'archives': ['.zip', '.rar', '.7z', '.tar', '.gz'],
    'videos': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'],
    'audio': ['.mp3', '.wav', '.ogg', '.m4a', '.flac']
}

# Maximum file sizes by category (in bytes)
MAX_FILE_SIZES = {
    'documents': 10 * 1024 * 1024,  # 10 MB
    'images': 5 * 1024 * 1024,  # 5 MB
    'spreadsheets': 10 * 1024 * 1024,  # 10 MB
    'archives': 50 * 1024 * 1024,  # 50 MB
    'videos': 100 * 1024 * 1024,  # 100 MB
    'audio': 20 * 1024 * 1024,  # 20 MB
}


def validate_file_extension(
    filename: str,
    allowed_categories: Optional[List[str]] = None
) -> Tuple[bool, Optional[str]]:
    """
    Validate file extension against allowed categories.
    
    Args:
        filename: File name to validate
        allowed_categories: List of allowed categories (e.g., ['documents', 'images'])
                          If None, all categories are allowed
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    extension = Path(filename).suffix.lower()
    
    if not extension:
        return False, "File has no extension"
    
    if allowed_categories is None:
        # Allow all known extensions
        all_extensions = []
        for exts in ALLOWED_EXTENSIONS.values():
            all_extensions.extend(exts)
        
        if extension not in all_extensions:
            return False, f"File extension '{extension}' is not allowed"
        
        return True, None
    
    # Check specified categories
    for category in allowed_categories:
        if category in ALLOWED_EXTENSIONS:
            if extension in ALLOWED_EXTENSIONS[category]:
                return True, None
    
    allowed_exts = []
    for cat in allowed_categories:
        if cat in ALLOWED_EXTENSIONS:
            allowed_exts.extend(ALLOWED_EXTENSIONS[cat])
    
    return False, f"File extension '{extension}' not in allowed extensions: {', '.join(allowed_exts)}"


def validate_file_size(
    file_size: int,
    category: Optional[str] = None,
    max_size: Optional[int] = None
) -> Tuple[bool, Optional[str]]:
    """
    Validate file size.
    
    Args:
        file_size: File size in bytes
        category: File category to check against category limits
        max_size: Custom maximum size in bytes (overrides category)
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if max_size is not None:
        if file_size > max_size:
            return False, f"File size ({format_file_size(file_size)}) exceeds maximum ({format_file_size(max_size)})"
        return True, None
    
    if category and category in MAX_FILE_SIZES:
        max_allowed = MAX_FILE_SIZES[category]
        if file_size > max_allowed:
            return False, f"File size ({format_file_size(file_size)}) exceeds maximum for {category} ({format_file_size(max_allowed)})"
    
    # Default max: 50 MB
    default_max = 50 * 1024 * 1024
    if file_size > default_max:
        return False, f"File size ({format_file_size(file_size)}) exceeds default maximum ({format_file_size(default_max)})"
    
    return True, None


def get_file_category(filename: str) -> Optional[str]:
    """
    Determine file category based on extension.
    
    Args:
        filename: File name
    
    Returns:
        Category name or None if unknown
    """
    extension = Path(filename).suffix.lower()
    
    for category, extensions in ALLOWED_EXTENSIONS.items():
        if extension in extensions:
            return category
    
    return None


def format_file_size(size_bytes: int) -> str:
    """
    Format file size in human-readable format.
    
    Args:
        size_bytes: Size in bytes
    
    Returns:
        Formatted string (e.g., '1.5 MB')
    """
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} PB"


def sanitize_filename(filename: str, max_length: int = 255) -> str:
    """
    Sanitize filename by removing/replacing invalid characters.
    
    Args:
        filename: Original filename
        max_length: Maximum filename length
    
    Returns:
        Sanitized filename
    """
    import re
    
    # Get name and extension
    path = Path(filename)
    name = path.stem
    extension = path.suffix
    
    # Remove invalid characters
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    
    # Replace multiple spaces/underscores with single underscore
    name = re.sub(r'[\s_]+', '_', name)
    
    # Remove leading/trailing dots and underscores
    name = name.strip('._')
    
    # Ensure name is not empty
    if not name:
        name = 'file'
    
    # Combine name and extension, respecting max length
    full_name = f"{name}{extension}"
    if len(full_name) > max_length:
        # Trim name part while keeping extension
        max_name_length = max_length - len(extension)
        name = name[:max_name_length]
        full_name = f"{name}{extension}"
    
    return full_name


def get_mime_type(filename: str) -> str:
    """
    Get MIME type for a filename.
    
    Args:
        filename: File name
    
    Returns:
        MIME type string
    """
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or 'application/octet-stream'


def is_image(filename: str) -> bool:
    """Check if file is an image."""
    return get_file_category(filename) == 'images'


def is_document(filename: str) -> bool:
    """Check if file is a document."""
    return get_file_category(filename) == 'documents'


def is_spreadsheet(filename: str) -> bool:
    """Check if file is a spreadsheet."""
    return get_file_category(filename) == 'spreadsheets'


def extract_extension(filename: str) -> str:
    """
    Extract file extension (with dot).
    
    Args:
        filename: File name
    
    Returns:
        Extension string (e.g., '.pdf')
    """
    return Path(filename).suffix.lower()


def extract_name_without_extension(filename: str) -> str:
    """
    Extract filename without extension.
    
    Args:
        filename: File name
    
    Returns:
        Name without extension
    """
    return Path(filename).stem

