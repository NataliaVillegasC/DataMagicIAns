"""Generic document models for flexible document representation and extraction results.

This module provides generic, flexible data structures for representing various types
of documents and their extraction results. The models are designed to be type-agnostic
and can handle any document structure while maintaining compatibility with existing
code.

Key Features:
    - Generic document representation with dynamic field storage
    - Dictionary-like access patterns for easy field manipulation
    - Comprehensive extraction result tracking with metadata
    - Backward compatibility with existing IDDocument usage
    - Built-in validation and completeness checking
    - Detailed processing metrics and timestamps

Examples:
    Creating and using a generic document:

    >>> from src.domain.models.generic_document import GenericDocument
    >>>
    >>> # Create a document with initial data
    >>> doc = GenericDocument(
    ...     data={'document_number': '12345678', 'first_names': 'JUAN'},
    ...     document_type='colombian_id'
    ... )
    >>>
    >>> # Dictionary-like access
    >>> print(doc['document_number'])  # '12345678'
    >>> doc['last_names'] = 'RODRIGUEZ'
    >>>
    >>> # Check completeness
    >>> required = ['document_number', 'first_names', 'last_names']
    >>> is_complete = doc.is_complete(required)
    >>> missing = doc.get_missing_fields(required)
    >>>
    >>> # Convert to dictionary
    >>> data_dict = doc.to_dict()

    Creating extraction results:

    >>> from src.domain.models.generic_document import ExtractionResult
    >>>
    >>> result = ExtractionResult(
    ...     data={'document_number': '12345678'},
    ...     fidelity=95.5,
    ...     confidence_scores={'document_number': 98},
    ...     processing_time=1.234,
    ...     document_type='colombian_id'
    ... )
    >>>
    >>> # Get API response format
    >>> api_response = result.to_api_response()
    >>> detailed_response = result.to_detailed_response()

Architecture:
    GenericDocument: Flexible document representation
    ├── Dynamic field storage in data dictionary
    ├── Dictionary-like access methods (__getitem__, __setitem__)
    ├── Completeness validation methods
    └── String representation for debugging

    ExtractionResult: Comprehensive extraction outcome
    ├── Extracted data with confidence scores
    ├── Processing metadata and timestamps
    ├── Multiple output formats (API vs detailed)
    └── Quality metrics and fidelity scores

    IDDocument: Backward compatibility alias
    └── Alias for GenericDocument to maintain existing code compatibility
"""

from typing import Optional, Dict, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime

