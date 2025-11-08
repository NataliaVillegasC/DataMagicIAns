"""Settings module for ID Extractor configuration.

This module manages all configuration settings for the ID Extractor library,
including API keys, model parameters, image processing settings, and system
configuration. Settings are loaded from environment variables with sensible
defaults.

The module supports loading configuration from a .env file for local development
and provides validation to ensure all settings are within acceptable ranges.

Example:
    Basic usage to get configuration::

        from src.config import get_settings

        settings = get_settings()
        print(f"Using model: {settings.GEMINI_MODEL}")
        print(f"Max image size: {settings.MAX_IMAGE_SIZE_MB} MB")

Environment Variables:
    GEMINI_API_KEY: API key for Google Gemini service (required)
    GEMINI_MODEL: Model name to use (default: 'gemini-2.5-flash')
    GEMINI_TEMPERATURE: Temperature for text generation (0-2, default: 0.1)
    GEMINI_MAX_OUTPUT_TOKENS: Maximum output tokens (default: 8192, max for gemini-2.5-flash: 8192)
    MAX_IMAGE_SIZE_MB: Maximum allowed image size in MB (default: 10)
    MIN_FIDELITY_SCORE: Minimum confidence score for extraction (0-100, default: 95)

Todo:
    * Add support for configuration profiles (dev, staging, prod)
    * Implement configuration hot-reloading
    * Add configuration validation schema using pydantic
"""

import os
from pathlib import Path
from functools import lru_cache
from dotenv import load_dotenv

