import crypto from 'crypto';
import axios from 'axios';
import { decrypt } from '../utils/encryption';
import prisma from '../config/prisma';


interface GallaboxConfig {
    apiKey: string;
    apiSecret: string;
    accountId: string;
    channelId?: string;
}

export class GallaboxService {
    private baseUrl = 'https://server.gallabox.com/devapi';
    private config: GallaboxConfig;

    /**
     * Verify Gallabox Webhook Signature
     */
    static verifySignature(payload: string, signature: string, secret: string): boolean {
        const hmac = crypto.createHmac('sha256', secret);
        const digest = hmac.update(payload).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
    }

    constructor(config: GallaboxConfig) {
        this.config = config;
    }

    /**
     * Get configured Gallabox service for an organisation
     */
    static async getClientForOrg(orgId: string): Promise<GallaboxService | null> {
        const org = await prisma.organisation.findUnique({
            where: { id: orgId },
            select: { integrations: true }
        });

        if (!org || !org.integrations) return null;

        const integrations = org.integrations as any;
        const gallaboxConfig = integrations.gallabox;

        if (!gallaboxConfig?.connected || !gallaboxConfig.apiKey || !gallaboxConfig.apiSecret || !gallaboxConfig.accountId) {
            return null;
        }

        return new GallaboxService({
            apiKey: decrypt(gallaboxConfig.apiKey),
            apiSecret: decrypt(gallaboxConfig.apiSecret),
            accountId: gallaboxConfig.accountId,
            channelId: gallaboxConfig.channelId
        });
    }

    /**
     * Sync a CRM Lead to a Gallabox Contact
     */
    async syncLeadToContact(lead: any) {
        try {
            const endpoint = `${this.baseUrl}/accounts/${this.config.accountId}/contacts`;
            
            // Format phone number (Gallabox expects international format without +)
            const cleanPhone = lead.phone?.replace(/\D/g, '') || '';
            
            const payload = {
                name: `${lead.firstName} ${lead.lastName || ''}`.trim(),
                email: lead.email ? [lead.email] : [],
                phone: [cleanPhone],
                tags: [
                    { name: 'CRM_Lead' },
                    { name: lead.source || 'Unknown_Source' }
                ]
            };

            const response = await axios.post(endpoint, payload, {
                headers: {
                    'apiKey': this.config.apiKey,
                    'apiSecret': this.config.apiSecret,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error: any) {
            console.error('Gallabox Sync Contact Error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to sync contact to Gallabox');
        }
    }

    /**
     * Send a WhatsApp message via Gallabox
     */
    async sendWhatsAppMessage(to: string, text: string) {
        try {
            if (!this.config.channelId) {
                throw new Error('Gallabox Channel ID not configured');
            }

            const endpoint = `${this.baseUrl}/messages/whatsapp`;
            
            // Format phone number (remove +)
            const cleanPhone = to.replace(/\D/g, '');

            const payload = {
                channelId: this.config.channelId,
                channelType: 'whatsapp',
                recipient: {
                    phone: cleanPhone
                },
                whatsapp: {
                    type: 'text',
                    text: {
                        body: text
                    }
                }
            };

            const response = await axios.post(endpoint, payload, {
                headers: {
                    'apiKey': this.config.apiKey,
                    'apiSecret': this.config.apiSecret,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error: any) {
            console.error('Gallabox Send Message Error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to send WhatsApp message via Gallabox');
        }
    }
}
