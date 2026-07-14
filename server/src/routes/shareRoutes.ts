
import express from 'express';
import { getSharedProduct } from '../controllers/productController';

const router = express.Router();

// Public route to view a shared product
// /api/share/:slug
router.get('/:slug', getSharedProduct);

export default router;
