import express from 'express';
import { getAuditLogs } from '../controllers/auditController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getAuditLogs);

export default router;
