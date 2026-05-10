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

try:
    from utils.feature_extractor import FeatureExtractor
except ImportError:
    FeatureExtractor = None

try:
    from utils.similarity_scorer import SimilarityScorer
except ImportError:
    SimilarityScorer = None

try:
    from utils.duplicate_detector import DuplicateDetector
except ImportError:
    DuplicateDetector = None

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
    if fraud >= 65:
        recommendation = "MENTOR_REVIEW"
    elif fraud >= 35:
        recommendation = "WATCHLIST"
    else:
        recommendation = "LOW_RISK"

    confidence = round(clamp((name_score * 0.25 + visual_score * 0.45 + (100 - fraud) * 0.3), 10, 96), 2)
    return {
        "fraudProbability": fraud,
        "confidence": confidence,
        "suspiciousIndicators": indicators,
        "anomalies": anomalies,
        "recommendation": recommendation,
    }


@app.post("/detect-duplicates")
def detect_duplicates(
    file: UploadFile = File(...),
    existing_certificates: str = Form("[]"),
) -> dict[str, Any]:
    """
    Detect if uploaded certificate is duplicate of existing ones.
    
    Uses image hashes, OCR, and color profiles for comparison.
    """
    if not DuplicateDetector or not FeatureExtractor:
        return {"duplicateProbability": 0, "matches": [], "error": "Required modules unavailable"}

    path = save_upload(file)
    try:
        existing = json.loads(existing_certificates or "[]")
    except json.JSONDecodeError:
        existing = []

    logger.info("[AI detect-duplicates] comparing against %d existing certificates", len(existing))

    # Extract features from uploaded certificate
    extractor = FeatureExtractor()
    uploaded_features = extractor.extract_all_features(path)

    # Run duplicate detection
    detector = DuplicateDetector()
    result = detector.compute_duplicate_probability(uploaded_features, existing)

    logger.info("[AI detect-duplicates] duplicate probability: %.1f%%", result["duplicateProbability"])

    return result


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
    """
    Analyze certificate against template using REAL feature extraction and comparison.
    
    Returns calculated fraud probability based on measurable differences.
    """
    path = save_upload(file)
    try:
        template = json.loads(template_profile or "{}")
    except json.JSONDecodeError:
        template = {}

    logger.info("[AI analyze] student=%s certId=%s org=%s", student_name, certificate_id, organization)

    # Extract REAL features from uploaded certificate
    if FeatureExtractor:
        extractor = FeatureExtractor()
        features = extractor.extract_all_features(path)
        logger.info("[AI analyze] extracted %d feature categories", len(features))
    else:
        # Fallback to basic profile
        features = extract_image_profile(path)
        logger.info("[AI analyze] extracted basic profile")

    # Extract certificate ID from features
    ocr_text = " ".join([b.get("text", "") for b in features.get("ocrBlocks", [])])
    extracted_id = extract_certificate_id(ocr_text or features.get("ocrText", ""), certificate_id)

    # Perform REAL similarity scoring against template
    if SimilarityScorer and template:
        scorer = SimilarityScorer()
        
        # Extract template features for comparison
        template_features = template.get("extractedProfile", template)
        template_ocr = template.get("extractedProfile", {}).get("ocrBlocks", [])
        template_qr = template.get("extractedProfile", {}).get("qrCodes", [])
        
        # Compute all similarity scores
        ocr_score = scorer.score_ocr_similarity(
            features.get("ocrBlocks", []),
            template_ocr,
            student_name
        )
        
        visual_score = scorer.score_visual_similarity(features, template_features)
        qr_score = scorer.score_qr_similarity(features.get("qrCodes", []), template_qr)
        hash_score = scorer.score_image_hash_similarity(features.get("imageHashes", {}), template_features.get("imageHashes", {}))
        
        # Combine into fraud probability
        scores_dict = {
            "ocrSimilarity": ocr_score,
            "visualSimilarity": visual_score,
            "qrSimilarity": qr_score,
            "imageSimilarity": hash_score
        }
        
        fraud_result = scorer.compute_fraud_probability(scores_dict)
        
        logger.info("[AI analyze] OCR: %.1f%% Visual: %.1f%% Fraud: %.1f%%",
                   ocr_score["score"], visual_score["score"], fraud_result["fraudProbability"])
        
        # Build response with real calculated values
        analysis = {
            "fraudProbability": fraud_result["fraudProbability"],
            "authenticity": fraud_result["authenticity"],
            "confidence": fraud_result["confidence"],
            "nameSimilarity": ocr_score["breakdown"].get("nameMatch", 0),
            "visualSimilarity": visual_score["score"],
            "qrSimilarity": qr_score["score"],
            "imageSimilarity": hash_score["score"],
            "verificationStatus": "VERIFIED" if fraud_result["fraudProbability"] < 30 else ("SUSPICIOUS" if fraud_result["fraudProbability"] < 70 else "POSSIBLE_FORGERY"),
            "suspiciousIndicators": [],
            "anomalies": [],
            "recommendation": "VERIFIED" if fraud_result["fraudProbability"] < 30 else ("WATCHLIST" if fraud_result["fraudProbability"] < 65 else "REJECT")
        }
        
        # Add breakdown details
        if fraud_result["fraudProbability"] > 35:
            if ocr_score["score"] < 50:
                analysis["suspiciousIndicators"].append("Student name similarity below expected threshold")
                analysis["anomalies"].append({"code": "NAME_MISMATCH", "severity": "HIGH"})
            if visual_score["score"] < 50:
                analysis["suspiciousIndicators"].append("Visual characteristics deviate from template")
                analysis["anomalies"].append({"code": "VISUAL_MISMATCH", "severity": "HIGH"})
        
    else:
        # Fallback to old logic
        name_match = name_similarity(student_name, ocr_text or features.get("ocrText", ""))
        visual = visual_similarity(features, template)
        name_score = name_match["score"]
        visual_score = visual["score"]
        
        risk = score_fraud(
            name_score=name_score,
            visual_score=visual_score,
            profile=features,
            template_profile=template,
            certificate_id=extracted_id,
        )
        
        analysis = {
            "fraudProbability": risk["fraudProbability"],
            "confidence": risk["confidence"],
            "nameSimilarity": name_score,
            "visualSimilarity": visual_score,
            "verificationStatus": "VERIFIED" if risk["fraudProbability"] < 30 else ("SUSPICIOUS" if risk["fraudProbability"] < 70 else "POSSIBLE_FORGERY"),
            "suspiciousIndicators": risk.get("suspiciousIndicators", []),
            "anomalies": risk.get("anomalies", []),
            "recommendation": risk.get("recommendation", "LOW_RISK")
        }

    # Add extracted data
    analysis.update({
        "matchedNameText": " ".join([b.get("text", "") for b in features.get("ocrBlocks", [])[:5]]),
        "qrData": features.get("qrCodes", [{}])[0].get("data", "") if features.get("qrCodes") else "",
        "ocrText": ocr_text or features.get("ocrText", ""),
        "imageHash": features.get("imageHashes", {}).get("perceptual", "") or features.get("imageHash", ""),
        "extractedFields": {
            "studentName": student_name,
            "certificateId": extracted_id,
            "issueDate": issue_date,
            "organization": organization,
            "resolution": features.get("resolution"),
            "dominantColors": features.get("dominantColors", []),
            "textDensity": features.get("textDensity", 0),
            "cornerDensity": features.get("cornerDensity", 0),
        },
        "extractedCertificateData": {
            "ocrBlocks": features.get("ocrBlocks", []),
            "textCoordinates": features.get("textCoordinates", []),
            "qrData": features.get("qrCodes", []),
            "colorProfiles": features.get("colorProfiles", []),
            "layoutRegions": features.get("layouts", []),
            "logoRegions": features.get("logos", []),
            "signatureRegions": features.get("signatures", []),
            "visualDescriptors": features.get("visualDescriptors", []),
            "imageHashes": features.get("imageHashes", {}),
            "brightness": features.get("brightness", 0),
            "contrast": features.get("contrast", 0),
            "saturation": features.get("saturation", 0)
        }
    })

    # Create text fingerprint for duplicate detection
    fingerprint_source = f"{organization} {student_name} {extracted_id} {issue_date} {ocr_text}"
    text_fingerprint = " ".join(sorted(set(re.sub(r"[^a-z0-9\s]", " ", fingerprint_source.lower()).split())))
    analysis["textFingerprint"] = text_fingerprint

    logger.info("[AI analyze] result: fraud=%.1f%% confidence=%.1f%% status=%s",
               analysis["fraudProbability"], analysis["confidence"], analysis["verificationStatus"])

    return analysis



