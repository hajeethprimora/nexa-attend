import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation error', 400, 'VALIDATION_ERROR', errors.array());
  }
  next();
};

export const validateLogin = [
  body('email').isEmail().withMessage('Valid email address is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];
