# QuickCheck AI Service - Complete Setup Guide

## Overview

The QuickCheck AI Service is a FastAPI-based certificate fraud detection engine that uses:
- **OCR** (Tesseract) for text extraction
- **Computer Vision** (OpenCV) for visual analysis
- **QR Code Detection** (pyzbar) for certificate verification
- **Template Learning** for dynamic certificate comparison
- **MongoDB** for template storage

## ✅ Key Improvements

This production-ready version includes:

1. **Comprehensive Error Handling** - All operations wrapped in try/catch with detailed logging
2. **Structured API Responses** - All endpoints return consistent JSON format
3. **Request Validation** - File type and size checking before processing
4. **Graceful Degradation** - Continues working with reduced functionality if dependencies missing
5. **Detailed Logging** - All operations logged with context tags ([OCR], [Analyze], [MongoDB], etc.)
6. **Dependency Verification** - /health endpoint checks all critical dependencies
7. **Configuration Management** - .env file support for environment-specific settings
8. **Windows Support** - Proper Tesseract and Poppler path handling for Windows
9. **PDF Handling** - Automatic conversion to images with Poppler
10. **Global Exception Middleware** - Catches unhandled exceptions and returns proper error responses

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On Linux/Mac:
source .venv/bin/activate

# Install Python packages
pip install -r requirements.txt
```

### 2. Install System Dependencies

#### Windows

```powershell
# Install Tesseract OCR
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
# Or use chocolatey:
choco install tesseract

# Install Poppler (for PDF conversion)
# Download from: https://github.com/oschwartz10612/poppler-windows/releases/
# Or use chocolatey:
choco install poppler
```

#### Linux (Ubuntu/Debian)

```bash
# Install Tesseract
sudo apt-get install tesseract-ocr

# Install Poppler
sudo apt-get install poppler-utils
```

#### macOS

```bash
# Install Tesseract
brew install tesseract

# Install Poppler
brew install poppler
```

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
# MONGODB_URI - MongoDB connection string
# TESSERACT_PATH - (optional) Path to tesseract executable
# POPPLER_PATH - (optional) Path to poppler bin directory
# CORS_ORIGINS - Comma-separated list of allowed origins
```

### 4. Setup MongoDB

```bash
# Start MongoDB (local development)
mongod

# Or use Docker:
docker run -d -p 27017:27017 mongo:latest
```

### 5. Run the Service

```bash
# Development mode with auto-reload
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001

# Production mode
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4
```

The service will start and perform startup validation:
- ✓ MongoDB connection
- ✓ Tesseract availability
- ✓ Poppler availability
- ✓ OpenCV availability

## 🔧 API Endpoints

### GET /health

Check service health and dependency status.

**Response:**
```json
{
  "status": "operational",
  "service": "quickcheck-ai",
  "version": "1.0.0",
  "dependencies": {
    "opencv": true,
    "tesseract": true,
    "poppler": true,
    "pyzbar": true,
    "pymongo": true,
    "mongodb": true
  },
  "warnings": []
}
```

### POST /analyze

Analyze a certificate for fraud detection.

**Request (multipart/form-data):**
- `file` (required) - Certificate image or PDF
- `student_name` (optional) - Name to match against OCR
- `template_profile` (optional) - JSON string with learned template
- `certificate_id` (optional) - Certificate ID
- `issue_date` (optional) - Issue date
- `organization` (optional) - Organization name

**Response:**
```json
{
  "fraudProbability": 15.2,
  "confidence": 92.5,
  "recommendation": "ACCEPT",
  "verificationStatus": "VERIFIED",
  "nameSimilarity": 95,
  "visualSimilarity": 88.5,
  "suspiciousIndicators": [],
  "anomalies": [],
  "qrData": "cert-12345",
  "ocrText": "Certificate of Achievement...",
  "textFingerprint": "certificate achievement john smith",
  "extractedFields": {
    "studentName": "John Smith",
    "certificateId": "CERT-12345",
    "issueDate": "2024-05-01",
    "organization": "Acme Corp",
    "resolution": { "width": 1600, "height": 1130, "aspectRatio": 1.4159 },
    "dominantColors": ["#FFFFFF", "#000000", "#1E90FF"]
  }
}
```

### POST /templates/extract

Extract and learn template profile from sample certificates.

**Request (multipart/form-data):**
- `certification_id` (required) - Certification type identifier
- `files` (required) - Multiple certificate images/PDFs

**Response:**
```json
{
  "extractedProfile": { ... },
  "thresholds": {
    "nameSimilarity": 75.2,
    "visualSimilarity": 72.1,
    "fraudReview": 70,
    "fraudReject": 90
  },
  "sampleCount": 5,
  "aggregationQuality": "good"
}
```

### GET /templates/list

List all stored templates.

