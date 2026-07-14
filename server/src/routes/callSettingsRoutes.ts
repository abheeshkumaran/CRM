import express from 'express';
import { getCallSettings, updateCallSettings } from '../controllers/callSettingsController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/').get(protect, getCallSettings);
router.route('/').put(protect, updateCallSettings);

export default router;
