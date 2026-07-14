import express from 'express';
import {
    createInteraction,
    createInteractionGeneric,
    getLeadInteractions,
    getAllInteractions,
    updateInteractionRecording,
    logQuickInteraction
} from '../controllers/interactionController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Generic interactions
router.get('/', protect, getAllInteractions);
router.post('/', protect, createInteractionGeneric); // Generic create endpoint

// Lead-specific interactions
router.post('/leads/:leadId/interactions', protect, createInteraction);
router.get('/leads/:leadId/interactions', protect, getLeadInteractions);

// Quick log for WhatsApp/Call button clicks
router.post('/leads/:leadId/quick-log', protect, logQuickInteraction);

// Update interaction with recording (for mobile app)
router.put('/interactions/:id/recording', protect, updateInteractionRecording);

export default router;
