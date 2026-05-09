import { isDemoMode } from '../config/db.js';
import Certification from '../models/Certification.js';
import Organization from '../models/Organization.js';
import TemplateProfile from '../models/TemplateProfile.js';
import { demoStore } from '../services/demoStore.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listCatalog = asyncHandler(async (req, res) => {
  const search = (req.query.search || '').toString();

  if (isDemoMode()) {
    const items = demoStore.listCatalog(search).map((cert) => ({
      ...cert,
      templateReady: Boolean(demoStore.findTemplateByCertification(cert._id))
    }));
    res.json({ items });
    return;
  }

  const query = search
    ? {
        active: true,
        name: { $regex: search, $options: 'i' }
      }
    : { active: true };

  const certifications = await Certification.find(query).populate('organization').sort({ name: 1 });
  const templateCounts = await TemplateProfile.find({
    certification: { $in: certifications.map((cert) => cert._id) },
    status: 'ACTIVE'
  }).select('certification');
  const readySet = new Set(templateCounts.map((item) => item.certification.toString()));

  res.json({
    items: certifications.map((cert) => ({
      ...cert.toJSON(),
      templateReady: readySet.has(cert._id.toString())
    }))
  });
});

export const listOrganizations = asyncHandler(async (_req, res) => {
  if (isDemoMode()) {
    res.json({ items: demoStore.listOrganizations() });
    return;
  }

  const items = await Organization.find({ active: true }).sort({ name: 1 });
  res.json({ items });
});

