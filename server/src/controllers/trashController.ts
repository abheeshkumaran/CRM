import { Request, Response } from 'express';
import { ResponseHandler as ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { getOrgId } from '../utils/hierarchyUtils';
import { logAudit } from '../utils/auditLogger';
import { TrashService } from '../services/trashService';
import prisma from '../config/prisma';


export const getTrashItems = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const organisationId = getOrgId(user);

    try {
        if (!organisationId) {
            return ApiResponse.forbidden(res, 'User not associated with an organisation');
        }

        // Fetch deleted items from all relevant models
        const [leads, contacts, accounts, opportunities, tasks, documents, products, users, teams, quotes, campaigns, cases, branches] = await Promise.all([
            prisma.lead.findMany({ where: { organisationId, isDeleted: true }, orderBy: { updatedAt: 'desc' } }),
            prisma.contact.findMany({ where: { organisationId, isDeleted: true }, orderBy: { updatedAt: 'desc' } }),
            prisma.account.findMany({ where: { organisationId, isDeleted: true }, orderBy: { updatedAt: 'desc' } }),
            prisma.opportunity.findMany({ where: { organisationId, isDeleted: true }, orderBy: { updatedAt: 'desc' } }),
            prisma.task.findMany({ where: { organisationId, isDeleted: true }, orderBy: { updatedAt: 'desc' } }),
            prisma.document.findMany({ where: { organisationId, isDeleted: true }, orderBy: { updatedAt: 'desc' } }),
            prisma.product.findMany({ where: { organisationId, isDeleted: true }, orderBy: { updatedAt: 'desc' } }),
            prisma.user.findMany({ where: { organisationId, isPlaceholder: true }, orderBy: { updatedAt: 'desc' } }),
            prisma.team.findMany({ where: { organisationId, isDeleted: true }, orderBy: { updatedAt: 'desc' } }),
            prisma.quote.findMany({ where: { organisationId, isDeleted: true }, orderBy: { updatedAt: 'desc' } }),
            prisma.campaign.findMany({ where: { organisationId, isDeleted: true }, orderBy: { updatedAt: 'desc' } }),
            prisma.case.findMany({ where: { organisationId, isDeleted: true }, orderBy: { updatedAt: 'desc' } }),
            prisma.branch.findMany({ where: { organisationId, isDeleted: true }, orderBy: { updatedAt: 'desc' } })
        ]);

        const trashItems = [
            ...leads.map((item: any) => ({ ...item, type: 'Lead', name: `${item.firstName} ${item.lastName || ''}`.trim(), deletedAt: item.updatedAt })),
            ...contacts.map((item: any) => ({ ...item, type: 'Contact', name: `${item.firstName} ${item.lastName || ''}`.trim(), deletedAt: item.updatedAt })),
            ...accounts.map((item: any) => ({ ...item, type: 'Account', name: item.name, deletedAt: item.updatedAt })),
            ...opportunities.map((item: any) => ({ ...item, type: 'Opportunity', name: item.name, deletedAt: item.updatedAt })),
            ...tasks.map((item: any) => ({ ...item, type: 'Task', name: item.subject, deletedAt: item.updatedAt })),
            ...documents.map((item: any) => ({ ...item, type: 'Document', name: item.name, deletedAt: item.updatedAt })),
            ...products.map((item: any) => ({ ...item, type: 'Product', name: item.name, deletedAt: item.updatedAt })),
            ...users.map((item: any) => ({ ...item, type: 'User', name: `${item.firstName} ${item.lastName}`.trim(), deletedAt: item.updatedAt })),
            ...teams.map((item: any) => ({ ...item, type: 'Team', name: item.name, deletedAt: item.updatedAt })),
            ...quotes.map((item: any) => ({ ...item, type: 'Quote', name: item.title || item.quoteNumber, deletedAt: item.updatedAt })),
            ...campaigns.map((item: any) => ({ ...item, type: 'Campaign', name: item.name, deletedAt: item.updatedAt })),
            ...cases.map((item: any) => ({ ...item, type: 'Case', name: item.subject, deletedAt: item.updatedAt })),
            ...branches.map((item: any) => ({ ...item, type: 'Branch', name: item.name, deletedAt: item.updatedAt }))
        ].sort((a, b) => (new Date(b.deletedAt).getTime() || 0) - (new Date(a.deletedAt).getTime() || 0));

        return ApiResponse.success(res, trashItems, 'Trash items fetched successfully');
    } catch (error: any) {
        logger.apiError('GET', '/api/trash', error, user?.id, organisationId ?? undefined);
        return ApiResponse.serverError(res, 'Error fetching trash items');
    }
};

