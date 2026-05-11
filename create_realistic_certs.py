#!/usr/bin/env python3
"""Generate realistic certificate images for testing."""

from PIL import Image, ImageDraw
import os

test_dir = r'C:\Users\Lenovo\Desktop\certificate-fraud-detection-system\test-certs-real'
os.makedirs(test_dir, exist_ok=True)

# Create 5 realistic certificate images with substantial content
for i in range(1, 6):
    # Create larger, more detailed image
    img = Image.new('RGB', (1600, 1130), color='#f5f5f5')
    draw = ImageDraw.Draw(img)
    
    # Ornate border
    draw.rectangle([40, 40, 1560, 1090], outline='#1a5490', width=8)
    draw.rectangle([60, 60, 1540, 1070], outline='#d4af37', width=4)
    draw.rectangle([80, 80, 1520, 1050], outline='#1a5490', width=2)
    
    # Background pattern
    for x in range(100, 1500, 100):
        draw.line([(x, 100), (x, 1050)], fill='#e8e8e8', width=1)
    for y in range(100, 1050, 100):
        draw.line([(100, y), (1500, y)], fill='#e8e8e8', width=1)
    
    # Header with organization name
    header_text = "MongoDB University"
    draw.text((800, 120), header_text, fill='#1a5490', anchor='mm')
    
    # Title
    title = "Certificate of Achievement"
    draw.text((800, 200), title, fill='#d4af37', anchor='mm')
    
    # Horizontal line
    draw.line([(200, 250), (1400, 250)], fill='#1a5490', width=3)
    
    # Content area with text
    content_y = 330
    draw.text((150, content_y), "This is to certify that", fill='#000000')
    draw.text((150, content_y + 80), f"Candidate {i:03d}", fill='#1a5490', anchor='lm')
    draw.text((150, content_y + 150), "has successfully completed the MongoDB Associate Developer", fill='#000000')
    draw.text((150, content_y + 200), "certification program and demonstrated proficiency in:", fill='#000000')
    
    # Skills list
    skills = [
        "- Database Design and Architecture",
        "- CRUD Operations and Indexing",
        "- Aggregation Framework",
        "- Data Modeling Best Practices",
        "- Query Optimization and Performance",
        "- MongoDB Sharding and Replication"
    ]
    
    skill_y = content_y + 280
    for skill in skills:
        draw.text((200, skill_y), skill, fill='#333333')
        skill_y += 50
    
    # Date issued
    draw.text((150, 900), f"Date Issued: 2024-01-{min(i, 28):02d}", fill='#1a5490')
    
    # Signature area
    draw.line([(150, 950), (400, 950)], fill='#000000', width=2)
    draw.text((275, 980), "MongoDB Examiner", fill='#000000', anchor='mm')
    
    # Seal/Badge area
    draw.ellipse([(1250, 850), (1450, 1050)], outline='#d4af37', width=4)
    draw.text((1350, 950), "VERIFIED", fill='#d4af37', anchor='mm')
    
    # Certification ID
    draw.text((1350, 1010), f"ID: {1000000 + i}", fill='#666666', anchor='mm')
    
    # Save image
    filepath = os.path.join(test_dir, f'mongodb-cert-{i}.png')
    img.save(filepath)
    print(f'Created realistic certificate: mongodb-cert-{i}.png')

print(f'\nAll realistic test certificates created in: {test_dir}')
print('Images now have substantial visual and text content for AI analysis.')
