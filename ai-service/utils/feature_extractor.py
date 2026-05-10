"""
Advanced Feature Extractor for Dynamic Certificate Learning

Extracts real, measurable features from certificates including:
- OCR text with coordinates
- Layout structure and regions
- Logos and visual markers
- QR codes and metadata
- Color profiles
- Image hashes and fingerprints
- Signature/stamp regions
- Visual embeddings
"""

from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path
from typing import Any

import cv2
import imagehash
import numpy as np
from PIL import Image, ImageStat

try:
    from pyzbar.pyzbar import decode as decode_qr
except Exception:
    decode_qr = None

try:
    import pytesseract
except ImportError:
    pytesseract = None

try:
    import easyocr
except ImportError:
    easyocr = None

try:
    from skimage import feature as skimage_feature
    from skimage.metrics import structural_similarity as ssim
except ImportError:
    skimage_feature = None
    ssim = None

logger = logging.getLogger(__name__)


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


class FeatureExtractor:
    """Extract comprehensive, measurable features from certificate images."""

    def __init__(self):
        self.reader = easyocr.Reader(["en"]) if easyocr else None
        logger.info("FeatureExtractor initialized")

    def extract_all_features(self, path: Path) -> dict[str, Any]:
        """
        Extract complete feature set from certificate image.
        
        Returns:
            Dictionary with all extracted features organized by category.
        """
        features = {
            "filePath": str(path),
            "binaryHash": binary_hash(path),
            "resolution": {"width": 0, "height": 0, "aspectRatio": 0},
            "colorProfiles": [],
            "ocrBlocks": [],
            "textCoordinates": [],
            "qrCodes": [],
            "logos": [],
            "signatures": [],
            "layouts": [],
            "imageHashes": {
                "perceptual": "",
                "difference": "",
                "average": "",
                "wavelet": ""
            },
            "visualDescriptors": [],
            "embeddings": [],
            "edges": {
                "density": 0,
                "regions": []
            },
            "brightness": 0,
            "contrast": 0,
            "saturation": 0,
            "dominantColors": [],
            "gradients": [],
            "textDensity": 0,
            "cornerDensity": 0,
            "metadata": {
                "extractionTimestamp": None,
                "confidence": 0,
                "warnings": []
            }
        }

        try:
            image = Image.open(path).convert("RGB")
            image_array = np.array(image)
            gray_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)

            # Basic resolution
            h, w = image_array.shape[:2]
            features["resolution"] = {
                "width": w,
                "height": h,
                "aspectRatio": round(w / h, 4) if h else 0
            }

            # Color analysis
            features["colorProfiles"] = self._extract_colors(image)
            features["dominantColors"] = features["colorProfiles"][:5]
            
            # Brightness, contrast, saturation
            features["brightness"] = self._calculate_brightness(gray_array)
            features["contrast"] = self._calculate_contrast(gray_array)
            features["saturation"] = self._calculate_saturation(image_array)

            # Image hashes
            features["imageHashes"] = self._extract_image_hashes(image, image_array)

            # OCR extraction
            ocr_data = self._extract_ocr(image, gray_array)
            features["ocrBlocks"] = ocr_data["blocks"]
            features["textCoordinates"] = ocr_data["coordinates"]

            # QR detection
            if decode_qr:
                features["qrCodes"] = self._extract_qr(image)

            # Structural analysis
            edge_data = self._extract_edges(gray_array)
            features["edges"]["density"] = edge_data["density"]
            features["edges"]["regions"] = edge_data["regions"]

            # Text and corner density
            features["textDensity"] = self._extract_text_density(gray_array)
            features["cornerDensity"] = self._extract_corner_density(gray_array)

            # Layout structure
            features["layouts"] = self._extract_layout_regions(image_array, gray_array)

            # Potential logos/seals (large contours with text/graphics)
            features["logos"] = self._extract_logo_regions(image_array, gray_array)

            # Signature/stamp regions (darker, isolated regions)
            features["signatures"] = self._extract_signature_regions(image_array, gray_array)

            # Gradients
            features["gradients"] = self._extract_gradients(gray_array)

            # Visual descriptors (for later embedding)
            features["visualDescriptors"] = self._extract_visual_descriptors(gray_array)

            features["metadata"]["confidence"] = 95

        except Exception as e:
            logger.error(f"Error extracting features from {path}: {e}")
            features["metadata"]["warnings"].append(str(e))
            features["metadata"]["confidence"] = 0

        return features

    def _extract_colors(self, image: Image.Image) -> list[str]:
        """Extract dominant colors from image."""
        try:
            small = image.resize((80, 80))
            colors = small.getcolors(maxcolors=6400) or []
            colors = sorted(colors, reverse=True, key=lambda x: x[0])[:8]
            return [rgb_to_hex(color[1]) for color in colors]
        except Exception as e:
            logger.warning(f"Color extraction failed: {e}")
            return []

    def _calculate_brightness(self, gray_array: np.ndarray) -> float:
        """Calculate average brightness."""
        try:
            return float(np.mean(gray_array))
        except Exception:
            return 0.0

    def _calculate_contrast(self, gray_array: np.ndarray) -> float:
        """Calculate image contrast (standard deviation)."""
        try:
            return float(np.std(gray_array))
        except Exception:
            return 0.0

    def _calculate_saturation(self, image_array: np.ndarray) -> float:
        """Calculate average color saturation."""
        try:
            hsv = cv2.cvtColor(image_array, cv2.COLOR_RGB2HSV)
            saturation = hsv[:, :, 1].astype(np.float32)
            return float(np.mean(saturation))
        except Exception:
            return 0.0

    def _extract_image_hashes(self, image: Image.Image, image_array: np.ndarray) -> dict[str, str]:
        """Extract multiple types of image hashes."""
        hashes = {
            "perceptual": "",
            "difference": "",
            "average": "",
            "wavelet": ""
        }
        try:
            if imagehash:
                hashes["perceptual"] = str(imagehash.phash(image))
                hashes["difference"] = str(imagehash.dhash(image))
                hashes["average"] = str(imagehash.average_hash(image))
                hashes["wavelet"] = str(imagehash.whash(image))
        except Exception as e:
            logger.warning(f"Hash extraction failed: {e}")
        return hashes

    def _extract_ocr(self, image: Image.Image, gray_array: np.ndarray) -> dict[str, Any]:
        """Extract OCR text with bounding box coordinates."""
        blocks = []
        coordinates = []

        # Try EasyOCR first
        if self.reader:
            try:
                results = self.reader.readtext(gray_array)
                for (bbox, text, confidence) in results:
                    if text.strip() and confidence > 0.3:
                        # bbox is list of 4 corners
                        x_coords = [point[0] for point in bbox]
                        y_coords = [point[1] for point in bbox]
                        x_min, x_max = min(x_coords), max(x_coords)
                        y_min, y_max = min(y_coords), max(y_coords)
                        
                        block = {
                            "text": text.strip(),
                            "confidence": float(confidence),
                            "bbox": {
                                "x": float(x_min),
                                "y": float(y_min),
                                "width": float(x_max - x_min),
                                "height": float(y_max - y_min)
                            }
                        }
                        blocks.append(block)
                        coordinates.append({
                            "text": text.strip(),
                            "x": float(x_min),
                            "y": float(y_min),
                            "width": float(x_max - x_min),
                            "height": float(y_max - y_min)
                        })
                return {"blocks": blocks, "coordinates": coordinates}
            except Exception as e:
                logger.warning(f"EasyOCR failed: {e}")

        # Fallback to Tesseract
        if pytesseract:
            try:
                data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
                for i, text in enumerate(data["text"]):
                    if text.strip():
                        confidence = int(data["conf"][i])
                        if confidence > 30:
                            block = {
                                "text": text.strip(),
                                "confidence": float(confidence) / 100,
                                "bbox": {
                                    "x": float(data["left"][i]),
                                    "y": float(data["top"][i]),
                                    "width": float(data["width"][i]),
                                    "height": float(data["height"][i])
                                }
                            }
                            blocks.append(block)
                            coordinates.append({
                                "text": text.strip(),
                                "x": float(data["left"][i]),
                                "y": float(data["top"][i]),
                                "width": float(data["width"][i]),
                                "height": float(data["height"][i])
                            })
            except Exception as e:
                logger.warning(f"Tesseract failed: {e}")

        return {"blocks": blocks, "coordinates": coordinates}

    def _extract_qr(self, image: Image.Image) -> list[dict[str, Any]]:
        """Extract QR codes and metadata."""
        qr_codes = []
        try:
            decoded = decode_qr(image)
            for qr in decoded:
                qr_codes.append({
                    "data": qr.data.decode("utf-8", errors="ignore"),
                    "type": str(qr.type),
                    "quality": int(qr.quality) if hasattr(qr, "quality") else 0,
                    "bbox": {
                        "x": float(qr.rect.left),
                        "y": float(qr.rect.top),
                        "width": float(qr.rect.width),
                        "height": float(qr.rect.height)
                    }
                })
        except Exception as e:
            logger.debug(f"QR extraction failed: {e}")
        return qr_codes

    def _extract_edges(self, gray_array: np.ndarray) -> dict[str, Any]:
        """Extract edge information."""
        try:
            edges = cv2.Canny(gray_array, 80, 180)
            density = float(np.count_nonzero(edges)) / edges.size

            # Find edge regions
            contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            regions = []
            for contour in contours[:20]:  # Top 20 edge regions
                area = cv2.contourArea(contour)
                if area > 100:
                    x, y, w, h = cv2.boundingRect(contour)
                    regions.append({
                        "x": int(x),
                        "y": int(y),
                        "width": int(w),
                        "height": int(h),
                        "area": int(area)
                    })

            return {
                "density": round(density, 4),
                "regions": sorted(regions, key=lambda r: r["area"], reverse=True)[:10]
            }
        except Exception as e:
            logger.warning(f"Edge extraction failed: {e}")
            return {"density": 0, "regions": []}

    def _extract_text_density(self, gray_array: np.ndarray) -> float:
        """Calculate text density via thresholding."""
        try:
            threshold = cv2.threshold(gray_array, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
            density = float(np.count_nonzero(threshold)) / threshold.size
            return round(density, 4)
        except Exception:
            return 0.0

    def _extract_corner_density(self, gray_array: np.ndarray) -> float:
        """Calculate corner density via Harris corner detection."""
        try:
            corners = cv2.cornerHarris(gray_array, 2, 3, 0.04)
            corner_count = np.count_nonzero(corners > 0.1 * corners.max())
            density = float(corner_count) / gray_array.size
            return round(density, 4)
        except Exception:
            return 0.0

    def _extract_layout_regions(self, image_array: np.ndarray, gray_array: np.ndarray) -> list[dict[str, Any]]:
        """Detect major layout regions (content areas)."""
        regions = []
        try:
            # Threshold to find main content areas
            threshold = cv2.threshold(gray_array, 127, 255, cv2.THRESH_BINARY)[1]
            contours, _ = cv2.findContours(threshold, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            h, w = gray_array.shape
            min_area = (w * h) * 0.02
            max_area = (w * h) * 0.7

            for contour in contours:
                area = cv2.contourArea(contour)
                if min_area <= area <= max_area:
                    x, y, cw, ch = cv2.boundingRect(contour)
                    regions.append({
                        "type": "layout_region",
                        "x": int(x),
                        "y": int(y),
                        "width": int(cw),
                        "height": int(ch),
                        "area": int(area),
                        "aspectRatio": round(cw / ch, 2) if ch else 0
                    })

            return sorted(regions, key=lambda r: r["area"], reverse=True)[:10]
        except Exception as e:
            logger.warning(f"Layout extraction failed: {e}")
            return []

    def _extract_logo_regions(self, image_array: np.ndarray, gray_array: np.ndarray) -> list[dict[str, Any]]:
        """Detect potential logo/seal regions (high-contrast areas)."""
        logos = []
        try:
            # Detect high-contrast regions that could be logos
            edges = cv2.Canny(gray_array, 50, 150)
            contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

            h, w = gray_array.shape
            for contour in contours:
                area = cv2.contourArea(contour)
                if 500 < area < (w * h * 0.2):
                    x, y, cw, ch = cv2.boundingRect(contour)
                    circularity = 4 * np.pi * area / (cv2.arcLength(contour, True) ** 2 + 1e-5)
                    
                    logos.append({
                        "type": "logo_or_seal",
                        "x": int(x),
                        "y": int(y),
                        "width": int(cw),
                        "height": int(ch),
                        "area": int(area),
                        "circularity": round(circularity, 3)
                    })

            return sorted(logos, key=lambda r: r["circularity"], reverse=True)[:10]
        except Exception as e:
            logger.warning(f"Logo extraction failed: {e}")
            return []

    def _extract_signature_regions(self, image_array: np.ndarray, gray_array: np.ndarray) -> list[dict[str, Any]]:
        """Detect potential signature/stamp regions."""
        signatures = []
        try:
            # Morphological operations to find ink regions
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
            morph = cv2.morphologyEx(gray_array, cv2.MORPH_CLOSE, kernel)
            threshold = cv2.threshold(morph, 150, 255, cv2.THRESH_BINARY)[1]

            contours, _ = cv2.findContours(threshold, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            h, w = gray_array.shape
            for contour in contours:
                area = cv2.contourArea(contour)
                if 1000 < area < (w * h * 0.3):
                    x, y, cw, ch = cv2.boundingRect(contour)
                    
                    # Check if region has high ink density (characteristic of signatures)
                    roi = threshold[y:y+ch, x:x+cw]
                    ink_density = np.count_nonzero(roi) / (cw * ch + 1e-5)
                    
                    if 0.3 < ink_density < 0.8:
                        signatures.append({
                            "type": "signature_or_stamp",
                            "x": int(x),
                            "y": int(y),
                            "width": int(cw),
                            "height": int(ch),
                            "area": int(area),
                            "inkDensity": round(ink_density, 3)
                        })

            return sorted(signatures, key=lambda r: r["area"], reverse=True)[:5]
        except Exception as e:
            logger.warning(f"Signature extraction failed: {e}")
            return []

    def _extract_gradients(self, gray_array: np.ndarray) -> list[dict[str, Any]]:
        """Detect significant gradients in the image."""
        gradients = []
        try:
            sobelx = cv2.Sobel(gray_array, cv2.CV_64F, 1, 0, ksize=5)
            sobely = cv2.Sobel(gray_array, cv2.CV_64F, 0, 1, ksize=5)
            magnitude = np.sqrt(sobelx**2 + sobely**2)

            h, w = gray_array.shape
            gradient_threshold = np.percentile(magnitude, 85)
            grad_mask = magnitude > gradient_threshold

            contours, _ = cv2.findContours(grad_mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            for contour in contours[:10]:
                x, y, cw, ch = cv2.boundingRect(contour)
                if cw > 20 and ch > 20:
                    gradients.append({
                        "x": int(x),
                        "y": int(y),
                        "width": int(cw),
                        "height": int(ch),
                        "magnitude": float(np.mean(magnitude[y:y+ch, x:x+cw]))
                    })

            return sorted(gradients, key=lambda g: g["magnitude"], reverse=True)[:5]
        except Exception as e:
            logger.warning(f"Gradient extraction failed: {e}")
            return []

    def _extract_visual_descriptors(self, gray_array: np.ndarray) -> list[dict[str, Any]]:
        """Extract visual feature descriptors for similarity matching."""
        descriptors = []
        try:
            if skimage_feature:
                # Use ORB or SIFT-like features
                keypoints = cv2.goodFeaturesToTrack(gray_array, 200, 0.01, 10)
                if keypoints is not None:
                    for kp in keypoints[:50]:
                        x, y = kp[0]
                        descriptors.append({
                            "x": float(x),
                            "y": float(y),
                            "type": "keypoint"
                        })
        except Exception as e:
            logger.debug(f"Visual descriptor extraction failed: {e}")
        return descriptors
