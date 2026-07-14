import { Request, Response } from 'express';
import { getOrgId, getSubordinateIds, getVisibleUserIds } from '../utils/hierarchyUtils';
import { logAudit } from '../utils/auditLogger';
import prisma from '../config/prisma';


// Transform to include polymorphic details if needed (Event usually maps to one)
// But schema has separate fields.
// Mongoose populates 'lead' 'contact'.

export const getEvents = async (req: Request, res: Response) => {
    try {
        const { start, end } = req.query;
        const user = (req as any).user;
        const where: any = { isDeleted: false };

        // 1. Organisation Scoping
        if (user.role === 'super_admin') {
            if (req.query.organisationId) where.organisationId = String(req.query.organisationId);
        } else {
            const orgId = getOrgId(user);
            if (!orgId) return res.status(403).json({ message: 'User has no organisation' });
            where.organisationId = orgId;
        }

        // 2. Hierarchy Visibility removed as requested - all users can see all org events

        if (start && end) {
            where.startTime = {
                gte: new Date(start as string),
                lte: new Date(end as string)
            };
        }

        console.log('Calendar query where:', JSON.stringify(where, null, 2));

        const events = await prisma.calendarEvent.findMany({
            where,
            include: {
                lead: { select: { firstName: true, lastName: true } },
                contact: { select: { firstName: true, lastName: true } }
            },
            orderBy: { startTime: 'asc' }
        });

        console.log(`Found ${events.length} events`);

        res.json({ events });
    } catch (error) {
        console.error('getEvents error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

export const createEvent = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No org' });

        const data: any = {
            title: req.body.title,
            description: req.body.description,
            startTime: new Date(req.body.startTime),
            endTime: new Date(req.body.endTime),
            allDay: req.body.allDay || false,
            type: req.body.type || 'meeting',
            location: req.body.location,

            organisation: { connect: { id: orgId } },
            createdBy: { connect: { id: user.id } }
        };

        if (req.body.lead) data.lead = { connect: { id: req.body.lead } };
        if (req.body.contact) data.contact = { connect: { id: req.body.contact } };
        // Support others if needed (Account/Opp)

        const event = await prisma.calendarEvent.create({
            data
        });

        await logAudit({
            organisationId: orgId,
            actorId: user.id,
            action: 'CREATE_EVENT',
            entity: 'CalendarEvent',
            entityId: event.id,
            details: { title: event.title }
        });

        res.status(201).json(event);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const getEventById = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'Organisation not found' });

        const event = await prisma.calendarEvent.findFirst({
            where: {
                id: req.params.id,
                organisationId: orgId,
                isDeleted: false
            },
            include: {
                lead: { select: { firstName: true, lastName: true } },
                contact: { select: { firstName: true, lastName: true } }
            }
        });

        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Hierarchy check
        if (user.role !== 'super_admin' && user.role !== 'admin' && event.createdById !== user.id) {
            const subordinateIds = await getSubordinateIds(user.id);
            if (!subordinateIds.includes(event.createdById)) {
                return res.status(403).json({ message: 'Not authorized to view this event' });
            }
        }

        res.json(event);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const deleteEvent = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'Organisation not found' });

        await prisma.calendarEvent.update({
            where: {
                id: req.params.id,
                organisationId: orgId
            },
            data: { isDeleted: true }
        });

        await logAudit({
            organisationId: orgId,
            actorId: user.id,
            action: 'DELETE_EVENT',
            entity: 'CalendarEvent',
            entityId: req.params.id
        });

        res.json({ message: 'Event deleted' });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};
