import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import supabase from '../utils/supabaseClient';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

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

export const me = async (req: AuthenticatedRequest, res: Response) => {
  try {
    return sendSuccess(res, { user: req.user }, 'Profile fetched successfully');
  } catch (error: any) {
    logger.error('Me Controller Error:', error);
    return sendError(res, 'Server error fetching user profile', 500, 'SERVER_ERROR');
  }
};
