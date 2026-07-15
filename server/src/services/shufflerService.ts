import prisma from '../config/prisma';

export const runShuffler = async () => {
    try {
        console.log('[ShufflerService] Starting background shuffle check...');
        const now = new Date();
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMinute = now.getMinutes().toString().padStart(2, '0');
        const currentTimeString = `${currentHour}:${currentMinute}`;
        console.log(`[ShufflerService] Checking config against Server Time: ${currentTimeString}`);

        // Get all organisations that might have a shuffler config
        const orgs = await prisma.organisation.findMany({
            where: {
                isDeleted: false,
                status: 'active'
            }
        });

        for (const org of orgs) {
            if (!org.shufflerConfig) continue;

            const config = org.shufflerConfig as any;
            if (!config.statuses || config.statuses.length === 0) continue;
            
            // Check if it's the right time to shuffle for this org
            if (config.shuffleTime !== currentTimeString) continue;

            console.log(`[ShufflerService] Executing shuffle for Org: ${org.name}`);

            const daysBefore = parseInt(config.shuffleBeforeDays) || 0;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysBefore);

            // Find eligible leads
            const eligibleLeads = await prisma.lead.findMany({
                where: {
                    organisationId: org.id,
                    isDeleted: false,
                    status: { in: config.statuses },
                    updatedAt: { lt: cutoffDate }
                },
                select: { id: true, assignedToId: true }
            });

            if (eligibleLeads.length === 0) {
                console.log(`[ShufflerService] No eligible leads found for Org: ${org.name}`);
                continue;
            }

            // Find eligible active users in the org
            const activeUsers = await prisma.user.findMany({
                where: {
                    organisationId: org.id,
                    isActive: true,
                    isOffDuty: false
                },
                select: { id: true }
            });

            if (activeUsers.length === 0) {
                console.log(`[ShufflerService] No active users available to receive leads in Org: ${org.name}`);
                continue;
            }

            // Reassign leads round-robin
            let userIndex = 0;
            let reassignedCount = 0;

            for (const lead of eligibleLeads) {
                // If there's more than 1 user, try to skip the current owner
                let targetUser = activeUsers[userIndex % activeUsers.length];
                
                if (activeUsers.length > 1 && targetUser.id === lead.assignedToId) {
                    userIndex++;
                    targetUser = activeUsers[userIndex % activeUsers.length];
                }

                if (targetUser.id !== lead.assignedToId) {
                    await prisma.lead.update({
                        where: { id: lead.id },
                        data: { assignedToId: targetUser.id }
                    });

                    // Log history
                    await prisma.leadHistory.create({
                        data: {
                            leadId: lead.id,
                            fieldName: 'assignedToId',
                            oldValue: lead.assignedToId,
                            newValue: targetUser.id,
                            changedById: null, // System action
                            reason: 'Automatic lead shuffler execution'
                        }
                    });

                    reassignedCount++;
                }

                userIndex++;
            }

            console.log(`[ShufflerService] Successfully reassigned ${reassignedCount} leads in Org: ${org.name}`);
        }
    } catch (error) {
        console.error('[ShufflerService] Error during shuffle execution:', error);
    }
};