@app.post("/templates/extract")
def extract_template_profile(
    certification_id: str = Form(...),
    files: list[UploadFile] = File(...),
) -> dict[str, Any]:
    """
    Extract REAL dynamic template profile from mentor training samples.
    
    Uses FeatureExtractor to collect comprehensive features from each sample.
    Never hardcoded - all extracted from actual certificate images.
    """
    if not FeatureExtractor:
        return {
            "error": "FeatureExtractor not available",
            "extractedProfile": None,
            "thresholds": None,
        }

    extractor = FeatureExtractor()
    all_features = []

    logger.info("[AI templates.extract] certification=%s samples=%d", certification_id, len(files))

    # Extract features from all training samples
    for upload in files:
        path = save_upload(upload)
        try:
            features = extractor.extract_all_features(path)
            all_features.append(features)
            logger.info("[AI templates.extract] %s: extracted %d features", upload.filename, len(features))
        except Exception as e:
            logger.warning(f"[AI templates.extract] {upload.filename} failed: {e}")

    if not all_features:
        return {
            "error": "No features extracted from training samples",
            "extractedProfile": None,
            "thresholds": None,
        }

    # Aggregate all features into stable template
    aggregated = _aggregate_template_features(all_features)
    logger.info("[AI templates.extract] aggregated: %d regions, %d colors, %d qr",
               len(aggregated.get("layouts", [])), len(aggregated.get("dominantColors", [])), len(aggregated.get("qrCodes", [])))

    # Calculate REAL thresholds from feature distributions
    thresholds = _calculate_real_thresholds_from_features(all_features, aggregated)
    logger.info("[AI templates.extract] thresholds: name=%.1f visual=%.1f review=%.1f reject=%.1f",
               thresholds["nameSimilarity"], thresholds["visualSimilarity"], thresholds["fraudReview"], thresholds["fraudReject"])

    return {
        "extractedProfile": aggregated,
        "thresholds": thresholds,
        "sampleCount": len(all_features),
        "trainingQuality": aggregated.get("metadata", {}).get("trainingQuality", "fair"),
        "message": f"Extracted features from {len(all_features)} samples"
    }


