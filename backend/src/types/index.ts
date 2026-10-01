import { Request } from 'express';

export type UserRole = 'admin' | 'employee';
export type WorkMode = 'office' | 'remote';

export interface UserProfile {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department: string;
  shift_start?: string;
  shift_end?: string;
  allow_remote: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthenticatedRequest extends Request<any, any, any, any> {
  user?: UserProfile;
  requestId?: string;
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
  work_mode: WorkMode;
  auto_closed?: boolean;
  edited_by?: string | null;
  edited_at?: string | null;
  edit_reason?: string | null;
  ip_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type LeaveType = 'sick' | 'casual' | 'vacation';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  type: LeaveType;
  reason?: string;
  status: LeaveStatus;
  admin_comment?: string;
  reviewed_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LeaveBalance {
  id: string;
  user_id: string;
  year: number;
  sick_quota: number;
  casual_quota: number;
  vacation_quota: number;
  sick_used: number;
  casual_used: number;
  vacation_used: number;
  created_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    [key: string]: any;
  };
}
