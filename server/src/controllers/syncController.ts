
import { Request, Response } from 'express';
import { getOrgId } from '../utils/hierarchyUtils';
import prisma from '../config/prisma';


export const syncData = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const lastSync = req.query.lastSync ? new Date(req.query.lastSync as string) : new Date(0); // Default to epoch if no sync

        if (isNaN(lastSync.getTime())) {
            return res.status(400).json({ message: 'Invalid lastSync timestamp' });
        }

        if (!orgId) return res.status(400).json({ message: 'No organisation found' });

        // optimize queries to only fetch what changed
        const whereClause = {
            organisationId: orgId,
            updatedAt: { gt: lastSync }
        };

        const [leads, contacts, tasks, events, opportunities] = await Promise.all([
            prisma.lead.findMany({ where: whereClause }),
            prisma.contact.findMany({ where: whereClause }),
            prisma.task.findMany({
                where: {
                    organisationId: orgId,
                    updatedAt: { gt: lastSync },
                    // Assuming tasks are also specific to user? Or org wide?
                    // Usually tasks assignedTo user. For now, scoping to Org to keep simple or check assignedTo?
                    // Let's stick to Org for simplicity unless it's too much data.
                    // Actually, for mobile, user usually wants their tasks.
                    // But let's respect permission scope later.
                }
            }),
            prisma.calendarEvent.findMany({ where: whereClause }),
            prisma.opportunity.findMany({ where: whereClause })
        ]);

        res.json({
            timestamp: new Date(),
            changes: {
                leads,
                contacts,
                tasks,
                events,
                opportunities
            }
        });

    } catch (error) {
        console.error('Sync Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};
