/**
 * Mock AI Service - Simulates template extraction and certificate analysis
 * Learns from uploaded certificate samples and generates template profiles
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Extract template profile from uploaded certificate samples
 * Simulates AI template learning by analyzing file metadata and basic properties
 */
export async function extractTemplateProfile(files, certificationId) {
  console.log('[mockAiService] Extracting template profile...');
  console.log('[mockAiService] Files received:', files?.length || 0, 'files');
  
  if (!files || files.length === 0) {
    throw new Error('No certificate files provided for template extraction');
  }

  try {
    console.log('[mockAiService] Processing files...');
    // Simulate analyzing the uploaded files
    const analysisResults = files.map((file, index) => {
      console.log(`[mockAiService] File ${index + 1}:`, file.originalname, `(${file.size} bytes)`);
      return {
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        analyzed: true
      };
    });

    // Generate synthetic template data based on sample count
    const sampleCount = files.length;
    const avgFileSize = Math.round(files.reduce((sum, f) => sum + f.size, 0) / sampleCount);

    const extractedProfile = {
      // Simulated OCR and text extraction
      ocrBlocks: generateOcrBlocks(sampleCount),
      
      // Simulated text coordinates and patterns
      textCoordinates: generateTextCoordinates(sampleCount),
      
      // Simulated QR codes found
      qrData: generateQrPatterns(sampleCount),
      
      // Simulated logo hashes
      logoHashes: generateLogoHashes(sampleCount),
      
      // Simulated color profiles
      colorProfiles: generateColorProfiles(),
      
      // Simulated font metadata
      fontMetadata: generateFontMetadata(sampleCount),
      
      // Simulated image hashes
      imageHashes: files.map((f, i) => `hash_${i}_${Date.now()}`),
      
      // Visual fingerprint (simulated)
      visualFingerprint: {
        edgeDensity: 0.15 + Math.random() * 0.1,
        textDensity: 0.25 + Math.random() * 0.15,
        brightness: 200 + Math.random() * 50,
        contrast: 0.6 + Math.random() * 0.2,
        colorVariance: 0.3 + Math.random() * 0.2,
        symbolDensity: 0.1 + Math.random() * 0.08
      },
      
      // Template quality metrics
      averageTemplateScore: 75 + Math.random() * 20,
      
      // Metadata about the extraction
      metadata: {
        samplesAnalyzed: sampleCount,
        avgFileSizeMb: (avgFileSize / 1024 / 1024).toFixed(2),
        extractionTimestamp: new Date().toISOString(),
        extractionMethod: 'mock_ai_extraction',
        confidence: 0.85 + Math.random() * 0.15
      }
    };

    // Generate thresholds based on sample quality
    const thresholds = {
      nameSimilarity: 75 + (sampleCount > 5 ? 5 : 0),
      visualSimilarity: 70 + (sampleCount > 5 ? 5 : 0),
      fraudReview: 60 + (sampleCount > 7 ? 5 : 0),
      fraudReject: 90 + (sampleCount > 7 ? 2 : 0)
    };

    return {
      success: true,
      extractedProfile,
      thresholds,
      samplesAnalyzed: analysisResults,
      message: `Template profile extracted from ${sampleCount} certificate sample(s). System learned: OCR patterns, color profiles, logo hashes, and visual fingerprints.`
    };
  } catch (error) {
    throw new Error(`Template extraction failed: ${error.message}`);
  }
}

/**
 * Analyze uploaded certificate against template profile
 * Simulates fraud detection and verification
 */
export async function analyzeCertificate(fileBuffer, studentName, certificateId, templateProfile) {
  if (!fileBuffer) {
    throw new Error('No certificate file provided for analysis');
  }

  if (!templateProfile) {
    throw new Error('Template profile not found');
  }

  try {
    // Generate simulated analysis results
    const analysis = {
      fraudProbability: generateFraudScore(studentName, certificateId),
      confidence: 0.75 + Math.random() * 0.25,
      
      // Name matching simulation
      nameSimilarity: generateNameSimilarity(studentName),
      
      // Visual matching against template
      visualSimilarity: 65 + Math.random() * 30,
      
      // Extracted data (simulated OCR)
      ocrText: generateMockOcrText(certificateId, studentName),
      
      // QR code data if found
      qrData: Math.random() > 0.5 ? `QR_${certificateId}_${Date.now()}` : null,
      
      // Simulated hashes
      imageHash: `img_${Date.now()}`,
      textFingerprint: `txt_fp_${Date.now()}`,
      
      // Extracted fields from certificate
      extractedFields: {
        name: studentName,
        certificateId: certificateId,
        issueDate: new Date().toISOString().split('T')[0],
        organizationName: 'Extracted from certificate',
        credentialUrl: `cert://${certificateId}`
      },
      
      // Simulated suspicious indicators
      suspiciousIndicators: generateSuspiciousIndicators(),
      
      // Simulated anomalies with coordinates for visual overlay
      anomalies: generateAnomalies(),
      
      // Recommendation
      recommendation: generateRecommendation(
        generateFraudScore(studentName, certificateId),
        generateNameSimilarity(studentName)
      ),
      
      // Metadata
      metadata: {
        analysisTimestamp: new Date().toISOString(),
        analysisMethod: 'mock_ai_verification',
        templateUsed: templateProfile?._id || 'unknown',
        fileSize: fileBuffer.length,
        processingTimeMs: Math.round(Math.random() * 500 + 200)
      }
    };

    return {
      success: true,
      certificate: analysis
    };
  } catch (error) {
    throw new Error(`Certificate analysis failed: ${error.message}`);
  }
}

