import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getAndroidLeads, uploadCallRecording, syncCallLogs } from '../controllers/androidController';
import { logExternalMessage } from '../controllers/whatsAppController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Configure multer for audio uploads
const storage = multer.diskStorage({
    destination(req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads', 'recordings');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename(req, file, cb) {
        cb(null, `call-recording-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for recordings
});

// Helper middleware to accept either 'audio' or 'file' field for recordings
const uploadRecordingFiles = upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'file', maxCount: 1 }
]);

const handleRecordingUpload = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    uploadRecordingFiles(req, res, (err) => {
        if (err) {
            return next(err);
        }
        // Normalize req.file from either field
        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
        if (files) {
            if (files.audio && files.audio.length > 0) {
                req.file = files.audio[0];
            } else if (files.file && files.file.length > 0) {
                req.file = files.file[0];
            }
        }
        next();
    });
};

// Routes
router.get('/leads', protect, getAndroidLeads as any);
router.post('/recordings', protect, handleRecordingUpload, uploadCallRecording as any);
router.post('/whatsapp/sync', protect, logExternalMessage as any);
router.post('/bulk-sync', protect, syncCallLogs as any);

export default router;

