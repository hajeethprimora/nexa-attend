import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { AdminService } from '../services/adminService';
import { sendSuccess } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';

export const getUsersStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await AdminService.getUsersStatus();
  return sendSuccess(res, data, 'Team live status fetched successfully');
});

export const getPendingLeaves = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await AdminService.getPendingLeaves();
  return sendSuccess(res, data, 'Pending leaves fetched successfully');
});

export const updateLeaveStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { status, admin_comment } = req.body;
  const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || null;

  const data = await AdminService.updateLeaveStatus(id, status, admin_comment, req.user!.id, clientIp);
  return sendSuccess(res, data, `Leave request ${status} successfully`);
});

export const getMonthlyReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const month = req.query.month as string | undefined;
  const format = req.query.format as string | undefined;
  const department = req.query.department as string | undefined;
  const search = req.query.search as string | undefined;

  const { month: selectedMonth, reportData } = await AdminService.getMonthlyReport(month, department, search);

  if (format === 'csv') {
    let csvContent = 'Employee ID,Full Name,Department,Role,Total Working Days,Total Working Hours,Overtime Hours,Late Minutes,Leaves Taken\n';
    reportData.forEach(row => {
      csvContent += `"${row.employee_id}","${row.full_name}","${row.department}","${row.role}",${row.total_days_worked},${row.total_hours_worked},${row.total_overtime_hours},${row.total_late_minutes},${row.leaves_taken}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=softnix_report_${selectedMonth}.csv`);
    return res.status(200).send(csvContent);
  }

  return sendSuccess(res, reportData, 'Monthly report fetched successfully', 200, { month: selectedMonth });
});

export const getEmployees = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const search = req.query.search as string | undefined;
  const department = req.query.department as string | undefined;
  const role = req.query.role as string | undefined;

  const data = await AdminService.getEmployees(search, department, role);
  return sendSuccess(res, data, 'Employees directory fetched');
});

export const createEmployee = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || null;
  const data = await AdminService.createEmployee(req.body, req.user!.id, clientIp);
  return sendSuccess(res, data, 'Employee created successfully', 201);
});

export const updateEmployee = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || null;
  const data = await AdminService.updateEmployee(id, req.body, req.user!.id, clientIp);
  return sendSuccess(res, data, 'Employee profile updated successfully');
});

export const getAuditLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const data = await AdminService.getAuditLogs(limit);
  return sendSuccess(res, data, 'Audit logs fetched');
});
