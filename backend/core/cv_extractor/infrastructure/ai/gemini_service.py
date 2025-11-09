"""Google Gemini API service for AI-powered document data extraction.

This module provides the GeminiService class that integrates with Google's
Gemini API to perform optical character recognition (OCR) and structured
data extraction from document images. It handles API communication, response
parsing, error handling, and retry logic.

The service is designed to be robust, with automatic retry mechanisms for
transient failures and comprehensive error handling for various API and
processing scenarios.

Typical usage:
    service = GeminiService()
    image = Image.open("document.jpg")
    data, confidence = service.extract_from_image(image)
"""

import json
import time
from typing import Dict, Any, Optional, Tuple
from PIL import Image
import google.generativeai as genai
import io

from ..config.settings import get_settings
from ...domain.exceptions import (
    ServiceUnavailableError,
    ProcessingError,
    ValidationError,
    NotRequestedDocumentError
)
from ..logging.logger import get_logger
from ...application.prompts.prompt_manager import PromptManager

class GeminiService:
    """Service for AI-powered document data extraction using Google Gemini API.

    This class provides a complete interface for extracting structured data from
    document images using Google's Gemini generative AI model. It handles all
    aspects of the extraction pipeline including API configuration, prompt
    management, response parsing, and confidence scoring.

    The service includes robust error handling with automatic retry mechanisms
    for transient failures, comprehensive logging, and validation of extracted
    data against expected document structures.

    Attributes:
        settings: Application settings containing API keys and configuration.
        logger: Logger instance for tracking operations and debugging.
        prompt_manager: Manager for handling extraction prompts.
        model: Configured Gemini generative model instance.

    Examples:
        Basic document processing:

            service = GeminiService()
            image = Image.open("id_document.jpg")
            extracted_data, confidence = service.extract_from_image(image)
            print(f"Confidence: {confidence}%")

        Process multiple images:

            service = GeminiService()
            images = [Image.open(f"doc_{i}.jpg") for i in range(5)]
            results = []
            for image in images:
                try:
                    data, conf = service.extract_from_image(image)
                    results.append((data, conf))
                except Exception as e:
                    print(f"Failed to process image: {e}")
    """
    def __init__(self):
        """Initialize the GeminiService with required configurations.

        Sets up the service by loading application settings, initializing
        logging, creating a prompt manager, and configuring the Gemini API client.
        The initialization process includes setting up the generative model with
        appropriate parameters for document data extraction.

        Raises:
            ServiceUnavailableError: If the Gemini API client cannot be initialized,
                typically due to invalid API keys or network connectivity issues.

        Examples:
            Initialize the service:

                try:
                    service = GeminiService()
                    print("Service initialized successfully")
                except ServiceUnavailableError as e:
                    print(f"Failed to initialize: {e}")
        """
        self.settings = get_settings()
        self.logger = get_logger(__name__)
        self.prompt_manager = PromptManager()
        self._initialize_client()

    def _initialize_client(self):
        """Initialize the Gemini API client with configuration settings.

        Configures the Google Generative AI client using the API key from settings,
        sets up generation parameters for optimal document extraction performance,
        and creates the generative model instance.

        The generation configuration is optimized for structured data extraction
        with JSON output format and parameters that balance creativity with
        consistency for document processing tasks.

        Raises:
            ServiceUnavailableError: If client initialization fails due to invalid
                API credentials, network issues, or configuration problems.

        Note:
            This method is called automatically during __init__ and should not
            be called directly by external code.
        """
        try:
            genai.configure(api_key=self.settings.GEMINI_API_KEY)

            generation_config = genai.GenerationConfig(
                temperature=self.settings.GEMINI_TEMPERATURE,
                top_p=self.settings.GEMINI_TOP_P,
                top_k=self.settings.GEMINI_TOP_K,
                max_output_tokens=self.settings.GEMINI_MAX_OUTPUT_TOKENS,
                response_mime_type="application/json"
            )

            self.model = genai.GenerativeModel(
                model_name=self.settings.GEMINI_MODEL,
                generation_config=generation_config
            )

            self.logger.info(f"Gemini service initialized with model: {self.settings.GEMINI_MODEL}")

        except Exception as e:
            self.logger.error(f"Failed to initialize Gemini service: {str(e)}")
            raise ServiceUnavailableError(
                "No se pudo inicializar el servicio de Gemini",
                {'error': str(e)}
            )
    
    def _get_model_instance(self, model_name: str):
        """Crea una instancia del modelo especificado con la configuración actual.
        
        Args:
            model_name: Nombre del modelo (ej. 'gemini-1.5-pro', 'gemini-1.5-flash')
            
        Returns:
            Instancia del modelo configurado
        """
        generation_config = genai.GenerationConfig(
            temperature=self.settings.GEMINI_TEMPERATURE,
            top_p=self.settings.GEMINI_TOP_P,
            top_k=self.settings.GEMINI_TOP_K,
            max_output_tokens=self.settings.GEMINI_MAX_OUTPUT_TOKENS,
            response_mime_type="application/json"
        )
        
        return genai.GenerativeModel(
            model_name=model_name,
            generation_config=generation_config
        )

    def extract_from_image(self, image: Image.Image, retry_count: int = 0) -> tuple:
        """Extract structured data from a document image using Gemini API.

        Performs end-to-end document data extraction including API communication,
        response parsing, validation, and confidence scoring. The method includes
        automatic retry logic for handling transient failures and comprehensive
        error handling for various failure scenarios.

        Args:
            image (Image.Image): PIL Image object containing the document to process.
                Should be a clear, well-lit image of an identity document.
            retry_count (int, optional): Current retry attempt number. Used internally
                for recursive retry logic. Defaults to 0.

        Returns:
            tuple: A tuple containing:
                - list: A list of tuples, one per document found. Each tuple contains:
                    - Dict with extracted document data (names, numbers, dates, etc.)
                    - Float representing confidence/fidelity score (0-100)
                - dict: Token usage metadata with keys:
                    - prompt_token_count: Tokens used in the prompt
                    - candidates_token_count: Tokens used in the response
                    - total_token_count: Total tokens used
                
            If the image contains multiple documents of the requested type, the list
            will have multiple elements. If only one document is found, the list will
            have one element.

        Raises:
            ValidationError: If the AI model response doesn't match expected structure
                or required fields are missing.
            ServiceUnavailableError: If API quota limits are reached or service
                is temporarily unavailable after all retry attempts.
            ProcessingError: If unexpected errors occur during processing or if
                maximum retry attempts are exceeded.

        Examples:
            Extract data from a document image:

                service = GeminiService()
                image = Image.open("colombian_id.jpg")
                try:
                    data, confidence = service.extract_from_image(image)
                    print(f"Name: {data.get('first_name')}")
                    print(f"Confidence: {confidence}%")
                except ValidationError as e:
                    print(f"Invalid response structure: {e}")
                except ServiceUnavailableError as e:
                    print(f"Service unavailable: {e}")

            Process with error handling:

                results = []
                for image_path in image_paths:
                    try:
                        image = Image.open(image_path)
                        data, conf = service.extract_from_image(image)
                        results.append({'file': image_path, 'data': data, 'confidence': conf})
                    except Exception as e:
                        results.append({'file': image_path, 'error': str(e)})
        """
        try:
            prompt = self.prompt_manager.create_extraction_message()

            response_text, token_usage = self._call_gemini_api(image, prompt)

            # Try to parse response with specific handling for JSON parsing errors
            try:
                extracted_data = self._parse_response(response_text)
            except json.JSONDecodeError as json_err:
                # JSON truncado o malformado - reintentar si tenemos intentos disponibles
                if retry_count < self.settings.MAX_RETRIES:
                    self.logger.warning(
                        f"🔄 JSON truncado/malformado detectado. "
                        f"Reintentando {retry_count + 1}/{self.settings.MAX_RETRIES}. "
                        f"Error: {str(json_err)}"
                    )
                    time.sleep(self.settings.RETRY_DELAY * (retry_count + 1))
                    return self.extract_from_image(image, retry_count + 1)
                else:
                    # Ya no hay más reintentos, lanzar el error original
                    self.logger.error(
                        f"❌ JSON truncado después de {self.settings.MAX_RETRIES} intentos. "
                        f"Respuesta truncada: {response_text[:500]}"
                    )
                    raise ValidationError(
                        f"Error al parsear la respuesta JSON después de {self.settings.MAX_RETRIES} intentos: {str(json_err)}",
                        {'response': response_text[:500], 'error': str(json_err), 'retries': retry_count}
                    )

            # Verificar si Gemini detectó que no es el tipo de documento correcto
            is_requested_type = extracted_data.get('is_requested_document_type', True)
            doc_type_explanation = extracted_data.get('document_type_explanation')
            
            # Si no es el tipo correcto, LOG pero NO lanzar error (procesar normalmente con comentario)
            if is_requested_type is False:
                expected_type = self.prompt_manager.get_document_type()
                # Log informativo - el documento será procesado con campos null y comentario
                self.logger.info(f"📋 Documento rechazado por LLM: {doc_type_explanation or 'tipo incorrecto'}")
                # NO lanzar excepción - dejar que se procese normalmente
            
            # Extraer el array de documentos
            documents = extracted_data.get('documents', [])
            
            if not documents:
                raise ValidationError(
                    "La respuesta no contiene ningún documento en el array 'documents'",
                    {'response': extracted_data}
                )
            
            # Procesar cada documento en el array
            results = []
            
            for idx, doc_data in enumerate(documents):
                # Validar estructura de cada documento
                if not self.prompt_manager.validate_prompt_response(doc_data):
                    self.logger.warning(f"Documento #{idx+1} no contiene todos los campos requeridos")
                    # Continuamos procesando los otros documentos
                    continue
                
                # Calcular fidelity simple (50.0 fijo ya que no tenemos confidence_scores)
                fidelity_score = 50.0
                
                # Agregar a resultados
                results.append((doc_data, fidelity_score))
            
            if not results:
                raise ValidationError(
                    "Ninguno de los documentos en el array tiene la estructura correcta",
                    {'response': extracted_data}
                )
            
            return results, token_usage

        except (ServiceUnavailableError, ProcessingError) as e:
            if retry_count < self.settings.MAX_RETRIES:
                self.logger.warning(f"Retry {retry_count + 1}/{self.settings.MAX_RETRIES} after error: {str(e)}")
                time.sleep(self.settings.RETRY_DELAY * (retry_count + 1))
                return self.extract_from_image(image, retry_count + 1)
            raise

        except Exception as e:
            # No loggear aquí, la excepción ya contiene toda la info
            raise ProcessingError(
                f"Error inesperado durante la extracción: {str(e)}"
            )

    def _call_gemini_api(self, image: Image.Image, prompt: str) -> tuple:
        """Make a direct API call to Google Gemini for image analysis.

        Sends the image and prompt to the Gemini API and handles the response.
        This method includes specific error handling for quota limits and rate
        limiting issues that commonly occur with AI service APIs.

        Args:
            image (Image.Image): PIL Image object to analyze.
            prompt (str): Complete prompt including system instructions and
                extraction requirements.

        Returns:
            tuple: A tuple containing:
                - str: Raw text response from the Gemini API, typically in JSON format
                - dict: Token usage metadata

        Raises:
            ProcessingError: If the API call fails for technical reasons or
                returns an invalid/empty response.
            ServiceUnavailableError: If API quota limits are exceeded or rate
                limiting is triggered.

        Note:
            This is an internal method and should not be called directly.
            Use extract_from_image() instead for complete processing.
        """
        try:
            self.logger.debug("Calling Gemini API for image analysis")

            response = self.model.generate_content([prompt, image])

            if not response or not response.text:
                raise ProcessingError("El modelo no devolvió una respuesta válida")

            self.logger.debug(f"Received response from Gemini: {response.text[:200]}...")

            # Capturar metadata de uso de tokens
            token_usage = {}
            if hasattr(response, 'usage_metadata'):
                usage = response.usage_metadata
                token_usage = {
                    'prompt_token_count': getattr(usage, 'prompt_token_count', 0),
                    'candidates_token_count': getattr(usage, 'candidates_token_count', 0),
                    'total_token_count': getattr(usage, 'total_token_count', 0)
                }
                self.logger.debug(f"Token usage: {token_usage['total_token_count']} tokens (prompt: {token_usage['prompt_token_count']}, response: {token_usage['candidates_token_count']})")
            else:
                self.logger.warning("No token usage metadata available in response")

            return response.text, token_usage

        except Exception as e:
            self.logger.error(f"Gemini API call failed: {str(e)}")
            if "quota" in str(e).lower() or "rate" in str(e).lower():
                raise ServiceUnavailableError(
                    "Límite de API alcanzado. Por favor, intente más tarde",
                    {'error': str(e)}
                )
            raise ProcessingError(
                f"Error al llamar a la API de Gemini: {str(e)}"
            )

    def _parse_response(self, response_text: str) -> Dict[str, Any]:
        """Parse and clean the raw API response into structured data.

        Cleans the raw response text by removing markdown code block markers
        and other formatting artifacts that might be present in the AI model's
        response. Then parses the cleaned text as JSON and validates the structure.

        Args:
            response_text (str): Raw response text from the Gemini API, potentially
                containing markdown formatting or code block markers.

        Returns:
            Dict[str, Any]: Parsed JSON response as a Python dictionary containing
                the extracted document data and confidence scores.

        Raises:
            ValidationError: If the response text cannot be parsed as valid JSON
                or if the parsed result is not a dictionary object.
            ProcessingError: If unexpected errors occur during response parsing.

        Note:
            This method handles common formatting issues in AI responses such as
            ```json markers, extra whitespace, and nested code blocks.
        """
        original_response = response_text  # Guardar original para logging
        
        try:
            response_text = response_text.strip()

            # Remover markers de código
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]

            response_text = response_text.strip()

            # Intentar parsear directamente
            parsed_data = json.loads(response_text)

            if not isinstance(parsed_data, dict):
                raise ValidationError(
                    "La respuesta debe ser un objeto JSON",
                    {'response': response_text[:500]}
                )

            return parsed_data

        except json.JSONDecodeError as e:
            # Loggear con más detalle
            self.logger.warning(
                f"⚠️  JSON parsing failed at line {e.lineno}, col {e.colno}: {e.msg}"
            )
            self.logger.debug(f"Problematic section: {response_text[max(0, e.pos-100):e.pos+100]}")
            
            # Intentar reparar el JSON antes de fallar
            try:
                self.logger.info("🔧 Attempting to repair malformed JSON...")
                repaired_json = self._try_repair_json(response_text)
                
                # Intentar parsear el JSON reparado
                parsed_data = json.loads(repaired_json)
                
                if not isinstance(parsed_data, dict):
                    raise ValidationError(
                        "La respuesta debe ser un objeto JSON",
                        {'response': repaired_json[:500]}
                    )
                
                self.logger.info("✅ Successfully repaired and parsed JSON")
                return parsed_data
                
            except (json.JSONDecodeError, Exception) as repair_error:
                # Si la reparación falla, guardar el original y re-lanzar el error original
                self.logger.warning(f"🔧 JSON repair failed: {repair_error}")
                self._save_failed_json_response(original_response, str(e))
                
                # Re-lanzar el error original para que extract_from_image maneje el retry
                raise e
            
        except Exception as e:
            self.logger.error(f"Unexpected error parsing response: {str(e)}")
            raise ProcessingError(
                f"Error inesperado al procesar la respuesta: {str(e)}"
            )

    def _try_repair_json(self, response_text: str) -> str:
        """Attempt to repair common JSON formatting issues.
        
        Args:
            response_text (str): Potentially malformed JSON text
            
        Returns:
            str: Repaired JSON text
        """
        import re
        
        # 1. Reemplazar saltos de línea dentro de strings (entre comillas)
        # Esto es complejo, por ahora solo intentar los casos más comunes
        
        # 2. Si el JSON está truncado, intentar cerrarlo
        # Contar llaves abiertas y cerradas
        open_braces = response_text.count('{')
        close_braces = response_text.count('}')
        open_brackets = response_text.count('[')
        close_brackets = response_text.count(']')
        
        # Si hay más aperturas que cierres, intentar cerrar
        if open_braces > close_braces or open_brackets > close_brackets:
            self.logger.debug(f"🔧 Attempting to close truncated JSON (braces: {open_braces-close_braces}, brackets: {open_brackets-close_brackets})")
            
            # Cerrar strings abiertos primero
            quote_count = response_text.count('"') - response_text.count('\\"')
            if quote_count % 2 != 0:
                # Hay una comilla sin cerrar
                response_text += '"'
                self.logger.debug("🔧 Closed unclosed quote")
            
            # Cerrar brackets
            while open_brackets > close_brackets:
                response_text += ']'
                close_brackets += 1
                self.logger.debug("🔧 Added closing bracket")
            
            # Cerrar braces
            while open_braces > close_braces:
                response_text += '}'
                close_braces += 1
                self.logger.debug("🔧 Added closing brace")
        
        return response_text
    
    def _save_failed_json_response(self, response_text: str, error_msg: str):
        """Save failed JSON responses to file for debugging.
        
        Args:
            response_text (str): The full response text that failed to parse
            error_msg (str): The error message from JSON parser
        """
        try:
            from datetime import datetime
            import tempfile
            from pathlib import Path
            
            # Crear directorio de debug si no existe
            debug_dir = Path(tempfile.gettempdir()) / 'id_extractor_debug'
            debug_dir.mkdir(exist_ok=True)
            
            # Guardar respuesta con timestamp
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
            filename = debug_dir / f'failed_json_{timestamp}.txt'
            
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(f"=== ERROR ===\n{error_msg}\n\n")
                f.write(f"=== FULL RESPONSE ===\n{response_text}\n")
            
            self.logger.debug(f"💾 Failed JSON saved to: {filename}")
            
        except Exception as e:
            # No fallar si no podemos guardar el debug
            self.logger.debug(f"Could not save failed JSON: {e}")


