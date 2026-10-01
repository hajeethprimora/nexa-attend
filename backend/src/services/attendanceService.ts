import supabase from '../utils/supabaseClient';
import logger from '../utils/logger';
import config from '../config';
import { logAuditEvent } from '../utils/auditLogger';
import { AttendanceRecord, BreakEntry, UserProfile, WorkMode } from '../types';
import { AppError, dbError } from '../middleware/errorHandler';
import { autoCloseTime, computeDay, computeLateMinutes, sessionNetHours } from './attendanceCalc';
import { currentMonthInZone, isValidMonth, monthRange, round2, todayInZone } from '../utils/time';

export { calculateBreakHours } from './attendanceCalc';

export const getRecordStatus = (record?: AttendanceRecord | null): string => {
  if (!record || !record.clock_in) return 'Offline';
  if (record.clock_out) return 'Clocked Out';

  const breaks = Array.isArray(record.breaks) ? record.breaks : [];
  const openBreak = breaks.find(b => b.start && !b.end);
  if (openBreak || (record.break_start && !record.break_end)) {
    return 'On Break';
  }

  return 'Clocked In';
};

const closeOpenBreaks = (breaks: BreakEntry[] | null | undefined, atISO: string): BreakEntry[] =>
  (Array.isArray(breaks) ? breaks : []).map(b => (b.start && !b.end ? { ...b, end: atISO } : b));

export const summarizeRecords = (records: AttendanceRecord[]) => {
  const dates = new Set<string>();
  const officeDates = new Set<string>();
  const remoteDates = new Set<string>();
  const lateDates = new Set<string>();
  let totalHours = 0;
  let overtime = 0;
  let lateMinutes = 0;
  let autoClosed = 0;

  records.forEach(r => {
    dates.add(r.date);
    if ((r.work_mode || 'office') === 'remote') remoteDates.add(r.date);
    else officeDates.add(r.date);
    if ((r.late_minutes || 0) > 0) lateDates.add(r.date);
    totalHours += Number(r.total_hours) || 0;
    overtime += Number(r.overtime_hours) || 0;
    lateMinutes += r.late_minutes || 0;
    if (r.auto_closed) autoClosed++;
  });

  return {
    days_worked: dates.size,
    office_days: officeDates.size,
    remote_days: remoteDates.size,
    late_days: lateDates.size,
    total_hours: round2(totalHours),
    total_overtime_hours: round2(overtime),
    total_late_minutes: lateMinutes,
    missed_clock_outs: autoClosed
  };
};

export class AttendanceService {
  /**
   * Recomputes total/overtime/late for every session of a user's work day.
   * Called after every clock-out, auto-close and admin edit so numbers stay consistent.
   */
  static async recalculateDay(userId: string, date: string, shiftStart?: string | null) {
    let shift = shiftStart;
    if (shift === undefined) {
      const { data: userRows } = await supabase.from('users').select('shift_start').eq('id', userId).limit(1);
      shift = userRows?.[0]?.shift_start || '09:00:00';
    }

    const { data: sessions, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date);

    if (error) throw dbError(error, 'recalculateDay select');
    if (!sessions || sessions.length === 0) return;

    const results = computeDay(sessions, {
      workDate: date,
      shiftStart: shift,
      timeZone: config.timeZone,
      standardHours: config.standardWorkdayHours,
      graceMinutes: config.lateGraceMinutes
    });

    for (const result of results) {
      const current = sessions.find(s => s.id === result.id);
      if (
        current &&
        Number(current.total_hours) === result.total_hours &&
        Number(current.overtime_hours) === result.overtime_hours &&
        (current.late_minutes || 0) === result.late_minutes
      ) {
        continue;
      }
      const { error: updateError } = await supabase
        .from('attendance')
        .update({
          total_hours: result.total_hours,
          overtime_hours: result.overtime_hours,
          late_minutes: result.late_minutes,
          updated_at: new Date().toISOString()
        })
        .eq('id', result.id);
      if (updateError) throw dbError(updateError, 'recalculateDay update');
    }
  }

