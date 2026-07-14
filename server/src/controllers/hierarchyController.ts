import { Request, Response } from 'express';
import { getOrgId } from '../utils/hierarchyUtils';
import prisma from '../config/prisma';


export const getHierarchy = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);

        const where: any = { isActive: true, isPlaceholder: false };
        if (user.role !== 'super_admin') {
            if (!orgId) {
                return res.status(403).json({ message: 'User has no organisation' });
            }
            where.organisationId = orgId;
        } else if (orgId) {
            where.organisationId = orgId;
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                position: true,
                reportsToId: true,
                reportsTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        // Build hierarchy tree
        const userMap = new Map();
        users.forEach(u => userMap.set(u.id, { ...u, children: [] }));

        const roots: any[] = [];
        users.forEach(u => {
            const userNode = userMap.get(u.id);
            if (u.reportsToId) {
                const parent = userMap.get(u.reportsToId);
                if (parent) {
                    parent.children.push(userNode);
                } else {
                    roots.push(userNode);
                }
            } else {
                roots.push(userNode);
            }
        });

        res.json({ hierarchy: roots, users });
    } catch (error) {
        console.error('getHierarchy Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

export const updateReportsTo = async (req: Request, res: Response) => {
    try {
        const { reportsTo } = req.body;
        const userId = req.params.id;

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                reportsTo: reportsTo ? { connect: { id: reportsTo } } : { disconnect: true }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                position: true,
                reportsToId: true,
                reportsTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        res.json(user);
    } catch (error) {
        console.error('updateReportsTo Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};
