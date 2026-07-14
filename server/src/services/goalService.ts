import prisma from '../config/prisma';



export class GoalService {
    /**
     * Recalculates and updates progress for all active goals of a specific type for a user.
     * @param userId The ID of the user whose goals need updating
     * @param type The type of goal (e.g., 'revenue', 'leads', 'calls')
     */
    static async updateProgressForUser(userId: string, type: string) {
        try {
            console.log(`[GoalService] Updating ${type} progress for user: ${userId}`);

            const now = new Date();

            // Find all active goals of this type for the user
            const activeGoals = await prisma.goal.findMany({
                where: {
                    assignedToId: userId,
                    type: type,
                    status: 'active',
                    isDeleted: false,
                    startDate: { lte: now },
                    endDate: { gte: now }
                }
            });

            if (activeGoals.length === 0) {
                console.log(`[GoalService] No active ${type} goals found for user: ${userId}`);
                return;
            }

            for (const goal of activeGoals) {
                let progressValue = 0;

                // Calculate progress based on type
                switch (type.toLowerCase()) {
                    case 'revenue': {
                        const revenueAggregation = await prisma.opportunity.aggregate({
                            where: {
                                ownerId: userId,
                                stage: 'closed_won',
                                isDeleted: false,
                                updatedAt: {
                                    gte: goal.startDate,
                                    lte: goal.endDate
                                }
                            },
                            _sum: { amount: true }
                        });
                        progressValue = revenueAggregation._sum.amount || 0;
                        break;
                    }

                    case 'leads':
                        progressValue = await prisma.lead.count({
                            where: {
                                assignedToId: userId,
                                isDeleted: false,
                                createdAt: {
                                    gte: goal.startDate,
                                    lte: goal.endDate
                                }
                            }
                        });
                        break;

                    case 'calls':
                        progressValue = await prisma.interaction.count({
                            where: {
                                createdById: userId,
                                type: 'call',
                                isDeleted: false,
                                createdAt: {
                                    gte: goal.startDate,
                                    lte: goal.endDate
                                }
                            }
                        });
                        break;

                    case 'deals':
                        progressValue = await prisma.opportunity.count({
                            where: {
                                ownerId: userId,
                                isDeleted: false,
                                createdAt: {
                                    gte: goal.startDate,
                                    lte: goal.endDate
                                }
                            }
                        });
                        break;

                    case 'meetings':
                        progressValue = await prisma.interaction.count({
                            where: {
                                createdById: userId,
                                type: 'meeting',
                                isDeleted: false,
                                createdAt: {
                                    gte: goal.startDate,
                                    lte: goal.endDate
                                }
                            }
                        });
                        break;

                    default:
                        console.warn(`[GoalService] Unknown goal type: ${type}`);
                        continue;
                }

                // Calculate percent and update goal
                const achievementPercent = Math.round((progressValue / goal.targetValue) * 100);
                const updateData: any = {
                    currentValue: progressValue,
                    achievementPercent: achievementPercent
                };

                // Check for completion
                if (progressValue >= goal.targetValue && goal.status !== 'completed') {
                    updateData.status = 'completed';
                    updateData.completedAt = new Date();
                }

                await prisma.goal.update({
                    where: { id: goal.id },
                    data: updateData
                });

                console.log(`[GoalService] Updated Goal ${goal.id}: Progress ${progressValue}/${goal.targetValue} (${achievementPercent}%)`);
            }

        } catch (error) {
            console.error('[GoalService] Error updating progress:', error);
        }
    }

    /**
     * Refreshes all active goals for all users in an organization.
     * This is useful to call before displaying goals to ensure perfect accuracy.
     * @param organisationId The organization ID to refresh goals for
     */
    static async refreshOrgGoals(organisationId: string) {
        try {
            console.log(`[GoalService] Refreshing all active goals for organization: ${organisationId}`);

            const now = new Date();

            const activeGoals = await prisma.goal.findMany({
                where: {
                    organisationId,
                    status: 'active',
                    isDeleted: false,
                    startDate: { lte: now },
                    endDate: { gte: now }
                }
            });

            // Group by userId and type to minimize redundant calls
            const uniqueCombos = new Set<string>();
            for (const goal of activeGoals) {
                if (goal.assignedToId && goal.type !== 'manual') {
                    uniqueCombos.add(`${goal.assignedToId}:${goal.type}`);
                }
            }

            for (const combo of uniqueCombos) {
                const [userId, type] = combo.split(':');
                await this.updateProgressForUser(userId, type);
            }

            console.log(`[GoalService] Finished refreshing goals for organization: ${organisationId}`);
        } catch (error) {
            console.error('[GoalService] Error refreshing org goals:', error);
        }
    }
}
