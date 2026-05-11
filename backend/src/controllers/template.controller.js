import slugify from 'slugify';
import { isDemoMode } from '../config/db.js';
import Certification from '../models/Certification.js';
import Organization from '../models/Organization.js';
import TemplateProfile from '../models/TemplateProfile.js';
import { demoStore } from '../services/dataAdapter.js';
import { extractTemplateProfileWithAi } from '../services/ai.service.js';
import { generateFallbackTemplate } from '../services/fallbackTemplate.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listTemplates = asyncHandler(async (_req, res) => {
  if (isDemoMode()) {
    const items = await demoStore.listTemplates();
    res.json({ items });
    return;
  }

  const items = await TemplateProfile.find().populate(['certification', 'organization']).sort({ updatedAt: -1 });
  res.json({ items });
});

export const createCertification = asyncHandler(async (req, res) => {
  const { organizationName, certificationName, level, skills = [] } = req.body;
  if (!organizationName || !certificationName) {
    throw new ApiError(400, 'Organization and certification names are required');
  }

  if (isDemoMode()) {
    const organization = await demoStore.createOrganization({ name: organizationName });
    const orgs = await demoStore.listOrganizations();
    const existingOrganization = organization || orgs.find((org) => org.slug === slugify(organizationName, { lower: true, strict: true }));
    const certification = await demoStore.createCertification({
      organizationId: existingOrganization?._id || existingOrganization?.id,
      certificateName: certificationName,
      level,
      skills
    });
    if (!certification) throw new ApiError(404, 'Organization not found');
    res.status(201).json({ certification });
    return;
  }

  const organizationSlug = slugify(organizationName, { lower: true, strict: true });
  const organization = await Organization.findOneAndUpdate(
    { slug: organizationSlug },
    { name: organizationName, slug: organizationSlug, active: true },
    { upsert: true, new: true }
  );

  const certificationSlug = slugify(certificationName, { lower: true, strict: true });
  const certification = await Certification.findOneAndUpdate(
    { organization: organization._id, slug: certificationSlug },
    {
      organization: organization._id,
      name: certificationName,
      slug: certificationSlug,
      level,
      skills,
      active: true
    },
    { upsert: true, new: true }
  ).populate('organization');

  res.status(201).json({ certification });
});

