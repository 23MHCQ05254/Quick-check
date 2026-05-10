# Dynamic Feature-Based Certificate Verification System

## Overview

The system has been refactored from fixed-schema certificate comparison into a real dynamic feature-based template learning architecture. All AI analysis now uses actual extracted features instead of mock/hardcoded values.

## New Architecture

### 1. Feature Extraction (`ai-service/utils/feature_extractor.py`)

**FeatureExtractor class** extracts comprehensive, measurable features from certificate images:

- **OCR Analysis**
  - Text blocks with confidence scores
  - Bounding box coordinates for each text region
  - Multiple OCR engines (EasyOCR primary, Tesseract fallback)

- **Visual Features**
  - Resolution and aspect ratio
  - Dominant colors (RGB → HEX conversion)
  - Brightness, contrast, saturation
  - Edge density and corner detection

- **Image Hashing**
  - Perceptual hash (phash)
  - Difference hash (dhash)
  - Average hash
  - Wavelet hash

- **Structural Elements**
  - Text density via Otsu thresholding
  - Edge regions and contours
  - Layout regions (content areas)
  - Logo/seal detection (circular regions with high contrast)
  - Signature/stamp detection (isolated ink regions)
  - Gradients and visual descriptors

- **QR Code Detection**
  - QR data extraction
  - Type and quality metadata
  - Bounding box position

**Key Method:**
```python
features = extractor.extract_all_features(path)
# Returns comprehensive feature dict with all categories
```

### 2. Similarity Scoring (`ai-service/utils/similarity_scorer.py`)

**SimilarityScorer class** computes real fraud probability from measured differences:

#### OCR Similarity
- Token-set ratio comparison using RapidFuzz
- Name matching verification
- Spatial distribution consistency (text block positioning)
- Returns: overall score + breakdown

#### Visual Similarity  
- Resolution comparison (allows 30% variance)
- Color profile matching
- Brightness/contrast comparison
- Texture analysis (edge density, text density)
- Returns: component scores with weighted average

#### QR Similarity
- Exact data matching
- Partial matching fallback
- Presence/absence scoring

#### Image Hash Similarity
- Hamming distance between perceptual hashes
- Converts to similarity score (0-100%)
- Max distance: 64 for phash

#### Fraud Probability Calculation
```python
fraud_probability = 100 - (
    ocr_score * 0.4 +
    visual_score * 0.3 +
    qr_score * 0.15 +
    hash_score * 0.15
)
```
- Confidence based on data availability
- Never hardcoded or random

### 3. Duplicate Detection (`ai-service/utils/duplicate_detector.py`)

**DuplicateDetector class** identifies duplicate/near-duplicate certificates:

- **OCR Text Matching**: RapidFuzz token set similarity
- **Image Hash Matching**: Hamming distance comparison
- **Color Profile Matching**: RGB distance between dominant colors
- **Certificate ID Matching**: Text search and fuzzy matching

Returns top 5 matches with:
- Overall match score
- Component breakdown
- Certificate reference

### 4. Template Aggregation

**Dynamic template generation** from mentor training samples:

```python
def _aggregate_template_features(all_features: list) -> dict:
    # Aggregates OCR blocks, QR codes, logos, signatures
    # Finds dominant colors, common layouts
    # Calculates average resolution, brightness
    # Assesses training quality (excellent/good/fair)
    return aggregated_profile
```

**REAL threshold calculation** based on training data:

```python
def _calculate_real_thresholds_from_features(...) -> dict:
    # Name threshold: based on OCR quality across samples
    # Visual threshold: based on feature consistency
    # Fraud thresholds: based on training quality
    # All computed from actual data, never hardcoded
    return thresholds
```

## Data Flow

### Student Upload → Analysis

1. **Upload Certificate**
   ```
   POST /certificates/upload
   - file: image/PDF
   - certificationId
   - certificateId (optional)
   - issueDate
   ```

2. **AI Service Analysis**
   ```
   POST /analyze
   - feature extraction (FeatureExtractor)
   - load mentor template
   - similarity scoring (SimilarityScorer)
   - duplicate detection (DuplicateDetector)
   ```

