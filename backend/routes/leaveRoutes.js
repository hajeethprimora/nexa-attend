const express = require('express');
const router = express.Router();
const { createLeave, getUserLeaves } = require('../controllers/leaveController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validateLeaveRequest } = require('../validators/leaveValidators');

router.use(authMiddleware);

router.post('/', validateLeaveRequest, createLeave);
router.get('/', getUserLeaves);

module.exports = router;
