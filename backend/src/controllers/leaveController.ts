import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { LeaveService } from '../services/leaveService';
import { sendSuccess } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';
import { clientIp } from './attendanceController';

export const createLeave = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await LeaveService.createLeave(req.user!.id, req.body, clientIp(req));
  return sendSuccess(res, data, 'Leave request submitted successfully', 201);
});

export const getUserLeaves = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await LeaveService.getUserLeaves(req.user!.id);
  return sendSuccess(res, result.leaves, 'Leave history retrieved', 200, { balance: result.balance });
});

export const cancelLeave = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await LeaveService.cancelLeave(req.user!.id, req.params.id, clientIp(req));
  return sendSuccess(res, data, 'Leave request cancelled');
});
