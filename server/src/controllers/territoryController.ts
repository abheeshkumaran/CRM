import { Request, Response } from 'express';
import { getOrgId } from '../utils/hierarchyUtils';
import { logAudit } from '../utils/auditLogger';
import prisma from '../config/prisma';


export const getTerritories = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        let orgId: string | undefined;

        if (user.role === 'super_admin') {
            orgId = (req.query.organisationId as string) || undefined;
        } else {
            orgId = getOrgId(user) || undefined;
            if (!orgId) return res.status(403).json({ message: 'User not associated with an organisation' });
        }

        const where: any = { isDeleted: false };
        if (orgId) where.organisationId = orgId;

        const territories = await prisma.territory.findMany({
            where,
            include: {
                manager: { select: { id: true, firstName: true, lastName: true } }
            },
            orderBy: { name: 'asc' }
        });

        // Fetch member details for each territory
        const territoriesWithMembers = await Promise.all(territories.map(async (t) => {
            let members: any[] = [];
            if (t.memberIds && t.memberIds.length > 0) {
                members = await prisma.user.findMany({
                    where: { id: { in: t.memberIds } },
                    select: { id: true, firstName: true, lastName: true }
                });
            }
            return { ...t, members };
        }));

        res.json({ territories: territoriesWithMembers });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const createTerritory = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No organisation' });

        const territory = await prisma.territory.create({
            data: {
                name: req.body.name,
                description: req.body.description,
                region: req.body.region,
                country: req.body.country,
                states: req.body.states || [],
                cities: req.body.cities || [],
                managerId: req.body.manager,
                memberIds: req.body.members || [],
                isActive: true,
                organisation: { connect: { id: orgId } }
            }
        });

        await logAudit({
            organisationId: orgId,
            actorId: user.id,
            action: 'CREATE_TERRITORY',
            entity: 'Territory',
            entityId: territory.id,
            details: { name: territory.name }
        });

        res.status(201).json(territory);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const updateTerritory = async (req: Request, res: Response) => {
    try {
        const data: any = { ...req.body };
        // Map manager and members to correct field names
        if (req.body.manager !== undefined) {
            data.managerId = req.body.manager;
            delete data.manager;
        }
        if (req.body.members !== undefined) {
            data.memberIds = req.body.members;
            delete data.members;
        }

        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No organisation' });

        const territory = await prisma.territory.update({
            where: {
                id: req.params.id,
                organisationId: orgId
            },
            data
        });

        await logAudit({
            organisationId: orgId,
            actorId: user.id,
            action: 'UPDATE_TERRITORY',
            entity: 'Territory',
            entityId: territory.id,
            details: { name: territory.name }
        });

        res.json(territory);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const deleteTerritory = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No organisation' });

        await prisma.territory.update({
            where: {
                id: req.params.id,
                organisationId: orgId
            },
            data: { isDeleted: true }
        });

        await logAudit({
            organisationId: orgId,
            actorId: user.id,
            action: 'DELETE_TERRITORY',
            entity: 'Territory',
            entityId: req.params.id
        });

        res.json({ message: 'Territory deleted' });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};
