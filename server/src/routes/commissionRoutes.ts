
import express from 'express';
import { getCommissions, createCommission, updateCommission, deleteCommission } from '../controllers/commissionController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getCommissions);
router.post('/', protect, createCommission);
router.put('/:id', protect, updateCommission);
router.delete('/:id', protect, deleteCommission);

export default router;
