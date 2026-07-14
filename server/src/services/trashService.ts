import { logger } from '../utils/logger';
import prisma from '../config/prisma';


export class TrashService {
    /**
     * Permanently deletes an item from the database.
     * Handles complex logic for Users (ownership transfer, data cleanup).
     */
    static async permanentDelete(type: string, id: string, organisationId: string, actorId?: string) {
        try {
            let result;
            switch (type) {
                case 'Lead':
                    await this.purgeRelatedData('Lead', id, organisationId);
                    await prisma.leadProduct.deleteMany({ where: { leadId: id } });
                    result = await prisma.lead.delete({ where: { id, organisationId } });
                    break;
                case 'Contact':
                    await this.purgeRelatedData('Contact', id, organisationId);
                    result = await prisma.contact.delete({ where: { id, organisationId } });
                    break;
                case 'Account':
                    await this.purgeRelatedData('Account', id, organisationId);
                    // Opportunities have a required accountId FK with no cascade — must delete them first
                    await this.purgeAccountOpportunities(id, organisationId);
                    // AccountProduct has onDelete: Cascade but delete explicitly to be safe
                    await prisma.accountProduct.deleteMany({ where: { accountId: id } });
                    result = await prisma.account.delete({ where: { id, organisationId } });
                    break;
                case 'Opportunity':
                    await this.purgeRelatedData('Opportunity', id, organisationId);
                    // Additional Opportunity-specific cleanup
                    await prisma.quote.deleteMany({ where: { opportunityId: id, organisationId } });
                    result = await prisma.opportunity.delete({ where: { id, organisationId } });
                    break;
                case 'Task':
                    result = await prisma.task.delete({ where: { id, organisationId } });
                    break;
                case 'Document':
                    result = await prisma.document.delete({ where: { id, organisationId } });
                    break;
                case 'Product':
                    await prisma.accountProduct.deleteMany({ where: { productId: id, organisationId } });
                    await prisma.leadProduct.deleteMany({ where: { productId: id } });
                    result = await prisma.product.delete({ where: { id, organisationId } });
                    break;
                case 'User': {
                    const userId = id;
                    const existing = await prisma.user.findFirst({
                        where: { id: userId, organisationId },
                        include: { subordinates: true }
                    });

                    if (!existing) throw new Error('User not found');

                    // 1. Determine transfer target
                    let transferTargetId: string | null = existing.reportsToId;
                    if (!transferTargetId) {
                        const adminUser = await prisma.user.findFirst({
                            where: { organisationId, role: 'admin', isActive: true, id: { not: userId }, isPlaceholder: false }
                        });
                        transferTargetId = adminUser ? adminUser.id : (actorId || null);
                    }

                    if (!transferTargetId) {
                        // If still no target, we might need to find ANY active admin or the org owner
                        // For cron jobs, this is a fallback
                        const fallbackAdmin = await prisma.user.findFirst({
                            where: { organisationId, role: 'admin', isActive: true, isPlaceholder: false }
                        });
                        transferTargetId = fallbackAdmin ? fallbackAdmin.id : null;
                    }

                    if (!transferTargetId) {
                        throw new Error('No suitable transfer target found for user data');
                    }

                    // 2. Transfer transactional ownership
                    const entitiesToTransfer = [
                        { model: 'lead', ownerField: 'assignedToId' },
                        { model: 'account', ownerField: 'ownerId' },
                        { model: 'contact', ownerField: 'ownerId' },
                        { model: 'opportunity', ownerField: 'ownerId' },
                        { model: 'task', ownerField: 'assignedToId' },
                        { model: 'case', ownerField: 'assignedToId' },
                        { model: 'quote', ownerField: 'assignedToId' },
                        { model: 'goal', ownerField: 'assignedToId' },
                        { model: 'salesTarget', ownerField: 'assignedToId' },
                        { model: 'followUp', ownerField: 'assignedToId' },
                        { model: 'calendarEvent', ownerField: 'createdById' },
                        { model: 'quote', ownerField: 'createdById' },
                        { model: 'goal', ownerField: 'createdById' },
                        { model: 'team', ownerField: 'createdById' },
                        { model: 'checkIn', ownerField: 'userId' },
                        { model: 'document', ownerField: 'createdById' },
                        { model: 'paymentRecord', ownerField: 'createdById' },
                        { model: 'commission', ownerField: 'userId' },
                        { model: 'commission', ownerField: 'createdById' },
                        { model: 'importJob', ownerField: 'createdById' },
                        { model: 'apiKey', ownerField: 'createdById' },
                        { model: 'productShare', ownerField: 'createdById' }
                    ];

                    for (const entity of entitiesToTransfer) {
                        if ((prisma as any)[entity.model]) {
                            await (prisma as any)[entity.model].updateMany({
                                where: { [entity.ownerField]: userId },
                                data: { [entity.ownerField]: transferTargetId }
                            });
                        }
                    }

                    // 3. Purge non-essential data
                    const entitiesToPurge = [
                        { model: 'notification', field: 'recipientId' },
                        { model: 'searchHistory', field: 'userId' },
                        { model: 'apiKey', field: 'createdById' },
                        { model: 'importJob', field: 'createdById' }
                    ];

                    for (const item of entitiesToPurge) {
                        if ((prisma as any)[item.model]) {
                            await (prisma as any)[item.model].deleteMany({
                                where: { [item.field]: userId }
                            });
                        }
                    }

                    // 4. Nullify restrictive FKs
                    const entitiesToNullify = [
                        { model: 'lead', field: 'createdById' },
                        { model: 'account', field: 'createdById' },
                        { model: 'contact', field: 'createdById' },
                        { model: 'opportunity', field: 'createdById' },
                        { model: 'task', field: 'createdById' },
                        { model: 'interaction', field: 'createdById' }
                    ];

                    for (const item of entitiesToNullify) {
                        if ((prisma as any)[item.model]) {
                            try {
                                await (prisma as any)[item.model].updateMany({
                                    where: { [item.field]: userId },
                                    data: { [item.field]: null }
                                });
                            } catch (e) {}
                        }
                    }

                    // 5. Disconnect subordinates
                    if (existing.subordinates.length > 0) {
                        await prisma.user.updateMany({
                            where: { reportsToId: userId },
                            data: { reportsToId: transferTargetId }
                        });
                    }

                    result = await prisma.user.delete({ where: { id: userId } });
                    break;
                }
                case 'Team':
                    result = await prisma.team.delete({ where: { id, organisationId } });
                    break;
                case 'Quote':
                    result = await prisma.quote.delete({ where: { id, organisationId } });
                    break;
                case 'Campaign':
                    result = await prisma.campaign.delete({ where: { id, organisationId } });
                    break;
                case 'Case':
                    result = await prisma.case.delete({ where: { id, organisationId } });
                    break;
                case 'Branch':
                    result = await prisma.branch.delete({ where: { id, organisationId } });
                    break;
                default:
                    throw new Error('Invalid item type');
            }
            return result;
        } catch (error) {
            logger.error(`TrashService.permanentDelete Error [${type}:${id}]:`, error);
            throw error;
        }
    }

