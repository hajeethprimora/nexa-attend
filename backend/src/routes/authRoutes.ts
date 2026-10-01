import express from 'express';
import { signup, me, publicConfig, notifications } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateSignup } from '../validators/authValidators';

const router = express.Router();

router.get('/config', publicConfig);
router.post('/signup', validateSignup, signup);
router.get('/me', authMiddleware, me);
router.get('/notifications', authMiddleware, notifications);

export default router;
