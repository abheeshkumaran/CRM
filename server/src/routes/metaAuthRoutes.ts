import { Router, Response } from 'express';
import { AuthRequest, protect } from '../middleware/authMiddleware';
import axios from 'axios';
import crypto from 'crypto';
import { MetaLeadService } from '../services/metaLeadService'; // Service for handling Meta leads
import { MetaIntegrationService } from '../services/metaIntegrationService';
import { encrypt } from '../utils/encryption';
import { MetaLeadGuard } from '../services/metaLeadGuard';
import prisma from '../config/prisma';


const router = Router();

// Meta OAuth Configuration
const META_API_VERSION = 'v18.0';
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Required permissions for Ads and WhatsApp
const OAUTH_SCOPES = [
    'ads_read',
    'ads_management',
    'business_management',
    'pages_read_engagement',
    'pages_show_list',
    'pages_manage_ads',
    'pages_manage_metadata', // Required for webhook subscription
    'leads_retrieval',
    'email',
    'public_profile'
].join(',');

/**
 * GET /api/meta/auth
 * Redirects user to Facebook OAuth login
 */
router.get('/auth', protect, (req: AuthRequest, res: Response) => {
    const appId = process.env.META_APP_ID;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
    const configId = process.env.META_CONFIG_ID;

    if (!appId) {
        return res.status(500).json({
            error: 'META_APP_ID not configured',
            message: 'Please add META_APP_ID to your environment variables'
        });
    }

    // Store org ID in state parameter for the callback
    const state = Buffer.from(JSON.stringify({
        orgId: req.user?.organisationId,
        userId: req.user?.id,
        returnUrl: `${clientUrl}/settings/integrations`
    })).toString('base64');

    const redirectUri = `${serverUrl}/api/meta/callback`;

    const authUrl = `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?` +
        `client_id=${appId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(OAUTH_SCOPES)}` +
        `&state=${state}` +
        (configId ? `&config_id=${configId}` : '') +
        `&response_type=code` +
        `&auth_type=rerequest`;

    console.log(`[Meta Auth] Generated URL: ${authUrl}`);
    res.json({ url: authUrl });
});

/**
 * GET /api/meta/callback
 * Handles the OAuth callback from Facebook
 */
