import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { globalSearch, searchSuggestions, recentSearches } from '../controllers/searchController';

const router = express.Router();

// Apply authentication middleware to all search routes
router.use(protect);

// Global search across all entities
router.get('/global', globalSearch);

// Search suggestions/autocomplete
router.get('/suggestions', searchSuggestions);

// Recent searches for user
router.get('/recent', recentSearches);

export default router;