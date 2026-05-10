# Deployment & Verification Checklist

## ✅ Implementation Complete

All components of the dynamic feature-based certificate verification system have been successfully implemented and integrated.

## Files Status

### ✅ New Python Modules (Created)
- [x] `ai-service/utils/feature_extractor.py` - 500+ lines, fully implemented
- [x] `ai-service/utils/similarity_scorer.py` - 400+ lines, fully implemented  
- [x] `ai-service/utils/duplicate_detector.py` - 250+ lines, fully implemented
- [x] `ai-service/main.py` - Updated with new endpoints and integrations
- [x] `DYNAMIC_AI_ARCHITECTURE.md` - Complete documentation

### ✅ Updated Endpoints in main.py
- [x] `/analyze` - Refactored to use real feature extraction and scoring
- [x] `/templates/extract` - Refactored with dynamic aggregation and thresholds
- [x] `/detect-duplicates` - NEW endpoint for duplicate detection
- [x] `/health` - Existing health check

### ✅ Backend Integration
- [x] `backend/src/controllers/certificate.controller.js` - Ready for new data
- [x] `backend/src/models/Certificate.js` - Supports extractedCertificateData
- [x] `backend/src/models/TemplateProfile.js` - Supports dynamic profiles

### ✅ Frontend Compatibility
- [x] Rate-limiting fixes applied (debouncing, increased limits)
- [x] API contract ready for new feature data

## Pre-Deployment Checklist

### Python Environment
- [ ] Python 3.10+ installed
- [ ] Create virtual environment: `python -m venv venv`
- [ ] Activate: `. venv/Scripts/activate` (Windows) or `source venv/bin/activate` (Unix)
- [ ] Install dependencies: `pip install -r ai-service/requirements.txt`
- [ ] Verify no missing packages

### System Dependencies
- [ ] Tesseract OCR installed (for fallback):
  - Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki
  - Linux: `sudo apt-get install tesseract-ocr`
  - macOS: `brew install tesseract`
- [ ] Set TESSDATA_PREFIX env var if needed
- [ ] Verify: `tesseract --version`

### Python Module Imports
- [ ] `cd ai-service && python -m py_compile main.py` - No syntax errors
- [ ] `python -m py_compile utils/feature_extractor.py` - No errors
- [ ] `python -m py_compile utils/similarity_scorer.py` - No errors
- [ ] `python -m py_compile utils/duplicate_detector.py` - No errors

### Quick Import Test
```bash
cd ai-service
python -c "
from utils.feature_extractor import FeatureExtractor
from utils.similarity_scorer import SimilarityScorer
from utils.duplicate_detector import DuplicateDetector
print('✓ All imports successful')
"
```

## Starting the Services

### 1. Start AI Service
```bash
cd ai-service
python -m uvicorn main:app --reload --host localhost --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://localhost:8000
INFO:     Application startup complete
```

### 2. Verify AI Service Health
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status":"ok","service":"quickcheck-ai","version":"1.0.0"}
```

### 3. Start Backend (in new terminal)
```bash
cd backend
npm install  # if not already done
npm start
```

### 4. Start Frontend (in new terminal)
```bash
cd frontend
npm install  # if not already done
npm run dev
```

## Testing the Implementation

### Test 1: Feature Extraction
```bash
# Prepare a test certificate image
curl -X POST http://localhost:8000/analyze \
  -F "file=@path/to/certificate.jpg" \
  -F "certification_id=test" \
  -F "student_name=Test Student" \
  -F "certificate_id=TEST123" \
  -F "organization_name=Test Org" \
  -F "template_profile={\"thresholds\":{\"nameSimilarity\":80}}"
```

Expected response should include:
- `extractedCertificateData` with real features
- `fraudProbability` calculated from similarities
- `verificationStatus` based on fraud score

### Test 2: Template Extraction
```bash
# Upload multiple sample certificates
curl -X POST http://localhost:8000/templates/extract \
  -F "certification_id=aws-certification" \
  -F "files=@sample1.jpg" \
  -F "files=@sample2.jpg" \
  -F "files=@sample3.jpg"
```

Expected response should include:
- `extractedProfile` with aggregated features
- `thresholds` calculated from samples
- `trainingQuality` assessment
- `sampleCount` > 0

### Test 3: Duplicate Detection
```bash
curl -X POST http://localhost:8000/detect-duplicates \
  -F "file=@certificate.jpg" \
  -F "existing_certificates=[]"
