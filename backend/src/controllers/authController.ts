import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import supabase from '../utils/supabaseClient';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';
import { logAuditEvent } from '../utils/auditLogger';

export const login = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400, 'VALIDATION_ERROR');
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.session) {
      return sendError(res, authError?.message || 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    const userProfile = userData || {
      id: authData.user.id,
      email: authData.user.email,
      employee_id: authData.user.user_metadata?.employee_id || 'EMP001',
      full_name: authData.user.user_metadata?.full_name || authData.user.email,
      role: authData.user.user_metadata?.role || 'employee',
      department: authData.user.user_metadata?.department || 'Engineering'
    };

    return sendSuccess(res, {
      user: {
        ...userProfile,
        email: authData.user.email
      },
      session: authData.session
    }, 'Login successful');
  } catch (error: any) {
    logger.error('Login Error:', error);
    return sendError(res, 'Server error during login', 500, 'SERVER_ERROR');
  }
};

export const signup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, full_name, employee_id, department } = req.body;

    if (!email || !password || !full_name) {
      return sendError(res, 'Email, password, and full name are required', 400, 'VALIDATION_ERROR');
    }

    const empId = employee_id || `EMP-${Math.floor(100000 + Math.random() * 900000)}`;
    const userDepartment = department || 'Engineering';
    const defaultRole = 'employee';

    let userId: string;

    // Try admin createUser to bypass email verification block for production usability
    const { data: adminAuthData, error: adminAuthError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        employee_id: empId,
        department: userDepartment,
        role: defaultRole
      }
    });

    if (!adminAuthError && adminAuthData?.user) {
      userId = adminAuthData.user.id;
    } else {
      // Fallback to standard signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
            employee_id: empId,
            department: userDepartment,
            role: defaultRole
          }
        }
      });

      if (authError || !authData.user) {
        return sendError(res, authError?.message || 'Failed to create user account', 400, 'SIGNUP_ERROR');
      }
      userId = authData.user.id;
    }

    // Insert public.users record
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        employee_id: empId,
        full_name,
        role: defaultRole,
        department: userDepartment,
        shift_start: '09:00:00',
        shift_end: '17:00:00',
        is_active: true
      })
      .select()
      .single();

    if (profileError) {
      logger.error('Error inserting public.users profile during signup:', profileError);
    }

    // Initialize leave balance
    const currentYear = new Date().getFullYear();
    await supabase.from('leave_balances').upsert({
      user_id: userId,
      year: currentYear,
      sick_quota: 10,
      casual_quota: 12,
      vacation_quota: 15,
      sick_used: 0,
      casual_used: 0,
      vacation_used: 0
    });

    await logAuditEvent({
      actor_id: userId,
      action: 'USER_SELF_REGISTERED',
      target_id: userId,
      ip_address: req.ip || null,
      details: { email, full_name, employee_id: empId, department: userDepartment }
    });

    // Sign in to establish active session
    const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });

    return sendSuccess(res, {
      user: userProfile || {
        id: userId,
        email,
        employee_id: empId,
        full_name,
        role: defaultRole,
        department: userDepartment
      },
      session: signInData?.session || null
    }, 'Account created successfully', 201);
  } catch (error: any) {
    logger.error('Signup Error:', error);
    return sendError(res, 'Server error during account registration', 500, 'SERVER_ERROR');
  }
};

export const me = async (req: AuthenticatedRequest, res: Response) => {
  try {
    return sendSuccess(res, { user: req.user }, 'Profile fetched successfully');
  } catch (error: any) {
    logger.error('Me Controller Error:', error);
    return sendError(res, 'Server error fetching user profile', 500, 'SERVER_ERROR');
  }
};
