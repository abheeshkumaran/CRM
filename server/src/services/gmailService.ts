import { google } from 'googleapis';
import prisma from '../config/prisma';


const SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
];

function getOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
}

export const GmailService = {
    /**
     * Generate the Google OAuth2 consent URL
     */
    getAuthUrl(state?: string): string {
        const oauth2Client = getOAuth2Client();
        return oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent', // Always ask for consent to get refresh_token
            state: state || '',
        });
    },

    /**
     * Exchange authorization code for tokens and store in user's integrations
     */
    async handleCallback(userId: string, code: string): Promise<{ email: string }> {
        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get user's Gmail address
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const gmailEmail = userInfo.data.email || '';

        // Store tokens in user's integrations JSON
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const integrations = (user?.integrations as Record<string, any>) || {};

        integrations.gmail = {
            connected: true,
            email: gmailEmail,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate: tokens.expiry_date,
            tokenType: tokens.token_type,
            connectedAt: new Date().toISOString(),
        };

        await prisma.user.update({
            where: { id: userId },
            data: { integrations },
        });

        console.log(`[GmailService] Gmail connected for user ${userId}: ${gmailEmail}`);
        return { email: gmailEmail };
    },

    /**
     * Get Gmail connection status for a user
     */
    async getStatus(userId: string): Promise<{ connected: boolean; email?: string }> {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const integrations = (user?.integrations as Record<string, any>) || {};
        const gmail = integrations.gmail;

        if (!gmail || !gmail.connected) {
            return { connected: false };
        }

        return { connected: true, email: gmail.email };
    },

    /**
     * Send an email using the user's connected Gmail account
     */
    async sendEmail(
        userId: string,
        { to, subject, html, cc, bcc }: { to: string; subject: string; html: string; cc?: string; bcc?: string }
    ): Promise<{ messageId: string; threadId: string }> {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const integrations = (user?.integrations as Record<string, any>) || {};
        const gmail = integrations.gmail;

        if (!gmail || !gmail.connected || !gmail.refreshToken) {
            throw new Error('Gmail not connected. Please connect your Gmail account first.');
        }

        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({
            access_token: gmail.accessToken,
            refresh_token: gmail.refreshToken,
            expiry_date: gmail.expiryDate,
            token_type: gmail.tokenType,
        });

        // Auto-refresh if expired
        oauth2Client.on('tokens', async (newTokens) => {
            const freshUser = await prisma.user.findUnique({ where: { id: userId } });
            const freshIntegrations = (freshUser?.integrations as Record<string, any>) || {};
            if (freshIntegrations.gmail) {
                freshIntegrations.gmail.accessToken = newTokens.access_token || freshIntegrations.gmail.accessToken;
                if (newTokens.refresh_token) {
                    freshIntegrations.gmail.refreshToken = newTokens.refresh_token;
                }
                freshIntegrations.gmail.expiryDate = newTokens.expiry_date || freshIntegrations.gmail.expiryDate;
                await prisma.user.update({
                    where: { id: userId },
                    data: { integrations: freshIntegrations },
                });
                console.log(`[GmailService] Tokens auto-refreshed for user ${userId}`);
            }
        });

        const gmailApi = google.gmail({ version: 'v1', auth: oauth2Client });

        // Build RFC 2822 email
        const messageParts = [
            `From: ${gmail.email}`,
            `To: ${to}`,
            cc ? `Cc: ${cc}` : '',
            bcc ? `Bcc: ${bcc}` : '',
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            '',
            html,
        ].filter(Boolean);

        const rawMessage = Buffer.from(messageParts.join('\r\n'))
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const result = await gmailApi.users.messages.send({
            userId: 'me',
            requestBody: { raw: rawMessage },
        });

        console.log(`[GmailService] Email sent via Gmail for user ${userId}: ${result.data.id}`);

        return {
            messageId: result.data.id || '',
            threadId: result.data.threadId || '',
        };
    },

    /**
     * Disconnect Gmail for a user
     */
    async disconnect(userId: string): Promise<void> {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const integrations = (user?.integrations as Record<string, any>) || {};

        // Try to revoke the token
        if (integrations.gmail?.accessToken) {
            try {
                const oauth2Client = getOAuth2Client();
                oauth2Client.setCredentials({ access_token: integrations.gmail.accessToken });
                await oauth2Client.revokeCredentials();
            } catch (err) {
                console.warn('[GmailService] Token revocation failed (may already be revoked):', err);
            }
        }

        // Remove Gmail data from integrations
        delete integrations.gmail;
        await prisma.user.update({
            where: { id: userId },
            data: { integrations },
        });

        console.log(`[GmailService] Gmail disconnected for user ${userId}`);
    },

    /**
     * Check if a user has Gmail connected
     */
    async isConnected(userId: string): Promise<boolean> {
        const status = await this.getStatus(userId);
        return status.connected;
    },
};
