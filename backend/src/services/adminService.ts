import supabase from '../utils/supabaseClient';
import logger from '../utils/logger';
import { logAuditEvent } from '../utils/auditLogger';
import { sendLeaveStatusNotification } from '../utils/emailClient';
import { AppError } from '../middleware/errorHandler';
import { calculateDays } from './leaveService';
import { BreakEntry } from '../types';

export class AdminService {
  static async getUsersStatus() {
    const today = new Date().toISOString().split('T')[0];

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('full_name', { ascending: true });

    if (usersError) throw new AppError(usersError.message, 500, 'DB_ERROR');

    const { data: attendanceList, error: attError } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', today);

    if (attError) throw new AppError(attError.message, 500, 'DB_ERROR');

    const attendanceMap = new Map();
    (attendanceList || []).forEach(att => {
      attendanceMap.set(att.user_id, att);
    });

    const userStatusList = (users || []).map(u => {
      const att = attendanceMap.get(u.id);
      let status = 'Offline';
      let todayHours = 0;
      let overtimeHours = 0;
      let lateMinutes = 0;

      if (att) {
        todayHours = parseFloat(att.total_hours) || 0;
        overtimeHours = parseFloat(att.overtime_hours) || 0;
        lateMinutes = att.late_minutes || 0;

        if (att.clock_in && !att.clock_out) {
          const breaks: BreakEntry[] = Array.isArray(att.breaks) ? att.breaks : [];
          const openBreak = breaks.find((b: BreakEntry) => b.start && !b.end);
          if (openBreak || (att.break_start && !att.break_end)) {
            status = 'On Break';
          } else {
            status = 'Clocked In';
          }
        } else if (att.clock_out) {
          status = 'Clocked Out';
        }
      }

      return {
        id: u.id,
        employee_id: u.employee_id,
        full_name: u.full_name,
        role: u.role,
        department: u.department || 'Engineering',
        shift_start: u.shift_start || '09:00:00',
        shift_end: u.shift_end || '17:00:00',
        is_active: u.is_active ?? true,
        status,
        today_hours: todayHours,
        overtime_hours: overtimeHours,
        late_minutes: lateMinutes,
        clock_in: att?.clock_in || null,
        clock_out: att?.clock_out || null
      };
    });

    return userStatusList;
  }