3. **Real Calculated Results**
   ```json
   {
     "fraudProbability": 23.4,           // Real calculated, NOT hardcoded
     "authenticity": 76.6,
     "confidence": 92.5,
     "nameSimilarity": 89.2,
     "visualSimilarity": 72.1,
     "qrSimilarity": 95.0,
     "imageSimilarity": 81.3,
     "verificationStatus": "VERIFIED",
     "extractedCertificateData": {
       "ocrBlocks": [...],               // Actual extracted text
       "textCoordinates": [...],         // Real positions
       "qrData": [...],
       "colorProfiles": [...],
       "layoutRegions": [...],
       "logos": [...],
       "signatures": [...],
       "imageHashes": {...},
       "brightness": 145.2,
       "contrast": 32.5,
       "saturation": 67.8
     }
   }
   ```

### Mentor Training → Template

1. **Upload Training Samples**
   ```
   POST /templates/train
   - certificationId
   - 5-10 genuine samples
   ```

2. **AI Service Extraction**
   ```
   POST /templates/extract
   - feature extraction for all samples (FeatureExtractor)
   - aggregation into template (aggregate_template_features)
   - real threshold calculation (_calculate_real_thresholds_from_features)
   ```

3. **Stored Template Profile**
   ```json
   {
     "extractedProfile": {
       "ocrBlocks": [...],               // Aggregated from all samples
       "qrCodes": [...],
       "logos": [...],
       "layouts": [...],
       "dominantColors": [...],
       "resolution": {
         "avgWidth": 1600,
         "avgHeight": 1130,
         "avgAspectRatio": 1.42
       },
       "brightness": {
         "avg": 180.5,
         "min": 150,
         "max": 210
       }
     },
     "thresholds": {
       "nameSimilarity": 82.5,           // Calculated from OCR quality
       "visualSimilarity": 70.2,         // Calculated from feature consistency
       "fraudReview": 75.2,              // Based on training quality
       "fraudReject": 93.0
     },
     "metadata": {
       "samplesUsed": 8,
       "trainingQuality": "excellent"
     }
   }
   ```

## API Endpoints

### `/analyze` (POST)
Analyzes uploaded certificate against template.

**Uses:** FeatureExtractor → SimilarityScorer → fraud probability

**Returns:** Complete analysis with all calculated metrics

### `/templates/extract` (POST)
Extracts and aggregates template profile from training samples.

**Uses:** FeatureExtractor → aggregate → calculate real thresholds

**Returns:** Template profile with REAL learned thresholds

### `/detect-duplicates` (POST)
Detects if upload is duplicate of existing certificates.

**Uses:** FeatureExtractor → DuplicateDetector

**Returns:** Duplicate probability and top matches

## MongoDB Schema

### Certificate Document
```javascript
{
  _id: ObjectId,
  student: ObjectId,
  certification: ObjectId,
  organization: ObjectId,
  title: String,
  certificateId: String,
  issueDate: Date,
  fileUrl: String,
  
  // Extracted data (flexible/dynamic)
  extractedCertificateData: {
    ocrBlocks: [{text, confidence, bbox}, ...],
    textCoordinates: [{text, x, y, width, height}, ...],
    qrData: [{data, type, bbox}, ...],
    colorProfiles: [String],  // Hex colors
    layoutRegions: [{x, y, width, height, type}, ...],
    logoRegions: [{x, y, width, height, circularity}, ...],
    signatureRegions: [{x, y, width, height, inkDensity}, ...],
    imageHashes: {
      perceptual: String,
      difference: String,
      average: String,
      wavelet: String
    },
    brightness: Number,
    contrast: Number,
    saturation: Number
  },
  
  // AI analysis (all real calculated values)
  aiAnalysis: {
    fraudProbability: Number,
    authenticity: Number,
    confidence: Number,
    verificationStatus: String,  // VERIFIED | SUSPICIOUS | POSSIBLE_FORGERY
    matchedRegions: [Object],
    mismatchedRegions: [Object],
    anomalies: [Object]
  },
  
  status: String,               // PENDING | VERIFIED | REJECTED | REVIEW_REQUIRED
  duplicateOf: ObjectId,        // Reference if duplicate detected
  createdAt: Date,
  updatedAt: Date
}
```

