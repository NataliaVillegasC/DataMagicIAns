"""Image processing utilities for ID extraction.

This module provides comprehensive image preprocessing capabilities including
format conversion, resizing, enhancement, and quality assessment. The ImageProcessor
class handles various image formats and optimizes them for OCR and text extraction.

Typical usage example:
    processor = ImageProcessor()
    enhanced_image = processor.preprocess_image(raw_image)
    quality_score = processor.estimate_image_quality(enhanced_image)
"""

from PIL import Image, ImageEnhance, ImageFilter
from typing import Tuple, Optional
import io

from ...infrastructure.config.settings import get_settings
from ...domain.exceptions import ImageQualityError

class ImageProcessor:
    """Handles image preprocessing and quality assessment for ID documents.

    This class provides methods to enhance image quality, convert between formats,
    resize images appropriately, and assess image quality for optimal OCR results.
    All processing is configured through application settings.

    Attributes:
        settings: Application configuration settings for image processing.

    Example:
        Basic image processing workflow:

        >>> processor = ImageProcessor()
        >>> processed_image = processor.preprocess_image(image)
        >>> quality = processor.estimate_image_quality(processed_image)
        >>> if quality > 70:
        ...     print("Image quality is good for OCR")
    """
    def __init__(self):
        """Initialize the ImageProcessor with application settings.

        Loads configuration settings that control image processing parameters
        such as maximum dimensions, supported formats, and enhancement levels.
        """
        self.settings = get_settings()

    def preprocess_image(self, image: Image.Image) -> Image.Image:
        """Preprocess an image for optimal OCR and text extraction.

        Performs a complete preprocessing pipeline including format conversion,
        resizing, and various enhancements to improve text recognition accuracy.

        Args:
            image: PIL Image object to be processed.

        Returns:
            Processed PIL Image object optimized for text extraction.

        Raises:
            ImageQualityError: If image processing fails due to corrupted data,
                unsupported format, or processing errors.

        Example:
            >>> processor = ImageProcessor()
            >>> processed = processor.preprocess_image(raw_image)
            >>> # Image is now optimized for OCR
        """
        try:
            if image.mode != 'RGB':
                image = self._convert_to_rgb(image)

            image = self._resize_if_needed(image)

            image = self._enhance_image(image)

            return image

        except Exception as e:
            raise ImageQualityError(
                f"Error al procesar la imagen: {str(e)}",
                {'original_error': str(e)}
            )

    def _convert_to_rgb(self, image: Image.Image) -> Image.Image:
        """Convert image to RGB format for consistent processing.

        Handles various input formats (RGBA, L, P) and converts them to RGB
        with appropriate background handling for transparency.

        Args:
            image: PIL Image object in any format.

        Returns:
            PIL Image object in RGB format.

        Note:
            RGBA images are composited onto a white background to preserve
            visual appearance while removing transparency.
        """
        if image.mode == 'RGBA':
            background = Image.new('RGB', image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[3] if len(image.split()) == 4 else None)
            return background
        elif image.mode == 'L':
            return image.convert('RGB')
        elif image.mode == 'P':
            return image.convert('RGB')
        else:
            return image.convert('RGB')

    def _resize_if_needed(self, image: Image.Image) -> Image.Image:
        """Resize image if it exceeds maximum dimension settings.

        Proportionally resizes images that are too large while maintaining
        aspect ratio. Uses high-quality Lanczos resampling for best results.

        Args:
            image: PIL Image object to potentially resize.

        Returns:
            PIL Image object resized if necessary, original if within limits.

        Note:
            Maximum dimensions are controlled by IMAGE_MAX_DIMENSION setting.
            The longer dimension is scaled to the maximum while preserving ratio.
        """
        width, height = image.size
        max_dim = self.settings.IMAGE_MAX_DIMENSION

        if width > max_dim or height > max_dim:
            if width > height:
                new_width = max_dim
                new_height = int((height / width) * max_dim)
            else:
                new_height = max_dim
                new_width = int((width / height) * max_dim)

            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

        return image

    def _enhance_image(self, image: Image.Image) -> Image.Image:
        """Apply various enhancements to improve image quality for OCR.

        Applies a series of enhancements including sharpening, contrast adjustment,
        brightness optimization, and additional sharpness enhancement.

        Args:
            image: PIL Image object to enhance.

        Returns:
            Enhanced PIL Image object with improved clarity and contrast.

        Note:
            Enhancement factors are optimized for ID document processing:
            - Contrast: 1.2x enhancement
            - Brightness: 1.1x enhancement
            - Sharpness: 1.3x enhancement
        """
        image = image.filter(ImageFilter.SHARPEN)

        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.2)

        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(1.1)

        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(1.3)

        return image

    def estimate_image_quality(self, image: Image.Image) -> float:
        """Estimate the quality score of an image for OCR processing.

        Calculates a comprehensive quality score based on resolution, brightness,
        and sharpness characteristics. Higher scores indicate better suitability
        for text extraction.

        Args:
            image: PIL Image object to assess.

        Returns:
            Quality score as float between 0-100, where:
            - 0-30: Poor quality, OCR may fail
            - 30-60: Fair quality, OCR may have issues
            - 60-80: Good quality, suitable for OCR
            - 80-100: Excellent quality, optimal for OCR

        Example:
            >>> processor = ImageProcessor()
            >>> quality = processor.estimate_image_quality(image)
            >>> if quality > 60:
            ...     print(f"Good quality image: {quality:.1f}")

        Note:
            Quality calculation weights:
            - Resolution: 30% (based on 1920x1080 reference)
            - Brightness: 30% (optimal around 128 gray level)
            - Sharpness: 40% (edge detection based)
        """
        try:
            width, height = image.size
            resolution_score = min(100, (width * height) / (1920 * 1080) * 100)

            gray_image = image.convert('L')

            pixels = list(gray_image.getdata())
            mean_brightness = sum(pixels) / len(pixels)
            brightness_score = 100 - abs(mean_brightness - 128) / 128 * 100

            edges = gray_image.filter(ImageFilter.FIND_EDGES)
            edge_pixels = list(edges.getdata())
            sharpness_score = min(100, sum(p > 30 for p in edge_pixels) / len(edge_pixels) * 200)

            quality_score = (
                resolution_score * 0.3 +
                brightness_score * 0.3 +
                sharpness_score * 0.4
            )

            return min(100, max(0, quality_score))

        except Exception:
            return 50.0

