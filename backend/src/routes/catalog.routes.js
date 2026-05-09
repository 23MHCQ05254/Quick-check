import { Router } from 'express';
import {
  catalogFacets,
  createCertification,
  createOrganization,
  deleteCertification,
  deleteOrganization,
  getCertification,
  listCatalog,
  listOrganizations,
  updateCertification,
  updateOrganization
} from '../controllers/catalog.controller.js';
import { protect, requireRole } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { CATEGORIES, DIFFICULTY_LEVELS, TEMPLATE_STATUSES, VERIFICATION_TYPES } from '../utils/catalog.js';

const router = Router();

const organizationSchema = {
  name: { required: true, maxLength: 120 },
  description: { maxLength: 800 },
  category: { enum: CATEGORIES }
};

const certificationSchema = {
  organizationId: { required: true },
  certificateName: { required: true, maxLength: 180 },
  description: { maxLength: 1200 },
  difficultyLevel: { enum: DIFFICULTY_LEVELS },
  category: { enum: CATEGORIES },
  verificationType: { enum: VERIFICATION_TYPES },
  templateStatus: { enum: TEMPLATE_STATUSES }
};

router.use(protect);

router.get('/certifications', listCatalog);
router.get('/certifications/:id', getCertification);
router.get('/organizations', listOrganizations);
router.get('/facets', catalogFacets);

router.post('/mentor/organizations', requireRole('MENTOR'), validateBody(organizationSchema), createOrganization);
router.patch('/mentor/organizations/:id', requireRole('MENTOR'), updateOrganization);
router.delete('/mentor/organizations/:id', requireRole('MENTOR'), deleteOrganization);

router.post('/mentor/certifications', requireRole('MENTOR'), validateBody(certificationSchema), createCertification);
router.patch('/mentor/certifications/:id', requireRole('MENTOR'), updateCertification);
router.delete('/mentor/certifications/:id', requireRole('MENTOR'), deleteCertification);

export default router;

