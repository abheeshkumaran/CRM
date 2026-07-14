import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { bulkLeadOperations, bulkContactOperations, bulkOpportunityOperations } from '../controllers/bulkOperationsController';

const router = express.Router();

/**
 * @route POST /api/bulk/leads
 * @desc Perform bulk operations on leads (assign, status, tags, email, whatsapp, delete, export)
 * @access Private
 */
router.post('/leads', protect, bulkLeadOperations as any);

/**
 * @route POST /api/bulk/contacts
 * @desc Perform bulk operations on contacts (assign, add-to-campaign, delete, export)
 * @access Private
 */
router.post('/contacts', protect, bulkContactOperations as any);

/**
 * @route POST /api/bulk/opportunities
 * @desc Perform bulk operations on opportunities (update-stage, assign, delete, export)
 * @access Private
 */
router.post('/opportunities', protect, bulkOpportunityOperations as any);

export default router;
