import express from 'express';
import multer from 'multer';
import { generateBackup, restoreBackup } from '../controllers/backupController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Only super_admin can trigger backups and restorals across organisations
router.use(protect);
router.use(authorize('super_admin'));

router.get('/:organisationId', generateBackup);
router.post('/restore/:organisationId', upload.single('backup'), restoreBackup);

export default router;
