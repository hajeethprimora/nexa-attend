import supabase from '../utils/supabaseClient';
import logger from '../utils/logger';
import { logAuditEvent } from '../utils/auditLogger';
import { LeaveType, LeaveBalance } from '../types';
import { AppError } from '../middleware/errorHandler';

export const calculateDays = (start: string, end: string): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

export class LeaveService {
  static async getOrCreateLeaveBalance(userId: string, year: number = new Date().getFullYear()): Promise<LeaveBalance> {
    const { data: balance, error } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching leave balance:', error);
      throw new AppError('Failed to retrieve leave balance', 500, 'DB_ERROR');
    }

    if (balance) return balance;

    const { data: newBalance, error: createError } = await supabase
      .from('leave_balances')
      .insert([{
        user_id: userId,
        year,
        sick_quota: 10,
        casual_quota: 12,
        vacation_quota: 15,
        sick_used: 0,
        casual_used: 0,
        vacation_used: 0
      }])
      .select()
      .single();

    if (createError) {
      logger.error('Error initializing leave balance:', createError);
      throw new AppError('Failed to initialize leave balance', 500, 'DB_ERROR');
    }

    return newBalance;
  }

  static async createLeave(userId: string, payload: { start_date: string; end_date: string; type: LeaveType; reason?: string }, clientIp: string | null) {
    const { start_date, end_date, type, reason } = payload;

    if (!start_date || !end_date || !type) {
      throw new AppError('Start date, end date, and leave type are required.', 400, 'VALIDATION_ERROR');
    }

    if (new Date(start_date) > new Date(end_date)) {
      throw new AppError('Start date cannot be after end date.', 400, 'INVALID_DATE_RANGE');
    }

    const { data: existingLeaves, error: overlapError } = await supabase
      .from('leaves')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'rejected')
      .lte('start_date', end_date)
      .gte('end_date', start_date);

    if (overlapError) throw new AppError(overlapError.message, 500, 'DB_ERROR');

    if (existingLeaves && existingLeaves.length > 0) {
      throw new AppError('You already have an active or pending leave request for the selected date range.', 400, 'LEAVE_OVERLAP');
    }

    const requestedDays = calculateDays(start_date, end_date);
    const balance = await this.getOrCreateLeaveBalance(userId);

    const quotaKey = `${type}_quota` as keyof LeaveBalance;
    const usedKey = `${type}_used` as keyof LeaveBalance;

    const totalQuota = (balance[quotaKey] as number) || 0;
    const totalUsed = (balance[usedKey] as number) || 0;
    const remaining = Math.max(0, totalQuota - totalUsed);

    if (requestedDays > remaining) {
      throw new AppError(`Insufficient ${type} leave balance. Requested ${requestedDays} days, but only ${remaining} days remaining.`, 400, 'INSUFFICIENT_BALANCE');
    }

    const { data, error } = await supabase
      .from('leaves')
      .insert([{
        user_id: userId,
        start_date,
        end_date,
        type,
        reason: reason || '',
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw new AppError(error.message, 500, 'DB_ERROR');

    await logAuditEvent({
      actor_id: userId,
      action: 'LEAVE_SUBMITTED',
      target_id: data.id,
      ip_address: clientIp,
      details: { type, start_date, end_date, days: requestedDays }
    });

    return data;
  }

  static async getUserLeaves(userId: string) {
    const { data: leaves, error: leavesError } = await supabase
      .from('leaves')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (leavesError) throw new AppError(leavesError.message, 500, 'DB_ERROR');

    const balance = await this.getOrCreateLeaveBalance(userId);

    return {
      leaves: leaves || [],
      balance
    };
  }
}
