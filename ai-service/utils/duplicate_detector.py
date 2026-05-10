"""
Duplicate Certificate Detection Engine

Identifies duplicate or forged certificates by comparing against
all existing uploads using multiple matching strategies.
"""

from __future__ import annotations

import logging
from typing import Any

try:
    import imagehash
    import numpy as np
except Exception:
    imagehash = None
    np = None

try:
    from rapidfuzz import fuzz
except Exception:
    fuzz = None

logger = logging.getLogger(__name__)


class DuplicateDetector:
    """Detect duplicate and near-duplicate certificates."""

    def __init__(self):
        """Initialize detector."""
        pass

    def compute_duplicate_probability(
        self,
        uploaded_features: dict[str, Any],
        existing_certificates: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """
        Compute probability that uploaded certificate is duplicate of existing.
        
        Args:
            uploaded_features: Features from uploaded certificate
            existing_certificates: List of existing certificate records
            
        Returns:
            Dictionary with duplicate probability and potential matches
        """
        if not existing_certificates:
            return {
                "duplicateProbability": 0,
                "matches": [],
                "reason": "No existing certificates to compare"
            }

        matches = []

        for existing in existing_certificates:
            score = self._compute_match_score(uploaded_features, existing)
            if score["overall"] > 40:  # Only report significant matches
                matches.append(score)

        # Sort by score
        matches.sort(key=lambda m: m["overall"], reverse=True)

        # Highest score is the duplicate probability
        duplicate_probability = matches[0]["overall"] if matches else 0

        return {
            "duplicateProbability": round(duplicate_probability, 2),
            "matches": matches[:5],  # Top 5 matches
            "reason": f"Compared against {len(existing_certificates)} existing certificates"
        }

    def _compute_match_score(
        self,
        uploaded: dict[str, Any],
        existing: dict[str, Any]
    ) -> dict[str, Any]:
        """Compute match score between two certificates."""
        score = {
            "certificateId": existing.get("_id"),
            "certificateName": existing.get("title"),
            "components": {
                "ocrMatch": 0,
                "hashMatch": 0,
                "colorMatch": 0,
                "textMatch": 0
            },
            "overall": 0
        }

        # OCR text match
        if uploaded.get("ocrBlocks") and existing.get("extractedCertificateData", {}).get("ocrBlocks"):
            score["components"]["ocrMatch"] = self._score_ocr_match(
                uploaded["ocrBlocks"],
                existing["extractedCertificateData"]["ocrBlocks"]
            )

        # Image hash match
        if uploaded.get("imageHashes", {}).get("perceptual") and existing.get("extractedCertificateData", {}).get("imageHashes"):
            score["components"]["hashMatch"] = self._score_hash_match(
                uploaded["imageHashes"],
                existing["extractedCertificateData"].get("imageHashes", [])
            )

        # Color profile match
        if uploaded.get("dominantColors") and existing.get("extractedCertificateData", {}).get("colorProfiles"):
            score["components"]["colorMatch"] = self._score_color_match(
                uploaded["dominantColors"],
                existing["extractedCertificateData"]["colorProfiles"]
            )

        # Certificate ID/text match
        if uploaded.get("ocrBlocks") and existing.get("certificateId"):
            score["components"]["textMatch"] = self._score_text_match(
                uploaded["ocrBlocks"],
                existing.get("certificateId", "")
            )

        # Weighted overall score
        score["overall"] = round(
            score["components"]["ocrMatch"] * 0.4 +
            score["components"]["hashMatch"] * 0.3 +
            score["components"]["colorMatch"] * 0.15 +
            score["components"]["textMatch"] * 0.15,
            2
        )

        return score

    def _score_ocr_match(self, uploaded_blocks: list[dict], existing_blocks: list[dict]) -> float:
        """Score OCR text similarity."""
        if not uploaded_blocks or not existing_blocks:
            return 0

        try:
            up_text = " ".join([b.get("text", "") for b in uploaded_blocks]).lower()
            ex_text = " ".join([b.get("text", "") for b in existing_blocks]).lower()

            if not up_text or not ex_text:
                return 0

            if fuzz:
                similarity = max(
                    fuzz.token_set_ratio(up_text, ex_text),
                    fuzz.partial_token_set_ratio(up_text, ex_text),
                    fuzz.ratio(up_text, ex_text)
                )
            else:
                up_tokens = set(up_text.split())
                ex_tokens = set(ex_text.split())
                similarity = 100 * len(up_tokens & ex_tokens) / max(1, len(up_tokens | ex_tokens))

            return similarity

        except Exception as e:
            logger.debug(f"OCR match scoring failed: {e}")
            return 0

    def _score_hash_match(self, uploaded_hashes: dict[str, str], existing_hashes: list[str]) -> float:
        """Score image hash similarity."""
        if not imagehash or not uploaded_hashes or not existing_hashes:
            return 0

        try:
            up_phash = uploaded_hashes.get("perceptual", "")
            if not up_phash:
                return 0

            # Compare against all existing hashes
            distances = []
            for ex_hash_str in existing_hashes:
                try:
                    up_hash = imagehash.ImageHash(up_phash)
                    ex_hash = imagehash.ImageHash(ex_hash_str)
                    distance = up_hash - ex_hash
                    distances.append(distance)
                except Exception:
                    continue

            if not distances:
                return 0

            min_distance = min(distances)
            # Convert distance to similarity (0-64 distance range for phash)
            similarity = 100 * max(0, 1 - min_distance / 64)
            return similarity

        except Exception as e:
            logger.debug(f"Hash match scoring failed: {e}")
            return 0

    def _score_color_match(self, uploaded_colors: list[str], existing_colors: list[str]) -> float:
        """Score color profile similarity."""
        if not uploaded_colors or not existing_colors:
            return 0

        try:
            matches = 0
            for up_color in uploaded_colors[:5]:
                for ex_color in existing_colors[:5]:
                    if self._color_distance(up_color, ex_color) < 40:
                        matches += 1
                        break

            similarity = 100 * matches / min(5, len(uploaded_colors), len(existing_colors))
            return similarity

        except Exception:
            return 0

    def _color_distance(self, hex1: str, hex2: str) -> float:
        """Calculate distance between two hex colors."""
        try:
            hex1 = hex1.lstrip("#")
            hex2 = hex2.lstrip("#")
            r1, g1, b1 = int(hex1[0:2], 16), int(hex1[2:4], 16), int(hex1[4:6], 16)
            r2, g2, b2 = int(hex2[0:2], 16), int(hex2[2:4], 16), int(hex2[4:6], 16)
            return ((r1 - r2)**2 + (g1 - g2)**2 + (b1 - b2)**2) ** 0.5
        except Exception:
            return 127

    def _score_text_match(self, uploaded_blocks: list[dict], certificate_id: str) -> float:
        """Score text/ID match."""
        if not uploaded_blocks or not certificate_id:
            return 0

        try:
            uploaded_text = " ".join([b.get("text", "") for b in uploaded_blocks]).lower()
            cert_id_lower = certificate_id.lower()

            if cert_id_lower in uploaded_text:
                return 95

            if fuzz:
                similarity = fuzz.partial_ratio(cert_id_lower, uploaded_text)
            else:
                similarity = 50 if any(part in uploaded_text for part in cert_id_lower.split()) else 0

            return similarity

        except Exception:
            return 0
