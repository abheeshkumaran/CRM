
import { Request, Response } from 'express';
import { getOrgId } from '../utils/hierarchyUtils';
import prisma from '../config/prisma';


export const getSMSCampaigns = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No org' });

        const campaigns = await prisma.sMSCampaign.findMany({
            where: { organisationId: orgId, isDeleted: false },
            orderBy: { createdAt: 'desc' }
        });
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const createSMSCampaign = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No org' });

        const campaign = await prisma.sMSCampaign.create({
            data: {
                ...req.body,
                organisationId: orgId,
                createdById: user.id
            }
        });

        // Audit Log
        try {
            const { logAudit } = await import('../utils/auditLogger');
            logAudit({
                action: 'CREATE_SMS_CAMPAIGN',
                entity: 'SMSCampaign',
                entityId: campaign.id,
                actorId: user.id,
                organisationId: orgId,
                details: { name: campaign.name }
            });
        } catch (e) {
            console.error('Audit Log Error:', e);
        }
        res.status(201).json(campaign);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const updateSMSCampaign = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No org' });

        const campaign = await prisma.sMSCampaign.update({
            where: {
                id: req.params.id,
                organisationId: orgId
            },
            data: req.body
        });

        // Audit Log
        try {
            const { logAudit } = await import('../utils/auditLogger');
            logAudit({
                action: 'UPDATE_SMS_CAMPAIGN',
                entity: 'SMSCampaign',
                entityId: campaign.id,
                actorId: user.id,
                organisationId: orgId,
                details: { name: campaign.name, updatedFields: Object.keys(req.body) }
            });
        } catch (e) {
            console.error('Audit Log Error:', e);
        }
        res.json(campaign);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const deleteSMSCampaign = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No org' });

        const campaign = await prisma.sMSCampaign.update({
            where: {
                id: req.params.id,
                organisationId: orgId
            },
            data: { isDeleted: true }
        });

        // Audit Log
        try {
            const { logAudit } = await import('../utils/auditLogger');
            logAudit({
                action: 'DELETE_SMS_CAMPAIGN',
                entity: 'SMSCampaign',
                entityId: req.params.id,
                actorId: user.id,
                organisationId: orgId,
                details: { name: campaign.name }
            });
        } catch (e) {
            console.error('Audit Log Error:', e);
        }
        res.json({ message: 'SMS Campaign deleted' });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};
