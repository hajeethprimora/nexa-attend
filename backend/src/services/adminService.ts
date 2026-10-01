import { z } from 'zod';
import supabase from '../utils/supabaseClient';
import logger from '../utils/logger';
import config from '../config';
import { logAuditEvent } from '../utils/auditLogger';
import { AppError, dbError } from '../middleware/errorHandler';
import { AttendanceRecord } from '../types';
import { AttendanceService, getRecordStatus } from './attendanceService';
import { LeaveService } from './leaveService';
import { sessionNetHours } from './attendanceCalc';
import { round2, todayInZone } from '../utils/time';
import { employeeCreateSchema, employeeUpdateSchema } from '../validators/adminValidators';

type EmployeeCreate = z.infer<typeof employeeCreateSchema>;
type EmployeeUpdate = z.infer<typeof employeeUpdateSchema>;

const toDbTime = (t: string) => (t.length === 5 ? `${t}:00` : t);
const BAN_FOREVER = '876000h';

export class AdminService {
  static async getUsersStatus() {
    await AttendanceService.closeStaleSessions();
    const today = todayInZone(config.timeZone);

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .order('full_name', { ascending: true });
    if (usersError) throw dbError(usersError, 'getUsersStatus users');

    // Today's sessions plus any still-open session that started before midnight
    const { data: attendanceList, error: attError } = await supabase
      .from('attendance')
      .select('*')
      .or(`date.eq.${today},clock_out.is.null`);
    if (attError) throw dbError(attError, 'getUsersStatus attendance');

    const byUser = new Map<string, AttendanceRecord[]>();
    (attendanceList || []).forEach((att: AttendanceRecord) => {
      const list = byUser.get(att.user_id) || [];
      list.push(att);
      byUser.set(att.user_id, list);
    });

    return (users || []).map(u => {
      const sessions = (byUser.get(u.id) || []).sort((a, b) => a.clock_in.localeCompare(b.clock_in));
      const open = sessions.find(s => !s.clock_out) || null;
      const latest = open || sessions[sessions.length - 1] || null;
      const todaySessions = sessions.filter(s => s.date === today);

      return {
        id: u.id,
        employee_id: u.employee_id,
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        department: u.department || 'Engineering',
        shift_start: u.shift_start || '09:00:00',
        shift_end: u.shift_end || '17:00:00',
        is_active: u.is_active ?? true,
        allow_remote: u.allow_remote ?? true,
        status: getRecordStatus(latest),
        work_mode: latest?.work_mode || null,
        today_hours: round2(sessions.reduce((sum, s) => sum + (s.clock_out ? Number(s.total_hours) || 0 : sessionNetHours(s)), 0)),
        overtime_hours: round2(todaySessions.reduce((sum, s) => sum + (Number(s.overtime_hours) || 0), 0)),
        late_minutes: todaySessions[0]?.late_minutes || 0,
        clock_in: sessions[0]?.clock_in || null,
        clock_out: open ? null : latest?.clock_out || null
      };
    });
  }

  static async getEmployees(search?: string, department?: string, role?: string) {
    let query = supabase.from('users').select('*').order('full_name', { ascending: true });
    if (department) query = query.eq('department', department);
    if (role === 'admin' || role === 'employee') query = query.eq('role', role);

    const { data: users, error } = await query;
    if (error) throw dbError(error, 'getEmployees');

    let result = users || [];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        u.full_name?.toLowerCase().includes(q) ||
        u.employee_id?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    return result;
  }

