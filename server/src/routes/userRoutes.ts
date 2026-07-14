import express from 'express';
import { getUsers, getUserById, updateUser, inviteUser, deactivateUser, activateUser, getUserStats, getMyTeam, permanentlyDeleteUser } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';
import { checkPlanLimits } from '../middleware/subscriptionMiddleware';
import { protectSuperAdmin, verifySuperAdminSecret } from '../middleware/superAdminProtection';

const router = express.Router();

router.get('/', protect, getUsers);
router.get('/my-team', protect, getMyTeam);
router.get('/:id', protect, getUserById);
router.get('/:id/stats', protect, getUserStats);
router.put('/:id', protect, verifySuperAdminSecret, protectSuperAdmin, updateUser);
router.post('/invite', protect, checkPlanLimits('users'), inviteUser);
router.post('/:id/deactivate', protect, verifySuperAdminSecret, protectSuperAdmin, deactivateUser);
router.post('/:id/activate', protect, verifySuperAdminSecret, protectSuperAdmin, activateUser);
router.delete('/:id', protect, verifySuperAdminSecret, protectSuperAdmin, permanentlyDeleteUser);

export default router;
