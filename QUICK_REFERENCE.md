# Quick Reference - Template Learning Pipeline

## ⚡ One-Minute Setup

```bash
# 1. Navigate to AI service
cd ai-service

# 2. Setup (Windows)
setup.bat

# 3. Setup (Linux/Mac)
chmod +x setup.sh && ./setup.sh

# 4. Add sample certificates
# Place PDF/PNG files in: templates/<organization>/

# 5. Seed templates
python scripts/seed_templates.py

# 6. Start services
# Terminal 1: AI service
uvicorn main:app --reload --port 8000

# Terminal 2: Full stack
cd ..
npm run dev
```

## 📋 Directory Structure

```
ai-service/
├── templates/           ← Add certificate samples here
│   ├── mongodb/
│   ├── aws/
│   └── cisco/
├── scripts/
│   └── seed_templates.py  ← Run this to seed
├── utils/
│   ├── template_extractor.py
│   ├── template_aggregator.py
│   └── db.py
└── main.py
```

## 🎯 Core Concepts

### What Gets Extracted (Per Sample)
- **OCR**: Text content with confidence
- **Visual**: Resolution, brightness, colors
- **QR**: Codes, coordinates, content
- **Components**: TITLE, NAME_BLOCK, LOGO, WATERMARK, QR_CODE, etc.
- **Relationships**: ABOVE, BELOW, LEFT_OF, RIGHT_OF
- **Hashes**: Perceptual, binary for image comparison

### What Gets Aggregated (Multiple Samples)
- **Stable structures**: Average positions, consistent elements
- **Variable regions**: Elements that change (names, dates, IDs)
- **Thresholds**: Fraud detection settings
- **Quality metrics**: Training quality, confidence scores

## 🔗 API Endpoints

### List Templates
```bash
GET http://localhost:8000/templates/list
```

### Get Template Details
```bash
GET http://localhost:8000/templates/{id}
```

### Analyze Certificate
```bash
POST http://localhost:5000/api/analyze
-F "file=@cert.pdf"
-F "studentName=John Doe"
```

## 📊 MongoDB Collections

| Collection | Purpose |
|-----------|---------|
| `template_profiles` | Main template data |
| `template_components` | Detected elements |
| `template_relationships` | Spatial relationships |
| `template_hashes` | Visual hashes |
| `template_analysis_logs` | Extraction logs |

## 🚀 Common Commands

```bash
# Seed templates
python scripts/seed_templates.py

# With custom paths
python scripts/seed_templates.py \
  --templates-dir custom/path \
  --mongodb-uri mongodb://localhost:27017/

# Check AI health
curl http://localhost:8000/health

# List learned templates
curl http://localhost:8000/templates/list

# View template details
curl http://localhost:8000/templates/TEMPLATE_ID
```

## 🔍 Component Types

| Type | Location | Stability |
|------|----------|-----------|
| TITLE | Top-center, wide | High |
| NAME_BLOCK | Middle, wide | High |
| QR_CODE | Bottom, square | Medium |
| LOGO | Top/corners, small | High |
| WATERMARK | Background, large | Medium |
| TEXT_BLOCK | Variable | Low |
| HEADER_LOGO | Top corners | High |

## ⚙️ Configuration

```python
# Fraud detection thresholds (in template)
{
    "nameSimilarity": 78,      # Min name match %
    "visualSimilarity": 70,    # Min visual match %
    "fraudReview": 65,         # Flag for review
    "fraudReject": 92          # Auto-reject %
}
```

## 📈 Training Quality

```
< 2 samples   : insufficient-samples
2-3 samples   : minimal
3-5 samples   : fair ⭐
5-10 samples  : good ⭐⭐
10+ samples   : excellent ⭐⭐⭐
```

Recommended: **5-10 samples per organization**

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| PDF won't convert | `apt-get install poppler-utils` |
| OCR empty | Install Tesseract or use easyOCR |
| MongoDB error | Start: `mongod` or use MongoDB Atlas |
| Port already in use | Change in `.env` or `--port` flag |
| Import errors | Run: `pip install -r requirements.txt` |

## 📚 Documentation

- **AI_TEMPLATE_GUIDE.md** - Complete architecture reference
- **IMPLEMENTATION_SUMMARY.md** - What was implemented
- **README.md** - Quick start and project overview
- **ai-service/templates/README.md** - Template setup

## 🎨 Admin Dashboard

Access template intelligence UI at:
```
/mentor/templates  (in frontend)
```

Shows:
- Learned templates list
- Visual profiles (colors, resolution)
- Detected components
- Training quality metrics
- Fraud detection thresholds

## 💡 Pro Tips

1. **More samples = better accuracy**: Use 5-10 genuine samples
2. **Mix formats**: Combine PDFs and images for robustness
3. **Use real certificates**: Test data should match production
4. **Monitor logs**: Check MongoDB for extraction quality
5. **Iterate**: Retrain with more samples for improvements

## 🔐 Security Notes

- Store templates in encrypted MongoDB
- Verify QR codes against official sources
- Use HTTPS in production
- Implement rate limiting on analysis endpoints
- Mentor-only access to template training

## 📞 Common Tasks

**Train on new certificates**
```bash
# 1. Add to templates/<org>/
# 2. Run seeding
python scripts/seed_templates.py
```

**Update thresholds**
```bash
# Edit in MongoDB:
db.template_profiles.updateOne(
  {"_id": ObjectId("...")},
  {"$set": {"thresholds.nameSimilarity": 82}}
)
```

**View extraction logs**
```bash
# Check MongoDB:
db.template_analysis_logs.find({"status": "SUCCESS"})
```

**Debug template**
```bash
# Inspect components:
db.template_components.find({"templateId": "..."})

# Check relationships:
db.template_relationships.findOne({"templateId": "..."})
```

## ✅ Verification Checklist

- [ ] Virtual environment activated
- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] Sample certificates added to `templates/`
- [ ] MongoDB running (or skip with demo mode)
- [ ] Seeding script executed: `python scripts/seed_templates.py`
- [ ] AI service started: `uvicorn main:app --reload --port 8000`
- [ ] Full stack running: `npm run dev`
- [ ] Templates visible: `curl http://localhost:8000/templates/list`
- [ ] Admin dashboard loads
- [ ] Upload and analysis work

## 🎉 You're Ready!

The template learning pipeline is fully operational. Start by:

1. Adding sample certificates
2. Running the seeding script
3. Exploring the admin dashboard
4. Uploading test certificates
5. Checking fraud detection scores

**Happy certificate fraud detection! 🛡️**
