"""Document configuration classes for different identity document types.

This module provides abstract and concrete configuration classes that define
the structure, validation rules, and processing parameters for different types
of identity documents. Each document type has specific requirements for field
validation, prompt generation, and quality assessment.

The configuration system is designed to be:
- Extensible: Easy to add new document types
- Flexible: Support for mandatory/optional field classification
- Configurable: Custom prompts, weights, and validation rules
- Quality-aware: Built-in confidence scoring and validation

Examples:
    Creating and using a Colombian ID configuration:

        >>> from src.domain.models.document_config import ColombianIDConfig
    >>>
    >>> config = ColombianIDConfig()
    >>> print(config.get_document_description())
    'cédulas de identidad colombianas'
    >>>
    >>> # Generate extraction prompt
    >>> prompt = config.get_extraction_prompt()
    >>> print(len(prompt))  # Long detailed prompt
    >>>
    >>> # Check field requirements
    >>> mandatory = config.get_mandatory_fields()
    >>> print('document_number' in mandatory)  # True
    >>>
    >>> # Validate extraction quality
    >>> data = {'document_number': '12345678', 'first_names': 'JUAN'}
    >>> scores = {'document_number': 95, 'first_names': 85}
    >>> is_valid, failed, quality = config.validate_extraction_quality(data, scores)

Architecture:
    DocumentConfig (ABC)
    ├── Abstract methods for document-specific behavior
    ├── Generic prompt generation logic
    ├── Quality validation framework
    └── ColombianIDConfig (concrete implementation)
        └── Colombian-specific rules and field definitions
"""

from typing import Dict, List, Any
from dataclasses import dataclass
from abc import ABC, abstractmethod
from ...infrastructure.config.settings import get_settings
from ..services.validators import ColombianIDValidator, CVValidator

