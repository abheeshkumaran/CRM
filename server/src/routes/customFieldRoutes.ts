import express from 'express';
import { getCustomFields, createCustomField, updateCustomField, deleteCustomField } from '../controllers/customFieldController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getCustomFields);
router.post('/', protect, createCustomField);
router.put('/:id', protect, updateCustomField);
router.delete('/:id', protect, deleteCustomField);

export default router;
