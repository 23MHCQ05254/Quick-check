import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import certificateRoutes from './routes/certificate.routes.js';
import mentorRoutes from './routes/mentor.routes.js';
import portfolioRoutes from './routes/portfolio.routes.js';
import templateRoutes from './routes/template.routes.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { isDemoMode } from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'quickcheck-backend',
    mode: isDemoMode() ? 'demo' : 'mongodb',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/templates', templateRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