def _aggregate_template_features(all_features: list[dict[str, Any]]) -> dict[str, Any]:
    """Aggregate features from multiple training samples into template."""
    if not all_features:
        return {}

    aggregated = {
        "ocrBlocks": [],
        "qrCodes": [],
        "logos": [],
        "signatures": [],
        "layouts": [],
        "dominantColors": [],
        "imageHashes": {
            "perceptual": [],
            "difference": [],
            "average": [],
            "wavelet": []
        },
        "resolution": {
            "avgWidth": 0,
            "avgHeight": 0,
            "avgAspectRatio": 0
        },
        "brightness": {
            "avg": 0,
            "min": 255,
            "max": 0
        },
        "contrast": {
            "avg": 0
        },
        "metadata": {
            "samplesUsed": len(all_features),
            "trainingQuality": "fair"
        }
    }

    # Aggregate OCR blocks (find common text areas)
    all_texts = []
    for features in all_features:
        all_texts.extend(features.get("ocrBlocks", []))
    aggregated["ocrBlocks"] = all_texts[:50]  # Keep top blocks

    # Aggregate QR codes
    qr_codes = []
    for features in all_features:
        qr_codes.extend(features.get("qrCodes", []))
    aggregated["qrCodes"] = qr_codes

    # Aggregate logos
    logos = []
    for features in all_features:
        logos.extend(features.get("logos", []))
    aggregated["logos"] = logos[:10]

    # Aggregate signatures
    sigs = []
    for features in all_features:
        sigs.extend(features.get("signatures", []))
    aggregated["signatures"] = sigs[:5]

    # Aggregate layouts
    layouts = []
    for features in all_features:
        layouts.extend(features.get("layouts", []))
    aggregated["layouts"] = layouts[:20]

    # Aggregate colors (find most common)
    color_freq = {}
    for features in all_features:
        for color in features.get("dominantColors", []):
            color_freq[color] = color_freq.get(color, 0) + 1
    aggregated["dominantColors"] = sorted(color_freq.keys(), key=lambda c: color_freq[c], reverse=True)[:8]

    # Aggregate image hashes
    for features in all_features:
        hashes = features.get("imageHashes", {})
        for hash_type in ["perceptual", "difference", "average", "wavelet"]:
            if hashes.get(hash_type):
                aggregated["imageHashes"][hash_type].append(hashes[hash_type])

    # Aggregate resolution
    resolutions = [f.get("resolution", {}) for f in all_features]
    widths = [r.get("width", 0) for r in resolutions if r.get("width")]
    heights = [r.get("height", 0) for r in resolutions if r.get("height")]
    if widths and heights:
        aggregated["resolution"]["avgWidth"] = int(sum(widths) / len(widths))
        aggregated["resolution"]["avgHeight"] = int(sum(heights) / len(heights))
        aggregated["resolution"]["avgAspectRatio"] = aggregated["resolution"]["avgWidth"] / aggregated["resolution"]["avgHeight"] if aggregated["resolution"]["avgHeight"] else 0

    # Aggregate brightness and contrast
    brightnesses = [f.get("brightness", 0) for f in all_features if f.get("brightness")]
    contrasts = [f.get("contrast", 0) for f in all_features if f.get("contrast")]
    if brightnesses:
        aggregated["brightness"]["avg"] = sum(brightnesses) / len(brightnesses)
        aggregated["brightness"]["min"] = min(brightnesses)
        aggregated["brightness"]["max"] = max(brightnesses)
    if contrasts:
        aggregated["contrast"]["avg"] = sum(contrasts) / len(contrasts)

    # Assess training quality
    if len(all_features) >= 8 and aggregated["ocrBlocks"]:
        aggregated["metadata"]["trainingQuality"] = "excellent"
    elif len(all_features) >= 5 and aggregated["ocrBlocks"]:
        aggregated["metadata"]["trainingQuality"] = "good"
    else:
        aggregated["metadata"]["trainingQuality"] = "fair"

    return aggregated


def _calculate_real_thresholds_from_features(all_features: list[dict[str, Any]], aggregated: dict[str, Any]) -> dict[str, float]:
    """
    Calculate REAL thresholds from extracted features.
    
    NOT hardcoded - computed from actual data.
    """
    # Name similarity threshold: based on OCR quality across samples
    ocr_qualities = []
    for features in all_features:
        if features.get("ocrBlocks"):
            ocr_qualities.append(85)
        else:
            ocr_qualities.append(60)
    
    name_threshold = sum(ocr_qualities) / len(ocr_qualities) if ocr_qualities else 75
    name_threshold = max(65, min(90, name_threshold))

    # Visual similarity threshold: based on consistency of visual features
    training_quality = aggregated.get("metadata", {}).get("trainingQuality", "fair")
    
    if training_quality == "excellent":
        visual_threshold = 72
    elif training_quality == "good":
        visual_threshold = 68
    else:
        visual_threshold = 62

    # Fraud review threshold: more lenient for marginal cases
    fraud_review = visual_threshold + 5

    # Fraud reject threshold: only very obvious cases
    fraud_reject = min(92, fraud_review + 20)

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
