import supabase from '../utils/supabaseClient';
import logger from '../utils/logger';
import { logAuditEvent } from '../utils/auditLogger';
import { AttendanceRecord, BreakEntry, UserProfile } from '../types';
import { AppError } from '../middleware/errorHandler';

export const calculateBreakHours = (breaks: BreakEntry[], legacyStart?: string | null, legacyEnd?: string | null, currentTimeISO: string | null = null): number => {
  let totalBreakMs = 0;

  if (Array.isArray(breaks) && breaks.length > 0) {
    breaks.forEach(b => {
      if (b.start) {
        const startMs = new Date(b.start).getTime();
        const endMs = b.end ? new Date(b.end).getTime() : (currentTimeISO ? new Date(currentTimeISO).getTime() : Date.now());
        if (endMs > startMs) {
          totalBreakMs += (endMs - startMs);
        }
      }
    });
  } else if (legacyStart) {
    const startMs = new Date(legacyStart).getTime();
    const endMs = legacyEnd ? new Date(legacyEnd).getTime() : (currentTimeISO ? new Date(currentTimeISO).getTime() : Date.now());
    if (endMs > startMs) {
      totalBreakMs += (endMs - startMs);
    }
  }

  return totalBreakMs / (1000 * 60 * 60);
};

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

export class AttendanceService {
  static async getTodayStatus(userId: string) {
    const todayStr = new Date().toISOString().split('T')[0];

    let { data: record, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .maybeSingle();

    if (error) throw new AppError(error.message, 500, 'DB_ERROR');

    if (!record) {
      const { data: todayRecord, error: todayError } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId)
        .eq('date', todayStr)
        .order('clock_in', { ascending: false })
        .maybeSingle();

      if (todayError) throw new AppError(todayError.message, 500, 'DB_ERROR');
      record = todayRecord;
    }

    const status = getRecordStatus(record);
    return { record, status };
  }

  static async clockIn(user: UserProfile, payload: { lat?: number; lng?: number; notes?: string }, clientIp: string | null) {
    const todayStr = new Date().toISOString().split('T')[0];

    const { data: activeSession, error: checkError } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user.id)
      .is('clock_out', null)
      .maybeSingle();

    if (checkError) throw new AppError(checkError.message, 500, 'DB_ERROR');

    if (activeSession) {
      throw new AppError('You already have an active clock-in session. Please clock out first.', 400, 'SESSION_ALREADY_ACTIVE');
    }

    const nowISO = new Date().toISOString();

    let lateMinutes = 0;
    if (user.shift_start) {
      const [shiftHour, shiftMin] = user.shift_start.split(':').map(Number);
      const clockInDate = new Date(nowISO);
      const expectedTime = new Date(clockInDate);
      expectedTime.setHours(shiftHour, shiftMin, 0, 0);

      if (clockInDate > expectedTime) {
        lateMinutes = Math.floor((clockInDate.getTime() - expectedTime.getTime()) / (1000 * 60));
      }
    }

    const { data, error } = await supabase
      .from('attendance')
      .insert([{
        user_id: user.id,
        date: todayStr,
        clock_in: nowISO,
        breaks: [],
        late_minutes: lateMinutes,
        ip_address: clientIp,
        location_lat: payload.lat || null,
        location_lng: payload.lng || null,
        notes: payload.notes || ''
      }])
      .select()
      .single();

    if (error) throw new AppError(error.message, 500, 'DB_ERROR');

    await logAuditEvent({
      actor_id: user.id,
      action: 'ATTENDANCE_CLOCK_IN',
      target_id: data.id,
      ip_address: clientIp,
      details: { clock_in: nowISO, lateMinutes, lat: payload.lat, lng: payload.lng }
    });

