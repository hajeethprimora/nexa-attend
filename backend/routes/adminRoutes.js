const express = require('express');
const router = express.Router();
const {
  getUsersStatus,
  getPendingLeaves,
  updateLeaveStatus,
  getMonthlyReport
} = require('../controllers/adminController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');
const { validateLeaveApproval } = require('../validators/leaveValidators');

// Protect all admin routes with authentication and admin role check
router.use(authMiddleware, adminOnly);

router.get('/users', getUsersStatus);
router.get('/leaves/pending', getPendingLeaves);
router.put('/leaves/:id', validateLeaveApproval, updateLeaveStatus);
router.get('/reports', getMonthlyReport);

module.exports = router;
