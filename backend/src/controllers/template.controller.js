import slugify from 'slugify';
import { isDemoMode } from '../config/db.js';
import Certification from '../models/Certification.js';
import Organization from '../models/Organization.js';
import TemplateProfile from '../models/TemplateProfile.js';
import { demoStore } from '../services/dataAdapter.js';
import { extractTemplateProfileWithAi } from '../services/ai.service.js';
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

  console.log('[templates.train] Request received');
  console.log('[templates.train] Body:', req.body);
  console.log('[templates.train] Files:', req.files?.length || 0, 'file(s)');

  if (!certificationId) throw new ApiError(400, 'Certification ID is required');
  if (!req.files?.length) {
    console.error('[templates.train] No files in req.files');
    throw new ApiError(400, 'Reference certificate samples are required');
  }

  const profile = await extractTemplateProfileWithAi({ files: req.files, certificationId });
  console.log('[templates.train] Extracted template profile:', JSON.stringify(profile.extractedProfile, null, 2));
  console.log('[templates.train] Learned thresholds:', JSON.stringify(profile.thresholds, null, 2));

  if (isDemoMode()) {
    const template = await demoStore.upsertTemplate(
      certificationId,
      profile,
      req.user._id,
      req.files.map((file) => ({ originalName: file.originalname, fileUrl: `/uploads/${file.filename}` }))
    );
    if (!template) throw new ApiError(404, 'Certification not found');
    res.status(201).json({ template, qualityWarning: req.files.length < 5 ? 'Use 5-10 genuine samples for production-ready profiles' : null });
    return;
  }

  const certification = await Certification.findById(certificationId).populate('organization');
  if (!certification) throw new ApiError(404, 'Certification not found');

  const current = await TemplateProfile.findOne({ certification: certification._id }).sort({ version: -1 });
  const userId = req.user.id || req.user._id;
  const template = await TemplateProfile.create({
    userId,
    studentId: userId,
    mentorId: userId,
    uploadedBy: userId,
    certification: certification._id,
    organization: certification.organization._id,
    createdBy: userId,
    version: (current?.version || 0) + 1,
    status: 'ACTIVE',
    samples: req.files.map((file) => ({ originalName: file.originalname, fileUrl: `/uploads/${file.filename}` })),
    // persist the real learned structure for downstream verification
    extractedProfile: profile.extractedProfile,
    extractedTemplateData: profile.extractedTemplateData || profile.extractedProfile || {},
    learnedProfile: profile.extractedProfile,
    thresholds: profile.thresholds,
    trainedSamplesCount: (profile?.trainedSamplesCount) || req.files.length,
    trainedBy: userId
  });

  await TemplateProfile.updateMany({ certification: certification._id, _id: { $ne: template._id } }, { status: 'RETIRED' });
  const populated = await template.populate(['certification', 'organization']);
  await Certification.findByIdAndUpdate(certification._id, { templateStatus: 'ACTIVE' });
  res.status(201).json({ template: populated, qualityWarning: req.files.length < 5 ? 'Use 5-10 genuine samples for production-ready profiles' : null });
});