class Settings:
    """Configuration settings for the ID Extractor system.

    This class manages all configuration parameters required by the ID Extractor
    library. It loads settings from environment variables, provides defaults,
    and validates all configuration values to ensure they are within acceptable
    ranges.

    Settings are loaded once and cached for performance. Use the get_settings()
    function to access the singleton instance.

    Attributes:
        GEMINI_API_KEY (str): API key for Google Gemini service.
        GEMINI_MODEL (str): Name of the Gemini model to use.
        GEMINI_TEMPERATURE (float): Temperature parameter for text generation.
        GEMINI_MAX_OUTPUT_TOKENS (int): Maximum tokens in model output.
        GEMINI_TOP_P (float): Top-p sampling parameter.
        GEMINI_TOP_K (int): Top-k sampling parameter.
        MAX_IMAGE_SIZE_MB (int): Maximum allowed image size in megabytes.
        MIN_IMAGE_WIDTH (int): Minimum required image width in pixels.
        MIN_IMAGE_HEIGHT (int): Minimum required image height in pixels.
        IMAGE_QUALITY (int): JPEG compression quality (1-100).
        IMAGE_MAX_DIMENSION (int): Maximum dimension for image resizing.
        SUPPORTED_IMAGE_FORMATS (tuple): Tuple of supported image formats.
        PROCESSING_TIMEOUT (int): Timeout for processing operations in seconds.
        MAX_RETRIES (int): Maximum number of retry attempts.
        RETRY_DELAY (float): Delay between retry attempts in seconds.
        MIN_FIDELITY_SCORE (float): Minimum confidence score for extraction.
        DEBUG (bool): Enable debug mode.
        LOG_LEVEL (str): Logging level (DEBUG, INFO, WARNING, ERROR).

    Raises:
        ValueError: If required settings are missing or invalid.
    """

    def __init__(self):
        """Initialize settings by loading and validating configuration.

        Loads environment variables from .env file if it exists, then reads
        all configuration parameters and validates them.
        """
        self._load_environment()
        self._validate_settings()

    def _load_environment(self):
        """Load configuration from environment variables.

        Attempts to load a .env file from the project root directory if it
        exists. Then reads all configuration values from environment variables,
        applying default values where appropriate.

        The method sets all instance attributes based on environment variables
        with type conversions and default values.
        """
        # Try multiple locations for .env file
        # 1. skillsense/ (4 levels up from settings.py)
        # 2. core/ (3 levels up)
        # 3. cv_extractor/ (2 levels up)
        base_dir = Path(__file__).resolve().parents[4]  # skillsense/
        env_path = base_dir / '.env'

        if not env_path.exists():
            # Fallback 1: core/ directory
            fallback_path = Path(__file__).resolve().parents[3] / '.env'
            if fallback_path.exists():
                env_path = fallback_path
            else:
                # Fallback 2: cv_extractor/ directory
                fallback_path = Path(__file__).resolve().parents[2] / '.env'
                if fallback_path.exists():
                    env_path = fallback_path

        if env_path.exists():
            load_dotenv(env_path)

        self.GEMINI_API_KEY: str = os.getenv('GEMINI_API_KEY', '')

        # Modelo por defecto: gemini-1.5-pro (económico)
        # El extractor usa selección híbrida: Pro para 1-3 páginas, Flash para 4+ páginas
        self.GEMINI_MODEL: str = os.getenv('GEMINI_MODEL', 'gemini-2.5-pro')
        self.GEMINI_TEMPERATURE: float = float(os.getenv('GEMINI_TEMPERATURE', '0.1'))
        # MAX ABSOLUTO de tokens de salida para Gemini (no se puede aumentar más)
        self.GEMINI_MAX_OUTPUT_TOKENS: int = int(os.getenv('GEMINI_MAX_OUTPUT_TOKENS', '8192'))
        self.GEMINI_TOP_P: float = float(os.getenv('GEMINI_TOP_P', '0.95'))
        self.GEMINI_TOP_K: int = int(os.getenv('GEMINI_TOP_K', '40'))

        self.MAX_IMAGE_SIZE_MB: int = int(os.getenv('MAX_IMAGE_SIZE_MB', '10'))
        self.MIN_IMAGE_WIDTH: int = int(os.getenv('MIN_IMAGE_WIDTH', '200'))
        self.MIN_IMAGE_HEIGHT: int = int(os.getenv('MIN_IMAGE_HEIGHT', '200'))
        self.IMAGE_QUALITY: int = int(os.getenv('IMAGE_QUALITY', '95'))
        self.IMAGE_MAX_DIMENSION: int = int(os.getenv('IMAGE_MAX_DIMENSION', '2048'))

        self.SUPPORTED_IMAGE_FORMATS: tuple = tuple(
            os.getenv('SUPPORTED_IMAGE_FORMATS', 'jpg,jpeg,png,webp').lower().split(',')
        )

        self.PROCESSING_TIMEOUT: int = int(os.getenv('PROCESSING_TIMEOUT', '30'))
        self.MAX_RETRIES: int = int(os.getenv('MAX_RETRIES', '3'))
        self.RETRY_DELAY: float = float(os.getenv('RETRY_DELAY', '1.0'))

        self.MIN_FIDELITY_SCORE: float = float(os.getenv('MIN_FIDELITY_SCORE', '95.0'))

        self.DEBUG: bool = os.getenv('DEBUG', 'False').lower() in ('true', '1', 'yes')
        self.LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')

    def _validate_settings(self):
        """Validate all configuration settings.

        Checks that all required settings are present and that all values
        are within acceptable ranges. Collects all validation errors and
        raises a single ValueError with all issues if any are found.

        Raises:
            ValueError: If any configuration values are invalid or missing
                required settings. The error message includes all validation
                failures.
        """
        errors = []

        if not self.GEMINI_API_KEY:
            errors.append("GEMINI_API_KEY is required")

        if self.GEMINI_TEMPERATURE < 0 or self.GEMINI_TEMPERATURE > 2:
            errors.append("GEMINI_TEMPERATURE must be between 0 and 2")

        if self.GEMINI_TOP_P < 0 or self.GEMINI_TOP_P > 1:
            errors.append("GEMINI_TOP_P must be between 0 and 1")

        if self.MAX_IMAGE_SIZE_MB <= 0:
            errors.append("MAX_IMAGE_SIZE_MB must be positive")

        if self.MIN_IMAGE_WIDTH <= 0 or self.MIN_IMAGE_HEIGHT <= 0:
            errors.append("Image dimensions must be positive")

        if self.MIN_FIDELITY_SCORE < 0 or self.MIN_FIDELITY_SCORE > 100:
            errors.append("MIN_FIDELITY_SCORE must be between 0 and 100")

        if errors:
            raise ValueError(f"Configuration errors: {'; '.join(errors)}")

def clear_settings_cache():
    """Clear the settings cache to force reload on next access."""
    get_settings.cache_clear()
    print("Settings cache cleared")

@lru_cache()
def get_settings() -> Settings:
    """Get the singleton Settings instance.

    Returns a cached instance of the Settings class. The settings are loaded
    and validated only once on first access, then the same instance is returned
    for all subsequent calls.

    This function uses LRU cache to ensure settings are loaded only once,
    improving performance and ensuring consistency across the application.

    Returns:
        Settings: The singleton settings instance containing all configuration.

    Raises:
        ValueError: If configuration validation fails on first access.

    Example:
        >>> settings = get_settings()
        >>> api_key = settings.GEMINI_API_KEY
        >>> print(f"Using model: {settings.GEMINI_MODEL}")
    """
    return Settings()