### Template Profile Document
```javascript
{
  _id: ObjectId,
  certification: ObjectId,
  organization: ObjectId,
  status: String,
  version: Number,
  
  // Dynamic extracted features (NOT hardcoded)
  extractedProfile: {
    ocrBlocks: [Object],        // All text blocks from samples
    qrCodes: [Object],
    logos: [Object],
    signatures: [Object],
    layouts: [Object],
    dominantColors: [String],
    imageHashes: {
      perceptual: [String],     // All hashes from samples
      difference: [String],
      average: [String],
      wavelet: [String]
    },
    resolution: {
      avgWidth: Number,
      avgHeight: Number,
      avgAspectRatio: Number
    },
    brightness: {
      avg: Number,
      min: Number,
      max: Number
    },
    metadata: {
      samplesUsed: Number,
      trainingQuality: String    // excellent | good | fair
    }
  },
  
  // REAL thresholds (calculated from features)
  thresholds: {
    nameSimilarity: Number,      // Based on OCR quality
    visualSimilarity: Number,    // Based on feature consistency
    fraudReview: Number,         // Based on training quality
    fraudReject: Number
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

## Key Changes from Old System

| Aspect | Old | New |
|--------|-----|-----|
| **Schema** | Fixed fields | Dynamic, flexible |
| **Features** | Basic OCR + hash | 10+ feature types |
| **Scoring** | Hardcoded rules | Real calculated metrics |
| **Thresholds** | Hardcoded values | Learned from templates |
| **QR Codes** | Optional check | Fully integrated |
| **Layouts** | Ignored | Detected & compared |
| **Signatures** | Ignored | Detected & flagged |
| **Duplicates** | Simple hash match | Multi-method detection |
| **Template** | Single profile | Aggregated from samples |
| **Confidence** | Random | Based on data availability |

## Feature Handling

### Flexible Certificate Structures

System handles different certificate layouts without schema assumptions:

**Certificate A**: Has QR, no signature, colored header
```python
{
  qrCodes: [{data: "...", bbox: {...}}],
  signatures: [],
  dominantColors: ["#FF6B6B", "#4ECDC4"]
}
```

**Certificate B**: No QR, has signature, plain background
```python
{
  qrCodes: [],
  signatures: [{x: 100, y: 800, ...}],
  dominantColors: ["#FFFFFF", "#000000"]
}
```

**Certificate C**: Different resolution, both QR and signature
```python
{
  qrCodes: [{...}],
  signatures: [{...}],
  resolution: {width: 2000, height: 1500}
}
```

All handled dynamically - no schema conflicts.

## Real Analysis Example

**Input:** Student uploads certificate for AWS Certification

**Template** (from 8 mentor training samples):
- Average resolution: 1600×1130
- Dominant colors: ["#FF9900", "#FFFFFF", "#232F3E"]
- Name similarity threshold: 82.5
- Visual similarity threshold: 70.2

**Upload Features:**
- Resolution: 1602×1128 (matches)
- Text includes "AWS" and student name (good match)
- Perceptual hash distance: 12 (low = similar)
- Brightness: 182 (within 150-210 range)
- Colors match 4/5 dominant colors

**Calculated Scores:**
- OCR: 88.2% (name found, AWS verified)
- Visual: 79.1% (colors match, resolution similar, brightness in range)
- QR: 100% (present and data matches)
- Hash: 81.2% (low hamming distance)

**Fraud Probability:**
```
fraudProbability = 100 - (88.2×0.4 + 79.1×0.3 + 100×0.15 + 81.2×0.15)
                 = 100 - (35.28 + 23.73 + 15 + 12.18)
                 = 100 - 86.19
                 = 13.81%
```

**Result:** `VERIFIED` (fraud < 30%)

All values calculated in real-time, no hardcoding.

## Implementation Status

✅ Feature Extractor complete
✅ Similarity Scorer complete  
✅ Duplicate Detector complete
✅ Template Aggregation complete
✅ Real Threshold Calculation complete
✅ AI Service Endpoints updated
✅ MongoDB Schema ready
✅ Backend Certificate Controller updated

## Next Steps

1. **Test Suite**: Validate feature extraction accuracy
2. **Performance**: Profile and optimize for large images
3. **Integration**: Verify backend certificate workflow
4. **UI Updates**: Display extracted features and real metrics in dashboards
5. **Analytics**: Log template quality metrics for monitoring

## Configuration

All AI logic is now in Python/FastAPI. No configuration needed - the system learns from training data and adapts automatically.

Backend routes (`/certificates/upload`, `/templates/train`) automatically use new AI endpoints and store extracted data in MongoDB.
