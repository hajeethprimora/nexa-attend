import supabase from '../utils/supabaseClient';
import logger from '../utils/logger';
import config from '../config';
import { logAuditEvent } from '../utils/auditLogger';
import { LeaveType, LeaveBalance } from '../types';
import { AppError, dbError } from '../middleware/errorHandler';
import { sendLeaveDecisionNotification, sendLeaveRequestNotification } from '../utils/emailService';
import { countWorkingDays, isValidDate, maxDate, minDate, todayInZone, addDays } from '../utils/time';

/** Working days (weekends excluded) a leave consumes, optionally clipped to a window. */
export const calculateDays = (start: string, end: string, clipStart?: string, clipEnd?: string): number => {
  const from = clipStart ? maxDate(start, clipStart) : start;
  const to = clipEnd ? minDate(end, clipEnd) : end;
  return countWorkingDays(from, to, config.weekendDays);
};

/** Splits a leave into working days per calendar year (balances are yearly). */
export const daysByYear = (start: string, end: string): Map<number, number> => {
  const result = new Map<number, number>();
  const startYear = Number(start.slice(0, 4));
  const endYear = Number(end.slice(0, 4));
  for (let y = startYear; y <= endYear; y++) {
    const days = calculateDays(start, end, `${y}-01-01`, `${y}-12-31`);
    if (days > 0) result.set(y, days);
  }
  return result;
};

const MAX_LEAVE_SPAN_DAYS = 90;

export class LeaveService {
  static async getOrCreateLeaveBalance(userId: string, year: number = Number(todayInZone(config.timeZone).slice(0, 4))): Promise<LeaveBalance> {
    const { data: balances, error } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .limit(1);

    if (error) throw dbError(error, 'getOrCreateLeaveBalance select');
    if (balances?.[0]) return balances[0];

    const { data: newBalance, error: createError } = await supabase
      .from('leave_balances')
      .upsert({ user_id: userId, year }, { onConflict: 'user_id,year', ignoreDuplicates: false })
      .select()
      .single();

    if (createError) throw dbError(createError, 'getOrCreateLeaveBalance create');
    return newBalance;
  }

  private static remaining(balance: LeaveBalance, type: LeaveType): number {
    const quota = Number(balance[`${type}_quota` as keyof LeaveBalance]) || 0;
    const used = Number(balance[`${type}_used` as keyof LeaveBalance]) || 0;
    return Math.max(0, quota - used);
  }

  private static async assertSufficientBalance(userId: string, type: LeaveType, start: string, end: string) {
    for (const [year, days] of daysByYear(start, end)) {
      const balance = await this.getOrCreateLeaveBalance(userId, year);
      const remaining = this.remaining(balance, type);
      if (days > remaining) {
        throw new AppError(
          `Insufficient ${type} leave balance for ${year}. Requested ${days} working day(s), only ${remaining} remaining.`,
          400,
          'INSUFFICIENT_BALANCE'
        );
      }
    }
  }

  static async createLeave(
    userId: string,
    payload: { start_date: string; end_date: string; type: LeaveType; reason?: string },
    clientIp: string | null
  ) {
    const { start_date, end_date, type } = payload;
    const reason = (payload.reason || '').slice(0, 1000);

    if (!isValidDate(start_date) || !isValidDate(end_date)) {
      throw new AppError('Dates must be valid YYYY-MM-DD values.', 400, 'VALIDATION_ERROR');
    }
    if (start_date > end_date) {
      throw new AppError('Start date cannot be after end date.', 400, 'INVALID_DATE_RANGE');
    }
    if (addDays(start_date, MAX_LEAVE_SPAN_DAYS) < end_date) {
      throw new AppError(`A single leave request cannot span more than ${MAX_LEAVE_SPAN_DAYS} days.`, 400, 'INVALID_DATE_RANGE');
    }

    const requestedDays = calculateDays(start_date, end_date);
    if (requestedDays === 0) {
      throw new AppError('The selected range only contains weekend days.', 400, 'NO_WORKING_DAYS');
    }

    const { data: existingLeaves, error: overlapError } = await supabase
      .from('leaves')
      .select('id')
      .eq('user_id', userId)
      .neq('status', 'rejected')
      .lte('start_date', end_date)
      .gte('end_date', start_date)
      .limit(1);

    if (overlapError) throw dbError(overlapError, 'createLeave overlap');
    if (existingLeaves && existingLeaves.length > 0) {
      throw new AppError('You already have an approved or pending leave request overlapping these dates.', 400, 'LEAVE_OVERLAP');
    }

    await this.assertSufficientBalance(userId, type, start_date, end_date);

    const { data, error } = await supabase
      .from('leaves')
      .insert([{ user_id: userId, start_date, end_date, type, reason, status: 'pending' }])
      .select()
      .single();

    if (error) throw dbError(error, 'createLeave insert');

    const { data: userRows } = await supabase.from('users').select('full_name').eq('id', userId).limit(1);

    if (config.adminNotificationEmails.length > 0) {
      sendLeaveRequestNotification({
        adminEmails: config.adminNotificationEmails,
        employeeName: userRows?.[0]?.full_name || 'Employee',
        leaveType: type,
        startDate: start_date,
        endDate: end_date,
        days: requestedDays,
        reason
      }).catch(err => logger.error('Error dispatching leave request email:', err));
    }

    await logAuditEvent({
      actor_id: userId,
      action: 'LEAVE_SUBMITTED',
      target_id: data.id,
      ip_address: clientIp,
      details: { type, start_date, end_date, days: requestedDays }
    });

    return data;
  }

