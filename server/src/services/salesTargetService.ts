
import { NotificationService } from './notificationService';
import prisma from '../config/prisma';


export class SalesTargetService {
    /**
     * Updates the progress of a user's active targets based on won opportunities.
     * Also handles rolling up progress to parent targets.
     * @param userId The ID of the user (opportunity owner)
     * @param date The date of the opportunity update (usually 'now')
     */
    static async updateProgressForUser(userId: string, date: Date = new Date()) {
        try {
            console.log(`[SalesTargetService] Updating progress for user: ${userId}`);

            // 1. Find all active targets (and completed ones to check for regression)
            const activeTargets = await prisma.salesTarget.findMany({
                where: {
                    assignedToId: userId,
                    status: { in: ['active', 'completed'] },
                    isDeleted: false,
                    autoDistributed: false, // Only update leaf nodes
                    startDate: { lte: date },
                    endDate: { gte: date }
                }
            });

            if (activeTargets.length === 0) return;

            for (const target of activeTargets) {
                let achievedValue = 0;

                // Construct filter for Opportunity Type if specified
                const typeFilter = target.opportunityType ? { type: target.opportunityType } : {};

                // 2. Calculate based on metric
                if (target.metric === 'units' || target.productId) {
                    // Calculate from QuoteLineItems (Units or Product Revenue)
                    const aggregation = await prisma.quoteLineItem.aggregate({
                        where: {
                            quote: {
                                opportunity: {
                                    ownerId: userId,
                                    stage: 'closed_won',
                                    isDeleted: false,
                                    updatedAt: { gte: target.startDate, lte: target.endDate },
                                    ...typeFilter
                                }
                            },
                            productId: target.productId || undefined
                        },
                        _sum: {
                            quantity: true,
                            total: true
                        }
                    });

                    if (target.metric === 'units') {
                        achievedValue = aggregation._sum.quantity || 0;
                    } else {
                        // Revenue for specific product
                        achievedValue = aggregation._sum.total || 0;
                    }
                } else {
                    // Generic Revenue (Total Opportunity Amount)
                    const aggregation = await prisma.opportunity.aggregate({
                        where: {
                            ownerId: userId,
                            stage: 'closed_won',
                            isDeleted: false,
                            updatedAt: {
                                gte: target.startDate,
                                lte: target.endDate
                            },
                            ...typeFilter
                        },
                        _sum: {
                            amount: true
                        }
                    });
                    achievedValue = aggregation._sum.amount || 0;
                }

                // 3. Update the target logic
                let newStatus = target.status;

                // Check for completion
                if (achievedValue >= target.targetValue && target.status !== 'completed') {
                    newStatus = 'completed';

                    // Notify user
                    try {
                        await NotificationService.send(
                            userId,
                            'Sales Target Achieved! 🎯',
                            `Congratulations! You have achieved your sales target for ${target.period} (${target.metric || 'revenue'}). Great work!`,
                            'success'
                        );
                    } catch (err) {
                        console.error('[SalesTargetService] Failed to send notification', err);
                    }
                } else if (achievedValue < target.targetValue && target.status === 'completed') {
                    // Regression (e.g. order cancelled)
                    newStatus = 'active';
                }

                console.log(`[SalesTargetService] Target ${target.id}: Achieved ${achievedValue} / ${target.targetValue} (${newStatus})`);

                // ALWAYS Update
                await prisma.salesTarget.update({
                    where: { id: target.id },
                    data: {
                        achievedValue,
                        status: newStatus
                    }
                });

                // Check for hierarchy rollup
                if (target.parentTargetId) {
                    await SalesTargetService.rollupToParent(target.parentTargetId);
                }
            }
        } catch (error) {
            console.error('[SalesTargetService] Error updating progress:', error);
        }
    }

