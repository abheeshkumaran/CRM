import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import {
    getPipelines,
    createPipeline,
    updatePipeline,
    deletePipeline
} from '../controllers/pipelineController';

const router = Router();

router.use(protect); // All routes require authentication

router.get('/', getPipelines);
router.post('/', authorize('admin', 'super_admin'), createPipeline);
router.put('/:id', authorize('admin', 'super_admin'), updatePipeline);
router.delete('/:id', authorize('admin', 'super_admin'), deletePipeline);

export default router;