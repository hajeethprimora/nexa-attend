import { Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../types';
import logger from '../utils/logger';

export const requestLogger = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const reqId = (req.headers['x-request-id'] as string) || randomUUID();
  req.requestId = reqId;
  res.setHeader('X-Request-ID', reqId);

  const startMs = Date.now();
  logger.info(`[${reqId}] Incoming: ${req.method} ${req.originalUrl} | IP=${req.ip}`);

  res.on('finish', () => {
    const duration = Date.now() - startMs;
    logger.info(`[${reqId}] Completed: ${req.method} ${req.originalUrl} | Status=${res.statusCode} | ${duration}ms`);
  });

  next();
};
