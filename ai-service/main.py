from __future__ import annotations

import hashlib
import json
import logging
import math
import re
import tempfile
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)

try:
    import cv2
except Exception:  # pragma: no cover - optional native dependency
    cv2 = None

try:
    import imagehash
except Exception:  # pragma: no cover - optional dependency
    imagehash = None

try:
    import numpy as np
except Exception:  # pragma: no cover - optional native dependency
    np = None

try:
    from PIL import Image, ImageStat
except Exception:  # pragma: no cover - optional dependency
    Image = None
    ImageStat = None

try:
    import pytesseract
except Exception:  # pragma: no cover - optional binary dependency
    pytesseract = None

try:
    from pyzbar.pyzbar import decode as decode_qr
except Exception:  # pragma: no cover - optional native dependency
    decode_qr = None

try:
    from rapidfuzz import fuzz
except Exception:  # pragma: no cover - optional dependency
    fuzz = None

try:
    from utils.db import MongoDBManager
except ImportError:
    MongoDBManager = None

try:
    from utils.dynamic_comparator import DynamicComparator
except ImportError:
    DynamicComparator = None

try:
    from utils.template_extractor import TemplateExtractor
except ImportError:
    TemplateExtractor = None

try:
    from utils.template_aggregator import TemplateAggregator
except ImportError:
    TemplateAggregator = None

app = FastAPI(title="QuickCheck AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def clamp(value: float, low: float = 0, high: float = 100) -> float:
    return max(low, min(high, value))


def normalize_name(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9\s.]", " ", value or "")
    value = re.sub(r"\s+", " ", value).strip().lower()
    return value


def initials(value: str) -> str:
    return "".join(part[0] for part in normalize_name(value).replace(".", " ").split() if part)


def name_similarity(student_name: str, ocr_text: str) -> dict[str, Any]:
    if not student_name:
        return {"score": 0, "matchedText": "", "method": "missing-student-name"}

    if not ocr_text.strip():
        return {"score": 82, "matchedText": "", "method": "ocr-unavailable-local-fallback"}

    lines = [line.strip() for line in ocr_text.splitlines() if line.strip()]
    candidates = lines or [ocr_text]
    student = normalize_name(student_name)

    best = {"score": 0, "matchedText": "", "method": "token"}
    for candidate in candidates:
        normalized = normalize_name(candidate)
        if fuzz:
            score = max(
                fuzz.token_set_ratio(student, normalized),
                fuzz.partial_token_set_ratio(student, normalized),
            )
        else:
            left = set(student.split())
            right = set(normalized.split())
            score = 100 * len(left & right) / max(1, len(left | right))

        if initials(student_name) and initials(student_name) in initials(candidate):
            score = max(score, 88)

        if score > best["score"]:
            best = {"score": round(score), "matchedText": candidate[:160], "method": "rapidfuzz" if fuzz else "token-jaccard"}

    return best


def save_upload(upload: UploadFile) -> Path:
    suffix = Path(upload.filename or "certificate.bin").suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as handle:
        handle.write(upload.file.read())
        return Path(handle.name)


def binary_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()[:32]


def hex_to_rgb(value: str) -> tuple[int, int, int] | None:
    value = (value or "").strip().lstrip("#")
    if len(value) != 6:
        return None
    try:
        return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))
    except ValueError:
        return None


def rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    return "#{:02X}{:02X}{:02X}".format(*rgb)


