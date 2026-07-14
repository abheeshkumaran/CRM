import { Router } from 'express';
import { getTrashItems, restoreItem, permanentDelete } from '../controllers/trashController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

// Protect all routes
router.use(protect);

router.get('/', getTrashItems);
router.post('/restore', restoreItem);
router.delete('/permanent', permanentDelete);

export default router;
