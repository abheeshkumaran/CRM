import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { getOrgId } from '../utils/hierarchyUtils';
import prisma from '../config/prisma';


export const getWebhooks = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId((req as any).user);
        if (!orgId) return res.status(400).json({ message: 'Organisation required' });

        const webhooks = await prisma.webhook.findMany({
            where: { organisationId: orgId, isDeleted: false },
            orderBy: { createdAt: 'desc' }
        });

        res.json(webhooks);
    } catch (error) {
        logger.error('getWebhooks Error', error, 'WebhookController');
        res.status(500).json({ message: 'Failed to fetch webhooks' });
    }
};

export const createWebhook = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId((req as any).user);
        if (!orgId) return res.status(400).json({ message: 'Organisation required' });

        const { url, events, secret, isActive } = req.body;

        if (!url || !events || !Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ message: 'URL and at least one event are required' });
        }

        const webhook = await prisma.webhook.create({
            data: {
                name: new URL(url).hostname,
                url,
                events,
                secret,
                isActive: isActive ?? true,
                organisationId: orgId,
                createdById: (req as any).user.id
            }
        });

        logger.info(`Webhook created: ${webhook.id}`, 'WebhookController', (req as any).user.id, orgId);
        res.status(201).json(webhook);

    } catch (error) {
        logger.error('createWebhook Error', error, 'WebhookController');
        res.status(500).json({ message: 'Failed to create webhook' });
    }
};

export const updateWebhook = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const orgId = getOrgId((req as any).user);

        const webhook = await prisma.webhook.findUnique({ where: { id } });
        if (!webhook || webhook.organisationId !== orgId || webhook.isDeleted) {
            return res.status(404).json({ message: 'Webhook not found' });
        }

        const updated = await prisma.webhook.update({
            where: { id },
            data: req.body
        });

        logger.info(`Webhook updated: ${id}`, 'WebhookController', (req as any).user.id, orgId);
        res.json(updated);

    } catch (error) {
        logger.error('updateWebhook Error', error, 'WebhookController');
        res.status(500).json({ message: 'Failed to update webhook' });
    }
};

export const deleteWebhook = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const orgId = getOrgId((req as any).user);

        const webhook = await prisma.webhook.findUnique({ where: { id } });
        if (!webhook || webhook.organisationId !== orgId) {
            return res.status(404).json({ message: 'Webhook not found' });
        }

        await prisma.webhook.update({
            where: { id },
            data: { isDeleted: true, isActive: false }
        });

        logger.info(`Webhook deleted: ${id}`, 'WebhookController', (req as any).user.id, orgId);
        res.json({ message: 'Webhook deleted' });

    } catch (error) {
        logger.error('deleteWebhook Error', error, 'WebhookController');
        res.status(500).json({ message: 'Failed to delete webhook' });
    }
};
