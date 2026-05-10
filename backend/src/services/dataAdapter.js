import { isDemoMode } from '../config/db.js';
import { demoStore as inMemoryStore } from './demoStore.js';
import User from '../models/User.js';
import Certificate from '../models/Certificate.js';
import Certification from '../models/Certification.js';
import TemplateProfile from '../models/TemplateProfile.js';
import Organization from '../models/Organization.js';

const expose = (doc) => {
  if (!doc) return null;
  if (typeof doc.toJSON === 'function') return doc.toJSON();
  return doc;
};

const demoProxy = (fnName) => async (...args) => inMemoryStore[fnName](...args);

// Helper to decide at call-time whether to use demo store or DB-backed implementation
const useDemo = () => isDemoMode();

// Runtime wrappers that decide whether to call the in-memory demo store or the DB-backed implementation.
export const findUserById = async (userId) => {
  if (useDemo()) return inMemoryStore.findUserById(userId);
  const user = await User.findById(userId).select('-password');
  return expose(user);
};

export const findUserByEmail = async (email) => {
  if (useDemo()) return inMemoryStore.findUserByEmail(email);
  const user = await User.findOne({ email: email.toLowerCase() }).select('-password');
  return expose(user);
};

export const createStudent = async (payload) => {
  if (useDemo()) return inMemoryStore.createStudent(payload);
  const user = await User.create({
    name: payload.name,
    email: payload.email.toLowerCase(),
    password: payload.password,
    role: 'STUDENT',
    department: payload.department || '',
    rollNumber: payload.rollNumber || '',
    graduationYear: payload.graduationYear || null
  });
  return expose(user);
};

export const findCertification = async (idOrSlug) => {
  if (useDemo()) return inMemoryStore.findCertification(idOrSlug);
  const search = [{ slug: idOrSlug }];
  if (idOrSlug.match(/^[a-f\d]{24}$/i)) search.push({ _id: idOrSlug });
  const cert = await Certification.findOne({ $or: search, active: true }).populate('organization');
  return expose(cert);
};

export const findTemplateByCertification = async (certificationId) => {
  if (useDemo()) return inMemoryStore.findTemplateByCertification(certificationId);
  const template = await TemplateProfile.findOne({ certification: certificationId, status: 'ACTIVE' }).lean();
  return template;
};

export const addCertificate = async (payload) => {
  if (useDemo()) return inMemoryStore.addCertificate(payload);
  const cert = await Certificate.create(payload);
  return expose(cert);
};

export const listCertificatesForStudent = async (studentId) => {
  if (useDemo()) return inMemoryStore.listCertificatesForStudent(studentId);
  const items = await Certificate.find({ student: studentId }).populate(['certification', 'organization']).sort({ createdAt: -1 });
  return items.map(expose);
};

export const decorateCertificate = async (certificate) => {
  if (useDemo()) return inMemoryStore.decorateCertificate(certificate);
  const populated = await Certificate.findById(certificate._id).populate(['student', 'certification', 'organization']);
  return expose(populated);
};

export const listTemplates = async () => {
  if (useDemo()) return inMemoryStore.listTemplates();
  const items = await TemplateProfile.find().populate(['certification', 'organization']).sort({ updatedAt: -1 });
  return items.map(expose);
};

export const createOrganization = async (payload) => {
  if (useDemo()) return inMemoryStore.createOrganization(payload);
  const slug = payload.name && payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const existing = await Organization.findOne({ slug });
  if (existing) return null;
  const org = await Organization.create({ ...payload, slug });
  return expose(org);
};