router.get('/callback', async (req, res) => {
    // Check if this is a Webhook Verification Request
    if (req.query['hub.mode']) {
        // Helper to grab param regardless of parsing style (dot notation or nested object)
        const getParam = (name: string) => {
            return req.query[name] || (req.query.hub && (req.query.hub as any)[name.replace('hub.', '')]);
        };

        const mode = getParam('hub.mode');
        const token = getParam('hub.verify_token');
        const challenge = getParam('hub.challenge');

        const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'my_secure_token';

        console.log(`[MetaWebhook] Verification Request: Mode=${mode}, Token=${token}, Challenge=${challenge}`);

        if (mode && token) {
            if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                console.log('[MetaWebhook] Verification SUCCESS');
                // Meta expects plain text of the challenge
                return res.type('text/plain').status(200).send(challenge);
            } else {
                console.warn(`[MetaWebhook] Verification FAILED. Received token: '${token}', Expected: '${VERIFY_TOKEN}'`);
                return res.sendStatus(403);
            }
        } else {
            console.warn('[MetaWebhook] Verification FAILED - Missing parameters');
            return res.sendStatus(400);
        }
    }

    const { code, state, error, error_description } = req.query;

    // Decode state to get org info
    let stateData: { orgId: string; userId: string; returnUrl: string };
    try {
        stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    } catch {
        return res.redirect(`${process.env.CLIENT_URL}/settings/integrations?error=invalid_state`);
    }

    const { orgId, returnUrl } = stateData;

    // Handle OAuth errors
    if (error) {
        console.error('[Meta OAuth] Error:', error, error_description);
        return res.redirect(`${returnUrl}?error=${error}&message=${encodeURIComponent(error_description as string || 'OAuth failed')}`);
    }

    if (!code) {
        return res.redirect(`${returnUrl}?error=no_code`);
    }

    try {
        const appId = process.env.META_APP_ID;
        const appSecret = process.env.META_APP_SECRET;
        const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
        const redirectUri = `${serverUrl}/api/meta/callback`;

        if (!appId || !appSecret) {
            throw new Error('META_APP_ID or META_APP_SECRET not configured');
        }

        // Exchange code for access token
        const tokenResponse = await axios.get(`${META_GRAPH_URL}/oauth/access_token`, {
            params: {
                client_id: appId,
                client_secret: appSecret,
                redirect_uri: redirectUri,
                code: code
            }
        });

        const { access_token: shortLivedToken } = tokenResponse.data;

        // Exchange for long-lived token (60 days)
        const longLivedTokenResponse = await axios.get(`${META_GRAPH_URL}/oauth/access_token`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: appId,
                client_secret: appSecret,
                fb_exchange_token: shortLivedToken
            }
        });

        const longLivedToken = longLivedTokenResponse.data.access_token;
        const expiresIn = longLivedTokenResponse.data.expires_in;
        const tokenExpiresAt = expiresIn ? new Date(Date.now() + (expiresIn * 1000)).toISOString() : null;

        // Get user's ad accounts
        const adAccountsResponse = await axios.get(`${META_GRAPH_URL}/me/adaccounts`, {
            params: {
                access_token: longLivedToken,
                fields: 'id,name,account_status'
            }
        });

        const adAccounts = adAccountsResponse.data.data || [];
        const primaryAdAccount = adAccounts[0]; // Use first ad account

        // Get user's pages (for Page ID)
        const pagesResponse = await axios.get(`${META_GRAPH_URL}/me/accounts`, {
            params: {
                access_token: longLivedToken,
                fields: 'id,name,access_token'
            }
        });

        const pages = pagesResponse.data.data || [];
        const primaryPage = pages[0];

        // Try to get WhatsApp Business Account
        let wabaId = null;
        let phoneNumberId = null;

        try {
            // List WABA accounts the user has access to via business
            const businessResponse = await axios.get(`${META_GRAPH_URL}/me/businesses`, {
                params: {
                    access_token: longLivedToken,
                    fields: 'id,name,owned_whatsapp_business_accounts{id,name}'
                }
            });

            const businesses = businessResponse.data.data || [];
            for (const business of businesses) {
                const wabas = business.owned_whatsapp_business_accounts?.data || [];
                if (wabas.length > 0) {
                    wabaId = wabas[0].id;

                    // Get phone numbers for this WABA
                    const phoneResponse = await axios.get(`${META_GRAPH_URL}/${wabaId}/phone_numbers`, {
                        params: {
                            access_token: longLivedToken,
                            fields: 'id,display_phone_number,verified_name'
                        }
                    });

                    const phones = phoneResponse.data.data || [];
                    if (phones.length > 0) {
                        phoneNumberId = phones[0].id;
                    }
                    break;
                }
            }
        } catch (wabaError) {
            console.log('[Meta OAuth] No WhatsApp Business Account found (this is okay):', (wabaError as any).message);
        }

        // Get the current org
        const org = await prisma.organisation.findUnique({
            where: { id: orgId }
        });

        if (!org) {
            throw new Error('Organisation not found');
        }

        // Update organisation with Meta integration data
        const currentIntegrations = (org.integrations as any) || {};
        let metaAccounts = Array.isArray(currentIntegrations.metaAccounts) ? [...currentIntegrations.metaAccounts] : [];

        // 5. Prepare all account objects
        const newAccounts = pages.map((page: any, index: number) => ({
            connected: index === 0, // Only connected by default for the primary page
            accessToken: page.access_token,
            userAccessToken: longLivedToken,
            tokenExpiresAt: tokenExpiresAt,
            adAccountId: primaryAdAccount?.id || null, // Best effort link to primary ad account
            adAccountName: primaryAdAccount?.name || null,
            pageId: page.id,
            pageName: page.name,
            appId: appId,
            connectedAt: new Date().toISOString()
        }));

        // Merge new accounts into metaAccounts
        for (const newAcc of newAccounts) {
            const existingIndex = metaAccounts.findIndex((acc: any) => acc.pageId === newAcc.pageId);
            if (existingIndex >= 0) {
                metaAccounts[existingIndex] = { ...metaAccounts[existingIndex], ...newAcc };
            } else {
                metaAccounts.push(newAcc);
            }
        }

        const primaryAccount = newAccounts[0] || {
            connected: true,
            accessToken: longLivedToken,
            userAccessToken: longLivedToken,
            tokenExpiresAt: tokenExpiresAt,
            adAccountId: primaryAdAccount?.id || null,
            adAccountName: primaryAdAccount?.name || null,
            appId: appId,
            connectedAt: new Date().toISOString()
        };

        await prisma.organisation.update({
            where: { id: orgId },
            data: {
                integrations: {
                    ...currentIntegrations,
                    meta: {
                        ...primaryAccount,
                        accessToken: encrypt(primaryAccount.accessToken)
                    },
                    metaAccounts: metaAccounts.map((acc: any) => ({
                        ...acc,
                        accessToken: typeof acc.accessToken === 'string' && !acc.accessToken.includes(':') 
                            ? encrypt(acc.accessToken) 
                            : acc.accessToken
                    })),
                    whatsapp: {
                        connected: !!wabaId && !!phoneNumberId,
                        accessToken: encrypt(longLivedToken),
                        wabaId: wabaId,
                        phoneNumberId: phoneNumberId,
                        appId: appId,
                        connectedAt: wabaId ? new Date().toISOString() : null
                    }
                }
            }
        });

        // 6. AUTOMATIC WEBHOOK SUBSCRIPTION
        // Loop through all retrieved pages and subscribe them to the app
        const { metaService } = await import('../services/metaService');
        for (const page of pages) {
            if (page.id && page.access_token) {
                await metaService.subscribePageToApp(page.id, page.access_token);
            }
        }

        const finalRedirectUrl = `${returnUrl}?success=true&meta=connected${wabaId ? '&whatsapp=connected' : ''}`;
        console.log(`[Meta OAuth] Redirecting to: ${finalRedirectUrl}`);

        // Set headers for no-cache to ensure redirect is followed and not stalled by Service Worker
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Main redirect
        res.redirect(finalRedirectUrl);

    } catch (err: any) {
        console.error('[Meta OAuth] Callback error:', err.response?.data || err.message);
        const errorUrl = `${returnUrl || (process.env.CLIENT_URL || 'https://pypecrm.com') + '/settings/integrations'}?error=callback_failed&message=${encodeURIComponent(err.message)}`;
        res.redirect(errorUrl);
    }
});