  static async cancelLeave(userId: string, leaveId: string, clientIp: string | null) {
    const { data, error } = await supabase
      .from('leaves')
      .delete()
      .eq('id', leaveId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .select()
      .maybeSingle();

    if (error) throw dbError(error, 'cancelLeave');
    if (!data) throw new AppError('Only your own pending leave requests can be cancelled.', 404, 'NOT_FOUND');

    await logAuditEvent({ actor_id: userId, action: 'LEAVE_CANCELLED', target_id: leaveId, ip_address: clientIp, details: data });
    return data;
  }

  static async getUserLeaves(userId: string) {
    const { data: leaves, error: leavesError } = await supabase
      .from('leaves')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (leavesError) throw dbError(leavesError, 'getUserLeaves');

    const balance = await this.getOrCreateLeaveBalance(userId);
    return { leaves: leaves || [], balance };
  }

  static async getPendingLeaves() {
    const { data: leaves, error } = await supabase
      .from('leaves')
      .select('*, users!user_id(full_name, employee_id, department)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw dbError(error, 'getPendingLeaves');

    return (leaves || []).map((l: any) => ({
      id: l.id,
      user_id: l.user_id,
      employee_id: l.users?.employee_id || 'N/A',
      employee_name: l.users?.full_name || 'Unknown',
      department: l.users?.department || 'Engineering',
      start_date: l.start_date,
      end_date: l.end_date,
      days: calculateDays(l.start_date, l.end_date),
      type: l.type,
      reason: l.reason,
      status: l.status,
      created_at: l.created_at
    }));
  }

  static async decideLeave(
    leaveId: string,
    status: 'approved' | 'rejected',
    adminComment: string,
    adminId: string,
    clientIp: string | null
  ) {
    const { data: leave, error: leaveError } = await supabase
      .from('leaves')
      .select('*, users!user_id(full_name, employee_id, email)')
      .eq('id', leaveId)
      .maybeSingle();

    if (leaveError) throw dbError(leaveError, 'decideLeave select');
    if (!leave) throw new AppError('Leave request not found', 404, 'NOT_FOUND');
    if (leave.status !== 'pending') {
      throw new AppError(`This leave request has already been ${leave.status}.`, 409, 'ALREADY_DECIDED');
    }
    if (leave.user_id === adminId) {
      throw new AppError('You cannot approve or reject your own leave request.', 403, 'SELF_APPROVAL');
    }

    const perYear = daysByYear(leave.start_date, leave.end_date);
    if (status === 'approved') {
      // Re-check: balance may have changed since the request was submitted
      await this.assertSufficientBalance(leave.user_id, leave.type, leave.start_date, leave.end_date);
    }

    // Conditional update guards against two admins deciding at the same time
    const { data: updatedLeave, error: updateError } = await supabase
      .from('leaves')
      .update({
        status,
        admin_comment: (adminComment || '').slice(0, 1000),
        reviewed_by: adminId,
        updated_at: new Date().toISOString()
      })
      .eq('id', leaveId)
      .eq('status', 'pending')
      .select()
      .maybeSingle();

    if (updateError) throw dbError(updateError, 'decideLeave update');
    if (!updatedLeave) throw new AppError('This leave request was already processed.', 409, 'ALREADY_DECIDED');

    if (status === 'approved') {
      for (const [year, days] of perYear) {
        const balance = await this.getOrCreateLeaveBalance(leave.user_id, year);
        const usedField = `${leave.type}_used` as keyof LeaveBalance;
        const { error: balanceError } = await supabase
          .from('leave_balances')
          .update({ [usedField]: (Number(balance[usedField]) || 0) + days, updated_at: new Date().toISOString() })
          .eq('id', balance.id);
        if (balanceError) throw dbError(balanceError, 'decideLeave balance');
      }
    }

    await logAuditEvent({
      actor_id: adminId,
      action: `LEAVE_${status.toUpperCase()}`,
      target_id: leaveId,
      ip_address: clientIp,
      details: { status, admin_comment: adminComment, user_id: leave.user_id, type: leave.type, start_date: leave.start_date, end_date: leave.end_date }
    });

    let employeeEmail: string | undefined = leave.users?.email;
    if (!employeeEmail) {
      const { data: authUser } = await supabase.auth.admin.getUserById(leave.user_id);
      employeeEmail = authUser?.user?.email;
    }

    if (employeeEmail) {
      sendLeaveDecisionNotification({
        employeeEmail,
        employeeName: leave.users?.full_name || 'Employee',
        leaveType: leave.type,
        startDate: leave.start_date,
        endDate: leave.end_date,
        status,
        adminComment
      }).catch(err => logger.error('Error sending leave decision email:', err));
    }

    return updatedLeave;
  }
}