@dataclass
class DocumentConfig(ABC):
    """Abstract base class for document type configurations.

    This class defines the structure and behavior for document-specific
    configurations. It handles field management, prompt generation, quality
    validation, and extraction rules for different types of identity documents.

    The class automatically manages field categorization (mandatory vs optional),
    generates validation prompts, and provides quality assessment capabilities
    based on confidence scores and extraction results.

    Attributes:
        document_type (str): Unique identifier for the document type
        required_fields (List[str]): All fields that should be extracted
        custom_prompts (Dict[str, str]): Custom prompts for system/extraction
        critical_rules (List[str]): Critical validation rules for extraction
        extra_rules (List[str]): Additional rules for extraction quality
        mandatory_fields (List[str]): Fields that must be successfully extracted
        optional_fields (List[str]): Fields that can fail without invalidating extraction
        minimum_mandatory_score (float): Minimum confidence for mandatory fields

    Examples:
        Subclassing DocumentConfig for a new document type:

        >>> class PassportConfig(DocumentConfig):
        ...     def __init__(self):
        ...         super().__init__(
        ...             document_type="passport",
        ...             required_fields=['passport_number', 'full_name'],
        ...             mandatory_fields=['passport_number']
        ...         )
        ...
        ...     def get_document_description(self):
        ...         return "international passports"
        ...
        ...     def get_field_descriptions(self):
        ...         return {'passport_number': 'Passport ID number'}

    Note:
        This is an abstract class and cannot be instantiated directly.
        Subclasses must implement get_document_description() and
        get_field_descriptions() methods.
    """

    document_type: str
    required_fields: List[str]
    custom_prompts: Dict[str, str] = None
    critical_rules: List[str] = None
    extra_rules: List[str] = None
    # Nuevos campos para manejo de obligatoriedad
    mandatory_fields: List[str] = None  # Campos obligatorios - si fallan, extracción falla
    optional_fields: List[str] = None   # Campos opcionales - si fallan, se acepta null
    minimum_mandatory_score: float = 80.0  # Score mínimo para campos obligatorios

    def __post_init__(self):
        """Initialize configuration after dataclass creation.

        Performs post-initialization setup including:
        - Auto-generation of field weights if not provided
        - Auto-generation of custom prompts dictionary
        - Initialization of rules lists
        - Automatic calculation of mandatory/optional field lists
        - Validation of field configuration consistency
        - Automatic addition of 'comentario' field to all document types

        Raises:
            ValueError: If mandatory_fields and optional_fields overlap

        Note:
            This method is automatically called by the dataclass after __init__.
            It ensures all configuration attributes are properly initialized
            with sensible defaults when not explicitly provided.
        """
        # Agregar automáticamente el campo 'comentario' si no está presente
        if 'comentario' not in self.required_fields:
            self.required_fields.append('comentario')
        
        # Auto-generar prompts si no se especifican
        if self.custom_prompts is None:
            self.custom_prompts = {}

        # Inicializar listas de reglas si no se especifican
        if self.critical_rules is None:
            self.critical_rules = []

        if self.extra_rules is None:
            self.extra_rules = []
        
        # Agregar regla automática sobre el campo comentario si no está ya presente
        comentario_rule = "💬 FIELD 'comentario': Optional field for doubts, image quality issues, or helpful context. Use null when everything is clear (not mandatory)."
        if not any('comentario' in rule for rule in self.extra_rules):
            self.extra_rules.append(comentario_rule)

        # Configurar campos obligatorios y opcionales
        if self.mandatory_fields is None:
            # Por defecto, todos los campos (excepto comentario) son obligatorios
            self.mandatory_fields = [f for f in self.required_fields if f != 'comentario']
            self.optional_fields = ['comentario']
        else:
            # Calcular campos opcionales como la diferencia
            all_data_fields = [f for f in self.required_fields if f != 'comentario']
            self.optional_fields = [f for f in all_data_fields if f not in self.mandatory_fields]
            # Asegurar que 'comentario' siempre sea opcional
            if 'comentario' not in self.optional_fields:
                self.optional_fields.append('comentario')

        # Validar que no haya campos duplicados
        overlap = set(self.mandatory_fields) & set(self.optional_fields)
        if overlap:
            raise ValueError(f"Los campos no pueden ser obligatorios y opcionales a la vez: {overlap}")

    def is_field_mandatory(self, field_name: str) -> bool:
        """Check if a field is classified as mandatory.

        Args:
            field_name: The name of the field to check

        Returns:
            True if the field is mandatory, False otherwise

        Examples:
            >>> config = ColombianIDConfig()
            >>> config.is_field_mandatory('document_number')
            True
            >>> config.is_field_mandatory('confidence_scores')
            False
        """
        return field_name in self.mandatory_fields

    def get_mandatory_fields(self) -> List[str]:
        """Get a copy of the mandatory fields list.

        Returns:
            A new list containing all mandatory field names

        Examples:
            >>> config = ColombianIDConfig()
            >>> mandatory = config.get_mandatory_fields()
            >>> print('document_number' in mandatory)
            True

        Note:
            Returns a copy to prevent external modification of the internal list.
        """
        return self.mandatory_fields.copy()

    def get_optional_fields(self) -> List[str]:
        """Get a copy of the optional fields list.

        Returns:
            A new list containing all optional field names

        Examples:
            >>> config = ColombianIDConfig()
            >>> optional = config.get_optional_fields()
            >>> # For Colombian ID, all fields are mandatory, so this would be empty
            >>> print(len(optional))
            0

        Note:
            Returns a copy to prevent external modification of the internal list.
        """
        return self.optional_fields.copy()
    
    def is_extraction_successful(self, data: Dict[str, Any]) -> bool:
        """Determine if extraction was successful based on mandatory fields.
        
        An extraction is considered successful if AT LEAST ONE mandatory field
        has a non-null value. If ALL mandatory fields are null, the extraction
        is considered failed (e.g., document rejected by LLM with explanation in 'comentario').
        
        Args:
            data: Dictionary containing extracted field values
            
        Returns:
            True if at least one mandatory field has a value, False if all are null
            
        Examples:
            >>> config = ColombianIDConfig()
            >>> # Successful extraction
            >>> data = {'document_number': '12345678', 'first_names': 'JUAN', 'last_names': null}
            >>> config.is_extraction_successful(data)
            True
            >>> 
            >>> # Failed extraction (all mandatory fields null, only comentario present)
            >>> data = {'document_number': null, 'first_names': null, 'comentario': 'Parte trasera detectada'}
            >>> config.is_extraction_successful(data)
            False
            
        Note:
            This method makes it easy to consistently determine extraction success
            across all document types. Document rejected by LLM will have all
            mandatory fields as null with explanation in 'comentario' field.
        """
        if not self.mandatory_fields:
            # Si no hay campos obligatorios definidos, considerar exitoso por defecto
            return True
        
        # Verificar si AL MENOS UN campo obligatorio tiene valor
        for field in self.mandatory_fields:
            value = data.get(field)
            # Considerar exitoso si hay al menos un campo con valor no-null
            if value is not None and value != '' and value != 'null':
                return True
        
        # Si TODOS los campos obligatorios son null, es un fallo
        return False

    def validate_extraction_quality(self, data: Dict[str, Any]) -> tuple:
        """Validate extraction quality based on field requirements.

        Evaluates the quality of document extraction by checking mandatory field
        completeness. Mandatory fields that are missing will cause extraction to fail.

        Args:
            data: Dictionary containing extracted field values

        Returns:
            A tuple containing:
                - is_valid (bool): True if all mandatory fields are present
                - failed_mandatory_fields (List[str]): List of mandatory fields that failed

        Examples:
            >>> config = ColombianIDConfig()
            >>> data = {
            ...     'document_number': '12345678',
            ...     'first_names': 'JUAN',
            ...     'last_names': None  # Missing required field
            ... }
            >>> is_valid, failed = config.validate_extraction_quality(data)
            >>> print(f"Valid: {is_valid}, Failed: {failed}")
            Valid: False, Failed: ['last_names']

        Quality Assessment Rules:
            - Mandatory fields must have non-null values
            - Optional fields don't affect validity
        """
        failed_mandatory = []

        # Verificar campos obligatorios
        for field in self.mandatory_fields:
            field_value = data.get(field)

            # Campo obligatorio faltante
            if field_value is None or field_value == '' or field_value == 'null':
                failed_mandatory.append(field)

        # La extracción es válida si no hay campos obligatorios fallidos
        is_valid = len(failed_mandatory) == 0

        return is_valid, failed_mandatory

    def validate_and_clean_data(self, raw_extraction: Dict[str, Any]) -> tuple:
        """Default validation/cleaning hook for extracted data.

        By default, returns the data as-is with no additional validation. 
        Configs can override to implement their own validation and normalization logic.

        Args:
            raw_extraction: Raw data returned by the model

        Returns:
            Tuple: (is_valid: bool, validated_data: Dict[str, Any], validation_errors: List[str])
        """
        extraction_data = raw_extraction.copy()
        return True, extraction_data, []

    def get_comentario_description(self) -> str:
        """Get default description for the 'comentario' field.
        
        Returns:
            Standard description for the comentario field that applies to all document types.
        """
        return (
            "Campo OPCIONAL para expresar observaciones sobre la calidad de la extracción. "
            "Usa este campo para: (1) Mencionar dudas o incertidumbres sobre campos específicos, "
            "(2) Reportar problemas de calidad de imagen (ej: borroso, sombras, cortado), "
            "(3) Explicar contexto útil cuando hay campos null, "
            "(4) IMPORTANTE: Si el documento NO es válido (ej: parte trasera, documento incorrecto), "
            "pon TODOS los campos en null y explica el motivo en este campo. "
            "Si TODO está perfectamente claro y legible, usa null. Máximo 200 caracteres."
        )

    @abstractmethod
    def get_document_description(self) -> str:
        """Get human-readable description of the document type.

        Returns:
            A descriptive string identifying the document type in Spanish
            (e.g., 'cédulas de identidad colombianas', 'pasaportes internacionales')

        Note:
            This method must be implemented by all subclasses.
            The description is used in prompt generation and error messages.
        """
        pass

    @abstractmethod
    def get_field_descriptions(self) -> Dict[str, str]:
        """Get detailed descriptions for each field.

        Returns:
            Dictionary mapping field names to their detailed descriptions.
            Descriptions should include format requirements and validation rules.
            
            Note: The 'comentario' field is automatically added by the base class,
            so you don't need to include it in the returned dictionary.

        Examples:
            Expected return format:
            {
                'document_number': 'Document ID number (digits only, exact as shown)',
                'first_names': 'Given names in uppercase as they appear',
                'birth_date': 'Date of birth (maintain visible format)'
            }

        Note:
            This method must be implemented by all subclasses.
            Descriptions are used in AI model prompts for extraction guidance.
        """
        pass

    def get_extraction_examples(self) -> str:
        """Get document-specific examples for the extraction prompt.
        
        This method should be overridden by subclasses to provide examples
        specific to their document type. Returns empty string by default.
        
        Returns:
            String containing example extractions for this document type.
            Should include both successful and failed extraction examples.
        """
        return ""

    def get_system_prompt(self) -> str:
        """Generate system prompt for AI model initialization.

        Creates a system-level prompt that establishes the AI model's role
        and expertise for document extraction tasks. Uses custom prompt
        if provided, otherwise generates a standard prompt.

        Returns:
            System prompt string for AI model initialization

        Examples:
            >>> config = ColombianIDConfig()
            >>> prompt = config.get_system_prompt()
            >>> print(prompt[:50])
            'Eres un experto en extraer información de cédulas'

        Note:
            If custom_prompts['system'] is set, that will be used instead
            of the auto-generated prompt.
        """
        if 'system' in self.custom_prompts:
            return self.custom_prompts['system']

        doc_desc = self.get_document_description()
        return f"""Eres un experto en extraer información de {doc_desc}.
Tu tarea es analizar imágenes y extraer información precisa en formato JSON estructurado.
Debes ser extremadamente preciso y no inventar información que no esté claramente visible."""

    def get_extraction_prompt(self) -> str:
        """Generate comprehensive extraction prompt for AI models using Gemini best practices.

        Creates a detailed prompt following Gemini's prompt engineering guidelines:
        - Clear and specific instructions
        - Few-shot examples (document-specific)
        - Completion strategy for JSON output
        - Positive patterns (what TO do, not what NOT to do)
        - Output prefixes for better structure
        - Context and constraints clearly defined

        The prompt is automatically generated from the configuration's
        required_fields, field_descriptions, and rules.

        Returns:
            Complete extraction prompt string optimized for Gemini models

        Examples:
            >>> config = ColombianIDConfig()
            >>> prompt = config.get_extraction_prompt()
            >>> print('JSON:' in prompt)  # Contains output prefix
            True
            >>> print('Completa el siguiente JSON' in prompt)  # Uses completion strategy
            True

        Generated Prompt Sections (following Gemini best practices):
            1. Task description (what to extract)
            2. Image analysis guidance (rotation handling)
            3. Few-shot examples (document-specific)
            4. Field descriptions (context)
            5. Extraction rules (organized by category)
            6. JSON completion starter (completion strategy)

        Note:
            This implementation follows Google's Gemini prompt design strategies:
            https://ai.google.dev/gemini-api/docs/prompting-strategies
        """
        if 'extraction' in self.custom_prompts:
            return self.custom_prompts['extraction']

        doc_desc = self.get_document_description()
        field_descriptions = self.get_field_descriptions()
        
        # Agregar automáticamente la descripción del campo 'comentario'
        if 'comentario' not in field_descriptions:
            field_descriptions['comentario'] = self.get_comentario_description()

        data_fields = self.required_fields

        # ============================================================
        # SECCIÓN 1: FIELD DESCRIPTIONS (Context)
        # ============================================================
        field_descriptions_text = "CAMPOS A EXTRAER:\n\n"
        for field in data_fields:
            if field in field_descriptions:
                field_descriptions_text += f"**{field}**:\n{field_descriptions[field]}\n\n"

        # ============================================================
        # SECCIÓN 2: EXTRACTION RULES (Organized by category)
        # ============================================================
        # POSITIVE PATTERNS (what TO do)
        positive_rules = """📋 REGLAS DE EXTRACCIÓN:

1. **Precisión y Exactitud**:
   - Extrae SOLO texto claramente visible y legible
   - Usa null para cualquier campo que no encuentres o no sea legible
   - Mantén el formato original del texto (mayúsculas, acentos, espacios)
   - Copia números EXACTAMENTE como aparecen (sin agregar ni quitar dígitos)

2. **Campos Requeridos**:
   - Incluye TODOS los campos listados (usa null si falta alguno)
   - Cada documento en el array debe tener la MISMA estructura completa
   - Preferir null sobre inventar o adivinar información

3. **Formato y Limpieza**:"""

        if self.critical_rules:
            positive_rules += "\n"
            for rule in self.critical_rules:
                positive_rules += f"   - {rule}\n"

        # Additional rules
        if self.extra_rules:
            positive_rules += "\n4. **Consideraciones Adicionales**:\n"
            for rule in self.extra_rules:
                positive_rules += f"   - {rule}\n"

        # ============================================================
        # SECCIÓN 3: IMAGE ANALYSIS (Constraints)
        # ============================================================
        image_analysis = """🔍 ANÁLISIS DE IMAGEN:

Antes de extraer, analiza la orientación:
- Examina la imagen en diferentes rotaciones (0°, 90°, 180°, 270°)
- Identifica elementos clave: fotos, logos, encabezados, firmas
- Determina la orientación correcta antes de leer el texto
- Los documentos pueden estar rotados o invertidos"""

        # ============================================================
        # SECCIÓN 4: FEW-SHOT EXAMPLES (Document-specific)
        # ============================================================
        extraction_examples = self.get_extraction_examples()

        # ============================================================
        # SECCIÓN 5: JSON COMPLETION STARTER (Completion strategy)
        # ============================================================
        # Build ALL fields skeleton to ensure completeness
        all_fields_json = ""
        for field in data_fields:
            all_fields_json += f'      "{field}": \n'
        
        json_completion_starter = f"""FORMATO DE RESPUESTA:

Completa el siguiente JSON con los datos extraídos de {doc_desc}.
IMPORTANTE: Incluye TODOS los campos listados arriba en tu respuesta.

JSON:
{{
  "is_requested_document_type": 
  "document_type_explanation": 
  "documents": [
    {{
{all_fields_json}    }}
  ]
}}"""

        # ============================================================
        # CONSTRUCCIÓN FINAL DEL PROMPT
        # (Siguiendo el orden recomendado por Gemini)
        # ============================================================
        return f"""{image_analysis}

{extraction_examples}

{field_descriptions_text}

{positive_rules}

{json_completion_starter}

⚠️ REGLAS CRÍTICAS PARA EL JSON:
- Completa el JSON con TODOS los campos mostrados arriba (no omitas ninguno)
- Si un campo no está en el documento, usa null (pero el campo DEBE aparecer)
- Cierra correctamente todas las estructuras del JSON
- Responde SOLO con el JSON completo y válido
- NO agregues texto antes o después del JSON"""

    def validate_response_structure(self, response: Dict[str, Any]) -> bool:
        """Validate that AI model response has required structure.

        Checks that the response dictionary contains at minimum all mandatory fields.
        Optional fields are not required to be present (they can be omitted or null).

        Args:
            response: Dictionary containing AI model's extraction response

        Returns:
            True if response structure is valid, False otherwise

        Examples:
            >>> config = ColombianIDConfig()
            >>> response = {
            ...     'document_number': '12345678',
            ...     'first_names': 'JUAN'
            ... }
            >>> is_valid = config.validate_response_structure(response)
            >>> print(is_valid)  # Would be True if mandatory fields are present

        Validation Checks:
            - All mandatory_fields are present as keys (can be null)
            - Optional fields don't need to be present

        Note:
            This method only validates structure, not content quality.
            Use validate_extraction_quality() for content validation.
        """
        # Check that all mandatory fields are present (can be null, but must exist as keys)
        for field in self.mandatory_fields:
            if field not in response:
                return False

        return True

