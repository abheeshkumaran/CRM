import { Request, Response } from 'express';
import { GmailService } from '../services/gmailService';
import { getOrgId } from '../utils/hierarchyUtils';
import prisma from '../config/prisma';


/**
 * GET /api/gmail/auth-url
 * Returns the Google OAuth2 consent URL
 */
export const getGmailAuthUrl = async (req: Request, res: Response) => {
    try {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            return res.status(500).json({ message: 'Google OAuth not configured. Contact your admin.' });
        }

        const userId = (req as any).user.id;
        const authUrl = GmailService.getAuthUrl(userId); // Pass userId as state
        res.json({ authUrl });
    } catch (error) {
        console.error('[GmailController] getAuthUrl error:', error);
        res.status(500).json({ message: 'Failed to generate auth URL' });
    }
};

/**
 * POST /api/gmail/callback
 * Handles OAuth callback — exchanges code for tokens
 */
export const handleGmailCallback = async (req: Request, res: Response) => {
    try {
        const { code } = req.body;
        const userId = (req as any).user.id;

        if (!code) {
            return res.status(400).json({ message: 'Authorization code is required' });
        }

        const result = await GmailService.handleCallback(userId, code);
        res.json({ connected: true, email: result.email, message: 'Gmail connected successfully' });
    } catch (error) {
        console.error('[GmailController] callback error:', error);
        res.status(400).json({ message: 'Failed to connect Gmail. Please try again.' });
    }
};

/**
 * GET /api/gmail/status
 * Returns Gmail connection status for current user
 */
export const getGmailStatus = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const status = await GmailService.getStatus(userId);
        res.json(status);
    } catch (error) {
        console.error('[GmailController] status error:', error);
        res.status(500).json({ message: 'Failed to get Gmail status' });
    }
};

/**
 * POST /api/gmail/send
 * Send an email via the user's connected Gmail
 */
export const sendGmailEmail = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const orgId = getOrgId((req as any).user);
        const { to, subject, body, cc, bcc, leadId, contactId } = req.body;

        if (!to || !subject || !body) {
            return res.status(400).json({ message: 'to, subject, and body are required' });
        }

        // Check Gmail is connected
        const isConnected = await GmailService.isConnected(userId);
        if (!isConnected) {
            return res.status(400).json({ message: 'Gmail not connected. Go to Settings → Integrations to connect.' });
        }

        // Send via Gmail API
        const result = await GmailService.sendEmail(userId, { to, subject, html: body, cc, bcc });

        // Log interaction
        if (orgId) {
            try {
                await prisma.interaction.create({
                    data: {
                        type: InteractionType.email,
                        direction: InteractionDirection.outbound,
                        subject: `Email: ${subject}`,
                        description: body.substring(0, 500),
                        organisationId: orgId,
                        createdById: userId,
                        leadId: leadId || undefined,
                        contactId: contactId || undefined,
                        date: new Date(),
                    },
                });
            } catch (err) {
                console.error('[GmailController] Failed to log interaction:', err);
            }
        }

        res.json({
            success: true,
            messageId: result.messageId,
            message: 'Email sent successfully via Gmail',
        });
    } catch (error: any) {
        console.error('[GmailController] send error:', error);
        const message = error.message?.includes('Gmail not connected')
            ? error.message
            : 'Failed to send email. Please check your Gmail connection.';
        res.status(400).json({ message });
    }
};

/**
 * POST /api/gmail/disconnect
 * Disconnects Gmail for current user
 */
export const disconnectGmail = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        await GmailService.disconnect(userId);
        res.json({ connected: false, message: 'Gmail disconnected successfully' });
    } catch (error) {
        console.error('[GmailController] disconnect error:', error);
        res.status(500).json({ message: 'Failed to disconnect Gmail' });
    }
};