/**
 * POST /api/meta/callback
 * Handles incoming webhook events from Meta
 */
router.post('/callback', async (req, res) => {
    console.log('========== META WEBHOOK RECEIVED ==========');

    // Signature Verification
    const signature = req.headers['x-hub-signature-256'] as string;
    const secret = process.env.META_WEBHOOK_SECRET;

    if (secret) {
        if (!signature) {
            console.warn('Meta webhook missing signature');
            return res.sendStatus(401);
        }

        const rawBody = (req as any).rawBody || JSON.stringify(req.body);
        const hmac = crypto.createHmac('sha256', secret);
        const digest = hmac.update(rawBody).digest('hex');
        const expectedSignature = `sha256=${digest}`;

        if (signature !== expectedSignature) {
            console.warn('❌ Meta webhook invalid signature');
            return res.sendStatus(401);
        }
        console.log('✅ Signature verified');
    }

    // Respond immediately
    res.sendStatus(200);

    // Process async
    try {
        await MetaIntegrationService.handleWebhook(req.body);
    } catch (error) {
        console.error('Webhook processing error:', error);
    }
});

/**
 * POST /api/meta/disconnect
 * Disconnects Meta integration
 */
router.post('/disconnect', protect, async (req: AuthRequest, res: Response) => {
    try {
        const orgId = req.user!.organisationId;
        const { type } = req.body; // 'meta', 'whatsapp', or 'both'

        const org = await prisma.organisation.findUnique({
            where: { id: orgId }
        });

        if (!org) {
            return res.status(404).json({ error: 'Organisation not found' });
        }

        const currentIntegrations = (org.integrations as any) || {};

        if (type === 'meta' || type === 'both') {
            const pageIdToRemove = req.body.pageId;
            const accountIdToRemove = req.body.adAccountId;

            if (pageIdToRemove) {
                // Remove specific page
                if (currentIntegrations.metaAccounts) {
                    currentIntegrations.metaAccounts = currentIntegrations.metaAccounts.filter(
                        (acc: any) => acc.pageId !== pageIdToRemove
                    );
                }
                // Check if primary is the one being removed
                if (currentIntegrations.meta?.pageId === pageIdToRemove) {
                    // Promote another one or clear
                    currentIntegrations.meta = currentIntegrations.metaAccounts[0] || {
                        connected: false,
                        disconnectedAt: new Date().toISOString()
                    };
                }
            } else if (accountIdToRemove) {
                // Remove specific account
                if (currentIntegrations.metaAccounts) {
                    currentIntegrations.metaAccounts = currentIntegrations.metaAccounts.filter(
                        (acc: any) => acc.adAccountId !== accountIdToRemove
                    );
                }
                // Check if primary is the one being removed
                if (currentIntegrations.meta?.adAccountId === accountIdToRemove) {
                    // Promote another one or clear
                    currentIntegrations.meta = currentIntegrations.metaAccounts[0] || {
                        connected: false,
                        disconnectedAt: new Date().toISOString()
                    };
                }
            } else {
                // Disconnect ALL
                currentIntegrations.meta = {
                    connected: false,
                    disconnectedAt: new Date().toISOString()
                };
                currentIntegrations.metaAccounts = [];
            }
        }

        if (type === 'whatsapp' || type === 'both') {
            currentIntegrations.whatsapp = {
                connected: false,
                disconnectedAt: new Date().toISOString()
            };
        }

        await prisma.organisation.update({
            where: { id: orgId },
            data: { integrations: currentIntegrations }
        });

        res.json({ success: true, message: `${type} disconnected` });

    } catch (err: any) {
        console.error('[Meta] Disconnect error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/meta/status
 * Gets current Meta/WhatsApp connection status
 */
router.get('/status', protect, async (req: AuthRequest, res: Response) => {
    try {
        const orgId = req.user!.organisationId;

        const org = await prisma.organisation.findUnique({
            where: { id: orgId },
            select: { integrations: true }
        });

        const integrations = (org?.integrations as any) || {};

        res.json({
            meta: {
                connected: integrations.meta?.connected || false,
                adAccountName: integrations.meta?.adAccountName || null,
                pageName: integrations.meta?.pageName || null,
                connectedAt: integrations.meta?.connectedAt || null,
                accounts: integrations.metaAccounts || [] // Return list
            },
            whatsapp: {
                connected: integrations.whatsapp?.connected || false,
                wabaId: integrations.whatsapp?.wabaId || null,
                connectedAt: integrations.whatsapp?.connectedAt || null
            }
        });

    } catch (err: any) {
        console.error('[Meta] Status error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/meta/webhook-info
 * Returns public info for webhook configuration
 */
router.get('/webhook-info', protect, async (req: AuthRequest, res: Response) => {
    const serverUrl = process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`;
    res.json({
        webhookUrl: `${serverUrl}/api/meta/webhook`,
        verifyToken: process.env.META_VERIFY_TOKEN || 'my_secure_token'
    });
});

/**
 * GET /api/meta/webhook (Webhook Verification)
 * Standard endpoint for Meta App "Webhook Callback URL" (Verify)
 */
router.get('/webhook', (req, res) => {
    const hubMode = req.query['hub.mode'];
    const hubToken = req.query['hub.verify_token'];
    const hubChallenge = req.query['hub.challenge'];

    const verifyToken = process.env.META_VERIFY_TOKEN || 'my_secure_token';

    console.log(`[MetaWebhook] Verification Request: Mode=${hubMode}, Token=${hubToken}`);

    if (hubMode === 'subscribe' && hubToken === verifyToken) {
        console.log('[MetaWebhook] Verification SUCCESS');
        return res.status(200).send(hubChallenge);
    } else {
        console.warn(`[MetaWebhook] Verification FAILED. Received token: '${hubToken}', Expected: '${verifyToken}'`);
        return res.sendStatus(403);
    }
});

/**
 * POST /api/meta/webhook (Lead Generation Processing)
 * Main endpoint for Meta Webhook events
 */
router.post('/webhook', async (req, res) => {
    // 1. Signature Verification
    const signature = req.headers['x-hub-signature-256'] as string;
    const secret = process.env.META_WEBHOOK_SECRET;

    if (secret && signature) {
        const rawBody = (req as any).rawBody || JSON.stringify(req.body);
        const hmac = crypto.createHmac('sha256', secret);
        const digest = hmac.update(rawBody).digest('hex');
        const expectedSignature = `sha256=${digest}`;

        if (signature !== expectedSignature) {
            console.warn('❌ [MetaWebhook] Invalid signature');
            return res.sendStatus(401);
        }
    }

    // 2. Immediate Receipt Acknowledgment (avoid timeouts)
    res.status(200).send('EVENT_RECEIVED');

    // 3. Process Events
    try {
        const body = req.body;
        if (body.object === 'page') {
            for (const entry of body.entry) {
                const pageId = entry.id;
                for (const change of entry.changes) {
                    if (change.field === 'leadgen') {
                        const { leadgen_id, ad_id, form_id } = change.value;
                        console.log(`[MetaWebhook] New lead: ${leadgen_id} from Page: ${pageId}`);

                        // Delegate lead processing
                        MetaLeadService.processIncomingLead(leadgen_id, pageId, ad_id, form_id).catch((err: Error) => {
                            console.error('[MetaWebhook] Process error:', err);
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error('[MetaWebhook] Unexpected error:', error);
    }
});

/**
 * GET /api/meta/health-check
 * Diagnostic endpoint: verifies the entire Meta lead pipeline is healthy.
 * Use this to instantly see what's working and what's broken.
 */
router.get('/health-check', protect, async (req: AuthRequest, res: Response) => {
    const checks: Record<string, { status: 'ok' | 'error' | 'warning'; message: string }> = {};

    // 1. Check environment variables
    const requiredEnvVars = ['META_APP_ID', 'META_APP_SECRET', 'META_VERIFY_TOKEN', 'META_WEBHOOK_SECRET'];
    for (const envVar of requiredEnvVars) {
        if (process.env[envVar]) {
            checks[envVar] = { status: 'ok', message: 'Set ✓' };
        } else {
            checks[envVar] = { status: 'error', message: '❌ NOT SET — This will break webhooks!' };
        }
    }

    // 2. Check webhook URL (what Meta should be configured with)
    const serverUrl = process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`;
    const webhookUrl = `${serverUrl}/api/meta/webhook`;
    const callbackUrl = `${serverUrl}/api/meta/callback`;
    const verifyToken = process.env.META_VERIFY_TOKEN || '(not set)';

    // 3. Check organisation's Meta connection
    const orgId = req.user!.organisationId;
    try {
        const org = await prisma.organisation.findUnique({
            where: { id: orgId },
            select: { integrations: true }
        });
        const integrations = (org?.integrations as any) || {};
        const metaAccounts = integrations.metaAccounts || [];
        const connectedAccounts = metaAccounts.filter((acc: any) => acc.connected && acc.pageId);

        if (connectedAccounts.length === 0 && !integrations.meta?.connected) {
            checks['meta_connection'] = { status: 'error', message: 'No Meta account connected. Go to Settings → Integrations.' };
        } else {
            checks['meta_connection'] = {
                status: 'ok',
                message: `${connectedAccounts.length} page(s) connected: ${connectedAccounts.map((a: any) => a.pageName || a.pageId).join(', ')}`
            };
        }

        // 4. Check token expiry
        for (const acc of connectedAccounts) {
            if (acc.tokenExpiresAt) {
                const expiresAt = new Date(acc.tokenExpiresAt);
                const daysLeft = Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                if (daysLeft < 7) {
                    checks[`token_${acc.pageName || acc.pageId}`] = {
                        status: 'error',
                        message: `⚠️ Token expires in ${daysLeft} days! Reconnect immediately.`
                    };
                } else {
                    checks[`token_${acc.pageName || acc.pageId}`] = {
                        status: 'ok',
                        message: `Token valid for ${daysLeft} more days`
                    };
                }
            }
        }
    } catch (dbErr: any) {
        checks['meta_connection'] = { status: 'error', message: `DB error: ${dbErr.message}` };
    }

    // 5. Guard stats
    const guardStats = MetaLeadGuard.getStats();

    const hasErrors = Object.values(checks).some(c => c.status === 'error');

    res.status(hasErrors ? 200 : 200).json({
        healthy: !hasErrors,
        summary: hasErrors ? '⚠️ Issues detected — see checks below' : '✅ All systems operational',
        checks,
        webhookConfig: {
            primaryWebhookUrl: webhookUrl,
            fallbackCallbackUrl: callbackUrl,
            verifyToken,
            instructions: 'In Meta Developer Console → Your App → Webhooks: Set Callback URL to primaryWebhookUrl above, Verify Token to verifyToken above, subscribe to "leadgen" field.'
        },
        guardStats,
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/meta/test-lead
 * Manually trigger a test lead fetch & save for debugging.
 * Useful when you want to test the pipeline end-to-end without waiting for Meta.
 */
router.post('/test-lead', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { leadgenId, pageId } = req.body;

        if (!leadgenId || !pageId) {
            return res.status(400).json({
                error: 'Missing required fields: leadgenId, pageId',
                example: { leadgenId: '123456789', pageId: '987654321' }
            });
        }

        console.log(`[MetaTest] Manual test lead trigger: leadgenId=${leadgenId}, pageId=${pageId}`);
        
        // Run the full pipeline
        await MetaLeadService.processIncomingLead(leadgenId, pageId);

        res.json({
            success: true,
            message: `Lead processing triggered for ${leadgenId}. Check server logs for details.`,
            guardStats: MetaLeadGuard.getStats()
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