  static async getPendingLeaves() {
    const { data: leaves, error: leavesError } = await supabase
      .from('leaves')
      .select('*, users!user_id(full_name, employee_id, department)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (leavesError) throw new AppError(leavesError.message, 500, 'DB_ERROR');

    return (leaves || []).map((l: any) => ({
      id: l.id,
      user_id: l.user_id,
      employee_id: l.users?.employee_id || 'N/A',
      employee_name: l.users?.full_name || 'Unknown',
      department: l.users?.department || 'Engineering',
      start_date: l.start_date,
      end_date: l.end_date,
      type: l.type,
      reason: l.reason,
      status: l.status,
      created_at: l.created_at
    }));
  }

  static async updateLeaveStatus(leaveId: string, status: 'approved' | 'rejected', adminComment: string, adminId: string, clientIp: string | null) {
    const { data: leaves, error: leaveError } = await supabase
      .from('leaves')
      .select('*, users!user_id(full_name, employee_id)')
      .eq('id', leaveId)
      .limit(1);

    const leave = leaves?.[0] || null;

    if (leaveError || !leave) {
      throw new AppError('Leave request not found', 404, 'NOT_FOUND');
    }

    const { data: updatedLeave, error: updateError } = await supabase
      .from('leaves')
      .update({
        status,
        admin_comment: adminComment || '',
        reviewed_by: adminId
      })
      .eq('id', leaveId)
      .select('*, users!user_id(full_name, employee_id)')
      .single();

    if (updateError) throw new AppError(updateError.message, 500, 'DB_ERROR');

    if (status === 'approved') {
      const days = calculateDays(leave.start_date, leave.end_date);
      const currentYear = new Date(leave.start_date).getFullYear();

      const { data: balances } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', leave.user_id)
        .eq('year', currentYear)
        .limit(1);

      const balance = balances?.[0] || null;

      if (balance) {
        const usedField = `${leave.type}_used`;
        const newUsedValue = (balance[usedField] || 0) + days;

        await supabase
          .from('leave_balances')
          .update({ [usedField]: newUsedValue })
          .eq('id', balance.id);
      }
    }

    await logAuditEvent({
      actor_id: adminId,
      action: `LEAVE_${status.toUpperCase()}`,
      target_id: leaveId,
      ip_address: clientIp,
      details: { status, admin_comment: adminComment, user_id: leave.user_id }
    });

    sendLeaveStatusNotification({
      recipientEmail: leave.users?.email || `${leave.users?.employee_id}@company.com`,
      employeeName: leave.users?.full_name || 'Employee',
      leaveType: leave.type,
      startDate: leave.start_date,
      endDate: leave.end_date,
      status,
      adminComment
    });

    return updatedLeave;
  }

  static async getMonthlyReport(monthStr?: string, departmentFilter?: string, searchQuery?: string) {
    const month = monthStr || new Date().toISOString().slice(0, 7);
    const startDate = `${month}-01`;
    const [yearStr, monthNumStr] = month.split('-');
    const year = parseInt(yearStr);
    const monthNum = parseInt(monthNumStr);
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${month}-${lastDay.toString().padStart(2, '0')}`;

    let usersQuery = supabase.from('users').select('*').order('full_name', { ascending: true });
    if (departmentFilter) usersQuery = usersQuery.eq('department', departmentFilter);

    const { data: users, error: usersError } = await usersQuery;
    if (usersError) throw new AppError(usersError.message, 500, 'DB_ERROR');

    const { data: attendanceList, error: attError } = await supabase
      .from('attendance')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (attError) throw new AppError(attError.message, 500, 'DB_ERROR');

    const { data: leavesList, error: leavesError } = await supabase
      .from('leaves')
      .select('*')
      .eq('status', 'approved')
      .gte('start_date', startDate)
      .lte('end_date', endDate);

    if (leavesError) throw new AppError(leavesError.message, 500, 'DB_ERROR');

    let reportData = (users || []).map(u => {
      const userAtt = (attendanceList || []).filter(a => a.user_id === u.id);
      const userLeaves = (leavesList || []).filter(l => l.user_id === u.id);

      const totalDaysWorked = userAtt.filter(a => a.clock_in).length;
      const totalHoursWorked = userAtt.reduce((sum, a) => sum + (parseFloat(a.total_hours) || 0), 0);
      const totalOvertime = userAtt.reduce((sum, a) => sum + (parseFloat(a.overtime_hours) || 0), 0);
      const totalLateMinutes = userAtt.reduce((sum, a) => sum + (a.late_minutes || 0), 0);
      const totalLeavesTaken = userLeaves.length;

      return {
        id: u.id,
        employee_id: u.employee_id,
        full_name: u.full_name,
        department: u.department || 'Engineering',
        role: u.role,
        total_days_worked: totalDaysWorked,
        total_hours_worked: Math.round((totalHoursWorked + Number.EPSILON) * 100) / 100,
        total_overtime_hours: Math.round((totalOvertime + Number.EPSILON) * 100) / 100,
        total_late_minutes: totalLateMinutes,
        leaves_taken: totalLeavesTaken
      };
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      reportData = reportData.filter(r =>
        r.full_name.toLowerCase().includes(q) ||
        r.employee_id.toLowerCase().includes(q)
      );
    }

    return { month, reportData };
  }

  static async getEmployees(search?: string, department?: string, role?: string) {
    let query = supabase.from('users').select('*').order('created_at', { ascending: false });

    if (department) query = query.eq('department', department);
    if (role) query = query.eq('role', role);

    const { data: users, error } = await query;
    if (error) throw new AppError(error.message, 500, 'DB_ERROR');

    let result = users || [];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u => u.full_name?.toLowerCase().includes(q) || u.employee_id?.toLowerCase().includes(q));
    }

    return result;
  }

  static async createEmployee(payload: any, adminId: string, clientIp: string | null) {
    const { email, password, employee_id, full_name, department, role, shift_start, shift_end } = payload;

    if (!email || !password || !employee_id || !full_name) {
      throw new AppError('Email, password, employee ID, and full name are required.', 400, 'VALIDATION_ERROR');
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { employee_id, full_name, role: role || 'employee', department: department || 'Engineering' }
    });

    if (authError) {
      throw new AppError(authError.message, 400, 'AUTH_CREATE_ERROR');
    }

    const newUserId = authData.user.id;

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .insert([{
        id: newUserId,
        employee_id,
        full_name,
        role: role || 'employee',
        department: department || 'Engineering',
        shift_start: shift_start || '09:00:00',
        shift_end: shift_end || '17:00:00',
        is_active: true
      }])
      .select()
      .single();

    if (profileError) {
      logger.error('Error creating public.users record:', profileError);
    }

    const currentYear = new Date().getFullYear();
    await supabase.from('leave_balances').insert([{
      user_id: newUserId,
      year: currentYear,
      sick_quota: 10,
      casual_quota: 12,
      vacation_quota: 15
    }]);

    await logAuditEvent({
      actor_id: adminId,
      action: 'EMPLOYEE_CREATED',
      target_id: newUserId,
      ip_address: clientIp,
      details: { email, employee_id, full_name, role, department }
    });

    return userProfile || { id: newUserId, employee_id, full_name, role, department };
  }

  static async updateEmployee(employeeId: string, payload: any, adminId: string, clientIp: string | null) {
    const { employee_id, full_name, department, role, shift_start, shift_end, is_active } = payload;

    const { data, error } = await supabase
      .from('users')
      .update({
        employee_id,
        full_name,
        department,
        role,
        shift_start: shift_start || '09:00:00',
        shift_end: shift_end || '17:00:00',
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', employeeId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500, 'DB_ERROR');

    await logAuditEvent({
      actor_id: adminId,
      action: 'EMPLOYEE_UPDATED',
      target_id: employeeId,
      ip_address: clientIp,
      details: { employee_id, full_name, department, role, is_active }
    });

    return data;
  }

  static async getAuditLogs(limit: number = 50) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, users!actor_id(full_name, employee_id)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new AppError(error.message, 500, 'DB_ERROR');
    return data || [];
  }
}
