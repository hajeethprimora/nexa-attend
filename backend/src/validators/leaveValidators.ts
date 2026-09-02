import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation error', 400, 'VALIDATION_ERROR', errors.array());
  }
  next();
};

export const validateCreateLeave = [
  body('start_date').isISO8601().withMessage('Start date must be a valid YYYY-MM-DD date'),
  body('end_date').isISO8601().withMessage('End date must be a valid YYYY-MM-DD date'),
  body('type').isIn(['sick', 'casual', 'vacation']).withMessage('Leave type must be sick, casual, or vacation'),
  body('reason').optional().isString().trim(),
  handleValidationErrors
];

export const validateLeaveApproval = [
  param('id').isUUID().withMessage('Valid leave UUID is required'),
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('admin_comment').optional().isString().trim(),
  handleValidationErrors
];
