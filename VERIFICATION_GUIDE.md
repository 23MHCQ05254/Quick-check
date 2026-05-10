# Real Analysis - Quick Verification Guide

## Files Modified

### 1. `ai-service/utils/dynamic_comparator.py` (NEW FILE)
**What**: Complete real comparison engine
**Key Class**: `DynamicComparator`
**Key Methods**:
- `compare()` - Main comparison logic (returns real fraud probability)
- `_compare_name()` - Real name matching
- `_compare_visual()` - Real visual analysis
- `_calculate_fraud()` - Real fraud formula (NOT hardcoded)

### 2. `ai-service/main.py` (UPDATED)
**What**: Updated endpoints to use real analysis

**Changes**:
```python
# Added imports
from utils.dynamic_comparator import DynamicComparator
from utils.template_extractor import TemplateExtractor
from utils.template_aggregator import TemplateAggregator

# /analyze endpoint now uses DynamicComparator
if DynamicComparator:
    comparator = DynamicComparator(template_profile=template)
    comparison = comparator.compare(...)  # REAL analysis

# /templates/extract now calculates REAL thresholds
thresholds = _calculate_real_thresholds(extracted, profiles)
```

**Removed**:
- Hardcoded fraud points (no more `fraud += 8`)
- Fixed thresholds (no more `{78, 70, 65, 92}`)

### 3. `backend/src/services/ai.service.js` (UPDATED)
**What**: Removed static fallback analysis

**Replaced**:
- `fallbackAnalysis()` with `unsupportedFallback()`
- Returns error instead of fake fraud scores
- Forces real AI service analysis

**Removed Hardcoded Values**:
```javascript
// ❌ GONE:
// const nameSimilarity = studentName ? 94 : 0;
// const visualSimilarity = hasTemplate ? 82 : 50;
// const fraudProbability = hasTemplate ? 24 : 72;

// ✅ NOW:
// Returns error, forces real analysis
```

---

## How to Verify Changes

### Test 1: Check for Hardcoded Values
```bash
# Should return NOTHING:
grep -r "94\|82\|50" backend/src/services/ai.service.js
grep -r "fraudProbability.*?.*:" backend/src/services/ai.service.js | grep -v "const\|function"
```

### Test 2: Verify DynamicComparator Usage
```bash
# Should find in ai-service/main.py:
grep "DynamicComparator" ai-service/main.py
grep "comparator.compare" ai-service/main.py
```

### Test 3: Verify Real Thresholds Calculation
```bash
# Should find in ai-service/main.py:
grep "_calculate_real_thresholds" ai-service/main.py
grep "training_quality" ai-service/main.py
```

### Test 4: Upload Same Certificate Twice
**Command**: Upload the same certificate to upload endpoint twice

**Expected**: Fraud scores should be identical (same input = same output)

**NOT Expected**: Static/hardcoded values

### Test 5: Upload Different Certificates
**Command**: Upload 3 different versions of a certificate

**Certificate 1**: Original
- Expected fraudProbability: 15-35%

**Certificate 2**: With name edited
- Expected fraudProbability: 55-75%
- Different from Certificate 1

**Certificate 3**: With QR removed
- Expected fraudProbability: 60-80%
- Different from both previous

**Verify**: Fraud scores change based on actual differences

### Test 6: Check Metrics Diversity
```bash
# Upload original certificate
# Check response includes:
{
  "metrics": {
    "nameSimilarity": <unique value>,
    "visualSimilarity": <unique value>,
    "qrSimilarity": <unique value>,
    "logoSimilarity": <unique value>,
    "spacingSimilarity": <unique value>,
    "alignmentSimilarity": <unique value>,
    "structureSimilarity": <unique value>
  }
}
```

Each metric should have different values (not all 82, not all 70)

---

## Code Verification Checklist

### AI Service (`ai-service/main.py`)
- [ ] DynamicComparator imported
- [ ] `/analyze` uses `comparator.compare()`
- [ ] No hardcoded fraud points (search: `fraud +=`)
- [ ] `/templates/extract` uses `_calculate_real_thresholds()`
- [ ] Thresholds vary based on training data
- [ ] TemplateExtractor imported
- [ ] TemplateAggregator imported

### Backend (`backend/src/services/ai.service.js`)
- [ ] `fallbackAnalysis` removed (only `unsupportedFallback` exists)
- [ ] No hardcoded `nameSimilarity = 94`
- [ ] No hardcoded `visualSimilarity = 82`
- [ ] No hardcoded `fraudProbability` ternary
- [ ] Throws error when AI service unavailable
- [ ] Forces real analysis

### Response Format
- [ ] `fraudProbability` is computed value (3-96)
- [ ] `confidence` is computed value (10-96)
- [ ] `nameSimilarity` varies with content
- [ ] `visualSimilarity` varies with content
- [ ] `metrics` has 7 different components
- [ ] `anomalies` populated based on real analysis
- [ ] `explanations` describe actual findings
- [ ] `recommendation` based on fraud probability

---

## Expected Test Results

### Scenario 1: Original Certificate
```
fraudProbability: 18-32
confidence: 75-90
nameSimilarity: 80-95
visualSimilarity: 85-95
recommendation: LOW_RISK
anomalies: []
```

### Scenario 2: Name Changed
```
fraudProbability: 60-75
confidence: 70-85
nameSimilarity: 15-35
visualSimilarity: 80-90
recommendation: MENTOR_REVIEW
anomalies: [NAME_MISMATCH]
```

### Scenario 3: Screenshot/Fake
```
fraudProbability: 75-90
confidence: 40-65
nameSimilarity: 0-20
visualSimilarity: 10-35
recommendation: MENTOR_REVIEW or REJECT
anomalies: [VISUAL_DRIFT, QR_ANOMALY, LOGO_ANOMALY]
```

---

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Fraud scores still look hardcoded | Verify DynamicComparator is running |
| All metrics are 82 or 70 | Check /analyze is using new code path |
| Threshold values hardcoded | Verify _calculate_real_thresholds() is called |
| Same certificate gives different scores | Verify OCR is non-deterministic (expected behavior - slight variations OK) |
| No anomalies detected | Upload clearly different certificate to trigger |
| Recommendations always "LOW_RISK" | Upload obviously fraudulent certificate |

---

## Performance Notes

- **First analysis**: May be slightly slower (TemplateExtractor/TemplateAggregator initialization)
- **Subsequent analyses**: Same speed or faster
- **Large template sets**: May need MongoDB optimization
- **OCR**: Bottleneck for speed (necessary for real analysis)

---

## Security Notes

- No hardcoded fraud scores = more secure
- Real analysis makes system harder to game
- Anomaly detection catches common fraud patterns
- QR verification adds verification layer
- Logo matching adds verification layer

---

*All hardcoded values have been eliminated. The system now performs genuine, dynamic certificate fraud analysis.*