export const trainTemplate = asyncHandler(async (req, res) => {
  const { certificationId } = req.body;

  console.log('[templates.train] ====== TRAIN TEMPLATE REQUEST ======');
  console.log('[templates.train] Body:', req.body);
  console.log('[templates.train] Incoming certificationId:', certificationId);
  console.log('[templates.train] Files received:', req.files?.length || 0, 'file(s)');
  if (req.files) {
    console.log('[templates.train] File names:', req.files.map(f => f.originalname));
  }

  if (!certificationId) {
    console.error('[templates.train] ERROR: Missing certificationId');
    throw new ApiError(400, 'Certification ID is required');
  }

  if (!req.files?.length) {
    console.error('[templates.train] ERROR: No files in req.files');
    throw new ApiError(400, 'Reference certificate samples are required (minimum 1 file)');
  }

  // Validate certificationId is a valid MongoDB ObjectId
  if (!certificationId.match(/^[0-9a-f]{24}$/i)) {
    console.error('[templates.train] ERROR: Invalid certificationId format:', certificationId);
    throw new ApiError(400, 'Invalid certification ID format');
  }

  // Check if certification exists
  const certification = await Certification.findById(certificationId).populate('organization');
  console.log('[templates.train] Certification lookup result:', certification ? 'FOUND' : 'NOT_FOUND');
  if (certification) {
    console.log('[templates.train] Certification name:', certification.name);
    console.log('[templates.train] Organization:', certification.organization?.name);
  }

  if (!certification) {
    console.error('[templates.train] ERROR: Certification not found for ID:', certificationId);
    throw new ApiError(404, `Certification not found (ID: ${certificationId})`);
  }

  // Extract template profile from AI service
  console.log('[templates.train] Calling AI service for template extraction...');
  let profile;
  let usedFallback = false;
  
  try {
    profile = await extractTemplateProfileWithAi({ files: req.files, certificationId });
    console.log('[templates.train] AI extraction successful');
    console.log('[templates.train] Extracted profile keys:', Object.keys(profile.extractedProfile || {}));
    console.log('[templates.train] Thresholds:', profile.thresholds);
  } catch (aiError) {
    console.warn('[templates.train] WARNING: AI extraction failed:', aiError.message);
    console.log('[templates.train] Using fallback template generator...');
    
    // Generate fallback template for system stability
    profile = generateFallbackTemplate(certificationId, certification, req.files.length);
    usedFallback = true;
    console.log('[templates.train] Fallback template generated successfully');
    console.log('[templates.train] Note: This is a development fallback. Use real AI analysis in production.');
  }

  if (isDemoMode()) {
    console.log('[templates.train] Operating in DEMO mode');
    const template = await demoStore.upsertTemplate(
      certificationId,
      profile,
      req.user._id,
      req.files.map((file) => ({ originalName: file.originalname, fileUrl: `/uploads/${file.filename}` }))
    );
    if (!template) {
      console.error('[templates.train] ERROR: Demo mode template creation failed');
      throw new ApiError(404, 'Certification not found');
    }
    console.log('[templates.train] SUCCESS: Demo template created');
    res.status(201).json({
      template,
      qualityWarning: req.files.length < 5 ? 'Use 5-10 genuine samples for production-ready profiles' : null
    });
    return;
  }

  // Production mode: Create or update TemplateProfile document
  console.log('[templates.train] Creating TemplateProfile document...');
  const current = await TemplateProfile.findOne({ certification: certification._id }).sort({ version: -1 });
  const newVersion = (current?.version || 0) + 1;
  console.log('[templates.train] Current version:', current?.version || 0, '-> New version:', newVersion);

  const userId = req.user.id || req.user._id;
  const template = await TemplateProfile.create({
    userId,
    studentId: userId,
    mentorId: userId,
    uploadedBy: userId,
    certification: certification._id,
    organization: certification.organization._id,
    createdBy: userId,
    version: newVersion,
    status: 'ACTIVE',
    samples: req.files.map((file) => ({ originalName: file.originalname, fileUrl: `/uploads/${file.filename}` })),
    // Persist the real learned structure for downstream verification
    extractedProfile: profile.extractedProfile,
    extractedTemplateData: profile.extractedTemplateData || profile.extractedProfile || {},
    learnedProfile: profile.extractedProfile,
    thresholds: profile.thresholds,
    trainedSamplesCount: profile?.trainedSamplesCount || req.files.length,
    trainedBy: userId
  });

  console.log('[templates.train] TemplateProfile created:', template._id);

  // Retire previous versions
  const retired = await TemplateProfile.updateMany(
    { certification: certification._id, _id: { $ne: template._id } },
    { status: 'RETIRED' }
  );
  console.log('[templates.train] Retired', retired.modifiedCount, 'previous template version(s)');

  // Update certification templateStatus
  const updatedCert = await Certification.findByIdAndUpdate(
    certification._id,
    { templateStatus: 'ACTIVE' },
    { new: true }
  );
  console.log('[templates.train] Certification templateStatus updated to:', updatedCert.templateStatus);

  // Populate and return
  const populated = await template.populate(['certification', 'organization']);
  console.log('[templates.train] ====== TEMPLATE TRAINING COMPLETE ======');
  res.status(201).json({
    template: populated,
    usedFallback: usedFallback,
    fallbackNote: usedFallback ? 'Template generated via fallback (AI service unavailable). Recommend testing with real AI analysis.' : null,
    qualityWarning: req.files.length < 5 ? 'Use 5-10 genuine samples for production-ready profiles' : null
  });
});
