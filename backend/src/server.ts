import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import logger from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import errorHandler from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import leaveRoutes from './routes/leaveRoutes';
import adminRoutes from './routes/adminRoutes';
import { sendSuccess } from './utils/response';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

// 1. Universal Fail-Safe CORS Middleware (Handles Preflight & All Origins)
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// 2. Security Headers Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 3. Request Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: { success: false, message: 'Rate limit exceeded. Please slow down your requests.' }
});

app.use(['/api/auth/login', '/auth/login'], authLimiter);
app.use(['/api', '/'], apiLimiter);

// 4. Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Request Tracking Logger
app.use(requestLogger);

// 6. Production Health Check Endpoint
app.get(['/api/health', '/health'], (req: Request, res: Response) => {
  return sendSuccess(res, {
    status: 'healthy',
    uptime: process.uptime(),
    version: '2.0.0-enterprise'
  }, 'Softnix Enterprise Backend API is healthy');
});

// 7. Mount Dual API & Direct Routes (Works with or without /api prefix)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/attendance', '/attendance'], attendanceRoutes);
app.use(['/api/leaves', '/leaves'], leaveRoutes);
app.use(['/api/admin', '/admin'], adminRoutes);

// 8. Global Error Handler
app.use(errorHandler);

// 9. Start Express Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`✅ Softnix Industrial-Tier Enterprise Backend running on port ${PORT}`);
  });
}

export default app;
