"""Custom exception classes for ID Extractor.

This module contains the implementation of all custom exception classes used
in the ID Extractor library. These exceptions provide structured error handling
with detailed error messages and additional context information.

All exceptions inherit from IDExtractorError and can be serialized to
dictionaries for API responses.

Example:
    Creating and handling custom exceptions::

        from src.domain.exceptions import LowFidelityError

        # Raise exception with details
        raise LowFidelityError(
            fidelity_score=85.0,
            min_required=95.0,
            details={'failed_fields': ['nombres', 'apellidos']}
        )

        # Handle and serialize exception
        try:
            # extraction code
        except IDExtractorError as e:
            error_dict = e.to_dict()
            return {'success': False, 'error': error_dict}

Todo:
    * Add exception chaining support
    * Implement localization for error messages
    * Add error recovery suggestions
"""

from typing import Optional, Dict, Any

class IDExtractorError(Exception):
    """Base exception class for all ID Extractor errors.

    This is the base class for all exceptions in the ID Extractor library.
    It provides a consistent interface for error handling with support for
    error messages, additional details, and dictionary serialization.

    Attributes:
        message (str): Human-readable error message.
        details (dict): Additional error context and information.

    Example:
        >>> error = IDExtractorError("Processing failed", {'code': 500})
        >>> print(error.message)
        Processing failed
        >>> print(error.to_dict())
        {'error': 'IDExtractorError', 'message': 'Processing failed', 'details': {'code': 500}}
    """

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        """Initialize IDExtractorError.

        Args:
            message (str): The error message to display.
            details (:obj:`dict`, optional): Additional error details and context.
                Defaults to empty dictionary if not provided.
        """
        super().__init__(message)
        self.message = message
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses.

        Returns:
            dict: Dictionary containing error type, message, and details.

        Example:
            >>> error = IDExtractorError("Test error", {'field': 'value'})
            >>> error.to_dict()
            {'error': 'IDExtractorError', 'message': 'Test error', 'details': {'field': 'value'}}
        """
        return {
            'error': self.__class__.__name__,
            'message': self.message,
            'details': self.details
        }

class InvalidBase64Error(IDExtractorError):
    """Exception raised when base64 decoding fails.

    This exception is raised when the provided string is not valid base64
    or cannot be decoded properly.

    Example:
        >>> raise InvalidBase64Error("Invalid padding", {'input_length': 100})
    """

    def __init__(self, message: str = "El string proporcionado no es un base64 válido", details: Optional[Dict[str, Any]] = None):
        """Initialize InvalidBase64Error.

        Args:
            message (str): Error message. Defaults to Spanish message about invalid base64.
            details (:obj:`dict`, optional): Additional error details.
        """
        super().__init__(message, details)

class InvalidImageError(IDExtractorError):
    """Exception raised when image format or content is invalid.

    This exception is raised when the provided image cannot be processed,
    has an unsupported format, or doesn't contain the expected document type.

    Example:
        >>> raise InvalidImageError("Unsupported format", {'format': 'BMP'})
    """

    def __init__(self, message: str = "La imagen proporcionada no es válida o no es una cédula colombiana", details: Optional[Dict[str, Any]] = None):
        """Initialize InvalidImageError.

        Args:
            message (str): Error message. Defaults to Spanish message about invalid image.
            details (:obj:`dict`, optional): Additional error details.
        """
        super().__init__(message, details)

class ImageQualityError(IDExtractorError):
    """Exception raised when image quality is too low for processing.

    This exception is raised when the image quality metrics (resolution,
    contrast, clarity) are below the minimum thresholds for reliable extraction.

    Example:
        >>> raise ImageQualityError("Image too blurry", {'quality_score': 5.2})
    """

    def __init__(self, message: str = "La imagen tiene baja calidad o es ilegible", details: Optional[Dict[str, Any]] = None):
        """Initialize ImageQualityError.

        Args:
            message (str): Error message. Defaults to Spanish message about low quality.
            details (:obj:`dict`, optional): Additional error details including quality metrics.
        """
        super().__init__(message, details)

class LowFidelityError(IDExtractorError):
    """Exception raised when extraction confidence is below threshold.

    This exception is raised when the AI model's confidence in the extracted
    data is below the configured minimum threshold, indicating unreliable results.

    The exception automatically includes the actual and required fidelity scores
    in the error details.

    Attributes:
        fidelity_score (float): The actual confidence score achieved (0-100).
        min_required (float): The minimum required confidence score.

    Example:
        >>> raise LowFidelityError(
        ...     fidelity_score=75.0,
        ...     min_required=95.0,
        ...     details={'failed_fields': ['numero_documento']}
        ... )
    """

    def __init__(self, fidelity_score: float, min_required: float, details: Optional[Dict[str, Any]] = None):
        """Initialize LowFidelityError.

        Args:
            fidelity_score (float): The actual confidence score (0-100).
            min_required (float): The minimum required score.
            details (:obj:`dict`, optional): Additional error details such as
                failed fields or validation issues.
        """
        self.fidelity_score = fidelity_score
        self.min_required = min_required
        self.details = details or {}
        
        message = f"El nivel de confianza de la extracción es muy bajo: {fidelity_score:.2f}% (mínimo requerido: {min_required:.2f}%)"
        error_details = self.details.copy()
        error_details.update({
            'fidelity_score': fidelity_score,
            'min_required': min_required
        })
        super().__init__(message, error_details)

class ProcessingError(IDExtractorError):
    """Exception raised for general processing failures.

    This is a catch-all exception for errors that occur during the extraction
    pipeline but don't fit into more specific exception categories.

    Example:
        >>> raise ProcessingError("Timeout during extraction", {'elapsed': 30.5})
    """

    def __init__(self, message: str = "Error durante el procesamiento de la imagen", details: Optional[Dict[str, Any]] = None):
        """Initialize ProcessingError.

        Args:
            message (str): Error message. Defaults to Spanish message about processing error.
            details (:obj:`dict`, optional): Additional error details.
        """
        super().__init__(message, details)

class ServiceUnavailableError(IDExtractorError):
    """Exception raised when the AI service is unavailable.

    This exception is raised when the Gemini API or other external services
    are unreachable, return errors, or are temporarily unavailable.

    Example:
        >>> raise ServiceUnavailableError(
        ...     "API rate limit exceeded",
        ...     {'retry_after': 60, 'status_code': 429}
        ... )
    """

    def __init__(self, message: str = "El servicio de Gemini no está disponible", details: Optional[Dict[str, Any]] = None):
        """Initialize ServiceUnavailableError.

        Args:
            message (str): Error message. Defaults to Spanish message about service unavailability.
            details (:obj:`dict`, optional): Additional error details including
                status codes, retry information, etc.
        """
        super().__init__(message, details)

class ValidationError(IDExtractorError):
    """Exception raised when extracted data fails validation.

    This exception is raised when the extracted data doesn't meet validation
    criteria such as format requirements, mandatory fields, or data consistency
    rules.

    Example:
        >>> raise ValidationError(
        ...     "Invalid document number format",
        ...     {'field': 'numero_documento', 'value': 'ABC123', 'expected': 'numeric'}
        ... )
    """

    def __init__(self, message: str = "Error de validación en los datos extraídos", details: Optional[Dict[str, Any]] = None):
        """Initialize ValidationError.

        Args:
            message (str): Error message. Defaults to Spanish message about validation error.
            details (:obj:`dict`, optional): Additional error details including
                failed validations, invalid fields, etc.
        """
        super().__init__(message, details)

class ConfigurationError(IDExtractorError):
    """Exception raised for configuration issues.

    This exception is raised when there are problems with system configuration
    such as missing API keys, invalid settings, or incompatible configurations.

    Example:
        >>> raise ConfigurationError(
        ...     "Missing API key",
        ...     {'missing_var': 'GEMINI_API_KEY', 'required_by': 'GeminiService'}
        ... )
    """

    def __init__(self, message: str = "Error en la configuración del sistema", details: Optional[Dict[str, Any]] = None):
        """Initialize ConfigurationError.

        Args:
            message (str): Error message. Defaults to Spanish message about configuration error.
            details (:obj:`dict`, optional): Additional error details including
                missing configurations, invalid values, etc.
        """
        super().__init__(message, details)

class NotRequestedDocumentError(IDExtractorError):
    """Exception raised when the document is not of the requested type.

    This exception is raised when Gemini detects that the provided document
    does not match the expected document type. For example, when a driver's
    license is provided but a Colombian ID is expected.

    Example:
        >>> raise NotRequestedDocumentError(
        ...     "Se esperaba una cédula colombiana pero se recibió una licencia de conducción",
        ...     {
        ...         'expected_type': 'colombian_id',
        ...         'detected_type': 'driver_license',
        ...         'gemini_message': 'This appears to be a driver license, not an ID'
        ...     }
        ... )
    """

    def __init__(self, message: str = "El documento proporcionado no es del tipo solicitado", details: Optional[Dict[str, Any]] = None):
        """Initialize NotRequestedDocumentError.

        Args:
            message (str): Error message. Defaults to Spanish message about incorrect document type.
            details (:obj:`dict`, optional): Additional error details including
                expected type, detected type, and any explanation from Gemini.
        """
        super().__init__(message, details)