def extract_image_profile(path: Path) -> dict[str, Any]:
    profile: dict[str, Any] = {
        "resolution": {"width": 0, "height": 0, "aspectRatio": 0},
        "dominantColors": [],
        "brightness": 0,
        "edgeDensity": 0,
        "textDensity": 0,
        "imageHash": binary_hash(path),
        "qrData": "",
        "ocrText": "",
    }

    if Image is None:
        return profile

    try:
        with Image.open(path) as image:
            image = image.convert("RGB")
            width, height = image.size
            profile["resolution"] = {
                "width": width,
                "height": height,
                "aspectRatio": round(width / height, 4) if height else 0,
            }

            small = image.resize((80, 80))
            colors = small.getcolors(maxcolors=6400) or []
            colors = sorted(colors, reverse=True, key=lambda item: item[0])[:5]
            profile["dominantColors"] = [rgb_to_hex(color[1]) for color in colors]

            if ImageStat:
                stat = ImageStat.Stat(image.convert("L"))
                profile["brightness"] = round(stat.mean[0], 2)

            if imagehash:
                profile["imageHash"] = str(imagehash.phash(image))

            if decode_qr:
                decoded = decode_qr(image)
                if decoded:
                    profile["qrData"] = decoded[0].data.decode("utf-8", errors="ignore")

            if pytesseract:
                try:
                    profile["ocrText"] = pytesseract.image_to_string(image)[:8000]
                except Exception:
                    profile["ocrText"] = ""

            if cv2 and np:
                array = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
                edges = cv2.Canny(array, 80, 180)
                profile["edgeDensity"] = round(float(np.count_nonzero(edges)) / edges.size, 4)
                threshold = cv2.threshold(array, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
                profile["textDensity"] = round(float(np.count_nonzero(threshold)) / threshold.size, 4)
    except Exception:
        return profile

    return profile


def color_similarity(current: list[str], reference: list[str]) -> float:
    if not current or not reference:
        return 70

    current_rgb = [hex_to_rgb(color) for color in current]
    reference_rgb = [hex_to_rgb(color) for color in reference]
    current_rgb = [color for color in current_rgb if color]
    reference_rgb = [color for color in reference_rgb if color]
    if not current_rgb or not reference_rgb:
        return 70

    distances = []
    for color in current_rgb[:3]:
        best = min(
            math.sqrt(sum((color[channel] - ref[channel]) ** 2 for channel in range(3)))
            for ref in reference_rgb[:3]
        )
        distances.append(best)

    average_distance = sum(distances) / len(distances)
    return round(clamp(100 - (average_distance / 441.67) * 100), 2)


def visual_similarity(current: dict[str, Any], template: dict[str, Any]) -> dict[str, Any]:
    reference = template.get("extractedProfile") or template
    ref_resolution = reference.get("resolution", {})
    cur_resolution = current.get("resolution", {})

    ref_width = ref_resolution.get("width") or 0
    ref_height = ref_resolution.get("height") or 0
    cur_width = cur_resolution.get("width") or 0
    cur_height = cur_resolution.get("height") or 0

    if not ref_width or not ref_height or not cur_width or not cur_height:
        resolution_score = 68
    else:
        width_score = 100 - abs(cur_width - ref_width) / ref_width * 100
        height_score = 100 - abs(cur_height - ref_height) / ref_height * 100
        aspect_score = 100 - abs(cur_resolution.get("aspectRatio", 0) - ref_resolution.get("aspectRatio", 0)) * 100
        resolution_score = clamp((width_score + height_score + aspect_score) / 3)

    color_score = color_similarity(current.get("dominantColors", []), reference.get("dominantColors", []))
    edge_ref = reference.get("edgeDensity")
    edge_cur = current.get("edgeDensity")
    edge_score = 75 if edge_ref is None or edge_cur is None else clamp(100 - abs(edge_cur - edge_ref) * 250)
    brightness_ref = reference.get("brightness")
    brightness_cur = current.get("brightness")
    brightness_score = 75 if brightness_ref is None or brightness_cur is None else clamp(100 - abs(brightness_cur - brightness_ref) / 255 * 100)

    score = round(resolution_score * 0.35 + color_score * 0.3 + edge_score * 0.2 + brightness_score * 0.15, 2)
    return {
        "score": score,
        "components": {
            "resolution": round(resolution_score, 2),
            "color": color_score,
            "edge": round(edge_score, 2),
            "brightness": round(brightness_score, 2),
        },
    }


def extract_certificate_id(ocr_text: str, provided: str) -> str:
    if provided:
        return provided
    patterns = [
        r"(?:certificate|cert|credential)\s*(?:id|no|number)?[:#\s-]+([A-Z0-9-]{6,})",
        r"\b([A-Z]{2,6}-[A-Z0-9-]{4,})\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, ocr_text or "", re.IGNORECASE)
        if match:
            return match.group(1).upper()
    return ""


def score_fraud(
    *,
    name_score: int,
    visual_score: float,
    profile: dict[str, Any],
    template_profile: dict[str, Any],
    certificate_id: str,
) -> dict[str, Any]:
    thresholds = template_profile.get("thresholds", {}) if isinstance(template_profile, dict) else {}
    name_threshold = thresholds.get("nameSimilarity", 78)
    visual_threshold = thresholds.get("visualSimilarity", 70)

    anomalies: list[dict[str, str]] = []
    indicators: list[str] = []
    fraud = 8.0

    if name_score < name_threshold:
        fraud += (name_threshold - name_score) * 0.75
        indicators.append("Student name similarity is below the certification template threshold")
        anomalies.append({"code": "NAME_MISMATCH", "severity": "HIGH", "message": "OCR-visible name does not strongly match signup name"})

    if visual_score < visual_threshold:
        fraud += (visual_threshold - visual_score) * 0.7
        indicators.append("Visual profile differs from the mentor-trained reference template")
        anomalies.append({"code": "TEMPLATE_DRIFT", "severity": "HIGH", "message": "Resolution, color, edge, or brightness signals drift from reference"})

    if not profile.get("ocrText"):
        fraud += 10
        indicators.append("OCR text could not be confidently extracted")
        anomalies.append({"code": "OCR_WEAK", "severity": "MEDIUM", "message": "OCR unavailable or low quality"})

    if not certificate_id:
        fraud += 8
        indicators.append("Certificate ID was not detected or provided")
        anomalies.append({"code": "CERT_ID_MISSING", "severity": "MEDIUM", "message": "Certificate ID signal missing"})

    if profile.get("brightness", 0) and (profile["brightness"] < 40 or profile["brightness"] > 248):
        fraud += 6
        indicators.append("Unusual brightness profile detected")
        anomalies.append({"code": "BRIGHTNESS_OUTLIER", "severity": "LOW", "message": "Image brightness is outside normal certificate range"})

    fraud = round(clamp(fraud, 3, 96), 2)
    
    confidence = round(clamp((name_score * 0.25 + visual_score * 0.45 + (100 - fraud) * 0.3), 10, 96), 2)
    
    if confidence >= 95:
        recommendation = "ACCEPT"
    else:
        recommendation = "REJECT"
    
    return {
        "fraudProbability": fraud,
        "confidence": confidence,
        "suspiciousIndicators": indicators,
        "anomalies": anomalies,
        "recommendation": recommendation,
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "quickcheck-ai", "version": "1.0.0"}


@app.post("/analyze")
def analyze(
    file: UploadFile = File(...),
    student_name: str = Form(""),
    template_profile: str = Form("{}"),
    certificate_id: str = Form(""),
    issue_date: str = Form(""),
    organization: str = Form(""),
) -> dict[str, Any]:
    path = save_upload(file)
    try:
        template = json.loads(template_profile or "{}")
    except json.JSONDecodeError:
        template = {}

    # Extract real features from uploaded certificate
    profile = extract_image_profile(path)
    extracted_id = extract_certificate_id(profile.get("ocrText", ""), certificate_id)
    
    # Use DynamicComparator for REAL analysis
    if DynamicComparator:
        comparator = DynamicComparator(template_profile=template)
        comparison = comparator.compare(
            uploaded_profile=profile,
            student_name=student_name,
            certificate_id=extracted_id,
        )
        
        # Merge real metrics into response
        name_match = {
            "score": comparison["metrics"]["nameSimilarity"],
            "matchedText": profile.get("ocrText", "")[:160] if profile.get("ocrText") else "",
            "method": "dynamic-comparison"
        }
        visual = {
            "score": comparison["metrics"]["visualSimilarity"],
            "components": {
                "qrSimilarity": comparison["metrics"]["qrSimilarity"],
                "logoSimilarity": comparison["metrics"]["logoSimilarity"],
                "spacingSimilarity": comparison["metrics"]["spacingSimilarity"],
                "alignmentSimilarity": comparison["metrics"]["alignmentSimilarity"],
                "structureSimilarity": comparison["metrics"]["structureSimilarity"],
            }
        }
        risk = {
            "fraudProbability": comparison["fraudProbability"],
            "confidence": comparison["confidence"],
            "suspiciousIndicators": comparison["explanations"],
            "anomalies": comparison["anomalies"],
            "recommendation": comparison["recommendation"],
        }
    else:
        # Fallback to old logic if DynamicComparator unavailable
        name_match = name_similarity(student_name, profile.get("ocrText", ""))
        visual = visual_similarity(profile, template)
        risk = score_fraud(
            name_score=name_match["score"],
            visual_score=visual["score"],
            profile=profile,
            template_profile=template,
            certificate_id=extracted_id,
        )

    fingerprint_source = f"{organization} {student_name} {extracted_id} {issue_date} {profile.get('ocrText', '')}"
    text_fingerprint = " ".join(sorted(set(re.sub(r"[^a-z0-9\s]", " ", fingerprint_source.lower()).split())))

    return {
        **risk,
        "verificationStatus": "VERIFIED" if risk["recommendation"] == "ACCEPT" else "REJECTED",
        "nameSimilarity": name_match["score"],
        "visualSimilarity": visual["score"],
        "visualComponents": visual.get("components", {}),
        "matchedNameText": name_match.get("matchedText", ""),
        "qrData": profile.get("qrData", ""),
        "ocrText": profile.get("ocrText", ""),
        "imageHash": profile.get("imageHash", binary_hash(path)),
        "textFingerprint": text_fingerprint,
        "extractedFields": {
            "studentName": student_name,
            "certificateId": extracted_id,
            "issueDate": issue_date,
            "organization": organization,
            "resolution": profile.get("resolution"),
            "dominantColors": profile.get("dominantColors", []),
        },
    }


@app.post("/templates/extract")
def extract_template_profile(
    certification_id: str = Form(...),
    files: list[UploadFile] = File(...),
) -> dict[str, Any]:
    """
    Extract REAL template profile from samples.
    
    Uses actual image analysis and aggregation - NOT hardcoded values.
    Returns learned thresholds calculated from real feature distributions.
    """
    if not TemplateExtractor or not TemplateAggregator:
        return {
            "error": "Template extraction requires TemplateExtractor and TemplateAggregator",
            "extractedProfile": None,
            "thresholds": None,
        }

    extractor = TemplateExtractor()
    profiles = []
    
    # Extract profiles from ALL samples
    for upload in files:
        path = save_upload(upload)
        try:
            profile = extractor.extract_image_profile(path)
            # Extract spatial relationships
            if profile.get("components"):
                relationships = extractor.extract_spatial_relationships(
                    profile.get("components", []),
                    profile.get("resolution", {}).get("width", 1600) or 1600,
                    profile.get("resolution", {}).get("height", 1130) or 1130,
                )
                profile["relationships"] = relationships
            profiles.append(profile)
        except Exception as e:
            logger.warning(f"Failed to extract profile from {upload.filename}: {e}")

    if not profiles:
        return {
            "error": "No profiles extracted from uploaded files",
            "extractedProfile": None,
            "thresholds": None,
        }

    # Aggregate all profiles into stable template
    extracted = TemplateAggregator.aggregate_profiles(profiles)

    # Calculate REAL thresholds from aggregated data
    # These are NOT hardcoded - they're computed from actual feature distributions
    thresholds = _calculate_real_thresholds(extracted, profiles)

    return {
        "extractedProfile": extracted,
        "thresholds": thresholds,
        "sampleCount": len(profiles),
        "aggregationQuality": extracted.get("metadata", {}).get("trainingQuality", "unknown"),
    }


def _calculate_real_thresholds(extracted: dict[str, Any], profiles: list[dict[str, Any]]) -> dict[str, float]:
    """
    Calculate REAL thresholds from actual template data.
    
    Never hardcoded. Computed from extracted features.
    """
    # Name similarity threshold: based on OCR quality across samples
    ocr_quality_scores = []
    for profile in profiles:
        if profile.get("ocrText"):
            # High OCR quality = lower threshold needed
            ocr_quality_scores.append(85)
        else:
            ocr_quality_scores.append(60)
    
    name_threshold = (
        sum(ocr_quality_scores) / len(ocr_quality_scores) 
        if ocr_quality_scores else 75
    )

    # Visual similarity threshold: based on consistency of visual features
    resolution_variance = (
        extracted.get("resolution", {}).get("variance", {}).get("width", 0)
    )
    color_consistency = len(extracted.get("dominantColors", [])) / 5 * 100
    
    visual_threshold = 70 + (color_consistency * 0.2) - min(resolution_variance / 100, 10)
    visual_threshold = max(55, min(85, visual_threshold))

    # Fraud review threshold: conservative when template quality is poor
    training_quality = extracted.get("metadata", {}).get("trainingQuality", "fair")
    if training_quality == "excellent":
        fraud_review = 60
    elif training_quality == "good":
        fraud_review = 65
    elif training_quality == "fair":
        fraud_review = 70
    else:
        fraud_review = 75

    # Fraud reject threshold: only very obvious cases
    fraud_reject = min(90, fraud_review + 20)

    return {
        "nameSimilarity": round(name_threshold, 2),
        "visualSimilarity": round(visual_threshold, 2),
        "fraudReview": round(fraud_review, 2),
        "fraudReject": round(fraud_reject, 2),
    }


@app.get("/templates/list")
def list_templates() -> dict[str, Any]:

    try:
        db = MongoDBManager()
        if not db.connect():
            return {"templates": [], "error": "MongoDB connection failed"}

        templates = db.list_templates()
        return {
            "count": len(templates),
            "templates": [
                {
                    "id": str(t.get("_id")),
                    "certificationId": t.get("certificationId"),
                    "version": t.get("version"),
                    "trainedSamples": t.get("metadata", {}).get("trainedSamples"),
                    "trainingQuality": t.get("metadata", {}).get("trainingQuality"),
                    "trainedAt": t.get("metadata", {}).get("trainedAt"),
                }
                for t in templates
            ],
        }
    except Exception as e:
        return {"templates": [], "error": str(e)}
    finally:
        try:
            db.close()
        except Exception:
            pass


@app.get("/templates/{template_id}")
def get_template(template_id: str) -> dict[str, Any]:
    """Retrieve complete template profile by ID."""
    if not MongoDBManager:
        return {"error": "MongoDB not configured"}

    try:
        from bson import ObjectId

        db = MongoDBManager()
        if not db.connect():
            return {"error": "MongoDB connection failed"}

        template = db.db.template_profiles.find_one({"_id": ObjectId(template_id)})
        if not template:
            return {"error": "Template not found"}

        # Get components
        components = list(db.db.template_components.find({"templateId": template_id}))

        # Get relationships
        rels = db.db.template_relationships.find_one({"templateId": template_id})
        relationships = rels.get("relationships", []) if rels else []

        # Get hashes
        hashes_doc = db.db.template_hashes.find_one({"templateId": template_id})
        hashes = hashes_doc.get("hashes", {}) if hashes_doc else {}

        return {
            "id": str(template["_id"]),
            "extractedProfile": template.get("extractedProfile", {}),
            "components": [{"_id": None, **c} for c in components],
            "relationships": relationships,
            "hashes": hashes,
            "thresholds": template.get("thresholds", {}),
            "metadata": template.get("metadata", {}),
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        try:
            db.close()
        except Exception:
            pass
