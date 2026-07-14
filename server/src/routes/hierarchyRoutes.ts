import express from 'express';
import { getHierarchy, updateReportsTo } from '../controllers/hierarchyController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getHierarchy);
router.put('/:id/reports-to', protect, updateReportsTo);

export default router;
