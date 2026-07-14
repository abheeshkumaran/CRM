import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
    getGmailAuthUrl,
    handleGmailCallback,
    getGmailStatus,
    sendGmailEmail,
    disconnectGmail,
} from '../controllers/gmailController';

const router = express.Router();

router.use(protect);

router.get('/auth-url', getGmailAuthUrl as any);
router.post('/callback', handleGmailCallback as any);
router.get('/status', getGmailStatus as any);
router.post('/send', sendGmailEmail as any);
router.post('/disconnect', disconnectGmail as any);

export default router;
