import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { AdminService } from '../services/adminService';
import { AdminAttendanceService } from '../services/adminAttendanceService';
import { LeaveService } from '../services/leaveService';
import { ReportService } from '../services/reportService';
import { sendSuccess } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { clientIp } from './attendanceController';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

const sendCsv = (res: Response, filename: string, csv: string) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(csv);
};

export const getUsersStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await AdminService.getUsersStatus();
  return sendSuccess(res, data, 'Team live status fetched successfully');
});

export const getPendingLeaves = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await LeaveService.getPendingLeaves();
  return sendSuccess(res, data, 'Pending leaves fetched successfully');
});

export const updateLeaveStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status, admin_comment } = req.body;
  const data = await LeaveService.decideLeave(req.params.id, status, admin_comment || '', req.user!.id, clientIp(req));
  return sendSuccess(res, data, `Leave request ${status} successfully`);
});

export const getMonthlyReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const filters = { month: str(req.query.month), department: str(req.query.department), search: str(req.query.search) };

  if (req.query.format === 'csv') {
    const { month, csv } = await ReportService.monthlySummaryCsv(filters);
    return sendCsv(res, `attendance_summary_${month}.csv`, csv);
  }

  const { month, rows, workingDaysInMonth, workingDaysElapsed } = await ReportService.monthlySummary(filters);
  return sendSuccess(res, rows, 'Monthly report fetched successfully', 200, {
    month,
    working_days_in_month: workingDaysInMonth,
    working_days_elapsed: workingDaysElapsed
  });
});

export const getDetailedReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { month, csv } = await ReportService.detailedCsv({
    month: str(req.query.month),
    department: str(req.query.department),
    search: str(req.query.search),
    userId: str(req.query.user_id)
  });
  return sendCsv(res, `attendance_detailed_${month}.csv`, csv);
});

export const getEmployees = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await AdminService.getEmployees(str(req.query.search), str(req.query.department), str(req.query.role));
  return sendSuccess(res, data, 'Employees directory fetched');
});

export const createEmployee = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await AdminService.createEmployee(req.body, req.user!.id, clientIp(req));
  return sendSuccess(res, data, 'Employee created successfully', 201);
});

export const updateEmployee = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await AdminService.updateEmployee(req.params.id, req.body, req.user!.id, clientIp(req));
  return sendSuccess(res, data, 'Employee profile updated successfully');
});

export const getLeaveBalance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const data = await AdminService.getLeaveBalance(req.params.id, year);
  return sendSuccess(res, data, 'Leave balance fetched');
});

export const updateLeaveBalance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await AdminService.updateLeaveBalance(req.params.id, req.body, req.user!.id, clientIp(req));
  return sendSuccess(res, data, 'Leave quotas updated');
});

export const getAuditLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const data = await AdminService.getAuditLogs(limit, str(req.query.action));
  return sendSuccess(res, data, 'Audit logs fetched');
});

export const listEmployeeAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = str(req.query.user_id);
  const month = str(req.query.month);
  if (!userId || !month) throw new AppError('user_id and month are required', 400, 'VALIDATION_ERROR');
  const data = await AdminAttendanceService.listForEmployee(userId, month);
  return sendSuccess(res, data, 'Attendance records fetched');
});

export const createAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await AdminAttendanceService.create(req.body, req.user!.id, clientIp(req));
  return sendSuccess(res, data, 'Attendance record added', 201);
});

export const updateAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await AdminAttendanceService.update(req.params.id, req.body, req.user!.id, clientIp(req));
  return sendSuccess(res, data, 'Attendance record updated');
});

export const deleteAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await AdminAttendanceService.remove(req.params.id, req.body.reason, req.user!.id, clientIp(req));
  return sendSuccess(res, data, 'Attendance record deleted');
});
