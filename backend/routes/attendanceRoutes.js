const express = require('express');
const router = express.Router();
const {
  getToday,
  clockIn,
  breakStart,
  breakEnd,
  clockOut,
  getHistory
} = require('../controllers/attendanceController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/today', getToday);
router.post('/clock-in', clockIn);
router.put('/break-start', breakStart);
router.put('/break-end', breakEnd);
router.put('/clock-out', clockOut);
router.get('/history', getHistory);

module.exports = router;
