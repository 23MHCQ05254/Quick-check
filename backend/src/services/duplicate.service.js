import crypto from 'crypto';
import fs from 'fs';
import Certificate from '../models/Certificate.js';
import { isDemoMode } from '../config/db.js';
import { demoStore } from './demoStore.js';
import { compareTextForDuplicate } from './ai.service.js';

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
export const checkForExactDuplicate = async ({ filePath, organization, studentId, fileHash }) => {
  if (isDemoMode()) return null;

  try {
    const hash = fileHash || generateFileHash(filePath);
    if (!hash) return null;

    // Exact file match - same bytes, same file
    const existing = await Certificate.findOne({
      $or: [
        { fileHash: hash },
        { binaryHash: hash }
      ],
      organization
    });

    return existing ? { isDuplicate: true, existing, reason: 'EXACT_FILE_DUPLICATE' } : null;
  } catch (error) {
    console.error('[duplicate-detection] Exact duplicate check failed:', error.message);
    return null;
  }
};

/**
 * After analysis: compare with existing certificates in same organization
 */
export const detectDuplicateCertificate = async ({ analysis, certificateId, organizationId, issueDate, studentId }) => {
  if (!analysis) return null;

  const ocrText = analysis.ocrText || '';

  if (isDemoMode()) {
    const candidates = demoStore.certificates.filter((cert) => cert.organization === organizationId);
    let bestMatch = null;
    let bestScore = 0;

    candidates.forEach((cert) => {
      const textScore = compareTextForDuplicate(ocrText, cert.ocrText || '');
      if (textScore > bestScore) {
        bestScore = textScore;
        bestMatch = cert;
      }
    });

    return bestScore >= 95 ? bestMatch : null;
  }

  try {
    // Check exact certificate ID match within organization
    if (certificateId) {
      const idMatch = await Certificate.findOne({
        certificateId,
        organization: organizationId,
        $or: [
          { student: studentId },
          { uploadedBy: studentId }
        ]
      });
      if (idMatch) return idMatch; // Same cert uploaded by same student
    }

    // Check for perceptual image hash match (same looking certificate)
    if (analysis.imageHash) {
      const hashMatch = await Certificate.findOne({
        organization: organizationId,
        imageHash: analysis.imageHash
      });
      if (hashMatch) return hashMatch;
    }

    // Check OCR text similarity - ONLY if high confidence extraction
    if (ocrText && ocrText.length > 10) {
      const candidates = await Certificate.find({
        organization: organizationId,
        ocrText: { $exists: true, $ne: '' }
      }).limit(50);

      for (const candidate of candidates) {
        const textSim = compareTextForDuplicate(ocrText, candidate.ocrText || '');
        // High threshold: must be 95%+ match to flag as duplicate
        if (textSim >= 95) {
          return candidate;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[duplicate-detection] Similarity-based duplicate check failed:', error.message);
    return null;
  }
};

