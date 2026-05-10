import { isDemoMode } from '../config/db.js';
import Certificate from '../models/Certificate.js';
import Certification from '../models/Certification.js';
import TemplateProfile from '../models/TemplateProfile.js';
import { analyzeCertificateWithAi } from '../services/ai.service.js';
import { demoStore } from '../services/dataAdapter.js';
import { detectDuplicateCertificate } from '../services/duplicate.service.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { textFingerprint } from '../utils/text.js';

const statusFromAnalysis = (analysis, duplicate) => {
  if (duplicate) return 'REJECTED';
  if (analysis?.verificationStatus === 'VERIFIED' || (analysis.fraudProbability || 0) <= 5) return 'VERIFIED';
  if ((analysis.fraudProbability || 0) >= 65) return 'REVIEW_REQUIRED';
  return 'PENDING';
};

export const uploadCertificate = asyncHandler(async (req, res) => {
  const { certificationId, certificateId, issueDate } = req.body;

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
      organizationName: certification.organization.name,
      templateProfile: template
    });

    const duplicate = await detectDuplicateCertificate({
      analysis,
      certificateId,
      organizationId: certification.organization._id,
      issueDate
    });

    const record = await demoStore.addCertificate({
      student: req.user._id,
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

  const analysis = await analyzeCertificateWithAi({
    filePath: req.file.path,
    studentName: req.user.name,
    certificateId,
    issueDate,
    organizationName: certification.organization.name,
    templateProfile: {
      certificationId: certification._id.toString(),
      thresholds: template.thresholds,
      metadata: template.metadata,
      extractedProfile: learnedTemplateProfile,
      ...learnedTemplateProfile
    }
  });

  const duplicate = await detectDuplicateCertificate({
    analysis,
    certificateId,
    organizationId: certification.organization._id,
    issueDate
  });

  const certificate = await Certificate.create({
    student: req.user._id,
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
    // comprehensive AI analysis mapping
    aiAnalysis: {
      authenticityScore: analysis.authenticityScore || null,
      fraudProbability: analysis.fraudProbability || analysis.fraudProbability || null,
      confidenceLevel: analysis.confidence || analysis.confidenceLevel || null,
      matchedRegions: analysis.matchedRegions || null,
      mismatchedRegions: analysis.mismatchedRegions || analysis.mismatches || null,
      missingElements: analysis.missingElements || null,
      duplicateProbability: analysis.duplicateProbability || (duplicate ? 1 : 0),
      suspiciousAreas: analysis.suspiciousAreas || analysis.suspiciousIndicators || null,
      aiReasoning: analysis.aiReasoning || analysis.explanations || null,
      verificationStatus: analysis.verificationStatus || (analysis.fraudProbability >= 80 ? 'POSSIBLE_FORGERY' : (analysis.fraudProbability >= 65 ? 'SUSPICIOUS' : 'VERIFIED'))
    }
  });

  const populated = await certificate.populate(['student', 'certification', 'organization']);
  res.status(201).json({ certificate: populated });
});

export const listMyCertificates = asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    const items = await demoStore.listCertificatesForStudent(req.user._id);
    res.json({ items });
    return;
  }

  const items = await Certificate.find({ student: req.user._id })
    .populate(['certification', 'organization'])
    .sort({ createdAt: -1 });
  res.json({ items });
});

