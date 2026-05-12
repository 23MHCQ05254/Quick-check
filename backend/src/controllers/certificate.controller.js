import { isDemoMode } from '../config/db.js';
import Certificate from '../models/Certificate.js';
import Certification from '../models/Certification.js';
import TemplateProfile from '../models/TemplateProfile.js';
import { analyzeCertificateWithAi } from '../services/ai.service.js';
import { demoStore } from '../services/dataAdapter.js';
import { detectDuplicateCertificate, checkForExactDuplicate, generateFileHash } from '../services/duplicate.service.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { textFingerprint } from '../utils/text.js';

const statusFromAnalysis = (analysis, duplicate) => {
  if (!analysis) {
    console.error('[certificates.upload] ERROR: Analysis is null/undefined - AI service may not have returned valid data');
    throw new ApiError(500, 'Certificate analysis failed: AI service returned incomplete data');
  }

  // Duplicate certificates are always rejected
  if (duplicate) {
    console.log('[certificates.upload] ✗ REJECTED: Duplicate certificate detected');
    return 'REJECTED';
  }

  // Prefer explicit verificationStatus from AI service when provided
  if (analysis.verificationStatus && typeof analysis.verificationStatus === 'string') {
    const s = analysis.verificationStatus.toUpperCase();
    if (['VERIFIED', 'ACCEPTED'].includes(s)) {
      console.log(`[certificates.upload] AI Verdict from verificationStatus: ${s}`);
      return 'VERIFIED';
    }
    if (['REJECTED', 'NEEDS_REVIEW', 'REVIEW_REQUIRED'].includes(s)) {
      console.log(`[certificates.upload] AI Verdict from verificationStatus: ${s}`);
      return 'REJECTED';
    }
  }

  // Use trustScore / weightedConfidence if available (preferred)
  const score = (typeof analysis.trustScore !== 'undefined' && analysis.trustScore !== null)
    ? Number(analysis.trustScore)
    : (typeof analysis.weightedConfidence !== 'undefined' && analysis.weightedConfidence !== null)
    ? Number(analysis.weightedConfidence)
    : (typeof analysis.confidence !== 'undefined' && analysis.confidence !== null)
    ? Number(analysis.confidence)
    : null;

  if (score === null || Number.isNaN(score)) {
    console.warn('[certificates.upload] WARNING: No numeric score available in analysis, rejecting because AI verdict is incomplete');
    return 'REJECTED';
  }

  console.log(`[certificates.upload] AI Verdict: score=${score}, fraudProbability=${analysis.fraudProbability || 'N/A'}`);

  // Final AI verdict only: a certificate must strongly match the trained template.
  if (score >= 95) {
    console.log('[certificates.upload] ✓ VERIFIED: score >= 95');
    return 'VERIFIED';
  }

  console.log('[certificates.upload] ✗ REJECTED: score < 95');
  return 'REJECTED';
};

