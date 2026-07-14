import express from 'express';
import { createOrganisation, getAllOrganisations, getOrganisation, updateOrganisation, sendTestReport } from '../controllers/organisationController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/send-test-report', protect, sendTestReport);
router.get('/all', protect, getAllOrganisations);

// Root routes
router.get('/', protect, getOrganisation);
router.post('/', protect, createOrganisation);
router.put('/', protect, updateOrganisation);

// ID routes (must be last)
router.get('/:id', protect, getOrganisation);
router.put('/:id', protect, updateOrganisation);

export default router;
