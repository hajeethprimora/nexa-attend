import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { AttendanceService } from '../services/attendanceService';
import { sendSuccess } from '../utils/response';

export const getToday = async (req: AuthenticatedRequest, res: Response) => {
  const result = await AttendanceService.getTodayStatus(req.user!.id);
  return sendSuccess(res, result.record, 'Status retrieved successfully', 200, { status: result.status });
};

export const clockIn = async (req: AuthenticatedRequest, res: Response) => {
  const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || null;
  const data = await AttendanceService.clockIn(req.user!, req.body || {}, clientIp);
  return sendSuccess(res, data, 'Clocked in successfully', 201);
};

export const breakStart = async (req: AuthenticatedRequest, res: Response) => {
  const data = await AttendanceService.breakStart(req.user!.id);
  return sendSuccess(res, data, 'Break started successfully');
};

export const breakEnd = async (req: AuthenticatedRequest, res: Response) => {
  const data = await AttendanceService.breakEnd(req.user!.id);
  return sendSuccess(res, data, 'Break ended successfully');
};

export const clockOut = async (req: AuthenticatedRequest, res: Response) => {
  const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || null;
  const data = await AttendanceService.clockOut(req.user!.id, clientIp);
  return sendSuccess(res, data, 'Clocked out successfully');
};

export const getHistory = async (req: AuthenticatedRequest, res: Response) => {
  const month = req.query.month as string | undefined;
  const result = await AttendanceService.getHistory(req.user!.id, month);
  return sendSuccess(res, result.data, 'History retrieved successfully', 200, {
    month: result.month,
    summary: result.summary
  });
};
