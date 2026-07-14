import express from 'express';
import { getNotifications, markAsRead, markAllAsRead, broadcastNotification } from '../controllers/notificationController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getNotifications);
router.put('/:id/read', protect, markAsRead);
router.put('/read-all', protect, markAllAsRead);
router.post('/broadcast', protect, broadcastNotification);

export default router;
