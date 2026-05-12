"""
QuickCheck AI Service - Certificate Fraud Detection Engine

FastAPI service for intelligent certificate verification using:
- OCR (Tesseract)
- Visual analysis (OpenCV, PIL)
- QR code detection
- Template learning and dynamic comparison
- MongoDB for template storage
"""

from __future__ import annotations

import hashlib
import json
import logging
import math
import os
import re
import sys
import tempfile
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from uuid import uuid4
import traceback
import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(name)s] [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# Import configuration
from config import config

logger.info("=" * 70)
logger.info("Starting QuickCheck AI Service")
logger.info("=" * 70)

# Optional dependencies with graceful degradation
try:
    import cv2
    logger.info("[✓] OpenCV available")
except Exception as e:
    cv2 = None
    logger.warning(f"[✗] OpenCV: {e}")

try:
    import imagehash
    logger.info("[✓] ImageHash available")
except Exception as e:
    imagehash = None
    logger.warning(f"[✗] ImageHash: {e}")

try:
    import numpy as np
    logger.info("[✓] NumPy available")
except Exception as e:
    np = None
    logger.warning(f"[✗] NumPy: {e}")

try:
    from PIL import Image, ImageStat
    logger.info("[✓] PIL available")
except Exception as e:
    Image = None
    ImageStat = None
    logger.warning(f"[✗] PIL: {e}")

try:
    import pytesseract
    if config.TESSERACT_PATH:
        pytesseract.pytesseract.pytesseract_path = config.TESSERACT_PATH
    logger.info("[✓] Tesseract available")
except Exception as e:
    pytesseract = None
    logger.warning(f"[✗] Tesseract: {e}")

try:
    from utils.ocr_pipeline import run_ocr
    logger.info("[✓] OCR pipeline available")
except Exception as e:
    run_ocr = None
    logger.warning(f"[✗] OCR pipeline: {e}")

try:
    from utils.scoring_engine import evaluate as scoring_evaluate
    logger.info("[✓] Scoring engine available")
except Exception as e:
    scoring_evaluate = None
    logger.warning(f"[✗] Scoring engine: {e}")

try:
    from pyzbar.pyzbar import decode as decode_qr
    logger.info("[✓] pyzbar available")
except Exception as e:
    decode_qr = None
    logger.warning(f"[✗] pyzbar: {e}")

try:
    from rapidfuzz import fuzz
    logger.info("[✓] RapidFuzz available")
except Exception as e:
    fuzz = None
    logger.warning(f"[✗] RapidFuzz: {e}")

try:
    from pdf2image import convert_from_path
    logger.info("[✓] pdf2image available")
except Exception as e:
    convert_from_path = None
    logger.warning(f"[✗] pdf2image: {e}")

try:
    from pypdf import PdfReader
    logger.info("[✓] pypdf available")
except Exception as e:
    PdfReader = None
    logger.warning(f"[✗] pypdf: {e}")

try:
    from utils.db import MongoDBManager
    logger.info("[✓] MongoDBManager available")
except ImportError as e:
    # Do not silently set to None. Create a placeholder that raises when used.
    def _make_missing(name: str, err: Exception):
        class _Missing:
            def __init__(self, *args, **kwargs):
                raise RuntimeError(f"Missing dependency {name}: {err}")
        return _Missing

    MongoDBManager = _make_missing('MongoDBManager', e)
    logger.error(f"[✗] MongoDBManager import failed: {e}")

try:
    from utils.dynamic_comparator import DynamicComparator
    logger.info("[✓] DynamicComparator available")
except ImportError as e:
    DynamicComparator = _make_missing('DynamicComparator', e)
    logger.error(f"[✗] DynamicComparator import failed: {e}")

try:
    from utils.template_extractor import TemplateExtractor
    logger.info("[✓] TemplateExtractor available")
except ImportError as e:
    TemplateExtractor = _make_missing('TemplateExtractor', e)
    logger.error(f"[✗] TemplateExtractor import failed: {e}")

try:
    from utils.template_aggregator import TemplateAggregator
    logger.info("[✓] TemplateAggregator available")
except ImportError as e:
    TemplateAggregator = _make_missing('TemplateAggregator', e)
    logger.error(f"[✗] TemplateAggregator import failed: {e}")

app = FastAPI(title="QuickCheck AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS if hasattr(config, "CORS_ORIGINS") else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def make_serializable(obj: Any) -> Any:
    if obj is None or isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, dict):
        return {str(k): make_serializable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [make_serializable(v) for v in obj]
    if isinstance(obj, (datetime.datetime, datetime.date)):
        return obj.isoformat()
    try:
        if hasattr(obj, "to_dict"):
            return make_serializable(obj.to_dict())
        return str(obj)
    except Exception:
        return None


def error_response(error: str, details: Any = "", status_code: int = 500) -> dict[str, Any]:
    return {
        "success": False,
        "error": error,
        "details": make_serializable(details),
        "statusCode": status_code,
    }


def format_exception(e: Exception, include_trace: bool = False) -> dict[str, Any]:
    typ = type(e).__name__
    message = str(e)
    trace = None
    if include_trace:
        trace = traceback.format_exc()
    return {"type": typ, "message": message, "trace": trace}


# HTTPException handler to ensure consistent JSON shape
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", "")
    logger.warning(f"HTTPException [{request_id}]: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(error=str(exc.detail), details="", status_code=exc.status_code),
    )


# ============================================================================
# Utility Functions
# ============================================================================

def clamp(value: float, low: float = 0, high: float = 100) -> float:
    """Clamp value between low and high."""
    return max(low, min(high, value))


def normalize_name(value: str) -> str:
    """Normalize text for comparison."""
    value = re.sub(r"[^a-zA-Z0-9\s.]", " ", value or "")
    value = re.sub(r"\s+", " ", value).strip().lower()
    return value


def initials(value: str) -> str:
    """Extract initials from name."""
    return "".join(part[0] for part in normalize_name(value).replace(".", " ").split() if part)


def name_similarity(student_name: str, ocr_text: str) -> dict[str, Any]:
    """Compare student name against OCR text."""
    if not student_name:
        logger.warning("Student name not provided for comparison")
        return {"score": 0, "matchedText": "", "method": "missing-student-name"}

    if not ocr_text or not ocr_text.strip():
        logger.warning("OCR text unavailable for name comparison")
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
            best = {
                "score": round(score),
                "matchedText": candidate[:160],
                "method": "rapidfuzz" if fuzz else "token-jaccard",
            }

    logger.info(f"Name similarity: {best['score']}% (method: {best['method']})")
    return best


def save_upload(upload: UploadFile) -> Path:
    """Save uploaded file to temporary location."""
    try:
        suffix = Path(upload.filename or "certificate.bin").suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as handle:
            content = upload.file.read()
            if not content:
                raise ValueError("Uploaded file is empty")
            handle.write(content)
            path = Path(handle.name)
            logger.info(f"Saved upload: {upload.filename or 'unknown'} -> {path} ({len(content)} bytes)")
            return path
    except Exception as e:
        logger.error(f"Failed to save upload: {e}")
        raise


def validate_upload(upload: UploadFile, max_size_mb: int = 50) -> tuple[bool, str]:
    """Validate uploaded file."""
    # Check file extension
    supported_extensions = {".pdf", ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff"}
    file_ext = Path(upload.filename or "").suffix.lower()
    if file_ext not in supported_extensions:
        return False, f"Unsupported file type: {file_ext}. Supported: {supported_extensions}"

    # Check file size
    upload.file.seek(0, 2)
    size_bytes = upload.file.tell()
    upload.file.seek(0)
    max_size_bytes = max_size_mb * 1024 * 1024

    if size_bytes > max_size_bytes:
        return False, f"File too large: {size_bytes / 1024 / 1024:.1f}MB (max {max_size_mb}MB)"

    if size_bytes == 0:
        return False, "File is empty"

    logger.info(f"File validation passed: {upload.filename} ({size_bytes / 1024:.1f}KB)")
    return True, ""


def binary_hash(path: Path) -> str:
    """Compute SHA256 hash of file."""
    try:
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(8192), b""):
                digest.update(chunk)
        return digest.hexdigest()[:32]
    except Exception as e:
        logger.error(f"Failed to hash {path}: {e}")
        return ""


def hex_to_rgb(value: str) -> tuple[int, int, int] | None:
    """Convert hex color to RGB."""
    value = (value or "").strip().lstrip("#")
    if len(value) != 6:
        return None
    try:
        return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))
    except ValueError:
        return None


def rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    """Convert RGB to hex color."""
    return "#{:02X}{:02X}{:02X}".format(*rgb)


def extract_image_profile(path: Path) -> dict[str, Any]:
    """Extract comprehensive profile from certificate image."""
    logger.info(f"[OCR] Extracting profile from {path.name}")

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
        logger.warning("PIL unavailable - cannot extract image profile")
        return profile

    try:
        with Image.open(path) as image:
            # Convert to RGB
            if image.mode != "RGB":
                image = image.convert("RGB")

            width, height = image.size
            profile["resolution"] = {
                "width": width,
                "height": height,
                "aspectRatio": round(width / height, 4) if height else 0,
            }
            logger.info(f"  Resolution: {width}x{height}")

            # Extract dominant colors
            small = image.resize((80, 80))
            colors = small.getcolors(maxcolors=6400) or []
            colors = sorted(colors, reverse=True, key=lambda item: item[0])[:5]
            profile["dominantColors"] = [rgb_to_hex(color[1]) for color in colors]
            logger.info(f"  Dominant colors: {len(profile['dominantColors'])}")

            # Extract brightness
            if ImageStat:
                try:
                    stat = ImageStat.Stat(image.convert("L"))
                    profile["brightness"] = round(stat.mean[0], 2)
                    logger.info(f"  Brightness: {profile['brightness']}")
                except Exception as e:
                    logger.warning(f"Failed to extract brightness: {e}")

            # Extract perceptual hash
            if imagehash:
                try:
                    profile["imageHash"] = str(imagehash.phash(image))
                except Exception as e:
                    logger.warning(f"Failed to compute image hash: {e}")

            # Extract QR code
            if decode_qr:
                try:
                    decoded = decode_qr(image)
                    if decoded:
                        profile["qrData"] = decoded[0].data.decode("utf-8", errors="ignore")
                        logger.info(f"  QR detected: {profile['qrData'][:50]}")
                except Exception as e:
                    logger.warning(f"Failed to decode QR: {e}")

            # Extract OCR text using shared pipeline (preprocessing + fallback)
            try:
                if run_ocr:
                    ocr_text, ocr_conf = run_ocr(image)
                    profile["ocrText"] = (ocr_text or "")[:8000]
                    profile["ocrConfidence"] = round(float(ocr_conf), 2)
                    logger.info(f"  OCR text: {len(profile['ocrText'])} chars (conf={profile.get('ocrConfidence')})")
                else:
                    profile["ocrText"] = ""
                    profile["ocrConfidence"] = 0.0
            except Exception as e:
                logger.warning(f"OCR pipeline failed: {e}")
                profile["ocrText"] = ""
                profile["ocrConfidence"] = 0.0

            # Extract edge and text density
            if cv2 and np:
                try:
                    array = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
                    edges = cv2.Canny(array, 80, 180)
                    profile["edgeDensity"] = round(float(np.count_nonzero(edges)) / edges.size, 4)

                    threshold = cv2.threshold(array, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
                    profile["textDensity"] = round(float(np.count_nonzero(threshold)) / threshold.size, 4)
                    logger.info(f"  Edge density: {profile['edgeDensity']}, Text density: {profile['textDensity']}")
                except Exception as e:
                    logger.warning(f"Failed to extract edge/text density: {e}")

    except Exception as e:
        logger.error(f"Failed to extract image profile: {e}")
        return profile

    # ensure the extracted profile includes the on-disk path for strict comparisons
    try:
        profile["filePath"] = str(path)
    except Exception:
        pass

    return profile



def extract_pdf_text_content(path: Path) -> str:
    """Extract text from a PDF without external rendering dependencies."""
    if PdfReader is None:
        return ""

    try:
        reader = PdfReader(str(path))
        parts = []
        for page in reader.pages[:5]:
            try:
                text = page.extract_text() or ""
                if text.strip():
                    parts.append(text)
            except Exception as page_error:
                logger.warning(f"[PDF] Page text extraction failed: {page_error}")
        return "\n".join(parts).strip()
    except Exception as e:
        logger.warning(f"[PDF] Text extraction failed: {e}")
        return ""


def color_similarity(current: list[str], reference: list[str]) -> float:
    """Compare color profiles."""
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
    """Compare visual profiles."""
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
    brightness_score = (
        75
        if brightness_ref is None or brightness_cur is None
        else clamp(100 - abs(brightness_cur - brightness_ref) / 255 * 100)
    )

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
    """Extract certificate ID from OCR text or use provided."""
    if provided:
        return provided

    patterns = [
        r"(?:certificate|cert|credential)\s*(?:id|no|number)?[:#\s-]+([A-Z0-9-]{6,})",
        r"\b([A-Z]{2,6}-[A-Z0-9-]{4,})\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, ocr_text or "", re.IGNORECASE)
        if match:
            cert_id = match.group(1).upper()
            logger.info(f"Certificate ID extracted: {cert_id}")
            return cert_id

    return ""


def score_fraud(
    *,
    name_score: int,
    visual_score: float,
    profile: dict[str, Any],
    template_profile: dict[str, Any],
    certificate_id: str,
) -> dict[str, Any]:
    """Compute fraud probability and risk assessment."""
    # New scoring: delegate to scoring engine for weighted, explainable outcome
    try:
        metrics = {
            "qrSimilarity": 95 if profile.get("qrData") and template_profile.get("extractedProfile", {}).get("qrData") and profile.get("qrData") == template_profile.get("extractedProfile", {}).get("qrData") else (80 if not profile.get("qrData") and not template_profile.get("extractedProfile", {}).get("qrData") else 35),
            "visualSimilarity": float(visual_score),
            "structureSimilarity": float(template_profile.get("extractedProfile", {}).get("structureSimilarity", visual_score)),
            "nameSimilarity": float(name_score),
        }

        eval_result = scoring_evaluate(
            metrics=metrics,
            uploaded_profile={**profile, "anomalies": []},
            certificate_id_provided=certificate_id,
            name_score=name_score,
            template=template_profile,
        ) if scoring_evaluate else {
            "weightedConfidence": 0,
            "trustScore": 0,
            "classification": "REJECTED",
            "breakdown": {},
            "explanation": [],
        }

        # Map classification to recommendation for backward compatibility
        classification = eval_result.get("classification", "REJECTED")
        recommendation = "ACCEPT" if classification == "VERIFIED" else ("REVIEW" if classification == "NEEDS_REVIEW" else "REJECT")

        return {
            "fraudProbability": round(100 - eval_result.get("trustScore", 0), 2),
            "confidence": round(eval_result.get("weightedConfidence", 0), 2),
            "suspiciousIndicators": [],
            "anomalies": profile.get("anomalies", []),
            "recommendation": recommendation,
            "explainable": eval_result,
        }
    except Exception as e:
        logger.warning(f"Scoring engine failed: {e}")
        return {
            "fraudProbability": 50,
            "confidence": 50,
            "suspiciousIndicators": [],
            "anomalies": [],
            "recommendation": "REVIEW",
        }


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health")
async def health() -> dict[str, Any]:
    """Health check endpoint with dependency verification."""
    logger.info("[Health] Checking service health...")
    # Basic dependency flags
    mongodb_flag = False
    mongodb_msg = "not configured"
    if MongoDBManager:
        try:
            db = MongoDBManager()
            if db.connect():
                mongodb_flag = True
                mongodb_msg = "connected"
                db.disconnect()
            else:
                mongodb_flag = False
                mongodb_msg = "connection-failed"
        except Exception as e:
            mongodb_flag = False
            mongodb_msg = f"error: {str(e)}"

    tesseract_flag = False
    tesseract_msg = "not-detected"
    try:
        if pytesseract:
            # try to call version or tesseract executable check
            try:
                ver = pytesseract.get_tesseract_version()
                tesseract_flag = True
                tesseract_msg = str(ver)
            except Exception:
                # check configured path
                if config.TESSERACT_PATH and Path(config.TESSERACT_PATH).exists():
                    tesseract_flag = True
                    tesseract_msg = f"path:{config.TESSERACT_PATH}"
                else:
                    tesseract_flag = False
        else:
            tesseract_flag = False
    except Exception as e:
        tesseract_flag = False
        tesseract_msg = f"error: {str(e)}"

    poppler_flag = bool(config.POPPLER_PATH) and Path(config.POPPLER_PATH).exists()
    poppler_msg = config.POPPLER_PATH or "not-configured"

    status = {
        "status": "operational",
        "service": "quickcheck-ai",
        "version": "1.0.0",
        "mongodb": mongodb_msg,
        "tesseract": tesseract_msg,
        "opencv": "available" if cv2 is not None else "missing",
        "poppler": poppler_msg,
        "ocr": "pipeline-enabled" if run_ocr is not None else "pipeline-missing",
    }

    return JSONResponse(status_code=200, content=make_serializable(status))
    


@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    student_name: str = Form(""),
    template_profile: str = Form("{}"),
    certificate_id: str = Form(""),
    issue_date: str = Form(""),
    organization: str = Form(""),
    strict: str = Form("false"),
) -> dict[str, Any]:
    """
    Analyze certificate for fraud detection.

    Expects multipart/form-data with:
    - file: Certificate image or PDF
    - student_name: Student name to match
    - template_profile: JSON string with learned template
    - certificate_id: (optional) Certificate ID
    - issue_date: (optional) Issue date
    - organization: (optional) Organization name
    """
    logger.info(f"[Analyze] Starting analysis: {file.filename}")

    path = None
    pdf_converted = False
    ocr_attempted = False
    profile: dict[str, Any] | None = None
    try:
        # Validate upload
        is_valid, error_msg = validate_upload(file)
        if not is_valid:
            logger.error(f"[Analyze] Validation failed: {error_msg}")
            return JSONResponse(status_code=400, content=make_serializable({"success": False, "error": error_msg}))

        # Save upload
        path = save_upload(file)

        # Log basic request info
        try:
            size_bytes = path.stat().st_size if path and path.exists() else 0
        except Exception:
            size_bytes = 0
        logger.info(f"[Analyze] Uploaded file saved: {file.filename} size={size_bytes} bytes mime={file.content_type}")

        # Parse template
        try:
            template = json.loads(template_profile or "{}")
        except json.JSONDecodeError as e:
            logger.warning(f"[Analyze] Invalid template JSON, using empty template: {e}")
            template = {}

        # Strict mode: allow template to enforce strict verification or client to request it
        use_strict = bool(str(template.get("strictTemplateMatch", False)).lower() in ("1", "true", "yes")) or bool(str(strict).lower() in ("1", "true", "yes"))

        # Tesseract availability check - if OCR pipeline required but missing, report
        if (pytesseract is None or (config.TESSERACT_PATH and not Path(config.TESSERACT_PATH).exists())) and run_ocr:
            logger.warning("[Analyze] Tesseract appears unavailable or misconfigured")
            return JSONResponse(status_code=503, content=make_serializable({
                "success": False,
                "error": "Tesseract OCR not available",
                "type": "OCR_UNAVAILABLE",
                "details": "Tesseract executable not found or pytesseract unavailable. Please install Tesseract and set TESSERACT_PATH in config.",
            }))

        # Handle PDF safely: render to image if possible, otherwise extract text directly.
        if path.suffix.lower() == ".pdf":
            logger.info("[Analyze] Processing PDF upload")
            extracted_pdf_text = extract_pdf_text_content(path)
            if extracted_pdf_text.strip():
                logger.info("[Analyze] PDF text extracted with pypdf fallback")
                profile = {
                    "resolution": {"width": 0, "height": 0, "aspectRatio": 0},
                    "dominantColors": [],
                    "brightness": 0,
                    "edgeDensity": 0,
                    "textDensity": 0,
                    "imageHash": binary_hash(path),
                    "qrData": "",
                    "ocrText": extracted_pdf_text[:8000],
                    "ocrConfidence": 70.0,
                }
                pdf_converted = False
            else:
                logger.warning("[Analyze] PDF text extraction returned empty text")
                return JSONResponse(status_code=503, content=make_serializable({
                    "success": False,
                    "error": "PDF processing failed",
                    "type": "PDF_TEXT_EXTRACTION_EMPTY",
                    "details": "The PDF could not be rendered or text-extracted. Please ensure the file is a valid PDF.",
                }))

        # Extract profile from image unless we already built one from the PDF text fallback
        if profile is None:
            try:
                profile = extract_image_profile(path)
            except Exception as e:
                logger.error(f"[Analyze] Image profile extraction failed: {e}", exc_info=True)
                return JSONResponse(status_code=500, content=make_serializable({"success": False, "error": "Image profile extraction failed", "type": "IMAGE_EXTRACTION_ERROR", "details": str(e)}))

        # Extract certificate ID
        extracted_id = extract_certificate_id(profile.get("ocrText", ""), certificate_id)

        # Use DynamicComparator if available
        if DynamicComparator:
            try:
                logger.info("[Analyze] Using DynamicComparator for analysis")
                comparator = DynamicComparator(template_profile=template)
                comparison = comparator.compare(
                    uploaded_profile=profile,
                    student_name=student_name,
                    certificate_id=extracted_id,
                    strict=use_strict,
                )
                # If strict mode returned SSIM-focused result, surface SSIM as visual score
                if comparison.get("ssimScore", None) is not None:
                    ssim_pct = round(float(comparison.get("ssimScore", 0)) * 100, 2)
                    name_match = {
                        "score": comparison.get("metrics", {}).get("nameSimilarity", 0),
                        "matchedText": profile.get("ocrText", "")[:160] if profile.get("ocrText") else "",
                        "method": "strict-ssim" if use_strict else "dynamic-comparison",
                    }
                    visual = {
                        "score": ssim_pct,
                        "components": {
                            "ssimScore": comparison.get("ssimScore", 0),
                            "qrSimilarity": comparison.get("metrics", {}).get("qrSimilarity", 0),
                            "structureSimilarity": comparison.get("metrics", {}).get("structureSimilarity", 0),
                        },
                    }
                    risk = {
                        "fraudProbability": comparison.get("fraudProbability", 100),
                        "confidence": comparison.get("confidence", 0),
                        "trustScore": comparison.get("trustScore", max(0, 100 - float(comparison.get("fraudProbability", 100) or 100))),
                        "weightedConfidence": comparison.get("weightedConfidence", comparison.get("confidence", 0)),
                        "suspiciousIndicators": comparison.get("explanations", []),
                        "anomalies": comparison.get("anomalies", []),
                        "recommendation": comparison.get("recommendation", "REJECT"),
                    }
                else:
                    name_match = {
                        "score": comparison.get("metrics", {}).get("nameSimilarity", 0),
                        "matchedText": profile.get("ocrText", "")[:160] if profile.get("ocrText") else "",
                        "method": "dynamic-comparison",
                    }
                    visual = {
                        "score": comparison.get("metrics", {}).get("visualSimilarity", 0),
                        "components": {
                            "qrSimilarity": comparison.get("metrics", {}).get("qrSimilarity", 0),
                            "logoSimilarity": comparison.get("metrics", {}).get("logoSimilarity", 0),
                            "spacingSimilarity": comparison.get("metrics", {}).get("spacingSimilarity", 0),
                            "alignmentSimilarity": comparison.get("metrics", {}).get("alignmentSimilarity", 0),
                            "structureSimilarity": comparison.get("metrics", {}).get("structureSimilarity", 0),
                        },
                    }
                    risk = {
                        "fraudProbability": comparison.get("fraudProbability", 100),
                        "confidence": comparison.get("confidence", 0),
                        "trustScore": comparison.get("trustScore", max(0, 100 - float(comparison.get("fraudProbability", 100) or 100))),
                        "weightedConfidence": comparison.get("weightedConfidence", comparison.get("confidence", 0)),
                        "suspiciousIndicators": comparison.get("explanations", []),
                        "anomalies": comparison.get("anomalies", []),
                        "recommendation": comparison.get("recommendation", "REJECT"),
                    }
            except Exception as e:
                logger.warning(f"[Analyze] DynamicComparator failed, falling back: {e}")
                name_match = name_similarity(student_name, profile.get("ocrText", ""))
                visual = visual_similarity(profile, template)
                risk = score_fraud(
                    name_score=name_match["score"],
                    visual_score=visual["score"],
                    profile=profile,
                    template_profile=template,
                    certificate_id=extracted_id,
                )
        else:
            # Use fallback logic
            logger.info("[Analyze] DynamicComparator unavailable, using fallback logic")
            name_match = name_similarity(student_name, profile.get("ocrText", ""))
            visual = visual_similarity(profile, template)
            risk = score_fraud(
                name_score=name_match["score"],
                visual_score=visual["score"],
                profile=profile,
                template_profile=template,
                certificate_id=extracted_id,
            )

        # Create fingerprint
        fingerprint_source = f"{organization} {student_name} {extracted_id} {issue_date} {profile.get('ocrText', '')}"
        text_fingerprint = " ".join(sorted(set(re.sub(r"[^a-z0-9\s]", " ", fingerprint_source.lower()).split())))

        logger.info(f"[Analyze] Analysis complete: recommendation={risk.get('recommendation')} confidence={risk.get('confidence')}")

        # Map recommendation to final AI-only verification status.
        rec = risk.get("recommendation", "REJECT")
        confidence = float(risk.get("confidence", 0) or 0)
        trust_score = float(risk.get("trustScore", risk.get("weightedConfidence", confidence)) or confidence)
        fraud_probability = float(risk.get("fraudProbability", 100) or 100)
        if rec == "ACCEPT" and (max(confidence, trust_score) >= 95 or fraud_probability <= 5):
            verification_status = "VERIFIED"
        else:
            verification_status = "REJECTED"

        ocr_attempted = bool(run_ocr and file and file.filename)
        ocr_success = bool(profile.get("ocrText"))

        data = {
            **risk,
            "verificationStatus": verification_status,
            "nameSimilarity": name_match["score"],
            "visualSimilarity": visual["score"],
            "visualComponents": visual.get("components", {}),
            "matchedNameText": name_match.get("matchedText", ""),
            "qrData": profile.get("qrData", ""),
            "ocrText": profile.get("ocrText", ""),
            "imageHash": profile.get("imageHash", binary_hash(path) if path and path.exists() else ""),
            "textFingerprint": text_fingerprint,
            "extractedFields": {
                "studentName": student_name,
                "certificateId": extracted_id,
                "issueDate": issue_date,
                "organization": organization,
                "resolution": profile.get("resolution"),
                "dominantColors": profile.get("dominantColors", []),
            },
            "_diagnostics": {
                "uploadedFilename": file.filename,
                "sizeBytes": size_bytes,
                "mime": file.content_type,
                "pdfConverted": pdf_converted,
                "ocrAttempted": ocr_attempted,
                "ocrSuccess": ocr_success,
            }
        }

        # Ensure JSON-serializable
        safe = make_serializable(data)
        return JSONResponse(status_code=200, content=safe)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Analyze] Unexpected error: {e}", exc_info=True)
        exc_info = format_exception(e, include_trace=config.DEBUG)
        return JSONResponse(status_code=500, content=make_serializable({
            "success": False,
            "error": exc_info.get("message", "Analysis failed"),
            "type": exc_info.get("type"),
            "trace": exc_info.get("trace") if config.DEBUG else None,
        }))
    finally:
        # Cleanup temp file if present
        try:
            if path and path.exists() and Path(tempfile.gettempdir()) in path.parents:
                path.unlink(missing_ok=True)
                logger.info(f"[Analyze] Cleaned up temp file: {path}")
        except Exception:
            pass


