import { Router } from 'express';
import { analytics, dashboard, listStudents, reviewCertificate } from '../controllers/mentor.controller.js';
import { protect, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect, requireRole('MENTOR'));
router.get('/dashboard', dashboard);
router.get('/students', listStudents);
router.get('/analytics', analytics);
router.patch('/certificates/:id/review', reviewCertificate);

export default router;

