
import express from 'express';
import { getLandingPages, createLandingPage, updateLandingPage, deleteLandingPage, getLandingPageBySlug } from '../controllers/landingPageController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getLandingPages);
router.get('/slug/:slug', getLandingPageBySlug); // Public route - no auth required
router.post('/', protect, createLandingPage);
router.put('/:id', protect, updateLandingPage);
router.delete('/:id', protect, deleteLandingPage);

export default router;