    /**
     * Purges related data that doesn't have Cascade delete in schema
     */
    private static async purgeRelatedData(type: string, id: string, organisationId: string) {
        const fieldMap: Record<string, string> = {
            'Lead': 'leadId',
            'Contact': 'contactId',
            'Account': 'accountId',
            'Opportunity': 'opportunityId'
        };

        const field = fieldMap[type];
        if (!field) return;

        const where = { [field]: id, organisationId };

        try {
            // Delete common related entities
            await prisma.task.deleteMany({ where });
            await prisma.task.deleteMany({ where });
            await prisma.interaction.deleteMany({ where });
            await prisma.calendarEvent.deleteMany({ where });
            await prisma.document.deleteMany({ where: { [field]: id, organisationId } });
        } catch (error) {
            logger.error(`PurgeRelatedData partially failed for ${type} ${id}:`, error);
        }
    }

    /**
     * Deletes all Opportunities linked to an Account, along with their nested data.
     * Required because Opportunity.accountId is a required FK with no onDelete: Cascade.
     */
    private static async purgeAccountOpportunities(accountId: string, organisationId: string) {
        const opportunities = await prisma.opportunity.findMany({
            where: { accountId, organisationId },
            select: { id: true }
        });

        for (const opp of opportunities) {
            try {
                // Delete nested opportunity data first
                await prisma.quote.deleteMany({ where: { opportunityId: opp.id, organisationId } });
                await prisma.task.deleteMany({ where: { opportunityId: opp.id, organisationId } });
                await prisma.task.deleteMany({ where: { opportunityId: opp.id, organisationId } });
                await prisma.interaction.deleteMany({ where: { opportunityId: opp.id, organisationId } });
                await prisma.calendarEvent.deleteMany({ where: { opportunityId: opp.id, organisationId } });
                await prisma.document.deleteMany({ where: { opportunityId: opp.id, organisationId } });
                await prisma.opportunity.delete({ where: { id: opp.id } });
            } catch (err) {
                logger.error(`purgeAccountOpportunities: failed to delete opportunity ${opp.id}:`, err);
            }
        }
    }

    /**
     * Automatically purges items that have been in the trash for longer than the retention period.
     */
    static async runAutomatedPurge(retentionDays: number = 7) {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - retentionDays);

        const models = [
            { name: 'lead', type: 'Lead' },
            { name: 'contact', type: 'Contact' },
            { name: 'account', type: 'Account' },
            { name: 'opportunity', type: 'Opportunity' },
            { name: 'task', type: 'Task' },
            { name: 'document', type: 'Document' },
            { name: 'product', type: 'Product' },
            { name: 'user', type: 'User' },
            { name: 'team', type: 'Team' },
            { name: 'quote', type: 'Quote' },
            { name: 'campaign', type: 'Campaign' },
            { name: 'case', type: 'Case' },
            { name: 'branch', type: 'Branch' }
        ];

        console.log(`[TrashService] Starting automated purge for items deleted before ${thresholdDate.toISOString()}`);

        for (const modelConfig of models) {
            try {
                let whereClause: any = {
                    isDeleted: true,
                    updatedAt: { lt: thresholdDate }
                };

                // User model doesn't have isDeleted/deletedAt, use isPlaceholder/updatedAt
                if (modelConfig.name === 'user') {
                    whereClause = {
                        isPlaceholder: true,
                        updatedAt: { lt: thresholdDate }
                    };
                }

                // Find items to purge
                const itemsToPurge = await (prisma as any)[modelConfig.name].findMany({
                    where: whereClause,
                    select: { id: true, organisationId: true }
                });

                if (itemsToPurge.length > 0) {
                    console.log(`[TrashService] Purging ${itemsToPurge.length} items from ${modelConfig.type}...`);
                    for (const item of itemsToPurge) {
                        try {
                            await this.permanentDelete(modelConfig.type, item.id, item.organisationId);
                        } catch (itemError) {
                            console.error(`[TrashService] Failed to purge ${modelConfig.type} ${item.id}:`, itemError);
                        }
                    }
                }
            } catch (error) {
                console.error(`[TrashService] Error purging ${modelConfig.type}:`, error);
            }
        }

        console.log('[TrashService] Automated purge completed.');
    }
}
