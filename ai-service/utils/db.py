"""
MongoDB integration for template storage and management.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Any

from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure

logger = logging.getLogger(__name__)


class MongoDBManager:
    """Manage MongoDB connections and operations."""

    def __init__(self, uri: str | None = None):
        """Initialize MongoDB connection."""
        self.uri = uri or os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
        self.client: MongoClient | None = None
        self.db: Any = None

    def connect(self) -> bool:
        """Establish MongoDB connection."""
        try:
            self.client = MongoClient(self.uri, serverSelectionTimeoutMS=5000)
            # Verify connection
            self.client.admin.command("ping")
            self.db = self.client["quickcheck"]
            logger.info(f"[MongoDB] Connected to {self.uri}")

            # Ensure indexes
            self._ensure_indexes()
            return True
        except ConnectionFailure as e:
            logger.error(f"[MongoDB] Connection failed: {e}")
            return False

    def disconnect(self):
        """Close MongoDB connection."""
        if self.client:
            self.client.close()
            logger.info("[MongoDB] Disconnected")

    def _ensure_indexes(self):
        """Ensure required indexes exist."""
        collections_indexes = {
            "organizations": [("slug", ASCENDING), ("name", ASCENDING)],
            "certifications": [("organizationId", ASCENDING), ("slug", ASCENDING)],
            "template_profiles": [("certificationId", ASCENDING), ("version", DESCENDING)],
            "template_components": [("templateId", ASCENDING), ("type", ASCENDING)],
            "template_relationships": [("templateId", ASCENDING)],
            "template_hashes": [("templateId", ASCENDING), ("hash", ASCENDING)],
            "template_analysis_logs": [("templateId", ASCENDING), ("timestamp", DESCENDING)],
        }

        for coll_name, indexes in collections_indexes.items():
            if coll_name not in self.db.list_collection_names():
                self.db.create_collection(coll_name)
            collection = self.db[coll_name]
            for field, direction in indexes:
                collection.create_index([(field, direction)])

    def upsert_organization(self, name: str, slug: str, category: str, **metadata) -> str:
        """Upsert organization document."""
        org = {
            "name": name,
            "slug": slug,
            "category": category,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            **metadata,
        }

        result = self.db.organizations.update_one({"slug": slug}, {"$set": org}, upsert=True)
        return str(result.upserted_id or result.matched_count)

    def upsert_certification(self, organization_id: str, name: str, slug: str, **metadata) -> str:
        """Upsert certification document."""
        cert = {
            "organizationId": organization_id,
            "name": name,
            "slug": slug,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            **metadata,
        }

        result = self.db.certifications.update_one(
            {"organizationId": organization_id, "slug": slug},
            {"$set": cert},
            upsert=True,
        )
        return str(result.upserted_id or result.matched_count)

    def store_template_profile(self, certification_id: str, aggregated_profile: dict[str, Any], version: int = 1) -> str:
        """Store complete template profile in MongoDB."""
        template = {
            "certificationId": certification_id,
            "version": version,
            "extractedProfile": aggregated_profile,
            "thresholds": {
                "nameSimilarity": 78,
                "visualSimilarity": 70,
                "fraudReview": 65,
                "fraudReject": 92,
            },
            "metadata": {
                "trainedAt": datetime.utcnow(),
                "trainingQuality": aggregated_profile.get("metadata", {}).get("trainingQuality"),
                "trainedSamples": aggregated_profile.get("metadata", {}).get("trainedSamples"),
            },
            "status": "ACTIVE",
        }
        result = self.db.template_profiles.insert_one(template)
        return str(result.inserted_id)

    def store_components(self, template_id: str, components: list[dict[str, Any]]):
        """Store template components."""
        for component in components:
            doc = {"templateId": template_id, "createdAt": datetime.utcnow(), **component}
            self.db.template_components.insert_one(doc)

    def store_relationships(self, template_id: str, relationships: list[dict[str, Any]]):
        """Store template spatial relationships."""
        doc = {
            "templateId": template_id,
            "relationships": relationships,
            "createdAt": datetime.utcnow(),
        }
        self.db.template_relationships.insert_one(doc)

    def store_hashes(self, template_id: str, hashes: dict[str, Any]):
        """Store template hashes."""
        doc = {
            "templateId": template_id,
            "hashes": hashes,
            "createdAt": datetime.utcnow(),
        }
        self.db.template_hashes.insert_one(doc)

    def log_extraction(self, template_id: str, status: str, details: dict[str, Any]):
        """Log extraction operation."""
        log = {
            "templateId": template_id,
            "status": status,
            "details": details,
            "timestamp": datetime.utcnow(),
        }
        self.db.template_analysis_logs.insert_one(log)

    def get_template_by_certification(self, certification_id: str) -> dict[str, Any] | None:
        """Retrieve template by certification ID."""
        return self.db.template_profiles.find_one(
            {"certificationId": certification_id, "status": "ACTIVE"},
            sort=[("version", DESCENDING)],
        )

    def list_templates(self, limit: int = 100) -> list[dict[str, Any]]:
        """List all active templates."""
        return list(self.db.template_profiles.find({"status": "ACTIVE"}).limit(limit))

    def close(self):
        """Close the database connection."""
        if self.client:
            self.client.close()
