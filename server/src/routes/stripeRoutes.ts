import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { createCheckoutSession, createPortalSession, handleWebhook } from '../controllers/stripeController';

const router = express.Router();

// Webhook must be raw body, so we might need special handling in index.ts or here
// For now, defining the route. 
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

router.post('/create-checkout-session', protect, createCheckoutSession);
router.post('/create-portal-session', protect, createPortalSession);

export default router;