  /**
   * Closes sessions where the employee forgot to clock out (open longer than
   * MAX_SESSION_HOURS, so late-night work past midnight is not cut off). They are
   * closed at the scheduled shift end and flagged `auto_closed` so an admin can correct them.
   */
  static async closeStaleSessions(userId?: string) {
    const cutoffISO = new Date(Date.now() - config.maxSessionHours * 3600 * 1000).toISOString();

    let query = supabase
      .from('attendance')
      .select('*, users!user_id(shift_start, shift_end)')
      .is('clock_out', null)
      .lt('clock_in', cutoffISO);
    if (userId) query = query.eq('user_id', userId);

    const { data: stale, error } = await query;
    if (error) {
      logger.error('closeStaleSessions lookup failed:', error);
      return 0;
    }

    for (const record of stale || []) {
      const closeAt = autoCloseTime(record.clock_in, record.date, record.users?.shift_end, config.timeZone);
      const note = '[Auto-closed: missed clock-out]';
      const { error: updateError } = await supabase
        .from('attendance')
        .update({
          clock_out: closeAt,
          breaks: closeOpenBreaks(record.breaks, closeAt),
          break_end: record.break_start && !record.break_end ? closeAt : record.break_end,
          auto_closed: true,
          notes: record.notes ? `${record.notes} ${note}` : note,
          updated_at: new Date().toISOString()
        })
        .eq('id', record.id)
        .is('clock_out', null);

      if (updateError) {
        logger.error(`Failed to auto-close attendance ${record.id}:`, updateError);
        continue;
      }

      await this.recalculateDay(record.user_id, record.date, record.users?.shift_start || '09:00:00');
      await logAuditEvent({
        actor_id: null,
        action: 'ATTENDANCE_AUTO_CLOSED',
        target_id: record.id,
        details: { user_id: record.user_id, date: record.date, clock_in: record.clock_in, clock_out: closeAt }
      });
    }

    return (stale || []).length;
  }

