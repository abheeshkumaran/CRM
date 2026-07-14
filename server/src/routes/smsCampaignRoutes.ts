
import express from 'express';
import { getSMSCampaigns, createSMSCampaign, updateSMSCampaign, deleteSMSCampaign } from '../controllers/smsCampaignController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getSMSCampaigns);
router.post('/', protect, createSMSCampaign);
router.put('/:id', protect, updateSMSCampaign);
router.delete('/:id', protect, deleteSMSCampaign);

export default router;
