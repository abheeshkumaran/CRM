import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { sendOneOffEmail } from '../controllers/emailController';
import { generalLimiter } from '../middleware/rateLimiter';

const router = express.Router();

router.use(protect);

router.post('/send', generalLimiter, sendOneOffEmail);

export default router;
