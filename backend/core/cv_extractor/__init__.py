"""CV Extractor Library - Streamlined for CV extraction only."""

from .application.services.document_extractor import DocumentExtractor
from .domain.models import (
    GenericDocument,
    IDDocument,
    ExtractionResult,
    DocumentConfig,
    ColombianIDConfig,
    CVConfig,
)
from .domain.exceptions import (
    IDExtractorError,
    InvalidBase64Error,
    InvalidImageError,
    ImageQualityError,
    LowFidelityError,
    ProcessingError,
    ServiceUnavailableError,
    ValidationError,
    ConfigurationError,
    NotRequestedDocumentError,
)

__version__ = "2.0.0"

__all__ = [
    "extract_document_info",
    "DocumentExtractor",
    "GenericDocument",
    "IDDocument",
    "ExtractionResult",
    "DocumentConfig",
    "ColombianIDConfig",
    "CVConfig",
    "IDExtractorError",
    "InvalidBase64Error",
    "InvalidImageError",
    "ImageQualityError",
    "LowFidelityError",
    "ProcessingError",
    "ServiceUnavailableError",
    "ValidationError",
    "ConfigurationError",
    "NotRequestedDocumentError",
]


def extract_document_info(image_base64: str, document_config: DocumentConfig = None):
    """Extrae información de un documento en formato base64.
    
    Args:
        image_base64: Imagen del documento en formato base64
        document_config: Configuración del tipo de documento (por defecto: ColombianIDConfig)
        
    Returns:
        dict: Diccionario con los datos extraídos y el fidelity score
        
    Example:
        >>> result = extract_document_info(base64_image)
        >>> print(result['data']['document_number'])
    """
    config = document_config or ColombianIDConfig()
    extractor = DocumentExtractor(config)
    return extractor.extract_document_info(image_base64)
