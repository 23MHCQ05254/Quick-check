# Developer Integration Guide

## Using the New AI Modules

This guide shows how to integrate and use the new feature extraction, similarity scoring, and duplicate detection modules in your code.

## Installation

```bash
cd ai-service
pip install -r requirements.txt
```

### Dependencies
- opencv-python-headless
- pytesseract
- easyocr
- pyzbar
- rapidfuzz
- imagehash
- pillow
- numpy

## 1. Feature Extraction

### Basic Usage

```python
from utils.feature_extractor import FeatureExtractor

extractor = FeatureExtractor()

# Extract all features from a certificate image
features = extractor.extract_all_features("/path/to/certificate.jpg")

print(f"OCR blocks: {len(features.get('ocrBlocks', []))}")
print(f"QR codes: {len(features.get('qrCodes', []))}")
print(f"Logos: {len(features.get('logos', []))}")
print(f"Colors: {features.get('dominantColors', [])}")
```

### Feature Output Structure

```python
features = {
    # Resolution and aspect ratio
    "resolution": {
        "width": 1600,
        "height": 1130,
        "aspectRatio": 1.416
    },
    
    # OCR text blocks with positions
    "ocrBlocks": [
        {
            "text": "AWS Certified Solutions Architect",
            "confidence": 0.98,
            "bbox": [100, 50, 500, 100],  # [x1, y1, x2, y2]
            "textBlock": {
                "x0": 100, "top": 50, "x1": 500, "bottom": 100
            }
        },
        # ... more blocks
    ],
    
    # Text coordinates (simpler format)
    "textCoordinates": [
        {"text": "John Doe", "x": 700, "y": 300, "width": 300, "height": 50},
        # ...
    ],
    
    # QR codes found in image
    "qrCodes": [
        {
            "data": "https://aws.amazon.com/verify/...",
            "type": "QRCODE",
            "bbox": [1400, 900, 1580, 1080]
        }
    ],
    
    # Dominant colors in hex
    "dominantColors": [
        "#FF9900",  # AWS Orange
        "#FFFFFF",  # White
        "#232F3E"   # AWS Blue
    ],
    
    # Layout regions (content areas)
    "layouts": [
        {
            "x": 100, "y": 100, "width": 1400, "height": 900,
            "type": "content",
            "density": 0.45
        }
    ],
    
    # Logos detected (circular regions)
    "logos": [
        {
            "x": 1400, "y": 50, "width": 150, "height": 150,
            "circularity": 0.92,
            "contrast": 0.85
        }
    ],
    
    # Signatures/stamps detected
    "signatures": [
        {
            "x": 200, "y": 950, "width": 300, "height": 100,
            "inkDensity": 0.68,
            "variance": 0.45
        }
    ],
    
    # Image hashes for duplicate detection
    "imageHashes": {
        "perceptual": "abc123def456789",
        "difference": "xyz789uvw012abc",
        "average": "def456ghi789jkl",
        "wavelet": "mno123pqr456stu"
    },
    
    # Visual properties
    "brightness": 181.5,
    "contrast": 32.1,
    "saturation": 67.3
}
```

### Individual Extraction Methods

```python
# Extract OCR text
ocr_blocks = extractor.extract_ocr_text(image_path)

# Extract resolution
resolution = extractor.extract_resolution(image_path)

# Extract colors
colors = extractor.extract_dominant_colors(image_path, num_colors=8)

# Extract image hashes
hashes = extractor.extract_image_hashes(image_path)

# Extract visual properties
brightness = extractor.extract_brightness(image_path)
contrast = extractor.extract_contrast(image_path)

# Extract QR codes
qr_codes = extractor.extract_qr_codes(image_path)

# Detect logos
logos = extractor.detect_logos_and_seals(image_path)

# Detect signatures
signatures = extractor.detect_signatures_and_stamps(image_path)

# Extract layout
layouts = extractor.extract_layout_structure(image_path)
```

## 2. Similarity Scoring

### Basic Usage

```python
from utils.similarity_scorer import SimilarityScorer

scorer = SimilarityScorer()

# Score OCR similarity
ocr_score = scorer.score_ocr_similarity(
    uploaded_ocr_blocks=[...],
    template_ocr_blocks=[...],
    student_name="John Doe"
)
print(f"OCR similarity: {ocr_score:.1f}%")

# Score visual similarity
visual_score = scorer.score_visual_similarity(
    uploaded_features={...},
    template_features={...}
)
print(f"Visual similarity: {visual_score:.1f}%")

# Score QR similarity
qr_score = scorer.score_qr_similarity(
    uploaded_qr=[...],
    template_qr=[...]
)
print(f"QR similarity: {qr_score:.1f}%")

# Score image hash similarity
hash_score = scorer.score_image_hash_similarity(
    uploaded_hash="abc123def456",
    template_hash="abc123def789"
)
print(f"Hash similarity: {hash_score:.1f}%")
```