```

Expected response should include:
- `duplicateProbability` (0-100)
- `matches` array (empty if first upload)

## Validation Checks

### Feature Extraction Validation
- [ ] OCR text extracted with confidence scores > 0.8
- [ ] QR codes detected if present in image
- [ ] Image hashes generated (4 types)
- [ ] Color profiles extracted (3-8 dominant colors)
- [ ] Resolution and layout regions identified
- [ ] Brightness/contrast/saturation calculated

### Fraud Probability Validation
- [ ] Score between 0-100
- [ ] Based on weighted combination (not random)
- [ ] Verified certificates < 30% fraud
- [ ] Suspicious certificates 30-70% fraud
- [ ] Rejected certificates > 70% fraud
- [ ] Confidence score based on data availability

### Template Learning Validation
- [ ] Aggregates features from all samples
- [ ] Calculates thresholds from real data (not hardcoded)
- [ ] Training quality assessment (excellent/good/fair)
- [ ] Threshold values vary based on training samples

### Database Validation
- [ ] Certificate documents store `extractedCertificateData`
- [ ] TemplateProfile documents store aggregated features
- [ ] Thresholds are dynamic (not hardcoded)
- [ ] All analysis results queryable

## Performance Baseline

### Expected Processing Times
- Feature extraction (single certificate): 3-8 seconds
- Template extraction (8 samples): 30-60 seconds
- Duplicate detection: 1-3 seconds
- API response time: 100-500ms

### Resource Usage
- Python process memory: 300-600MB
- Model cache: ~200MB (first run only)
- Database query: <100ms

## Monitoring

### Logs to Watch
```bash
# AI Service logs
tail -f venv/Lib/site-packages/uvicorn.log

# Backend logs  
npm start 2>&1 | grep -i error

# MongoDB logs
# Check MongoDB Atlas or local instance
```

### Key Metrics
- [ ] API response time < 5 seconds
- [ ] Feature extraction success rate > 95%
- [ ] Database write success rate > 99%
- [ ] No unhandled exceptions in logs

## Common Issues & Solutions

### Issue: "ModuleNotFoundError: No module named 'cv2'"
**Solution:** Install opencv-python: `pip install opencv-python-headless`

### Issue: "pytesseract.TesseractNotFoundError"
**Solution:** Install Tesseract and set TESSDATA_PREFIX environment variable

### Issue: "ModuleNotFoundError: No module named 'easyocr'"
**Solution:** Install easyocr: `pip install easyocr`
**Note:** First run will download ~200MB model file

### Issue: "Uvicorn connection refused"
**Solution:** Ensure AI service is running on port 8000

### Issue: "Fraud probability always 50%"
**Solution:** Check that similarity scoring functions are being called (not just returning defaults)

### Issue: "Template extraction returns empty features"
**Solution:** Verify uploaded images are valid (not corrupted), readable by PIL/OpenCV

## Database Reset (if needed)

```javascript
// Clear certificates
db.certificates.deleteMany({});

// Clear template profiles
db.templateprofiles.deleteMany({});

// Clear activity logs
db.activitylogs.deleteMany({});
```

## Post-Deployment Tasks

- [ ] Configure production rate limits (higher than development)
- [ ] Set up error monitoring (Sentry, LogRocket, etc.)
- [ ] Configure database backups
- [ ] Set up performance monitoring (APM)
- [ ] Create runbooks for common issues
- [ ] Document API contracts for frontend team
- [ ] Train mentors on feature extraction accuracy
- [ ] Establish baseline fraud detection metrics

## Success Indicators

✅ **System is ready when:**
1. All Python modules compile without errors
2. AI service responds to health check
3. Feature extraction returns all feature categories
4. Fraud probability varies based on actual differences (not hardcoded)
5. Template learning aggregates features from multiple samples
6. Duplicate detection identifies actual duplicates
7. MongoDB stores all analysis results
8. Backend API properly passes data to frontend
9. No hardcoded values in fraud calculations
10. System learns and adapts from training data

## Rollback Plan

If issues occur:
1. Stop AI service
2. Revert `ai-service/main.py` to previous version
3. Delete new utility modules if necessary
4. Verify backend falls back to previous analysis method
5. Check database for data integrity

---

**Last Updated:** [Date]
**Status:** Ready for testing
**Next Review:** After first 100 certificate uploads
