import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { sendError } from '../utils/response';
import config from '../config';

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode: number = 400, code: string = 'BAD_REQUEST', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/** Logs a Supabase/Postgres error and converts it into a client-safe AppError. */
export const dbError = (error: { message?: string; code?: string } | null | undefined, context: string): AppError => {
  logger.error(`DB error (${context}):`, error);
  if (error?.code === '23505') {
    return new AppError('A conflicting record already exists.', 409, 'CONFLICT');
  }
  return new AppError('A database error occurred. Please try again.', 500, 'DB_ERROR');
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error(`${req.method} ${req.originalUrl}: ${err.message}`);
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  // Malformed JSON body
  if (err?.type === 'entity.parse.failed') {
    return sendError(res, 'Malformed JSON request body', 400, 'BAD_JSON');
  }
  if (err?.type === 'entity.too.large') {
    return sendError(res, 'Request body too large', 413, 'PAYLOAD_TOO_LARGE');
  }

  logger.error(`Unhandled error processing ${req.method} ${req.originalUrl}:`, err);
  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode >= 500 && config.isProduction
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';
  return sendError(res, message, statusCode, 'INTERNAL_SERVER_ERROR');
};

export default errorHandler;
