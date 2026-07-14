import express from 'express';
import { getCases, createCase, getCaseById, updateCase, deleteCase } from '../controllers/caseController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getCases);
router.post('/', protect, createCase);
router.get('/:id', protect, getCaseById);
router.put('/:id', protect, updateCase);
router.delete('/:id', protect, deleteCase);

export default router;
