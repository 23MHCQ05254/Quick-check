import { Router } from 'express';
import { publicPortfolio } from '../controllers/portfolio.controller.js';

const router = Router();

router.get('/:slug', publicPortfolio);

export default router;

