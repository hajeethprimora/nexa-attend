import { Response } from 'express';
import { ApiResponse, AuthenticatedRequest } from '../types';

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200,
  extraMeta?: Record<string, any>
): Response => {
  const req = res.req as AuthenticatedRequest;
  const body: ApiResponse<T> = {
    success: true,
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
    meta: {
      timestamp: new Date().toISOString(),
      ...(req?.requestId ? { requestId: req.requestId } : {}),
      ...extraMeta
    }
  };
  return res.status(statusCode).json(body);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 400,
  code: string = 'BAD_REQUEST',
  details?: any
): Response => {
  const req = res.req as AuthenticatedRequest;
  const body: ApiResponse = {
    success: false,
    message,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...(req?.requestId ? { requestId: req.requestId } : {})
    }
  };
  return res.status(statusCode).json(body);
};
