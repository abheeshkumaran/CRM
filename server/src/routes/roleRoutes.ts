import express from 'express';
import { getRoles, createRole, updateRole, deleteRole } from '../controllers/roleController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getRoles);
router.post('/', protect, createRole);
router.put('/:id', protect, updateRole);
router.delete('/:id', protect, deleteRole);

export default router;
