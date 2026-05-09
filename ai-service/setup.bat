@echo off
REM Template Seeding Setup Guide for Windows

echo ==========================================
echo QuickCheck Template Seeding Setup
echo ==========================================

REM Check if Python 3 is installed
python3 --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python 3 is not installed
    exit /b 1
)

for /f "tokens=*" %%i in ('python3 --version') do set PYTHON_VERSION=%%i
echo ✓ %PYTHON_VERSION% found

REM Navigate to AI service directory
cd ai-service || exit /b 1

echo.
echo ==========================================
echo Setting up Python environment...
echo ==========================================

REM Create virtual environment
if not exist ".venv" (
    echo Creating virtual environment...
    python3 -m venv .venv
    echo ✓ Virtual environment created
) else (
    echo ✓ Virtual environment already exists
)

REM Activate virtual environment
echo Activating virtual environment...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo ❌ Could not activate virtual environment
    exit /b 1
)

echo ✓ Virtual environment activated

echo.
echo ==========================================
echo Installing dependencies...
echo ==========================================

python3 -m pip install --upgrade pip setuptools wheel

echo Installing requirements...
python3 -m pip install -r requirements.txt

if errorlevel 1 (
    echo ❌ Failed to install requirements
    exit /b 1
)

echo ✓ All dependencies installed

echo.
echo ==========================================
echo Optional System Dependencies
echo ==========================================

echo.
echo For better OCR, install Tesseract:
echo   Windows: Download from https://github.com/UB-Mannheim/tesseract
echo   Then set PYTESSERACT_PATH environment variable

echo.
echo For PDF conversion (Poppler):
echo   Windows: Usually included with pdf2image
echo   If issues occur: download from https://github.com/oschwartz10612/poppler-windows

echo.
echo ==========================================
echo Template Directory Structure
echo ==========================================

echo.
echo Current structure:
dir templates /s /b 2>nul | findstr /R "^" | more

echo.
echo To add templates, place certificate files in:
echo   templates\^<organization^>\^<certificate_file^>
echo.
echo Example:
echo   templates\mongodb\cert_1.pdf
echo   templates\mongodb\cert_2.png
echo   templates\aws\cert_1.pdf

echo.
echo ==========================================
echo Next Steps
echo ==========================================

echo.
echo 1. Add sample certificates to templates\ directory
echo.
echo 2. (Optional) Start MongoDB
echo.
echo 3. Run the seeding script:
echo    python scripts\seed_templates.py
echo.
echo 4. Start the AI service:
echo    uvicorn main:app --reload --port 8000
echo.
echo 5. In another terminal, start the full stack:
echo    cd ..
echo    npm run dev
echo.
echo 6. Test the API:
echo    curl http://localhost:8000/health
echo    curl http://localhost:8000/templates/list

echo.
echo ==========================================
echo Setup Complete!
echo ==========================================
