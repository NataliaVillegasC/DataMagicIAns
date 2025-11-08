"""Herramientas para dividir documentos en páginas individuales.

Este módulo convierte archivos multipágina (PDF, TIFF, etc.) o imágenes
simples en una lista de páginas listas para ser procesadas. Cada página se
representa con metadatos útiles (número de página, MIME type) junto con el
contenido en base64 y un objeto PIL que facilita el envío a modelos
multimodales como Gemini.
"""

from __future__ import annotations

import base64
import hashlib
import io
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator, List, Sequence

from PIL import Image

try:  # pragma: no cover - import opcional
    import fitz  # PyMuPDF
except Exception:  # pragma: no cover - entorno sin PyMuPDF
    fitz = None  # type: ignore

import logging

from ...domain.exceptions import InvalidImageError, ProcessingError


SUPPORTED_IMAGE_EXTENSIONS: Sequence[str] = (
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".bmp",
    ".tiff",
    ".tif",
)


@dataclass
class PageContent:
    """Información autocontenida de una página extraída."""

    page_number: int
    base64_content: str
    mime_type: str
    pil_image: Image.Image


class PageExtractor:
    """Extrae páginas individuales de archivos PDF o imágenes."""

    def __init__(self, pdf_zoom: float = 2.0):
        self.pdf_zoom = pdf_zoom
        self.logger = logging.getLogger(__name__)

    def extract(self, file_path: Path) -> List[PageContent]:
        """Devuelve las páginas del documento indicado."""

        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"El archivo no existe: {path}")

        suffix = path.suffix.lower()

        if suffix == ".pdf":
            return self._extract_pdf(path)

        if suffix in SUPPORTED_IMAGE_EXTENSIONS:
            return self._extract_image(path)

        # Intentar abrir con PIL para formatos no estándar
        try:
            return self._extract_image(path)
        except InvalidImageError:
            raise InvalidImageError(
                f"Formato de archivo no soportado para segmentación: {suffix}",
                {"file": str(path)},
            )

    def _extract_pdf(self, path: Path) -> List[PageContent]:
        if fitz is None:
            raise ProcessingError(
                "No se puede procesar PDF porque PyMuPDF no está disponible",
                {"file": str(path)},
            )

        # Suprimir warnings de MuPDF sobre widgets de formularios
        import warnings
        import contextlib
        import sys
        import os

        @contextlib.contextmanager
        def suppress_mupdf_warnings():
            """Suprime los warnings de MuPDF sobre appearance streams de widgets"""
            # Guardar stderr original
            old_stderr = sys.stderr
            try:
                # Redirigir stderr a /dev/null para suprimir warnings de MuPDF
                sys.stderr = open(os.devnull, 'w')
                yield
            finally:
                # Restaurar stderr original
                sys.stderr.close()
                sys.stderr = old_stderr

        try:
            document = fitz.open(str(path))
        except Exception as exc:  # pragma: no cover - fitz errors
            raise ProcessingError(
                f"Error al abrir PDF {path.name}: {exc}", {"file": str(path)}
            ) from exc

        pages: List[PageContent] = []
        try:
            if document.page_count == 0:
                raise InvalidImageError(
                    "El PDF no contiene páginas",
                    {"file": str(path)},
                )

            # 🔍 Detectar y filtrar páginas duplicadas
            seen_hashes = set()
            duplicate_count = 0
            
            matrix = fitz.Matrix(self.pdf_zoom, self.pdf_zoom)
            for index in range(document.page_count):
                with suppress_mupdf_warnings():
                    page = document.load_page(index)
                    pix = page.get_pixmap(matrix=matrix)

                img_bytes = pix.pil_tobytes(format="PNG")
                
                # Calcular hash de la imagen para detectar duplicados
                img_hash = hashlib.sha256(img_bytes).hexdigest()
                
                if img_hash in seen_hashes:
                    duplicate_count += 1
                    self.logger.debug(f"Página {index + 1} es duplicada, ignorando...")
                    continue  # Saltar página duplicada
                
                seen_hashes.add(img_hash)
                
                base64_content = base64.b64encode(img_bytes).decode("utf-8")
                pil_image = Image.open(io.BytesIO(img_bytes))
                pil_image.load()

                pages.append(
                    PageContent(
                        page_number=index + 1,
                        base64_content=base64_content,
                        mime_type="image/png",
                        pil_image=pil_image.convert("RGB"),
                    )
                )

            # Log resumen de deduplicación
            if duplicate_count > 0:
                self.logger.info(f"Se detectaron y eliminaron {duplicate_count} página(s) duplicada(s) de {document.page_count} total(es)")
                self.logger.info(f"Procesando {len(pages)} página(s) única(s)")

        finally:
            document.close()

        return pages

    def _extract_image(self, path: Path) -> List[PageContent]:
        try:
            image = Image.open(path)
            image.load()
        except Exception as exc:
            raise InvalidImageError(
                f"No se pudo abrir la imagen {path.name}: {exc}",
                {"file": str(path)},
            ) from exc

        frames = getattr(image, "n_frames", 1)
        pages: List[PageContent] = []

        for frame_index, pil_image in enumerate(self._iterate_frames(image, frames), start=1):
            buffer = io.BytesIO()
            pil_image.convert("RGB").save(buffer, format="PNG", optimize=True)
            img_bytes = buffer.getvalue()
            base64_content = base64.b64encode(img_bytes).decode("utf-8")

            pages.append(
                PageContent(
                    page_number=frame_index,
                    base64_content=base64_content,
                    mime_type="image/png",
                    pil_image=pil_image.convert("RGB"),
                )
            )

        return pages

    def _iterate_frames(self, image: Image.Image, frames: int) -> Iterator[Image.Image]:
        for frame in range(frames):
            try:
                image.seek(frame)
                frame_image = image.copy()
                frame_image.load()
                yield frame_image
            except EOFError:  # pragma: no cover - seguridad extra
                break

