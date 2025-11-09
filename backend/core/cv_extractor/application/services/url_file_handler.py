"""URL file download and conversion to base64.

Este módulo proporciona funcionalidades para descargar archivos desde URLs
(como URLs firmadas de GCS o S3) y convertirlos a base64 para procesamiento.
Soporta imágenes y PDFs.
"""

import base64
import io
import zipfile
import requests
from typing import Tuple, Optional
from pathlib import Path
from PIL import Image

from ...domain.exceptions import InvalidImageError, ProcessingError
from ...infrastructure.logging.logger import get_logger

class URLFileHandler:
    """Maneja descarga de archivos desde URLs y conversión a base64.
    
    Esta clase proporciona métodos para descargar archivos desde URLs firmadas
    (GCS, S3, etc.) y convertirlos a formato base64 para su procesamiento
    posterior. Soporta múltiples formatos de imagen y PDFs.
    
    Attributes:
        logger: Logger para tracking de operaciones.
        timeout: Timeout para requests HTTP en segundos.
        max_file_size: Tamaño máximo permitido en MB.
        
    Examples:
        Descargar y convertir imagen desde URL:
        
            handler = URLFileHandler()
            base64_data, file_type = handler.download_and_encode(
                "https://storage.googleapis.com/bucket/file.jpg?signature=..."
            )
            
        Con configuración personalizada:
        
            handler = URLFileHandler(timeout=30, max_file_size_mb=20)
            base64_data, file_type = handler.download_and_encode(url)
    """
    
    SUPPORTED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif'}
    SUPPORTED_DOCUMENT_EXTENSIONS = {'.pdf', '.docx'}
    SUPPORTED_EXTENSIONS = SUPPORTED_IMAGE_EXTENSIONS | SUPPORTED_DOCUMENT_EXTENSIONS
    
    def __init__(self, timeout: int = 30, max_file_size_mb: float = 50.0):
        """Inicializa el URLFileHandler.
        
        Args:
            timeout: Timeout para requests HTTP en segundos. Defaults to 30.
            max_file_size_mb: Tamaño máximo de archivo en MB. Defaults to 50.0.
        """
        self.logger = get_logger(__name__)
        self.timeout = timeout
        self.max_file_size_bytes = int(max_file_size_mb * 1024 * 1024)
        
    def download_and_encode(self, url: str) -> Tuple[str, str]:
        """Descarga un archivo desde URL y lo convierte a base64.
        
        Args:
            url: URL firmada del archivo (GCS, S3, etc.)
            
        Returns:
            Tuple con:
                - str: Contenido del archivo en base64
                - str: Tipo de archivo detectado ('image', 'pdf' o 'docx')
                
        Raises:
            ProcessingError: Si la descarga falla o el archivo no es válido.
            InvalidImageError: Si el tipo de archivo no está soportado.
            
        Examples:
            >>> handler = URLFileHandler()
            >>> b64, file_type = handler.download_and_encode("https://...")
            >>> print(f"Downloaded {file_type}: {len(b64)} chars")
        """
        try:
            self.logger.info(f"Descargando archivo desde URL...")
            
            # Descargar archivo
            file_bytes, content_type = self._download_file(url)
            
            # Detectar tipo de archivo
            file_type = self._detect_file_type(file_bytes, content_type)
            self.logger.debug(f"Tipo de archivo detectado: {file_type}")
            
            # Validar que sea un tipo soportado
            if file_type not in ['image', 'pdf', 'docx']:
                raise InvalidImageError(
                    f"Tipo de archivo no soportado: {file_type}",
                    {'content_type': content_type, 'detected_type': file_type}
                )
            
            # Convertir a base64
            base64_data = self._encode_to_base64(file_bytes)
            
            self.logger.info(f"Archivo descargado y codificado exitosamente: {len(base64_data)} chars, tipo: {file_type}")
            
            return base64_data, file_type
            
        except (ProcessingError, InvalidImageError):
            raise
        except Exception as e:
            self.logger.error(f"Error al descargar y codificar archivo: {str(e)}")
            raise ProcessingError(
                f"Error al procesar archivo desde URL: {str(e)}"
            )
    
    def _download_file(self, url: str) -> Tuple[bytes, Optional[str]]:
        """Descarga un archivo desde una URL.
        
        Args:
            url: URL del archivo a descargar.
            
        Returns:
            Tuple con:
                - bytes: Contenido del archivo
                - Optional[str]: Content-Type del response
                
        Raises:
            ProcessingError: Si la descarga falla o excede el tamaño máximo.
        """
        try:
            self.logger.debug(f"Iniciando descarga: {url[:100]}...")
            
            # Realizar request con streaming para controlar tamaño
            response = requests.get(
                url,
                timeout=self.timeout,
                stream=True,
                headers={'User-Agent': 'IDExtractor/2.0'}
            )
            
            # Verificar status code
            if response.status_code != 200:
                raise ProcessingError(
                    f"Error al descargar archivo: HTTP {response.status_code}",
                    {'status_code': response.status_code, 'url': url[:100]}
                )
            
            # Verificar tamaño del archivo si está disponible
            content_length = response.headers.get('content-length')
            if content_length:
                file_size = int(content_length)
                if file_size > self.max_file_size_bytes:
                    size_mb = file_size / (1024 * 1024)
                    max_mb = self.max_file_size_bytes / (1024 * 1024)
                    raise ProcessingError(
                        f"Archivo muy grande: {size_mb:.2f}MB (máximo: {max_mb:.2f}MB)",
                        {'file_size_mb': size_mb, 'max_size_mb': max_mb}
                    )
            
            # Descargar contenido con límite de tamaño
            file_bytes = b''
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    file_bytes += chunk
                    if len(file_bytes) > self.max_file_size_bytes:
                        size_mb = len(file_bytes) / (1024 * 1024)
                        max_mb = self.max_file_size_bytes / (1024 * 1024)
                        raise ProcessingError(
                            f"Archivo excede tamaño máximo durante descarga: {size_mb:.2f}MB",
                            {'downloaded_mb': size_mb, 'max_size_mb': max_mb}
                        )
            
            if not file_bytes:
                raise ProcessingError("El archivo descargado está vacío")
            
            content_type = response.headers.get('content-type', '')
            self.logger.debug(f"Descarga completada: {len(file_bytes)} bytes, content-type: {content_type}")
            
            return file_bytes, content_type
            
        except requests.exceptions.Timeout:
            raise ProcessingError(
                f"Timeout al descargar archivo (>{self.timeout}s)",
                {'timeout': self.timeout}
            )
        except requests.exceptions.RequestException as e:
            raise ProcessingError(
                f"Error de red al descargar archivo: {str(e)}",
                {'error': str(e)}
            )
        except ProcessingError:
            raise
        except Exception as e:
            raise ProcessingError(
                f"Error inesperado al descargar archivo: {str(e)}"
            )
    
    def _detect_file_type(self, file_bytes: bytes, content_type: Optional[str] = None) -> str:
        """Detecta el tipo de archivo basándose en magic bytes y content-type.
        
        Args:
            file_bytes: Contenido del archivo en bytes.
            content_type: Content-Type HTTP header (opcional).
            
        Returns:
            str: Tipo de archivo detectado ('image', 'pdf', 'docx' o 'unknown')
        """
        # Log para debugging
        self.logger.debug(f"Detectando tipo de archivo. Content-Type: {content_type}")
        self.logger.debug(f"Primeros 20 bytes: {file_bytes[:20]}")
        
        # Detectar por magic bytes (más confiable)
        # PDFs pueden empezar con espacios en blanco o %PDF
        if b'%PDF' in file_bytes[:10]:
            self.logger.debug("Detectado como PDF por magic bytes")
            return 'pdf'
        
        # Detectar DOCX (OOXML) por estructura ZIP
        if file_bytes.startswith(b'PK\x03\x04'):
            try:
                with zipfile.ZipFile(io.BytesIO(file_bytes)) as archive:
                    if 'word/document.xml' in archive.namelist():
                        self.logger.debug("Detectado como DOCX por estructura OOXML")
                        return 'docx'
            except zipfile.BadZipFile:
                self.logger.debug("Archivo con cabecera PK pero no es un ZIP válido")
            except Exception as exc:
                self.logger.debug(f"No se pudo inspeccionar ZIP: {exc}")
        
        # Detectar imágenes por magic bytes
        image_signatures = {
            b'\xFF\xD8\xFF': 'image',  # JPEG
            b'\x89PNG\r\n\x1a\n': 'image',  # PNG
            b'GIF87a': 'image',  # GIF87a
            b'GIF89a': 'image',  # GIF89a
            b'RIFF': 'image',  # WEBP (necesita más validación)
            b'BM': 'image',  # BMP
            b'II*\x00': 'image',  # TIFF (little-endian)
            b'MM\x00*': 'image',  # TIFF (big-endian)
        }
        
        for signature, file_type in image_signatures.items():
            if file_bytes.startswith(signature):
                # Para WEBP, validar que sea realmente WEBP
                if signature == b'RIFF' and len(file_bytes) > 12:
                    if file_bytes[8:12] == b'WEBP':
                        return 'image'
                    else:
                        continue
                return file_type
        
        # Intentar detectar con PIL como fallback
        try:
            img = Image.open(io.BytesIO(file_bytes))
            img.verify()
            self.logger.debug("Detectado como imagen por PIL")
            return 'image'
        except Exception as e:
            self.logger.debug(f"No es imagen según PIL: {str(e)}")
        
        # Fallback a content-type si está disponible
        if content_type:
            content_type_lower = content_type.lower()
            self.logger.debug(f"Fallback a content-type: {content_type_lower}")
            if 'pdf' in content_type_lower or 'application/pdf' in content_type_lower:
                self.logger.debug("Detectado como PDF por content-type")
                return 'pdf'
            if 'wordprocessingml.document' in content_type_lower or content_type_lower.endswith('docx'):
                self.logger.debug("Detectado como DOCX por content-type")
                return 'docx'
            if any(img_type in content_type_lower for img_type in ['image/', 'jpeg', 'png', 'webp']):
                self.logger.debug("Detectado como imagen por content-type")
                return 'image'
        
        # Si llegamos aquí, intentar buscar %PDF en más posiciones (algunos PDFs tienen headers extraños)
        if b'%PDF' in file_bytes[:100]:
            self.logger.debug("Detectado como PDF en búsqueda extendida")
            return 'pdf'
        
        self.logger.warning(f"No se pudo detectar tipo de archivo. Content-Type: {content_type}, Primeros bytes: {file_bytes[:50]}")
        return 'unknown'
    
    def _encode_to_base64(self, file_bytes: bytes) -> str:
        """Codifica bytes a base64 string.
        
        Args:
            file_bytes: Contenido del archivo en bytes.
            
        Returns:
            str: Contenido codificado en base64.
        """
        return base64.b64encode(file_bytes).decode('utf-8')
    
    def validate_url(self, url: str) -> bool:
        """Valida que una URL tenga formato correcto.
        
        Args:
            url: URL a validar.
            
        Returns:
            bool: True si la URL es válida, False en caso contrario.
            
        Examples:
            >>> handler = URLFileHandler()
            >>> handler.validate_url("https://storage.googleapis.com/file.jpg")
            True
            >>> handler.validate_url("not-a-url")
            False
        """
        try:
            if not url or not isinstance(url, str):
                return False
            
            url_lower = url.lower()
            if not (url_lower.startswith('http://') or url_lower.startswith('https://')):
                return False
            
            # Validación básica de estructura
            if len(url) < 10:
                return False
            
            return True
            
        except Exception:
            return False

