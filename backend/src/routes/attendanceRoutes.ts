import express from 'express';
import {
  getToday,
  clockIn,
  breakStart,
  breakEnd,
  clockOut,
  getHistory
} from '../controllers/attendanceController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authMiddleware);

router.get('/today', getToday);
router.post('/clock-in', clockIn);
router.put('/break-start', breakStart);
router.put('/break-end', breakEnd);
router.put('/clock-out', clockOut);
router.get('/history', getHistory);

export default router;
