import express from 'express';
import cors from 'cors';
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

// 1. Security Headers Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// 3. Request Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Rate limit exceeded. Please slow down your requests.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api', apiLimiter);

// 4. Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Request Tracking Logger
app.use(requestLogger);

// 6. Production Health Check Endpoint
app.get('/api/health', (req, res) => {
  return sendSuccess(res, {
    status: 'healthy',
    uptime: process.uptime(),
    version: '2.0.0-enterprise'
  }, 'NexaAttend Enterprise Backend API is healthy');
});

// 7. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/admin', adminRoutes);

// 8. Global Error Handler
app.use(errorHandler);

// 9. Start Express Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`✅ NexaAttend Industrial-Tier Enterprise Backend running on port ${PORT}`);
  });
}

export default app;
