export type UserRole = 'admin' | 'employee';

export interface User {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department: string;
  shift_start?: string;
  shift_end?: string;
  is_active?: boolean;
}

export interface BreakEntry {
  start: string;
  end: string | null;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  clock_in: string;
  clock_out: string | null;
  break_start?: string | null;
  break_end?: string | null;
  breaks: BreakEntry[];
  total_hours: number;
  overtime_hours?: number;
  late_minutes?: number;
  notes?: string | null;
}

export type LeaveType = 'sick' | 'casual' | 'vacation';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  user_id: string;
  employee_id?: string;
  employee_name?: string;
  department?: string;
  start_date: string;
  end_date: string;
  type: LeaveType;
  reason?: string;
  status: LeaveStatus;
  admin_comment?: string;
  created_at: string;
}

export interface LeaveBalance {
  sick_quota: number;
  casual_quota: number;
  vacation_quota: number;
  sick_used: number;
  casual_used: number;
  vacation_used: number;
}

export interface EmployeeStatus {
  id: string;
  employee_id: string;
  full_name: string;
  role: UserRole;
  department: string;
  shift_start?: string;
  shift_end?: string;
  is_active: boolean;
  status: 'Clocked In' | 'On Break' | 'Clocked Out' | 'Offline';
  today_hours: number;
  overtime_hours?: number;
  late_minutes?: number;
  clock_in?: string | null;
  clock_out?: string | null;
}

export interface MonthlyReportRow {
  id: string;
  employee_id: string;
  full_name: string;
  department: string;
  role: UserRole;
  total_days_worked: number;
  total_hours_worked: number;
  total_overtime_hours?: number;
  total_late_minutes?: number;
  leaves_taken: number;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  target_id?: string;
  details?: any;
  ip_address?: string;
  created_at: string;
  users?: {
    full_name: string;
    employee_id: string;
  };
}
