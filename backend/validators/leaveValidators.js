const { body, param, validationResult } = require('express-validator');

const validateLeaveRequest = [
  body('start_date').isISO8601().withMessage('Valid start date (YYYY-MM-DD) is required'),
  body('end_date').isISO8601().withMessage('Valid end date (YYYY-MM-DD) is required'),
  body('type').isIn(['sick', 'casual', 'vacation']).withMessage('Leave type must be sick, casual, or vacation'),
  body('reason').optional().isString().trim(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }
    const startDate = new Date(req.body.start_date);
    const endDate = new Date(req.body.end_date);
    if (endDate < startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be earlier than start date'
      });
    }
    next();
  }
];

const validateLeaveApproval = [
  param('id').isUUID().withMessage('Valid leave ID is required'),
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('admin_comment').optional().isString().trim(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }
    next();
  }
];

module.exports = { validateLeaveRequest, validateLeaveApproval };
