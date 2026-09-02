import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { LeaveService } from '../services/leaveService';
import { sendSuccess } from '../utils/response';

export const createLeave = async (req: AuthenticatedRequest, res: Response) => {
  const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || null;
  const data = await LeaveService.createLeave(req.user!.id, req.body, clientIp);
  return sendSuccess(res, data, 'Leave request submitted successfully', 201);
};

export const getUserLeaves = async (req: AuthenticatedRequest, res: Response) => {
  const result = await LeaveService.getUserLeaves(req.user!.id);
  return sendSuccess(res, result.leaves, 'Leave history retrieved', 200, { balance: result.balance });
};
