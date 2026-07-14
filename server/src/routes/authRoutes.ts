import express from 'express';
import { authUser, registerUser, forgotPassword, resetPassword, getMe } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

import { authLimiter } from '../middleware/rateLimiter';

router.post('/login', authLimiter, authUser);
router.post('/register', authLimiter, registerUser);
router.post('/forgot-password', authLimiter, forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);
router.get('/me', protect, getMe);

import { initSSO, ssoLogin, ssoCallback } from '../controllers/ssoController';

router.post('/sso/init', initSSO);
router.get('/sso/login/:orgId', ssoLogin);
router.post('/sso/callback/:orgId', ssoCallback);

export default router;