@dataclass
class ColombianIDConfig(DocumentConfig):
    """Configuration class for Colombian national identity cards (Cédula de Ciudadanía).

    This class provides specialized configuration for processing Colombian national
    ID cards, including all required fields, validation rules, and quality thresholds
    specific to Colombian document standards.

    Colombian ID cards contain critical personal identification information and
    require high accuracy extraction. All fields are classified as mandatory
    due to the legal and identification importance of these documents.

    Key Features:
        - All 10 document fields are mandatory (no optional fields)
        - Very high confidence threshold (95%) for mandatory fields
        - Specialized validation rules for Colombian document formats
        - Detailed field descriptions with format requirements
        - Emphasis on accuracy over speed ('never invent information')

    Document Fields:
        - document_number: National ID number (6-11 digits)
        - first_names: Given names (uppercase, exact match)
        - last_names: Family names (uppercase, exact match)
        - birth_date: Date of birth (various formats accepted)
        - birth_place: Birth location (city and department)
        - height: Physical height (X.XX meter format)
        - blood_type: ABO blood type with Rh factor
        - gender: M/F gender designation
        - expedition_date: Document issue date
        - expedition_place: Document issuing location

    Examples:
        Using Colombian ID configuration:

        >>> config = ColombianIDConfig()
        >>> print(config.document_type)
        'colombian_id'
        >>>
        >>> # All fields are mandatory for Colombian IDs
        >>> mandatory_count = len(config.get_mandatory_fields())
        >>> total_data_fields = len([f for f in config.required_fields if f != 'confidence_scores'])
        >>> print(mandatory_count == total_data_fields)
        True
        >>>
        >>> # High quality threshold
        >>> print(config.minimum_mandatory_score)
        95.0
        >>>
        >>> # Generate extraction prompt
        >>> prompt = config.get_extraction_prompt()
        >>> print('NUNCA INVENTES' in prompt)
        True

    Quality Standards:
        Colombian IDs require the highest quality standards:
        - 95+ confidence score for all mandatory fields
        - Zero tolerance for invented information
        - Exact transcription requirements
        - Null values preferred over guessed data

    Note:
        This configuration is optimized for Colombian document standards
        and may not be suitable for other countries' ID cards without
        modification.
    """

    def __init__(self):
        """Initialize Colombian ID configuration with document-specific settings.

        Sets up all configuration parameters optimized for Colombian national
        ID cards, including field definitions, weights, validation rules,
        and quality thresholds.

        The configuration prioritizes accuracy and completeness, with all
        fields classified as mandatory and high confidence requirements.
        """
        settings = get_settings()
        super().__init__(
            document_type="colombian_id",
            required_fields=[
                'document_number', 'first_names', 'last_names',
                'birth_date', 'birth_place', 'height',
                'blood_type', 'gender', 'expedition_date',
                'expedition_place'
            ],
            critical_rules=[
                # POSITIVE PATTERNS: What TO do (following Gemini best practices)
                "Valida que el documento es una cédula de ciudadanía colombiana válida CON FRENTE VISIBLE",
                "Verifica elementos obligatorios: logo Registraduría Nacional, texto 'REPÚBLICA DE COLOMBIA', FOTO del titular, campo 'SEXO:', número de documento claro",
                "Extrae datos del texto visual legible con etiquetas (NOMBRES:, APELLIDOS:, etc.)",
                "Combina frente y reverso de la misma cédula (mismo número) en UN SOLO objeto del array",
                "Analiza toda la imagen en diferentes orientaciones (0°, 90°, 180°, 270°) para encontrar la correcta",
                "Busca elementos clave (fotos, logos, textos) para determinar la orientación correcta del documento",
                "Rota mentalmente la imagen hasta que el texto sea legible antes de extraer información",
                "Usa null para campos no claramente visibles o legibles en ninguna orientación",
                "Usa null cuando no estés 100% seguro de un dato (preferir null sobre adivinar)",
                "Extrae texto EXACTAMENTE como aparece (mantén mayúsculas, acentos, formato original)",
                "Si ves SOLO códigos QR/barras/MRZ (ICCOL<<), marca is_requested_document_type=false con explicación 'Solo parte trasera detectada'",
                "Si es pasaporte, licencia u otro documento, marca is_requested_document_type=false",
                "Analiza la imagen completa antes de rechazar por falta de información (verifica si hay múltiples caras del documento)",
                "document_number: Extrae SOLO dígitos sin puntos ni espacios (ej: 79327813, 1024563385)",
                "first_names y last_names: Copia EXACTAMENTE en MAYÚSCULAS como aparecen",
                "birth_date y expedition_date: Mantén formato EXACTO sin cambios (07-MAY-1964, 02/08/1988, 20 SEPT 2005)",
                "birth_place: Formato CIUDAD(DEPARTAMENTO) en MAYÚSCULAS (ej: BOGOTA D.C.(CUNDINAMARCA)). Si es lugar extranjero: CIUDAD(PAIS)",
                "expedition_place: Solo ciudad en MAYÚSCULAS (ej: BOGOTA D.C., MEDELLIN)",
                "height: Solo número sin unidades (ej: 1.60, 1.81, 1.75)",
                "blood_type: Extrae SOLO si está claramente visible (cédulas antiguas pueden no tenerlo, usa null si falta)",
                "gender: Busca 'SEXO:' seguido de M o F (campo obligatorio en cédulas válidas)",
                "Usa null si imagen está borrosa, dañada, parcialmente oculta o con texto cortado",
                "Usa null si hay dudas sobre números o fechas",
                "Si es cédula de extranjería, usa null en todos los campos y explica en comentario"
            ],
            extra_rules=[
                "FILOSOFÍA: Preferir 100 campos null correctos sobre 1 dato inventado incorrecto",
                "Usa null si no puedes extraer un dato con certeza",
                "Mantén el formato exacto de lo que ves (extrae como aparece)",
                "Evita usar conocimiento externo para modificar o completar información",
                "Lee solamente lo que dice el texto, sin interpretar lo que 'debería' decir",
                "Extrae datos SOLO de texto visual con etiquetas, omite líneas MRZ (ICCOL<<, nombre<apellido<<)",
                "Verifica que la foto del titular esté visible para validar que es el frente de la cédula",
                "Extrae SOLO de la parte frontal de la cédula con datos visuales y etiquetas claras",
                "Opta por null si hay ambigüedad en cualquier campo",
                "Extrae únicamente información que sea 100% legible y clara",
                "Usa null para tipo de sangre en cédulas antiguas (es normal que no lo tengan)",
                "Prioriza calidad sobre cantidad: mejor un campo null que uno incorrecto"
            ],
            mandatory_fields=[
                'document_number',    # CRÍTICO - identificación principal
                'first_names',        # CRÍTICO - dato fundamental
                'last_names',         # CRÍTICO - dato fundamental
                'birth_date',         # CRÍTICO - información de identidad
                'gender',             # CRÍTICO - información básica
            ],
            minimum_mandatory_score=settings.MIN_FIDELITY_SCORE  # Score de settings para cédulas
        )

    def get_document_description(self) -> str:
        """Get description for Colombian national ID cards.

        Returns:
            Human-readable description in Spanish
        """
        return "cédulas de identidad colombianas"

    def get_field_descriptions(self) -> Dict[str, str]:
        """Get detailed field descriptions for Colombian ID extraction.

        Returns:
            Dictionary mapping each field to its extraction requirements,
            including format specifications, accuracy requirements, and
            guidelines for handling unclear or missing data.

        Field Description Principles:
            - Emphasize exact transcription over interpretation
            - Prefer null values over guessed information
            - Include format requirements and examples
            - Specify handling of edge cases and unclear text

        Note:
            These descriptions are used directly in AI model prompts
            and significantly impact extraction accuracy and behavior.
        """
        return {
            'document_number': 'Número de cédula EXACTO ubicado generalmente en la parte superior derecha. SOLO dígitos visibles sin puntos, comas ni espacios (ej: 79327813, 1024563385). Si no es 100% legible, usa null',
            'first_names': 'Busca la etiqueta "NOMBRES:" o "NOMBRE:". Extrae EXACTAMENTE en MAYÚSCULAS como aparecen (ej: PABLO WILSON, MARIA JOSE). NO normalices, NO corrijas. Si hay dudas o está cortado, usa null',
            'last_names': 'Busca la etiqueta "APELLIDOS:" o "APELLIDO:". Extrae EXACTAMENTE en MAYÚSCULAS como aparecen (ej: MATEUS RODRIGUEZ, GARCIA PEREZ). NO normalices, NO corrijas. Si hay dudas o está cortado, usa null',
            'birth_date': 'Busca "FECHA DE NACIMIENTO:" o "NAC:" o "F.NAC:". Mantén el formato EXACTO visible: puede ser DD-MMM-YYYY (07-MAY-1964), DD/MM/YYYY (02/08/1988), DD MMM YYYY (20 SEPT 2005). NO cambies el formato. Si no es perfectamente legible, usa null',
            'birth_place': 'Busca "LUGAR DE NACIMIENTO:" o "LUGAR NAC:". Lugar EXACTO en MAYÚSCULAS SIN TILDES con formato CIUDAD(DEPARTAMENTO) o CIUDAD D.C.(DEPARTAMENTO) (ej: BOGOTA D.C.(CUNDINAMARCA), CALI(VALLE DEL CAUCA)). Si Si no es completamente visible, usa null. Si el lugar de nacimiento tiene un lugar fuera de Colombia, formatealo de la siguiente manera: UBICACION(PAIS), por ejemplo TACHIRA-SAN CRISTOBAL (VENEZUELA)',
            'height': 'Busca "ESTATURA:" o "EST:". Extrae SOLO el número visible (ej: 1.60, 1.81, 1.75) SIN unidades (sin "m", sin "cm"). Si no es perfectamente legible, usa null',
            'blood_type': 'Busca "TIPO DE SANGRE:", "GS RH:", "G.S:", "RH:" o "GRUPO SANGUÍNEO:". Extrae EXACTAMENTE como aparece (ej: O+, AB-, A+, B-). ATENCIÓN: Cédulas antiguas pueden NO tener este campo - es normal. Si NO está visible claramente, usa null (NO inventes)',
            'gender': 'Busca específicamente la etiqueta "SEXO:" seguida de una letra. Este campo SIEMPRE está presente en cédulas válidas. Extrae EXACTAMENTE: M (masculino) o F (femenino). Si por alguna razón no es claramente visible, usa null',
            'expedition_date': 'Busca "FECHA DE EXPEDICIÓN:", "F.EXP:", "F.EXPEDICIÓN:" o "EXPEDIDA:". Mantén el formato EXACTO visible: puede ser DD-MMM-YYYY (18-MAR-1983), DD/MM/YYYY (15/06/2010), DD MMM YYYY (05 ENE 2020). NO cambies el formato. Si no es perfectamente legible, usa null',
            'expedition_place': 'Busca "LUGAR DE EXPEDICIÓN:" o similar, generalmente cerca de la fecha de expedición. Lugar EXACTO en MAYÚSCULAS SIN TILDES (ej: BOGOTA D.C., MEDELLIN, CALI). Si no es completamente visible, usa null'
        }

    def get_extraction_examples(self) -> str:
        """Get Colombian ID specific extraction examples."""
        return """VERIFICACIÓN DEL TIPO DE DOCUMENTO:
- PRIMERO verifica si el documento en la imagen ES una cédula de ciudadanía colombiana CON DATOS VISIBLES
- Características OBLIGATORIAS de una cédula válida para extracción:
  * Foto del titular claramente visible
  * Logo de Registraduría Nacional del Estado Civil
  * Palabra "REPÚBLICA DE COLOMBIA"
  * Datos personales VISUALES (nombres, apellidos, fecha nacimiento, etc.) - NO solo códigos o MRZ
  * Campo "SEXO:" con M o F visible
  * Número de documento visible en formato legible (no solo en código de barras)
- 🚫 NO EXTRAER DATOS DE MRZ/CÓDIGOS:
  * NO extraigas información de las líneas MRZ (formato: ICCOL006346911<<< o REVELO<MONTENEGRO<<)
  * NO extraigas de códigos de barras o códigos QR
  * SOLO extrae de texto legible y visible en formato normal
- ✅ ACEPTAR SOLO SI:
  * Hay foto del titular visible
  * Los datos están en formato de texto normal legible (NOMBRES:, APELLIDOS:, etc.)
  * Se puede ver claramente la parte frontal de la cédula
- Si en la imagen hay UNO O MÁS cédulas colombianas FRONTALES válidas, marca "is_requested_document_type": true
- IMPORTANTE: Si hay VARIOS documentos del mismo tipo en la imagen, debes extraer la información de TODOS ellos en el array "documents"

📋 EJEMPLO 1 - EXTRACCIÓN EXITOSA DE CÉDULA:
Si veo una cédula de ciudadanía VÁLIDA con foto visible y datos legibles:
- Número: 79.327.813
- NOMBRES: PABLO WILSON  
- APELLIDOS: MATEUS RODRIGUEZ
- Fecha nacimiento: 07-MAY-1964
- Lugar: BOGOTA D.C.(CUNDINAMARCA)
- Estatura: 1.60
- RH: O+
- Sexo: M
- F. Expedición: 18-MAR-1983
- Lugar expedición: BOGOTA D.C.

La respuesta correcta es:
{
  "is_requested_document_type": true,
  "document_type_explanation": null,
  "documents": [
    {
      "document_number": "79327813",
      "first_names": "PABLO WILSON",
      "last_names": "MATEUS RODRIGUEZ", 
      "birth_date": "07-MAY-1964",
      "birth_place": "BOGOTA D.C.(CUNDINAMARCA)",
      "height": "1.60",
      "blood_type": "O+",
      "gender": "M",
      "expedition_date": "18-MAR-1983",
      "expedition_place": "BOGOTA D.C.",
    }
  ]
}

📋 EJEMPLO 2 - DOCUMENTO NO VÁLIDO (parte trasera sin foto):
Si veo SOLO la parte trasera de una cédula (código QR, código de barras, MRZ) SIN foto del titular:

La respuesta correcta es:
{
  "is_requested_document_type": false,
  "document_type_explanation": "Parte trasera de cédula detectada - no se puede extraer",
  "documents": [
    {
      "document_number": null,
      "first_names": null,
      "last_names": null,
      "birth_date": null,
      "birth_place": null,
      "height": null,
      "blood_type": null,
      "gender": null,
      "expedition_date": null,
      "expedition_place": null,
    }
  ]
}

🔍 PROCESO PASO A PASO PARA EXTRAER DATOS DE CÉDULA:
1. VERIFICA QUE NO SEA SOLO PARTE TRASERA: Si ves códigos QR, código de barras, o líneas MRZ (ICCOL<<) SIN foto del titular, marca is_requested_document_type=false
2. Verifica que sea una cédula de ciudadanía colombiana válida FRONTAL (busca logo Registraduría, "REPÚBLICA DE COLOMBIA", FOTO del titular)
3. Confirma que hay FOTO del titular visible - sin foto NO es válida la extracción
4. Localiza el número de documento en texto legible (generalmente en la parte superior derecha) - SOLO dígitos
5. Busca la etiqueta "NOMBRES:" - extrae EXACTAMENTE en MAYÚSCULAS (NO de zona MRZ)
6. Busca la etiqueta "APELLIDOS:" - extrae EXACTAMENTE en MAYÚSCULAS (NO de zona MRZ)
7. Localiza "FECHA DE NACIMIENTO:" o "NAC:" - mantén el formato EXACTO
8. Localiza "LUGAR DE NACIMIENTO:" - mantén MAYÚSCULAS, formato CIUDAD(DEPARTAMENTO)
9. Busca "ESTATURA:" o "EST:" - extrae SOLO el número sin unidades
10. Busca "GS RH:", "RH:", "TIPO DE SANGRE:" - SOLO si está visible (cédulas antiguas pueden no tenerlo)
11. Localiza "SEXO:" - SIEMPRE está presente, extrae M o F
12. Busca "FECHA DE EXPEDICIÓN:" o "F.EXP:" - mantén formato EXACTO
13. Localiza "LUGAR DE EXPEDICIÓN:" - mantén MAYÚSCULAS"""

    def validate_and_clean_data(self, raw_extraction: Dict[str, Any]) -> tuple:
        """Validate and normalize Colombian ID data using DocumentValidator.

        Returns a tuple (is_valid, validated_data, validation_errors). Unknown
        non-null fields from the extraction are preserved.
        """
        extraction_data = raw_extraction.copy()

        is_valid, validated_data, validation_errors = ColombianIDValidator.validate(extraction_data)

        for key in extraction_data:
            if key not in validated_data and extraction_data[key] is not None:
                validated_data[key] = extraction_data[key]

        return is_valid, validated_data, validation_errors