@dataclass
class GenericDocument:
    """Generic document class for representing any type of identity document.

    This class provides a flexible, dictionary-based storage system for document
    fields, allowing it to handle any document type without requiring specific
    field definitions. It supports dictionary-like access patterns and provides
    utility methods for validation and data management.

    The class is designed to be lightweight and extensible, making it easy to
    work with different document types while maintaining consistent behavior.

    Attributes:
        data (Dict[str, Any]): Dictionary storing all document field values
        document_type (str): Identifier for the document type (default: 'generic')

    Examples:
        Basic document operations:

        >>> # Create a new document
        >>> doc = GenericDocument(
        ...     data={'document_number': '12345678', 'name': 'JUAN CARLOS'},
        ...     document_type='colombian_id'
        ... )
        >>>
        >>> # Dictionary-style access
        >>> print(doc['document_number'])  # '12345678'
        >>> doc['birth_date'] = '1990-01-15'
        >>>
        >>> # Get with default value
        >>> height = doc.get('height', '1.75')
        >>>
        >>> # Check completeness
        >>> required_fields = ['document_number', 'name', 'birth_date']
        >>> if doc.is_complete(required_fields):
        ...     print("Document is complete")
        >>>
        >>> # Get missing fields
        >>> missing = doc.get_missing_fields(required_fields)
        >>> if missing:
        ...     print(f"Missing fields: {missing}")
        >>>
        >>> # Convert to dictionary
        >>> data_dict = doc.to_dict()

    Dictionary-like Interface:
        The class supports standard dictionary operations:
        - doc['field'] to get values
        - doc['field'] = value to set values
        - doc.get('field', default) to get with fallback

    Validation Methods:
        - is_complete(): Check if all required fields are present
        - get_missing_fields(): Get list of missing required fields

    Note:
        This class is thread-safe for read operations but not for write operations.
        The data dictionary is mutable and can be modified after creation.
    """
    data: Dict[str, Any] = field(default_factory=dict)
    document_type: str = "generic"

    def __getitem__(self, key: str) -> Any:
        """Enable dictionary-style value access.

        Args:
            key: The field name to retrieve

        Returns:
            The field value, or None if not found

        Examples:
            >>> doc = GenericDocument(data={'name': 'JUAN'})
            >>> print(doc['name'])  # 'JUAN'
            >>> print(doc['missing'])  # None
        """
        return self.data.get(key)

    def __setitem__(self, key: str, value: Any):
        """Enable dictionary-style value assignment.

        Args:
            key: The field name to set
            value: The value to assign

        Examples:
            >>> doc = GenericDocument()
            >>> doc['document_number'] = '12345678'
            >>> doc['birth_date'] = '1990-01-15'
        """
        self.data[key] = value

    def get(self, key: str, default: Any = None) -> Any:
        """Get a field value with optional default.

        Args:
            key: The field name to retrieve
            default: Default value to return if field is not found

        Returns:
            The field value if found, otherwise the default value

        Examples:
            >>> doc = GenericDocument(data={'name': 'JUAN'})
            >>> print(doc.get('name'))  # 'JUAN'
            >>> print(doc.get('height', '1.75'))  # '1.75'
            >>> print(doc.get('missing'))  # None
        """
        return self.data.get(key, default)

    def to_dict(self) -> Dict[str, Any]:
        """Return document data as a dictionary.

        Returns:
            A copy of the document's data dictionary

        Examples:
            >>> doc = GenericDocument(data={'name': 'JUAN', 'age': 30})
            >>> data_copy = doc.to_dict()
            >>> print(data_copy)  # {'name': 'JUAN', 'age': 30}

        Note:
            Returns a copy to prevent external modification of internal data.
        """
        return self.data.copy()

    def is_complete(self, required_fields: list = None) -> bool:
        """Check if document has all required fields with non-null values.

        Validates document completeness by checking that all required fields
        are present and have non-null values. Excludes 'confidence_scores'
        from validation as it's metadata rather than document content.

        Args:
            required_fields: List of field names that must be present.
                           If None, checks if document has any data at all.

        Returns:
            True if document is complete, False otherwise

        Examples:
            >>> doc = GenericDocument(data={
            ...     'document_number': '12345678',
            ...     'name': 'JUAN',
            ...     'birth_date': None
            ... })
            >>>
            >>> # Check specific fields
            >>> required = ['document_number', 'name']
            >>> print(doc.is_complete(required))  # True
            >>>
            >>> # Include null field
            >>> required_with_null = ['document_number', 'name', 'birth_date']
            >>> print(doc.is_complete(required_with_null))  # False
            >>>
            >>> # Check if has any data
            >>> print(doc.is_complete())  # True (has some data)

        Note:
            Fields with None values are considered missing.
            Empty strings and zero values are considered present.
        """
        if required_fields:
            return all(
                self.data.get(field) is not None
                for field in required_fields
                if field != 'confidence_scores'
            )
        return len(self.data) > 0

    def get_missing_fields(self, required_fields: list = None) -> list:
        """Get list of required fields that are missing or have null values.

        Identifies which required fields are either not present in the document
        or have None values. Excludes 'confidence_scores' from validation.

        Args:
            required_fields: List of field names to check.
                           If None or empty, returns empty list.

        Returns:
            List of field names that are missing or null

        Examples:
            >>> doc = GenericDocument(data={
            ...     'document_number': '12345678',
            ...     'name': 'JUAN',
            ...     'birth_date': None,
            ...     'confidence_scores': {'document_number': 95}
            ... })
            >>>
            >>> required = ['document_number', 'name', 'birth_date', 'height']
            >>> missing = doc.get_missing_fields(required)
            >>> print(missing)  # ['birth_date', 'height']
            >>>
            >>> # With confidence_scores in required (ignored)
            >>> required_with_scores = ['document_number', 'confidence_scores']
            >>> missing = doc.get_missing_fields(required_with_scores)
            >>> print(missing)  # [] (confidence_scores ignored)

        Note:
            The 'confidence_scores' field is automatically excluded from
            missing field detection as it's considered metadata.
        """
        if not required_fields:
            return []

        missing = []
        for field in required_fields:
            if field != 'confidence_scores' and self.data.get(field) is None:
                missing.append(field)
        return missing

    def __str__(self) -> str:
        """Return string representation of the document.

        Provides a human-readable representation that varies based on document type.
        For Colombian ID cards, shows document number and name. For other types,
        shows document type and field count.

        Returns:
            Formatted string representation

        Examples:
            >>> # Colombian ID format
            >>> doc = GenericDocument(
            ...     data={'document_number': '12345678', 'first_names': 'JUAN', 'last_names': 'CARLOS'},
            ...     document_type='colombian_id'
            ... )
            >>> print(str(doc))
            Document(CC: 12345678, Name: JUAN CARLOS)
            >>>
            >>> # Generic format
            >>> doc = GenericDocument(
            ...     data={'passport_number': 'AB123456', 'name': 'JOHN DOE'},
            ...     document_type='passport'
            ... )
            >>> print(str(doc))
            Document(passport: 2 fields)

        Note:
            The Colombian ID format is maintained for backward compatibility
            with existing code that may depend on this specific format.
        """
        if self.document_type == "colombian_id":
            # Compatibilidad con formato anterior
            doc_num = self.data.get('document_number', 'N/A')
            first_names = self.data.get('first_names', '')
            last_names = self.data.get('last_names', '')
            return f"Document(CC: {doc_num}, Name: {first_names} {last_names})"
        return f"Document({self.document_type}: {len(self.data)} fields)"