  private static async findOpenSession(userId: string): Promise<AttendanceRecord | null> {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1);
    if (error) throw dbError(error, 'findOpenSession');
    return data?.[0] || null;
  }

  static async getTodayStatus(userId: string, retried = false): Promise<{
    record: AttendanceRecord | null; status: string; today: string; todayHours: number; sessions: number;
  }> {
    const today = todayInZone(config.timeZone);

    // Independent queries run in parallel (each is a network round-trip to Supabase)
    const [closed, { data: todayRecords, error }, openSession] = await Promise.all([
      this.closeStaleSessions(userId),
      supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .order('clock_in', { ascending: false }),
      this.findOpenSession(userId)
    ]);
    if (error) throw dbError(error, 'getTodayStatus');
    // A forgotten session was just auto-closed: read again so we don't show stale state
    if (closed && !retried) return this.getTodayStatus(userId, true);

    const records: AttendanceRecord[] = todayRecords || [];
    const open = records.find(r => !r.clock_out) || openSession;
    const record = open || records[0] || null;

    // Hours worked today across all sessions, including the live one
    const todayHours = round2(records.reduce((sum, r) => sum + (r.clock_out ? Number(r.total_hours) || 0 : sessionNetHours(r)), 0));

    return { record, status: getRecordStatus(record), today, todayHours, sessions: records.length };
  }

  static async clockIn(
    user: UserProfile,
    payload: { work_mode?: WorkMode; lat?: number; lng?: number; notes?: string },
    clientIp: string | null
  ) {
    const workMode: WorkMode = payload.work_mode === 'remote' ? 'remote' : 'office';
    if (workMode === 'remote' && !user.allow_remote) {
      throw new AppError('Work from home is not enabled for your account. Please contact your administrator.', 403, 'REMOTE_NOT_ALLOWED');
    }

    const nowISO = new Date().toISOString();
    const today = todayInZone(config.timeZone);

    // Late arrival is only measured on the first session of the day
    const [closed, openSession, { count }] = await Promise.all([
      this.closeStaleSessions(user.id),
      this.findOpenSession(user.id),
      supabase
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('date', today)
    ]);
    // If a stale session was auto-closed, the one we found may be it
    const active = closed ? await this.findOpenSession(user.id) : openSession;
    if (active) {
      throw new AppError('You already have an active clock-in session. Please clock out first.', 400, 'SESSION_ALREADY_ACTIVE');
    }
    const lateMinutes = count
      ? 0
      : computeLateMinutes(nowISO, today, user.shift_start, config.timeZone, config.lateGraceMinutes);

    const lat = typeof payload.lat === 'number' && Math.abs(payload.lat) <= 90 ? payload.lat : null;
    const lng = typeof payload.lng === 'number' && Math.abs(payload.lng) <= 180 ? payload.lng : null;

    const { data, error } = await supabase
      .from('attendance')
      .insert([{
        user_id: user.id,
        date: today,
        clock_in: nowISO,
        breaks: [],
        late_minutes: lateMinutes,
        work_mode: workMode,
        ip_address: clientIp,
        location_lat: lat,
        location_lng: lng,
        notes: typeof payload.notes === 'string' ? payload.notes.slice(0, 500) : ''
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new AppError('You already have an active clock-in session. Please clock out first.', 400, 'SESSION_ALREADY_ACTIVE');
      }
      throw dbError(error, 'clockIn');
    }

    await logAuditEvent({
      actor_id: user.id,
      action: 'ATTENDANCE_CLOCK_IN',
      target_id: data.id,
      ip_address: clientIp,
      details: { clock_in: nowISO, late_minutes: lateMinutes, work_mode: workMode }
    });

    return data;
  }

  static async breakStart(userId: string) {
    const [closed, openSession] = await Promise.all([this.closeStaleSessions(userId), this.findOpenSession(userId)]);
    const record = closed ? await this.findOpenSession(userId) : openSession;
    if (!record) {
      throw new AppError('No active clock-in session found to start a break', 400, 'NO_ACTIVE_SESSION');
    }

    const breaks: BreakEntry[] = Array.isArray(record.breaks) ? [...record.breaks] : [];
    if (breaks.some(b => b.start && !b.end) || (record.break_start && !record.break_end)) {
      throw new AppError('Already on an active break', 400, 'BREAK_ALREADY_ACTIVE');
    }

    const nowISO = new Date().toISOString();
    breaks.push({ start: nowISO, end: null });

    const { data, error } = await supabase
      .from('attendance')
      .update({ breaks, updated_at: nowISO })
      .eq('id', record.id)
      .select()
      .single();

    if (error) throw dbError(error, 'breakStart');
    return data;
  }

  static async breakEnd(userId: string) {
    const record = await this.findOpenSession(userId);
    if (!record) {
      throw new AppError('No active clock-in session found to end break', 400, 'NO_ACTIVE_SESSION');
    }

    const breaks: BreakEntry[] = Array.isArray(record.breaks) ? [...record.breaks] : [];
    const hasOpenBreak = breaks.some(b => b.start && !b.end);
    const hasLegacyOpenBreak = !!record.break_start && !record.break_end;

    if (!hasOpenBreak && !hasLegacyOpenBreak) {
      throw new AppError('No active break found to end', 400, 'NO_ACTIVE_BREAK');
    }

    const nowISO = new Date().toISOString();
    const { data, error } = await supabase
      .from('attendance')
      .update({
        breaks: closeOpenBreaks(breaks, nowISO),
        break_end: hasLegacyOpenBreak ? nowISO : record.break_end,
        updated_at: nowISO
      })
      .eq('id', record.id)
      .select()
      .single();

    if (error) throw dbError(error, 'breakEnd');
    return data;
  }

  static async clockOut(user: UserProfile, clientIp: string | null) {
    const record = await this.findOpenSession(user.id);
    if (!record) {
      throw new AppError('No active clock-in session found to clock out', 404, 'NO_ACTIVE_SESSION');
    }

    const nowISO = new Date().toISOString();
    const { error } = await supabase
      .from('attendance')
      .update({
        clock_out: nowISO,
        breaks: closeOpenBreaks(record.breaks, nowISO),
        break_end: record.break_start && !record.break_end ? nowISO : record.break_end,
        updated_at: nowISO
      })
      .eq('id', record.id);

    if (error) throw dbError(error, 'clockOut');

    await this.recalculateDay(user.id, record.date, user.shift_start);

    const { data, error: fetchError } = await supabase.from('attendance').select('*').eq('id', record.id).single();
    if (fetchError) throw dbError(fetchError, 'clockOut fetch');

    await logAuditEvent({
      actor_id: user.id,
      action: 'ATTENDANCE_CLOCK_OUT',
      target_id: record.id,
      ip_address: clientIp,
      details: { clock_out: nowISO, total_hours: data.total_hours, overtime_hours: data.overtime_hours }
    });

    return data;
  }

  static async getHistory(userId: string, monthStr?: string) {
    const month = monthStr || currentMonthInZone(config.timeZone);
    if (!isValidMonth(month)) {
      throw new AppError('Month must be in YYYY-MM format', 400, 'INVALID_MONTH');
    }
    const { start, end } = monthRange(month);

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
      .order('clock_in', { ascending: false });

    if (error) throw dbError(error, 'getHistory');

    const records: AttendanceRecord[] = data || [];
    return { month, summary: summarizeRecords(records), data: records };
  }
}