export const uploadCertificate = asyncHandler(async (req, res) => {
  const { certificationId, certificateId, issueDate } = req.body;
  const userId = req.user.id || req.user._id;

  if (!certificationId) {
    throw new ApiError(400, 'A certification type must be selected before upload');
  }

  if (!req.file) {
    throw new ApiError(400, 'Certificate file is required');
  }

  if (isDemoMode()) {
    const certification = await demoStore.findCertification(certificationId);
    if (!certification) throw new ApiError(404, 'Certification type not found');

    const template = await demoStore.findTemplateByCertification(certification._id);
    if (!template) throw new ApiError(400, 'Selected certification does not have an active template profile');

    const analysis = await analyzeCertificateWithAi({
      filePath: req.file.path,
      studentName: req.user.name,
      certificateId,
      issueDate,
      userId,
      organizationName: certification.organization.name,
      organizationId: certification.organization._id.toString(),
      certificationId: certification._id.toString(),
      templateProfile: template
    });

    const duplicate = await detectDuplicateCertificate({
      analysis,
      certificateId,
      organizationId: certification.organization._id,
      issueDate,
      studentId: userId,
      studentName: req.user.name
    });

    const record = await demoStore.addCertificate({
      userId,
      studentId: userId,
      mentorId: undefined,
      uploadedBy: userId,
      createdBy: userId,
      student: userId,
      certification: certification._id,
      organization: certification.organization._id,
      title: certification.name,
      certificateId,
      issueDate: issueDate ? new Date(issueDate) : null,
      fileUrl: `/uploads/${req.file.filename}`,
      filePath: req.file.path,
      originalName: req.file.originalname,
      qrData: analysis.qrData || '',
      ocrText: analysis.ocrText || '',
      textFingerprint: analysis.textFingerprint || textFingerprint(analysis.ocrText || ''),
      imageHash: analysis.imageHash,
      duplicateOf: duplicate?._id,
      status: statusFromAnalysis(analysis, duplicate),
      analysis: {
        ...analysis,
        suspiciousIndicators: duplicate
          ? [...(analysis.suspiciousIndicators || []), 'Duplicate evidence matched an existing upload']
          : analysis.suspiciousIndicators || []
      }
    });

    const decorated = await demoStore.decorateCertificate(record);
    res.status(201).json({ certificate: decorated });
    return;
  }

  const certification = await Certification.findById(certificationId).populate('organization');
  if (!certification) throw new ApiError(404, 'Certification type not found');

  const template = await TemplateProfile.findOne({ certification: certification._id, status: 'ACTIVE' });
  if (!template) throw new ApiError(400, 'Selected certification does not have an active template profile');
  console.log('[certificates.upload] Loaded template profile for certification:', certification._id.toString());
  console.log('[certificates.upload] Template keys:', Object.keys(template.toJSON()));

  const learnedTemplateProfile = template.learnedProfile || template.extractedProfile || template.extractedTemplateData || {};
  console.log('[certificates.upload] Learned template profile snapshot:', JSON.stringify(learnedTemplateProfile, null, 2));

  // STEP 1: Check for exact duplicate BEFORE AI analysis
  const fileHash = generateFileHash(req.file.path);
  const exactDup = await checkForExactDuplicate({
    filePath: req.file.path,
    organization: certification.organization._id,
    certificationId: certification._id,
    studentId: userId,
    certificateId,
    fileHash
  });

  if (exactDup?.isDuplicate) {
    throw new ApiError(400, `This certificate file has already been uploaded. Duplicate ID: ${exactDup.existing._id}`);
  }

  // STEP 2: Run AI analysis on unique file
  const analysis = await analyzeCertificateWithAi({
    filePath: req.file.path,
    studentName: req.user.name,
    certificateId,
    issueDate,
    userId,
    organizationName: certification.organization.name,
    organizationId: certification.organization._id.toString(),
    certificationId: certification._id.toString(),
    templateProfile: {
      certificationId: certification._id.toString(),
      thresholds: template.thresholds,
      metadata: template.metadata,
      extractedProfile: learnedTemplateProfile,
      ...learnedTemplateProfile
    }
  });

  // STEP 3: Check for similar certificates (after analysis)
  let duplicate = null;
  const provisionalStatus = statusFromAnalysis(analysis, null);
  if (provisionalStatus === 'VERIFIED') {
    duplicate = await detectDuplicateCertificate({
      analysis,
      uploadedCertificateId: certificateId,
      certificationId: certification._id,
      organizationId: certification.organization._id,
      issueDate,
      studentId: userId,
      studentName: req.user.name
    });
  }
  const finalStatus = statusFromAnalysis(analysis, duplicate);

  const certificate = await Certificate.create({
    userId,
    studentId: userId,
    mentorId: undefined,
    uploadedBy: userId,
    createdBy: userId,
    student: userId,
    certification: certification._id,
    organization: certification.organization._id,
    title: certification.name,
    certificateId,
    issueDate: issueDate ? new Date(issueDate) : null,
    fileUrl: `/uploads/${req.file.filename}`,
    filePath: req.file.path,
    originalName: req.file.originalname,
    fileHash: fileHash,
    binaryHash: fileHash,
    qrData: analysis.qrData || '',
    ocrText: analysis.ocrText || '',
    textFingerprint: analysis.textFingerprint || textFingerprint(analysis.ocrText || ''),
    imageHash: analysis.imageHash,
    duplicateOf: duplicate?._id,
    status: finalStatus,
    // legacy analysis field
    analysis,
    // structured extracted certificate data if provided by AI service
    extractedCertificateData: analysis.extractedCertificateData || {
      ocrBlocks: analysis.ocrBlocks || null,
      textCoordinates: analysis.textCoordinates || null,
      qrData: analysis.qrData ? [analysis.qrData] : (analysis.qrRegions || null),
      logoRegions: analysis.logoRegions || null,
      signatureRegions: analysis.signatureRegions || null,
      colorProfiles: analysis.colorProfiles || null,
      fontMetadata: analysis.fontMetadata || null,
      spacingPatterns: analysis.spacingPatterns || null,
      layoutVectors: analysis.layoutVectors || null,
      imageHashes: analysis.imageHashes ? analysis.imageHashes : (analysis.imageHash ? [analysis.imageHash] : []),
      securityMarkers: analysis.securityMarkers || null,
      visualFingerprint: analysis.visualFingerprint || null
    },
    verificationArtifacts: {
      qrVerified: Boolean(analysis.qrData && analysis.qrVerification?.verified),
      qrVerificationUrl: analysis.qrVerification?.url || (typeof analysis.qrData === 'string' && /^https?:\/\//i.test(analysis.qrData) ? analysis.qrData : ''),
      blockchainAnchorHash: fileHash,
      blockchainNetwork: process.env.BLOCKCHAIN_NETWORK || '',
      blockchainStatus: process.env.BLOCKCHAIN_ANCHORING_ENABLED === 'true' ? 'PENDING' : 'NOT_CONFIGURED'
    },
    // comprehensive AI analysis mapping
    aiAnalysis: {
      authenticityScore: analysis.authenticityScore || null,
      fraudProbability: analysis.fraudProbability ?? null,
      confidenceLevel: analysis.confidence || analysis.confidenceLevel || null,
      matchedRegions: analysis.matchedRegions || null,
      mismatchedRegions: analysis.mismatchedRegions || analysis.mismatches || null,
      missingElements: analysis.missingElements || null,
      duplicateProbability: analysis.duplicateProbability ?? (duplicate ? 100 : 0),
      suspiciousAreas: analysis.suspiciousAreas || analysis.suspiciousIndicators || null,
      aiReasoning: analysis.aiReasoning || analysis.explanations || null,
      verificationStatus: finalStatus
    }
  });

  const populated = await certificate.populate(['student', 'certification', 'organization']);
  res.status(201).json({ certificate: populated });
});

export const listMyCertificates = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  if (isDemoMode()) {
    const items = await demoStore.listCertificatesForStudent(userId);
    res.json({ items });
    return;
  }

  const items = await Certificate.find({
    $or: [{ student: userId }, { studentId: userId }, { userId }, { uploadedBy: userId }]
  })
    .populate(['certification', 'organization'])
    .sort({ createdAt: -1 });
  res.json({ items });
});

