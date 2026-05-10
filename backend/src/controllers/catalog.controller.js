import slugify from 'slugify';
import { isDemoMode } from '../config/db.js';
import Certificate from '../models/Certificate.js';
import Certification from '../models/Certification.js';
import Organization from '../models/Organization.js';
import TemplateProfile from '../models/TemplateProfile.js';
import { demoStore } from '../services/dataAdapter.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CATEGORIES, DIFFICULTY_LEVELS, normalizeSkills, parsePagination, regexSearch, TEMPLATE_STATUSES, VERIFICATION_TYPES } from '../utils/catalog.js';

const buildCertificationQuery = async (queryParams) => {
  const query = { active: true };

  if (queryParams.category) query.category = queryParams.category;
  if (queryParams.difficultyLevel) query.difficultyLevel = queryParams.difficultyLevel;
  if (queryParams.verificationType) query.verificationType = queryParams.verificationType;
  if (queryParams.templateStatus) query.templateStatus = queryParams.templateStatus;

  if (queryParams.organization) {
    const orgSearch = [{ slug: queryParams.organization }];
    if (queryParams.organization.match(/^[a-f\d]{24}$/i)) orgSearch.push({ _id: queryParams.organization });
    const organization = await Organization.findOne({ $or: orgSearch });
    query.organization = organization?._id || null;
  }

  if (queryParams.search) {
    const search = regexSearch(queryParams.search.toString());
    const matchingOrganizations = await Organization.find({ name: search }).select('_id');
    query.$or = [
      { name: search },
      { description: search },
      { skills: search },
      { category: search },
      { organization: { $in: matchingOrganizations.map((org) => org._id) } }
    ];
  }

  return query;
};

const decorateCertifications = async (certifications) => {
  const ids = certifications.map((cert) => cert._id);
  const templateProfiles = await TemplateProfile.find({ certification: { $in: ids }, status: 'ACTIVE' }).select('certification status updatedAt');
  const templateSet = new Set(templateProfiles.map((template) => template.certification.toString()));
  const uploadCounts = await Certificate.aggregate([
    { $match: { certification: { $in: ids } } },
    { $group: { _id: '$certification', count: { $sum: 1 } } }
  ]);
  const uploadMap = new Map(uploadCounts.map((item) => [item._id.toString(), item.count]));

  return certifications.map((cert) => {
    const plain = cert.toJSON();
    const templateReady = templateSet.has(cert._id.toString()) || cert.templateStatus === 'ACTIVE';
    return {
      ...plain,
      organizationName: plain.organization?.name || '',
      certificateName: plain.name,
      logo: plain.logoUrl || plain.organization?.logoUrl || '',
      templateReady,
      templateStatus: templateReady ? 'ACTIVE' : plain.templateStatus,
      uploadCount: uploadMap.get(cert._id.toString()) || 0
    };
  });
};

export const listCatalog = asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    const result = await demoStore.listCatalog(req.query);
    res.json(result);
    return;
  }

  const { page, limit, skip } = parsePagination(req.query);
  const query = await buildCertificationQuery(req.query);
  const [items, total] = await Promise.all([
    Certification.find(query).populate('organization').sort({ name: 1 }).skip(skip).limit(limit),
    Certification.countDocuments(query)
  ]);

  res.json({
    items: await decorateCertifications(items),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
  });
});

export const getCertification = asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    const certification = await demoStore.findCertification(req.params.id);
    if (!certification) throw new ApiError(404, 'Certification not found');
    res.json({ certification });
    return;
  }

  const certSearch = [{ slug: req.params.id }];
  if (req.params.id.match(/^[a-f\d]{24}$/i)) certSearch.push({ _id: req.params.id });
  const certification = await Certification.findOne({ active: true, $or: certSearch }).populate('organization');

  if (!certification) throw new ApiError(404, 'Certification not found');
  const [decorated] = await decorateCertifications([certification]);
  res.json({ certification: decorated });
});

export const listOrganizations = asyncHandler(async (req, res) => {
  const includeStats = req.query.includeStats === 'true';

  if (isDemoMode()) {
    const items = await demoStore.listOrganizations(includeStats);
    res.json({ items });
    return;
  }

  const organizations = await Organization.find({ active: true }).sort({ name: 1 });

  if (!includeStats) {
    res.json({ items: organizations });
    return;
  }

  const orgIds = organizations.map((org) => org._id);
  const [certCounts, uploadCounts, templateCounts] = await Promise.all([
    Certification.aggregate([{ $match: { organization: { $in: orgIds }, active: true } }, { $group: { _id: '$organization', count: { $sum: 1 } } }]),
    Certificate.aggregate([{ $match: { organization: { $in: orgIds } } }, { $group: { _id: '$organization', count: { $sum: 1 } } }]),
    TemplateProfile.aggregate([{ $match: { organization: { $in: orgIds }, status: 'ACTIVE' } }, { $group: { _id: '$organization', count: { $sum: 1 } } }])
  ]);

  const toMap = (records) => new Map(records.map((item) => [item._id.toString(), item.count]));
  const certMap = toMap(certCounts);
  const uploadMap = toMap(uploadCounts);
  const templateMap = toMap(templateCounts);

  res.json({
    items: organizations.map((org) => ({
      ...org.toJSON(),
      certificationCount: certMap.get(org._id.toString()) || 0,
      uploadCount: uploadMap.get(org._id.toString()) || 0,
      trainedTemplates: templateMap.get(org._id.toString()) || 0
    }))
  });
});

