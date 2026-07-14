import express from 'express';
import {
    createAccount,
    getAccounts,
    getAccountById as getAccount,
    updateAccount,
    deleteAccount,
    addAccountProduct,
    getAccountProducts
} from '../controllers/accountController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
    .post(protect, createAccount)
    .get(protect, getAccounts);

router.route('/:id')
    .get(protect, getAccount)
    .put(protect, updateAccount)
    .delete(protect, admin, deleteAccount);

router.route('/:accountId/products')
    .post(protect, addAccountProduct)
    .get(protect, getAccountProducts);

export default router;
