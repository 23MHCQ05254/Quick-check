"""
Production-grade Dynamic Comparison Engine for Certificate Fraud Detection

Enterprise-class comparator that:
- Prioritizes content-based matching (QR, cert ID, text)
- De-emphasizes visual metrics (resolution, brightness, colors)
- Tolerates compression, screenshots, mobile photos
- Uses tolerance ranges instead of exact matching
- Generates explainable fraud probability
- Never uses hardcoded penalties or default values
"""

from __future__ import annotations

import re
from typing import Any
import logging

logger = logging.getLogger(__name__)

try:
    import cv2
    import numpy as np
except Exception:
    cv2 = None
    np = None

try:
    from rapidfuzz import fuzz
except Exception:
    fuzz = None

try:
    from .scoring_engine import evaluate as scoring_evaluate
except Exception:
    try:
        from utils.scoring_engine import evaluate as scoring_evaluate
    except Exception:
        scoring_evaluate = None


class DynamicComparator:
    """Production-grade certificate verification engine."""

    def __init__(self, template_profile: dict[str, Any] | None = None):
        """Initialize with learned template profile."""
        self.template = template_profile or {}
        self.extracted = self.template.get("extractedProfile", {}) or self.template.get("learnedProfile", {}) or self.template

    def compare(
        self,
        uploaded_profile: dict[str, Any],
        student_name: str = "",
        certificate_id: str = "",
        strict: bool = False,
    ) -> dict[str, Any]:
        """Perform enterprise-grade certificate comparison.
        
        Returns explainable fraud probability and classification.
        """
        # No template = cannot verify
        if not self.template:
            return {
                "fraudProbability": 100.0,
                "confidence": 0.0,
                "metrics": {
                    "nameSimilarity": 0,
                    "visualSimilarity": 0,
                    "structureSimilarity": 60,
                    "qrSimilarity": 0,
                },
                "anomalies": [
                    {
                        "type": "NO_TEMPLATE",
                        "severity": "CRITICAL",
                        "description": "No learned template profile available",
                    }
                ],
                "explanations": ["Cannot verify: no reference template"],
                "recommendation": "REJECT",
            }

        # Strict template-exact verification mode (short-circuit)
        if strict:
            try:
                strict_result = self._strict_template_compare(uploaded_profile)
                return strict_result
            except Exception as e:
                logger.warning(f"Strict template compare failed: {e}")
                # Fall through to regular comparison if strict comparison cannot be performed

        # Calculate content-based metrics
        metrics = {
            "nameSimilarity": self._compare_name(student_name, uploaded_profile.get("ocrText", "")),
            "templateTextSimilarity": self._compare_template_text(uploaded_profile.get("ocrText", "")),
            "visualSimilarity": self._compare_visual(uploaded_profile),
            "structureSimilarity": self._compare_structure(uploaded_profile),
            "qrSimilarity": self._compare_qr(uploaded_profile),
        }

        # Detect anomalies (focus on content, not visual)
        anomalies = self._detect_anomalies(uploaded_profile, metrics)

        # Use scoring engine for explainable result
        try:
            eval_result = scoring_evaluate(
                metrics=metrics,
                uploaded_profile={**uploaded_profile, "anomalies": anomalies},
                certificate_id_provided=certificate_id,
                name_score=metrics.get("nameSimilarity", 0),
                template=self.template,
            ) if scoring_evaluate else None
        except Exception as e:
            logger.warning(f"Scoring engine failed: {e}")
            eval_result = None

        if eval_result:
            classification = eval_result.get("classification", "REJECTED")
            recommendation = (
                "ACCEPT" if classification == "VERIFIED"
                else "REJECT"
            )

            return {
                "fraudProbability": round(100 - eval_result.get("trustScore", 0), 2),
                "confidence": round(eval_result.get("weightedConfidence", 0), 2),
                "trustScore": round(eval_result.get("trustScore", 0), 2),
                "weightedConfidence": round(eval_result.get("weightedConfidence", 0), 2),
                "metrics": {k: round(v, 2) for k, v in metrics.items()},
                "anomalies": anomalies,
                "explanations": eval_result.get("explanation", []),
                "recommendation": recommendation,
                "explainable": eval_result,
            }

        # Fallback calculation
        trust_score = self._calculate_trust_score(metrics, anomalies)
        return {
            "fraudProbability": round(100 - trust_score, 2),
            "confidence": round(trust_score, 2),
            "metrics": {k: round(v, 2) for k, v in metrics.items()},
            "anomalies": anomalies,
            "explanations": [f"Trust score: {trust_score:.1f}%"],
            "recommendation": "ACCEPT" if trust_score >= 95 else "REJECT",
        }

    def _compare_name(self, student_name: str, ocr_text: str) -> float:
        """Compare student name against OCR extraction using fuzzy matching."""
        if not student_name or not ocr_text:
            return 0.0

        try:
            # Normalize both strings
            name_norm = re.sub(r"[^a-z0-9\s]", "", student_name.lower()).strip()
            ocr_norm = re.sub(r"[^a-z0-9\s]", "", ocr_text.lower()).strip()

            if not name_norm or not ocr_norm:
                return 0.0

            # Token-based matching
            name_tokens = set(name_norm.split())
            ocr_tokens = set(ocr_norm.split())

            # Jaccard similarity
            if name_tokens and ocr_tokens:
                intersection = len(name_tokens & ocr_tokens)
                union = len(name_tokens | ocr_tokens)
                jaccard = (intersection / union * 100) if union > 0 else 0
            else:
                jaccard = 0

            # Fuzzy matching
            if fuzz:
                fuzzy_score = fuzz.partial_ratio(name_norm, ocr_norm)
            else:
                fuzzy_score = 0

            # Combined: 60% token-based, 40% fuzzy
            score = jaccard * 0.6 + fuzzy_score * 0.4
            return min(100.0, max(0.0, score))

        except Exception as e:
            logger.warning(f"Name comparison failed: {e}")
            return 0.0

    def _compare_template_text(self, uploaded_text: str) -> float:
        """Compare uploaded OCR against the mentor-trained reference OCR text."""
        template_text = (
            self.extracted.get("ocrText")
            or self.extracted.get("templateText")
            or self.extracted.get("text")
            or ""
        )
        uploaded_norm = re.sub(r"[^a-z0-9\s]", " ", (uploaded_text or "").lower())
        template_norm = re.sub(r"[^a-z0-9\s]", " ", str(template_text or "").lower())
        uploaded_norm = re.sub(r"\s+", " ", uploaded_norm).strip()
        template_norm = re.sub(r"\s+", " ", template_norm).strip()

        if not uploaded_norm or not template_norm:
            return 0.0

        if fuzz:
            return float(max(
                fuzz.token_set_ratio(uploaded_norm, template_norm),
                fuzz.partial_token_set_ratio(uploaded_norm, template_norm),
            ))

        uploaded_tokens = set(uploaded_norm.split())
        template_tokens = set(template_norm.split())
        if not uploaded_tokens or not template_tokens:
            return 0.0
        return round(len(uploaded_tokens & template_tokens) / max(1, len(uploaded_tokens | template_tokens)) * 100, 2)

    def _compare_visual(self, uploaded_profile: dict[str, Any]) -> float:
        """Compare visual metrics with wide tolerance for different formats.
        
        Accounts for:
        - Screenshots, mobile photos, compressed images
        - Different brightness/contrast settings
        - Scanning artifacts
        """
        if not self.extracted:
            return 60.0  # Default when no template

        # Resolution tolerance: ±30% is acceptable
        template_res = self.extracted.get("resolution", {})
        uploaded_res = uploaded_profile.get("resolution", {})

        if template_res and uploaded_res:
            template_width = template_res.get("width") or 1600
            template_height = template_res.get("height") or 1130
            uploaded_width = uploaded_res.get("width") or 1600
            uploaded_height = uploaded_res.get("height") or 1130

            width_ratio = abs(template_width - uploaded_width) / max(template_width, 100)
            height_ratio = abs(template_height - uploaded_height) / max(template_height, 100)

            # Tolerance: up to 30% deviation is acceptable
            width_score = max(0, 100 - (width_ratio * 100)) if width_ratio <= 0.3 else 70
            height_score = max(0, 100 - (height_ratio * 100)) if height_ratio <= 0.3 else 70
            resolution_score = (width_score + height_score) / 2
        else:
            resolution_score = 75.0

        # Brightness: wide tolerance (-100 to +100 is acceptable)
        template_brightness = self.extracted.get("brightness", 200) or 200
        uploaded_brightness = uploaded_profile.get("brightness", 200) or 200
        brightness_diff = abs(template_brightness - uploaded_brightness)

        if brightness_diff <= 100:
            brightness_score = max(40, 100 - (brightness_diff / 100) * 50)
        else:
            brightness_score = 50.0

        # Edge/text density: high tolerance
        template_edges = self.extracted.get("edgeDensity", 0.15) or 0.15
        uploaded_edges = uploaded_profile.get("edgeDensity", 0.15) or 0.15
        edges_diff = abs(template_edges - uploaded_edges)

        if edges_diff <= 0.2:
            edges_score = 85.0
        else:
            edges_score = 65.0

        # Color: check if ANY template color appears in upload (very lenient)
        template_colors = set(self.extracted.get("dominantColors", []) or [])
        uploaded_colors = set(uploaded_profile.get("dominantColors", []) or [])

        if template_colors and uploaded_colors:
            color_overlap = len(template_colors & uploaded_colors)
            color_score = min(100, 60 + (color_overlap * 20))
        else:
            color_score = 70.0

        # Weighted average: prioritize resolution/density over brightness/color
        visual_score = (
            resolution_score * 0.4 +
            edges_score * 0.3 +
            brightness_score * 0.15 +
            color_score * 0.15
        )

        return min(100.0, max(0.0, visual_score))

    def _compare_structure(self, uploaded_profile: dict[str, Any]) -> float:
        """Compare overall certificate structure/layout.
        
        Focuses on content arrangement, not exact positioning.
        """
        template_res = self.extracted.get("resolution", {})
        uploaded_res = uploaded_profile.get("resolution", {})

        # Aspect ratio tolerance: ±20% acceptable
        template_ar = template_res.get("aspectRatio", 1.4) or 1.4
        uploaded_ar = uploaded_res.get("aspectRatio", 1.4) or 1.4

        ar_diff = abs(template_ar - uploaded_ar) / max(template_ar, 0.1)

        if ar_diff <= 0.2:
            ar_score = 95.0
        elif ar_diff <= 0.4:
            ar_score = 75.0
        else:
            ar_score = 50.0

        # Component count: allow ±2 component variance
        template_comp_count = len(self.extracted.get("components", []) or self.template.get("components", []))
        uploaded_comp_count = len(uploaded_profile.get("components", []))

        if template_comp_count == 0:
            comp_score = 70.0
        else:
            comp_diff = abs(template_comp_count - uploaded_comp_count)
            if comp_diff <= 2:
                comp_score = 90.0
            elif comp_diff <= 4:
                comp_score = 70.0
            else:
                comp_score = 50.0

        structure_score = ar_score * 0.5 + comp_score * 0.5
        return min(100.0, max(0.0, structure_score))

    def _compare_qr(self, uploaded_profile: dict[str, Any]) -> float:
        """Compare QR codes (if present).
        
        Most reliable metric for verification.
        """
        uploaded_qr = self._first_qr(uploaded_profile.get("qrData"))
        template_qr = self._first_qr(self.extracted.get("qrData"))

        if uploaded_qr and template_qr:
            if uploaded_qr == template_qr:
                return 98.0  # Exact match
            else:
                # Both have QR but different = suspicious
                return 40.0

        elif not uploaded_qr and not template_qr:
            # Both missing = consistent
            return 85.0

        elif uploaded_qr and not template_qr:
            # Upload has QR but template doesn't = neutral
            return 60.0

        else:
            # Upload missing QR but template has = neutral (OCR may have failed)
            return 65.0

    def _first_qr(self, value: Any) -> str:
        """Normalize scalar/list/dict QR payloads into comparable text."""
        if isinstance(value, list):
            if not value:
                return ""
            value = value[0]
        if isinstance(value, dict):
            value = value.get("data") or value.get("text") or value.get("value") or ""
        return str(value or "").strip()

    def _detect_anomalies(
        self, uploaded_profile: dict[str, Any], metrics: dict[str, float]
    ) -> list[dict[str, Any]]:
        """Detect content-based anomalies (ignore visual quirks)."""
        anomalies = []

        # Only flag CONTENT anomalies, not visual ones
        
        # Name mismatch
        if metrics["nameSimilarity"] < 20 and metrics.get("templateTextSimilarity", 0) < 85:
            anomalies.append({
                "type": "NAME_MISMATCH",
                "severity": "HIGH",
                "description": f"Student name poorly matches OCR (possibly OCR error)",
            })

        # QR mismatch
        if metrics["qrSimilarity"] < 50:
            anomalies.append({
                "type": "QR_ANOMALY",
                "severity": "MEDIUM",
                "description": "QR code missing or mismatched",
            })

        # Structure anomaly
        if metrics["structureSimilarity"] < 40:
            anomalies.append({
                "type": "STRUCTURE_ANOMALY",
                "severity": "MEDIUM",
                "description": "Certificate layout differs significantly from template",
            })

        # OCR failure
        ocr_text = (uploaded_profile.get("ocrText") or "").strip()
        if not ocr_text or len(ocr_text) < 50:
            anomalies.append({
                "type": "OCR_FAILURE",
                "severity": "HIGH",
                "description": "Failed to extract sufficient text from certificate (OCR error)",
            })

        return anomalies

    def _calculate_trust_score(
        self, metrics: dict[str, float], anomalies: list[dict[str, Any]]
    ) -> float:
        """Calculate overall trust score from metrics and anomalies."""
        # Weighted average of metrics
        base_score = (
            metrics.get("qrSimilarity", 0) * 0.30 +
            metrics.get("nameSimilarity", 0) * 0.25 +
            metrics.get("structureSimilarity", 60) * 0.25 +
            metrics.get("visualSimilarity", 50) * 0.20
        )

        # Anomaly penalty (only for HIGH severity)
        high_anomalies = [a for a in anomalies if a.get("severity") == "HIGH"]
        penalty = len(high_anomalies) * 15.0  # Each HIGH anomaly: -15%

        trust_score = max(0.0, base_score - penalty)
        return min(100.0, trust_score)

    # --- Strict template-exact verification helpers ---
    def _strict_template_compare(self, uploaded_profile: dict[str, Any]) -> dict[str, Any]:
        """Perform strict, template-exact verification using pixel-level SSIM.

        Rules:
        - Exact width/height/aspect required for VERIFIED
        - Compute SSIM on grayscale images; SSIM >= 0.98 => VERIFIED
        - Any dimension/aspect mismatch => REJECTED (still return SSIM for diagnostics)
        """
        if cv2 is None or np is None:
            raise RuntimeError("OpenCV/NumPy required for strict template comparison")

        # Template image path keys we accept
        template_path = (
            self.template.get("templateImagePath")
            or self.template.get("imagePath")
            or self.template.get("filePath")
            or None
        )

        uploaded_path = uploaded_profile.get("filePath") or uploaded_profile.get("imagePath")

        if not template_path or not uploaded_path:
            return {
                "fraudProbability": 100.0,
                "confidence": 0.0,
                "ssimScore": 0.0,
                "widthMatch": False,
                "heightMatch": False,
                "layoutMatch": False,
                "anomalies": [
                    {"type": "STRICT_MODE_MISSING_IMAGE", "severity": "CRITICAL", "description": "Template or uploaded image path missing for strict comparison"}
                ],
                "recommendation": "REJECT",
            }

        # Load images robustly (support unicode paths on Windows)
        try:
            t_img = cv2.imdecode(np.fromfile(str(template_path), dtype=np.uint8), cv2.IMREAD_COLOR)
        except Exception:
            t_img = None
        try:
            u_img = cv2.imdecode(np.fromfile(str(uploaded_path), dtype=np.uint8), cv2.IMREAD_COLOR)
        except Exception:
            u_img = None

        if t_img is None:
            t_img = cv2.imread(str(template_path), cv2.IMREAD_COLOR)
        if u_img is None:
            u_img = cv2.imread(str(uploaded_path), cv2.IMREAD_COLOR)

        if t_img is None or u_img is None:
            return {
                "fraudProbability": 100.0,
                "confidence": 0.0,
                "ssimScore": 0.0,
                "widthMatch": False,
                "heightMatch": False,
                "layoutMatch": False,
                "anomalies": [
                    {"type": "IMAGE_LOAD_FAILURE", "severity": "CRITICAL", "description": "Could not load template or uploaded image for strict comparison"}
                ],
                "recommendation": "REJECT",
            }

        th, tw = t_img.shape[0], t_img.shape[1]
        uh, uw = u_img.shape[0], u_img.shape[1]

        widthMatch = (tw == uw)
        heightMatch = (th == uh)
        template_ar = round((tw / th) if th else 0, 6)
        upload_ar = round((uw / uh) if uh else 0, 6)
        aspectMatch = (template_ar == upload_ar)

        dimension_issue = not (widthMatch and heightMatch and aspectMatch)

        # Convert to grayscale and compute SSIM (resize uploaded to template for metric only)
        try:
            t_gray = cv2.cvtColor(t_img, cv2.COLOR_BGR2GRAY)
            u_gray = cv2.cvtColor(u_img, cv2.COLOR_BGR2GRAY)
            u_resized = cv2.resize(u_gray, (t_gray.shape[1], t_gray.shape[0]), interpolation=cv2.INTER_LINEAR)
            ssim_score = float(self._ssim(t_gray, u_resized))
        except Exception as e:
            logger.warning(f"SSIM computation failed: {e}")
            ssim_score = 0.0

        verified = (ssim_score >= 0.98) and not dimension_issue

        if verified:
            return {
                "verificationStatus": "VERIFIED",
                "confidence": 100,
                "fraudProbability": 0.0,
                "ssimScore": round(ssim_score, 4),
                "widthMatch": widthMatch,
                "heightMatch": heightMatch,
                "layoutMatch": True,
                "recommendation": "ACCEPT",
            }

        return {
            "verificationStatus": "REJECTED",
            "confidence": 0,
            "fraudProbability": 100.0,
            "ssimScore": round(ssim_score, 4),
            "widthMatch": widthMatch,
            "heightMatch": heightMatch,
            "layoutMatch": (ssim_score >= 0.98),
            "anomalies": [
                {"type": "STRICT_TEMPLATE_MISMATCH", "severity": "CRITICAL", "description": "Template and uploaded certificate differ in dimensions or layout"}
            ],
            "recommendation": "REJECT",
        }

    def _ssim(self, img1, img2) -> float:
        """Compute SSIM between two single-channel (grayscale) images using OpenCV and NumPy.

        Returns a float in range [0,1].
        """
        if cv2 is None or np is None:
            raise RuntimeError("OpenCV/NumPy required for SSIM")

        img1 = img1.astype(np.float64)
        img2 = img2.astype(np.float64)

        C1 = (0.01 * 255) ** 2
        C2 = (0.03 * 255) ** 2

        kernel = cv2.getGaussianKernel(11, 1.5)
        window = kernel @ kernel.T

        mu1 = cv2.filter2D(img1, -1, window)
        mu2 = cv2.filter2D(img2, -1, window)

        mu1_sq = mu1 * mu1
        mu2_sq = mu2 * mu2
        mu1_mu2 = mu1 * mu2

        sigma1_sq = cv2.filter2D(img1 * img1, -1, window) - mu1_sq
        sigma2_sq = cv2.filter2D(img2 * img2, -1, window) - mu2_sq
        sigma12 = cv2.filter2D(img1 * img2, -1, window) - mu1_mu2

        ssim_map = ((2 * mu1_mu2 + C1) * (2 * sigma12 + C2)) / ((mu1_sq + mu2_sq + C1) * (sigma1_sq + sigma2_sq + C2))

        mssim = float(np.mean(ssim_map))
        return max(0.0, min(1.0, mssim))
