#!/bin/bash
# Template Seeding Setup Guide

# This script helps set up the template learning pipeline

echo "=========================================="
echo "QuickCheck Template Seeding Setup"
echo "=========================================="

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    exit 1
fi

echo "✓ Python 3 found: $(python3 --version)"

# Navigate to AI service directory
cd ai-service || exit

echo ""
echo "=========================================="
echo "Setting up Python environment..."
echo "=========================================="

# Create virtual environment
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi

# Activate virtual environment
echo "Activating virtual environment..."
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
elif [ -f ".venv/Scripts/activate" ]; then
    source .venv/Scripts/activate
else
    echo "❌ Could not find activate script"
    exit 1
fi

echo "✓ Virtual environment activated"

echo ""
echo "=========================================="
echo "Installing dependencies..."
echo "=========================================="

pip install --upgrade pip setuptools wheel

echo "Installing requirements..."
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install requirements"
    exit 1
fi

echo "✓ All dependencies installed"

echo ""
echo "=========================================="
echo "Optional System Dependencies"
echo "=========================================="

echo ""
echo "For better OCR, install Tesseract:"
echo "  Ubuntu/Debian: apt-get install tesseract-ocr"
echo "  Mac: brew install tesseract"
echo "  Windows: Download from https://github.com/UB-Mannheim/tesseract"

echo ""
echo "For PDF conversion, install Poppler:"
echo "  Ubuntu/Debian: apt-get install poppler-utils"
echo "  Mac: brew install poppler"
echo "  Windows: Already included in pdf2image on Windows"

echo ""
echo "=========================================="
echo "Template Directory Structure"
echo "=========================================="

echo ""
echo "Current structure:"
find templates -type d | head -20

echo ""
echo "To add templates, place certificate files in:"
echo "  templates/<organization>/<certificate_file>"
echo ""
echo "Example:"
echo "  templates/mongodb/cert_1.pdf"
echo "  templates/mongodb/cert_2.png"
echo "  templates/aws/cert_1.pdf"

echo ""
echo "=========================================="
echo "Next Steps"
echo "=========================================="

echo ""
echo "1. Add sample certificates to templates/ directory"
echo ""
echo "2. (Optional) Start MongoDB:"
echo "   mongod"
echo ""
echo "3. Run the seeding script:"
echo "   python scripts/seed_templates.py"
echo ""
echo "4. Start the AI service:"
echo "   uvicorn main:app --reload --port 8000"
echo ""
echo "5. In another terminal, start the backend:"
echo "   cd backend"
echo "   npm run dev"
echo ""
echo "6. Test the API:"
echo "   curl http://localhost:8000/health"
echo "   curl http://localhost:8000/templates/list"

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
