"""
Configuration management for AI Service.
Handles environment variables and startup validation.
"""

from __future__ import annotations

import logging
import os
import shutil
import sys
from pathlib import Path

from dotenv import load_dotenv

logger = logging.getLogger(__name__)


class Config:
    """Central configuration for AI Service."""

    def __init__(self):
        """Initialize configuration from environment."""
        # Load .env file if exists
        env_file = Path(__file__).parent / ".env"
        if env_file.exists():
            load_dotenv(env_file)
            logger.info(f"[Config] Loaded environment from {env_file}")

        # MongoDB
        self.MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
        self.MONGODB_DB = "quickcheck"

        # JWT (optional)
        self.JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-key-change-in-production")

        # Tesseract (optional but recommended)
        self.TESSERACT_PATH = os.getenv("TESSERACT_PATH")
        
        # Poppler (for PDF conversion)
        self.POPPLER_PATH = os.getenv("POPPLER_PATH")

        # Service
        self.DEBUG = os.getenv("DEBUG", "false").lower() == "true"
        self.HOST = os.getenv("HOST", "0.0.0.0")
        self.PORT = int(os.getenv("PORT", "8001"))

        # Logging
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

        # Frontend CORS
        self.CORS_ORIGINS = os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
        ).split(",")

        # Directories
        self.TEMPLATES_DIR = Path(__file__).parent / "templates"
        self.UPLOADS_DIR = Path(__file__).parent / "uploads"

    def validate_at_startup(self) -> tuple[bool, list[str]]:
        """
        Validate all critical dependencies and configurations.
        
        Returns:
            (success: bool, warnings: list[str])
        """
        warnings = []

        # Check MongoDB
        try:
            from pymongo import MongoClient

            client = MongoClient(self.MONGODB_URI, serverSelectionTimeoutMS=3000)
            client.admin.command("ping")
            client.close()
            logger.info("[✓] MongoDB connection successful")
        except Exception as e:
            warnings.append(f"MongoDB unavailable: {e}")
            logger.warning(f"[✗] MongoDB: {e}")

        # Check Tesseract
        tesseract_path = self._find_tesseract()
        if tesseract_path:
            logger.info(f"[✓] Tesseract found at: {tesseract_path}")
            self.TESSERACT_PATH = tesseract_path
        else:
            warnings.append("Tesseract not found - OCR will not work")
            logger.warning("[✗] Tesseract: not found in system PATH")

        # Check Poppler
        poppler_path = self._find_poppler()
        if poppler_path:
            logger.info(f"[✓] Poppler found at: {poppler_path}")
            self.POPPLER_PATH = poppler_path
        else:
            warnings.append("Poppler not found - PDF conversion will not work")
            logger.warning("[✗] Poppler: not found in system PATH")

        # Check OpenCV
        try:
            import cv2

            logger.info(f"[✓] OpenCV {cv2.__version__} available")
        except ImportError:
            warnings.append("OpenCV not available")
            logger.warning("[✗] OpenCV: not installed")

        # Verify directories
        self.UPLOADS_DIR.mkdir(exist_ok=True, parents=True)
        self.TEMPLATES_DIR.mkdir(exist_ok=True, parents=True)
        logger.info(f"[✓] Upload directory: {self.UPLOADS_DIR}")
        logger.info(f"[✓] Templates directory: {self.TEMPLATES_DIR}")

        return len(warnings) == 0, warnings

    @staticmethod
    def _find_tesseract() -> str | None:
        """Find Tesseract executable in system."""
        # Check environment variable first
        if os.getenv("TESSERACT_PATH"):
            path = os.getenv("TESSERACT_PATH")
            if Path(path).exists():
                return path

        # Windows common paths
        windows_paths = [
            "C:\\Program Files\\Tesseract-OCR\\tesseract.exe",
            "C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe",
        ]
        for path in windows_paths:
            if Path(path).exists():
                return path

        # Use shutil.which to find in PATH
        tesseract = shutil.which("tesseract")
        if tesseract:
            return tesseract

        return None

    @staticmethod
    def _find_poppler() -> str | None:
        """Find Poppler executable in system."""
        # Check environment variable first
        if os.getenv("POPPLER_PATH"):
            path = os.getenv("POPPLER_PATH")
            if Path(path).exists():
                return path

        # Windows common paths
        windows_paths = [
            "C:\\Program Files\\poppler\\Library\\bin",
            "C:\\Program Files (x86)\\poppler\\Library\\bin",
        ]
        for path in windows_paths:
            if Path(path).exists():
                return path

        # Use shutil.which to find in PATH
        pdftoppm = shutil.which("pdftoppm")
        if pdftoppm:
            return str(Path(pdftoppm).parent)

        return None


# Global config instance
config = Config()
