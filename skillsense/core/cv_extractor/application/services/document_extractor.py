"""Document Extractor module for generic document processing.

This module provides the main DocumentExtractor class that handles extraction
of information from various types of documents. It uses AI-powered text
extraction through Google's Gemini API and supports configurable document
types through the DocumentConfig system.

The extractor performs the complete extraction pipeline including image
validation, preprocessing, AI extraction, data validation, and result
formatting. It can be configured for different document types by providing
appropriate DocumentConfig instances.

Example:
    Basic usage with Colombian ID configuration::

        from src.application.services.document_extractor import DocumentExtractor
        from src.domain.models import ColombianIDConfig

        config = ColombianIDConfig()
        extractor = DocumentExtractor(config)
        result = extractor.extract_document_info(base64_image)

    Using custom document configuration::

        from src.application.services.document_extractor import DocumentExtractor
        from src.domain.models import DocumentConfig

        config = DocumentConfig(
            document_type="driver_license",
            required_fields=["license_number", "name", "expiry_date"]
        )
        extractor = DocumentExtractor(config)
        result = extractor.extract_document_info(base64_image)

Todo:
    * Implement caching for repeated extractions
    * Add support for multi-page documents
    * Implement batch processing capabilities
"""

import time
import tempfile
import base64
import io
import hashlib
import re
import textwrap
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path as PathLib
from typing import Dict, Any, Tuple, Union, List, Optional, Set
from PIL import Image, ImageDraw, ImageFont

from ...domain.exceptions import (
    IDExtractorError,
    InvalidBase64Error,
    InvalidImageError,
    ImageQualityError,
    LowFidelityError,
    ProcessingError,
    ValidationError,
    NotRequestedDocumentError
)
from ...infrastructure.logging.logger import get_logger
from ...infrastructure.utils.base64_handler import Base64Handler
from ...infrastructure.ai.gemini_service import GeminiService
from ..prompts.prompt_manager import PromptManager

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False
from ...domain.models import (
    GenericDocument,
    ExtractionResult,
    DocumentConfig,
    ColombianIDConfig
)
from ...domain.services.validators import DocumentValidator
from .image_processor import ImageProcessor
from .url_file_handler import URLFileHandler

from ...infrastructure.config.settings import get_settings


