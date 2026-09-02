import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { sendError } from '../utils/response';

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

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(`Error processing request ${req.method} ${req.originalUrl}:`, err);

  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return sendError(res, message, statusCode, 'INTERNAL_SERVER_ERROR');
};

export default errorHandler;
