"""Exception classes for ID Extractor.

This module defines custom exception classes used throughout the ID Extractor
library. All exceptions inherit from IDExtractorError base class and provide
structured error information including error messages and additional details.

The exceptions cover various failure scenarios including image processing
errors, validation failures, service unavailability, and configuration issues.

Example:
    Handling extraction errors::

        from src import extract_id_info
        from src.domain.exceptions import LowFidelityError, InvalidImageError

        try:
            result = extract_id_info(image_base64)
        except LowFidelityError as e:
            print(f"Low confidence: {e.details['fidelity_score']}%")
        except InvalidImageError as e:
            print(f"Invalid image: {e.message}")
        except Exception as e:
            print(f"Unexpected error: {e}")

Attributes:
    IDExtractorError: Base exception class for all ID Extractor errors.
    InvalidBase64Error: Raised when base64 decoding fails.
    InvalidImageError: Raised when image format or content is invalid.
    ImageQualityError: Raised when image quality is too low.
    LowFidelityError: Raised when extraction confidence is below threshold.
    ProcessingError: Raised for general processing failures.
    ServiceUnavailableError: Raised when AI service is unavailable.
    ValidationError: Raised when data validation fails.
    ConfigurationError: Raised for configuration issues.
"""

from .custom_exceptions import (
    IDExtractorError,
    InvalidBase64Error,
    InvalidImageError,
    ImageQualityError,
    LowFidelityError,
    ProcessingError,
    ServiceUnavailableError,
    ValidationError,
    ConfigurationError,
    NotRequestedDocumentError
)

__all__ = [
    'IDExtractorError',
    'InvalidBase64Error',
    'InvalidImageError',
    'ImageQualityError',
    'LowFidelityError',
    'ProcessingError',
    'ServiceUnavailableError',
    'ValidationError',
    'ConfigurationError',
    'NotRequestedDocumentError'
]