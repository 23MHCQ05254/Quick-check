"""
OCR preprocessing and fallback pipeline.

Provides preprocessing (grayscale, denoise, threshold, sharpen)
and an OCR runner that prefers Tesseract but falls back to EasyOCR.
"""
from __future__ import annotations

from typing import Any
import re
import logging

from PIL import Image, ImageFilter, ImageOps
import numpy as np
from PIL import ImageEnhance

logger = logging.getLogger(__name__)

try:
    import pytesseract
except Exception:
    pytesseract = None

try:
    import easyocr
except Exception:
    easyocr = None


def preprocess_pil_image(image: Image.Image, resize_max: int = 2000) -> Image.Image:
    """Apply grayscale, denoise, thresholding, and sharpening to PIL Image.

    Keeps operations conservative to preserve real-world photos/screenshots.
    """
    try:
        # Convert to RGB then to grayscale
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Resize down if extremely large, maintain aspect
        w, h = image.size
        max_dim = max(w, h)
        if max_dim > resize_max:
            scale = resize_max / float(max_dim)
            image = image.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

        gray = ImageOps.grayscale(image)

        # Contrast enhancement
        try:
            enhancer = ImageEnhance.Contrast(gray)
            gray = enhancer.enhance(1.2)
        except Exception:
            pass

        # Mild denoise: median filter
        denoised = gray.filter(ImageFilter.MedianFilter(size=3))

        # Skew correction: use Tesseract OSD if available
        try:
            if pytesseract:
                try:
                    osd = pytesseract.image_to_osd(gray)
                    m = re.search(r"Rotate:\s*(\d+)", osd)
                    if m:
                        angle = int(m.group(1))
                        if angle and angle != 0:
                            gray = gray.rotate(-angle, expand=True)
                except Exception:
                    pass
        except Exception:
            pass

        # Adaptive thresholding: approximate with point transform
        try:
            arr = np.array(denoised)
            # Compute local mean using a simple blur
            import cv2

            blurred = cv2.GaussianBlur(arr, (5, 5), 0)
            thresh = (arr > (blurred * 0.9)).astype('uint8') * 255
            processed = Image.fromarray(thresh)
        except Exception:
            # Fallback threshold
            processed = denoised.point(lambda p: 255 if p > 160 else 0)

        # Unsharp mask for sharpening
        sharpened = processed.filter(ImageFilter.UnsharpMask(radius=1, percent=120, threshold=3))

        return sharpened.convert("RGB")
    except Exception as e:
        logger.warning(f"OCR preprocessing failed: {e}")
        return image


def run_ocr(pil_image: Image.Image) -> tuple[str, float]:
    """Run OCR using Tesseract, falling back to EasyOCR. Returns (text, confidence_estimate).

    The confidence is a heuristic useful for downstream scoring.
    """
    text = ""
    conf = 40.0

    img = preprocess_pil_image(pil_image)

    # Try Tesseract first (if available)
    if pytesseract:
        try:
            opts = "--psm 6"
            ocr_text = pytesseract.image_to_string(img, config=opts)
            if ocr_text and ocr_text.strip():
                text = ocr_text
                conf = 85.0
                logger.info("OCR: Tesseract succeeded")
                return text, conf
        except Exception as e:
            logger.warning(f"Tesseract OCR failed: {e}")

    # Fallback to EasyOCR
    if easyocr:
        try:
            reader = easyocr.Reader(['en'], gpu=False)
            results = reader.readtext(np.array(img))
            parts = [r[1] for r in results if r and r[1]]
            if parts:
                text = "\n".join(parts)
                conf = 75.0
                logger.info("OCR: EasyOCR succeeded")
                return text, conf
        except Exception as e:
            logger.warning(f"EasyOCR failed: {e}")

    # If none succeeded, try a relaxed Tesseract OCR once more
    if pytesseract:
        try:
            ocr_text = pytesseract.image_to_string(img, config="--psm 3")
            if ocr_text and ocr_text.strip():
                text = ocr_text
                conf = 65.0
                return text, conf
        except Exception:
            pass

    return text, conf
