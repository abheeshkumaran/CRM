import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import {
    createBranch,
    getBranches,
    updateBranch,
    deleteBranch
} from '../controllers/branchController';

const router = express.Router();

router.route('/')
    .get(protect, getBranches)
    .post(protect, createBranch);

router.route('/:id')
    .put(protect, updateBranch)
    .delete(protect, deleteBranch);

export default router;
