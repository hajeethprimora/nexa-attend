import express from 'express';
import { body } from 'express-validator';
import {
  getToday,
  clockIn,
  breakStart,
  breakEnd,
  clockOut,
  getHistory
} from '../controllers/attendanceController';
import { authMiddleware } from '../middleware/authMiddleware';
import { handleValidationErrors } from '../validators/leaveValidators';

const router = express.Router();

router.use(authMiddleware);

const validateClockIn = [
  body('work_mode').optional().isIn(['office', 'remote']).withMessage('work_mode must be office or remote'),
  body('notes').optional().isString().isLength({ max: 500 }),
  body('lat').optional().isFloat({ min: -90, max: 90 }).toFloat(),
  body('lng').optional().isFloat({ min: -180, max: 180 }).toFloat(),
  handleValidationErrors
];

router.get('/today', getToday);
router.post('/clock-in', validateClockIn, clockIn);
router.put('/break-start', breakStart);
router.put('/break-end', breakEnd);
router.put('/clock-out', clockOut);
router.get('/history', getHistory);

export default router;
