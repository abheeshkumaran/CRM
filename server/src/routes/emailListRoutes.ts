import express from 'express';
import { getEmailLists, createEmailList, getEmailListById, deleteEmailList } from '../controllers/emailListController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getEmailLists);
router.post('/', protect, createEmailList);
router.get('/:id', protect, getEmailListById);
router.delete('/:id', protect, deleteEmailList);

export default router;
