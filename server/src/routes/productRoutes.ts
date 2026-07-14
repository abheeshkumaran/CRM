import express from 'express';
import { getProducts, createProduct, getProductById, updateProduct, deleteProduct, generateProductShareLink, getProductShareConfig } from '../controllers/productController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getProducts);
router.post('/', protect, createProduct);
router.get('/:id', protect, getProductById);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, admin, deleteProduct);
router.post('/:productId/share', protect, generateProductShareLink);
router.get('/:productId/share', protect, getProductShareConfig);


export default router;
