import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return sendError(res, first?.msg || 'Validation error', 400, 'VALIDATION_ERROR', errors.array());
  }
  next();
};

export const validateSignup = [
  body('email').isEmail().withMessage('Valid email address is required').normalizeEmail({ gmail_remove_dots: false }),
  body('password').isLength({ min: 8, max: 72 }).withMessage('Password must be 8-72 characters'),
  body('full_name').trim().notEmpty().withMessage('Full name is required').isLength({ max: 100 }),
  body('department').optional().isString().trim().isLength({ max: 50 }),
  handleValidationErrors
];
