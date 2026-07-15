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
                select: { id: true, assignedToId: true },
                orderBy: { id: 'asc' }
            });

            if (eligibleLeads.length === 0) {
                console.log(`[ShufflerService] No eligible leads found for Org: ${org.name}`);
                continue;
            }

            // Fetch admin roles from Role table for this org
            const adminRoles = await prisma.role.findMany({
                where: {
                    AND: [
                        {
                            OR: [
                                { name: { in: ['admin', 'org_admin', 'organization admin', 'super admin'], mode: 'insensitive' } },
                                { roleKey: { in: ['admin', 'org_admin', 'organization admin', 'super_admin'] } }
                            ]
                        },
                        {
                            OR: [
                                { organisationId: org.id },
                                { isSystemRole: true }
                            ]
                        }
                    ]
                }
            });
            const excludedRoleKeys = ['admin', 'org_admin', 'organization admin', 'super_admin', ...adminRoles.map(r => r.roleKey)];

            // Find eligible active users in the org
            const activeUsers = await prisma.user.findMany({
                where: {
                    organisationId: org.id,
                    isActive: true,
                    isOffDuty: false,
                    role: {
                        notIn: excludedRoleKeys
                    }
                },
                select: { id: true },
                orderBy: { id: 'asc' }
            });

            if (activeUsers.length === 0) {
                console.log(`[ShufflerService] No active users available to receive leads in Org: ${org.name}`);
                continue;
            }

            // Fetch past owners for eligible leads to ensure a strict cycle per lead
            let lastAssignedIndex = activeUsers.findIndex(u => u.id === config.lastAssignedUserId);
            if (lastAssignedIndex === -1) lastAssignedIndex = -1; // Will start at 0

            let reassignedCount = 0;

            for (const lead of eligibleLeads) {
                // If there's only 1 active user and they already own the lead, skip
                if (activeUsers.length === 1 && activeUsers[0].id === lead.assignedToId) {
                    continue;
                }

                // Advance pointer
                let nextIndex = (lastAssignedIndex + 1) % activeUsers.length;
                let targetUser = activeUsers[nextIndex];

                // If target is the current owner, skip to the next person
                if (targetUser.id === lead.assignedToId && activeUsers.length > 1) {
                    nextIndex = (nextIndex + 1) % activeUsers.length;
                    targetUser = activeUsers[nextIndex];
                }

                lastAssignedIndex = nextIndex;

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

                    // Send Notification to new owner
                    await prisma.notification.create({
                        data: {
                            title: 'New Lead Assigned',
                            message: `A lead has been automatically reassigned to you by the Shuffler.`,
                            type: 'popup',
                            relatedResource: 'lead',
                            relatedId: lead.id,
                            recipientId: targetUser.id,
                            organisationId: org.id
                        }
                    });

                    reassignedCount++;
                }
            }

            // Save the persistent round-robin pointer
            if (lastAssignedIndex !== -1 && activeUsers[lastAssignedIndex]) {
                const updatedConfig = { ...(org.shufflerConfig as Record<string, any>), lastAssignedUserId: activeUsers[lastAssignedIndex].id };
                await prisma.organisation.update({
                    where: { id: org.id },
                    data: { shufflerConfig: updatedConfig }
                });
            }

            console.log(`[ShufflerService] Successfully reassigned ${reassignedCount} leads in Org: ${org.name}`);
        }
    } catch (error) {
        console.error('[ShufflerService] Error during shuffle execution:', error);
    }
};

export const forceShuffleOrg = async (organisationId: string) => {
    try {
        console.log(`[ShufflerService] Force starting shuffle check for Org: ${organisationId}`);

        const org = await prisma.organisation.findUnique({
            where: { id: organisationId, isDeleted: false, status: 'active' }
        });

        if (!org || !org.shufflerConfig) {
            return { success: false, message: 'No shuffler config found for this organization.' };
        }

        const config = org.shufflerConfig as any;
        if (!config.statuses || config.statuses.length === 0) {
            return { success: false, message: 'No lead statuses configured for shuffling.' };
        }

        // Fetch admin roles from Role table for this org
        const adminRoles = await prisma.role.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { name: { in: ['admin', 'org_admin', 'organization admin', 'super admin'], mode: 'insensitive' } },
                            { roleKey: { in: ['admin', 'org_admin', 'organization admin', 'super_admin'] } }
                        ]
                    },
                    {
                        OR: [
                            { organisationId: org.id },
                            { isSystemRole: true }
                        ]
                    }
                ]
            }
        });
        const excludedRoleKeys = ['admin', 'org_admin', 'organization admin', 'super_admin', ...adminRoles.map(r => r.roleKey)];

        // Find eligible leads (bypass date checks, bypass time checks)
        const eligibleLeads = await prisma.lead.findMany({
            where: {
                organisationId: org.id,
                isDeleted: false,
                status: { in: config.statuses }
            },
            select: { id: true, assignedToId: true },
            orderBy: { id: 'asc' }
        });

        if (eligibleLeads.length === 0) {
            return { success: true, message: 'No eligible leads found for selected statuses.' };
        }

        // Find eligible active users in the org
        const activeUsers = await prisma.user.findMany({
            where: {
                organisationId: org.id,
                isActive: true,
                isOffDuty: false,
                role: {
                    notIn: excludedRoleKeys
                }
            },
            select: { id: true },
            orderBy: { id: 'asc' }
        });

        if (activeUsers.length === 0) {
            return { success: false, message: 'No active non-admin users available to receive leads.' };
        }

        let lastAssignedIndex = activeUsers.findIndex(u => u.id === config.lastAssignedUserId);
        if (lastAssignedIndex === -1) lastAssignedIndex = -1;

        let reassignedCount = 0;

        for (const lead of eligibleLeads) {
            // If there's only 1 active user and they already own the lead, skip
            if (activeUsers.length === 1 && activeUsers[0].id === lead.assignedToId) {
                continue;
            }

            // Advance pointer
            let nextIndex = (lastAssignedIndex + 1) % activeUsers.length;
            let targetUser = activeUsers[nextIndex];

            // If target is the current owner, skip to the next person
            if (targetUser.id === lead.assignedToId && activeUsers.length > 1) {
                nextIndex = (nextIndex + 1) % activeUsers.length;
                targetUser = activeUsers[nextIndex];
            }

            lastAssignedIndex = nextIndex;

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
                        reason: 'Manual force lead shuffler execution'
                    }
                });

                // Send Notification to new owner
                await prisma.notification.create({
                    data: {
                        title: 'New Lead Assigned',
                        message: `A lead has been automatically reassigned to you by the Shuffler.`,
                        type: 'popup',
                        relatedResource: 'lead',
                        relatedId: lead.id,
                        recipientId: targetUser.id,
                        organisationId: org.id
                    }
                });

                reassignedCount++;
            }
        }

        console.log(`[ShufflerService] Force successfully reassigned ${reassignedCount} leads in Org: ${org.name}`);
        // Save the persistent round-robin pointer
        if (lastAssignedIndex !== -1 && activeUsers[lastAssignedIndex]) {
            const updatedConfig = { ...(org.shufflerConfig as Record<string, any>), lastAssignedUserId: activeUsers[lastAssignedIndex].id };
            await prisma.organisation.update({
                where: { id: org.id },
                data: { shufflerConfig: updatedConfig }
            });
        }

        return { success: true, message: `Shuffled ${reassignedCount} leads successfully.` };
    } catch (error) {
        console.error('[ShufflerService] Error during force shuffle execution:', error);
        return { success: false, message: 'Failed to execute shuffle. Check server logs.' };
    }
};
