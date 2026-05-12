#!/usr/bin/env bash
# Recreate Python virtualenv and install ai-service requirements (UNIX/WSL)
# Usage: ./scripts/recreate_venv.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV_DIR="$ROOT_DIR/.venv"
PYTHON=${PYTHON:-python3}

if [ -d "$VENV_DIR" ]; then
  echo "Removing existing venv: $VENV_DIR"
  rm -rf "$VENV_DIR"
fi

echo "Creating new venv with $PYTHON"
$PYTHON -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"
pip install --upgrade pip
pip install -r "$ROOT_DIR/ai-service/requirements.txt"

echo "Virtual environment recreated and dependencies installed."