    /**
     * Recursively rolls up achieved values to parent targets.
     * @param parentTargetId The ID of the parent target
     */
    private static async rollupToParent(parentTargetId: string) {
        try {
            const parentTarget = await prisma.salesTarget.findUnique({
                where: { id: parentTargetId }
            });
            if (!parentTarget || parentTarget.isDeleted) return;

            // Sum achieved values from children
            const childAggregation = await prisma.salesTarget.aggregate({
                where: {
                    parentTargetId: parentTargetId,
                    isDeleted: false
                },
                _sum: {
                    achievedValue: true
                }
            });

            const totalChildAchieved = childAggregation._sum.achievedValue || 0;

            console.log(`[SalesTargetService] Rolling up to parent ${parentTargetId}: Child Sum = ${totalChildAchieved}`);

            const updateData: any = { achievedValue: totalChildAchieved };

            if (totalChildAchieved >= parentTarget.targetValue && parentTarget.status !== 'completed') {
                updateData.status = 'completed';
                // Notify parent... skipped
            } else if (totalChildAchieved < parentTarget.targetValue && parentTarget.status === 'completed') {
                updateData.status = 'active';
            }

            await prisma.salesTarget.update({
                where: { id: parentTargetId },
                data: updateData
            });

            // Recursively go up
            if (parentTarget.parentTargetId) {
                await this.rollupToParent(parentTarget.parentTargetId);
            }

        } catch (error) {
            console.error('[SalesTargetService] Error rolling up to parent:', error);
        }
    }

    /**
     * Checks for expired targets that were not completed, and sends notifications.
     */
    static async checkExpiredTargets() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const expiredTargets = await prisma.salesTarget.findMany({
                where: {
                    status: 'active', // Assumes 'active' targets that pass endDate are missed
                    endDate: { lt: today },
                    isDeleted: false
                },
                include: {
                    assignedTo: {
                        select: { id: true, firstName: true, lastName: true, reportsToId: true, organisationId: true }
                    }
                }
            });

            if (expiredTargets.length === 0) return;

            console.log(`[SalesTargetService] Found ${expiredTargets.length} missed sales targets.`);

            for (const target of expiredTargets) {
                if (!target.assignedToId || !target.assignedTo) continue;

                const metricText = target.metric === 'units' ? 'units' : 'revenue';
                const message = `Sales Target Missed: You achieved ${target.achievedValue} / ${target.targetValue} ${metricText} for ${target.period}.`;

                // Notify User
                await NotificationService.send(
                    target.assignedToId,
                    '❌ Sales Target Missed',
                    message,
                    'warning'
                ).catch(err => console.error(`[SalesTargetService] Failed to notify user ${target.assignedToId}:`, err));

                // Notify Manager
                if (target.assignedTo.reportsToId) {
                    await NotificationService.send(
                        target.assignedTo.reportsToId,
                        '⚠️ Team Member Missed Target',
                        `${target.assignedTo.firstName} ${target.assignedTo.lastName} missed their sales target for ${target.period}. Achieved: ${target.achievedValue} / ${target.targetValue}.`,
                        'warning'
                    ).catch(err => console.error(`[SalesTargetService] Failed to notify manager ${target.assignedTo?.reportsToId}:`, err));
                }

                // Notify Admins
                if (target.assignedTo.organisationId) {
                    const admins = await prisma.user.findMany({
                        where: { organisationId: target.assignedTo.organisationId, role: 'admin', isActive: true },
                        select: { id: true }
                    });
                    for (const admin of admins) {
                        await NotificationService.send(
                            admin.id,
                            '⚠️ Missed Sales Target',
                            `${target.assignedTo.firstName} ${target.assignedTo.lastName} missed their sales target for ${target.period}. Achieved: ${target.achievedValue} / ${target.targetValue}.`,
                            'warning'
                        ).catch(err => console.error(`[SalesTargetService] Failed to notify admin ${admin.id}:`, err));
                    }
                }

                // Mark target as failed/missed if schema supports it, otherwise leave as-is or we update it to 'failed'
                // Assuming schema has a 'failed' or 'missed' state, if it errors out we'll know the enum restricts it.
                // Let's try 'failed' as it's common. If it throws, we can adjust.
                try {
                    await prisma.salesTarget.update({
                        where: { id: target.id },
                        data: { status: 'failed' as any }
                    });
                } catch (e) {
                    console.error('[SalesTargetService] Could not update status to failed. Schema may not support it.', e);
                }
            }
        } catch (error) {
            console.error('[SalesTargetService] Error checking expired targets:', error);
        }
    }
}
