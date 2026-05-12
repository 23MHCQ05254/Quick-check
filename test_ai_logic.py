#!/usr/bin/env python3
"""
End-to-end test of new production AI verification logic
Tests:
1. OCR pipeline with preprocessing
2. Scoring engine with content-focused weights
3. Dynamic comparator with wide tolerances
"""

import requests
import json
from pathlib import Path

# Configuration
BACKEND_URL = "http://localhost:8000"
AI_SERVICE_URL = "http://localhost:8001"
TEST_CERT_DIR = Path("../test-certs")

def test_ai_service_direct():
    """Test AI service /analyze endpoint directly"""
    print("\n" + "="*70)
    print("TESTING AI SERVICE DIRECTLY")
    print("="*70)
    
    # Find a test certificate
    cert_files = list(TEST_CERT_DIR.glob("*.png")) + list(TEST_CERT_DIR.glob("*.jpg"))
    
    if not cert_files:
        print("❌ No test certificates found in", TEST_CERT_DIR)
        return False
    
    test_file = cert_files[0]
    print(f"\n✓ Using test certificate: {test_file.name}")
    
    # Create template profile (mock)
    template_profile = {
        "extractedProfile": {
            "resolution": {"width": 1600, "height": 1130, "aspectRatio": 1.416},
            "dominantColors": ["#0EA5E9", "#111827", "#F8FAFC"],
            "brightness": 220,
            "edgeDensity": 0.18,
            "textDensity": 0.3,
            "qrData": "",
            "ocrText": "MongoDB Associate Developer Certification",
        },
        "components": []
    }
    
    # Upload to AI service
    print(f"\n→ Uploading to AI service: {AI_SERVICE_URL}/analyze")
    
    with open(test_file, 'rb') as f:
        files = {'file': (test_file.name, f, 'image/png')}
        data = {
            'student_name': 'Test Student',
            'template_profile': json.dumps(template_profile),
            'certificate_id': 'MONGO-2024-12345',
            'organization': 'MongoDB',
            'issue_date': '2024-01-15',
        }
        
        try:
            response = requests.post(
                f"{AI_SERVICE_URL}/analyze",
                files=files,
                data=data,
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"❌ AI service returned {response.status_code}")
                print(f"Response: {response.text[:500]}")
                return False
            
            result = response.json()
            
            # Parse results
            print("\n" + "="*70)
            print("AI SERVICE ANALYSIS RESULTS")
            print("="*70)
            
            print(f"✓ Verification Status: {result.get('verificationStatus', 'UNKNOWN')}")
            print(f"✓ Fraud Probability: {result.get('fraudProbability', 'N/A')}%")
            print(f"✓ Confidence: {result.get('confidence', 'N/A')}%")
            print(f"✓ Recommendation: {result.get('recommendation', 'UNKNOWN')}")
            
            print("\n" + "="*70)
            print("METRIC SCORES")
            print("="*70)
            print(f"  Name Similarity: {result.get('nameSimilarity', 0):.1f}%")
            print(f"  Visual Similarity: {result.get('visualSimilarity', 0):.1f}%")
            
            visual_comps = result.get('visualComponents', {})
            if visual_comps:
                print(f"  - QR Similarity: {visual_comps.get('qrSimilarity', 0):.1f}%")
                print(f"  - Logo Similarity: {visual_comps.get('logoSimilarity', 0):.1f}%")
                print(f"  - Structure Similarity: {visual_comps.get('structureSimilarity', 0):.1f}%")
            
            print("\n" + "="*70)
            print("OCR EXTRACTION")
            print("="*70)
            ocr_text = result.get('ocrText', '')
            if ocr_text:
                print(f"✓ Text extracted: {len(ocr_text)} characters")
                print(f"  Preview: {ocr_text[:200]}...")
            else:
                print("❌ No text extracted (OCR failed)")
            
            print("\n" + "="*70)
            print("ANOMALIES & EXPLANATIONS")
            print("="*70)
            
            anomalies = result.get('anomalies', [])
            if anomalies:
                print(f"Detected {len(anomalies)} anomaly/anomalies:")
                for a in anomalies:
                    severity = a.get('severity', 'UNKNOWN')
                    desc = a.get('description', 'No description')
                    print(f"  • [{severity}] {desc}")
            else:
                print("✓ No anomalies detected")
            
            explanations = result.get('suspiciousIndicators', [])
            if explanations:
                print(f"\nExplanations:")
                for exp in explanations:
                    print(f"  • {exp}")
            
            # Key test: Check if genuine cert gets VERIFIED or NEEDS_REVIEW (not REJECTED)
            status = result.get('verificationStatus', 'REJECTED')
            if status == 'VERIFIED':
                print("\n✅ SUCCESS: Genuine certificate achieved VERIFIED status!")
                print("   Production AI logic is working correctly.")
                return True
            elif status == 'NEEDS_REVIEW':
                print("\n⚠️  PARTIAL SUCCESS: Certificate in NEEDS_REVIEW")
                print("   Genuine certificates should achieve this or VERIFIED.")
                return True
            else:
                print("\n❌ ISSUE: Certificate rejected despite being genuine")
                print("   Check if:")
                print("   - OCR extracted sufficient text")
                print("   - Visual tolerances are wide enough")
                print("   - Name/cert ID matching improved")
                confidence = result.get('confidence', 0)
                if confidence < 40:
                    print(f"   - Confidence too low ({confidence}%)")
                return False
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
            return False

if __name__ == "__main__":
    success = test_ai_service_direct()
    exit(0 if success else 1)