  static async createEmployee(payload: EmployeeCreate, adminId: string, clientIp: string | null) {
    const { employee_id, full_name, email, password, role, department, shift_start, shift_end, allow_remote, is_active } = payload;

    const { data: existingUser, error: existingError } = await supabase
      .from('users')
      .select('id')
      .eq('employee_id', employee_id)
      .limit(1);
    if (existingError) throw dbError(existingError, 'createEmployee duplicate check');
    if (existingUser && existingUser.length > 0) {
      throw new AppError(`Employee ID ${employee_id} is already in use.`, 409, 'DUPLICATE_EMPLOYEE_ID');
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, employee_id, department }
    });

    if (authError || !authData?.user) {
      const msg = authError?.message || 'Failed to create login account';
      const alreadyExists = /already|registered|exists/i.test(msg);
      throw new AppError(alreadyExists ? `An account with email ${email} already exists.` : msg, alreadyExists ? 409 : 400, 'AUTH_ERROR');
    }
    const newUserId = authData.user.id;

    // The DB trigger creates a default profile; overwrite it with the admin's values.
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .upsert({
        id: newUserId,
        employee_id,
        email,
        full_name,
        role,
        department,
        shift_start: toDbTime(shift_start),
        shift_end: toDbTime(shift_end),
        allow_remote,
        is_active
      })
      .select()
      .single();

    if (profileError) {
      // Roll back the auth account so the admin can retry cleanly
      await supabase.auth.admin.deleteUser(newUserId).catch(err => logger.error('Rollback deleteUser failed:', err));
      throw dbError(profileError, 'createEmployee profile');
    }

    await supabase
      .from('leave_balances')
      .upsert({ user_id: newUserId, year: Number(todayInZone(config.timeZone).slice(0, 4)) }, { onConflict: 'user_id,year', ignoreDuplicates: true });

    if (!is_active) {
      await supabase.auth.admin.updateUserById(newUserId, { ban_duration: BAN_FOREVER } as any);
    }

    await logAuditEvent({
      actor_id: adminId,
      action: 'EMPLOYEE_CREATED',
      target_id: newUserId,
      ip_address: clientIp,
      details: { employee_id, full_name, email, role, department, allow_remote }
    });

    return userProfile;
  }

  private static async countOtherActiveAdmins(excludeId: string): Promise<number> {
    const { count, error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('is_active', true)
      .neq('id', excludeId);
    if (error) throw dbError(error, 'countOtherActiveAdmins');
    return count || 0;
  }

  static async updateEmployee(employeeId: string, payload: EmployeeUpdate, adminId: string, clientIp: string | null) {
    const { data: existingRows, error: existingError } = await supabase.from('users').select('*').eq('id', employeeId).limit(1);
    if (existingError) throw dbError(existingError, 'updateEmployee select');
    const existing = existingRows?.[0];
    if (!existing) throw new AppError('Employee not found', 404, 'NOT_FOUND');

    const removingAdmin = existing.role === 'admin' && (payload.role === 'employee' || payload.is_active === false);
    if (removingAdmin && employeeId === adminId) {
      throw new AppError('You cannot remove your own admin access or deactivate yourself.', 400, 'SELF_LOCKOUT');
    }
    if (removingAdmin && (await this.countOtherActiveAdmins(employeeId)) === 0) {
      throw new AppError('At least one active administrator must remain.', 400, 'LAST_ADMIN');
    }

    if (payload.employee_id && payload.employee_id !== existing.employee_id) {
      const { data: dup } = await supabase.from('users').select('id').eq('employee_id', payload.employee_id).neq('id', employeeId).limit(1);
      if (dup && dup.length > 0) {
        throw new AppError(`Employee ID ${payload.employee_id} is already in use.`, 409, 'DUPLICATE_EMPLOYEE_ID');
      }
    }

    const updateFields: Record<string, unknown> = {};
    (['full_name', 'employee_id', 'role', 'department', 'allow_remote', 'is_active'] as const).forEach(key => {
      if (payload[key] !== undefined) updateFields[key] = payload[key];
    });
    if (payload.shift_start) updateFields.shift_start = toDbTime(payload.shift_start);
    if (payload.shift_end) updateFields.shift_end = toDbTime(payload.shift_end);
    updateFields.updated_at = new Date().toISOString();

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateFields)
      .eq('id', employeeId)
      .select()
      .single();
    if (error) throw dbError(error, 'updateEmployee update');

    const authUpdate: Record<string, unknown> = {};
    if (payload.is_active !== undefined && payload.is_active !== existing.is_active) {
      authUpdate.ban_duration = payload.is_active ? 'none' : BAN_FOREVER;
    }
    if (payload.new_password) authUpdate.password = payload.new_password;

    if (Object.keys(authUpdate).length > 0) {
      const { error: authError } = await supabase.auth.admin.updateUserById(employeeId, authUpdate as any);
      if (authError) {
        logger.error('updateEmployee auth update failed:', authError);
        throw new AppError(`Profile saved, but updating the login account failed: ${authError.message}`, 500, 'AUTH_UPDATE_FAILED');
      }
    }

    const { new_password, ...auditable } = payload;
    await logAuditEvent({
      actor_id: adminId,
      action: 'EMPLOYEE_UPDATED',
      target_id: employeeId,
      ip_address: clientIp,
      details: { ...auditable, password_reset: !!new_password }
    });

    return updatedUser;
  }

  static async getLeaveBalance(userId: string, year: number) {
    return LeaveService.getOrCreateLeaveBalance(userId, year);
  }

  static async updateLeaveBalance(
    userId: string,
    payload: { year: number; sick_quota: number; casual_quota: number; vacation_quota: number },
    adminId: string,
    clientIp: string | null
  ) {
    const balance = await this.getLeaveBalance(userId, payload.year);
    const { data, error } = await supabase
      .from('leave_balances')
      .update({
        sick_quota: payload.sick_quota,
        casual_quota: payload.casual_quota,
        vacation_quota: payload.vacation_quota,
        updated_at: new Date().toISOString()
      })
      .eq('id', balance.id)
      .select()
      .single();
    if (error) throw dbError(error, 'updateLeaveBalance');

    await logAuditEvent({
      actor_id: adminId,
      action: 'LEAVE_QUOTA_UPDATED',
      target_id: userId,
      ip_address: clientIp,
      details: { before: { sick: balance.sick_quota, casual: balance.casual_quota, vacation: balance.vacation_quota }, after: payload }
    });
    return data;
  }

  static async getAuditLogs(limit: number = 50, action?: string) {
    const safeLimit = Math.min(Math.max(Number.isFinite(limit) ? limit : 50, 1), 200);
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(safeLimit);
    if (action) query = query.eq('action', action);

    const { data, error } = await query;
    if (error) throw dbError(error, 'getAuditLogs');

    const actorIds = [...new Set((data || []).map(l => l.actor_id).filter(Boolean))];
    const names = new Map<string, { full_name: string; employee_id: string }>();
    if (actorIds.length > 0) {
      const { data: actors } = await supabase.from('users').select('id, full_name, employee_id').in('id', actorIds);
      (actors || []).forEach(a => names.set(a.id, { full_name: a.full_name, employee_id: a.employee_id }));
    }

    return (data || []).map(l => ({ ...l, users: l.actor_id ? names.get(l.actor_id) || null : null }));
  }
}
