import express from 'express';
import {
  getUsersStatus,
  getPendingLeaves,
  updateLeaveStatus,
  getMonthlyReport,
  getEmployees,
  createEmployee,
  updateEmployee,
  getAuditLogs
} from '../controllers/adminController';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware';
import { validateLeaveApproval } from '../validators/leaveValidators';

const router = express.Router();

router.use(authMiddleware, adminOnly);

router.get('/users', getUsersStatus);
router.get('/leaves/pending', getPendingLeaves);
router.put('/leaves/:id', validateLeaveApproval, updateLeaveStatus);
router.get('/reports', getMonthlyReport);

router.get('/employees', getEmployees);
router.post('/employees', createEmployee);
router.put('/employees/:id', updateEmployee);
router.get('/audit-logs', getAuditLogs);

export default router;
