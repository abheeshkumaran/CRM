
import express from 'express';
import { getWhatsAppCampaigns, createWhatsAppCampaign, updateWhatsAppCampaign, deleteWhatsAppCampaign } from '../controllers/whatsAppCampaignController';
import { protect } from '../middleware/authMiddleware';
import { campaignLimiter } from '../middleware/rateLimiter';

const router = express.Router();

router.get('/', protect, getWhatsAppCampaigns as any);
router.post('/', protect, campaignLimiter, createWhatsAppCampaign as any);
router.put('/:id', protect, updateWhatsAppCampaign as any);
router.delete('/:id', protect, deleteWhatsAppCampaign as any);

export default router;
