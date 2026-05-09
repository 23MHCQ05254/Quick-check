import { Router } from 'express';
import { listCatalog, listOrganizations } from '../controllers/catalog.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/certifications', protect, listCatalog);
router.get('/organizations', protect, listOrganizations);

export default router;

