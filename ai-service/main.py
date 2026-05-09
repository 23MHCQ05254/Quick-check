from __future__ import annotations

import hashlib
import json
import math
import re
import tempfile
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

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

    profile = extract_image_profile(path)
    extracted_id = extract_certificate_id(profile.get("ocrText", ""), certificate_id)
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
        "nameSimilarity": name_match["score"],
        "visualSimilarity": visual["score"],
        "visualComponents": visual["components"],
        "matchedNameText": name_match["matchedText"],
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
    profiles = []
    hashes = []
    for upload in files:
        path = save_upload(upload)
        profile = extract_image_profile(path)
        profiles.append(profile)
        hashes.append(profile.get("imageHash"))

    def average(path: list[str], default: float = 0) -> float:
        values = []
        for profile in profiles:
            cursor: Any = profile
            for key in path:
                cursor = cursor.get(key, {}) if isinstance(cursor, dict) else {}
            if isinstance(cursor, (int, float)):
                values.append(cursor)
        return round(sum(values) / len(values), 4) if values else default

    dominant_colors = []
    for profile in profiles:
        dominant_colors.extend(profile.get("dominantColors", [])[:3])
    palette = []
    for color in dominant_colors:
        if color not in palette:
            palette.append(color)
        if len(palette) == 5:
            break

    extracted = {
        "resolution": {
            "width": round(average(["resolution", "width"])),
            "height": round(average(["resolution", "height"])),
            "aspectRatio": average(["resolution", "aspectRatio"]),
        },
        "dominantColors": palette,
        "brightness": average(["brightness"]),
        "edgeDensity": average(["edgeDensity"]),
        "textDensity": average(["textDensity"]),
        "qrRegions": [],
        "logoRegions": [],
        "textBlocks": [],
        "metadata": {
            "certificationId": certification_id,
            "trainedSamples": len(files),
            "sampleHashes": hashes,
            "trainingQuality": "strong" if len(files) >= 5 else "needs-more-samples",
        },
    }

    return {
        "extractedProfile": extracted,
        "thresholds": {"nameSimilarity": 78, "visualSimilarity": 70, "fraudReview": 65, "fraudReject": 92},
    }

