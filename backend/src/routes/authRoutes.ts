import express from 'express';
import { login, me } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateLogin } from '../validators/authValidators';

const router = express.Router();

router.post('/login', validateLogin, login);
router.get('/me', authMiddleware, me);

export default router;
