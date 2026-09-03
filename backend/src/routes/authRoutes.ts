import express from 'express';
import { login, signup, me } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateLogin, validateSignup } from '../validators/authValidators';

const router = express.Router();

router.post('/login', validateLogin, login);
router.post('/signup', validateSignup, signup);
router.get('/me', authMiddleware, me);

export default router;
