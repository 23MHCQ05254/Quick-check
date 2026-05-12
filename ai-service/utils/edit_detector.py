"""
Edit detection utilities: font inconsistency, overlapping text, and cloned-region detection.

These routines are heuristic, robust, and designed to avoid false positives
on screenshots and compressed images.
"""
from __future__ import annotations

import logging
from typing import Any

from PIL import Image
import numpy as np

logger = logging.getLogger(__name__)

try:
    import pytesseract
except Exception:
    pytesseract = None

try:
    import easyocr
except Exception:
    easyocr = None

try:
    import imagehash
except Exception:
    imagehash = None

try:
    import cv2
except Exception:
    cv2 = None


def _get_text_boxes_pytesseract(pil_image: Image.Image) -> list[dict[str, Any]]:
    boxes = []
    try:
        if not pytesseract:
            return boxes
        data = pytesseract.image_to_data(pil_image, output_type=pytesseract.Output.DICT)
        n = len(data.get("level", []))
        for i in range(n):
            text = data.get("text", [])[i] or ""
            x = int(data.get("left", [0])[i])
            y = int(data.get("top", [0])[i])
            w = int(data.get("width", [0])[i])
            h = int(data.get("height", [0])[i])
            conf = float(data.get("conf", ["-1"])[i] or -1)
            if text.strip():
                boxes.append({"text": text, "x": x, "y": y, "w": w, "h": h, "conf": conf})
    except Exception as e:
        logger.warning(f"pytesseract boxes failed: {e}")
    return boxes


def _get_text_boxes_easyocr(pil_image: Image.Image) -> list[dict[str, Any]]:
    boxes = []
    try:
        if not easyocr:
            return boxes
        reader = easyocr.Reader(["en"], gpu=False)
        results = reader.readtext(np.array(pil_image))
        for bbox, text, conf in results:
            # bbox is list of 4 points
            xs = [int(p[0]) for p in bbox]
            ys = [int(p[1]) for p in bbox]
            x, y = min(xs), min(ys)
            w, h = max(xs) - x, max(ys) - y
            boxes.append({"text": text, "x": x, "y": y, "w": w, "h": h, "conf": float(conf)})
    except Exception as e:
        logger.warning(f"EasyOCR boxes failed: {e}")
    return boxes


def get_text_boxes(pil_image: Image.Image) -> list[dict[str, Any]]:
    # Try pytesseract first, then easyocr
    boxes = _get_text_boxes_pytesseract(pil_image)
    if boxes:
        return boxes
    boxes = _get_text_boxes_easyocr(pil_image)
    return boxes


def detect_font_inconsistency(pil_image: Image.Image, tolerance: float = 0.5) -> dict[str, Any]:
    """Detect inconsistent font sizes across detected text boxes.

    tolerance: fraction of median height considered acceptable (0.5 = 50%)
    Returns score 0-100 (higher means consistent) and indicators.
    """
    boxes = get_text_boxes(pil_image)
    heights = [b["h"] for b in boxes if b.get("h")]
    if not heights:
        return {"score": 50.0, "indicator": "no-text-detected", "details": {}}

    median = float(np.median(heights))
    deviations = [abs(h - median) / max(1.0, median) for h in heights]
    outliers = sum(1 for d in deviations if d > tolerance)
    percent_outliers = outliers / len(heights)
    score = max(0.0, 100.0 - percent_outliers * 100.0)
    indicator = "fonts_consistent" if percent_outliers < 0.2 else "fonts_inconsistent"
    return {"score": round(score, 2), "indicator": indicator, "percentOutliers": round(percent_outliers * 100, 2)}


def detect_overlapping_text(pil_image: Image.Image) -> dict[str, Any]:
    """Detect overlapping text boxes which may indicate pasted/overlapped edits."""
    boxes = get_text_boxes(pil_image)
    overlaps = 0
    total = 0
    for i in range(len(boxes)):
        a = boxes[i]
        area_a = a["w"] * a["h"] if a.get("w") and a.get("h") else 0
        for j in range(i + 1, len(boxes)):
            b = boxes[j]
            # compute intersection
            x1 = max(a["x"], b["x"])
            y1 = max(a["y"], b["y"])
            x2 = min(a["x"] + a["w"], b["x"] + b["w"])
            y2 = min(a["y"] + a["h"], b["y"] + b["h"])
            if x2 > x1 and y2 > y1:
                inter = (x2 - x1) * (y2 - y1)
                area_b = b["w"] * b["h"] if b.get("w") and b.get("h") else 0
                # overlap ratio
                if area_a > 0 and area_b > 0:
                    ratio = inter / float(min(area_a, area_b))
                    if ratio > 0.2:
                        overlaps += 1
            total += 1

    indicator = "overlaps_detected" if overlaps > 0 else "no_overlaps"
    return {"overlapCount": overlaps, "checkedPairs": total, "indicator": indicator}


def detect_cloned_regions(pil_image: Image.Image, patch_size: int = 64, stride: int = 32, ham_thresh: int = 5) -> dict[str, Any]:
    """Detect probable cloned regions using perceptual hashes on overlapping patches.

    This is a heuristic copy-move detector that is fast and robust for small edits.
    """
    if imagehash is None or cv2 is None:
        return {"found": False, "matches": []}

    try:
        img = pil_image.convert("L")
        arr = np.array(img)
        h, w = arr.shape
        hashes = []
        positions = []
        for y in range(0, max(1, h - patch_size + 1), stride):
            for x in range(0, max(1, w - patch_size + 1), stride):
                patch = img.crop((x, y, x + patch_size, y + patch_size))
                try:
                    ph = imagehash.phash(patch)
                    hashes.append(ph)
                    positions.append((x, y))
                except Exception:
                    continue

        matches = []
        n = len(hashes)
        for i in range(n):
            for j in range(i + 1, n):
                # skip nearby patches
                xi, yi = positions[i]
                xj, yj = positions[j]
                if abs(xi - xj) < patch_size and abs(yi - yj) < patch_size:
                    continue
                try:
                    dist = (hashes[i] - hashes[j])
                except Exception:
                    continue
                if 0 < dist <= ham_thresh:
                    matches.append({"a": positions[i], "b": positions[j], "distance": int(dist)})

        found = len(matches) > 0
        return {"found": found, "matches": matches}
    except Exception as e:
        logger.warning(f"cloned region detection failed: {e}")
        return {"found": False, "matches": []}


def detect_edits(pil_image: Image.Image) -> dict[str, Any]:
    """Run all edit-detection heuristics and return summary."""
    try:
        font = detect_font_inconsistency(pil_image)
        overlaps = detect_overlapping_text(pil_image)
        clones = detect_cloned_regions(pil_image)

        indicators = []
        anomalies = []

        if font.get("indicator") == "fonts_inconsistent":
            indicators.append("inconsistent-font-sizes")
            anomalies.append({"type": "FONT_INCONSISTENCY", "severity": "MEDIUM", "details": font})

        if overlaps.get("overlapCount", 0) > 0:
            indicators.append("overlapping-text-blocks")
            anomalies.append({"type": "OVERLAPPING_TEXT", "severity": "HIGH", "details": overlaps})

        if clones.get("found"):
            indicators.append("cloned-regions-detected")
            anomalies.append({"type": "CLONED_REGIONS", "severity": "HIGH", "details": clones})

        return {"indicators": indicators, "anomalies": anomalies, "details": {"font": font, "overlaps": overlaps, "clones": clones}}
    except Exception as e:
        logger.warning(f"edit detection failed: {e}")
        return {"indicators": [], "anomalies": [], "details": {}}
