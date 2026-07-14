import { NotificationService } from './notificationService';
import prisma from '../config/prisma';

interface ReminderItem {
    id: string;
    subject: string;
    dueDate: Date | null;
    assignedToId: string | null;
    type: 'task' | 'followUp';
    assignedTo?: {
        id: string;
        firstName: string;
        lastName: string | null;
        reportsToId: string | null;
        timezone: string;
    } | null;
    lead?: {
        id: string;
        firstName: string;
        lastName: string | null;
        company: string | null;
    } | null;
    contact?: {
        id: string;
        firstName: string;
        lastName: string | null;
    } | null;
    account?: {
        id: string;
        name: string;
    } | null;
    opportunity?: {
        id: string;
        name: string;
    } | null;
}

export class FollowUpNotificationService {
    /**
     * Check for upcoming follow-ups and send notifications
     * Runs every minute via cron job
     */
    static async notifyUpcomingFollowUps() {
        try {
            const now = new Date();
            await this.sendExactTimeReminders(now);
            console.log('[FollowUpNotificationService] Completed exact time notification check');
        } catch (error) {
            console.error('[FollowUpNotificationService] Error:', error);
        }
    }

    /**
     * Send notifications exactly when follow-up is due
     */
    private static async sendExactTimeReminders(now: Date) {
        try {
            // Check for tasks where dueDate is within the last 1 minute
            const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

            console.log(`[FollowUpNotificationService] Checking exact reminders due between ${oneMinuteAgo.toISOString()} and ${now.toISOString()}`);

            // Find tasks due in this window
            const tasks = await prisma.task.findMany({
                where: {
                    dueDate: {
                        gt: oneMinuteAgo,
                        lte: now
                    },
                    status: { notIn: ['completed', 'deferred'] },
                    isDeleted: false
                },
                include: {
                    assignedTo: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            reportsToId: true,
                            timezone: true
                        }
                    },
                    lead: {
                        where: { isDeleted: false },
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            company: true
                        }
                    },
                    contact: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    account: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    opportunity: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            const allReminders: ReminderItem[] = tasks.map(t => ({ ...t, type: 'task' as const }));

            console.log(`[FollowUpNotificationService] Found ${allReminders.length} items due exact now`);

            for (const item of allReminders) {
                if (!item.assignedToId || !item.dueDate) continue;

                const taskDueTime = new Date(item.dueDate);

                let relatedName = 'Unknown';
                if (item.lead) {
                    relatedName = `${item.lead.firstName} ${item.lead.lastName || ''}`.trim();
                    if (item.lead.company) relatedName += ` (${item.lead.company})`;
                } else if (item.contact) {
                    relatedName = `${item.contact.firstName} ${item.contact.lastName || ''}`.trim();
                } else if (item.account) {
                    relatedName = item.account.name;
                } else if (item.opportunity) {
                    relatedName = item.opportunity.name;
                }

                const userTimezone = item.assignedTo?.timezone || 'UTC';
                const timeStr = taskDueTime.toLocaleTimeString('en-US', {
                    timeZone: userTimezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });

                // Notify assigned user
                await NotificationService.send(
                    item.assignedToId,
                    '🔔 Follow-up Due Now',
                    `Your follow-up "${item.subject}" with ${relatedName} is due at ${timeStr}`,
                    'warning'
                );

                console.log(`[FollowUpNotificationService] Sent exact reminder to user ${item.assignedToId} for ${item.type} ${item.id}`);

                // Notify manager if exists
                if (item.assignedTo?.reportsToId) {
                    await NotificationService.send(
                        item.assignedTo.reportsToId,
                        '👥 Team Follow-up Due',
                        `${item.assignedTo.firstName} ${item.assignedTo.lastName || ''} has a follow-up "${item.subject}" with ${relatedName} due at ${timeStr}`,
                        'info'
                    );
                    console.log(`[FollowUpNotificationService] Sent exact reminder to manager ${item.assignedTo.reportsToId} for ${item.type} ${item.id}`);
                }
            }
        } catch (error) {
            console.error('[FollowUpNotificationService] Error in sendExactTimeReminders:', error);
        }
    }
}