export const catalogFacets = asyncHandler(async (_req, res) => {
  if (isDemoMode()) {
    const f = await demoStore.facets();
    res.json(f);
    return;
  }

  const [organizations, categories, difficultyLevels, verificationTypes, templateStatuses, skills] = await Promise.all([
    Organization.find({ active: true }).sort({ name: 1 }),
    Certification.distinct('category', { active: true }),
    Certification.distinct('difficultyLevel', { active: true }),
    Certification.distinct('verificationType', { active: true }),
    Certification.distinct('templateStatus', { active: true }),
    Certification.distinct('skills', { active: true })
  ]);

  res.json({
    organizations,
    categories: categories.length ? categories : CATEGORIES,
    difficultyLevels: difficultyLevels.length ? difficultyLevels : DIFFICULTY_LEVELS,
    verificationTypes: verificationTypes.length ? verificationTypes : VERIFICATION_TYPES,
    templateStatuses: templateStatuses.length ? templateStatuses : TEMPLATE_STATUSES,
    skills: skills.sort()
  });
});

export const createOrganization = asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    const organization = await demoStore.createOrganization(req.body);
    if (!organization) throw new ApiError(409, 'Organization already exists');
    res.status(201).json({ organization });
    return;
  }

  const slug = slugify(req.body.name, { lower: true, strict: true });
  const existing = await Organization.findOne({ slug });
  if (existing) throw new ApiError(409, 'Organization already exists');

  const organization = await Organization.create({
    createdBy: req.user.id || req.user._id,
    name: req.body.name,
    slug,
    description: req.body.description,
    category: req.body.category,
    website: req.body.website,
    logoUrl: req.body.logoUrl,
    brandColor: req.body.brandColor,
    riskWeight: req.body.riskWeight
  });

  res.status(201).json({ organization });
});

export const updateOrganization = asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    const organization = await demoStore.updateOrganization(req.params.id, req.body);
    if (!organization) throw new ApiError(404, 'Organization not found');
    res.json({ organization });
    return;
  }

  const patch = { ...req.body };
  if (patch.name) patch.slug = slugify(patch.name, { lower: true, strict: true });
  patch.updatedBy = req.user.id || req.user._id;
  const organization = await Organization.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
  if (!organization) throw new ApiError(404, 'Organization not found');
  res.json({ organization });
});

export const deleteOrganization = asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    const organization = await demoStore.deleteOrganization(req.params.id);
    if (!organization) throw new ApiError(404, 'Organization not found');
    res.json({ organization });
    return;
  }

  const organization = await Organization.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!organization) throw new ApiError(404, 'Organization not found');
  await Certification.updateMany({ organization: organization._id }, { active: false });
  res.json({ organization });
});

export const createCertification = asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    const certification = await demoStore.createCertification(req.body);
    if (!certification) throw new ApiError(404, 'Organization not found');
    res.status(201).json({ certification });
    return;
  }

  const organization = await Organization.findById(req.body.organizationId);
  if (!organization) throw new ApiError(404, 'Organization not found');

  const name = req.body.certificateName || req.body.name;
  const certification = await Certification.create({
    createdBy: req.user.id || req.user._id,
    organization: organization._id,
    name,
    slug: slugify(name, { lower: true, strict: true }),
    description: req.body.description,
    level: req.body.level,
    difficultyLevel: req.body.difficultyLevel,
    category: req.body.category || organization.category,
    verificationType: req.body.verificationType,
    logoUrl: req.body.logoUrl,
    skills: normalizeSkills(req.body.skills),
    templateStatus: req.body.templateStatus
  });

  const populated = await certification.populate('organization');
  const [decorated] = await decorateCertifications([populated]);
  res.status(201).json({ certification: decorated });
});

export const updateCertification = asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    const certification = await demoStore.updateCertification(req.params.id, req.body);
    if (!certification) throw new ApiError(404, 'Certification not found');
    res.json({ certification });
    return;
  }

  const patch = { ...req.body };
  if (patch.certificateName) {
    patch.name = patch.certificateName;
    patch.slug = slugify(patch.certificateName, { lower: true, strict: true });
    delete patch.certificateName;
  }
  if (patch.skills !== undefined) patch.skills = normalizeSkills(patch.skills);
  if (patch.organizationId) {
    patch.organization = patch.organizationId;
    delete patch.organizationId;
  }
  patch.updatedBy = req.user.id || req.user._id;

  const certification = await Certification.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true }).populate('organization');
  if (!certification) throw new ApiError(404, 'Certification not found');
  const [decorated] = await decorateCertifications([certification]);
  res.json({ certification: decorated });
});

export const deleteCertification = asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    const certification = await demoStore.deleteCertification(req.params.id);
    if (!certification) throw new ApiError(404, 'Certification not found');
    res.json({ certification });
    return;
  }

  const certification = await Certification.findByIdAndUpdate(req.params.id, { active: false, templateStatus: 'RETIRED' }, { new: true }).populate('organization');
  if (!certification) throw new ApiError(404, 'Certification not found');
  const [decorated] = await decorateCertifications([certification]);
  res.json({ certification: decorated });
});
