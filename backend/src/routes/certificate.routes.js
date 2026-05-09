import { Router } from 'express';
import { listMyCertificates, uploadCertificate } from '../controllers/certificate.controller.js';
import { protect, requireRole } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

router.get('/mine', protect, requireRole('STUDENT'), listMyCertificates);
router.post('/upload', protect, requireRole('STUDENT'), upload.single('certificate'), uploadCertificate);

export default router;

