import express from 'express';
import { getApiKeys, createApiKey, revokeApiKey, deleteApiKey } from '../controllers/apiKeyController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getApiKeys);
router.post('/', protect, createApiKey);
router.post('/:id/revoke', protect, revokeApiKey);
router.delete('/:id', protect, deleteApiKey);

export default router;
