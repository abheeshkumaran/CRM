import express from 'express';
import { handleVoiceWebhook, handleStatusWebhook } from '../controllers/telephonyController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Public webhooks (Twilio needs to access these from outside)
// Ideally secured by validating Twilio signature middleware, keeping simple for now.
router.post('/webhook/voice', handleVoiceWebhook);
router.post('/webhook/status', handleStatusWebhook);

// Protected routes for internal use
import { makeOutboundCall } from '../controllers/telephonyController';
router.post('/outbound', protect, makeOutboundCall);

export default router;
