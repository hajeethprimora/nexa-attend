import express from 'express';
import { param } from 'express-validator';
import { createLeave, getUserLeaves, cancelLeave } from '../controllers/leaveController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateCreateLeave, handleValidationErrors } from '../validators/leaveValidators';

const router = express.Router();

router.use(authMiddleware);

router.post('/', validateCreateLeave, createLeave);
router.get('/', getUserLeaves);
router.delete('/:id', [param('id').isUUID(), handleValidationErrors], cancelLeave);

export default router;