    return data;
  }

  static async breakStart(userId: string) {
    const { data: record, error: findError } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .is('clock_out', null)
      .maybeSingle();

    if (findError || !record) {
      throw new AppError('No active clock-in session found to start a break', 400, 'NO_ACTIVE_SESSION');
    }

    const breaks: BreakEntry[] = Array.isArray(record.breaks) ? [...record.breaks] : [];
    const openBreak = breaks.find(b => b.start && !b.end);

    if (openBreak || (record.break_start && !record.break_end)) {
      throw new AppError('Already on an active break', 400, 'BREAK_ALREADY_ACTIVE');
    }

    const nowISO = new Date().toISOString();
    breaks.push({ start: nowISO, end: null });

    const { data, error } = await supabase
      .from('attendance')
      .update({
        breaks,
        break_start: record.break_start || nowISO
      })
      .eq('id', record.id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500, 'DB_ERROR');
    return data;
  }

  static async breakEnd(userId: string) {
    const { data: record, error: findError } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .is('clock_out', null)
      .maybeSingle();

    if (findError || !record) {
      throw new AppError('No active clock-in session found to end break', 400, 'NO_ACTIVE_SESSION');
    }

    const breaks: BreakEntry[] = Array.isArray(record.breaks) ? [...record.breaks] : [];
    const openBreakIndex = breaks.findIndex(b => b.start && !b.end);

    if (openBreakIndex === -1 && (!record.break_start || record.break_end)) {
      throw new AppError('No active break found to end', 400, 'NO_ACTIVE_BREAK');
    }

    const nowISO = new Date().toISOString();

    if (openBreakIndex !== -1) {
      breaks[openBreakIndex].end = nowISO;
    }

    const { data, error } = await supabase
      .from('attendance')
      .update({
        breaks,
        break_end: record.break_start && !record.break_end ? nowISO : record.break_end
      })
      .eq('id', record.id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500, 'DB_ERROR');
    return data;
  }

  static async clockOut(userId: string, clientIp: string | null) {
    const { data: record, error: findError } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .is('clock_out', null)
      .maybeSingle();

    if (findError || !record) {
      throw new AppError('No active clock-in session found to clock out', 404, 'NO_ACTIVE_SESSION');
    }

    const nowISO = new Date().toISOString();
    const clockInMs = new Date(record.clock_in).getTime();
    const clockOutMs = new Date(nowISO).getTime();

    const breaks: BreakEntry[] = Array.isArray(record.breaks) ? [...record.breaks] : [];
    const openBreakIndex = breaks.findIndex(b => b.start && !b.end);
    if (openBreakIndex !== -1) {
      breaks[openBreakIndex].end = nowISO;
    }

    const breakHours = calculateBreakHours(breaks, record.break_start, record.break_end, nowISO);

    const grossHours = (clockOutMs - clockInMs) / (1000 * 60 * 60);
    const netWorkedHours = Math.max(0, grossHours - breakHours);
    const finalTotalHours = Math.round((netWorkedHours + Number.EPSILON) * 100) / 100;

    const STANDARD_WORKDAY_HOURS = 8.0;
    const overtimeHours = finalTotalHours > STANDARD_WORKDAY_HOURS
      ? Math.round(((finalTotalHours - STANDARD_WORKDAY_HOURS) + Number.EPSILON) * 100) / 100
      : 0.0;

    const { data, error } = await supabase
      .from('attendance')
      .update({
        clock_out: nowISO,
        breaks,
        break_end: record.break_start && !record.break_end ? nowISO : record.break_end,
        total_hours: finalTotalHours,
        overtime_hours: overtimeHours
      })
      .eq('id', record.id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500, 'DB_ERROR');

    await logAuditEvent({
      actor_id: userId,
      action: 'ATTENDANCE_CLOCK_OUT',
      target_id: record.id,
      ip_address: clientIp,
      details: { clock_out: nowISO, total_hours: finalTotalHours, overtime_hours: overtimeHours }
    });

    return data;
  }

  static async getHistory(userId: string, monthStr?: string) {
    const month = monthStr || new Date().toISOString().slice(0, 7);
    const startDate = `${month}-01`;
    const [yearStr, monthNumStr] = month.split('-');
    const year = parseInt(yearStr);
    const monthNum = parseInt(monthNumStr);
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${month}-${lastDay.toString().padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw new AppError(error.message, 500, 'DB_ERROR');

    const records: AttendanceRecord[] = data || [];
    const totalHoursMonth = records.reduce((acc, curr) => acc + (parseFloat(curr.total_hours as any) || 0), 0);
    const totalOvertimeMonth = records.reduce((acc, curr) => acc + (parseFloat(curr.overtime_hours as any) || 0), 0);
    const totalLateMinutesMonth = records.reduce((acc, curr) => acc + (curr.late_minutes || 0), 0);
    const daysWorkedMonth = records.filter(r => r.clock_in).length;

    return {
      month,
      summary: {
        total_hours: Math.round((totalHoursMonth + Number.EPSILON) * 100) / 100,
        total_overtime_hours: Math.round((totalOvertimeMonth + Number.EPSILON) * 100) / 100,
        total_late_minutes: totalLateMinutesMonth,
        days_worked: daysWorkedMonth
      },
      data: records
    };
  }
}
