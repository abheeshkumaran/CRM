
import { Request, Response } from 'express';
import { getOrgId } from '../utils/hierarchyUtils';
import { CampaignProcessor } from '../services/campaignProcessor';
import prisma from '../config/prisma';


interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        organisationId: string;
    };
}

export const getWhatsAppCampaigns = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No organisation found' });

        const campaigns = await prisma.whatsAppCampaign.findMany({
            where: { organisationId: orgId as string, isDeleted: false },
            orderBy: { createdAt: 'desc' },
            include: {
                createdBy: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                }
            }
        });
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const createWhatsAppCampaign = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No organisation found' });

        const { recipients, testNumber, ...campaignData } = req.body;

        // Validate that we have either recipients or testNumber
        if (!recipients && !testNumber) {
            return res.status(400).json({
                message: 'Either recipients array or testNumber is required'
            });
        }

        // Initialize stats
        const initialStats = {
            sent: 0,
            delivered: 0,
            read: 0,
            failed: 0,
            replied: 0
        };

        const campaign = await prisma.whatsAppCampaign.create({
            data: {
                ...campaignData,
                recipients: recipients || [],
                testNumber,
                organisationId: orgId as string, // Type assertion since we've validated orgId is not null
                createdById: user.id,
                stats: initialStats
            }
        });

        // Audit Log
        try {
            const { logAudit } = await import('../utils/auditLogger');
            logAudit({
                action: 'CREATE_WHATSAPP_CAMPAIGN',
                entity: 'WhatsAppCampaign',
                entityId: campaign.id,
                actorId: user.id,
                organisationId: orgId as string,
                details: { name: campaign.name, recipientCount: (recipients || []).length }
            });
        } catch (e) {
            console.error('Audit Log Error:', e);
        }

        // If status is 'sent', process the campaign immediately
        if (req.body.status === 'sent') {
            // Process campaign asynchronously
            CampaignProcessor.processWhatsAppCampaign(campaign.id)
                .catch(error => {
                    console.error('Campaign processing error:', error);
                });
        }

        res.status(201).json(campaign);
    } catch (error) {
        console.error('WhatsApp Campaign Error:', error);
        res.status(400).json({ message: (error as Error).message });
    }
};

export const updateWhatsAppCampaign = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const campaignId = req.params.id;

        // Check if campaign exists and belongs to user's organisation
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No organisation found' });

        const existingCampaign = await prisma.whatsAppCampaign.findFirst({
            where: {
                id: campaignId,
                organisationId: orgId as string,
                isDeleted: false
            }
        });

        if (!existingCampaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Prevent updating sent campaigns
        if (existingCampaign.status === 'sent' && req.body.status !== 'sent') {
            return res.status(400).json({ message: 'Cannot modify a campaign that has already been sent' });
        }

        const campaign = await prisma.whatsAppCampaign.update({
            where: { id: campaignId },
            data: req.body
        });

        // Audit Log
        try {
            const { logAudit } = await import('../utils/auditLogger');
            logAudit({
                action: 'UPDATE_WHATSAPP_CAMPAIGN',
                entity: 'WhatsAppCampaign',
                entityId: campaignId,
                actorId: user.id,
                organisationId: orgId as string,
                details: { name: campaign.name, updatedFields: Object.keys(req.body) }
            });
        } catch (e) {
            console.error('Audit Log Error:', e);
        }

        // If status changed to 'sent', process the campaign
        if (req.body.status === 'sent' && existingCampaign.status !== 'sent') {
            CampaignProcessor.processWhatsAppCampaign(campaign.id)
                .catch(error => {
                    console.error('Campaign processing error:', error);
                });
        }

        res.json(campaign);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const deleteWhatsAppCampaign = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const campaignId = req.params.id;
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No organisation found' });

        // Check if campaign exists and belongs to user's organisation
        const existingCampaign = await prisma.whatsAppCampaign.findFirst({
            where: {
                id: campaignId,
                organisationId: orgId as string,
                isDeleted: false
            }
        });

        if (!existingCampaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        await prisma.whatsAppCampaign.update({
            where: { id: campaignId },
            data: { isDeleted: true }
        });

        // Audit Log
        try {
            const { logAudit } = await import('../utils/auditLogger');
            logAudit({
                action: 'DELETE_WHATSAPP_CAMPAIGN',
                entity: 'WhatsAppCampaign',
                entityId: campaignId,
                actorId: user.id,
                organisationId: orgId as string,
                details: { name: existingCampaign.name }
            });
        } catch (e) {
            console.error('Audit Log Error:', e);
        }

        res.json({ message: 'WhatsApp Campaign deleted' });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};
