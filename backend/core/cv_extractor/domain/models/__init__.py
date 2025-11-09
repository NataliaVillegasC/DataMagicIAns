"""Models package for document processing and validation.

This package provides the core data models and validation utilities for extracting
and processing various types of identity documents. It includes generic document
representations, configuration classes for specific document types, and validators
for ensuring data integrity.

The package is designed to be extensible, allowing for easy addition of new document
types and validation rules while maintaining backward compatibility.

Examples:
    Basic usage of the models package:

    >>> from src.domain.models import GenericDocument, DocumentValidator
    >>> from src.domain.models import ColombianIDConfig
    >>>
    >>> # Create a document instance
    >>> doc = GenericDocument(data={'document_number': '12345678'})
    >>> doc['first_names'] = 'JUAN CARLOS'
    >>>
    >>> # Validate the document
    >>> validator = DocumentValidator()
    >>> is_valid, errors = validator.validate_document_data(doc.to_dict())

Typical workflow:
    1. Configure document type using DocumentConfig subclasses
    2. Extract data using vision models with configured prompts
    3. Create GenericDocument instances with extracted data
    4. Validate using DocumentValidator
    5. Return ExtractionResult with confidence scores
"""

from .generic_document import GenericDocument, ExtractionResult, IDDocument  # IDDocument es alias para compatibilidad
# Nota: los validadores se encuentran ahora en ``src.domain.services.validators``
from ..services.validators import DocumentValidator
from .document_config import DocumentConfig, ColombianIDConfig, CVConfig

__all__ = [
    'GenericDocument',
    'IDDocument',  # Alias para compatibilidad
    'ExtractionResult',
    'DocumentValidator',
    'DocumentConfig',
    'ColombianIDConfig',
    'CVConfig',
]