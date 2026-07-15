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
            if (!config.isAutoShufflingOn) continue;
            if (!config.statuses || config.statuses.length === 0) continue;

            // Check if it's the right time to shuffle for this org
            if (config.shuffleTime !== currentTimeString) continue;

            console.log(`[ShufflerService] Executing shuffle for Org: ${org.name}`);

            const daysBefore = parseInt(config.shuffleBeforeDays) || 0;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysBefore);

            // Find eligible leads
            // Only shuffle leads that are currently owned by the selected users
            const eligibleLeads = await prisma.lead.findMany({
                where: {
                    organisationId: org.id,
                    isDeleted: false,
                    status: { in: config.statuses },
                    updatedAt: { lt: cutoffDate },
                    assignedToId: { in: config.users || [] }
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
                                { name: { in: ['admin', 'org_admin', 'organization admin', 'super admin', 'manager'], mode: 'insensitive' } },
                                { roleKey: { in: ['admin', 'org_admin', 'organization admin', 'super_admin', 'manager'] } }
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
            const excludedRoleKeys = ['admin', 'org_admin', 'organization admin', 'super_admin', 'manager', ...adminRoles.map(r => r.roleKey)];

            // If specific users are configured, ONLY shuffle leads to those users.
            // If the user array is empty, we don't shuffle to anyone.
            if (!config.users || config.users.length === 0) {
                console.log(`[ShufflerService] No users selected for shuffling in Org: ${org.name}`);
                continue;
            }

            // Find eligible active users in the org
            const activeUsers = await prisma.user.findMany({
                where: {
                    organisationId: org.id,
                    isActive: true,
                    isOffDuty: false,
                    id: { in: config.users },
                    NOT: {
                        OR: [
                            {
                                role: {
                                    in: excludedRoleKeys,
                                    mode: 'insensitive'
                                }
                            },
                            {
                                position: {
                                    in: ['admin', 'org_admin', 'organization admin', 'super_admin', 'super admin', 'manager'],
                                    mode: 'insensitive'
                                }
                            }
                        ]
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

            let slots: any[] = [];
            let nextIndex = lastAssignedIndex;
            for (let i = 0; i < eligibleLeads.length; i++) {
                nextIndex = (nextIndex + 1) % activeUsers.length;
                slots.push(activeUsers[nextIndex]);
            }

            // Resolve collisions where a slot matches the lead's current owner
            if (activeUsers.length > 1) {
                for (let i = 0; i < eligibleLeads.length; i++) {
                    if (eligibleLeads[i].assignedToId === slots[i].id) {
                        for (let j = 0; j < eligibleLeads.length; j++) {
                            if (i !== j && eligibleLeads[i].assignedToId !== slots[j].id && eligibleLeads[j].assignedToId !== slots[i].id) {
                                let temp = slots[i];
                                slots[i] = slots[j];
                                slots[j] = temp;
                                break;
                            }
                        }
                    }
                }
            }



            for (let i = 0; i < eligibleLeads.length; i++) {
                const lead = eligibleLeads[i];
                const targetUser = slots[i];

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

            // After all assignments, update the lastAssignedIndex for the next run
            lastAssignedIndex = nextIndex;

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
        if (!config.isAutoShufflingOn) {
            return { success: false, message: 'Auto shuffling is turned OFF. Please turn it ON to shuffle leads.' };
        }
        if (!config.statuses || config.statuses.length === 0) {
            return { success: false, message: 'No lead statuses configured for shuffling.' };
        }

        // Fetch admin roles from Role table for this org
        const adminRoles = await prisma.role.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { name: { in: ['admin', 'org_admin', 'organization admin', 'super admin', 'manager'], mode: 'insensitive' } },
                            { roleKey: { in: ['admin', 'org_admin', 'organization admin', 'super_admin', 'manager'] } }
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
        const excludedRoleKeys = ['admin', 'org_admin', 'organization admin', 'super_admin', 'manager', ...adminRoles.map(r => r.roleKey)];

        // Find eligible leads (bypass date checks, bypass time checks)
        // Only shuffle leads that are currently owned by the selected users
        const eligibleLeads = await prisma.lead.findMany({
            where: {
                organisationId: org.id,
                isDeleted: false,
                status: { in: config.statuses },
                assignedToId: { in: config.users || [] }
            },
            select: { id: true, assignedToId: true },
            orderBy: { id: 'asc' }
        });

        if (eligibleLeads.length === 0) {
            return { success: true, message: 'No eligible leads found for selected statuses.' };
        }

        if (!config.users || config.users.length === 0) {
            return { success: false, message: 'No users selected for shuffling. Please select users first.' };
        }

        // Find eligible active users in the org
        const activeUsers = await prisma.user.findMany({
            where: {
                organisationId: org.id,
                isActive: true,
                isOffDuty: false,
                id: { in: config.users },
                NOT: {
                    OR: [
                        {
                            role: {
                                in: excludedRoleKeys,
                                mode: 'insensitive'
                            }
                        },
                        {
                            position: {
                                in: ['admin', 'org_admin', 'organization admin', 'super_admin', 'super admin', 'manager'],
                                mode: 'insensitive'
                            }
                        }
                    ]
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

        let slots: any[] = [];
        let nextIndex = lastAssignedIndex;
        for (let i = 0; i < eligibleLeads.length; i++) {
            nextIndex = (nextIndex + 1) % activeUsers.length;
            slots.push(activeUsers[nextIndex]);
        }

        // Resolve collisions where a slot matches the lead's current owner
        if (activeUsers.length > 1) {
            for (let i = 0; i < eligibleLeads.length; i++) {
                if (eligibleLeads[i].assignedToId === slots[i].id) {
                    for (let j = 0; j < eligibleLeads.length; j++) {
                        if (i !== j && eligibleLeads[i].assignedToId !== slots[j].id && eligibleLeads[j].assignedToId !== slots[i].id) {
                            let temp = slots[i];
                            slots[i] = slots[j];
                            slots[j] = temp;
                            break;
                        }
                    }
                }
            }
        }

        for (let i = 0; i < eligibleLeads.length; i++) {
            const lead = eligibleLeads[i];
            const targetUser = slots[i];

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
                        changedById: null, // Force shuffle action
                        reason: 'Force lead shuffler execution'
                    }
                });

                // Send Notification to new owner
                await prisma.notification.create({
                    data: {
                        title: 'New Lead Assigned',
                        message: `A lead has been reassigned to you by the manual Shuffler.`,
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
        lastAssignedIndex = nextIndex;

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