### Computing Fraud Probability

```python
# Individual scores (0-100)
scores = {
    "ocrSimilarity": 88.2,
    "visualSimilarity": 79.1,
    "qrSimilarity": 100.0,
    "imageSimilarity": 81.2
}

# Compute fraud probability
result = scorer.compute_fraud_probability(scores)

print(result)
# {
#     "fraudProbability": 13.81,
#     "authenticity": 86.19,
#     "confidence": 92.5,
#     "components": {
#         "ocrSimilarity": 88.2,
#         "visualSimilarity": 79.1,
#         "qrSimilarity": 100.0,
#         "imageSimilarity": 81.2
#     }
# }
```

### Fraud Probability Formula

```
Authenticity = OCR×0.4 + Visual×0.3 + QR×0.15 + Hash×0.15

Fraud Probability = 100 - Authenticity

Confidence = (data_availability / max_data) × 100
```

## 3. Duplicate Detection

### Basic Usage

```python
from utils.duplicate_detector import DuplicateDetector

detector = DuplicateDetector()

# Detect duplicates against existing certificates
uploaded_features = {...}  # From FeatureExtractor
existing_certificates = [...]  # Database records

result = detector.compute_duplicate_probability(
    uploaded_features,
    existing_certificates
)

print(result)
# {
#     "duplicateProbability": 0.0,
#     "matches": [
#         {
#             "certificateId": "cert123",
#             "matchScore": 0.0,
#             "components": {...}
#         }
#     ]
# }
```

### Multiple Detection Methods

```python
# OCR text matching
ocr_match = detector._score_ocr_text_match(
    uploaded_text_blocks=[...],
    existing_text_blocks=[...],
    student_name="John Doe"
)

# Image hash matching
hash_match = detector._score_image_hash_match(
    uploaded_hashes={...},
    existing_hashes={...}
)

# Color profile matching
color_match = detector._score_color_profile_match(
    uploaded_colors=[...],
    existing_colors=[...]
)
```

## 4. Template Learning

### Extract Template from Samples

```python
from utils.feature_extractor import FeatureExtractor
from utils.template_aggregator import aggregate_template_features

# Extract features from multiple training samples
extractor = FeatureExtractor()
all_features = []

for sample_path in training_sample_paths:
    features = extractor.extract_all_features(sample_path)
    all_features.append(features)

# Aggregate into single template
template_profile = aggregate_template_features(all_features)

print(template_profile)
# {
#     "ocrBlocks": [...],          # Top text blocks
#     "dominantColors": [...],     # Most frequent colors
#     "resolution": {...},         # Average resolution
#     "brightness": {...},         # Brightness stats
#     "metadata": {
#         "samplesUsed": 8,
#         "trainingQuality": "excellent"
#     }
# }
```

### Calculate Real Thresholds

```python
def _calculate_real_thresholds_from_features(
    all_features, aggregated_profile
) -> dict:
    """Calculate thresholds based on actual training data."""
    
    # OCR quality threshold
    ocr_qualities = [85 if f.get("ocrBlocks") else 60 for f in all_features]
    name_threshold = sum(ocr_qualities) / len(ocr_qualities)
    
    # Visual consistency threshold
    training_quality = aggregated_profile.get("metadata", {}).get("trainingQuality")
    if training_quality == "excellent":
        visual_threshold = 72
    elif training_quality == "good":
        visual_threshold = 68
    else:
        visual_threshold = 62
    
    # Fraud detection thresholds
    fraud_review = visual_threshold + 5
    fraud_reject = min(92, fraud_review + 20)
    
    return {
        "nameSimilarity": round(name_threshold, 2),
        "visualSimilarity": round(visual_threshold, 2),
        "fraudReview": round(fraud_review, 2),
        "fraudReject": round(fraud_reject, 2),
    }
```

## 5. Complete Workflow Example

