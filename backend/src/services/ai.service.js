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
 * The fallback now throws an error instead of fake data.
 * This forces proper AI service configuration and real analysis.
 */
const unsupportedFallback = ({ filePath, studentName, certificateId, issueDate, organizationName, templateProfile }) => {
  console.error(
    '[quickcheck-ai] Real analysis requires AI service. ' +
    'AI_SERVICE_URL=' + (process.env.AI_SERVICE_URL || 'not configured')
  );

  throw new Error(
    'AI service is unavailable. Real certificate analysis requires the AI service to be running on ' +
    (process.env.AI_SERVICE_URL || 'http://localhost:8001') +
    '. Please start the AI service and ensure it is accessible.'
  );
};

export const analyzeCertificateWithAi = async (payload) => {
  const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8001';

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(payload.filePath));
    form.append('student_name', payload.studentName);
    form.append('certificate_id', payload.certificateId || '');
    form.append('issue_date', payload.issueDate || '');
    form.append('organization', payload.organizationName || '');
    form.append('template_profile', JSON.stringify(payload.templateProfile || {}));

    const { data: rawData } = await axios.post(`${aiUrl}/analyze`, form, {
      headers: form.getHeaders(),
      timeout: 30000,
      maxBodyLength: Infinity
    });

    // Adapter: accept several response shapes (raw, wrapped, legacy)
    let data = rawData;
    // common wrapper: { success: true, data: { ... } }
    if (data && data.success && data.data) data = data.data;
    // alternate wrapper used previously: { success_response: { ... } }
    if (data && data.success_response) data = data.success_response;
    // some endpoints return { result: {...} }
    if (data && data.result) data = data.result;

    // Ensure real analysis data is returned
    if (!data || data.error === 'REAL_ANALYSIS_REQUIRED') {
      throw new Error('AI service returned unsupported response');
    }

    return data;
  } catch (error) {
    console.error(`[quickcheck-ai] Analysis failed: ${error.message}`);
    throw error; // Throw error instead of returning fake data
  }
};

/**
 * Extract template profile - enforces real template learning
 */
export const extractTemplateProfileWithAi = async ({ files, certificationId }) => {
  const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8001';

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
    // Include AI service response body when available to aid debugging
    const aiDetails = error.response && error.response.data ? JSON.stringify(error.response.data) : null;
    console.error(`[quickcheck-ai] Template extraction failed: ${error.message}`, aiDetails || '');
    throw new Error(
      `Real template learning failed: ${error.message}. ` +
      (aiDetails ? `AI details: ${aiDetails}. ` : '') +
      'Please ensure AI_SERVICE_URL is configured and service is running. ' +
      `Current URL: ${aiUrl}`
    );
  }
};

export const compareTextForDuplicate = tokenSimilarity;
