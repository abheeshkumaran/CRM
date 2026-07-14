import { Request, Response } from 'express';
import { getOrgId } from '../utils/hierarchyUtils';
import { isAdmin, isSuperAdmin } from '../utils/roleUtils';
import prisma from '../config/prisma';


// GET /api/branches
export const getBranches = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);

        if (!orgId) {
            if (isSuperAdmin(user)) {
                return res.json([]);
            }
            return res.status(403).json({ message: 'User has no organisation' });
        }

        const where: any = {
            organisationId: orgId,
            isDeleted: false
        };

        if (!isAdmin(user)) {
            where.managerId = user.id;
        }

        const branches = await prisma.branch.findMany({
            where,
            include: {
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                _count: {
                    select: { users: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(branches);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

// POST /api/branches
export const createBranch = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const { name, location, contactEmail, contactPhone, managerId } = req.body;

        if (!orgId) return res.status(403).json({ message: 'User has no organisation' });
        // Only admins can create branches
        if (!isAdmin(user)) {
            return res.status(403).json({ message: 'Only admins can create branches' });
        }

        const branch = await prisma.branch.create({
            data: {
                name,
                location,
                contactEmail,
                contactPhone,
                managerId,
                organisationId: orgId
            }
        });

        res.status(201).json(branch);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

// PUT /api/branches/:id
export const updateBranch = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { id } = req.params;
        const { name, location, contactEmail, contactPhone, managerId } = req.body;

        // Check if user has access to this branch
        const branch = await prisma.branch.findUnique({ where: { id } });
        if (!branch) return res.status(404).json({ message: 'Branch not found' });

        // Only admins can update branches
        if (!isAdmin(user)) {
            return res.status(403).json({ message: 'Only admins can update branches' });
        }

        // Ensure branch belongs to user's org
        const orgId = getOrgId(user);
        if (branch.organisationId !== orgId && !isSuperAdmin(user)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const updatedBranch = await prisma.branch.update({
            where: { id },
            data: {
                name,
                location,
                contactEmail,
                contactPhone,
                managerId
            }
        });

        res.json(updatedBranch);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

// DELETE /api/branches/:id
export const deleteBranch = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { id } = req.params;

        const branch = await prisma.branch.findUnique({ where: { id } });
        if (!branch) return res.status(404).json({ message: 'Branch not found' });

        if (!isAdmin(user)) {
            return res.status(403).json({ message: 'Only admins can delete branches' });
        }

        const orgId = getOrgId(user);
        if (branch.organisationId !== orgId && !isSuperAdmin(user)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await prisma.branch.update({
            where: { id },
            data: { isDeleted: true }
        });

        res.json({ message: 'Branch deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};
