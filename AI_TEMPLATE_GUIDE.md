# QuickCheck AI Template Learning Pipeline

## Overview

QuickCheck includes an advanced **automatic template learning engine** that extracts structural intelligence from sample certificates. This guide explains the complete pipeline.

## Architecture

### Three-Layer System

```
Layer 1: EXTRACTION
├─ TemplateExtractor class
├─ OCR analysis (pytesseract + easyocr)
├─ Visual analysis (OpenCV)
├─ QR extraction (pyzbar)
├─ Component detection (dynamic)
└─ Spatial relationship extraction

Layer 2: AGGREGATION
├─ TemplateAggregator class
├─ Multi-sample aggregation
├─ Stability analysis
├─ Confidence scoring
└─ Training quality assessment

Layer 3: STORAGE
├─ MongoDBManager class
├─ Flexible schema storage
├─ Indexed collections
├─ Relationship mapping
└─ Analysis logging
```

## Complete Workflow

### Step 1: Preparation

Place sample certificates in organized folders:

```
ai-service/templates/
├── mongodb/          (Organization name)
│   ├── cert_1.pdf
│   ├── cert_2.png
│   └── cert_3.jpg
└── aws/
    ├── cert_1.pdf
    └── cert_2.jpg
```

### Step 2: Scanning

`seed_templates.py` scans the directory:

```python
for org_dir in templates_directory:
    if org_dir.is_dir():
        # Process organization
```

### Step 3: File Preparation

For each file:

```python
if file.suffix == '.pdf':
    images = pdf2image.convert_from_path(file)  # Convert to images
else:
    images = [Image.open(file)]  # Use directly
```

### Step 4: Extraction

For each image:

```python
profile = extractor.extract_image_profile(image_path)
```

Extracts:

```python
{
    "resolution": {"width": 1600, "height": 1130, "aspectRatio": 1.416},
    "dominantColors": ["#0EA5E9", "#111827", "#F8FAFC"],
    "brightness": 220,
    "edgeDensity": 0.18,
    "textDensity": 0.3,
    "cornerDensity": 0.025,
    "imageHash": "a1b2c3d4e5f6g7h8",
    "perceptualHash": "0110011010111001...",
    "qrData": "https://verify.example.com/cert/123",
    "qrMetadata": {
        "type": "QRCODE",
        "rect": {"x": 100, "y": 1000, "width": 100, "height": 100}
    },
    "ocrText": "Certificate of Achievement...",
    "components": [
        {
            "type": "TITLE",
            "coordinates": {"x": 400, "y": 100, "width": 800, "height": 60},
            "stability": "high",
            "required": true
        },
        {
            "type": "NAME_BLOCK",
            "coordinates": {"x": 300, "y": 400, "width": 1000, "height": 80},
            "stability": "high",
            "required": true
        },
        {
            "type": "QR_CODE",
            "coordinates": {"x": 100, "y": 1000, "width": 100, "height": 100},
            "stability": "medium",
            "required": false
        }
    ],
    "relationships": [
        {
            "source": "TITLE",
            "target": "NAME_BLOCK",
            "relation": "BELOW",
            "distancePixels": 300
        }
    ]
}
```

### Step 5: Component Detection

The system dynamically detects:

- **TITLE**: Wide, centered at top
- **NAME_BLOCK**: Wide, middle area
- **QR_CODE**: Square, bottom area
- **LOGO**: Small, square-ish, corners
- **WATERMARK**: Large, background
- **TEXT_BLOCK**: General text regions
- **HEADER_LOGO**: Logo at top

No hardcoded coordinates—all learned from samples.

### Step 6: Aggregation

Combines multiple samples:

```python
aggregated = TemplateAggregator.aggregate_profiles(profiles)
```

Produces:

```python
{
    "resolution": {
        "width": 1600,
        "height": 1130,
        "variance": {"width": 20, "height": 15}
    },
    "dominantColors": ["#0EA5E9", "#111827", "#F8FAFC", "#0F172A", "#1E293B"],
    "components": [
        {
            "type": "TITLE",
            "frequency": 3,              # Found in all 3 samples
            "stability": "high",
            "coordinates": {...},
            "required": true
        }
    ],
    "relationships": [
        {
            "source": "TITLE",
            "target": "NAME_BLOCK",
            "relation": "BELOW",
            "averageDistancePixels": 300,
            "consistency": "high"
        }
    ],
    "metadata": {
        "trainedSamples": 3,
        "trainingQuality": "good",
        "extractionConfidence": 85.5
    }
}
```

