"""Minimal example: take a sample CV file, send it as base64 to the extractor, print summary."""

import base64
import json
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from core.cv_extractor.application.services.document_extractor import DocumentExtractor
from core.cv_extractor.domain.models import CVConfig


def main() -> None:
    sample_path = Path(__file__).parent / "example_cv" / "resume.pdf"
    payload = base64.b64encode(sample_path.read_bytes()).decode("utf-8")

    extractor = DocumentExtractor(CVConfig())
    result = extractor.extract_document_info(payload)

    output = {
        "file": sample_path.name,
        "document_count": result.get("document_count"),
        "processing_time": result.get("processing_time"),
    }
    print(json.dumps(output, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