**Response:**
```json
{
  "count": 2,
  "templates": [
    {
      "id": "507f1f77bcf86cd799439011",
      "certificationId": "cert-123",
      "version": 1,
      "trainedSamples": 5,
      "trainingQuality": "good",
      "trainedAt": "2024-05-01T10:30:00"
    }
  ]
}
```

### GET /templates/{template_id}

Retrieve complete template profile.

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "extractedProfile": { ... },
  "components": [ ... ],
  "relationships": [ ... ],
  "hashes": { ... },
  "thresholds": { ... },
  "metadata": { ... }
}
```

## 📋 Error Handling

The service returns standardized error responses:

```json
{
  "detail": "Error message describing what went wrong"
}
```

Common error codes:
- `400` - Bad request (invalid file, missing required field)
- `500` - Server error (OCR failed, MongoDB connection failed)
- `501` - Not implemented (dependency not available)
- `503` - Service unavailable (MongoDB down)

### Common Issues and Solutions

#### "Tesseract not found"
- **Windows**: Install from https://github.com/UB-Mannheim/tesseract/wiki or set TESSERACT_PATH in .env
- **Linux**: `sudo apt-get install tesseract-ocr`
- **macOS**: `brew install tesseract`

#### "Poppler not found"
- **Windows**: Install from https://github.com/oschwartz10612/poppler-windows/releases/
- **Linux**: `sudo apt-get install poppler-utils`
- **macOS**: `brew install poppler`

#### "MongoDB connection failed"
- Make sure MongoDB is running: `mongod` or `docker run -p 27017:27017 mongo`
- Check MONGODB_URI in .env file

#### "PDF conversion failed"
- Ensure Poppler is installed (see above)
- Check POPPLER_PATH in .env if Poppler is in non-standard location

#### "OCR returns empty text"
- Check if Tesseract is installed and configured
- Verify certificate image has readable text
- Check brightness/contrast of certificate image

## 🔍 Logging

All operations are logged with context tags:

- `[OCR]` - Optical character recognition operations
- `[Analyze]` - Certificate analysis operations
- `[Templates]` - Template extraction/storage operations
- `[MongoDB]` - Database operations
- `[Health]` - Health check operations
- `[Config]` - Configuration validation

Log levels can be configured in .env:
- `DEBUG` - Verbose logging
- `INFO` - General information
- `WARNING` - Warning messages
- `ERROR` - Error messages

## 📦 Requirements

### Python Packages (requirements.txt)
- fastapi==0.115.6 - Web framework
- uvicorn[standard]==0.34.0 - ASGI server
- python-multipart==0.0.20 - File upload handling
- opencv-python-headless==4.10.0.84 - Computer vision
- pytesseract==0.3.13 - OCR interface
- numpy==2.2.1 - Numerical computing
- Pillow==11.1.0 - Image processing
- pyzbar==0.1.9 - QR code detection
- rapidfuzz==3.11.0 - String matching
- ImageHash==4.3.1 - Image hashing
- pdf2image==1.16.3 - PDF conversion
- pymongo==4.9.2 - MongoDB driver
- easyocr==1.7.1 - Alternative OCR
- python-dotenv==1.0.1 - Environment variables
- python-slugify==8.0.1 - URL slug generation

### System Dependencies
- Tesseract OCR (for OCR functionality)
- Poppler (for PDF conversion to images)
- MongoDB (for template storage)

## 🧪 Testing

### Manual Testing

```bash
# Test /health endpoint
curl http://localhost:8001/health

# Test /analyze with a certificate
curl -X POST http://localhost:8001/analyze \
  -F "file=@certificate.jpg" \
  -F "student_name=John Smith" \
  -F "organization=Acme Corp"

# Test /templates/list
curl http://localhost:8001/templates/list
```

### Integration with Frontend

The frontend should be configured to use:

```
VITE_API_URL=http://localhost:8001/api
```

Or update [frontend/.env.local](../frontend/.env.local) accordingly.

## 🚨 Production Deployment

For production, ensure:

1. **Security**
   - Set strong JWT_SECRET in .env
   - Use HTTPS/TLS
   - Configure CORS_ORIGINS to specific domains only
   - Remove DEBUG flag from .env

2. **Performance**
   - Run with multiple workers: `--workers 4`
   - Use process manager (PM2, systemd, supervisor)
   - Enable caching for templates

3. **Monitoring**
   - Enable detailed logging
   - Monitor /health endpoint regularly
   - Set up alerts for errors

4. **Database**
   - Use replicated MongoDB instance
   - Regular backups
   - Database indexes properly configured

## 📞 Support

For issues or questions:
1. Check logs: `tail -f ai-service/logs/*.log`
2. Test /health endpoint: `curl http://localhost:8001/health`
3. Verify all dependencies are installed
4. Check .env configuration
5. Consult IMPLEMENTATION_SUMMARY.md for architecture details