@app.post("/templates/extract")
async def extract_template_profile(
    certification_id: str = Form(...),
    files: list[UploadFile] = File(...),
) -> dict[str, Any]:
    """
    Extract and learn template profile from sample certificates.
    
    Uses TemplateExtractor and TemplateAggregator to compute real thresholds.
    """
    logger.info(f"[Templates] Extracting profile from {len(files)} samples for {certification_id}")

    try:
        if not TemplateExtractor or not TemplateAggregator:
            logger.error("[Templates] TemplateExtractor or TemplateAggregator unavailable")
            raise HTTPException(
                status_code=501,
                detail="Template extraction requires TemplateExtractor and TemplateAggregator",
            )

        extractor = TemplateExtractor()
        profiles = []
        skipped_files: list[dict[str, str]] = []

        # Extract profiles from all samples
        for upload in files:
            try:
                logger.info(f"[Templates] Processing upload: {getattr(upload, 'filename', 'unknown')}")
                is_valid, error_msg = validate_upload(upload)
                if not is_valid:
                    logger.warning(f"[Templates] Skipping invalid file {getattr(upload, 'filename', 'unknown')}: {error_msg}")
                    skipped_files.append({"filename": getattr(upload, 'filename', 'unknown'), "reason": error_msg})
                    continue

                try:
                    path = save_upload(upload)
                except Exception as e:
                    logger.warning(f"[Templates] Failed to save upload {getattr(upload, 'filename', 'unknown')}: {e}")
                    skipped_files.append({"filename": getattr(upload, 'filename', 'unknown'), "reason": f"save_failed: {e}"})
                    continue

                # Handle PDF
                if path.suffix.lower() == ".pdf":
                    # Prefer pdf2image/poppler if available; otherwise try PyMuPDF (fitz)
                    if convert_from_path:
                        try:
                            images = convert_from_path(path, poppler_path=config.POPPLER_PATH)
                            if images:
                                path_temp = Path(tempfile.gettempdir()) / f"page_{path.stem}.png"
                                images[0].save(path_temp, "PNG")
                                path = path_temp
                        except Exception as e:
                            logger.warning(f"[Templates] pdf2image conversion failed: {e}")

                    if path.suffix.lower() == ".pdf":
                        # pdf2image didn't convert; try PyMuPDF as a pure-python fallback
                        try:
                            import fitz

                            doc = fitz.open(str(path))
                            if doc.page_count > 0:
                                page = doc.load_page(0)
                                pix = page.get_pixmap(dpi=200)
                                path_temp = Path(tempfile.gettempdir()) / f"page_{path.stem}.png"
                                pix.save(str(path_temp))
                                path = path_temp
                                logger.info(f"[Templates] PDF converted via PyMuPDF: {path_temp}")
                        except Exception as e:
                            logger.warning(f"[Templates] Skipping PDF (no pdf2image/poppler and PyMuPDF failed): {e}")
                            extracted_pdf_text = extract_pdf_text_content(path)
                            if extracted_pdf_text.strip():
                                profile = {
                                    "resolution": {"width": 0, "height": 0, "aspectRatio": 0},
                                    "dominantColors": [],
                                    "brightness": 0,
                                    "edgeDensity": 0,
                                    "textDensity": 0,
                                    "cornerDensity": 0,
                                    "imageHash": binary_hash(path),
                                    "perceptualHash": "",
                                    "qrData": "",
                                    "ocrText": extracted_pdf_text[:8000],
                                    "ocrConfidence": 70.0,
                                    "components": [],
                                    "relationships": [],
                                    "filePath": str(path),
                                    "pdfTextOnly": True,
                                }
                                profiles.append(profile)
                                logger.info(f"[Templates] Extracted PDF text fallback from {getattr(upload, 'filename', 'unknown')}")
                                continue

                            skipped_files.append({"filename": getattr(upload, 'filename', 'unknown'), "reason": f"pdf_conversion_failed: {e}"})
                            continue

                profile = extractor.extract_image_profile(path)

                # attach path for diagnostics
                try:
                    profile["filePath"] = str(path)
                except Exception:
                    pass

                # Extract spatial relationships
                if profile.get("components"):
                    relationships = extractor.extract_spatial_relationships(
                        profile.get("components", []),
                        profile.get("resolution", {}).get("width", 1600) or 1600,
                        profile.get("resolution", {}).get("height", 1130) or 1130,
                    )
                    profile["relationships"] = relationships

                profiles.append(profile)
                logger.info(f"[Templates] Extracted profile from {getattr(upload, 'filename', 'unknown')}")

            except Exception as e:
                logger.warning(f"[Templates] Failed to extract {upload.filename}: {e}")
                continue

        if not profiles:
            logger.error("[Templates] No profiles extracted from uploaded files; returning details of skipped files")
            # Provide diagnostics to caller for easier debugging
            raise HTTPException(
                status_code=400,
                detail={"message": "No profiles could be extracted from uploaded files", "skipped": skipped_files},
            )

        # Aggregate profiles
        logger.info(f"[Templates] Aggregating {len(profiles)} profiles...")
        extracted = TemplateAggregator.aggregate_profiles(profiles)

        # Calculate thresholds
        thresholds = _calculate_real_thresholds(extracted, profiles)

        logger.info(f"[Templates] Extraction complete: quality={extracted.get('metadata', {}).get('trainingQuality')}")
        # Return raw structure expected by backend
        return {
            "extractedProfile": extracted,
            "thresholds": thresholds,
            "trainedSamplesCount": len(profiles),
            "sampleCount": len(profiles),
            "aggregationQuality": extracted.get("metadata", {}).get("trainingQuality", "unknown"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Templates] Unexpected error: {e}", exc_info=True)
        return JSONResponse(status_code=500, content=error_response("Template extraction failed", str(e), status_code=500))


def _calculate_real_thresholds(extracted: dict[str, Any], profiles: list[dict[str, Any]]) -> dict[str, float]:
    """Calculate real thresholds from template data."""
    logger.info("[Thresholds] Calculating real thresholds from template...")

    # Name similarity threshold
    ocr_quality_scores = []
    for profile in profiles:
        if profile.get("ocrText"):
            ocr_quality_scores.append(85)
        else:
            ocr_quality_scores.append(60)

    name_threshold = (
        sum(ocr_quality_scores) / len(ocr_quality_scores)
        if ocr_quality_scores
        else 75
    )

    # Visual similarity threshold
    resolution_variance = (
        extracted.get("resolution", {}).get("variance", {}).get("width", 0)
    )
    color_consistency = len(extracted.get("dominantColors", [])) / 5 * 100

    visual_threshold = 70 + (color_consistency * 0.2) - min(resolution_variance / 100, 10)
    visual_threshold = max(55, min(85, visual_threshold))

    # Fraud thresholds
    training_quality = extracted.get("metadata", {}).get("trainingQuality", "fair")
    fraud_review = {
        "excellent": 60,
        "good": 65,
        "fair": 70,
    }.get(training_quality, 75)

    fraud_reject = min(90, fraud_review + 20)

    thresholds = {
        "nameSimilarity": round(name_threshold, 2),
        "visualSimilarity": round(visual_threshold, 2),
        "fraudReview": round(fraud_review, 2),
        "fraudReject": round(fraud_reject, 2),
    }

    logger.info(f"[Thresholds] Calculated: {thresholds}")
    return thresholds


@app.get("/templates/list")
async def list_templates() -> dict[str, Any]:
    """List all stored templates."""
    logger.info("[Templates] Listing all templates...")

    try:
        if not MongoDBManager:
            logger.error("[Templates] MongoDB not configured")
            raise HTTPException(status_code=501, detail="MongoDB not configured")

        db = MongoDBManager()
        if not db.connect():
            logger.error("[Templates] MongoDB connection failed")
            raise HTTPException(status_code=503, detail="Database connection failed")

        try:
            templates = db.list_templates()
            logger.info(f"[Templates] Found {len(templates)} templates")

            # Return raw templates list for compatibility
            return {
                "count": len(templates),
                "templates": [
                    make_serializable({
                        "id": str(t.get("_id")),
                        "certificationId": t.get("certificationId"),
                        "version": t.get("version"),
                        "trainedSamples": t.get("metadata", {}).get("trainedSamples"),
                        "trainingQuality": t.get("metadata", {}).get("trainingQuality"),
                        "trainedAt": t.get("metadata", {}).get("trainedAt"),
                    })
                    for t in templates
                ],
            }
        finally:
            db.disconnect()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Templates] Failed to list templates: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list templates: {str(e)}",
        )