### Step 7: Storage

Stores in MongoDB:

```python
# Store template profile
template_id = db.store_template_profile(cert_id, aggregated)

# Store components
db.store_components(template_id, components)

# Store relationships
db.store_relationships(template_id, relationships)

# Store hashes
db.store_hashes(template_id, hashes)

# Log extraction
db.log_extraction(template_id, "SUCCESS", details)
```

### Step 8: Retrieval

When a student uploads a certificate:

```python
# Get template
template = db.get_template_by_certification(cert_id)

# Compare uploaded certificate against template
uploaded_profile = extractor.extract_image_profile(upload)
similarity = compare_profiles(uploaded_profile, template)

# Score fraud probability
fraud_score = score_fraud(
    name_score=ocr_name_match,
    visual_score=visual_similarity,
    profile=uploaded_profile,
    template_profile=template
)
```

## Component Detection Logic

### Resolution-Based Classification

Components are classified based on:

1. **Aspect Ratio**: width/height ratio
2. **Position**: x, y coordinates as percentage of image
3. **Area**: Component size relative to total image
4. **Context**: What other components are nearby

### Example: QR Code Detection

```python
if 0.9 < aspect_ratio < 1.1:  # Square
    if y > height * 0.7:        # Bottom area
        return "QR_CODE"
```

### Example: Logo Detection

```python
if 0.7 < aspect_ratio < 1.3:   # Square-ish
    if area < width * height * 0.15:  # Small
        if x < width * 0.2 or x > width * 0.8:  # Corner
            return "LOGO"
```

## Stability Analysis

The system measures how consistent each component is across samples:

```python
x_variance = max(x_coords) - min(x_coords)
y_variance = max(y_coords) - min(y_coords)

if x_variance < 20 and y_variance < 20:
    stability = "high"
elif x_variance < 50 and y_variance < 50:
    stability = "medium"
else:
    stability = "low"
```

**High stability** means the component is always in the same place.
**Low stability** means the component location varies.

This helps identify:
- **Fixed anchors**: Logo position is stable → good for comparison
- **Variable regions**: Name location varies → needs fuzzy matching

## Training Quality Assessment

```python
if samples < 2:
    return "insufficient-samples"
elif samples < 3:
    return "minimal"
elif samples < 5:
    return "fair"
elif samples < 10:
    return "good"
else:
    return "excellent"
```

### Recommendations

- **Production use**: 5-10 samples
- **Testing**: 2-3 samples
- **Minimum**: 1 sample (not recommended)

## Fraud Detection with Templates

Once a template is learned, fraud scoring uses:

### 1. Name Similarity

```python
student_name = "John Doe"
ocr_text = "John Doe"  # from certificate

score = fuzzy_match(student_name, ocr_text)  # 0-100
```

### 2. Visual Similarity

```python
components = {
    "resolution": compare_resolution(),     # 35%
    "color": compare_colors(),              # 30%
    "edge": compare_edges(),                # 20%
    "brightness": compare_brightness()      # 15%
}

visual_score = weighted_average(components)  # 0-100
```

### 3. Anomaly Detection

```python
if name_score < threshold:
    anomalies.append({"code": "NAME_MISMATCH", "severity": "HIGH"})

if visual_score < threshold:
    anomalies.append({"code": "TEMPLATE_DRIFT", "severity": "HIGH"})

if not qr_data:
    anomalies.append({"code": "QR_MISSING", "severity": "MEDIUM"})
```

### 4. Fraud Probability

```python
fraud = 8.0  # Base score

if name_score < threshold:
    fraud += (threshold - name_score) * 0.75

if visual_score < threshold:
    fraud += (threshold - visual_score) * 0.7

if not ocr_text:
    fraud += 10

fraud = clamp(fraud, 3, 96)
```

## API Endpoints

### Template Management

```
GET  /api/mentor/templates              - List learned templates
GET  /api/templates/list                - AI service: List templates
GET  /api/templates/{id}                - AI service: Get template details
POST /api/templates/train               - Train on new samples
POST /api/templates/extract             - Extract profile
```

### Analysis

```
POST /api/analyze                       - Analyze uploaded certificate
                                          Compare against template
                                          Score fraud probability
```

## MongoDB Collections

### template_profiles

```javascript
{
  _id: ObjectId(),
  certificationId: "...",
  version: 1,
  status: "ACTIVE",
  extractedProfile: { ... },
  thresholds: { ... },
  metadata: {
    trainedAt: Date,
    trainedSamples: 3,
    trainingQuality: "good"
  }
}
```