class DocumentExtractor:
    """Generic document extractor configurable by document type.

    This class provides a flexible extraction system that can process various
    types of documents based on configuration. It handles the complete pipeline
    from image processing to data extraction and validation.

    The extractor uses AI models for text extraction and supports custom
    validation rules and field requirements for different document types.

    Attributes:
        settings (Settings): Application configuration settings.
        logger: Logger instance for debugging and monitoring.
        document_config (DocumentConfig): Configuration for the document type.
        base64_handler (Base64Handler): Handler for base64 image processing.
        image_processor (ImageProcessor): Image preprocessing utilities.
        prompt_manager (PromptManager): Manager for AI prompts.
        gemini_service (GeminiService): AI service for extraction.
        validator (DocumentValidator): Data validation service.
        url_handler (URLFileHandler): Handler for downloading files from URLs.

    Example:
        >>> config = ColombianIDConfig()
        >>> extractor = DocumentExtractor(config)
        >>> result = extractor.extract_document_info(image_base64)
        >>> print(f"Extracted {len(result['data'])} fields")
    """

    URL_REGEX = re.compile(r'(?:(?:https?://)|(?:www\.))[^\s<>\"]+', re.IGNORECASE)
    URL_STRIP_CHARACTERS = '.,);:]>\'"'

    def __init__(self, document_config: DocumentConfig = None):
        """Initialize the DocumentExtractor with configuration.

        Sets up all necessary components for document extraction including
        image processing, AI services, and validation.

        Args:
            document_config (:obj:`DocumentConfig`, optional): Configuration
                specifying the document type and extraction parameters.
                Defaults to ColombianIDConfig if not provided.

        Example:
            >>> from src.domain.models import DocumentConfig
            >>> config = DocumentConfig()
            >>> extractor = DocumentExtractor(config)
        """
        self.settings = get_settings()

        self.logger = get_logger(__name__)

        if document_config is None:
            self.document_config = ColombianIDConfig()
        else:
            self.document_config = document_config

        # Inicializar componentes con configuración específica
        self.base64_handler = Base64Handler()
        self.image_processor = ImageProcessor()
        self.prompt_manager = PromptManager(self.document_config)
        self.gemini_service = GeminiService()
        self.gemini_service.prompt_manager = self.prompt_manager  # Inyectar configuración
        self.validator = DocumentValidator()
        self.url_handler = URLFileHandler()

        self.logger.info(f"Document Extractor initialized for: {self.document_config.document_type}")

    def extract_document_info(self, image_base64: str) -> Dict[str, Any]:
        """Extract information from a document image.

        Performs the complete extraction pipeline including image validation,
        preprocessing, AI-based text extraction, data validation, and result
        formatting.

        Args:
            image_base64 (str): Base64-encoded payload of the document. It can be:
                - An image (JPG/PNG/WebP, etc.)
                - A PDF file (multi-page supported)
                - A DOCX file (OpenXML Word document)
                The payload must correspond to the configured document type.

        Returns:
            dict: A dictionary containing the extraction results with the
                following structure:
                {
                    'success': bool,  # Whether extraction succeeded
                    'documents': list,  # Array of extracted documents
                    'document_count': int,  # Number of documents found
                    'processing_time': float  # Time taken in seconds
                }
                
                Each document in the 'documents' array has the structure:
                {
                    'data': dict,  # Extracted and validated fields
                    'fidelity': float,  # Overall confidence score (0-100)
                    'confidence_scores': dict,  # Per-field confidence
                    'metadata': dict  # Additional extraction information
                }

        Raises:
            InvalidBase64Error: If the base64 string is invalid.
            InvalidImageError: If the image cannot be processed.
            ImageQualityError: If image quality is too low.
            LowFidelityError: If extraction confidence is below threshold.
            ValidationError: If extracted data fails validation.
            ProcessingError: If an unexpected error occurs.

        Example:
            >>> result = extractor.extract_document_info(base64_image)
            >>> if result['success']:
            ...     print(f"Extracted {len(result['data'])} fields")
            ...     print(f"Confidence: {result['fidelity']}%")
        """
        start_time = time.time()

        try:
            self.logger.info(f"Starting document extraction: {self.document_config.document_type}")
            normalized_base64 = image_base64
            source_metadata: Dict[str, Any] = {}
            pre_extracted_links: List[str] = []

            # Detectar tipo de contenido antes de procesar
            decoded_bytes = self.base64_handler.decode_base64(image_base64)
            mime_hint = self._extract_data_uri_mime(image_base64)
            content_type = self._identify_file_type(decoded_bytes, mime_hint)
            source_metadata['source_document_type'] = content_type

            if content_type == 'pdf':
                self.logger.info("Detected PDF input. Rendering to image with deduplication.")
                normalized_base64, pdf_info, pdf_links = self._prepare_pdf_base64(decoded_bytes)
                pre_extracted_links = pdf_links
                if pdf_info:
                    source_metadata['pdf_info'] = pdf_info
            elif content_type == 'docx':
                self.logger.info("Detected DOCX input. Rendering textual content to image.")
                normalized_base64, docx_info, docx_links = self._prepare_docx_base64(decoded_bytes)
                pre_extracted_links = docx_links
                if docx_info:
                    source_metadata['docx_info'] = docx_info
            elif content_type == 'image':
                self.logger.debug("Detected image input.")
            else:
                raise InvalidImageError(f"Unsupported base64 payload type: {content_type}")

            decoded_bytes = None  # Release reference early
            source_metadata['pre_extracted_links_count'] = len(pre_extracted_links)

            # Procesar imagen resultante
            image, image_format = self._process_input_image(normalized_base64)
            self.logger.debug(f"Image processed: format={image_format}, size={image.size}")

            # Extraer datos - ahora retorna una tupla (lista de documentos, token_usage)
            extraction_results, token_usage = self._extract_data(image)
            self.logger.info(f"Found {len(extraction_results)} document(s) in image")
            
            if token_usage:
                self.logger.info(f"Token usage: {token_usage['total_token_count']} total tokens (prompt: {token_usage['prompt_token_count']}, response: {token_usage['candidates_token_count']})")

            # 🔄 Intentar mergear documentos complementarios (frente/reverso divididos incorrectamente)
            original_count = len(extraction_results)
            extraction_results = self._merge_complementary_documents(extraction_results)
            if len(extraction_results) < original_count:
                self.logger.info(f"Merged complementary documents: {original_count} → {len(extraction_results)} documents")

            # Procesar cada documento en la lista
            processed_documents = []
            failed_documents = []  # Acumular detalles de documentos fallidos
            
            for idx, (raw_extraction, fidelity_score) in enumerate(extraction_results):
                self.logger.debug(f"Processing document #{idx+1} with fidelity score: {fidelity_score:.2f}%")
                
                try:
                    # Validar datos usando el validador del config
                    is_valid_data, validated_data, validation_errors = self.document_config.validate_and_clean_data(raw_extraction)
                    if validation_errors and self.settings.DEBUG:
                        self.logger.warning(f"Document #{idx+1} validation warnings: {validation_errors}")
                    
                    if pre_extracted_links:
                        self._merge_pre_extracted_links(validated_data, pre_extracted_links)

                    if not is_valid_data and len(validated_data) < 3:
                        error_detail = {
                            'document_index': idx + 1,
                            'error_type': 'insufficient_data',
                            'reason': f'Datos insuficientes: solo {len(validated_data)} campos válidos de {len(self.document_config.required_fields)} requeridos',
                            'validation_errors': validation_errors,
                            'extracted_fields': list(validated_data.keys()),
                            'missing_fields': [f for f in self.document_config.required_fields if f not in validated_data and f != 'confidence_scores'],
                            'fidelity_score': fidelity_score,
                            'comentario': validated_data.get('comentario')  # Incluir comentario de Gemini si existe
                        }
                        failed_documents.append(error_detail)
                        self.logger.warning(f"Document #{idx+1} has insufficient valid data: {error_detail['reason']}")
                        continue
                    
                    self.logger.debug(f"Document #{idx+1} validated and cleaned")

                    # === VALIDACIÓN SIMPLIFICADA: Solo verificar campos obligatorios no-null ===
                    # EXCEPCIÓN: Si el documento tiene un 'comentario' explicativo y TODOS los campos son null,
                    # es un documento rechazado por la LLM - procesarlo normalmente (éxito con explicación)
                    comentario = validated_data.get('comentario')
                    all_data_fields_null = all(
                        validated_data.get(f) is None or validated_data.get(f) == '' or validated_data.get(f) == 'null'
                        for f in self.document_config.required_fields
                        if f not in ['confidence_scores', 'comentario']
                    )
                    
                    if comentario and all_data_fields_null:
                        # Documento rechazado por LLM con explicación en comentario - permitir procesamiento
                        self.logger.info(f"📋 Document #{idx+1} rechazado por LLM (todos los campos null, comentario presente): {comentario[:100]}")
                        # No validar campos obligatorios - continuar con procesamiento normal
                    else:
                        # Validación normal de campos obligatorios
                        mandatory_fields = self.document_config.get_mandatory_fields()
                        missing_mandatory = []
                        null_mandatory = []
                        
                        for field in mandatory_fields:
                            if field == 'confidence_scores':
                                continue
                            if field not in validated_data:
                                missing_mandatory.append(field)
                            elif validated_data[field] is None or validated_data[field] == '' or validated_data[field] == 'null':
                                null_mandatory.append(field)
                        
                        # Si faltan campos obligatorios o son null, fallar
                        if missing_mandatory or null_mandatory:
                            error_detail = {
                                'document_index': idx + 1,
                                'error_type': 'missing_mandatory_fields',
                                'reason': f'Campos obligatorios faltantes o vacíos',
                                'missing_fields': missing_mandatory,
                                'null_fields': null_mandatory,
                                'all_problematic_fields': missing_mandatory + null_mandatory,
                                'extracted_fields': list(validated_data.keys()),
                                'fidelity_score': fidelity_score,
                                'comentario': validated_data.get('comentario')  # Incluir comentario de Gemini si existe
                            }
                            failed_documents.append(error_detail)
                            self.logger.warning(f"Document #{idx+1} has missing/null mandatory fields: {missing_mandatory + null_mandatory}")
                            continue
                    
                    self.logger.debug(f"Document #{idx+1} all mandatory fields present")

                    # TEMPORALMENTE DESHABILITADO: No validar fidelity scores
                    # # Extraer confidence scores para validación de campos obligatorios
                    # confidence_scores = raw_extraction.get('confidence_scores', {})
                    # # Validar campos obligatorios ANTES de verificar fidelity general
                    # adjusted_fidelity = self._validate_mandatory_fields(validated_data, confidence_scores)
                    # self.logger.debug(f"Document #{idx+1} mandatory fields validated. Adjusted fidelity: {adjusted_fidelity:.2f}%")
                    # # Verificar fidelity mínimo global (usa el fidelity original o ajustado)
                    # final_fidelity = max(fidelity_score, adjusted_fidelity)
                    # self._check_fidelity(final_fidelity)

                    # Usar fidelity sin validación estricta
                    final_fidelity = fidelity_score
                    self.logger.debug(f"Document #{idx+1} using fidelity without strict validation: {final_fidelity:.2f}%")

                    # Construir resultado para este documento
                    result = self._build_result(validated_data, final_fidelity, raw_extraction, start_time)
                    doc_response = result.to_detailed_response()
                    
                    # Agregar información de tokens a la metadata de este documento
                    if token_usage and 'metadata' in doc_response:
                        doc_response['metadata']['token_usage'] = token_usage
                    
                    if 'metadata' in doc_response and source_metadata.get('source_document_type'):
                        doc_response['metadata']['source_document_type'] = source_metadata['source_document_type']
                        doc_response['metadata']['pre_extracted_links_count'] = source_metadata.get('pre_extracted_links_count', 0)
                    
                    processed_documents.append(doc_response)
                    
                    self.logger.info(f"Document #{idx+1} processed successfully")
                    
                except LowFidelityError as e:
                    error_detail = {
                        'document_index': idx + 1,
                        'error_type': 'low_fidelity',
                        'reason': e.message,
                        'fidelity_score': e.fidelity_score,
                        'min_required': e.min_required,
                        'extracted_fields': list(raw_extraction.keys()) if isinstance(raw_extraction, dict) else [],
                        'details': e.details if hasattr(e, 'details') else None,
                        'comentario': raw_extraction.get('comentario') if isinstance(raw_extraction, dict) else None  # Incluir comentario de Gemini
                    }
                    failed_documents.append(error_detail)
                    self.logger.warning(f"Document #{idx+1} has low fidelity: {e.message}")
                    continue
                    
                except ValidationError as e:
                    error_detail = {
                        'document_index': idx + 1,
                        'error_type': 'validation_error',
                        'reason': e.message,
                        'extracted_fields': list(raw_extraction.keys()) if isinstance(raw_extraction, dict) else [],
                        'validation_context': e.context if hasattr(e, 'context') else None,
                        'comentario': raw_extraction.get('comentario') if isinstance(raw_extraction, dict) else None  # Incluir comentario de Gemini
                    }
                    failed_documents.append(error_detail)
                    self.logger.warning(f"Document #{idx+1} validation failed: {e.message}")
                    continue
            
            if not processed_documents:
                # Construir mensaje de error detallado
                error_summary = f"No se pudo extraer ningún documento con calidad suficiente de {len(extraction_results)} documento(s) encontrado(s)"
                
                # Agrupar errores por tipo
                error_types = {}
                for failure in failed_documents:
                    err_type = failure['error_type']
                    if err_type not in error_types:
                        error_types[err_type] = []
                    error_types[err_type].append(failure)
                
                # Crear resumen detallado
                detailed_errors = {
                    'summary': error_summary,
                    'total_documents_found': len(extraction_results),
                    'failed_count': len(failed_documents),
                    'error_breakdown': error_types,
                    'failures': failed_documents,
                    'document_type_expected': self.document_config.document_type
                }
                
                # Log detallado del error
                self.logger.error(f"Extraction failed: {error_summary}")
                for failure in failed_documents:
                    self.logger.error(f"  - Document #{failure['document_index']}: {failure['reason']}")
                
                raise ValidationError(
                    error_summary,
                    detailed_errors
                )
            
            processing_time = time.time() - start_time
            self.logger.info(f"Extraction completed: {len(processed_documents)}/{len(extraction_results)} documents successfully processed in {processing_time:.2f}s")

            result = {
                'success': True,
                'documents': processed_documents,
                'document_count': len(processed_documents),
                'processing_time': round(processing_time, 3)
            }
            
            # Agregar información de tokens al resultado general
            if token_usage:
                result['token_usage'] = token_usage

            if source_metadata:
                if source_metadata.get('source_document_type'):
                    result['source_document_type'] = source_metadata['source_document_type']
                if source_metadata.get('pdf_info'):
                    result['pdf_info'] = source_metadata['pdf_info']
                if source_metadata.get('docx_info'):
                    result['docx_info'] = source_metadata['docx_info']
                if source_metadata.get('pre_extracted_links_count'):
                    result['pre_extracted_links_count'] = source_metadata['pre_extracted_links_count']
            
            return result

        except IDExtractorError:
            raise
        except Exception as e:
            self.logger.debug(f"Unexpected error during extraction: {str(e)}")
            raise ProcessingError(
                f"Error inesperado durante la extracción: {str(e)}"
            )

    def extract_document_info_from_link(self, url: str) -> Dict[str, Any]:
        """Extract information from a document image hosted at a URL.

        Descarga un archivo desde una URL firmada (GCS, S3, etc.), lo convierte
        a base64 y extrae la información usando el pipeline de extracción estándar.
        Soporta imágenes (JPG, PNG, etc.), PDFs y DOCX.

        Args:
            url (str): URL firmada del archivo a procesar. Puede ser de Google Cloud
                Storage, Amazon S3, o cualquier URL pública/firmada que apunte a
                una imagen o PDF.

        Returns:
            dict: A dictionary containing the extraction results with the
                following structure:
                {
                    'success': bool,  # Whether extraction succeeded
                    'data': dict,  # Extracted and validated fields
                    'fidelity': float,  # Overall confidence score (0-100)
                    'confidence_scores': dict,  # Per-field confidence
                    'metadata': dict,  # Additional extraction information
                    'processing_time': float  # Time taken in seconds
                }

        Raises:
            ProcessingError: Si la descarga falla o el archivo no es válido.
            InvalidImageError: Si el tipo de archivo no está soportado.
            InvalidBase64Error: If the downloaded file cannot be processed.
            ImageQualityError: If image quality is too low.
            LowFidelityError: If extraction confidence is below threshold.
            ValidationError: If extracted data fails validation.

        Example:
            >>> extractor = DocumentExtractor()
            >>> # Procesar imagen desde GCS
            >>> url = "https://storage.googleapis.com/bucket/id.jpg?signature=..."
            >>> result = extractor.extract_document_info_from_link(url)
            >>> print(f"Extracted {len(result['data'])} fields")
            >>>
            >>> # Procesar PDF desde S3
            >>> url = "https://s3.amazonaws.com/bucket/document.pdf?signature=..."
            >>> result = extractor.extract_document_info_from_link(url)
            >>> if result['success']:
            ...     print(f"Name: {result['data']['first_name']}")
        """
        start_time = time.time()

        try:
            self.logger.info(f"Starting document extraction from URL: {url[:100]}...")

            # Validar URL
            if not self.url_handler.validate_url(url):
                raise ProcessingError(
                    "URL inválida o formato no soportado",
                    {'url': url[:100]}
                )

            # Descargar archivo y convertir a base64
            self.logger.debug("Descargando archivo desde URL...")
            base64_data, file_type = self.url_handler.download_and_encode(url)
            
            download_time = time.time() - start_time
            self.logger.info(
                f"Archivo descargado y codificado en {download_time:.2f}s. "
                f"Tipo: {file_type}, Tamaño: {len(base64_data)} chars"
            )

            # Extraer información usando el método estándar
            self.logger.debug("Procesando documento descargado...")
            result = self.extract_document_info(base64_data)

            # Añadir metadata sobre la descarga
            if 'metadata' in result:
                result['metadata']['source'] = 'url'
                result['metadata']['url'] = url[:100] + ('...' if len(url) > 100 else '')
                result['metadata']['file_type'] = file_type
                result['metadata']['download_time'] = download_time

            total_time = time.time() - start_time
            self.logger.info(
                f"Extraction from URL completed successfully in {total_time:.2f}s "
                f"(download: {download_time:.2f}s, processing: {total_time - download_time:.2f}s)"
            )

            return result

        except IDExtractorError:
            raise
        except Exception as e:
            self.logger.debug(f"Unexpected error during URL extraction: {str(e)}")
            raise ProcessingError(
                f"Error inesperado desde la extracción desde URL: {str(e)}"
            )

    def extract_document_info_from_pdf(
        self, 
        pdf_path: Union[str, PathLib], 
        zoom_factor: float = 2.5, 
        max_size_mb: float = 9.5
    ) -> Dict[str, Any]:
        """Extract information from a PDF file with automatic page deduplication.
        
        Esta función centraliza todo el procesamiento de PDFs:
        1. Lee el archivo PDF
        2. Convierte cada página a imagen con zoom configurable
        3. Detecta y elimina páginas duplicadas (usando hash SHA-256)
        4. Combina páginas únicas en una sola imagen vertical
        5. Convierte a base64 optimizado (<10MB)
        6. Extrae información usando el pipeline estándar
        
        Args:
            pdf_path: Path al archivo PDF (str o Path)
            zoom_factor: Factor de zoom para renderizar páginas (default: 2.5)
            max_size_mb: Tamaño máximo del base64 en MB (default: 9.5)
            
        Returns:
            dict: Same structure as extract_document_info():
                {
                    'success': bool,
                    'documents': list,  # Array of extracted documents
                    'document_count': int,
                    'processing_time': float,
                    'pdf_info': dict  # Additional PDF metadata
                }
                
        Raises:
            ProcessingError: Si el archivo no existe o no se puede procesar
            InvalidImageError: Si el PDF no se puede convertir a imagen
            (otros errores heredados de extract_document_info)
            
        Example:
            >>> extractor = DocumentExtractor(ColombianIDConfig())
            >>> result = extractor.extract_document_info_from_pdf("cedula.pdf")
            >>> print(f"Extracted {result['document_count']} documents")
            >>> print(f"Pages: {result['pdf_info']['original_pages']} → {result['pdf_info']['unique_pages']}")
        """
        start_time = time.time()
        
        if not HAS_PYMUPDF:
            raise ProcessingError(
                "PyMuPDF no está instalado. Instala con: pip install pymupdf"
            )
        
        pdf_path = PathLib(pdf_path)
        
        if not pdf_path.exists():
            raise ProcessingError(
                f"El archivo PDF no existe: {pdf_path}",
                {'path': str(pdf_path)}
            )
        
        if not pdf_path.is_file():
            raise ProcessingError(
                f"La ruta no es un archivo: {pdf_path}",
                {'path': str(pdf_path)}
            )
        
        self.logger.info(f"Processing PDF file: {pdf_path.name}")
        
        try:
            # Leer archivo PDF
            with open(pdf_path, 'rb') as f:
                pdf_bytes = f.read()
            
            # Convertir PDF a base64 con deduplicación
            base64_content, pdf_metadata = self._pdf_to_base64_with_deduplication(
                pdf_bytes, 
                zoom_factor, 
                max_size_mb
            )
            
            conversion_time = time.time() - start_time
            self.logger.info(
                f"PDF converted in {conversion_time:.2f}s: "
                f"{pdf_metadata['original_pages']} pages → {pdf_metadata['unique_pages']} unique "
                f"(removed {pdf_metadata['duplicate_pages']} duplicates)"
            )
            
            # Extraer información usando el método estándar
            self.logger.debug("Extracting document information...")
            result = self.extract_document_info(base64_content)
            
            # Agregar metadata del PDF
            result['pdf_info'] = pdf_metadata
            result['pdf_info']['conversion_time'] = conversion_time
            result['pdf_info']['file_path'] = str(pdf_path)
            result['pdf_info']['file_name'] = pdf_path.name
            
            total_time = time.time() - start_time
            self.logger.info(
                f"PDF extraction completed in {total_time:.2f}s "
                f"(conversion: {conversion_time:.2f}s, extraction: {total_time - conversion_time:.2f}s)"
            )
            
            return result
            
        except IDExtractorError:
            raise
        except Exception as e:
            self.logger.debug(f"Unexpected error during PDF extraction: {str(e)}")
            raise ProcessingError(
                f"Error procesando PDF: {str(e)}",
                {'pdf_path': str(pdf_path)}
            )

    def _pdf_to_base64_with_deduplication(
        self, 
        pdf_bytes: bytes, 
        zoom_factor: float = 2.5, 
        max_size_mb: float = 9.5
    ) -> Tuple[str, Dict[str, Any]]:
        """Convert PDF to base64 with automatic page deduplication.
        
        Args:
            pdf_bytes: PDF file content as bytes
            zoom_factor: Zoom factor for rendering pages
            max_size_mb: Maximum size for base64 output
            
        Returns:
            tuple: (base64_string, metadata_dict)
        """
        Image.MAX_IMAGE_PIXELS = None
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            tmp_file.write(pdf_bytes)
            tmp_path = PathLib(tmp_file.name)
        
        try:
            doc = fitz.open(str(tmp_path))
            page_images = []
            max_width = 0
            
            # 🔍 Detectar y filtrar páginas duplicadas por hash
            seen_hashes = set()
            duplicate_count = 0
            original_page_count = doc.page_count
            
            for page_num in range(doc.page_count):
                page = doc[page_num]
                mat = fitz.Matrix(zoom_factor, zoom_factor)
                pix = page.get_pixmap(matrix=mat)
                img_data = pix.pil_tobytes(format="PNG")
                
                # Calcular hash de la imagen para detectar duplicados
                img_hash = hashlib.sha256(img_data).hexdigest()
                
                if img_hash in seen_hashes:
                    duplicate_count += 1
                    self.logger.debug(f"Page {page_num + 1} is duplicate, skipping...")
                    continue  # Saltar página duplicada
                
                seen_hashes.add(img_hash)
                img = Image.open(io.BytesIO(img_data))
                page_images.append(img)
                max_width = max(max_width, img.width)
            
            doc.close()
            
            if duplicate_count > 0:
                self.logger.info(
                    f"🔄 Removed {duplicate_count} duplicate page(s) - "
                    f"processing {len(page_images)} unique page(s) of {original_page_count} total"
                )
            
            if not page_images:
                raise ProcessingError("No se pudieron extraer páginas del PDF")
            
            # Combinar páginas en una sola imagen vertical
            if len(page_images) > 1:
                total_height = sum(img.height for img in page_images)
                combined_image = Image.new('RGB', (max_width, total_height), (255, 255, 255))
                y_offset = 0
                for img in page_images:
                    x_offset = (max_width - img.width) // 2
                    combined_image.paste(img, (x_offset, y_offset))
                    y_offset += img.height
            else:
                combined_image = page_images[0]
            
            # Convertir a RGB si es necesario
            if combined_image.mode in ('RGBA', 'LA', 'P'):
                rgb_image = Image.new('RGB', combined_image.size, (255, 255, 255))
                if combined_image.mode == 'RGBA':
                    rgb_image.paste(combined_image, mask=combined_image.split()[3])
                else:
                    rgb_image.paste(combined_image)
                combined_image = rgb_image
            
            # Comprimir imagen
            quality = 90
            buffer = io.BytesIO()
            combined_image.save(buffer, format='JPEG', quality=quality)
            img_bytes = buffer.getvalue()
            size_mb = len(img_bytes) / (1024 * 1024)
            
            # Reducir calidad si es necesario
            while size_mb > max_size_mb and quality > 50:
                quality -= 10
                buffer = io.BytesIO()
                combined_image.save(buffer, format='JPEG', quality=quality)
                img_bytes = buffer.getvalue()
                size_mb = len(img_bytes) / (1024 * 1024)
            
            # Redimensionar si aún es muy grande
            if size_mb > max_size_mb:
                scale_factor = (max_size_mb / size_mb) ** 0.5
                new_width = int(combined_image.width * scale_factor)
                new_height = int(combined_image.height * scale_factor)
                combined_image = combined_image.resize((new_width, new_height), Image.LANCZOS)
                buffer = io.BytesIO()
                combined_image.save(buffer, format='JPEG', quality=85)
                img_bytes = buffer.getvalue()
                size_mb = len(img_bytes) / (1024 * 1024)
            
            if size_mb > 10:
                raise ProcessingError(f"Imagen muy grande: {size_mb:.2f}MB (máximo: 10MB)")
            
            base64_content = base64.b64encode(img_bytes).decode('utf-8')
            
            metadata = {
                'original_pages': original_page_count,
                'unique_pages': len(page_images),
                'duplicate_pages': duplicate_count,
                'final_image_size': combined_image.size,
                'final_size_mb': round(size_mb, 2),
                'compression_quality': quality,
                'zoom_factor': zoom_factor
            }
            
            return base64_content, metadata
            
        finally:
            if tmp_path.exists():
                tmp_path.unlink()

    # ------------------------------------------------------------------
    # Compatibilidad hacia atrás
    # ------------------------------------------------------------------

    def _process_input_image(self, image_base64: str) -> Tuple[Image.Image, str]:
        """Process and validate input image.

        Decodes the base64 image, validates format and quality, and applies
        preprocessing to prepare it for extraction.

        Args:
            image_base64 (str): Base64-encoded image string.

        Returns:
            tuple: A tuple containing:
                - Image.Image: Preprocessed PIL image object
                - str: Detected image format (e.g., 'JPEG', 'PNG')

        Raises:
            InvalidBase64Error: If base64 decoding fails.
            InvalidImageError: If the decoded data is not a valid image.
            ImageQualityError: If image quality score is below threshold.
            ProcessingError: If an unexpected error occurs.
        """
        try:
            if not image_base64:
                raise InvalidBase64Error("No se proporcionó imagen base64")

            image, image_format = self.base64_handler.process_base64_image(image_base64)
            preprocessed_image = self.image_processor.preprocess_image(image)

            quality_score = self.image_processor.estimate_image_quality(preprocessed_image)
            self.logger.debug(f"Image quality score: {quality_score:.2f}")

            if quality_score < 10:
                raise ImageQualityError(
                    "La calidad de la imagen es muy baja para procesarla",
                    {'quality_score': quality_score}
                )

            return preprocessed_image, image_format

        except (InvalidBase64Error, InvalidImageError, ImageQualityError):
            raise
        except Exception as e:
            self.logger.error(f"Error processing input image: {str(e)}")
            raise ProcessingError(
                f"Error al procesar la imagen de entrada: {str(e)}"
            )

    def _extract_data(self, image: Image.Image) -> tuple:
        """Extract data from image using AI service.

        Uses the configured prompt manager and Gemini service to extract
        text and structured data from the document image.

        Args:
            image (Image.Image): Preprocessed document image.

        Returns:
            tuple: A tuple containing:
                - list: A list of tuples, one per document found. Each tuple contains:
                    - dict: Raw extracted data with field names and values
                    - float: Fidelity score (0-100) indicating extraction confidence
                - dict: Token usage metadata

        Raises:
            ProcessingError: If extraction fails or returns invalid data.
        """
        try:
            # El servicio de Gemini ahora retorna una tupla (lista de documentos, token_usage)
            extraction_results, token_usage = self.gemini_service.extract_from_image(image)
            
            # Validar que sea una lista
            if not isinstance(extraction_results, list):
                # Compatibilidad hacia atrás: si retorna una tupla, convertir a lista
                if isinstance(extraction_results, tuple):
                    return [extraction_results], {}
                raise ProcessingError("El servicio de extracción no retornó una lista válida")
            
            return extraction_results, token_usage

        except Exception as e:
            self.logger.debug(f"Error during data extraction: {str(e)}")
            raise ProcessingError(
                f"Error durante la extracción de datos: {str(e)}"
            )

    # ------------------------------------------------------------------
    # Helpers for multi-format base64 inputs
    # ------------------------------------------------------------------

    def _extract_data_uri_mime(self, base64_string: str) -> Optional[str]:
        """Extract MIME type from a data URI if present."""
        if not base64_string:
            return None
        stripped = base64_string.strip()
        if not stripped.startswith('data:'):
            return None
        try:
            header = stripped.split(';', 1)[0]
            return header.split(':', 1)[1].lower() if ':' in header else None
        except Exception:
            return None

    def _identify_file_type(self, content_bytes: bytes, mime_hint: Optional[str]) -> str:
        """Identify the type of the base64 payload."""
        if mime_hint:
            if 'pdf' in mime_hint:
                return 'pdf'
            if 'wordprocessingml.document' in mime_hint or mime_hint.endswith('/docx'):
                return 'docx'
            if mime_hint.startswith('image/'):
                return 'image'

        if content_bytes.startswith(b'%PDF'):
            return 'pdf'

        if content_bytes[:4] == b'PK\x03\x04' and self._zip_contains_docx(content_bytes):
            return 'docx'

        # Attempt to detect image by magic bytes
        image_signatures = (
            b'\xFF\xD8\xFF',  # JPEG
            b'\x89PNG\r\n\x1a\n',  # PNG
            b'GIF87a',
            b'GIF89a',
            b'RIFF',  # WEBP (needs further validation)
            b'BM',  # BMP
            b'II*\x00',  # TIFF little-endian
            b'MM\x00*',  # TIFF big-endian
        )
        if any(content_bytes.startswith(sig) for sig in image_signatures):
            return 'image'

        # Fallback: try to load with PIL
        try:
            with Image.open(io.BytesIO(content_bytes)) as img:
                img.verify()  # type: ignore
            return 'image'
        except Exception:
            pass

        return 'unknown'

    def _zip_contains_docx(self, content_bytes: bytes) -> bool:
        """Check whether a PKZip payload corresponds to a DOCX file."""
        try:
            with zipfile.ZipFile(io.BytesIO(content_bytes)) as archive:
                return 'word/document.xml' in archive.namelist()
        except zipfile.BadZipFile:
            return False

    def _prepare_pdf_base64(self, pdf_bytes: bytes) -> Tuple[str, Dict[str, Any], List[str]]:
        """Convert PDF bytes to base64 image and pre-extract URLs."""
        if not HAS_PYMUPDF:
            raise InvalidImageError("PDF input received but PyMuPDF is not installed")

        links = self._extract_pdf_links(pdf_bytes)
        base64_image, metadata = self._pdf_to_base64_with_deduplication(pdf_bytes)
        return base64_image, metadata, links

    def _extract_pdf_links(self, pdf_bytes: bytes) -> List[str]:
        """Extract embedded URLs and visible links from a PDF."""
        if not HAS_PYMUPDF:
            return []

        urls = set()
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            for page_index in range(doc.page_count):
                page = doc.load_page(page_index)
                # Embedded hyperlinks
                for link in page.get_links():
                    uri = link.get('uri')
                    if uri:
                        sanitized = self._ensure_url_scheme(self._sanitize_url(uri))
                        if sanitized:
                            urls.add(sanitized)
                # URLs in text
                page_text = page.get_text()
                for candidate in self._find_urls_in_text(page_text):
                    urls.add(candidate)
            doc.close()
        except Exception as exc:
            self.logger.debug(f"Unable to extract hyperlinks from PDF: {exc}")
            return []

        return sorted(urls)

    def _prepare_docx_base64(self, docx_bytes: bytes) -> Tuple[str, Dict[str, Any], List[str]]:
        """Render DOCX textual content to an image and return its base64."""
        try:
            lines, urls, metadata = self._parse_docx_contents(docx_bytes)
        except InvalidImageError:
            raise
        except Exception as exc:
            raise InvalidImageError(f"DOCX processing failed: {str(exc)}") from exc

        image, render_metadata = self._render_text_lines_to_image(lines)
        metadata.update(render_metadata)
        metadata['rendered_image_dimensions'] = image.size
        metadata['approximate_characters'] = sum(len(line) for line in lines)

        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=92)
        base64_image = base64.b64encode(buffer.getvalue()).decode('utf-8')

        sanitized_urls = [self._ensure_url_scheme(self._sanitize_url(url)) for url in urls]
        sanitized_urls = [url for url in sanitized_urls if url]

        return base64_image, metadata, sorted(set(sanitized_urls))

    def _parse_docx_contents(self, docx_bytes: bytes) -> Tuple[List[str], List[str], Dict[str, Any]]:
        """Parse DOCX paragraphs, extract text lines and hyperlinks."""
        try:
            with zipfile.ZipFile(io.BytesIO(docx_bytes)) as archive:
                if 'word/document.xml' not in archive.namelist():
                    raise InvalidImageError("DOCX is missing word/document.xml")

                document_xml = archive.read('word/document.xml')
                rels_map: Dict[str, str] = {}

                try:
                    rels_xml = archive.read('word/_rels/document.xml.rels')
                    rels_tree = ET.fromstring(rels_xml)
                    for rel in rels_tree.findall('Relationship', namespaces={'': 'http://schemas.openxmlformats.org/package/2006/relationships'}):
                        rel_id = rel.attrib.get('Id')
                        target = rel.attrib.get('Target')
                        target_mode = rel.attrib.get('TargetMode', '')
                        if rel_id and target and (not target_mode or target_mode.lower() == 'external'):
                            rels_map[rel_id] = target
                except KeyError:
                    pass
                except ET.ParseError as exc:
                    self.logger.debug(f"Unable to parse DOCX relationship file: {exc}")
        except zipfile.BadZipFile as exc:
            raise InvalidImageError("DOCX file is corrupted or not a valid OOXML document") from exc

        try:
            tree = ET.fromstring(document_xml)
        except ET.ParseError as exc:
            raise InvalidImageError("Unable to parse DOCX main document XML") from exc

        ns = {
            'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
            'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
        }

        body = tree.find('w:body', ns)
        if body is None:
            return [''], [], {'paragraph_count': 0, 'line_count': 1, 'links_detected': 0}

        lines: List[str] = []
        url_candidates: Set[str] = set()
        paragraph_count = 0

        for paragraph in body.iterfind('.//w:p', ns):
            paragraph_count += 1
            texts: List[str] = []
            for node in paragraph.iterfind('.//w:t', ns):
                if node.text:
                    texts.append(node.text)

            prefix = ''
            if paragraph.find('w:pPr/w:numPr', ns) is not None:
                prefix = '• '

            paragraph_text = ''.join(texts).strip()
            if prefix and paragraph_text and not paragraph_text.startswith(prefix.strip()):
                paragraph_text = f"{prefix}{paragraph_text}"

            # Preserve spacing with empty lines when necessary
            lines.append(paragraph_text)

            for hyperlink in paragraph.findall('.//w:hyperlink', ns):
                rel_id = hyperlink.attrib.get(f"{{{ns['r']}}}id")
                if rel_id and rel_id in rels_map:
                    url_candidates.add(rels_map[rel_id])

        # Fallback: if no lines captured, ensure at least one blank line
        if not lines:
            lines = ['']

        # Detect raw URLs in text
        combined_text = '\n'.join(lines)
        for candidate in self._find_urls_in_text(combined_text):
            url_candidates.add(candidate)

        metadata = {
            'paragraph_count': paragraph_count,
            'line_count': len(lines),
            'links_detected': len(url_candidates)
        }

        return lines, sorted(url_candidates), metadata

    def _render_text_lines_to_image(
        self,
        lines: List[str],
        max_width: int = 1600,
        margin: int = 50,
        line_spacing: int = 6
    ) -> Tuple[Image.Image, Dict[str, Any]]:
        """Render textual lines to an image suitable for LLM visual extraction."""
        font = ImageFont.load_default()
        try:
            bbox = font.getbbox("Ag")
            base_height = bbox[3] - bbox[1]
            char_width = max(1, font.getbbox("M")[2] - font.getbbox("M")[0])
        except AttributeError:
            base_height = font.getsize("Ag")[1]  # type: ignore
            char_width = max(1, font.getsize("M")[0])  # type: ignore

        line_height = base_height + line_spacing
        usable_width = max_width - (2 * margin)
        max_chars_per_line = max(40, usable_width // max(char_width, 1))

        rendered_lines: List[str] = []
        for line in lines:
            normalized_line = line if line is not None else ''
            if not normalized_line:
                rendered_lines.append('')
                continue
            wrapped = textwrap.wrap(normalized_line, width=max_chars_per_line) or ['']
            rendered_lines.extend(wrapped)

        if not rendered_lines:
            rendered_lines = ['']

        total_height = margin * 2 + line_height * len(rendered_lines)
        total_height = max(total_height, margin * 2 + line_height)

        image = Image.new('RGB', (max_width, total_height), 'white')
        draw = ImageDraw.Draw(image)
        current_y = margin

        for line in rendered_lines:
            draw.text((margin, current_y), line, fill='black', font=font)
            current_y += line_height

        metadata = {
            'rendered_line_count': len(rendered_lines)
        }

        return image, metadata

    def _find_urls_in_text(self, text: Optional[str]) -> List[str]:
        """Find URL-like substrings within text."""
        if not text:
            return []
        matches = self.URL_REGEX.findall(text)
        sanitized = []
        for candidate in matches:
            cleaned = self._ensure_url_scheme(self._sanitize_url(candidate))
            if cleaned:
                sanitized.append(cleaned)
        return sanitized

    def _sanitize_url(self, url: Optional[str]) -> str:
        """Remove trailing punctuation from URLs."""
        if not url:
            return ''
        cleaned = url.strip().strip(self.URL_STRIP_CHARACTERS)
        return cleaned

    def _ensure_url_scheme(self, url: str) -> str:
        """Ensure URLs include a scheme prefix."""
        if not url:
            return ''
        lowered = url.lower()
        if lowered.startswith('http://') or lowered.startswith('https://'):
            return url
        if lowered.startswith('www.'):
            return f"https://{url}"
        return f"https://{url}"

    def _normalize_url_for_comparison(self, url: str) -> str:
        """Normalize URLs for duplicate comparison."""
        sanitized = self._ensure_url_scheme(self._sanitize_url(url))
        return sanitized.rstrip('/').lower()

    def _merge_pre_extracted_links(self, validated_data: Dict[str, Any], links: List[str]) -> None:
        """Merge pre-extracted URLs into validated data without duplicates."""
        if not links:
            return

        social_links = validated_data.get('social_links')
        if isinstance(social_links, list):
            filtered = [link for link in social_links if isinstance(link, dict)]
        else:
            filtered = []

        existing_urls = {self._normalize_url_for_comparison(item.get('url', ''))
                         for item in filtered if isinstance(item, dict) and item.get('url')}

        for link in links:
            normalized = self._normalize_url_for_comparison(link)
            if not normalized or normalized in existing_urls:
                continue

            entry = {
                'type': self._classify_social_link(link),
                'url': self._ensure_url_scheme(self._sanitize_url(link))
            }
            filtered.append(entry)
            existing_urls.add(normalized)

        if filtered:
            validated_data['social_links'] = filtered
        elif social_links is None:
            validated_data['social_links'] = None

    def _classify_social_link(self, url: str) -> str:
        """Classify URL into predefined social link categories."""
        lowered = url.lower()
        if 'linkedin.com' in lowered:
            return 'linkedin'
        if 'github.com' in lowered or 'gitlab.com' in lowered or 'bitbucket.org' in lowered:
            return 'github'
        if 'twitter.com' in lowered or 'x.com' in lowered:
            return 'twitter'
        if any(domain in lowered for domain in ['behance.net', 'dribbble.com', 'notion.site']):
            return 'portfolio'
        if any(domain in lowered for domain in ['medium.com', 'substack.com']):
            return 'portfolio'
        return 'portfolio' if '.' in lowered else 'other'

    def _merge_complementary_documents(self, extraction_results: list) -> list:
        """Merge documents that appear to be parts of the same document (e.g., front/back split).
        
        This function detects when Gemini incorrectly splits ONE document into MULTIPLE documents
        with complementary fields (one has name, another has birth_date, etc.) and merges them.
        
        Args:
            extraction_results: List of tuples (raw_data, fidelity_score)
            
        Returns:
            List of tuples with complementary documents merged
        """
        if len(extraction_results) <= 1:
            # No hay nada que mergear
            return extraction_results
        
        # Solo hacer merge para ciertos tipos de documentos (colombian_id principalmente)
        if self.document_config.document_type not in ['colombian_id']:
            return extraction_results
        
        self.logger.debug(f"Checking for complementary documents in {len(extraction_results)} extracted documents")
        
        mandatory_fields = self.document_config.get_mandatory_fields()
        # Campos críticos que identifican UN documento (si coinciden, es el mismo)
        identity_fields = ['document_number']
        
        merged_results = []
        used_indices = set()
        
        for i, (doc1, fidelity1) in enumerate(extraction_results):
            if i in used_indices:
                continue
                
            # Intentar mergear con documentos posteriores
            merged_doc = doc1.copy()
            merged_fidelity = fidelity1
            merged_count = 1
            
            for j in range(i + 1, len(extraction_results)):
                if j in used_indices:
                    continue
                    
                doc2, fidelity2 = extraction_results[j]
                
                # Verificar si doc1 y doc2 son complementarios
                if self._are_documents_complementary(doc1, doc2, mandatory_fields, identity_fields):
                    self.logger.info(f"🔗 Merging complementary documents #{i+1} and #{j+1}")
                    
                    # Mergear: doc2 rellena los campos null/faltantes de doc1
                    for field, value in doc2.items():
                        if field == 'confidence_scores':
                            # Mergear confidence scores
                            if 'confidence_scores' not in merged_doc:
                                merged_doc['confidence_scores'] = {}
                            merged_doc['confidence_scores'].update(doc2.get('confidence_scores', {}))
                        elif field not in merged_doc or merged_doc[field] is None or merged_doc[field] == '':
                            # Solo llenar si el campo está vacío en doc1
                            merged_doc[field] = value
                    
                    # Promediar fidelity
                    merged_fidelity = (merged_fidelity * merged_count + fidelity2) / (merged_count + 1)
                    merged_count += 1
                    used_indices.add(j)
            
            merged_results.append((merged_doc, merged_fidelity))
            used_indices.add(i)
        
        if len(merged_results) < len(extraction_results):
            self.logger.info(f"✅ Merged {len(extraction_results)} documents into {len(merged_results)} documents")
        
        return merged_results
    
    def _are_documents_complementary(self, doc1: dict, doc2: dict, mandatory_fields: list, identity_fields: list) -> bool:
        """Check if two documents are complementary parts of the same document.
        
        Two documents are complementary if:
        1. They have different sets of populated mandatory fields (one has some, the other has others)
        2. If they share identity fields (like document_number), the values match
        3. They don't both have ALL mandatory fields (if so, they're separate documents)
        
        Args:
            doc1, doc2: Documents to compare
            mandatory_fields: List of mandatory field names
            identity_fields: Fields that identify uniqueness (e.g., document_number)
            
        Returns:
            True if documents appear to be complementary parts
        """
        # Check 1: ¿Comparten algún identity field con el mismo valor?
        shared_identity = False
        for field in identity_fields:
            val1 = doc1.get(field)
            val2 = doc2.get(field)
            if val1 and val2 and val1 != 'null' and val2 != 'null':
                if val1 == val2:
                    shared_identity = True
                else:
                    # Si tienen el mismo campo pero valores diferentes, son documentos distintos
                    return False
        
        # Check 2: Contar campos obligatorios poblados en cada documento
        doc1_populated = set()
        doc2_populated = set()
        
        for field in mandatory_fields:
            if field == 'confidence_scores':
                continue
            val1 = doc1.get(field)
            val2 = doc2.get(field)
            
            if val1 and val1 not in [None, '', 'null']:
                doc1_populated.add(field)
            if val2 and val2 not in [None, '', 'null']:
                doc2_populated.add(field)
        
        # Check 3: Si uno tiene TODOS los campos, no son complementarios
        if len(doc1_populated) == len(mandatory_fields) or len(doc2_populated) == len(mandatory_fields):
            return False
        
        # Check 4: ¿Tienen campos diferentes poblados? (complementarios)
        # Idealmente doc1 tiene campos que doc2 no tiene, y viceversa
        unique_to_doc1 = doc1_populated - doc2_populated
        unique_to_doc2 = doc2_populated - doc1_populated
        
        # Son complementarios si:
        # - Ambos tienen ALGUNOS campos obligatorios
        # - Al menos uno tiene campos que el otro no tiene
        # - Y no entran en conflicto (no tienen diferentes valores para el mismo identity field)
        are_complementary = (
            len(doc1_populated) > 0 and
            len(doc2_populated) > 0 and
            (len(unique_to_doc1) > 0 or len(unique_to_doc2) > 0)
        )
        
        if are_complementary:
            self.logger.debug(f"Documents are complementary: doc1 has {doc1_populated}, doc2 has {doc2_populated}")
        
        return are_complementary

    def _validate_and_clean_data(self, raw_extraction: Dict[str, Any]) -> Dict[str, Any]:
        """Deprecated shim: use DocumentConfig.validate_and_clean_data instead."""
        is_valid, validated, _ = self.document_config.validate_and_clean_data(raw_extraction)
        return validated

    def _check_fidelity(self, fidelity_score: float):
        """Check if fidelity score meets minimum requirements.

        Args:
            fidelity_score (float): The confidence score to check (0-100).

        Raises:
            LowFidelityError: If score is below configured minimum.
        """
        if fidelity_score < self.settings.MIN_FIDELITY_SCORE:
            raise LowFidelityError(
                fidelity_score=fidelity_score,
                min_required=self.settings.MIN_FIDELITY_SCORE
            )

    def _validate_mandatory_fields(self, validated_data: Dict[str, Any], confidence_scores: Dict[str, float]):
        """Validate mandatory fields according to document configuration.

        Checks that all required fields are present and have sufficient
        confidence scores based on the document configuration.

        Args:
            validated_data (dict): Validated field data.
            confidence_scores (dict): Per-field confidence scores.

        Returns:
            float: Adjusted overall fidelity score after validation.

        Raises:
            LowFidelityError: If mandatory fields fail quality checks.
        """
        is_valid, failed_mandatory, overall_score = self.document_config.validate_extraction_quality(
            validated_data, confidence_scores
        )

        if not is_valid:
            # Crear mensaje específico para campos obligatorios fallidos
            failed_fields_str = ", ".join(failed_mandatory)
            raise LowFidelityError(
                fidelity_score=overall_score,
                min_required=self.document_config.minimum_mandatory_score,
                details={
                    'failed_mandatory_fields': failed_mandatory,
                    'message': f"Campos obligatorios con calidad insuficiente: {failed_fields_str}",
                    'mandatory_fields': self.document_config.get_mandatory_fields(),
                    'optional_fields': self.document_config.get_optional_fields()
                }
            )

        return overall_score

    def _build_result(
        self,
        validated_data: Dict[str, Any],
        fidelity_score: float,
        raw_extraction: Dict[str, Any],
        start_time: float
    ) -> ExtractionResult:
        """Build the final extraction result.

        Constructs a comprehensive result object containing extracted data,
        confidence scores, metadata, and processing information.

        Args:
            validated_data (dict): Cleaned and validated extraction data.
            fidelity_score (float): Overall confidence score (0-100).
            raw_extraction (dict): Original extraction including confidence scores.
            start_time (float): Timestamp when extraction started.

        Returns:
            ExtractionResult: Complete extraction result object with all
                data, scores, and metadata.
        """

        # Usar documento genérico
        document = GenericDocument(
            data=validated_data,
            document_type=self.document_config.document_type
        )

        confidence_scores = raw_extraction.get('confidence_scores', {})

        metadata = {
            'model_used': self.settings.GEMINI_MODEL,
            'document_type': self.document_config.document_type,
            'extraction_version': '2.0.0',
            'is_complete': document.is_complete(self.document_config.required_fields),
            'missing_fields': document.get_missing_fields(self.document_config.required_fields)
        }

        processing_time = time.time() - start_time

        return ExtractionResult(
            data=validated_data,  # Usar diccionario directamente
            fidelity=fidelity_score,
            confidence_scores=confidence_scores,
            metadata=metadata,
            processing_time=processing_time,
            document_type=self.document_config.document_type
        )

    def get_supported_formats(self) -> list:
        """Get list of supported image formats.

        Returns:
            list: List of supported format extensions (e.g., ['jpg', 'png']).

        Example:
            >>> formats = extractor.get_supported_formats()
            >>> print(f"Supports: {', '.join(formats)}")
        """
        return list(self.settings.SUPPORTED_IMAGE_FORMATS)

    def validate_base64(self, image_base64: str) -> bool:
        """Validate a base64-encoded string.

        Args:
            image_base64 (str): The base64 string to validate.

        Returns:
            bool: True if valid base64, False otherwise.

        Example:
            >>> if extractor.validate_base64(image_str):
            ...     result = extractor.extract_document_info(image_str)
        """
        try:
            self.base64_handler.decode_base64(image_base64)
            return True
        except Exception:
            return False

    def get_document_type(self) -> str:
        """Get the configured document type.

        Returns:
            str: The document type name (e.g., 'colombian_id', 'passport').

        Example:
            >>> doc_type = extractor.get_document_type()
            >>> print(f"Configured for: {doc_type}")
        """
        return self.document_config.document_type
