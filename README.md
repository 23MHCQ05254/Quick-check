# QuickCheck

QuickCheck is an AI-assisted Student Certificate Intelligence Platform for colleges and universities. It stores student certificates, compares uploads against selected certification templates, flags suspicious anomalies, supports mentor review, and publishes verified achievements through student portfolios.

This is not a certificate generation system and it does not claim perfect fraud detection. The platform generates fraud probability, similarity metrics, anomaly indicators, and mentor-review recommendations using OCR, OpenCV-style visual analysis, template comparison, image hashing, QR extraction, and fuzzy name matching.

## Apps

- `frontend`: React, Tailwind CSS, Framer Motion, React Router, Axios, Recharts, React Icons.
- `backend`: Express, MongoDB/Mongoose, JWT, bcryptjs, Multer.
- `ai-service`: FastAPI service for OCR, visual profile extraction, fuzzy matching, and rule-based anomaly scoring.

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