```python
from utils.feature_extractor import FeatureExtractor
from utils.similarity_scorer import SimilarityScorer
from utils.duplicate_detector import DuplicateDetector

# 1. Extract features from upload
extractor = FeatureExtractor()
uploaded_features = extractor.extract_all_features("/uploads/cert.jpg")

# 2. Load template (from MongoDB)
template = db.template_profiles.find_one({"certification": cert_id})

# 3. Score similarity
scorer = SimilarityScorer()
ocr_score = scorer.score_ocr_similarity(
    uploaded_features["ocrBlocks"],
    template["extractedProfile"]["ocrBlocks"],
    student_name
)
visual_score = scorer.score_visual_similarity(
    uploaded_features,
    template["extractedProfile"]
)
qr_score = scorer.score_qr_similarity(
    uploaded_features["qrCodes"],
    template["extractedProfile"]["qrCodes"]
)

# 4. Compute fraud probability
fraud_result = scorer.compute_fraud_probability({
    "ocrSimilarity": ocr_score,
    "visualSimilarity": visual_score,
    "qrSimilarity": qr_score,
    "imageSimilarity": hash_score
})

# 5. Check for duplicates
detector = DuplicateDetector()
existing = db.certificates.find({"organization": org_id})
dup_result = detector.compute_duplicate_probability(
    uploaded_features,
    existing
)

# 6. Determine status
if dup_result["duplicateProbability"] > 0.5:
    status = "REJECTED"
elif fraud_result["fraudProbability"] > 70:
    status = "REVIEW_REQUIRED"
elif fraud_result["fraudProbability"] < 30:
    status = "VERIFIED"
else:
    status = "SUSPICIOUS"

# 7. Store results
db.certificates.insert_one({
    "student": student_id,
    "certification": cert_id,
    "extractedCertificateData": uploaded_features,
    "aiAnalysis": {
        "fraudProbability": fraud_result["fraudProbability"],
        "authenticityScore": fraud_result["authenticity"],
        "confidence": fraud_result["confidence"],
        "componentScores": fraud_result["components"]
    },
    "status": status,
    "duplicateOf": dup_result["matches"][0]["certificateId"] if dup_result["matches"] else None
})

print(f"Analysis complete: {status}")
print(f"Fraud probability: {fraud_result['fraudProbability']:.1f}%")
print(f"Confidence: {fraud_result['confidence']:.1f}%")
```

## Error Handling

```python
from utils.feature_extractor import FeatureExtractor

extractor = FeatureExtractor()

try:
    features = extractor.extract_all_features("/path/to/image")
    
    if not features:
        print("No features extracted - image may be invalid")
    
    if not features.get("ocrBlocks"):
        print("Warning: OCR failed to extract text")
    
    if not features.get("qrCodes"):
        print("Warning: No QR code detected")
        
except Exception as e:
    print(f"Error extracting features: {e}")
    # Handle error - use fallback analysis or return error to user
```

## Performance Tips

```python
# 1. Cache extracted features during processing
features_cache = {}
features_cache[image_path] = extractor.extract_all_features(image_path)

# 2. Process large batch of certificates efficiently
for cert_path in certificate_paths:
    features = extractor.extract_all_features(cert_path)
    # Don't re-extract - use cached features
    
# 3. Use multiprocessing for template extraction
import multiprocessing

with multiprocessing.Pool(4) as pool:
    all_features = pool.map(
        lambda p: extractor.extract_all_features(p),
        training_sample_paths
    )

# 4. Store extracted features in database for reuse
# Don't re-extract - load from MongoDB if exists
```

## Testing Features

```python
# Test feature extraction
def test_feature_extraction():
    extractor = FeatureExtractor()
    features = extractor.extract_all_features("test_cert.jpg")
    
    assert "ocrBlocks" in features
    assert "resolution" in features
    assert "imageHashes" in features
    assert len(features["dominantColors"]) > 0
    print("✓ Feature extraction working")

# Test similarity scoring
def test_similarity_scoring():
    scorer = SimilarityScorer()
    
    result = scorer.compute_fraud_probability({
        "ocrSimilarity": 88.2,
        "visualSimilarity": 79.1,
        "qrSimilarity": 100.0,
        "imageSimilarity": 81.2
    })
    
    assert 0 <= result["fraudProbability"] <= 100
    assert result["authenticity"] > 0
    assert result["confidence"] > 0
    print("✓ Similarity scoring working")

# Test duplicate detection
def test_duplicate_detection():
    detector = DuplicateDetector()
    
    result = detector.compute_duplicate_probability({...}, [])
    
    assert 0 <= result["duplicateProbability"] <= 100
    assert isinstance(result["matches"], list)
    print("✓ Duplicate detection working")
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| OCR returns empty | Check image quality, try fallback engine |
| QR code not detected | Verify QR is in image, check pyzbar install |
| Hash generation fails | Verify image is readable, check PIL/Pillow |
| Slow processing | Use multiprocessing for batch work |
| Memory issues | Process large images in chunks |

## Further Reference

- See [DYNAMIC_AI_ARCHITECTURE.md](DYNAMIC_AI_ARCHITECTURE.md) for system overview
- See [ai-service/main.py](ai-service/main.py) for FastAPI endpoint examples
- Check module docstrings: `pydoc utils.feature_extractor`
