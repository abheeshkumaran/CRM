import express from 'express';
import multer from 'multer';
import path from 'path';
import {
    initiateCall,
    completeCall,
    getLeadCalls,
    getRecording,
    getAllCalls,
    getCallStats,
    getUserCallAnalytics,
    deleteRecording
} from '../controllers/callController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Configure storage
const storage = multer.diskStorage({
    destination: (req: express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        const uploadDir = path.join(__dirname, '../../uploads/recordings');
        cb(null, uploadDir);
    },
    filename: (req: express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        // Filename: call-{callId}-{timestamp}.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.webm';
        cb(null, `call-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({ storage });

// Call logs and stats routes
router.route('/').get(protect, getAllCalls);
router.route('/stats').get(protect, getCallStats);
router.route('/reports/user-analytics').get(protect, getUserCallAnalytics);

// Call actions
router.route('/initiate').post(protect, initiateCall);
router.route('/:id/complete').post(protect, upload.single('recording'), completeCall);
router.route('/:id/recording').delete(protect, deleteRecording);

// Lead-specific calls
router.route('/lead/:leadId').get(protect, getLeadCalls);

// Recording retrieval
router.route('/recording/:filename').get(protect, getRecording);

export default router;
