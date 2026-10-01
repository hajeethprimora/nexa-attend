import { z } from 'zod';
import supabase from '../utils/supabaseClient';
import logger from '../utils/logger';
import config from '../config';
import { logAuditEvent } from '../utils/auditLogger';
import { AppError, dbError } from '../middleware/errorHandler';
import { AttendanceRecord, BreakEntry } from '../types';
import { AttendanceService, summarizeRecords } from './attendanceService';
import { calculateDays } from './leaveService';
import { addDays, isValidMonth, monthRange, todayInZone, zonedToUtc } from '../utils/time';
import { attendanceCreateSchema, attendanceUpsertSchema } from '../validators/adminValidators';
import { sendAttendanceEditedNotification } from '../utils/emailService';

type AttendanceInput = z.infer<typeof attendanceUpsertSchema>;
type AttendanceCreateInput = z.infer<typeof attendanceCreateSchema>;

const MAX_SESSION_MS = 24 * 3600 * 1000;

/** Turns wall-clock HH:mm values (company timezone) into UTC instants, rolling past midnight when needed. */
export const resolveTimes = (input: Pick<AttendanceInput, 'date' | 'clock_in' | 'clock_out' | 'breaks'>, timeZone: string) => {
  const { date } = input;
  const at = (time: string, notBefore: number) => {
    const sameDay = zonedToUtc(date, time, timeZone).getTime();
    return sameDay >= notBefore ? sameDay : zonedToUtc(addDays(date, 1), time, timeZone).getTime();
  };

  const clockIn = zonedToUtc(date, input.clock_in, timeZone).getTime();
  const clockOut = input.clock_out ? at(input.clock_out, clockIn + 1) : null;

  if (clockOut !== null && clockOut - clockIn > MAX_SESSION_MS) {
    throw new AppError('A single session cannot be longer than 24 hours.', 400, 'INVALID_TIMES');
  }

  const breaks: BreakEntry[] = [];
  let cursor = clockIn;
  for (const b of [...(input.breaks || [])].sort((x, y) => x.start.localeCompare(y.start))) {
    const start = at(b.start, cursor);
    const end = at(b.end, start + 1);
    if (clockOut !== null && end > clockOut) {
      throw new AppError(`Break ${b.start}-${b.end} must fall between clock-in and clock-out.`, 400, 'INVALID_BREAK');
    }
    breaks.push({ start: new Date(start).toISOString(), end: new Date(end).toISOString() });
    cursor = end;
  }

  return {
    clock_in: new Date(clockIn).toISOString(),
    clock_out: clockOut !== null ? new Date(clockOut).toISOString() : null,
    breaks
  };
};

