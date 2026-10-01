import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import supabase from '../utils/supabaseClient';
import config from '../config';
import { sendSuccess } from '../utils/response';
import logger from '../utils/logger';
import { logAuditEvent } from '../utils/auditLogger';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { NotificationService } from '../services/notificationService';
import { todayInZone } from '../utils/time';
import { clientIp } from './attendanceController';

/** Public, non-sensitive settings the frontend needs before login. */
export const publicConfig = (req: AuthenticatedRequest, res: Response) =>
  sendSuccess(res, {
    company_name: config.companyName,
    allow_public_signup: config.allowPublicSignup,
    allowed_email_domains: config.allowedEmailDomains,
    timezone: config.timeZone
  });

export const signup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!config.allowPublicSignup) {
    throw new AppError('Self-registration is disabled. Please ask your administrator to create your account.', 403, 'SIGNUP_DISABLED');
  }

  const { email, password, full_name, department } = req.body;
  const normalizedEmail = String(email).toLowerCase();
  const domain = normalizedEmail.split('@')[1];

  if (config.allowedEmailDomains.length > 0 && !config.allowedEmailDomains.includes(domain)) {
    throw new AppError(`Please register with your company email (${config.allowedEmailDomains.map(d => '@' + d).join(', ')}).`, 403, 'EMAIL_DOMAIN_NOT_ALLOWED');
  }

  const employeeId = `EMP-${Math.floor(100000 + Math.random() * 900000)}`;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name, employee_id: employeeId, department: department || 'Engineering' }
  });

  if (authError || !authData?.user) {
    const msg = authError?.message || 'Failed to create user account';
    if (/already|registered|exists/i.test(msg)) {
      throw new AppError('An account with this email already exists. Try logging in.', 409, 'ACCOUNT_EXISTS');
    }
    throw new AppError(msg, 400, 'SIGNUP_ERROR');
  }

  const userId = authData.user.id;

  // The DB trigger creates the profile with role 'employee'; make sure the row reflects the form.
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .upsert({
      id: userId,
      employee_id: employeeId,
      email: normalizedEmail,
      full_name,
      role: 'employee',
      department: department || 'Engineering'
    })
    .select()
    .single();

  if (profileError) {
    logger.error('Signup profile upsert failed:', profileError);
    await supabase.auth.admin.deleteUser(userId).catch(() => undefined);
    throw new AppError('Could not create your employee profile. Please try again.', 500, 'SIGNUP_ERROR');
  }

  await supabase
    .from('leave_balances')
    .upsert({ user_id: userId, year: Number(todayInZone(config.timeZone).slice(0, 4)) }, { onConflict: 'user_id,year', ignoreDuplicates: true });

  await logAuditEvent({
    actor_id: userId,
    action: 'USER_SELF_REGISTERED',
    target_id: userId,
    ip_address: clientIp(req),
    details: { email: normalizedEmail, full_name, employee_id: employeeId, department }
  });

  return sendSuccess(res, { user: { ...userProfile, email: normalizedEmail } }, 'Account created successfully', 201);
});

export const me = (req: AuthenticatedRequest, res: Response) =>
  sendSuccess(res, {
    user: req.user,
    settings: {
      timezone: config.timeZone,
      standard_workday_hours: config.standardWorkdayHours,
      company_name: config.companyName
    }
  }, 'Profile fetched successfully');

export const notifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await NotificationService.forUser(req.user!);
  return sendSuccess(res, data, 'Notifications fetched');
});
