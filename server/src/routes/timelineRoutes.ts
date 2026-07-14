import express from 'express';
import { getTimeline } from '../controllers/timelineController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/:type/:id', protect, getTimeline);

export default router;
