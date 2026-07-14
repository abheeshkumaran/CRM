import { Request, Response } from 'express';
import { getOrgId } from '../utils/hierarchyUtils';
import prisma from '../config/prisma';


export const getCampaigns = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);

        if (!orgId) return res.status(403).json({ message: 'User not associated with an organisation' });

        const where: any = { organisationId: orgId, isDeleted: false };
        if (user.role === 'super_admin' && req.query.organisationId) {
            where.organisationId = String(req.query.organisationId);
        }

        const campaigns = await prisma.campaign.findMany({
            where,
            include: {
                emailList: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ campaigns });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const createCampaign = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No org' });

        const data: any = {
            name: req.body.name,
            subject: req.body.subject,
            content: req.body.content,
            status: req.body.status || 'draft',
            scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : null,
            organisation: { connect: { id: orgId } },
            createdBy: { connect: { id: user.id } }
        };

        if (req.body.emailList) {
            data.emailList = { connect: { id: req.body.emailList } };
        }

        const campaign = await prisma.campaign.create({
            data
        });

        // Audit Log
        try {
            const { logAudit } = await import('../utils/auditLogger');
            logAudit({
                action: 'CREATE_CAMPAIGN',
                entity: 'Campaign',
                entityId: campaign.id,
                actorId: user.id,
                organisationId: orgId,
                details: { name: campaign.name, subject: campaign.subject }
            });
        } catch (e) {
            console.error('Audit Log Error:', e);
        }

        res.status(201).json(campaign);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const getCampaignById = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);

        const where: any = { id: req.params.id, isDeleted: false };
        if (user.role !== 'super_admin') {
            if (!orgId) return res.status(403).json({ message: 'No org' });
            where.organisationId = orgId;
        }

        const campaign = await prisma.campaign.findFirst({
            where,
            include: { emailList: true }
        });
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
        res.json(campaign);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const updateCampaign = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const campaignId = req.params.id;

        // Verify campaign exists and belongs to org
        const existing = await prisma.campaign.findFirst({
            where: { id: campaignId, isDeleted: false }
        });

        if (!existing) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        if (existing.organisationId !== orgId && user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized to update this campaign' });
        }

        const updateData: any = {};
        if (req.body.name !== undefined) updateData.name = req.body.name;
        if (req.body.subject !== undefined) updateData.subject = req.body.subject;
        if (req.body.content !== undefined) updateData.content = req.body.content;
        if (req.body.status !== undefined) updateData.status = req.body.status;
        if (req.body.scheduledAt !== undefined) {
            updateData.scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : null;
        }
        if (req.body.emailList !== undefined) {
            updateData.emailList = req.body.emailList
                ? { connect: { id: req.body.emailList } }
                : { disconnect: true };
        }

        const campaign = await prisma.campaign.update({
            where: { id: campaignId },
            data: updateData,
            include: { emailList: { select: { name: true } } }
        });

        // Audit Log
        try {
            const { logAudit } = await import('../utils/auditLogger');
            logAudit({
                action: 'UPDATE_CAMPAIGN',
                entity: 'Campaign',
                entityId: campaignId,
                actorId: user.id,
                organisationId: orgId as string,
                details: { name: campaign.name, updatedFields: Object.keys(updateData) }
            });
        } catch (e) {
            console.error('Audit Log Error:', e);
        }

        res.json(campaign);

        // Process campaign if status is set to 'sent' or 'scheduled'
        if (req.body.status === 'sent' || req.body.status === 'scheduled') {
            const { CampaignProcessor } = await import('../services/campaignProcessor');
            CampaignProcessor.processEmailCampaign(campaignId).catch(err => {
                console.error('[CampaignController] Error triggering campaign processing:', err);
            });
        }
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const deleteCampaign = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const campaignId = req.params.id;

        // Verify campaign exists
        const existing = await prisma.campaign.findFirst({
            where: { id: campaignId, isDeleted: false }
        });

        if (!existing) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        if (existing.organisationId !== orgId && user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized to delete this campaign' });
        }

        // Soft delete
        await prisma.campaign.update({
            where: { id: campaignId },
            data: { isDeleted: true, deletedAt: new Date() }
        });

        // Audit Log
        try {
            const { logAudit } = await import('../utils/auditLogger');
            logAudit({
                action: 'DELETE_CAMPAIGN',
                entity: 'Campaign',
                entityId: campaignId,
                actorId: user.id,
                organisationId: orgId as string,
                details: { name: existing.name }
            });
        } catch (e) {
            console.error('Audit Log Error:', e);
        }

        res.json({ message: 'Campaign deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};
