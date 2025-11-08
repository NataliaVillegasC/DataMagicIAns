"""Prompt management service for document data extraction.

This module provides the PromptManager class that handles the creation,
validation, and management of prompts used for AI-powered document data
extraction. It integrates with document configuration classes to provide
specialized prompts for different document types.

The module is designed to be extensible, allowing for easy addition of
new document types and their corresponding prompt configurations.
"""

from typing import Dict, Any

# Importar desde el paquete de dominio para reutilizar configuraciones existentes
from ...domain.models.document_config import DocumentConfig, ColombianIDConfig

class PromptManager:
    """Manages prompts and validation for document data extraction.

    The PromptManager class serves as a central hub for generating, managing,
    and validating prompts used in AI-powered document data extraction. It
    works with document configuration objects to provide context-specific
    prompts and validation rules.

    This class handles the composition of system prompts with extraction
    prompts, manages additional context, and provides validation capabilities
    for AI model responses.

    Attributes:
        document_config (DocumentConfig): Configuration object for the document type.
        system_prompt (str): The system-level prompt for the AI model.
        extraction_prompt (str): The extraction-specific prompt.

    Examples:
        Basic usage with default Colombian ID configuration:

            prompt_manager = PromptManager()
            full_prompt = prompt_manager.get_full_prompt()

        Using with custom document configuration:

            from models.document_config import CustomIDConfig
            config = CustomIDConfig()
            prompt_manager = PromptManager(config)
            message = prompt_manager.create_extraction_message("Additional context")
    """
    def __init__(self, document_config: DocumentConfig = None):
        """Initialize the PromptManager with a document configuration.

        Args:
            document_config (DocumentConfig, optional): Configuration object that
                defines the document type and its associated prompts. If None,
                defaults to ColombianIDConfig.

        Examples:
            Initialize with default configuration:

                prompt_manager = PromptManager()

            Initialize with custom configuration:

                custom_config = CustomDocumentConfig()
                prompt_manager = PromptManager(custom_config)
        """
        self.document_config = document_config or ColombianIDConfig()
        self.system_prompt = self.document_config.get_system_prompt()
        self.extraction_prompt = self.document_config.get_extraction_prompt()

    def get_full_prompt(self) -> str:
        """Get the complete prompt combining system and extraction prompts.

        Concatenates the system prompt with the extraction prompt, separated
        by double newlines to create a properly formatted prompt for the AI model.

        Returns:
            str: The complete prompt string ready for use with AI models.

        Examples:
            Get the full prompt:

                prompt_manager = PromptManager()
                full_prompt = prompt_manager.get_full_prompt()
                print(len(full_prompt))  # Shows total prompt length
        """
        return f"{self.system_prompt}\n\n{self.extraction_prompt}"

    def create_extraction_message(self, additional_context: str = "") -> str:
        """Create a complete extraction message with optional additional context.

        Builds upon the full prompt by optionally appending additional context
        information. This is useful when you have specific instructions or
        context that should be included for a particular extraction task.

        Args:
            additional_context (str, optional): Extra context or instructions
                to append to the base prompt. Defaults to empty string.

        Returns:
            str: Complete extraction message including base prompt and any
                additional context.

        Examples:
            Create message without additional context:

                prompt_manager = PromptManager()
                message = prompt_manager.create_extraction_message()

            Create message with specific context:

                context = "This document may have water damage affecting text clarity"
                message = prompt_manager.create_extraction_message(context)
        """
        prompt = self.get_full_prompt()
        if additional_context:
            prompt += f"\n\nCONTEXTO ADICIONAL:\n{additional_context}"
        return prompt

    def validate_prompt_response(self, response: Dict[str, Any]) -> bool:
        """Validate an AI model response against the expected structure.

        Uses the document configuration's validation rules to ensure that
        the AI model's response contains all required fields and follows
        the expected structure for the specific document type.

        Args:
            response (Dict[str, Any]): The parsed response from the AI model
                containing extracted data fields.

        Returns:
            bool: True if the response structure is valid according to the
                document configuration, False otherwise.

        Examples:
            Validate a model response:

                prompt_manager = PromptManager()
                response = {
                    "document_number": "12345678",
                    "first_name": "Juan",
                    "confidence_scores": {"document_number": 95}
                }
                is_valid = prompt_manager.validate_prompt_response(response)
        """
        return self.document_config.validate_response_structure(response)

    def get_field_weights(self) -> Dict[str, float]:
        """Get the field weights for confidence score calculations.

        Returns a copy of the field weights defined in the document configuration.
        These weights are used to calculate weighted confidence scores for different
        fields during the extraction process.

        Returns:
            Dict[str, float]: A dictionary mapping field names to their respective
                weights. Returns a copy to prevent external modification.

        Examples:
            Get field weights for confidence calculations:

                prompt_manager = PromptManager()
                weights = prompt_manager.get_field_weights()
                print(weights)  # {'document_number': 0.3, 'first_name': 0.2, ...}
        """
        return self.document_config.field_weights.copy()

    def get_document_type(self) -> str:
        """Get the document type identifier from the configuration.

        Returns the string identifier for the document type being processed.
        This can be useful for logging, debugging, or conditional processing
        based on document type.

        Returns:
            str: The document type identifier (e.g., "colombian_id", "passport").

        Examples:
            Get the current document type:

                prompt_manager = PromptManager()
                doc_type = prompt_manager.get_document_type()
                print(f"Processing {doc_type} documents")
        """
        return self.document_config.document_type