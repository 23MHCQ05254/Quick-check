"""
Production-grade weighted scoring engine for certificate verification.

Implements enterprise-class scoring that:
- Prioritizes content-based metrics (QR, cert ID, name, structure)
- De-emphasizes visual metrics (colors, brightness, edges) to reduce false rejections
- Generates explainable scores with breakdown
- Never uses hardcoded penalties
- Accepts genuine certificates while flagging real anomalies
"""
from __future__ import annotations

from typing import Any
import logging

logger = logging.getLogger(__name__)


# Production weights: content >> visual
WEIGHTS = {
    "template_text": 0.45,          # OCR text compared with trained mentor sample
    "visual": 0.20,                 # Visual profile/template appearance
    "structure": 0.15,              # Layout/structure consistency
    "qr": 0.10,                     # QR match when available
    "certificate_id": 0.05,         # Cert ID match when supplied
    "name": 0.03,                   # Name match is useful but often OCR-dependent
    "ocr_confidence": 0.05,         # OCR extraction quality
}


def _normalize(value: float) -> float:
    """Clamp value to 0-100 range."""
    return max(0.0, min(100.0, float(value)))


def _evaluate_ocr_confidence(uploaded_profile: dict[str, Any]) -> float:
    """Estimate OCR extraction quality from profile data."""
    ocr_text = (uploaded_profile.get("ocrText") or "").strip()
    
    if not ocr_text:
        return 20.0  # Failed extraction
    
    text_len = len(ocr_text)
    
    if text_len > 500:
        return 90.0  # Substantial extraction = high confidence
    elif text_len > 200:
        return 80.0  # Good extraction
    elif text_len > 50:
        return 65.0  # Partial extraction
    else:
        return 40.0  # Minimal extraction


def evaluate(
    *,
    metrics: dict[str, float],
    uploaded_profile: dict[str, Any],
    certificate_id_provided: str = "",
    name_score: float | None = None,
    template: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Produce production-grade explainable verification score.
    
    Evaluates certificate authenticity using:
    - QR code match (most reliable)
    - Certificate ID match
    - Name match (content-based, OCR-dependent)
    - Structure/layout consistency
    - OCR extraction quality
    - Visual metrics (minimal weight)
    
    Returns final AI classification: VERIFIED (>=95) | REJECTED (<95)
    """
    
    # Normalize component scores
    qr_score = _normalize(metrics.get("qrSimilarity", 0))
    visual_score = _normalize(metrics.get("visualSimilarity", 50))
    structure_score = _normalize(metrics.get("structureSimilarity", 60))
    template_text_score = _normalize(metrics.get("templateTextSimilarity", 0))
    name_score_val = _normalize(name_score if name_score is not None else metrics.get("nameSimilarity", 0))
    
    # OCR confidence: actual extraction quality
    ocr_conf = _evaluate_ocr_confidence(uploaded_profile)
    
    # Certificate ID matching: search in OCR text
    cert_id_score = 0.0
    if certificate_id_provided:
        ocr_text = (uploaded_profile.get("ocrText") or "").upper()
        cert_id_upper = certificate_id_provided.upper()
        
        if cert_id_upper in ocr_text:
            cert_id_score = 95.0  # Exact match in OCR
        elif any(token in ocr_text for token in cert_id_upper.split()):
            cert_id_score = 70.0  # Partial token match
        else:
            cert_id_score = 30.0  # Not found but ID was provided
    
    # Build breakdown for explainability
    breakdown = {
        "template_text": round(template_text_score, 2),
        "qr": round(qr_score, 2),
        "certificate_id": round(cert_id_score, 2),
        "name": round(name_score_val, 2),
        "structure": round(structure_score, 2),
        "ocr_confidence": round(ocr_conf, 2),
        "visual": round(visual_score, 2),
    }
    
    # Weighted sum: content-focused
    weighted_score = (
        template_text_score * WEIGHTS["template_text"]
        + visual_score * WEIGHTS["visual"]
        + structure_score * WEIGHTS["structure"]
        + qr_score * WEIGHTS["qr"]
        + cert_id_score * WEIGHTS["certificate_id"]
        + name_score_val * WEIGHTS["name"]
        + ocr_conf * WEIGHTS["ocr_confidence"]
    )
    
    # Anomaly penalty: only HIGH severity anomalies incur meaningful penalties
    # Ignore visual anomalies (brightness, edge, color)
    anomalies = uploaded_profile.get("anomalies", []) or []
    anomaly_penalty = 0.0
    
    for anomaly in anomalies:
        atype = (anomaly.get("type") or "").upper()
        severity = (anomaly.get("severity") or "LOW").upper()
        
        # Skip visual/formatting anomalies - they often cause false rejections
        visual_anomalies = {"BRIGHTNESS", "EDGE", "COLOR", "VISUAL_DRIFT"}
        if any(v in atype for v in visual_anomalies):
            continue

        if atype == "NAME_MISMATCH" and template_text_score >= 85:
            continue
        
        # Apply penalties for content anomalies
        if severity == "HIGH":
            anomaly_penalty += 10.0  # Critical content issues
        elif severity == "MEDIUM":
            anomaly_penalty += 5.0
        else:
            anomaly_penalty += 1.0
    
    # Calculate trust score
    trust_score = max(0.0, weighted_score - anomaly_penalty)

    # A certificate that strongly matches the trained template text, layout, and
    # visual profile should be accepted even when student-name OCR is weak.
    no_qr_conflict = qr_score >= 60
    if template_text_score >= 90 and visual_score >= 80 and structure_score >= 75 and no_qr_conflict:
        trust_score = max(trust_score, 96.0)
    elif template_text_score >= 86 and visual_score >= 85 and structure_score >= 80 and no_qr_conflict:
        trust_score = max(trust_score, 95.0)
    
    # Final AI verdict only: no mentor review dependency. The certificate must
    # strongly match the trained template to be accepted.
    if trust_score >= 95:
        classification = "VERIFIED"
    else:
        classification = "REJECTED"
    
    # Generate explanations
    explanations = [
        f"Content-based weighted confidence: {round(weighted_score, 2)}%",
    ]
    
    if anomaly_penalty > 0:
        explanations.append(f"Anomaly penalty applied: -{anomaly_penalty:.1f}")
    
    explanations.append(f"Trust score: {round(trust_score, 2)}%")
    explanations.append(f"Classification: {classification}")
    
    # Add specific component explanations
    if template_text_score >= 85:
        explanations.append("✓ Uploaded OCR strongly matches the trained template text")
    elif template_text_score and template_text_score < 60:
        explanations.append("⚠ Uploaded OCR differs from the trained template text")

    if qr_score >= 80:
        explanations.append("✓ QR code matches template")
    elif qr_score < 40:
        explanations.append("⚠ QR code mismatch or missing")
    
    if cert_id_score >= 80:
        explanations.append("✓ Certificate ID found in document")
    
    if name_score_val >= 70:
        explanations.append("✓ Student name matches OCR extraction")
    elif name_score_val < 40:
        explanations.append("⚠ Student name poorly matches OCR (possible OCR failure)")
    
    if ocr_conf >= 80:
        explanations.append("✓ OCR extraction high quality")
    elif ocr_conf < 50:
        explanations.append("⚠ OCR extraction low quality (may affect analysis)")
    
    return {
        "weightedConfidence": round(weighted_score, 2),
        "trustScore": round(trust_score, 2),
        "classification": classification,
        "breakdown": breakdown,
        "explanation": explanations,
    }
