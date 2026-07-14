import express from 'express';
import { getOpportunities, createOpportunity, getOpportunityById, updateOpportunity, deleteOpportunity } from '../controllers/opportunityController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getOpportunities);
router.post('/', protect, createOpportunity);
router.get('/:id', protect, getOpportunityById);
router.put('/:id', protect, updateOpportunity);
router.delete('/:id', protect, admin, deleteOpportunity);

export default router;