export class AdminAttendanceService {
  static async listForEmployee(userId: string, month: string) {
    if (!isValidMonth(month)) throw new AppError('Month must be in YYYY-MM format', 400, 'INVALID_MONTH');
    const { start, end } = monthRange(month);

    const { data: userRows, error: userError } = await supabase
      .from('users')
      .select('id, employee_id, full_name, email, department, shift_start, shift_end, allow_remote, is_active')
      .eq('id', userId)
      .limit(1);
    if (userError) throw dbError(userError, 'listForEmployee user');
    const employee = userRows?.[0];
    if (!employee) throw new AppError('Employee not found', 404, 'NOT_FOUND');

    const [{ data: records, error }, { data: leaves, error: leaveError }] = await Promise.all([
      supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })
        .order('clock_in', { ascending: true }),
      supabase
        .from('leaves')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .lte('start_date', end)
        .gte('end_date', start)
    ]);
    if (error) throw dbError(error, 'listForEmployee attendance');
    if (leaveError) throw dbError(leaveError, 'listForEmployee leaves');

    const list: AttendanceRecord[] = records || [];
    return {
      employee,
      month,
      timezone: config.timeZone,
      records: list,
      leaves: (leaves || []).map(l => ({ ...l, days_in_month: calculateDays(l.start_date, l.end_date, start, end) })),
      summary: summarizeRecords(list)
    };
  }

  private static async assertValid(userId: string, date: string, times: ReturnType<typeof resolveTimes>, excludeId?: string) {
    const today = todayInZone(config.timeZone);
    if (date > today) throw new AppError('Attendance cannot be recorded for a future date.', 400, 'FUTURE_DATE');

    const nowMs = Date.now() + 5 * 60 * 1000;
    if (new Date(times.clock_in).getTime() > nowMs || (times.clock_out && new Date(times.clock_out).getTime() > nowMs)) {
      throw new AppError('Clock times cannot be in the future.', 400, 'FUTURE_TIME');
    }
    if (!times.clock_out && date !== today) {
      throw new AppError('Past records need a clock-out time.', 400, 'CLOCK_OUT_REQUIRED');
    }

    // Reject sessions that overlap another session of the same employee
    let query = supabase
      .from('attendance')
      .select('id, clock_in, clock_out')
      .eq('user_id', userId)
      .gte('date', addDays(date, -1))
      .lte('date', addDays(date, 1));
    if (excludeId) query = query.neq('id', excludeId);
    const { data: neighbours, error } = await query;
    if (error) throw dbError(error, 'assertValid neighbours');

    const aStart = new Date(times.clock_in).getTime();
    const aEnd = times.clock_out ? new Date(times.clock_out).getTime() : Date.now();
    const clash = (neighbours || []).find(n => {
      const bStart = new Date(n.clock_in).getTime();
      const bEnd = n.clock_out ? new Date(n.clock_out).getTime() : Date.now();
      return aStart < bEnd && bStart < aEnd;
    });
    if (clash) {
      throw new AppError('These times overlap another attendance session for this employee.', 409, 'OVERLAP');
    }
  }

  private static async notifyEmployee(userId: string, date: string, action: 'created' | 'updated' | 'deleted', reason: string) {
    const { data } = await supabase.from('users').select('full_name, email').eq('id', userId).limit(1);
    const employee = data?.[0];
    if (!employee?.email) return;
    sendAttendanceEditedNotification({ employeeEmail: employee.email, employeeName: employee.full_name, date, action, reason })
      .catch(err => logger.error('Attendance edit email failed:', err));
  }

  private static async fetchRecord(id: string): Promise<AttendanceRecord> {
    const { data, error } = await supabase.from('attendance').select('*').eq('id', id).maybeSingle();
    if (error) throw dbError(error, 'fetchRecord');
    if (!data) throw new AppError('Attendance record not found', 404, 'NOT_FOUND');
    return data;
  }

  static async create(input: AttendanceCreateInput, adminId: string, clientIp: string | null) {
    const { data: userRows } = await supabase.from('users').select('id').eq('id', input.user_id).limit(1);
    if (!userRows?.[0]) throw new AppError('Employee not found', 404, 'NOT_FOUND');

    const times = resolveTimes(input, config.timeZone);
    await this.assertValid(input.user_id, input.date, times);

    const nowISO = new Date().toISOString();
    const { data, error } = await supabase
      .from('attendance')
      .insert([{
        user_id: input.user_id,
        date: input.date,
        ...times,
        work_mode: input.work_mode,
        notes: input.notes,
        edited_by: adminId,
        edited_at: nowISO,
        edit_reason: input.reason
      }])
      .select()
      .single();
    if (error) throw dbError(error, 'adminAttendance create');

    await AttendanceService.recalculateDay(input.user_id, input.date);
    await logAuditEvent({
      actor_id: adminId,
      action: 'ATTENDANCE_ADMIN_CREATED',
      target_id: data.id,
      ip_address: clientIp,
      details: { user_id: input.user_id, date: input.date, after: times, work_mode: input.work_mode, reason: input.reason }
    });
    await this.notifyEmployee(input.user_id, input.date, 'created', input.reason);

    return this.fetchRecord(data.id);
  }

  static async update(id: string, input: AttendanceInput, adminId: string, clientIp: string | null) {
    const before = await this.fetchRecord(id);
    const times = resolveTimes(input, config.timeZone);
    await this.assertValid(before.user_id, input.date, times, id);

    const { error } = await supabase
      .from('attendance')
      .update({
        date: input.date,
        ...times,
        break_start: null,
        break_end: null,
        work_mode: input.work_mode,
        notes: input.notes,
        auto_closed: false,
        edited_by: adminId,
        edited_at: new Date().toISOString(),
        edit_reason: input.reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    if (error) throw dbError(error, 'adminAttendance update');

    await AttendanceService.recalculateDay(before.user_id, input.date);
    if (before.date !== input.date) await AttendanceService.recalculateDay(before.user_id, before.date);

    await logAuditEvent({
      actor_id: adminId,
      action: 'ATTENDANCE_ADMIN_UPDATED',
      target_id: id,
      ip_address: clientIp,
      details: {
        user_id: before.user_id,
        reason: input.reason,
        before: { date: before.date, clock_in: before.clock_in, clock_out: before.clock_out, breaks: before.breaks, work_mode: before.work_mode, total_hours: before.total_hours },
        after: { date: input.date, ...times, work_mode: input.work_mode }
      }
    });
    await this.notifyEmployee(before.user_id, input.date, 'updated', input.reason);

    return this.fetchRecord(id);
  }

  static async remove(id: string, reason: string, adminId: string, clientIp: string | null) {
    const before = await this.fetchRecord(id);

    const { error } = await supabase.from('attendance').delete().eq('id', id);
    if (error) throw dbError(error, 'adminAttendance delete');

    await AttendanceService.recalculateDay(before.user_id, before.date);
    await logAuditEvent({
      actor_id: adminId,
      action: 'ATTENDANCE_ADMIN_DELETED',
      target_id: id,
      ip_address: clientIp,
      details: { user_id: before.user_id, reason, deleted_record: before }
    });
    await this.notifyEmployee(before.user_id, before.date, 'deleted', reason);

    return { id };
  }
}