export const createCertification = async (payload) => {
  if (useDemo()) return inMemoryStore.createCertification(payload);
  const organization = await Organization.findById(payload.organizationId || payload.organization);
  if (!organization) return null;
  const cert = await Certification.create({
    organization: organization._id,
    name: payload.certificateName || payload.name,
    slug: (payload.certificateName || payload.name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: payload.description || '',
    level: payload.level || 'ASSOCIATE',
    difficultyLevel: payload.difficultyLevel || 'INTERMEDIATE',
    category: payload.category || organization.category || 'OTHER',
    verificationType: payload.verificationType || 'HYBRID_AI',
    logoUrl: payload.logoUrl || '',
    skills: payload.skills || [],
    active: payload.active !== false,
    templateStatus: payload.templateStatus || 'NOT_TRAINED'
  });
  return await cert.populate('organization');
};

export const upsertTemplate = async (certificationId, profile, mentorId, samples = []) => {
  if (useDemo()) return inMemoryStore.upsertTemplate(certificationId, profile, mentorId, samples);
  const certification = await Certification.findById(certificationId);
  if (!certification) return null;
  await Certification.findByIdAndUpdate(certification._id, { templateStatus: 'ACTIVE' });
  const current = await TemplateProfile.findOne({ certification: certification._id }).sort({ version: -1 });
  const template = await TemplateProfile.create({
    certification: certification._id,
    organization: certification.organization,
    createdBy: mentorId,
    version: (current?.version || 0) + 1,
    status: 'ACTIVE',
    samples,
    thresholds: profile.thresholds,
    extractedProfile: profile.extractedProfile || profile
  });
  await TemplateProfile.updateMany({ certification: certification._id, _id: { $ne: template._id } }, { status: 'RETIRED' });
  return await template.populate(['certification', 'organization']);
};

export const listOrganizations = async (includeStats = false) => {
  if (useDemo()) return inMemoryStore.listOrganizations(includeStats);
  const orgs = await Organization.find({ active: true }).sort({ name: 1 });
  if (!includeStats) return orgs.map(expose);
  const orgIds = orgs.map((o) => o._id);
  const certCounts = await Certification.aggregate([{ $match: { organization: { $in: orgIds }, active: true } }, { $group: { _id: '$organization', count: { $sum: 1 } } }]);
  const uploadCounts = await Certificate.aggregate([{ $match: { organization: { $in: orgIds } } }, { $group: { _id: '$organization', count: { $sum: 1 } } }]);
  const templateCounts = await TemplateProfile.aggregate([{ $match: { organization: { $in: orgIds }, status: 'ACTIVE' } }, { $group: { _id: '$organization', count: { $sum: 1 } } }]);
  const toMap = (arr) => new Map(arr.map((i) => [i._id.toString(), i.count]));
  const certMap = toMap(certCounts);
  const uploadMap = toMap(uploadCounts);
  const templateMap = toMap(templateCounts);
  return orgs.map((org) => ({ ...expose(org), certificationCount: certMap.get(org._id.toString()) || 0, uploadCount: uploadMap.get(org._id.toString()) || 0, trainedTemplates: templateMap.get(org._id.toString()) || 0 }));
};

export const listCatalog = async (params) => (useDemo() ? inMemoryStore.listCatalog(params) : demoProxy('listCatalog')(params));
export const facets = async () => (useDemo() ? inMemoryStore.facets() : demoProxy('facets')());
export const updateOrganization = async (id, payload) => (useDemo() ? inMemoryStore.updateOrganization(id, payload) : demoProxy('updateOrganization')(id, payload));
export const deleteOrganization = async (id) => (useDemo() ? inMemoryStore.deleteOrganization(id) : demoProxy('deleteOrganization')(id));

export const demoStore = {
  findUserById,
  findUserByEmail,
  createStudent,
  findCertification,
  findTemplateByCertification,
  addCertificate,
  listCertificatesForStudent,
  decorateCertificate,
  listTemplates,
  createOrganization,
  createCertification,
  upsertTemplate,
  listOrganizations,
  listCatalog,
  facets,
  updateOrganization,
  deleteOrganization,
  // keep a reference to the original in-memory store for any direct usage
  _inMemory: inMemoryStore
};

export default demoStore;
