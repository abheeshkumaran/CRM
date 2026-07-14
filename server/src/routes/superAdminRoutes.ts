import express from 'express';
import {
    getAllOrganisations,
    createOrganisation,
    updateOrganisationAdmin,
    suspendOrganisation,
    getOrganisationStats,
    resetUserPassword,
    broadcastToOrgAdmins
} from '../controllers/superAdminController';
import { deleteOrganisation, restoreOrganisation, permanentlyDeleteOrganisation } from '../controllers/organisationController';
import {
    getPlans,
    createPlan,
    updatePlan,
    deletePlan
} from '../controllers/subscriptionPlanController';
import { protect } from '../middleware/authMiddleware';
import { getSystemSettings, updateSystemSettings } from '../controllers/systemSettingsController';
import { getGlobalRoles, upsertGlobalRole } from '../controllers/roleController';
import { exportPlatformData, restorePlatformData } from '../controllers/backupController';
import {
    getAllFAQs,
    createFAQ,
    updateFAQ,
    deleteFAQ
} from '../controllers/siteFAQController';

const router = express.Router();

// Full Platform Data Export/Restore
router.get('/platform/export', protect, exportPlatformData);
router.post('/platform/restore', protect, restorePlatformData);

// System Settings
router.get('/settings', protect, getSystemSettings);
router.put('/settings', protect, updateSystemSettings);

// Organisation Management
router.get('/organisations', protect, getAllOrganisations);
router.post('/organisations', protect, createOrganisation);
router.put('/organisations/:id', protect, updateOrganisationAdmin);
router.delete('/organisations/:id', protect, deleteOrganisation); // Soft delete
router.delete('/organisations/:id/permanent', protect, permanentlyDeleteOrganisation); // Permanent delete (super admin only)
router.post('/organisations/:id/restore', protect, restoreOrganisation); // Restore deleted org
router.post('/organisations/:id/suspend', protect, suspendOrganisation);

// License Plans Management
router.get('/plans', protect, getPlans);
router.post('/plans', protect, createPlan);
router.put('/plans/:id', protect, updatePlan);
router.delete('/plans/:id', protect, deletePlan);

// Global Roles management (Super Admin)
router.get('/roles', protect, getGlobalRoles);
router.post('/roles', protect, upsertGlobalRole);

router.get('/stats', protect, getOrganisationStats);

// Landing Page FAQ Management
router.get('/faqs', protect, getAllFAQs);
router.post('/faqs', protect, createFAQ);
router.put('/faqs/:id', protect, updateFAQ);
router.delete('/faqs/:id', protect, deleteFAQ);

// User Management (Cross-Organisation)
router.post('/users/reset-password', protect, resetUserPassword);

// Broadcast Notification to all Org Admins
router.post('/broadcast-notification', protect, broadcastToOrgAdmins);

export default router;
