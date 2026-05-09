import Certificate from '../models/Certificate.js';
import { isDemoMode } from '../config/db.js';
import { demoStore } from './demoStore.js';
import { compareTextForDuplicate } from './ai.service.js';

export const detectDuplicateCertificate = async ({ analysis, certificateId, organizationId, issueDate }) => {
  const ocrText = analysis.ocrText || '';

  if (isDemoMode()) {
    const candidates = demoStore.certificates.filter((cert) => cert.organization === organizationId);
    let bestTextSimilarity = 0;
    candidates.forEach((cert) => {
      bestTextSimilarity = Math.max(bestTextSimilarity, compareTextForDuplicate(ocrText, cert.ocrText || ''));
    });

    return demoStore.findDuplicate({
      certificateId,
      qrData: analysis.qrData,
      imageHash: analysis.imageHash,
      organization: organizationId,
      issueDate,
      textSimilarity: bestTextSimilarity
    });
  }

  const exact = await Certificate.findOne({
    $or: [
      certificateId ? { certificateId } : null,
      analysis.qrData ? { qrData: analysis.qrData } : null,
      analysis.imageHash ? { imageHash: analysis.imageHash } : null
    ].filter(Boolean)
  });

  if (exact) return exact;

  const candidates = await Certificate.find({ organization: organizationId, issueDate }).limit(25);
  return candidates.find((candidate) => compareTextForDuplicate(ocrText, candidate.ocrText || '') >= 90) || null;
};

