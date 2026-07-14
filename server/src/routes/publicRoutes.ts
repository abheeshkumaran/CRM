
import express from 'express';
import { submitWebForm } from '../controllers/webFormController';
import { MetaIntegrationService } from '../services/metaIntegrationService';
import { getPublicFAQs } from '../controllers/siteFAQController';
import { ZapierWebhookService } from '../services/zapierWebhookService';

const router = express.Router();

/**
 * @route GET /api/public/health
 * @desc Public Health Check
 */
router.get('/health', (req, res) => res.status(200).send('OK'));

/**
 * @route POST /api/public/webforms/:id/submit
 * @desc Submit a web form to create a lead
 */
router.post('/webforms/:id/submit', submitWebForm);

/**
 * @route GET /api/public/meta/webhook
 * @desc Verify Meta Webhook
 */
router.get('/meta/webhook', (req, res) => MetaIntegrationService.verifyWebhook(req, res));

/**
 * @route POST /api/public/meta/webhook
 * @desc Handle Meta Webhook (Facebook Leads etc)
 */
router.post('/meta/webhook', (req, res) => {
    MetaIntegrationService.handleWebhook(req.body);
    res.sendStatus(200);
});

/**
 * @route GET /api/public/faqs
 * @desc Get active FAQs for landing page
 */
router.get('/faqs', getPublicFAQs);

/**
 * @route POST /api/public/zapier/webhook/:orgId
 * @desc Receive leads from Zapier (Facebook Lead Ads, etc.)
 * @auth API Key via query param ?apiKey=xxx
 */
router.post('/zapier/webhook/:orgId', async (req, res) => {
    try {
        const { orgId } = req.params;
        const apiKey = (req.query.apiKey as string) || req.headers['x-api-key'] as string;

        if (!orgId || !apiKey) {
            return res.status(400).json({ message: 'Missing orgId or apiKey' });
        }

        const { valid, org } = await ZapierWebhookService.validateRequest(orgId, apiKey);
        if (!valid || !org) {
            return res.status(401).json({ message: 'Invalid API key or organisation' });
        }

        const result = await ZapierWebhookService.processLead(org, req.body);
        res.status(200).json({
            message: result.isReEnquiry ? 'Lead updated (re-enquiry)' : 'Lead created',
            leadId: result.leadId
        });
    } catch (error: any) {
        console.error('[ZapierWebhook] Route error:', error.message);
        res.status(500).json({ message: 'Failed to process webhook' });
    }
});

/**
 * @route POST /api/public/meta/payload/:orgId
 * @desc Receive leads from Meta Ads Payload (direct JSON)
 * @auth API Key via query param ?apiKey=xxx
 */
router.post('/meta/payload/:orgId', async (req, res) => {
    try {
        const { orgId } = req.params;
        const apiKey = (req.query.apiKey as string) || req.headers['x-api-key'] as string;
        const { MetaPayloadService } = await import('../services/metaPayloadService');

        if (!orgId || !apiKey) {
            return res.status(400).json({ message: 'Missing orgId or apiKey' });
        }

        const { valid, org } = await MetaPayloadService.validateRequest(orgId, apiKey);
        if (!valid || !org) {
            return res.status(401).json({ message: 'Invalid API key or organisation' });
        }

        const result = await MetaPayloadService.processLead(org, req.body);
        res.status(200).json({
            message: result.isReEnquiry ? 'Lead updated (re-enquiry)' : 'Lead created',
            leadId: result.leadId
        });
    } catch (error: any) {
        console.error('[MetaPayload] Route error:', error.message);
        res.status(500).json({ message: 'Failed to process webhook' });
    }
});

export default router;

