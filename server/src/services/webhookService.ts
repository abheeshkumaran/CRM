import prisma from '../config/prisma';


export const WebhookService = {
    /**
     * Trigger a webhook event for an organisation
     */
    async triggerEvent(event: string, payload: any, organisationId: string) {
        try {
            console.log(`[WebhookService] Triggering event: ${event} for Org: ${organisationId}`);

            // 1. Find active webhooks for this org that subscribe to the event
            const webhooks = await prisma.webhook.findMany({
                where: {
                    organisationId,
                    isActive: true,
                    isDeleted: false,
                    events: {
                        has: event
                    }
                }
            });

            if (webhooks.length === 0) {
                return;
            }

            console.log(`[WebhookService] Found ${webhooks.length} webhooks for event ${event}`);

            // 2. Execute webhooks in parallel
            await Promise.all(webhooks.map(webhook => this.executeWebhook(webhook, event, payload)));

        } catch (error) {
            console.error('[WebhookService] Error triggering event:', error);
        }
    },

    /**
     * Execute a single webhook
     */
    async executeWebhook(webhook: any, event: string, payload: any) {
        try {
            const body = JSON.stringify({
                event,
                timestamp: new Date().toISOString(),
                data: payload
            });

            const headers: any = {
                'Content-Type': 'application/json',
                'User-Agent': 'MERN-CRM-Webhook/1.0',
                ...(webhook.headers as object || {})
            };

            if (webhook.secret) {
                // Add signature if secret exists (simple implementation)
                headers['X-Webhook-Secret'] = webhook.secret;
            }

            const response = await fetch(webhook.url, {
                method: 'POST',
                headers,
                body
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Update success stats
            await prisma.webhook.update({
                where: { id: webhook.id },
                data: {
                    lastTriggeredAt: new Date(),
                    successCount: { increment: 1 },
                    lastError: null
                }
            });

        } catch (error) {
            console.error(`[WebhookService] Failed to send webhook ${webhook.id} to ${webhook.url}:`, error);

            // Update failure stats
            await prisma.webhook.update({
                where: { id: webhook.id },
                data: {
                    lastTriggeredAt: new Date(),
                    failureCount: { increment: 1 },
                    lastError: (error as Error).message
                }
            });
        }
    }
};