/**
 * Get student dashboard stats - REAL DATA from database
 * - Total certificates
 * - Accepted/Rejected counts
 * - Average fraud probability
 * - Readiness calculation
 */
export const getStudentDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;

  if (isDemoMode()) {
    const certs = await demoStore.listCertificatesForStudent(userId);
    const verified = certs.filter(c => c.status === 'VERIFIED').length;
    const rejected = certs.filter(c => c.status === 'REJECTED').length;
    const avgFraud = certs.length
      ? Math.round(certs.reduce((sum, c) => sum + (c.analysis?.fraudProbability || 0), 0) / certs.length)
      : 0;

    const readiness = certs.length === 0 ? 0 : Math.round((verified / certs.length) * 100);
    const uploadTrend = certs.slice(0, 5).reverse().map(c => ({
      month: new Date(c.createdAt).toLocaleString('en-US', { month: 'short' }),
      count: 1
    }));

    res.json({
      totalCertificates: certs.length,
      acceptedCount: verified,
      rejectedCount: rejected,
      averageFraud: avgFraud,
      readiness,
      uploadTrend,
      certificationTypes: {}
    });
    return;
  }

  const certs = await Certificate.find({
    $or: [{ student: userId }, { studentId: userId }, { userId }, { uploadedBy: userId }]
  }).populate('certification');

  const verified = certs.filter(c => c.status === 'VERIFIED').length;
  const rejected = certs.filter(c => c.status === 'REJECTED').length;
  const avgFraud = certs.length
    ? Math.round(certs.reduce((sum, c) => sum + (c.analysis?.fraudProbability || 0), 0) / certs.length)
    : 0;

  // Readiness: percentage of verified vs total (real calculation)
  const readiness = certs.length === 0 ? 0 : Math.round((verified / certs.length) * 100);

  // Group by certification type
  const certsByType = {};
  certs.forEach(c => {
    const type = c.certification?.name || 'Unknown';
    if (!certsByType[type]) {
      certsByType[type] = { total: 0, accepted: 0, rejected: 0 };
    }
    certsByType[type].total += 1;
    if (c.status === 'VERIFIED') certsByType[type].accepted += 1;
    if (c.status === 'REJECTED') certsByType[type].rejected += 1;
  });

  // Upload trend - last 5 months
  const monthBuckets = {};
  certs.forEach(c => {
    const date = c.createdAt ? new Date(c.createdAt) : new Date();
    const monthKey = date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    monthBuckets[monthKey] = (monthBuckets[monthKey] || 0) + 1;
  });

  const uploadTrend = Object.entries(monthBuckets).map(([month, count]) => ({
    month,
    count
  }));

  console.log(`[dashboard-stats] Student ${userId}: ${certs.length} total, ${verified} verified, readiness=${readiness}%`);

  res.json({
    totalCertificates: certs.length,
    acceptedCount: verified,
    rejectedCount: rejected,
    averageFraud: avgFraud,
    readiness,
    uploadTrend,
    certificationTypes: certsByType
  });
});
