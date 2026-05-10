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

const aiBaseUrl = () => process.env.AI_SERVICE_URL || 'http://localhost:8000';

const normalizeTemplateProfile = (templateProfile = {}) => {
  const learnedProfile = templateProfile.learnedProfile || templateProfile.extractedProfile || templateProfile.extractedTemplateData || templateProfile;
  return {
    certificationId: templateProfile.certificationId || templateProfile.certification?._id || templateProfile.certification || '',
    thresholds: templateProfile.thresholds || learnedProfile.thresholds || {},
    metadata: templateProfile.metadata || learnedProfile.metadata || {},
    extractedProfile: learnedProfile,
    ...learnedProfile
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
    const templateProfile = normalizeTemplateProfile(payload.templateProfile);
    const aiUrl = aiBaseUrl();
    console.log(`[quickcheck-ai] Certificate analysis starting for ${payload.studentName}`);
    console.log('[quickcheck-ai] Loaded template profile keys:', Object.keys(templateProfile));

    const form = new FormData();
    form.append('file', fs.createReadStream(payload.filePath));
    form.append('student_name', payload.studentName || '');
    form.append('certificate_id', payload.certificateId || '');
    form.append('issue_date', payload.issueDate || '');
    form.append('organization', payload.organizationName || '');
    form.append('template_profile', JSON.stringify(templateProfile));

    const { data } = await axios.post(`${aiUrl}/analyze`, form, {
      headers: form.getHeaders(),
      timeout: 45000,
      maxBodyLength: Infinity
    });

    console.log('[quickcheck-ai] AI response received');
    console.log('[quickcheck-ai] Comparison metrics:', JSON.stringify({
      fraudProbability: data.fraudProbability,
      confidence: data.confidence,
      nameSimilarity: data.nameSimilarity,
      visualSimilarity: data.visualSimilarity,
      verificationStatus: data.verificationStatus
    }, null, 2));

    return data;
  } catch (error) {
    console.error(`[quickcheck-ai] Analysis failed: ${error.message}`);
    throw new Error(`AI analysis failed: ${error.message}. Ensure the AI service is running at ${aiBaseUrl()}.`);
  }
};

/**
 * Extract template profile - Uses mock AI to learn from uploaded samples
 * Extracts OCR, colors, logos, and visual patterns from certificate samples
 */
export const extractTemplateProfileWithAi = async ({ files, certificationId }) => {
  try {
    const aiUrl = aiBaseUrl();
    console.log(`[quickcheck-ai] Template extraction: Learning from ${files?.length || 0} certificate sample(s)...`);

    if (!files || files.length === 0) {
      throw new Error('No files provided for template extraction');
    }

    const form = new FormData();
    form.append('certification_id', certificationId);
    files.forEach((file) => form.append('files', fs.createReadStream(file.path)));

    const { data } = await axios.post(`${aiUrl}/templates/extract`, form, {
      headers: form.getHeaders(),
      timeout: 60000,
      maxBodyLength: Infinity
    });

    if (!data?.extractedProfile) {
      throw new Error('AI service returned incomplete template data');
    }

    console.log('[quickcheck-ai] Template extraction complete');
    console.log('[quickcheck-ai] Extracted template keys:', Object.keys(data.extractedProfile || {}));
    console.log('[quickcheck-ai] Learned thresholds:', JSON.stringify(data.thresholds || {}, null, 2));

    return {
      extractedProfile: data.extractedProfile,
      extractedTemplateData: data.extractedProfile,
      thresholds: data.thresholds,
      trainedSamplesCount: data.sampleCount || files.length,
      message: `Template profile learned from ${data.sampleCount || files.length} sample(s).`
    };
  } catch (error) {
    console.error(`[quickcheck-ai] Template learning failed: ${error.message}`);
    console.error('[quickcheck-ai] Full error:', error);
    throw new Error(`Template learning failed: ${error.message}. Ensure the AI service is running at ${aiBaseUrl()}.`);
  }
};

export const compareTextForDuplicate = tokenSimilarity;
