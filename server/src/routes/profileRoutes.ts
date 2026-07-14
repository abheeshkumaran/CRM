import express from 'express';
import { getProfile, updateProfile, changePassword } from '../controllers/profileController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getProfile);
router.put('/', protect, updateProfile);
router.post('/change-password', protect, changePassword);

export default router;
