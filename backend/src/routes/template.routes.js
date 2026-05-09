import { Router } from 'express';
import { createCertification, listTemplates, trainTemplate } from '../controllers/template.controller.js';
import { protect, requireRole } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

router.use(protect, requireRole('MENTOR'));
router.get('/', listTemplates);
router.post('/certifications', createCertification);
router.post('/train', upload.array('samples', 10), trainTemplate);

export default router;

