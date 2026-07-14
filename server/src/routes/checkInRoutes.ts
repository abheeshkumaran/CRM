import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { createCheckIn, getCheckIns } from '../controllers/checkInController';

const router = express.Router();

router.use(protect);

router.post('/', createCheckIn);
router.get('/', getCheckIns);

export default router;
