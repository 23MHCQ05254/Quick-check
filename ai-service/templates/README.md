# Template Directory Structure

This directory contains sample certificates used to train template profiles.

## How to Use

1. Create a subdirectory for each organization (e.g., `mongodb`, `aws`, `cisco`)
2. Place sample certificate files in each subdirectory (PDF, PNG, JPG, JPEG)
3. Run the seeding script: `python scripts/seed_templates.py`

## Example Structure

```
templates/
├── mongodb/
│   ├── mongodb_cert_1.pdf
│   ├── mongodb_cert_2.png
│   └── mongodb_cert_3.jpg
├── aws/
│   ├── aws_cert_1.pdf
│   └── aws_cert_2.png
└── cisco/
    ├── ccna_1.pdf
    └── ccna_2.png
```

## Guidelines

- Use **5-10 samples per organization** for robust template learning
- Mix formats (PDF + images) if possible
- Include certificates with different:
  - Names (or placeholder names)
  - Issue dates
  - IDs
  - QR codes
- This variation helps the system learn stable structures

## Supported Formats

- PDF
- PNG
- JPG
- JPEG

PDFs are automatically converted to images during extraction.

## Test Data

To quickly test the system, you can:

1. Download sample certificates online (non-commercial use)
2. Rename files to organization names
3. Place in appropriate folders
4. Run the seeding script

The system will automatically:
- Extract text (OCR)
- Detect QR codes
- Identify components (logo, title, name, etc.)
- Learn visual signatures
- Store template profiles in MongoDB
