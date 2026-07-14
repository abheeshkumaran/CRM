import express from 'express';
import { getAssignmentRules, createAssignmentRule, updateAssignmentRule, deleteAssignmentRule, getRuleTypes } from '../controllers/assignmentRuleController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/types', protect, getRuleTypes);
router.get('/', protect, getAssignmentRules);
router.post('/', protect, createAssignmentRule);
router.put('/:id', protect, updateAssignmentRule);
router.delete('/:id', protect, deleteAssignmentRule);

export default router;
