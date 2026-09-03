import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserProfile } from '../types';
import supabase from '../utils/supabaseClient';
import { sendError } from '../utils/response';
import logger from '../utils/logger';

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Unauthorized: No token provided', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      return sendError(res, 'Unauthorized: Invalid or expired token', 401, 'UNAUTHORIZED');
    }

    const { data: userRows, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .limit(1);

    const userData = userRows?.[0] || null;

    const userProfile: UserProfile = userData
      ? {
          id: userData.id,
          employee_id: userData.employee_id,
          full_name: userData.full_name,
          email: authData.user.email || '',
          role: userData.role || 'employee',
          department: userData.department || 'Engineering',
          shift_start: userData.shift_start || '09:00:00',
          shift_end: userData.shift_end || '17:00:00',
          is_active: userData.is_active ?? true
        }
      : {
          id: authData.user.id,
          employee_id: authData.user.user_metadata?.employee_id || 'EMP001',
          full_name: authData.user.user_metadata?.full_name || authData.user.email || 'User',
          email: authData.user.email || '',
          role: authData.user.user_metadata?.role || 'employee',
          department: authData.user.user_metadata?.department || 'Engineering',
          shift_start: '09:00:00',
          shift_end: '17:00:00',
          is_active: true
        };

    if (!userProfile.is_active) {
      return sendError(res, 'Forbidden: Account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
    }

    req.user = userProfile;
    next();
  } catch (error: any) {
    logger.error('Auth Middleware Exception:', error);
    return sendError(res, 'Internal server error during authentication', 500, 'INTERNAL_ERROR');
  }
};

export const adminOnly = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return sendError(res, 'Forbidden: Admin access required', 403, 'FORBIDDEN_ADMIN_ONLY');
  }
  next();
};
