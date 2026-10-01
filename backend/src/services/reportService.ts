import supabase from '../utils/supabaseClient';
import config from '../config';
import { AppError, dbError } from '../middleware/errorHandler';
import { AttendanceRecord } from '../types';
import { AttendanceService, summarizeRecords } from './attendanceService';
import { calculateBreakHours } from './attendanceCalc';
import { calculateDays } from './leaveService';
import { addDays, countWorkingDays, currentMonthInZone, isValidMonth, minDate, monthRange, round2, timeInZone, todayInZone } from '../utils/time';
import { toCsv } from '../utils/csv';

interface ReportFilters {
  month?: string;
  department?: string;
  search?: string;
  userId?: string;
}

const resolveMonth = (month?: string) => {
  const m = month || currentMonthInZone(config.timeZone);
  if (!isValidMonth(m)) throw new AppError('Month must be in YYYY-MM format', 400, 'INVALID_MONTH');
  return m;
};

const isWeekend = (date: string) => config.weekendDays.includes(new Date(`${date}T00:00:00Z`).getUTCDay());

export class ReportService {
  private static async loadUsers(filters: ReportFilters) {
    let query = supabase.from('users').select('*').order('full_name', { ascending: true });
    if (filters.department) query = query.eq('department', filters.department);
    if (filters.userId) query = query.eq('id', filters.userId);
    const { data, error } = await query;
    if (error) throw dbError(error, 'report users');

    let users = data || [];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      users = users.filter(u =>
        u.full_name?.toLowerCase().includes(q) ||
        u.employee_id?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    return users;
  }

  private static async loadAttendance(userIds: string[], start: string, end: string): Promise<AttendanceRecord[]> {
    if (userIds.length === 0) return [];
    // Supabase caps responses (1000 rows by default), so page through the month
    const PAGE = 1000;
    const rows: AttendanceRecord[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .in('user_id', userIds)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })
        .order('clock_in', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw dbError(error, 'report attendance');
      rows.push(...(data || []));
      if (!data || data.length < PAGE) break;
    }
    return rows;
  }

  static async monthlySummary(filters: ReportFilters) {
    const month = resolveMonth(filters.month);
    const { start, end } = monthRange(month);
    const today = todayInZone(config.timeZone);

    await AttendanceService.closeStaleSessions();
    const allUsers = await this.loadUsers(filters);
    const attendance = await this.loadAttendance(allUsers.map(u => u.id), start, end);

    const userIdsWithRecords = new Set(attendance.map(a => a.user_id));
    // Deactivated employees are only included if they have data in this month
    const users = allUsers.filter(u => u.is_active !== false || userIdsWithRecords.has(u.id));

    const { data: leaves, error: leavesError } = users.length
      ? await supabase
          .from('leaves')
          .select('*')
          .in('user_id', users.map(u => u.id))
          .eq('status', 'approved')
          .lte('start_date', end)
          .gte('end_date', start)
      : { data: [], error: null };
    if (leavesError) throw dbError(leavesError, 'report leaves');

    // Working days already COMPLETED this month (today is still in progress, so it never counts as absent)
    const yesterday = addDays(today, -1);
    const expectedUntil = minDate(end, yesterday);
    const workingDaysElapsed = start > yesterday ? 0 : countWorkingDays(start, expectedUntil, config.weekendDays);
    const workingDaysInMonth = countWorkingDays(start, end, config.weekendDays);

    const rows = users.map(u => {
      const records = attendance.filter(a => a.user_id === u.id);
      const summary = summarizeRecords(records);
      const userLeaves = (leaves || []).filter(l => l.user_id === u.id);
      const leavesTaken = userLeaves.reduce((sum, l) => sum + calculateDays(l.start_date, l.end_date, start, end), 0);
      const leavesElapsed = userLeaves.reduce((sum, l) => sum + calculateDays(l.start_date, l.end_date, start, expectedUntil), 0);
      const weekdaysWorked = new Set(records.filter(r => !isWeekend(r.date) && r.date <= expectedUntil).map(r => r.date)).size;

      return {
        user_id: u.id,
        employee_id: u.employee_id,
        full_name: u.full_name,
        email: u.email || '',
        department: u.department || 'Engineering',
        role: u.role,
        is_active: u.is_active ?? true,
        total_days_worked: summary.days_worked,
        office_days: summary.office_days,
        remote_days: summary.remote_days,
        total_hours_worked: summary.total_hours,
        total_overtime_hours: summary.total_overtime_hours,
        late_days: summary.late_days,
        total_late_minutes: summary.total_late_minutes,
        leaves_taken: leavesTaken,
        absent_days: Math.max(0, workingDaysElapsed - weekdaysWorked - leavesElapsed),
        missed_clock_outs: summary.missed_clock_outs,
        avg_hours_per_day: summary.days_worked ? round2(summary.total_hours / summary.days_worked) : 0
      };
    });

    return { month, rows, workingDaysInMonth, workingDaysElapsed };
  }

