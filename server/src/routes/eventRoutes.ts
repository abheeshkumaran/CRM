import express from 'express';
import { getEvents, createEvent, getEventById, deleteEvent } from '../controllers/eventController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getEvents);
router.post('/', protect, createEvent);
router.get('/:id', protect, getEventById);
router.delete('/:id', protect, deleteEvent);

export default router;
