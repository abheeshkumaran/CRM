import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
    createTeam,
    getTeams,
    getTeam,
    updateTeam,
    deleteTeam
} from '../controllers/teamController';

const router = express.Router();

router.route('/')
    .post(protect, createTeam)
    .get(protect, getTeams);

router.route('/:id')
    .get(protect, getTeam)
    .put(protect, updateTeam)
    .delete(protect, deleteTeam);

export default router;
