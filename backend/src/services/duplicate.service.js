import crypto from 'crypto';
import fs from 'fs';
import Certificate from '../models/Certificate.js';
import { isDemoMode } from '../config/db.js';
import { demoStore } from './demoStore.js';
import { compareTextForDuplicate } from './ai.service.js';

const normalizeText = (value = '') => value.toString().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const toDateKey = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const candidateText = (candidate) => candidate?.ocrText
  || candidate?.analysis?.ocrText
  || candidate?.aiAnalysis?.ocrText
  || candidate?.extractedCertificateData?.ocrText
  || '';

const candidateQr = (candidate) => {
  const qr = candidate?.qrData || candidate?.analysis?.qrData || candidate?.aiAnalysis?.qrData || candidate?.extractedCertificateData?.qrData;
  if (Array.isArray(qr)) return qr[0]?.data || qr[0] || '';
  return qr || '';
};

const candidateLayoutCount = (candidate) => {
  const extracted = candidate?.extractedCertificateData || {};
  const layouts = extracted.layoutVectors || extracted.layoutRegions || extracted.layouts || [];
  const logos = extracted.logoRegions || extracted.logos || [];
  const signatures = extracted.signatureRegions || extracted.signatures || [];
  return layouts.length + logos.length + signatures.length;
};

const scoreDuplicateCandidate = ({ analysis, candidate, certificateId, issueDate, studentName }) => {
  const uploadedText = normalizeText(analysis.ocrText || '');
  const candidateOcr = normalizeText(candidateText(candidate));
  const uploadedId = normalizeText(certificateId || analysis.certificateId || '');
  const candidateId = normalizeText(candidate.certificateId || '');
  const uploadedQr = normalizeText(analysis.qrData || '');
  const existingQr = normalizeText(candidateQr(candidate));
  const uploadedDate = toDateKey(issueDate || analysis.issueDate);
  const existingDate = toDateKey(candidate.issueDate);
  const uploadedLayoutCount = Number((analysis.extractedCertificateData?.layoutVectors || analysis.extractedCertificateData?.layoutRegions || analysis.extractedCertificateData?.layouts || []).length || 0);
  const existingLayoutCount = candidateLayoutCount(candidate);

  const ocrScore = uploadedText && candidateOcr ? compareTextForDuplicate(uploadedText, candidateOcr) : 0;
  const studentScore = studentName && candidate?.student?.name ? compareTextForDuplicate(studentName, candidate.student.name) : 0;
  const idScore = uploadedId && candidateId && uploadedId === candidateId ? 100 : 0;
  const qrScore = uploadedQr && existingQr && uploadedQr === existingQr ? 100 : 0;
  const dateScore = uploadedDate && existingDate && uploadedDate === existingDate ? 100 : 0;
  const layoutScore = uploadedLayoutCount && existingLayoutCount
    ? 100 - Math.min(100, Math.abs(uploadedLayoutCount - existingLayoutCount) * 12)
    : 0;
  const hashScore = analysis.imageHash && (candidate.imageHash || candidate.binaryHash)
    ? (analysis.imageHash === candidate.imageHash || analysis.imageHash === candidate.binaryHash ? 100 : 0)
    : 0;

  const overall = (
    ocrScore * 0.28 +
    idScore * 0.24 +
    qrScore * 0.16 +
    hashScore * 0.14 +
    dateScore * 0.1 +
    studentScore * 0.05 +
    layoutScore * 0.03
  );

  return {
    certificateId: candidate._id,
    certificateName: candidate.title,
    overall: roundScore(overall),
    components: {
      ocrMatch: roundScore(ocrScore),
      idMatch: roundScore(idScore),
      qrMatch: roundScore(qrScore),
      hashMatch: roundScore(hashScore),
      dateMatch: roundScore(dateScore),
      studentMatch: roundScore(studentScore),
      layoutMatch: roundScore(layoutScore)
    },
    reasons: {
      certificateId: candidate.certificateId,
      issueDate: candidate.issueDate,
      qrData: candidateQr(candidate),
    }
  };
};

const roundScore = (value) => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;

