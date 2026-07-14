import express from 'express';
import { getWorkflows, createWorkflow, getWorkflowById, updateWorkflow, deleteWorkflow, runWorkflow } from '../controllers/workflowController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getWorkflows);
router.post('/', protect, createWorkflow);
router.get('/:id', protect, getWorkflowById);
router.put('/:id', protect, updateWorkflow);
router.delete('/:id', protect, deleteWorkflow);
router.post('/:id/run', protect, runWorkflow);

export default router;