@dataclass
class CVConfig(DocumentConfig):
    """Configuration for CV/Resume document extraction - Universal professional profiles.

    This class provides configuration for extracting data from CVs across ALL professions:
    technical, medical, legal, administrative, etc. The structure is designed to be
    profession-agnostic while maintaining high precision.

    Document Structure:
        1. Atomic Contact Data (High Precision):
            - full_name: Complete name exactly as it appears
            - email: Email address (exact preservation)
            - phone: Phone number (any format)
            - location: Declared city/country of residence
            - social_links: Array of professional URLs (LinkedIn, portfolio, etc.)

        2. Professional Experience (Core Object):
            - experience: Array of work history objects with:
                * company: Exact organization name
                * role: Position title (exact, no normalization)
                * start_date: Start date EXACTLY as written
                * end_date: End date EXACTLY as written (preserve "Present", "Actualidad")
                * location: Job location if different from residence
                * description: Full responsibility/achievement text

        3. Formal Education:
            - education: Array of academic credentials with:
                * institution: University/institution name
                * degree: Degree obtained
                * start_date: Start date of the study
                * end_date: End date of the study

        4. Skills/Competencies (Generalized):
            - languages: List of languages with proficiency levels
            - certifications: Professional certifications, licenses, courses
            - generic_skills: Listed competencies (technical, soft skills, domain-specific)
            - keywords: Alternative skill names and O*NET taxonomy categories

    Critical Extraction Rules:
        - NO INVENT DATES: Extract dates exactly as shown, don't assume formats
        - NO NORMALIZE ROLES: Keep job titles exactly as written
        - PRIORITIZE CONTACT: Extract all available contact methods
        - ZERO LOCATION INFERENCE: Only use explicitly stated location
        - MULTILINGUAL READY: Extract text in original language (Spanish/English/Mixed)
    """

    def __init__(self):
        """Initialize universal CV configuration with high-precision extraction."""
        settings = get_settings()
        super().__init__(
            document_type="cv",
            required_fields=[
                'full_name',
                'email',
                'phone',
                'location',
                'social_links',
                'professional_summary',
                'experience',
                'independent_work',
                'education',
                'languages',
                'document_language',
                'certifications',
                'generic_skills',
                'keywords',
                'achievements',
                'volunteering',
                'professional_affiliations',
                'interests',
            ],
            critical_rules=[
                "Return every field even when the value is null or [].",
                "Copy text exactly as written: letter case, accents, numbers, and ranges.",
                "Use MM-YYYY for dates; if only the year is present, use 01-YYYY/12-YYYY. Accept 'Present' or the literal term provided (e.g., 'Actualidad').",
                "Keep job titles, academic degrees, and organization names exactly as written.",
                "Provide locations only when explicitly stated; otherwise return null.",
                "Search for emails, phone numbers, and URLs across the entire document, including headers and footers.",
                "Languages must follow the format 'English - C1' (language name in English + level).",
                "Do not fabricate or complete missing information.",
            ],
            extra_rules=[
                "Detect professional links in any section (plain text, icons, or hyperlinks) and classify them by type.",
                "Include consulting engagements, shifts, and temporary contracts in experience when they involve real employers.",
                "Use independent_work for entrepreneurship, freelance contracts, special assignments, or rotations without a formal employer.",
                "Allow achievements, volunteering, affiliations, and interests to be lists or null depending on the document.",
                "Prioritize accuracy over completeness: null is better than assumed data.",
            ],
            mandatory_fields=[
                'full_name',  # Identificador crítico
                'email',      # Contacto crítico
            ],
            minimum_mandatory_score=70.0
        )

    def get_document_description(self) -> str:
        """Get description for CV documents."""
        return "Professional resumes and CVs across all industries (technical, medical, legal, administrative, etc.)."

    def get_field_descriptions(self) -> Dict[str, str]:
        """Get detailed field descriptions for universal CV extraction."""
        return {
            'full_name': (
                "Full name exactly as written in the CV. Preserve order, capitalization, and accents."
            ),
            'email': (
                "Primary email address shown in the CV. If multiple exist, capture the most relevant or join them with commas."
            ),
            'phone': (
                "Phone number exactly as written (including +, parentheses, dashes, or spaces). If several appear, include the most prominent ones."
            ),
            'location': (
                "City, country, or explicit label ('Remote') stated as residence. Do not infer."
            ),
            'social_links': (
                "List of professional URLs with type classification (linkedin, portfolio, github, twitter, other). Detect links in plain text, icons, or hyperlinks."
            ),
            'professional_summary': (
                "Introductory professional summary (paragraph or bullets). Use null if absent."
            ),
            'experience': (
                "Employment with real employers (full-time, internships, locums, temporary roles). Objects must include company, role, start_date, end_date or 'Present', optional location, and description."
            ),
            'independent_work': (
                "Initiatives without a direct employer: entrepreneurship, freelance consulting, private practice, independent research. Structure matches experience."
            ),
            'education': (
                "Formal education. Each entry must include institution, degree, start_date, end_date or 'Present'. If only years appear, use 01-YYYY – 12-YYYY. If only one date is present, use the that year for both start and end date."
            ),
            'languages': (
                "Languages with proficiency in the format 'English - C1'. Use English language names and common levels (A1-C2, Native, Fluent, Intermediate, Basic). Return null when absent."
            ),
            'document_language': (
                "Predominant language of the CV expressed in English (\"Spanish\", \"English\", \"French\", etc.)."
            ),
            'certifications': (
                "Courses, licenses, or certifications with full name and issuing body when provided. List or null."
            ),
            'generic_skills': (
                "Skills listed in the CV—technical, soft, or industry-specific. Return as a list of strings."
            ),
            'keywords': (
                "Array of skill keywords and related terms based on O*NET taxonomy. For each skill in generic_skills, "
                "provide: (1) Alternative names/synonyms for that skill, and (2) The general O*NET skill category it belongs to. "
                "Use ONLY these O*NET categories: Active Learning, Active Listening, Complex Problem Solving, Coordination, "
                "Critical Thinking, Equipment Maintenance, Equipment Selection, Installation, Instructing, Judgment and Decision Making, "
                "Learning Strategies, Management of Financial Resources, Management of Material Resources, Management of Personnel Resources, "
                "Mathematics, Monitoring, Negotiation, Operation and Control, Operations Analysis, Operations Monitoring, Persuasion, "
                "Programming, Quality Control Analysis, Reading Comprehension, Repairing, Science, Service Orientation, Social Perceptiveness, "
                "Speaking, Systems Analysis, Systems Evaluation, Technology Design, Time Management, Troubleshooting, Writing. "
                "Return as list of strings combining alternative names and O*NET categories (e.g., ['Python programming', 'Coding', 'Programming', 'JavaScript development', 'Project coordination', 'Coordination', 'Team management', 'Management of Personnel Resources']). "
                "Return null if generic_skills is empty."
            ),
            'achievements': (
                "Recognitions, awards, measurable outcomes, or notable publications. Provide as exact-text strings."
            ),
            'volunteering': (
                "Volunteer or community service roles. Objects with organization, role, start_date, end_date/Present, and optional description."
            ),
            'professional_affiliations': (
                "Memberships in professional bodies, associations, medical boards, bar associations, etc. List of strings."
            ),
            'interests': (
                "Professional interests, extracurricular activities, or relevant groups. List of strings."
            ),
        }

    def get_extraction_examples(self) -> str:
        """Get CV-specific extraction examples."""
        return """QUICK RULES:
- Return every field even if the value is null or [].
- Copy CV text exactly (case, accents, symbols).
- Use MM-YYYY for dates; when only the year exists, output 01-YYYY for starts and 12-YYYY for ends. Accept the literal wording used for active roles (e.g., "Present").
- Look for emails, phone numbers, and links throughout the entire document.
- If a section is missing (e.g., volunteering), return null without inventing data.

EXPECTED DOCUMENT STRUCTURE:
{
  "full_name": "...",
  "email": "...",
  "phone": "...",
  "location": "...",
  "social_links": [{"type": "...", "url": "..."}] or null,
  "professional_summary": "...",
  "experience": [
    {"company": "...", "role": "...", "start_date": "MM-YYYY", "end_date": "MM-YYYY or Present", "location": "...", "description": "..."}
  ] or null,
  "independent_work": [
    {"company": "...", "role": "...", "start_date": "...", "end_date": "...", "location": "...", "description": "..."}
  ] or null,
  "education": [
    {"institution": "...", "degree": "...", "dates": "MM-YYYY – MM-YYYY"}
  ] or null,
  "languages": ["English - C1", "Spanish - Native"] or null,
  "document_language": "English",
  "certifications": ["Certification ..."] or null,
  "generic_skills": ["Project Management", "SAP"] or null,
  "keywords": ["Project coordination", "Coordination", "Team management", "Management of Personnel Resources", "SAP software", "Technology Design"] or null,
  "achievements": ["National Sales Award 2023"] or null,
  "volunteering": [
    {"organization": "...", "role": "...", "start_date": "...", "end_date": "...", "description": "..."}
  ] or null,
  "professional_affiliations": ["American Marketing Association"] or null,
  "interests": ["STEM Mentorship"] or null,
}

SAMPLE OUTPUT (CONDENSED):
{
  "is_requested_document_type": true,
  "document_type_explanation": null,
  "documents": [
    {
      "full_name": "MARIA GONZALEZ",
      "email": "maria.gonzalez@example.com",
      "phone": "+34 600 123 456",
      "location": "Madrid, Spain",
      "social_links": [{"type": "linkedin", "url": "https://linkedin.com/in/mariagonzalez"}],
      "professional_summary": "Operations leader with 10 years managing large banking transformation programs.",
      "experience": [
        {
          "company": "Telefónica",
          "role": "Project Manager",
          "start_date": "01-2018",
          "end_date": "Present",
          "location": "Madrid",
          "description": "Leads digital transformation initiatives with cross-functional teams of 20+ people."
        },
        {
          "company": "BBVA",
          "role": "Operations Manager",
          "start_date": "02-2014",
          "end_date": "12-2017",
          "location": "Madrid",
          "description": "Implemented process improvements that reduced branch service times by 15%."
        }
      ],
      "independent_work": null,
      "education": [
        {"institution": "IE Business School", "degree": "MBA", "dates": "01-2012 – 12-2013"},
        {"institution": "Complutense University of Madrid", "degree": "B.A. in Business Administration", "dates": "01-2006 – 12-2011"}
      ],
      "languages": ["Spanish - Native", "English - C1"],
      "document_language": "Spanish",
      "certifications": ["Scrum Master Certified - Scrum Alliance (2019)"],
      "generic_skills": ["Project Management", "Team Leadership", "SAP"],
      "keywords": ["Project coordination", "Coordination", "Project planning", "Team management", "Management of Personnel Resources", "Leadership", "SAP software", "Technology Design", "ERP systems"],
      "achievements": ["Named 'Top Operations Leader' 2022"],
      "volunteering": [
        {
          "organization": "Madrid Food Bank",
          "role": "Volunteer Coordinator",
          "start_date": "03-2020",
          "end_date": "Present",
          "description": null
        }
      ],
      "professional_affiliations": ["Madrid Association of Economists"],
      "interests": ["Mentoring early-stage entrepreneurs"],
    }
  ]
}
"""

    def validate_and_clean_data(self, raw_extraction: Dict[str, Any]) -> tuple:
        """Validate and clean CV data using CVValidator."""
        extraction_data = raw_extraction.copy()
        return CVValidator.validate(extraction_data)
