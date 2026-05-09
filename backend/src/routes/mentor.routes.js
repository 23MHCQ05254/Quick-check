import { Router } from 'express';
import {
  activityLogs,
  analytics,
  commandCenter,
  dashboard,
  deleteCertificate,
  listCertificates,
  listReviewQueue,
  listStudents,
  moderateCertificate,
  notificationCenter,
  placementReadiness,
  rerunAnalysis,
  reviewCertificate
} from '../controllers/mentor.controller.js';
import { protect, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect, requireRole('MENTOR'));
router.get('/command-center', commandCenter);
router.get('/dashboard', dashboard);
router.get('/students', listStudents);
router.get('/analytics', analytics);
router.get('/placement', placementReadiness);
router.get('/review-queue', listReviewQueue);
router.get('/certificates', listCertificates);
router.get('/activity', activityLogs);
router.get('/notifications', notificationCenter);
router.patch('/certificates/:id/review', reviewCertificate);
router.patch('/certificates/:id/moderate', moderateCertificate);
router.post('/certificates/:id/rerun-analysis', rerunAnalysis);
router.delete('/certificates/:id', deleteCertificate);

export default router;
