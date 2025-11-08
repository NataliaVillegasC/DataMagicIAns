"""Batch test runner that executes CV extraction on every sample file under tests/example_cv."""

import base64
import json
from datetime import datetime
from pathlib import Path
from typing import List

import sys

# Ensure project modules are importable when running as a script
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from core.cv_extractor.application.services.document_extractor import DocumentExtractor
from core.cv_extractor.domain.models import CVConfig


SUPPORTED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif", ".docx"}


def _load_file_as_base64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("utf-8")


def _extract(extractor: DocumentExtractor, file_path: Path) -> dict:
    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        return extractor.extract_document_info_from_pdf(file_path)

    base64_payload = _load_file_as_base64(file_path)
    return extractor.extract_document_info(base64_payload)


def main() -> None:
    tests_dir = Path(__file__).parent
    examples_dir = tests_dir / "example_cv"

    if not examples_dir.exists():
        print(f"❌ Error: directory not found {examples_dir}")
        sys.exit(1)

    output_dir = tests_dir / "results"
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    summary: dict = {
        "generated_at": timestamp,
        "example_directory": str(examples_dir),
        "results": [],
    }

    config = CVConfig()
    extractor = DocumentExtractor(config)

    files: List[Path] = sorted(
        path for path in examples_dir.iterdir() if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    )

    if not files:
        print(f"⚠️ No supported files found in {examples_dir}")
        sys.exit(0)

    print("=" * 70)
    print("🧪 CV EXTRACTION BATCH TEST")
    print("=" * 70)
    print(f"📁 Samples directory: {examples_dir}")
    print(f"🧾 Results directory: {output_dir}")
    print(f"📄 Files detected: {len(files)}")
    print("=" * 70)
    print()

    for file_path in files:
        print(f"🔄 Processing: {file_path.name}")
        report_entry = {
            "file": file_path.name,
            "path": str(file_path),
            "status": "success",
            "error": None,
            "output_json": None,
        }

        try:
            result = _extract(extractor, file_path)
            output_file = output_dir / f"{file_path.stem}.json"
            output_file.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

            report_entry["output_json"] = str(output_file)
            report_entry["documents"] = result.get("document_count")
            report_entry["processing_time"] = result.get("processing_time")

            print(f"✅ Success → documents: {result.get('document_count')} | time: {result.get('processing_time')}s")
        except Exception as exc:
            report_entry["status"] = "error"
            report_entry["error"] = str(exc)
            print(f"❌ Failed: {exc}")

        summary["results"].append(report_entry)
        print("-" * 70)

    summary_file = output_dir / f"summary_{timestamp}.json"
    summary_file.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

    print()
    print("=" * 70)
    print("📦 BATCH SUMMARY")
    print("=" * 70)
    print(f"✅ Successful: {sum(1 for r in summary['results'] if r['status'] == 'success')}")
    print(f"❌ Failed: {sum(1 for r in summary['results'] if r['status'] == 'error')}")
    print(f"📝 Summary JSON: {summary_file}")
    print("=" * 70)


if __name__ == "__main__":
    main()