/**
 * Generate SHA256 hash of file for exact duplicate detection
 */
export const generateFileHash = (filePath) => {
  try {
    const fileContent = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileContent).digest('hex');
  } catch (error) {
    console.error('[duplicate-detection] Failed to generate file hash:', error.message);
    return null;
  }
};

/**
 * Check BEFORE analysis: is this exact same file already uploaded?
 */
export const checkForExactDuplicate = async ({ filePath, organization, certificationId, studentId, certificateId, fileHash }) => {
  if (isDemoMode()) return null;

  try {
    const hash = fileHash || generateFileHash(filePath);
    if (!hash) return null;

    const normalizedCertificateId = certificateId ? normalizeText(certificateId) : null;
    const query = {
      organization,
      certification: certificationId
    };

    const orClauses = [
      { fileHash: hash },
      { binaryHash: hash }
    ];

    if (normalizedCertificateId) {
      orClauses.push({ certificateId: normalizedCertificateId });
    }

    if (studentId) {
      orClauses.push({ student: studentId }, { studentId }, { uploadedBy: studentId });
    }

    const existing = await Certificate.findOne({
      $or: orClauses,
      ...query,
      status: 'VERIFIED'
    });

    return existing ? { isDuplicate: true, existing, reason: 'EXACT_FILE_DUPLICATE' } : null;
  } catch (error) {
    console.error('[duplicate-detection] Exact duplicate check failed:', error.message);
    return null;
  }
};

/**
 * After analysis: compare with existing certificates in same certification template
 */
export const detectDuplicateCertificate = async ({ analysis, uploadedCertificateId, certificationId, organizationId, issueDate, studentId }) => {
  if (!analysis) return null;

  if (isDemoMode()) {
    // ONLY check against ACCEPTED (VERIFIED) certificates
    const candidates = demoStore.certificates.filter((cert) =>
      cert.organization === organizationId &&
      cert.certification === certificationId &&
      cert.status === 'VERIFIED'  // Only VERIFIED certs can match for duplicate
    );
    let bestMatch = null;

    candidates.forEach((cert) => {
      const score = scoreDuplicateCandidate({ analysis, candidate: cert, certificateId: uploadedCertificateId, issueDate });
      if (!bestMatch || score.overall > bestMatch.duplicateProbability) {
        bestMatch = { ...cert, duplicateProbability: score.overall, duplicateMatch: score };
      }
    });

    return bestMatch && bestMatch.duplicateProbability >= 90 ? bestMatch : null;
  }

  try {
    const query = {
      organization: organizationId,
      certification: certificationId,
      status: 'VERIFIED'  // CRITICAL: Only VERIFIED certificates participate in duplicate detection
    };

    if (studentId) {
      query.$or = [{ student: studentId }, { studentId }, { userId: studentId }, { uploadedBy: studentId }];
    }

    const candidates = await Certificate.find(query).limit(100);
    let bestMatch = null;
    const uploadedFingerprint = normalizeText(analysis.textFingerprint || analysis.ocrText || '');

    for (const candidate of candidates) {
      const score = scoreDuplicateCandidate({ analysis, candidate, certificateId: uploadedCertificateId, issueDate, studentName: analysis.studentName || '' });
      if (!bestMatch || score.overall > bestMatch.duplicateProbability) {
        const candidateFingerprint = normalizeText(candidate.textFingerprint || candidate.ocrText || '');
        if (uploadedFingerprint && candidateFingerprint && uploadedFingerprint === candidateFingerprint) {
          score.overall = 100;
          score.reasons = { ...score.reasons, duplicateReason: 'OCR_FINGERPRINT_MATCH' };
        }
        bestMatch = { ...candidate.toObject(), duplicateProbability: score.overall, duplicateMatch: score };
      }
    }

    console.log(`[duplicate-detection] Checked ${candidates.length} VERIFIED certificates, best match: ${bestMatch?.duplicateProbability || 0}%`);
    return bestMatch && bestMatch.duplicateProbability >= 90 ? bestMatch : null;
  } catch (error) {
    console.error('[duplicate-detection] Similarity-based duplicate check failed:', error.message);
    return null;
  }
};
