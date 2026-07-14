
import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware';
import { uploadCallRecording, logCallWithoutRecording } from '../controllers/uploadController';

const router = express.Router();

// Memory Storage Configuration - stores files in memory as Buffer
const memoryStorage = multer.memoryStorage();

console.log(`📁 File storage: Database (Persistent)`);

import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Cloudinary removed in favor of Database storage
// import { v2 as cloudinary } from 'cloudinary';
// import { CloudinaryStorage } from 'multer-storage-cloudinary';

const upload = multer({
    storage: memoryStorage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const uploadImage = multer({
    storage: memoryStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

const uploadDocument = multer({
    storage: memoryStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and image files are allowed!'));
        }
    }
});

// Route: POST /api/upload/call-recording
router.post('/call-recording', protect, upload.single('recording'), uploadCallRecording);

// Route: POST /api/upload/log-call (for calls without recordings - Android 14/15 restriction)
router.post('/log-call', protect, logCallWithoutRecording);

// Route: POST /api/upload/image
import { uploadGenericImage, uploadDocument as uploadDocController } from '../controllers/uploadController';
router.post('/image', protect, uploadImage.single('image'), uploadGenericImage);

// Route: POST /api/upload/document
router.post('/document', protect, uploadDocument.single('document'), uploadDocController);

// Error handling middleware for multer errors
router.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ 
                message: 'File size exceeds the 5MB limit. Please upload a smaller file.',
                error: 'FILE_TOO_LARGE',
                maxSize: '5MB'
            });
        }
        return res.status(400).json({ 
            message: err.message,
            error: err.code 
        });
    }
    
    if (err) {
        return res.status(400).json({ 
            message: err.message || 'File upload failed',
            error: 'UPLOAD_ERROR'
        });
    }
    
    next();
});

export default router;
