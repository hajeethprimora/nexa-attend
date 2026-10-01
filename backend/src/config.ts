import dotenv from 'dotenv';

dotenv.config();

const list = (value: string | undefined): string[] =>
  (value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

const num = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isValidTimeZone = (tz: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const rawTimeZone = process.env.APP_TIMEZONE || 'UTC';

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: num(process.env.PORT, 5000),

  // Comma-separated list of allowed browser origins, e.g. "https://softnixattend.netlify.app"
  frontendUrls: list(process.env.FRONTEND_URL).map(u => u.replace(/\/+$/, '')),

  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  companyName: process.env.COMPANY_NAME || 'Softnix',
  // All "today", late-arrival and report calculations happen in this zone (IANA name, e.g. Asia/Kolkata)
  timeZone: isValidTimeZone(rawTimeZone) ? rawTimeZone : 'UTC',
  timeZoneInvalid: !isValidTimeZone(rawTimeZone),
  standardWorkdayHours: num(process.env.STANDARD_WORKDAY_HOURS, 8),
  lateGraceMinutes: num(process.env.LATE_GRACE_MINUTES, 0),
  // Open sessions older than this are auto-closed and flagged for admin review
  maxSessionHours: num(process.env.MAX_SESSION_HOURS, 16),
  // 0 = Sunday ... 6 = Saturday
  weekendDays: list(process.env.WEEKEND_DAYS || '0,6').map(Number).filter(n => n >= 0 && n <= 6),

  // Self-registration is OFF by default: admins create accounts from the Employees page
  allowPublicSignup: process.env.ALLOW_PUBLIC_SIGNUP === 'true',
  allowedEmailDomains: list(process.env.ALLOWED_EMAIL_DOMAINS).map(d => d.toLowerCase()),

  adminNotificationEmails: list(process.env.ADMIN_EMAIL),

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: num(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || `"${process.env.COMPANY_NAME || 'Softnix'} Attend" <${process.env.SMTP_USER || 'noreply@example.com'}>`
  }
};

export default config;
