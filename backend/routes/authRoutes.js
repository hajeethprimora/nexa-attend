const express = require('express');
const router = express.Router();
const { login, me } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validateLogin } = require('../validators/authValidators');

router.post('/login', validateLogin, login);
router.get('/me', authMiddleware, me);

module.exports = router;
