import express from 'express';
import { getLicenses, getCurrentLicense, activateLicense, cancelLicense, checkLicenseValidity, setCustomPrice } from '../controllers/licenseController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getLicenses);
router.get('/current', protect, getCurrentLicense);
router.get('/check', protect, checkLicenseValidity);
router.post('/activate', protect, activateLicense);
router.post('/:id/cancel', protect, cancelLicense);
router.patch('/:id/custom-price', protect, setCustomPrice);

export default router;
