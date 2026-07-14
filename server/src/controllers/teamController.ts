import { Request, Response } from 'express';
import { getOrgId } from '../utils/hierarchyUtils';
import { logAudit } from '../utils/auditLogger';
import prisma from '../config/prisma';


// Create a new team
export const createTeam = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const { name, description, managerId, memberIds } = req.body;

        if (!orgId) return res.status(403).json({ message: 'No organisation found' });
        if (!name) return res.status(400).json({ message: 'Team name is required' });

        // Verify manager if provided
        if (managerId) {
            const manager = await prisma.user.findFirst({
                where: { id: managerId, organisationId: orgId }
            });
            if (!manager) return res.status(400).json({ message: 'Invalid manager ID' });
        }

        const team = await prisma.team.create({
            data: {
                name,
                description,
                managerId,
                organisationId: orgId,
                createdById: user.id,
                members: {
                    connect: memberIds?.map((id: string) => ({ id })) || []
                }
            },
            include: {
                members: { select: { id: true, firstName: true, lastName: true, email: true } },
                manager: { select: { id: true, firstName: true, lastName: true } }
            }
        });

        await logAudit({
            organisationId: orgId,
            actorId: user.id,
            action: 'CREATE_TEAM',
            entity: 'Team',
            entityId: team.id,
            details: { name: team.name }
        });

        res.status(201).json(team);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

// Get all teams for organisation
export const getTeams = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);

        if (!orgId) return res.status(403).json({ message: 'No organisation found' });

        const teams = await prisma.team.findMany({
            where: { organisationId: orgId, isDeleted: false },
            include: {
                members: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
                manager: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { salesTargets: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(teams);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

// Get single team
export const getTeam = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);

        const team = await prisma.team.findFirst({
            where: { id: req.params.id, organisationId: orgId as string, isDeleted: false },
            include: {
                members: { select: { id: true, firstName: true, lastName: true, email: true, role: true, profileImage: true } },
                manager: { select: { id: true, firstName: true, lastName: true, email: true } },
                salesTargets: {
                    where: { isDeleted: false },
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            }
        });

        if (!team) return res.status(404).json({ message: 'Team not found' });

        res.json(team);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

// Update team
export const updateTeam = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const { name, description, managerId, memberIds } = req.body;

        const existing = await prisma.team.findFirst({
            where: { id: req.params.id, organisationId: orgId as string, isDeleted: false }
        });

        if (!existing) return res.status(404).json({ message: 'Team not found' });

        const team = await prisma.team.update({
            where: { id: req.params.id },
            data: {
                name,
                description,
                managerId,
                members: memberIds ? {
                    set: memberIds.map((id: string) => ({ id }))
                } : undefined
            },
            include: {
                members: { select: { id: true, firstName: true, lastName: true } },
                manager: { select: { id: true, firstName: true, lastName: true } }
            }
        });

        await logAudit({
            organisationId: orgId as string,
            actorId: user.id,
            action: 'UPDATE_TEAM',
            entity: 'Team',
            entityId: team.id,
            details: { updatedFields: Object.keys(req.body) }
        });

        res.json(team);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

// Delete team
export const deleteTeam = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);

        const existing = await prisma.team.findFirst({
            where: { id: req.params.id, organisationId: orgId as string, isDeleted: false }
        });

        if (!existing) return res.status(404).json({ message: 'Team not found' });

        await prisma.team.update({
            where: { id: req.params.id },
            data: { isDeleted: true, deletedAt: new Date() }
        });

        await logAudit({
            organisationId: orgId as string,
            actorId: user.id,
            action: 'DELETE_TEAM',
            entity: 'Team',
            entityId: req.params.id
        });

        res.json({ message: 'Team deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};