  static async monthlySummaryCsv(filters: ReportFilters) {
    const { month, rows, workingDaysInMonth } = await this.monthlySummary(filters);
    const csv = toCsv(
      ['Employee ID', 'Full Name', 'Email', 'Department', 'Role', 'Active', 'Working Days In Month', 'Days Present', 'Office Days', 'WFH Days',
        'Total Hours', 'Overtime Hours', 'Avg Hours/Day', 'Late Days', 'Late Minutes', 'Leave Days', 'Absent Days', 'Missed Clock-outs'],
      rows.map(r => [
        r.employee_id, r.full_name, r.email, r.department, r.role, r.is_active, workingDaysInMonth, r.total_days_worked, r.office_days, r.remote_days,
        r.total_hours_worked, r.total_overtime_hours, r.avg_hours_per_day, r.late_days, r.total_late_minutes, r.leaves_taken, r.absent_days, r.missed_clock_outs
      ])
    );
    return { month, csv };
  }

  /** One row per attendance session: the raw data payroll / HR usually asks for. */
  static async detailedCsv(filters: ReportFilters) {
    const month = resolveMonth(filters.month);
    const { start, end } = monthRange(month);
    const users = await this.loadUsers(filters);
    const byId = new Map(users.map(u => [u.id, u]));
    const attendance = await this.loadAttendance(users.map(u => u.id), start, end);
    const tz = config.timeZone;

    const rows = attendance
      .sort((a, b) => (byId.get(a.user_id)?.full_name || '').localeCompare(byId.get(b.user_id)?.full_name || '') || a.clock_in.localeCompare(b.clock_in))
      .map(r => {
        const u = byId.get(r.user_id);
        const breakMinutes = Math.round(calculateBreakHours(r.breaks || [], r.break_start, r.break_end, r.clock_out) * 60);
        return [
          r.date,
          u?.employee_id || '',
          u?.full_name || '',
          u?.department || '',
          r.work_mode === 'remote' ? 'WFH' : 'Office',
          timeInZone(r.clock_in, tz),
          r.clock_out ? timeInZone(r.clock_out, tz) : 'Open',
          breakMinutes,
          Number(r.total_hours) || 0,
          Number(r.overtime_hours) || 0,
          r.late_minutes || 0,
          !!r.auto_closed,
          !!r.edited_at,
          r.edit_reason || '',
          r.notes || ''
        ];
      });

    const csv = toCsv(
      ['Date', 'Employee ID', 'Full Name', 'Department', 'Work Mode', `Clock In (${tz})`, `Clock Out (${tz})`, 'Break Minutes',
        'Worked Hours', 'Overtime Hours', 'Late Minutes', 'Auto-closed', 'Edited by Admin', 'Edit Reason', 'Notes'],
      rows
    );
    return { month, csv };
  }
}
