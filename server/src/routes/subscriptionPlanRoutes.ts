import express from 'express';
import { getPlans, createPlan, updatePlan, deletePlan } from '../controllers/subscriptionPlanController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', getPlans); // Public - anyone can see plans
router.post('/', protect, createPlan); // Admin only
router.put('/:id', protect, updatePlan);
router.delete('/:id', protect, deletePlan);

export default router;
