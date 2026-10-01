import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { AttendanceService } from '../services/attendanceService';
import { ReportService } from '../services/reportService';
import { sendSuccess } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';

export const clientIp = (req: AuthenticatedRequest): string | null => req.ip || null;

export const getToday = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await AttendanceService.getTodayStatus(req.user!.id);
  return sendSuccess(res, result.record, 'Status retrieved successfully', 200, {
    status: result.status,
    today: result.today,
    today_hours: result.todayHours,
    allow_remote: req.user!.allow_remote
  });
});

export const clockIn = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await AttendanceService.clockIn(req.user!, req.body || {}, clientIp(req));
  return sendSuccess(res, data, data.work_mode === 'remote' ? 'Clocked in (working from home)' : 'Clocked in successfully', 201);
});

export const breakStart = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await AttendanceService.breakStart(req.user!.id);
  return sendSuccess(res, data, 'Break started successfully');
});

export const breakEnd = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await AttendanceService.breakEnd(req.user!.id);
  return sendSuccess(res, data, 'Break ended successfully');
});

export const clockOut = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await AttendanceService.clockOut(req.user!, clientIp(req));
  return sendSuccess(res, data, 'Clocked out successfully');
});

export const getHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const month = typeof req.query.month === 'string' ? req.query.month : undefined;

  if (req.query.format === 'csv') {
    const { month: m, csv } = await ReportService.detailedCsv({ month, userId: req.user!.id });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${req.user!.employee_id}_${m}.csv"`);
    return res.status(200).send(csv);
  }

  const result = await AttendanceService.getHistory(req.user!.id, month);
  return sendSuccess(res, result.data, 'History retrieved successfully', 200, {
    month: result.month,
    summary: result.summary
  });
});
