import express from 'express';
import { getWebhooks, createWebhook, updateWebhook, deleteWebhook } from '../controllers/webhookController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);
router.use(authorize('super_admin', 'admin', 'manager')); // Restrict to admin/manager

router.route('/')
    .get(getWebhooks)
    .post(createWebhook);

router.route('/:id')
    .put(updateWebhook)
    .delete(deleteWebhook);

export default router;
