import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import config from './config';
import logger from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import errorHandler from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import leaveRoutes from './routes/leaveRoutes';
import adminRoutes from './routes/adminRoutes';
import { sendError, sendSuccess } from './utils/response';
import { AttendanceService } from './services/attendanceService';

const app = express();

// Vercel / AWS Lambda run the exported app as a function: no listen(), timers or process.exit()
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

/** Names (never values) of required settings that are missing. */
const missingConfig = (): string[] => {
  const missing: string[] = [];
  if (!config.supabaseUrl) missing.push('SUPABASE_URL');
  if (!config.supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (config.isProduction && config.frontendUrls.length === 0) missing.push('FRONTEND_URL');
  return missing;
};

// Render / Railway / Fly put one proxy in front of the app; needed for correct req.ip
app.set('trust proxy', 1);
app.disable('x-powered-by');

// 1. CORS: only the configured frontend origin(s). Entries may use * as a wildcard,
//    e.g. FRONTEND_URL=https://softnixattend.netlify.app,https://*--softnixattend.netlify.app
const originMatchers = config.frontendUrls.map(entry =>
  entry.includes('*')
    ? new RegExp('^' + entry.split('*').map(s => s.replace(/[.+?^${}()|[\]\\/]/g, '\\$&')).join('[a-z0-9-]+') + '$', 'i')
    : entry.toLowerCase()
);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Non-browser clients (curl, health checks) send no Origin header
    if (!origin) return callback(null, true);
    if (originMatchers.length === 0 && !config.isProduction) return callback(null, true);
    const allowed = originMatchers.some(m => (typeof m === 'string' ? m === origin.toLowerCase() : m.test(origin)));
    return callback(null, allowed);
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Accept'],
  exposedHeaders: ['Content-Disposition', 'X-Request-ID'],
  maxAge: 600
};

app.use(cors(corsOptions));

// 2. Security headers (pure JSON API, consumed cross-origin by the frontend)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// 3. Rate limiting (generous: an office often shares one public IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Rate limit exceeded. Please slow down your requests.' }
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration attempts. Please try again later.' }
});

app.use('/api/auth/signup', signupLimiter);
app.use('/api', apiLimiter);

// 4. Body parsers
app.use(express.json({ limit: '100kb' }));

// 5. Request tracking logger
app.use(requestLogger);

// 6. Health check
app.get(['/api/health', '/health'], (req: Request, res: Response) => {
  const missing = missingConfig();
  return sendSuccess(res, {
    status: missing.length ? 'misconfigured' : 'healthy',
    missing_env: missing,
    timezone: config.timeZone,
    uptime: process.uptime(),
    version: '2.1.0'
  }, missing.length ? `Missing environment variables: ${missing.join(', ')}` : 'Backend API is healthy');
});

// 7. Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (req: Request, res: Response) => sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));

// 8. Global error handler
app.use(errorHandler);

const validateConfig = () => {
  const problems: string[] = [];
  if (!config.supabaseUrl) problems.push('SUPABASE_URL is missing');
  if (!config.supabaseServiceRoleKey) problems.push('SUPABASE_SERVICE_ROLE_KEY is missing');
  if (config.isProduction && config.frontendUrls.length === 0) problems.push('FRONTEND_URL is missing: browsers will be blocked by CORS');
  if (config.timeZoneInvalid) problems.push(`APP_TIMEZONE "${process.env.APP_TIMEZONE}" is not a valid IANA zone; falling back to UTC`);
  if (!process.env.APP_TIMEZONE) problems.push('APP_TIMEZONE not set: using UTC for "today", late arrival and reports');
  problems.forEach(p => logger.warn(`Config: ${p}`));
  // On a long-running server, fail fast. On serverless, keep serving so /api/health can explain the problem.
  if (config.isProduction && !isServerless && (!config.supabaseUrl || !config.supabaseServiceRoleKey)) {
    logger.error('Refusing to start without Supabase credentials');
    process.exit(1);
  }
};

// 9. Start
if (!config.isTest) {
  validateConfig();
}

if (!config.isTest && !isServerless) {
  const server = app.listen(config.port, () => {
    logger.info(`Backend running on port ${config.port} (tz=${config.timeZone}, origins=${config.frontendUrls.join(', ') || 'any (dev)'})`);
  });

  // Auto-close forgotten sessions even when nobody opens the app
  const sweep = setInterval(() => {
    AttendanceService.closeStaleSessions()
      .then(count => count && logger.info(`Auto-closed ${count} stale attendance session(s)`))
      .catch(err => logger.error('Stale session sweep failed:', err));
  }, 60 * 60 * 1000);

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    clearInterval(sweep);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', reason => logger.error('Unhandled promise rejection:', reason));
}

export default app;
