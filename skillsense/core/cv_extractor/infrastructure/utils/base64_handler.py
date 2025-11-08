"""Base64 encoding/decoding and image validation utilities.

This module provides comprehensive base64 handling capabilities specifically
designed for processing image data. It includes validation, format detection,
size checking, and secure decoding with proper error handling.

Typical usage example:
    handler = Base64Handler()
    image, format = handler.process_base64_image(base64_string)
    is_valid, error, img = handler.validate_image_bytes(image_bytes)
"""

import base64
import io
from typing import Tuple, Optional
from PIL import Image
import re
import io as _io

try:
    import fitz  # PyMuPDF
except Exception:  # pragma: no cover
    fitz = None

from ...domain.exceptions import InvalidBase64Error, InvalidImageError
from ..config.settings import get_settings

class Base64Handler:
    """Handles base64 encoding/decoding and image validation for ID processing.

    This class provides secure and robust methods for processing base64-encoded
    image data, including data URI handling, format validation, size checking,
    and comprehensive error handling.

    Attributes:
        settings: Application configuration settings for validation parameters.

    Example:
        Complete base64 image processing workflow:

        >>> handler = Base64Handler()
        >>> # Process a complete base64 image
        >>> image, format = handler.process_base64_image(base64_data)
        >>>
        >>> # Or validate raw bytes
        >>> is_valid, error, img = handler.validate_image_bytes(raw_bytes)
        >>> if is_valid:
        ...     print(f"Valid {format} image")
    """
    def __init__(self):
        """Initialize the Base64Handler with application settings.

        Loads configuration settings that control image validation parameters
        such as supported formats, size limits, and dimension requirements.
        """
        self.settings = get_settings()

    def decode_base64(self, base64_string: str) -> bytes:
        """Decode a base64 string to bytes with comprehensive validation.

        Handles data URIs, cleans the input string, adds proper padding,
        and performs secure base64 decoding with validation.

        Args:
            base64_string: Base64-encoded string, optionally with data URI prefix.

        Returns:
            Decoded bytes from the base64 string.

        Raises:
            InvalidBase64Error: If the input string is empty, invalid, or
                cannot be decoded properly.

        Example:
            >>> handler = Base64Handler()
            >>> # Handle data URI
            >>> bytes_data = handler.decode_base64('data:image/jpeg;base64,/9j/4AA...')
            >>> # Handle raw base64
            >>> bytes_data = handler.decode_base64('/9j/4AAQSkZJRgABA...')
        """
        try:
            cleaned_base64 = self._clean_base64_string(base64_string)

            missing_padding = len(cleaned_base64) % 4
            if missing_padding:
                cleaned_base64 += '=' * (4 - missing_padding)

            decoded_bytes = base64.b64decode(cleaned_base64, validate=True)

            if not decoded_bytes:
                raise InvalidBase64Error("El base64 decodificado está vacío")

            return decoded_bytes

        except base64.binascii.Error as e:
            raise InvalidBase64Error(
                f"Error al decodificar base64: {str(e)}",
                {'original_error': str(e)}
            )
        except Exception as e:
            raise InvalidBase64Error(
                f"Error inesperado al procesar base64: {str(e)}",
                {'original_error': str(e)}
            )

    def _clean_base64_string(self, base64_string: str) -> str:
        """Clean and normalize a base64 string for safe decoding.

        Removes data URI prefixes, strips whitespace, removes invalid characters,
        and validates the resulting string is not empty.

        Args:
            base64_string: Raw base64 string to clean.

        Returns:
            Cleaned base64 string containing only valid base64 characters.

        Raises:
            InvalidBase64Error: If input is empty or cleaning results in
                an empty string.

        Note:
            Supports data URIs in format: 'data:image/type;base64,data'
            Removes all characters except A-Z, a-z, 0-9, +, /, =
        """
        if not base64_string:
            raise InvalidBase64Error("El string base64 está vacío")

        cleaned = base64_string.strip()

        if 'data:' in cleaned and ';base64,' in cleaned:
            cleaned = cleaned.split(';base64,')[1]

        cleaned = re.sub(r'[^A-Za-z0-9+/=]', '', cleaned)

        if not cleaned:
            raise InvalidBase64Error("El string base64 limpio está vacío")

        return cleaned

    def validate_image_bytes(self, image_bytes: bytes) -> Tuple[bool, Optional[str], Optional[Image.Image]]:
        """Validate image bytes for format, size, and dimension requirements.

        Performs comprehensive validation including format checking, dimension
        validation, and file size limits according to application settings.

        Args:
            image_bytes: Raw image data as bytes.

        Returns:
            Tuple containing:
            - bool: True if image is valid, False otherwise
            - Optional[str]: Error message if invalid, None if valid
            - Optional[Image.Image]: PIL Image object if valid, None if invalid

        Example:
            >>> handler = Base64Handler()
            >>> is_valid, error, image = handler.validate_image_bytes(data)
            >>> if is_valid:
            ...     print(f"Valid image: {image.size}")
            ... else:
            ...     print(f"Invalid image: {error}")

        Note:
            Validation checks:
            - Format must be in SUPPORTED_IMAGE_FORMATS
            - Dimensions must meet MIN_IMAGE_WIDTH/HEIGHT requirements
            - File size must not exceed MAX_IMAGE_SIZE_MB limit
        """
        try:
            image = Image.open(io.BytesIO(image_bytes))

            image_format = image.format.lower() if image.format else None

            if image_format not in self.settings.SUPPORTED_IMAGE_FORMATS:
                return False, f"Formato de imagen no soportado: {image_format}", None

            width, height = image.size
            if width < self.settings.MIN_IMAGE_WIDTH or height < self.settings.MIN_IMAGE_HEIGHT:
                return False, f"Imagen muy pequeña: {width}x{height} (mínimo: {self.settings.MIN_IMAGE_WIDTH}x{self.settings.MIN_IMAGE_HEIGHT})", None

            file_size_mb = len(image_bytes) / (1024 * 1024)
            if file_size_mb > self.settings.MAX_IMAGE_SIZE_MB:
                return False, f"Imagen muy grande: {file_size_mb:.2f}MB (máximo: {self.settings.MAX_IMAGE_SIZE_MB}MB)", None

            return True, None, image

        except Exception as e:
            return False, f"Error al validar imagen: {str(e)}", None


    def process_base64_image(self, base64_string: str) -> Tuple[Image.Image, str]:
        """Complete pipeline for processing base64 image data.

        Combines base64 decoding and image validation into a single operation
        for convenient processing of base64 image data.

        Args:
            base64_string: Base64-encoded image data, optionally with data URI.

        Returns:
            Tuple containing:
            - Image.Image: Valid PIL Image object ready for processing
            - str: Image format (e.g., 'jpeg', 'png') in lowercase

        Raises:
            InvalidBase64Error: If base64 decoding fails.
            InvalidImageError: If image validation fails (format, size, dimensions).

        Example:
            >>> handler = Base64Handler()
            >>> try:
            ...     image, format = handler.process_base64_image(base64_data)
            ...     print(f"Successfully loaded {format} image: {image.size}")
            ... except (InvalidBase64Error, InvalidImageError) as e:
            ...     print(f"Processing failed: {e}")
        """
        image_bytes = self.decode_base64(base64_string)

        # Detect PDF by header and render first page to image
        if image_bytes[:4] == b'%PDF':
            if fitz is None:
                raise InvalidImageError("Se recibió un PDF pero PyMuPDF no está disponible para convertirlo a imagen")
            try:
                doc = fitz.open(stream=image_bytes, filetype="pdf")
                if doc.page_count == 0:
                    raise InvalidImageError("El PDF no contiene páginas")
                page = doc.load_page(0)
                # Render with a moderate zoom for readability
                zoom = 2.0
                mat = fitz.Matrix(zoom, zoom)
                pix = page.get_pixmap(matrix=mat, alpha=False)
                mode = "RGB" if not pix.alpha else "RGBA"
                pil_image = Image.frombytes(mode, [pix.width, pix.height], pix.samples)
                # For consistency, convert to RGB
                pil_image = pil_image.convert('RGB')
                return pil_image, 'png'
            except InvalidImageError:
                raise
            except Exception as e:
                raise InvalidImageError(f"Error al convertir PDF a imagen: {str(e)}")

        # Otherwise, process as a regular image
        is_valid, error_message, image = self.validate_image_bytes(image_bytes)

        if not is_valid:
            raise InvalidImageError(error_message)

        return image, image.format.lower() if image.format else 'jpeg'