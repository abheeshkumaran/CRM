import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getAdAccounts, getCampaigns, createCampaign } from '../controllers/marketingController';

const router = express.Router();

router.use(protect);

router.get('/ad-accounts', getAdAccounts);
router.get('/:adAccountId/campaigns', getCampaigns);
router.post('/:adAccountId/campaigns', createCampaign);

export default router;
