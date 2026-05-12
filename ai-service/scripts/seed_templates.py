#!/usr/bin/env python3
"""
Template Seeding Script - Learns certificate templates from sample files.

Usage:
    python scripts/seed_templates.py

This script:
1. Scans ai-service/templates/ for organization folders
2. Reads all sample certificates (PDF, PNG, JPG, JPEG)
3. Converts PDFs to images
4. Extracts OCR, visual, QR, and structural intelligence
5. Aggregates multiple samples into stable template profiles
6. Stores everything in MongoDB
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
import tempfile
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    load_dotenv(env_file)

from utils.db import MongoDBManager
from utils.template_aggregator import TemplateAggregator
from utils.template_extractor import TemplateExtractor

# Try to import pdf2image
try:
    from pdf2image import convert_from_path
except ImportError:
    convert_from_path = None

# Try to import python-slugify
try:
    from slugify import slugify
except ImportError:
    def slugify(text: str, lowercase: bool = True, separator: str = "-") -> str:
        """Fallback slugify implementation."""
        text = text.lower() if lowercase else text
        text = "".join(c if c.isalnum() else separator for c in text)
        return separator.join(filter(None, text.split(separator)))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(name)s] [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


class TemplateSeeder:
    """Orchestrate template learning and storage."""

    def __init__(self, templates_dir: Path | str = None, fallback_dirs: list[Path] | None = None):
        """Initialize the seeder."""
        self.templates_dir = Path(templates_dir or "templates")
        self.fallback_dirs = fallback_dirs or [
            Path(__file__).resolve().parents[2] / "test-certs-real",
            Path(__file__).resolve().parents[2] / "test-certs",
        ]
        self.db = MongoDBManager()
        self.extractor = TemplateExtractor()
        self.stats = {
            "organizations": 0,
            "certifications": 0,
            "samples_processed": 0,
            "templates_stored": 0,
            "errors": 0,
        }

    def seed(self) -> bool:
        """Execute the full template seeding pipeline."""
        logger.info("=" * 60)
        logger.info("Starting Template Seeding Pipeline")
        logger.info("=" * 60)

        # Validate templates directory
        if not self.templates_dir.exists() or not any(self.templates_dir.iterdir()):
            logger.warning(f"Templates directory missing or empty: {self.templates_dir}")
            logger.warning("Falling back to repository sample directories for seeding")
            for fallback in self.fallback_dirs:
                if fallback.exists() and any(fallback.iterdir()):
                    self.templates_dir = fallback
                    logger.info(f"Using fallback seeding source: {self.templates_dir}")
                    break
            else:
                logger.error("No template or sample directories found to seed from")
                return False

        # Connect to MongoDB
        if not self.db.connect():
            logger.error("Failed to connect to MongoDB")
            return False

        try:
            # Scan and process organizations
            self._process_templates_directory()

            # Print summary
            self._print_summary()
            return self.stats["errors"] == 0

        except Exception as e:
            logger.error(f"Seeding failed: {e}")
            self.stats["errors"] += 1
            return False

        finally:
            self.db.disconnect()

    def _process_templates_directory(self):
        """Recursively scan templates directory."""
        entries = list(sorted(self.templates_dir.iterdir()))

        # Support flat sample folders (e.g. test-certs-real/*.png) by treating
        # the folder itself as a synthetic organization.
        if any(self._is_supported_file(p) for p in entries):
            synthetic_org = self.templates_dir.name
            logger.info(f"[INFO] Processing flat sample folder as synthetic org: {synthetic_org}")
            try:
                org_slug = slugify(synthetic_org, lowercase=True, separator="-")
                self.db.upsert_organization(
                    name=synthetic_org,
                    slug=org_slug,
                    category="CERTIFICATION_PROVIDER",
                )
                self.stats["organizations"] += 1
            except Exception as e:
                logger.error(f"Failed to create synthetic organization '{synthetic_org}': {e}")
                self.stats["errors"] += 1
                return

            self._process_organization_samples(synthetic_org, self.templates_dir)
            return

        for org_dir in entries:
            if not org_dir.is_dir() or org_dir.name.startswith("."):
                continue

            org_name = org_dir.name
            logger.info(f"\n[INFO] Processing {org_name.upper()} templates")

            # Create or get organization
            try:
                org_slug = slugify(org_name, lowercase=True, separator="-")
                self.db.upsert_organization(
                    name=org_name,
                    slug=org_slug,
                    category="CERTIFICATION_PROVIDER",
                )
                self.stats["organizations"] += 1
            except Exception as e:
                logger.error(f"Failed to create organization '{org_name}': {e}")
                self.stats["errors"] += 1
                continue

            # Collect samples by type/category
            self._process_organization_samples(org_name, org_dir)

    def _process_organization_samples(self, org_name: str, org_dir: Path):
        """Process all sample certificates in organization folder."""
        cert_types: dict[str, list[Path]] = {}

        # Group samples by certification type (inferred from filename prefix)
        for file_path in sorted(org_dir.iterdir()):
            if not self._is_supported_file(file_path):
                continue

            # Extract certification type from filename
            cert_type = self._infer_certification_type(file_path.stem, org_name)
            if cert_type not in cert_types:
                cert_types[cert_type] = []
            cert_types[cert_type].append(file_path)

        # Process each certification type
        for cert_type, sample_files in cert_types.items():
            logger.info(f"  [INFO] Processing {cert_type} ({len(sample_files)} samples)")
            self._process_certification_samples(org_name, cert_type, sample_files)

    def _process_certification_samples(self, org_name: str, cert_type: str, sample_files: list[Path]):
        """Process samples for a specific certification type."""
        profiles = []
        temp_images: list[Path] = []

        try:
            # Extract profiles from all samples
            for file_path in sample_files:
                logger.info(f"    [EXTRACT] {file_path.name}")

                try:
                    # Convert PDF to images if needed
                    image_paths = self._prepare_images(file_path)
                    temp_images.extend(image_paths)

                    # Extract profile from each image
                    for image_path in image_paths:
                        profile = self.extractor.extract_image_profile(image_path)

                        # Extract spatial relationships
                        profile["relationships"] = self.extractor.extract_spatial_relationships(
                            profile.get("components", []),
                            profile.get("resolution", {}).get("width", 0),
                            profile.get("resolution", {}).get("height", 0),
                        )

                        profiles.append(profile)
                        self.stats["samples_processed"] += 1

                        logger.info(f"      ✓ OCR: {len(profile.get('ocrText', '')) > 0}")
                        logger.info(f"      ✓ QR: {bool(profile.get('qrData'))}")
                        logger.info(f"      ✓ Components: {len(profile.get('components', []))}")

                except Exception as e:
                    logger.error(f"    [ERROR] Failed to process {file_path.name}: {e}")
                    self.stats["errors"] += 1
                    continue

            if not profiles:
                logger.warning(f"  [WARN] No valid profiles extracted for {cert_type}")
                return

            # Aggregate profiles
            logger.info(f"  [AGGREGATE] Combining {len(profiles)} samples")
            aggregated = TemplateAggregator.aggregate_profiles(profiles)

            # Store in MongoDB
            org_slug = slugify(org_name, lowercase=True)
            cert_slug = slugify(cert_type, lowercase=True)

            try:
                # Get or create certification
                org = self.db.db.organizations.find_one({"slug": org_slug})
                if not org:
                    logger.error(f"Organization {org_slug} not found")
                    self.stats["errors"] += 1
                    return

                org_id = str(org["_id"])

                cert = self.db.db.certifications.find_one({
                    "organizationId": org_id,
                    "slug": cert_slug,
                })

                if not cert:
                    cert_id = self.db.upsert_certification(
                        organization_id=org_id,
                        name=cert_type,
                        slug=cert_slug,
                    )
                else:
                    cert_id = str(cert["_id"])

                # Store template profile
                template_id = self.db.store_template_profile(
                    certification_id=cert_id,
                    aggregated_profile=aggregated,
                )

                # Store components and relationships
                self.db.store_components(template_id, aggregated.get("components", []))
                self.db.store_relationships(template_id, aggregated.get("relationships", []))
                self.db.store_hashes(template_id, aggregated.get("hashes", {}))

                # Log success
                self.db.log_extraction(
                    template_id,
                    "SUCCESS",
                    {
                        "organization": org_name,
                        "certification": cert_type,
                        "samples": len(profiles),
                        "components": len(aggregated.get("components", [])),
                        "relationships": len(aggregated.get("relationships", [])),
                    },
                )

                logger.info(f"  [✓] Template stored successfully (ID: {template_id})")
                self.stats["certifications"] += 1
                self.stats["templates_stored"] += 1

            except Exception as e:
                logger.error(f"  [ERROR] Failed to store template: {e}")
                self.stats["errors"] += 1

        finally:
            # Clean up temporary images
            for temp_path in temp_images:
                try:
                    temp_path.unlink()
                except Exception:
                    pass

    def _prepare_images(self, file_path: Path) -> list[Path]:
        """Convert file to image(s), handling PDFs specially."""
        if file_path.suffix.lower() == ".pdf":
            if not convert_from_path:
                logger.error(f"PDF conversion not available (pdf2image not installed)")
                return []

            try:
                logger.info(f"      Converting PDF to images...")
                images = convert_from_path(str(file_path), dpi=150)
                temp_images = []
                
                for i, image in enumerate(images):
                    # Use Windows-compatible temp directory
                    temp_dir = Path(tempfile.gettempdir())
                    temp_path = temp_dir / f"cert_temp_{file_path.stem}_{i}.png"
                    image.save(temp_path, "PNG")
                    temp_images.append(temp_path)
                    logger.info(f"      Converted page {i+1} to {temp_path}")
                
                return temp_images
            except Exception as e:
                logger.error(f"PDF conversion failed: {e}")
                return []
        else:
            return [file_path]

    def _is_supported_file(self, file_path: Path) -> bool:
        """Check if file is a supported certificate format."""
        supported = {".pdf", ".png", ".jpg", ".jpeg"}
        return file_path.suffix.lower() in supported

    def _infer_certification_type(self, filename: str, org_name: str) -> str:
        """Infer certification type from filename or organization."""
        # Remove common prefixes and numbers
        parts = filename.lower().split("_")
        if parts[0] == org_name.lower():
            parts.pop(0)

        # Remove trailing numbers
        while parts and parts[-1].isdigit():
            parts.pop()

        cert_name = " ".join(parts) if parts else org_name
        return cert_name.title().replace("-", " ")

    def _print_summary(self):
        """Print seeding summary."""
        logger.info("\n" + "=" * 60)
        logger.info("Template Seeding Summary")
        logger.info("=" * 60)
        logger.info(f"Organizations processed: {self.stats['organizations']}")
        logger.info(f"Certifications processed: {self.stats['certifications']}")
        logger.info(f"Samples extracted: {self.stats['samples_processed']}")
        logger.info(f"Templates stored: {self.stats['templates_stored']}")
        logger.info(f"Errors: {self.stats['errors']}")
        logger.info("=" * 60 + "\n")


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="Seed certificate templates from sample files")
    parser.add_argument(
        "--templates-dir",
        default="templates",
        help="Path to templates directory (default: templates/)",
    )
    parser.add_argument(
        "--fallback-dir",
        action="append",
        default=[],
        help="Optional fallback sample directory to use if templates-dir is empty (can be repeated)",
    )
    parser.add_argument(
        "--mongodb-uri",
        default=None,
        help="MongoDB URI (default: from MONGODB_URI env var)",
    )

    args = parser.parse_args()

    seeder = TemplateSeeder(
        templates_dir=args.templates_dir,
        fallback_dirs=[Path(p) for p in args.fallback_dir] if args.fallback_dir else None,
    )

    if args.mongodb_uri:
        seeder.db.uri = args.mongodb_uri

    success = seeder.seed()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
