# QuickCheck

QuickCheck is an AI-assisted Student Certificate Intelligence Platform for colleges and universities. It stores student certificates, compares uploads against selected certification templates, flags suspicious anomalies, supports mentor review, and publishes verified achievements through student portfolios.

This is not a certificate generation system and it does not claim perfect fraud detection. The platform generates fraud probability, similarity metrics, anomaly indicators, and mentor-review recommendations using OCR, OpenCV-style visual analysis, template comparison, image hashing, QR extraction, and fuzzy name matching.

## Apps

- `frontend`: React, Tailwind CSS, Framer Motion, React Router, Axios, Recharts, React Icons.
- `backend`: Express, MongoDB/Mongoose, JWT, bcryptjs, Multer.
- `ai-service`: FastAPI service for OCR, visual profile extraction, fuzzy matching, and rule-based anomaly scoring.

## Template Learning Pipeline (AI Intelligence Engine)

The platform includes an advanced **automatic template learning system** that extracts structural intelligence from sample certificates.

### How It Works

1. **Place sample certificates** in `ai-service/templates/<organization>/`
2. **Run the seeding script**: `python scripts/seed_templates.py`
3. **System automatically:**
   - Scans all sample certificates
   - Converts PDFs to images
   - Extracts OCR, visual, and QR intelligence
   - Detects components (logo, title, name, QR, etc.)
   - Analyzes spatial relationships
   - Generates visual hashes and color profiles
   - Aggregates multiple samples into stable template profiles
   - Stores everything in MongoDB

### Directory Structure

```
ai-service/
 ├── templates/
 │    ├── mongodb/
 │    │    ├── mongodb_cert_1.pdf
 │    │    ├── mongodb_cert_2.png
 │    │    └── mongodb_cert_3.jpg
 │    ├── aws/
 │    │    ├── aws_cert_1.pdf
 │    │    └── aws_cert_2.png
 │    └── cisco/
 │         ├── ccna_1.pdf
 │         └── ccna_2.png
```

Each folder name represents an organization name. Multiple samples are used to learn stable structures.

### Running Template Seeding

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Seed templates from sample certificates
python scripts/seed_templates.py
```

Output:
```
[INFO] Processing MongoDB templates
[EXTRACT] mongodb_cert_1.pdf
  ✓ OCR: True
  ✓ QR: True
  ✓ Components: 5
[AGGREGATE] Combining 3 samples
[✓] Template stored successfully
```

### What Gets Extracted

The template learning engine extracts:

- **OCR Intelligence**: Text, bounding boxes, confidence scores
- **Visual Features**: Resolution, brightness, edge density, text density, corners
- **QR Data**: Presence, position, content, verification links
- **Components**: Dynamically detected (logo, title, name, QR, watermark, seal, etc.)
- **Spatial Relationships**: Position relationships between components
- **Color Analysis**: Dominant colors, gradients, background signatures
- **Hashes**: Perceptual, average, difference, wavelet hashes
- **Stability Metrics**: Which elements are fixed vs. variable across samples

### MongoDB Collections Created

- `organizations` - Organization metadata
- `certifications` - Certification definitions
- `template_profiles` - Aggregated template intelligence
- `template_components` - Detected components
- `template_relationships` - Spatial relationships
- `template_hashes` - Visual hashes
- `template_analysis_logs` - Extraction logs

### Fraud Detection with Learned Templates

Once templates are learned, uploaded certificates are compared against the template profile:

- OCR text matched against expected names
- Visual profile compared (resolution, colors, brightness, edges)
- QR codes validated
- Component presence/positions verified
- Anomalies scored and flagged for mentor review

## Local Development

```bash
npm install
npm run install:all
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

Run the backend and frontend:

```bash
npm run dev
```

The root dev command now starts the backend on a free port automatically and passes that API URL into the frontend, so it still works even if `5000` or `5173` are already in use on your machine.

Run the AI service separately:

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

If `MONGODB_URI` is not configured, the Express API boots in demo mode with seeded organizations, certifications, templates, a student, and a mentor.

Demo accounts:

- Student: `student@quickcheck.edu` / `password123`
- Mentor: `mentor@quickcheck.edu` / `mentor123`

## Production Notes

- Create mentors manually in MongoDB or with the seed script. There is intentionally no mentor signup flow.
- Students always self-register as `STUDENT`.
- Configure Tesseract and pyzbar system dependencies for stronger OCR/QR extraction in production.
- Store uploads in object storage in production instead of local disk.
- Train templates with 5-10 genuine sample certificates for production-grade fraud detection.
- Use easyOCR for better text extraction: `pip install easyocr`


