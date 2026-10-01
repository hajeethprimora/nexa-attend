import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { isValidDate, isValidTime } from '../utils/time';

const time = z.string().trim().refine(isValidTime, 'Time must be HH:mm');
const date = z.string().trim().refine(isValidDate, 'Date must be YYYY-MM-DD');
const reason = z.string().trim().min(3, 'Please give a reason (min 3 characters)').max(500);

export const employeeCreateSchema = z.object({
  employee_id: z.string().trim().min(1).max(30).regex(/^[A-Za-z0-9_-]+$/, 'Employee ID may only contain letters, numbers, - and _'),
  full_name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  role: z.enum(['admin', 'employee']).default('employee'),
  department: z.string().trim().min(1).max(50).default('Engineering'),
  shift_start: time.default('09:00'),
  shift_end: time.default('17:00'),
  allow_remote: z.boolean().default(true),
  is_active: z.boolean().default(true)
});

export const employeeUpdateSchema = employeeCreateSchema
  .omit({ email: true, password: true })
  .partial()
  .extend({
    // Optional admin-initiated password reset
    new_password: z.string().min(8, 'Password must be at least 8 characters').max(72).optional().or(z.literal(''))
  });

const breakSchema = z.object({ start: time, end: time });

export const attendanceUpsertSchema = z.object({
  date,
  clock_in: time,
  clock_out: time.nullable().optional(),
  breaks: z.array(breakSchema).max(20).default([]),
  work_mode: z.enum(['office', 'remote']).default('office'),
  notes: z.string().trim().max(500).optional().default(''),
  reason
});

export const attendanceCreateSchema = attendanceUpsertSchema.extend({
  user_id: z.string().uuid()
});

export const attendanceDeleteSchema = z.object({ reason });

export const leaveBalanceSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  sick_quota: z.number().int().min(0).max(365),
  casual_quota: z.number().int().min(0).max(365),
  vacation_quota: z.number().int().min(0).max(365)
});

/** Express middleware: validates req.body against a zod schema and replaces it with the parsed value. */
export const validateBody = (schema: z.ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const first = result.error.issues[0];
    const message = first ? `${first.path.join('.') || 'body'}: ${first.message}` : 'Validation error';
    return sendError(res, message, 400, 'VALIDATION_ERROR', result.error.issues);
  }
  req.body = result.data;
  next();
};
