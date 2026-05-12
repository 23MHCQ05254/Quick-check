#!/usr/bin/env bash
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FORCE=0
if [ "${1:-}" = "--force" ]; then FORCE=1; fi

copy_if_missing() {
  src="$1"; dest="$2"
  if [ -f "$dest" ] && [ $FORCE -ne 1 ]; then
    echo "Skipping existing: $dest"
  else
    cp -f "$src" "$dest"
    echo "Created: $dest"
  fi
}

if [ -f "$ROOT_DIR/backend/.env.example" ]; then
  copy_if_missing "$ROOT_DIR/backend/.env.example" "$ROOT_DIR/backend/.env"
fi

if [ -f "$ROOT_DIR/ai-service/.env.example" ]; then
  copy_if_missing "$ROOT_DIR/ai-service/.env.example" "$ROOT_DIR/ai-service/.env"
fi

echo "Env generation complete. Edit .env files for production values."
