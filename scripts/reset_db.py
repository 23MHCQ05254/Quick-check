"""
Reset MongoDB database for a clean first-install state.

Usage:
  python scripts/reset_db.py --uri mongodb://localhost:27017/quickcheck
  or set MONGODB_URI env var and run without args.

This will drop the target database entirely. Use with caution.
"""
from __future__ import annotations

import argparse
import os
import sys
from urllib.parse import urlparse

from pymongo import MongoClient


def parse_args():
    p = argparse.ArgumentParser(description="Drop and recreate MongoDB database (clean reset)")
    p.add_argument("--uri", help="MongoDB URI (mongodb://host:port/dbname)")
    return p.parse_args()


def get_db_name_from_uri(uri: str) -> str:
    parsed = urlparse(uri)
    path = (parsed.path or "").lstrip("/")
    return path or "quickcheck"


def main():
    args = parse_args()
    uri = args.uri or os.getenv("MONGODB_URI") or "mongodb://localhost:27017/quickcheck"
    db_name = get_db_name_from_uri(uri)

    print(f"[reset_db] Connecting to: {uri}")
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)

    try:
        client.admin.command("ping")
    except Exception as e:
        print(f"ERROR: Could not connect to MongoDB: {e}")
        sys.exit(2)

    confirm = os.getenv("RESET_CONFIRM")
    if confirm != "YES":
        print("To proceed you MUST set environment variable RESET_CONFIRM=YES")
        print("This prevents accidental database deletion.")
        print("Example: RESET_CONFIRM=YES python scripts/reset_db.py --uri mongodb://localhost:27017/quickcheck")
        sys.exit(1)

    print(f"[reset_db] Dropping database: {db_name}")
    client.drop_database(db_name)
    print("[reset_db] Dropped database successfully.")

    # Recreate canonical collections and indexes used by the services
    db = client[db_name]
    collections = [
        "users",
        "certificates",
        "template_profiles",
        "template_hashes",
        "template_relationships",
        "template_components",
        "uploads",
        "verification_logs",
        "organizations",
        "certifications",
        "sessions",
        "tokens",
        "template_analysis_logs",
    ]

    for coll in collections:
        db.create_collection(coll)
        print(f"[reset_db] Created empty collection: {coll}")

    print("[reset_db] Reset complete. Indexes will be re-created by services on startup if configured.")


if __name__ == "__main__":
    main()
