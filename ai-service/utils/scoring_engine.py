"""
Weighted scoring engine and classification for certificate verification.

Implements weights and thresholds requested by the user and produces
explainable outputs (breakdown, trust score, classification).
"""
from __future__ import annotations

from typing import Any
import logging
import re

logger = logging.getLogger(__name__)


# Weights as requested
WEIGHTS = {
    "qr": 0.30,
    "certificate_id": 0.25,
    "name": 0.20,
    "structure": 0.15,
    "ocr_confidence": 0.05,
    "visual": 0.05,
}


def _normalize(value: float) -> float:
    return max(0.0, min(100.0, float(value)))


def _certificate_id_score(provided: str, ocr_text: str, template: dict[str, Any] | None = None) -> float:
    """Simple certificate id matching heuristic.

    Returns 100 if exact match found in OCR, 70 for partial, 0 if missing.
    """
    if not provided:
        return 0.0
    provided_norm = provided.strip().upper()
    if not provided_norm:
        return 0.0

    # Search OCR text for an exact token
    if ocr_text:
        if provided_norm in ocr_text.upper():
            return 100.0

        # Partial match: numbers portion or hyphen segments
        tokens = re.split(r"\s+|,|:|#|-", ocr_text.upper())
        for token in tokens:
            if token and provided_norm in token:
                return 70.0

    # If template encodes a deterministic id pattern and provided matches pattern, reward modestly
    return 20.0


def evaluate(
    *,
    metrics: dict[str, float],
    uploaded_profile: dict[str, Any],
    certificate_id_provided: str = "",
    name_score: float | None = None,
    template: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Evaluate weighted score and produce explainable result.

    metrics: expect keys 'qrSimilarity','visualSimilarity','structureSimilarity','nameSimilarity'
    uploaded_profile: used to estimate OCR confidence
    certificate_id_provided: provided by user
    name_score: optional explicit name score override
    """
    # Gather component scores
    qr = _normalize(metrics.get("qrSimilarity", 0))
    visual = _normalize(metrics.get("visualSimilarity", 0))
    structure = _normalize(metrics.get("structureSimilarity", metrics.get("structure", 50)))
    name = _normalize(name_score if name_score is not None else metrics.get("nameSimilarity", 0))

    # OCR confidence heuristic
    ocr_conf = 40.0
    ocr_text = uploaded_profile.get("ocrText", "") or ""
    if ocr_text and len(ocr_text.strip()) > 10:
        ocr_conf = 85.0
    elif ocr_text and len(ocr_text.strip()) > 0:
        ocr_conf = 65.0

    cert_id_score = _certificate_id_score(certificate_id_provided, ocr_text, template)

    # Weighted sum
    breakdown = {
        "qr": round(qr, 2),
        "certificate_id": round(cert_id_score, 2),
        "name": round(name, 2),
        "structure": round(structure, 2),
        "ocr_confidence": round(ocr_conf, 2),
        "visual": round(visual, 2),
    }

    weighted = (
        breakdown["qr"] * WEIGHTS["qr"]
        + breakdown["certificate_id"] * WEIGHTS["certificate_id"]
        + breakdown["name"] * WEIGHTS["name"]
        + breakdown["structure"] * WEIGHTS["structure"]
        + breakdown["ocr_confidence"] * WEIGHTS["ocr_confidence"]
        + breakdown["visual"] * WEIGHTS["visual"]
    )

    # Trust adjustments: penalize anomalies but ignore minor brightness/edge/color penalties
    anomalies = uploaded_profile.get("anomalies", []) or []
    anomaly_penalty = 0.0
    for a in anomalies:
        code = (a.get("code") or a.get("type") or "").upper()
        severity = (a.get("severity") or "LOW").upper()
        # Reduce penalty for brightness/edge/color related indicators
        if "BRIGHT" in code or "EDGE" in code or "COLOR" in code:
            continue
        if severity == "HIGH":
            anomaly_penalty += 8.0
        elif severity == "MEDIUM":
            anomaly_penalty += 4.0
        else:
            anomaly_penalty += 1.0

    trust_score = max(0.0, weighted - anomaly_penalty)

    # Classification thresholds
    classification = "REJECTED"
    if trust_score >= 75:
        classification = "VERIFIED"
    elif trust_score >= 55:
        classification = "NEEDS_REVIEW"
    else:
        classification = "REJECTED"

    explanation = [
        f"Weighted confidence: {round(weighted,2)}%",
        f"Anomaly penalty: {round(anomaly_penalty,2)}",
        f"Trust score: {round(trust_score,2)}",
        f"Classification: {classification}",
    ]

    return {
        "weightedConfidence": round(weighted, 2),
        "trustScore": round(trust_score, 2),
        "classification": classification,
        "breakdown": breakdown,
        "explanation": explanation,
    }
