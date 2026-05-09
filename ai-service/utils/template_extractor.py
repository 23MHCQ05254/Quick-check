"""
Advanced template extraction engine for certificate intelligence.
Extracts OCR, visual, QR, and structural intelligence from sample certificates.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import tempfile
from pathlib import Path
from typing import Any

import cv2
import imagehash
import numpy as np
from PIL import Image, ImageStat
from pyzbar.pyzbar import decode as decode_qr

try:
    import pytesseract
except ImportError:
    pytesseract = None

try:
    import easyocr
except ImportError:
    easyocr = None

logger = logging.getLogger(__name__)


def hex_to_rgb(value: str) -> tuple[int, int, int] | None:
    """Convert hex color to RGB tuple."""
    value = (value or "").strip().lstrip("#")
    if len(value) != 6:
        return None
    try:
        return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))
    except ValueError:
        return None


def rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    """Convert RGB tuple to hex color."""
    return "#{:02X}{:02X}{:02X}".format(*rgb)


def binary_hash(path: Path) -> str:
    """Generate SHA256 binary hash of file."""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()[:32]


class TemplateExtractor:
    """Extract comprehensive intelligence from certificate samples."""

    def __init__(self):
        self.reader = easyocr.Reader(["en"]) if easyocr else None

    def extract_image_profile(self, path: Path) -> dict[str, Any]:
        """Extract complete visual and OCR profile from image."""
        profile: dict[str, Any] = {
            "resolution": {"width": 0, "height": 0, "aspectRatio": 0},
            "dominantColors": [],
            "brightness": 0,
            "edgeDensity": 0,
            "textDensity": 0,
            "cornerDensity": 0,
            "imageHash": binary_hash(path),
            "perceptualHash": "",
            "qrData": "",
            "qrMetadata": {},
            "ocrText": "",
            "ocrBoundingBoxes": [],
            "textBlocks": [],
            "components": [],
            "borders": {},
            "gradients": [],
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

                # Dominant colors
                small = image.resize((80, 80))
                colors = small.getcolors(maxcolors=6400) or []
                colors = sorted(colors, reverse=True, key=lambda item: item[0])[:5]
                profile["dominantColors"] = [rgb_to_hex(color[1]) for color in colors]

                # Brightness
                if ImageStat:
                    stat = ImageStat.Stat(image.convert("L"))
                    profile["brightness"] = round(stat.mean[0], 2)

                # Perceptual hash
                if imagehash:
                    profile["perceptualHash"] = str(imagehash.phash(image))

                # QR detection
                if decode_qr:
                    decoded = decode_qr(image)
                    if decoded:
                        qr_data = decoded[0].data.decode("utf-8", errors="ignore")
                        profile["qrData"] = qr_data
                        profile["qrMetadata"] = {
                            "type": str(decoded[0].type),
                            "quality": str(decoded[0].quality),
                            "rect": {
                                "x": decoded[0].rect.left,
                                "y": decoded[0].rect.top,
                                "width": decoded[0].rect.width,
                                "height": decoded[0].rect.height,
                            },
                        }

                # OCR extraction
                profile["ocrText"] = self._extract_ocr_text(image)

                # OpenCV analysis
                if cv2 and np:
                    array = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)

                    # Edge density
                    edges = cv2.Canny(array, 80, 180)
                    profile["edgeDensity"] = round(float(np.count_nonzero(edges)) / edges.size, 4)

                    # Text density
                    threshold = cv2.threshold(array, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
                    profile["textDensity"] = round(float(np.count_nonzero(threshold)) / threshold.size, 4)

                    # Corner density
                    corners = cv2.cornerHarris(array, 2, 3, 0.04)
                    profile["cornerDensity"] = round(float(np.count_nonzero(corners > 0.1 * corners.max())) / array.size, 4)

                    # Component detection
                    profile["components"] = self._detect_components(image, array)

        except Exception as e:
            logger.warning(f"Failed to extract profile from {path}: {e}")

        return profile

    def _extract_ocr_text(self, image: Image.Image) -> str:
        """Extract OCR text using available engines."""
        try:
            if self.reader:
                results = self.reader.readtext(np.array(image))
                return "\n".join([text[1] for text in results if text[1]])
        except Exception as e:
            logger.warning(f"EasyOCR extraction failed: {e}")

        if pytesseract:
            try:
                return pytesseract.image_to_string(image)[:8000]
            except Exception as e:
                logger.warning(f"Tesseract extraction failed: {e}")

        return ""

    def _detect_components(self, image: Image.Image, gray: np.ndarray) -> list[dict[str, Any]]:
        """Dynamically detect certificate components."""
        components = []

        try:
            # Contour detection
            edges = cv2.Canny(gray, 50, 150)
            contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

            height, width = gray.shape
            min_area = (width * height) * 0.01
            max_area = (width * height) * 0.8

            detected_regions = {}

            for contour in contours:
                area = cv2.contourArea(contour)
                if area < min_area or area > max_area:
                    continue

                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = float(w) / h if h != 0 else 0

                # Classify based on aspect ratio and position
                region_type = self._classify_region(x, y, w, h, width, height, aspect_ratio, area)

                if region_type not in detected_regions or area > detected_regions[region_type]["area"]:
                    detected_regions[region_type] = {"x": x, "y": y, "w": w, "h": h, "area": area}

            for region_type, region in detected_regions.items():
                components.append({
                    "type": region_type,
                    "coordinates": {
                        "x": region["x"],
                        "y": region["y"],
                        "width": region["w"],
                        "height": region["h"],
                        "centerX": region["x"] + region["w"] // 2,
                        "centerY": region["y"] + region["h"] // 2,
                    },
                    "area": region["area"],
                    "aspectRatio": float(region["w"]) / region["h"] if region["h"] != 0 else 0,
                    "required": region_type in ["TITLE", "NAME", "ISSUE_DATE"],
                })

        except Exception as e:
            logger.warning(f"Component detection failed: {e}")

        return components

    def _classify_region(self, x: int, y: int, w: int, h: int, width: int, height: int, aspect_ratio: float, area: float) -> str:
        """Classify detected region based on characteristics."""
        # Logo/seal: small, square-ish, often in corners
        if 0.7 < aspect_ratio < 1.3 and area < (width * height) * 0.15:
            if x < width * 0.2 or x > width * 0.8:
                return "LOGO"
            if y < height * 0.2:
                return "HEADER_LOGO"

        # Title: wide, top-center
        if aspect_ratio > 2 and y < height * 0.25 and x > width * 0.1 and x + w < width * 0.9:
            return "TITLE"

        # Name block: wide, centered, middle area
        if aspect_ratio > 1.5 and height * 0.3 < y < height * 0.6:
            return "NAME_BLOCK"

        # QR code: square-ish, bottom area
        if 0.9 < aspect_ratio < 1.1 and y > height * 0.7:
            return "QR_CODE"

        # Watermark: large, faded
        if area > (width * height) * 0.15:
            return "WATERMARK"

        # Text block
        if aspect_ratio > 1.2:
            return "TEXT_BLOCK"

        return "COMPONENT"

    def extract_spatial_relationships(self, components: list[dict[str, Any]], image_width: int, image_height: int) -> list[dict[str, Any]]:
        """Extract spatial relationships between detected components."""
        relationships = []

        for i, source in enumerate(components):
            for target in components[i + 1 :]:
                dist = self._calculate_distance(source, target)
                relation = self._determine_relation(source, target)

                relationships.append({
                    "source": source["type"],
                    "target": target["type"],
                    "relation": relation,
                    "distancePixels": dist,
                    "distancePercent": round((dist / max(image_width, image_height)) * 100, 2),
                })

        return relationships

    def _calculate_distance(self, region1: dict[str, Any], region2: dict[str, Any]) -> int:
        """Calculate Euclidean distance between region centers."""
        x1 = region1["coordinates"]["centerX"]
        y1 = region1["coordinates"]["centerY"]
        x2 = region2["coordinates"]["centerX"]
        y2 = region2["coordinates"]["centerY"]
        return int(((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5)

    def _determine_relation(self, region1: dict[str, Any], region2: dict[str, Any]) -> str:
        """Determine spatial relationship between regions."""
        y1 = region1["coordinates"]["centerY"]
        y2 = region2["coordinates"]["centerY"]
        x1 = region1["coordinates"]["centerX"]
        x2 = region2["coordinates"]["centerX"]

        dy = y2 - y1
        dx = x2 - x1

        if abs(dy) > abs(dx):
            return "BELOW" if dy > 0 else "ABOVE"
        else:
            return "RIGHT_OF" if dx > 0 else "LEFT_OF"
