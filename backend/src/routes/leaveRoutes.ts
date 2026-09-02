import express from 'express';
import { createLeave, getUserLeaves } from '../controllers/leaveController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateCreateLeave } from '../validators/leaveValidators';

const router = express.Router();

router.use(authMiddleware);

router.post('/', validateCreateLeave, createLeave);
router.get('/', getUserLeaves);

export default router;
