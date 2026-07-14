import express from 'express';
import { getQuotes, createQuote, getQuoteById, updateQuote, deleteQuote, downloadQuotePdf } from '../controllers/quoteController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getQuotes);
router.post('/', protect, createQuote);
router.get('/:id', protect, getQuoteById);
router.get('/:id/pdf', protect, downloadQuotePdf);
router.put('/:id', protect, updateQuote);
router.delete('/:id', protect, deleteQuote);

export default router;
