
import express from 'express';
import { getWebForms, createWebForm, updateWebForm, deleteWebForm } from '../controllers/webFormController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getWebForms);
router.post('/', protect, createWebForm);
router.put('/:id', protect, updateWebForm);
router.delete('/:id', protect, deleteWebForm);

export default router;
