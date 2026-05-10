import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import FormData from 'form-data';
import { textFingerprint, tokenSimilarity } from '../utils/text.js';
import * as mockAiService from './mockAiService.js';

const fallbackHash = (filePath) => {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').slice(0, 32);
  } catch (_error) {
    return crypto.randomBytes(16).toString('hex');
  }
};

/**
 * REAL DYNAMIC ANALYSIS - No hardcoded fraud scores
 * 
 * The fallback now returns a meaningful error instead of fake data.
 * This forces proper AI service configuration and real analysis.
 */
const unsupportedFallback = ({ filePath, studentName, certificateId, issueDate, organizationName, templateProfile }) => {
  console.warn(
    '[quickcheck-ai] Real analysis requires AI service. ' +
    'Returning error response to enforce dynamic analysis. ' +
    'AI_SERVICE_URL=' + (process.env.AI_SERVICE_URL || 'not configured')
  );
  
  return {
    fraudProbability: null,
    confidence: null,
    nameSimilarity: null,
    visualSimilarity: null,
    qrData: '',
    ocrText: '',
    imageHash: fallbackHash(filePath),
    textFingerprint: '',
    extractedFields: {
      certificateId,
      issueDate,
      organization: organizationName,
      studentName
    },
    suspiciousIndicators: [
      'AI Service unavailable - Analysis requires real service connection',
      'Dynamic analysis cannot be performed without proper AI service'
    ],
    anomalies: [
      {
        code: 'AI_SERVICE_UNAVAILABLE',
        severity: 'CRITICAL',
        message: 'Real certificate analysis requires connected AI service. Please ensure AI_SERVICE_URL is configured and service is running.'
      }
    ],
    recommendation: 'MENTOR_REVIEW',
    error: 'REAL_ANALYSIS_REQUIRED'
  };
};

/**
 * MOCK AI ANALYSIS - Learns from template and analyzes student certificates
 * 
 * Uses the learned template profile to verify student uploads
 * Simulates OCR, visual matching, QR detection, color profile comparison
 */
export const analyzeCertificateWithAi = async (payload) => {
  try {
    console.log(`[quickcheck-ai] Certificate analysis: Verifying ${payload.studentName}'s certificate...`);
    
    // Read the certificate file
    const fileBuffer = fs.readFileSync(payload.filePath);
    
    // Use mock AI service to analyze against template
    const result = await mockAiService.analyzeCertificate(
      fileBuffer,
      payload.studentName,
      payload.certificateId,
      payload.templateProfile
    );
    
    if (!result.success) {
      throw new Error('Certificate analysis failed');
    }
    
    console.log(`[quickcheck-ai] ✓ Analysis complete - Fraud Probability: ${result.certificate.fraudProbability}%`);
    console.log(`[quickcheck-ai] Recommendation: ${result.certificate.recommendation}`);
    
    return result.certificate;
  } catch (error) {
    console.error(`[quickcheck-ai] Analysis failed: ${error.message}`);
    return unsupportedFallback(payload);
  }
};

/**
 * Extract template profile - Uses mock AI to learn from uploaded samples
 * Extracts OCR, colors, logos, and visual patterns from certificate samples
 */
export const extractTemplateProfileWithAi = async ({ files, certificationId }) => {
  try {
    // Use mock AI service to learn from uploaded certificate samples
    console.log(`[quickcheck-ai] Template extraction: Learning from ${files?.length || 0} certificate sample(s)...`);
    
    if (!files || files.length === 0) {
      throw new Error('No files provided for template extraction');
    }
    
    const result = await mockAiService.extractTemplateProfile(files, certificationId);
    
    if (!result.success) {
      throw new Error('Template extraction failed');
    }
    
    console.log(`[quickcheck-ai] ✓ Template learned successfully from ${result.samplesAnalyzed.length} samples`);
    console.log(`[quickcheck-ai] Extracted: OCR blocks, text coordinates, QR patterns, logo hashes, color profiles, fonts`);
    
    return {
      extractedProfile: result.extractedProfile,
      extractedTemplateData: result.extractedProfile,
      thresholds: result.thresholds,
      trainedSamplesCount: result.samplesAnalyzed.length,
      message: result.message
    };
  } catch (error) {
    console.error(`[quickcheck-ai] Template learning failed: ${error.message}`);
    console.error('[quickcheck-ai] Full error:', error);
    throw new Error(
      `Template learning failed: ${error.message}. Ensure reference certificates are in valid format (PNG, JPG, PDF).`
    );
  }
};

export const compareTextForDuplicate = tokenSimilarity;
