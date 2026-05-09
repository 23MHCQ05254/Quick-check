# QuickCheck Architecture

```text
React Frontend
  -> Express Backend
    -> MongoDB
    -> FastAPI AI Service
      -> OCR + OpenCV + Rule-Based Fraud Analysis
```

## Certificate Upload Contract

1. Student selects a certification from the catalog.
2. Backend loads the matching certification and template profile.
3. Student uploads a certificate file through Multer.
4. Backend sends the file, student identity, selected certification, and template profile to FastAPI.
5. FastAPI extracts OCR text, QR data, image hash, colors, resolution, layout signals, and name similarity.
6. Backend checks duplicate signals against existing certificates.
7. Certificate enters `PENDING`, `REVIEW_REQUIRED`, or `REJECTED` state.
8. Mentor approves or rejects suspicious uploads.

## Fraud Analysis Philosophy

QuickCheck reports probability and indicators, not certainty. It combines measurable signals:

- Name similarity using normalization and fuzzy token matching.
- Template visual similarity: resolution, aspect ratio, colors, layout, QR/logo hints.
- OCR and metadata consistency.
- Duplicate evidence: certificate ID, QR data, text fingerprint, issue date, organization, image hash.
- Mentor review for final institutional decisions.

