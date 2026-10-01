import { body, param } from 'express-validator';
import { handleValidationErrors } from './authValidators';

export { handleValidationErrors };

export const validateCreateLeave = [
  body('start_date').isISO8601({ strict: true }).withMessage('Start date must be a valid YYYY-MM-DD date'),
  body('end_date').isISO8601({ strict: true }).withMessage('End date must be a valid YYYY-MM-DD date'),
  body('type').isIn(['sick', 'casual', 'vacation']).withMessage('Leave type must be sick, casual, or vacation'),
  body('reason').optional().isString().trim().isLength({ max: 1000 }),
  handleValidationErrors
];

export const validateLeaveApproval = [
  param('id').isUUID().withMessage('Valid leave UUID is required'),
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('admin_comment').optional().isString().trim().isLength({ max: 1000 }),
  handleValidationErrors
];