// ============ Helper Functions ============

function generateOcrBlocks(count) {
  const blocks = [];
  for (let i = 0; i < Math.min(count * 3, 12); i++) {
    blocks.push({
      text: `[Text Block ${i + 1}]`,
      confidence: 0.85 + Math.random() * 0.15,
      x: Math.random() * 1000,
      y: Math.random() * 800
    });
  }
  return blocks;
}

function generateTextCoordinates(count) {
  return Array.from({ length: count * 2 }, (_, i) => ({
    text: `Coordinate ${i + 1}`,
    x: Math.random() * 1600,
    y: Math.random() * 1130,
    width: 200 + Math.random() * 300,
    height: 40 + Math.random() * 60
  }));
}

function generateQrPatterns(count) {
  if (Math.random() > 0.5) {
    return [`qr_pattern_${Date.now()}_1`, `qr_pattern_${Date.now()}_2`];
  }
  return [];
}

function generateLogoHashes(count) {
  return [
    `logo_hash_primary_${Date.now()}`,
    `logo_hash_secondary_${Date.now()}`
  ];
}

function generateColorProfiles() {
  return {
    dominantColors: ['#0EA5E9', '#111827', '#F8FAFC'],
    secondaryColors: ['#06B6D4', '#1F2937'],
    avgBrightness: 220,
    avgContrast: 0.75,
    colorEntropy: 0.6
  };
}

function generateFontMetadata(count) {
  return {
    primaryFont: 'Helvetica',
    secondaryFont: 'Arial',
    fontSizes: [12, 14, 16, 18, 24, 32],
    boldUsage: 0.25,
    italicUsage: 0.1,
    fontVariations: ['regular', 'bold', 'italic']
  };
}

function generateFraudScore(studentName, certificateId) {
  // Deterministic but looks random
  const seed = (studentName + certificateId).length;
  return (seed % 40) + 15; // Between 15-55% fraud probability for demo
}

function generateNameSimilarity(studentName) {
  // Simulated name matching score
  return 70 + Math.random() * 30; // 70-100% similarity
}

function generateMockOcrText(certificateId, studentName) {
  return `
    Certificate ID: ${certificateId}
    This certifies that ${studentName}
    has successfully completed the certification program
    Organization: Verified Institution
    Date: ${new Date().toLocaleDateString()}
    Signature: [Digital Signature]
  `.trim();
}

function generateSuspiciousIndicators() {
  const indicators = [
    'Certificate format matches template',
    'OCR text extraction successful',
    'QR code validation pending',
    'Color profile within expected range'
  ];
  
  // Randomly add suspicious flags
  if (Math.random() > 0.7) {
    indicators.push('⚠️ Text font differs from template');
  }
  if (Math.random() > 0.8) {
    indicators.push('⚠️ Color profile variance detected');
  }
  
  return indicators;
}

function generateAnomalies() {
  const anomalies = [];
  
  // Randomly generate suspicious regions for overlay
  if (Math.random() > 0.6) {
    anomalies.push({
      type: 'text_mismatch',
      x: 100 + Math.random() * 1400,
      y: 100 + Math.random() * 900,
      width: 200 + Math.random() * 300,
      height: 80 + Math.random() * 100,
      severity: 'low',
      description: 'Minor text format variation'
    });
  }
  
  if (Math.random() > 0.75) {
    anomalies.push({
      type: 'color_variance',
      x: 200 + Math.random() * 1300,
      y: 200 + Math.random() * 800,
      width: 150 + Math.random() * 250,
      height: 60 + Math.random() * 80,
      severity: 'medium',
      description: 'Color profile variance detected'
    });
  }
  
  return anomalies;
}

function generateRecommendation(fraudScore, nameSimilarity) {
  if (fraudScore > 70) {
    return 'REJECT: High fraud probability detected';
  } else if (fraudScore > 50) {
    return 'REVIEW: Certificate requires mentor review';
  } else if (nameSimilarity < 60) {
    return 'REVIEW: Name similarity below threshold';
  } else {
    return 'APPROVE: Certificate appears authentic';
  }
}

export default {
  extractTemplateProfile,
  analyzeCertificate
};
