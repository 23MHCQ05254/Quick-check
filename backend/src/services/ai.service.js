import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import FormData from 'form-data';
import { textFingerprint, tokenSimilarity } from '../utils/text.js';

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

export const analyzeCertificateWithAi = async (payload) => {
  const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(payload.filePath));
    form.append('student_name', payload.studentName);
    form.append('certificate_id', payload.certificateId || '');
    form.append('issue_date', payload.issueDate || '');
    form.append('organization', payload.organizationName || '');
    form.append('template_profile', JSON.stringify(payload.templateProfile || {}));

    const { data } = await axios.post(`${aiUrl}/analyze`, form, {
      headers: form.getHeaders(),
      timeout: 30000,
      maxBodyLength: Infinity
    });
    
    // Ensure real analysis data is returned
    if (!data || data.error === 'REAL_ANALYSIS_REQUIRED') {
      throw new Error('AI service returned unsupported response');
    }
    
    return data;
  } catch (error) {
    console.error(`[quickcheck-ai] Analysis failed: ${error.message}`);
    return unsupportedFallback(payload);
  }
};

/**
 * Extract template profile - enforces real template learning
 */
export const extractTemplateProfileWithAi = async ({ files, certificationId }) => {
  const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

  try {
    const form = new FormData();
    form.append('certification_id', certificationId);
    files.forEach((file) => form.append('files', fs.createReadStream(file.path)));

    const { data } = await axios.post(`${aiUrl}/templates/extract`, form, {
      headers: form.getHeaders(),
      timeout: 45000,
      maxBodyLength: Infinity
    });
    
    // Ensure real template data is returned
    if (!data || !data.extractedProfile) {
      throw new Error('AI service returned incomplete template data');
    }
    
    return data;
  } catch (error) {
    console.error(`[quickcheck-ai] Template extraction failed: ${error.message}`);
    throw new Error(
      `Real template learning failed: ${error.message}. ` +
      'Please ensure AI_SERVICE_URL is configured and service is running. ' +
      `Current URL: ${aiUrl}`
    );
  }
};

export const compareTextForDuplicate = tokenSimilarity;
