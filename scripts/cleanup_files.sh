#!/usr/bin/env bash
# Cleanup generated files and caches (UNIX / WSL / Git Bash)
# Usage: ./scripts/cleanup_files.sh --yes

set -euo pipefail

FORCE=0
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --yes) FORCE=1; shift ;;
    -h|--help) echo "Usage: $0 [--yes]"; exit 0 ;;
    *) shift ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

targets=(
  "$ROOT_DIR/backend/uploads"
  "$ROOT_DIR/ai-service/uploads"
  "$ROOT_DIR/ai-service/temp"
  "$ROOT_DIR/ai-service/cache"
  "$ROOT_DIR/ai-service/generated"
  "$ROOT_DIR/ai-service/trained"
  "$ROOT_DIR/test-certs"
  "$ROOT_DIR/test-certs-real"
  "$ROOT_DIR/frontend/dist"
  "$ROOT_DIR/frontend/build"
)

for t in "${targets[@]}"; do
  if [ -e "$t" ]; then
    if [ $FORCE -eq 1 ]; then
      echo "Removing $t"
      rm -rf "$t"
    else
      echo "Would remove: $t (pass --yes to actually delete)"
    fi
  fi
done

if [ $FORCE -eq 1 ]; then
  echo "Removing __pycache__ and *.pyc files"
  find "$ROOT_DIR" -type d -name "__pycache__" -prune -exec rm -rf {} + || true
  find "$ROOT_DIR" -type f -name "*.pyc" -delete || true
fi

echo "Cleanup complete."