@app.get("/templates/{template_id}")
async def get_template(template_id: str) -> dict[str, Any]:
    """Retrieve complete template profile by ID."""
    logger.info(f"[Templates] Retrieving template {template_id}")

    try:
        if not MongoDBManager:
            logger.error("[Templates] MongoDB not configured")
            raise HTTPException(status_code=501, detail="MongoDB not configured")

        from bson import ObjectId

        db = MongoDBManager()
        if not db.connect():
            logger.error("[Templates] MongoDB connection failed")
            raise HTTPException(status_code=503, detail="Database connection failed")

        try:
            template = db.db.template_profiles.find_one({"_id": ObjectId(template_id)})
            if not template:
                logger.warning(f"[Templates] Template not found: {template_id}")
                raise HTTPException(status_code=404, detail="Template not found")

            # Get components
            components = list(db.db.template_components.find({"templateId": template_id}))

            # Get relationships
            rels = db.db.template_relationships.find_one({"templateId": template_id})
            relationships = rels.get("relationships", []) if rels else []

            # Get hashes
            hashes_doc = db.db.template_hashes.find_one({"templateId": template_id})
            hashes = hashes_doc.get("hashes", {}) if hashes_doc else {}

            logger.info(f"[Templates] Retrieved template: {len(components)} components")

            # Return raw template data for compatibility
            return {
                "id": str(template["_id"]),
                "extractedProfile": make_serializable(template.get("extractedProfile", {})),
                "components": make_serializable([{ "_id": None, **c } for c in components]),
                "relationships": make_serializable(relationships),
                "hashes": make_serializable(hashes),
                "thresholds": make_serializable(template.get("thresholds", {})),
                "metadata": make_serializable(template.get("metadata", {})),
            }
        finally:
            db.disconnect()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Templates] Failed to get template: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get template: {str(e)}",
        )


# ============================================================================
# Startup
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Validate dependencies and log startup information."""
    logger.info("=" * 70)
    logger.info("Running startup validation checks...")
    logger.info("=" * 70)

    success, warnings = config.validate_at_startup()

    for warning in warnings:
        logger.warning(f"[!] {warning}")

    logger.info("=" * 70)
    logger.info(f"Service started on {config.HOST}:{config.PORT}")
    logger.info("=" * 70)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=config.HOST,
        port=config.PORT,
        log_level=config.LOG_LEVEL.lower(),
        access_log=True,
    )