export const restoreItem = async (req: Request, res: Response) => {
    const { type, id } = req.body;
    const user = (req as any).user;
    const organisationId = getOrgId(user);

    try {
        if (!organisationId) {
            return ApiResponse.forbidden(res, 'User not associated with an organisation');
        }

        let result;
        const data = { isDeleted: false };

        switch (type) {
            case 'Lead':
                result = await prisma.lead.update({ where: { id, organisationId }, data });

                // Also restore associated open/expected opportunities that were deleted with the lead
                await prisma.opportunity.updateMany({
                    where: { leadId: id, organisationId, isDeleted: true },
                    data: { isDeleted: false }
                });
                break;
            case 'Contact':
                result = await prisma.contact.update({ where: { id, organisationId }, data });
                break;
            case 'Account':
                result = await prisma.account.update({ where: { id, organisationId }, data });
                break;
            case 'Opportunity':
                result = await prisma.opportunity.update({ where: { id, organisationId }, data });
                break;
            case 'Task':
                result = await prisma.task.update({ where: { id, organisationId }, data });
                break;
            case 'Document':
                result = await prisma.document.update({ where: { id, organisationId }, data });
                break;
            case 'Product':
                result = await prisma.product.update({ where: { id, organisationId }, data });
                break;
            case 'User':
                result = await prisma.user.update({ where: { id, organisationId }, data: { isPlaceholder: false, isActive: true } });
                break;
            case 'Team':
                result = await prisma.team.update({ where: { id, organisationId }, data });
                break;
            case 'Quote':
                result = await prisma.quote.update({ where: { id, organisationId }, data });
                break;
            case 'Campaign':
                result = await prisma.campaign.update({ where: { id, organisationId }, data });
                break;
            case 'Case':
                result = await prisma.case.update({ where: { id, organisationId }, data });
                break;
            case 'Branch':
                result = await prisma.branch.update({ where: { id, organisationId }, data });
                break;
            default:
                return ApiResponse.validationError(res, 'Invalid item type');
        }

        await logAudit({
            organisationId,
            actorId: user.id,
            action: `RESTORE_${type.toUpperCase()}`,
            entity: type,
            entityId: id,
            details: { restoredBy: user.id }
        });

        return ApiResponse.success(res, result, `${type} restored successfully`);
    } catch (error: any) {
        logger.apiError('POST', '/api/trash/restore', error, user?.id, organisationId ?? undefined);
        return ApiResponse.serverError(res, `Error restoring ${type}`);
    }
};

export const permanentDelete = async (req: Request, res: Response) => {
    const { type, id } = req.body;
    const user = (req as any).user;
    const organisationId = getOrgId(user);

    try {
        if (!organisationId) {
            return ApiResponse.forbidden(res, 'User not associated with an organisation');
        }

        const result = await TrashService.permanentDelete(type, id, organisationId, user.id);

        await logAudit({
            organisationId,
            actorId: user.id,
            action: `PERMANENT_DELETE_${type.toUpperCase()}`,
            entity: type,
            entityId: id,
            details: { deletedBy: user.id }
        });

        return ApiResponse.success(res, result, `${type} permanently deleted`);
    } catch (error: any) {
        logger.apiError('DELETE', '/api/trash/permanent', error, user?.id, organisationId ?? undefined);
        return ApiResponse.serverError(res, `Error permanently deleting ${type}`);
    }
};
