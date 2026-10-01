import express from 'express';
import { param } from 'express-validator';
import {
  getUsersStatus,
  getPendingLeaves,
  updateLeaveStatus,
  getMonthlyReport,
  getDetailedReport,
  getEmployees,
  createEmployee,
  updateEmployee,
  getLeaveBalance,
  updateLeaveBalance,
  getAuditLogs,
  listEmployeeAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance
} from '../controllers/adminController';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware';
import { validateLeaveApproval, handleValidationErrors } from '../validators/leaveValidators';
import {
  validateBody,
  employeeCreateSchema,
  employeeUpdateSchema,
  attendanceCreateSchema,
  attendanceUpsertSchema,
  attendanceDeleteSchema,
  leaveBalanceSchema
} from '../validators/adminValidators';

const router = express.Router();
const uuidParam = [param('id').isUUID().withMessage('Valid UUID is required'), handleValidationErrors];

router.use(authMiddleware, adminOnly);

router.get('/users', getUsersStatus);
router.get('/leaves/pending', getPendingLeaves);
router.put('/leaves/:id', validateLeaveApproval, updateLeaveStatus);

router.get('/reports', getMonthlyReport);
router.get('/reports/detailed', getDetailedReport);

router.get('/employees', getEmployees);
router.post('/employees', validateBody(employeeCreateSchema), createEmployee);
router.put('/employees/:id', uuidParam, validateBody(employeeUpdateSchema), updateEmployee);
router.get('/employees/:id/leave-balance', uuidParam, getLeaveBalance);
router.put('/employees/:id/leave-balance', uuidParam, validateBody(leaveBalanceSchema), updateLeaveBalance);

router.get('/attendance', listEmployeeAttendance);
router.post('/attendance', validateBody(attendanceCreateSchema), createAttendance);
router.put('/attendance/:id', uuidParam, validateBody(attendanceUpsertSchema), updateAttendance);
router.delete('/attendance/:id', uuidParam, validateBody(attendanceDeleteSchema), deleteAttendance);

router.get('/audit-logs', getAuditLogs);

export default router;