### template_components

```javascript
{
  _id: ObjectId(),
  templateId: "...",
  type: "TITLE",
  frequency: 3,
  stability: "high",
  coordinates: { ... },
  required: true
}
```

### template_relationships

```javascript
{
  _id: ObjectId(),
  templateId: "...",
  relationships: [
    {
      source: "TITLE",
      target: "NAME_BLOCK",
      relation: "BELOW",
      averageDistancePixels: 300,
      consistency: "high"
    }
  ]
}
```

### template_hashes

```javascript
{
  _id: ObjectId(),
  templateId: "...",
  hashes: {
    perceptual: ["0110011010111001..."],
    binary: ["a1b2c3d4e5f6g7h8"]
  }
}
```

### template_analysis_logs

```javascript
{
  _id: ObjectId(),
  templateId: "...",
  status: "SUCCESS",
  details: { ... },
  timestamp: Date
}
```

## Command Reference

### Run Seeding

```bash
# Set up Python environment
cd ai-service
python -m venv .venv
source .venv/bin/activate  # Unix
.venv\Scripts\activate      # Windows

# Install dependencies
pip install -r requirements.txt

# Seed templates
python scripts/seed_templates.py

# With custom MongoDB URI
python scripts/seed_templates.py --mongodb-uri mongodb://localhost:27017/
```

### View Templates

```bash
# Backend API
curl http://localhost:5000/api/mentor/templates

# AI Service
curl http://localhost:8000/templates/list
```

### Analyze Certificate

```bash
# Upload and analyze
curl -X POST http://localhost:5000/api/certificates/upload \
  -F "file=@cert.pdf" \
  -F "studentName=John Doe" \
  -F "certificationId=...
```

## Troubleshooting

### PDF Conversion Issues

**Error**: `pdfrw.PdfReadError`

**Solution**: Install system dependencies:
```bash
# Ubuntu/Debian
apt-get install poppler-utils

# Mac
brew install poppler

# Windows (via chocolatey)
choco install poppler
```

### OCR Issues

**Problem**: Empty OCR text

**Solution**: Install Tesseract:
```bash
# Ubuntu/Debian
apt-get install tesseract-ocr

# Mac
brew install tesseract

# Windows
# Download from: https://github.com/UB-Mannheim/tesseract
```

Use easyOCR as fallback:
```bash
pip install easyocr  # Already in requirements.txt
```

### MongoDB Connection

**Error**: `Connection refused`

**Solution**: 
1. Start MongoDB: `mongod`
2. Or set MONGODB_URI in `.env`
3. Or use demo mode (no MongoDB needed)

### Component Detection Issues

**Problem**: Components not detected

**Solutions**:
1. Ensure certificate images are clear
2. Check image resolution (prefer 1200px+ width)
3. Verify contrast (edges need definition)
4. Check for PDFs with text layers (convert with better DPI)

## Advanced Customization

### Custom Component Classification

Edit `template_extractor.py`:

```python
def _classify_region(self, x, y, w, h, width, height, aspect_ratio, area):
    # Add custom logic here
    if aspect_ratio > 3:  # Very wide
        if y < height * 0.15:
            return "BANNER"
    return "COMPONENT"
```

### Custom Fraud Scoring

Edit `main.py`:

```python
def score_fraud(...):
    # Add custom thresholds
    # Add custom weights
    # Add custom penalties
```

### Integration with External Services

```python
# Example: Call external verification API
verification = requests.get(
    f"https://verify.example.com/{certificate_id}"
)
fraud_score += verification_check(verification)
```

## Performance Notes

- **Extraction**: ~2-5 seconds per certificate (depends on resolution)
- **OCR**: ~3-10 seconds (pytesseract) or ~1-3 seconds (easyocr)
- **QR Detection**: < 1 second
- **Aggregation**: < 1 second
- **Total seeding**: ~10-30 seconds for 5 samples per org

## Security Considerations

1. **Sample Storage**: Store templates securely (encrypted MongoDB)
2. **QR Validation**: Verify QR content against official sources
3. **OCR Confidence**: Only trust OCR with high confidence scores
4. **Rate Limiting**: Limit analysis requests per user
5. **Access Control**: Mentor-only access to template training

## Future Enhancements

- [ ] Machine learning for fraud detection
- [ ] Deep learning-based component detection
- [ ] Blockchain verification integration
- [ ] Real-time template updates
- [ ] Multi-language OCR support
- [ ] Duplicate detection across all certificates
- [ ] Tamper detection (image forensics)
- [ ] Watermark analysis