@dataclass
class ExtractionResult:
    """Comprehensive result of a document extraction operation.

    This class encapsulates all information about a document extraction attempt,
    including the extracted data, quality metrics, confidence scores, processing
    metadata, and timing information. It provides multiple output formats to
    support different API requirements.

    The result includes both the raw extracted data and comprehensive metadata
    about the extraction process, making it suitable for quality assessment,
    debugging, and API responses.

    Attributes:
        data (Dict[str, Any]): Extracted document field values
        fidelity (float): Overall quality score (0-100) for the extraction
        confidence_scores (Dict[str, float]): Per-field confidence scores (0-100)
        metadata (Dict[str, Any]): Additional processing metadata
        processing_time (float): Time taken for extraction in seconds
        extraction_timestamp (str): ISO timestamp of extraction completion
        document_type (str): Type of document that was processed

    Examples:
        Creating an extraction result:

    >>> from src.domain.models.generic_document import ExtractionResult
        >>> import time
        >>>
        >>> start_time = time.time()
        >>> # ... perform extraction ...
        >>> processing_time = time.time() - start_time
        >>>
        >>> result = ExtractionResult(
        ...     data={
        ...         'document_number': '12345678',
        ...         'first_names': 'JUAN CARLOS',
        ...         'last_names': 'RODRIGUEZ'
        ...     },
        ...     fidelity=87.5,
        ...     confidence_scores={
        ...         'document_number': 95,
        ...         'first_names': 88,
        ...         'last_names': 80
        ...     },
        ...     metadata={
        ...         'model_version': '1.0.0',
        ...         'extraction_method': 'vision_llm'
        ...     },
        ...     processing_time=processing_time,
        ...     document_type='colombian_id'
        ... )
        >>>
        >>> # Get API response (simplified)
        >>> api_response = result.to_api_response()
        >>> print(api_response)
        {'data': {...}, 'fidelity': 87.5}
        >>>
        >>> # Get detailed response (full information)
        >>> detailed = result.to_detailed_response()
        >>> print(len(detailed))  # 7 keys: data, fidelity, confidence_scores, etc.

    Quality Metrics:
        - fidelity: Overall extraction quality (weighted average of field confidences)
        - confidence_scores: Individual field extraction confidence (0-100)
        - processing_time: Performance metric in seconds

    Output Formats:
        - to_api_response(): Simplified format for backward compatibility
        - to_detailed_response(): Complete format with all metadata

    Note:
        The extraction_timestamp is automatically set to current UTC time
        if not provided. All timestamp values are in ISO format.
    """
    data: Dict[str, Any]  # Datos extraídos del documento
    fidelity: float  # Score de confianza general
    confidence_scores: Dict[str, float] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    processing_time: float = 0.0
    extraction_timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    document_type: str = "generic"

    def to_api_response(self) -> Dict[str, Any]:
        """Generate simplified API response for backward compatibility.

        Returns a minimal response format containing only the essential
        information needed for basic API consumers. This format maintains
        compatibility with existing client code.

        Returns:
            Dictionary with 'data' and 'fidelity' keys

        Examples:
            >>> result = ExtractionResult(
            ...     data={'document_number': '12345678'},
            ...     fidelity=87.5,
            ...     confidence_scores={'document_number': 95}
            ... )
            >>> api_response = result.to_api_response()
            >>> print(api_response)
            {'data': {'document_number': '12345678'}, 'fidelity': 87.5}

        Note:
            Fidelity is rounded to 2 decimal places for consistency.
            This format excludes confidence scores and metadata.
        """
        return {
            "data": self.data,
            "fidelity": round(self.fidelity, 2)
        }

    def to_detailed_response(self) -> Dict[str, Any]:
        """Generate comprehensive response with all extraction information.

        Returns a complete response format containing all available information
        about the extraction process, including metadata, confidence scores,
        timing information, and processing details.

        Returns:
            Dictionary with all extraction result fields

        Response Fields:
            - data: Extracted document field values
            - fidelity: Overall quality score (rounded to 2 decimal places)
            - confidence_scores: Per-field confidence scores
            - metadata: Additional processing information
            - processing_time: Extraction time in seconds (rounded to 3 decimal places)
            - extraction_timestamp: ISO timestamp of completion
            - document_type: Type of document processed

        Examples:
            >>> result = ExtractionResult(
            ...     data={'document_number': '12345678'},
            ...     fidelity=87.542,
            ...     confidence_scores={'document_number': 95},
            ...     metadata={'model': 'gpt-4v'},
            ...     processing_time=1.2345,
            ...     document_type='colombian_id'
            ... )
            >>> detailed = result.to_detailed_response()
            >>> print(detailed['fidelity'])  # 87.54 (rounded)
            >>> print(detailed['processing_time'])  # 1.235 (rounded)
            >>> print('confidence_scores' in detailed)  # True
            >>> print('metadata' in detailed)  # True

        Note:
            This format is recommended for debugging, quality assessment,
            and advanced API consumers who need complete extraction details.
        """
        return {
            "data": self.data,
            "fidelity": round(self.fidelity, 2),
            "confidence_scores": self.confidence_scores,
            "metadata": self.metadata,
            "processing_time": round(self.processing_time, 3),
            "extraction_timestamp": self.extraction_timestamp,
            "document_type": self.document_type
        }

# Backward compatibility alias
IDDocument = GenericDocument
"""Alias for GenericDocument to maintain backward compatibility.

This alias allows existing code that uses IDDocument to continue working
without modification while transitioning to the more generic document model.

Examples:
    >>> # Both of these are equivalent:
    >>> doc1 = GenericDocument(data={'id': '123'})
    >>> doc2 = IDDocument(data={'id': '123'})
    >>> print(type(doc1) == type(doc2))  # True

Note:
    This alias is maintained for backward compatibility only.
    New code should use GenericDocument directly.
"""