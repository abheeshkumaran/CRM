import express from 'express';
import { getTerritories, createTerritory, updateTerritory, deleteTerritory } from '../controllers/territoryController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getTerritories);
router.post('/', protect, createTerritory);
router.put('/:id', protect, updateTerritory);
router.delete('/:id', protect, deleteTerritory);

export default router;
