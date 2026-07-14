import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { generateContent } from '../controllers/aiController';
import { generalLimiter } from '../middleware/rateLimiter';

const router = express.Router();

router.use(protect);

// Apply rate limiting to prevent abuse
router.post('/generate', generalLimiter, generateContent);

export default router;
