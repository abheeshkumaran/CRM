
import { Request, Response } from 'express';
import { getOrgId } from '../utils/hierarchyUtils';
import prisma from '../config/prisma';


export const getCommissions = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No org' });

        const commissions = await prisma.commission.findMany({
            where: { organisationId: orgId, isDeleted: false },
            orderBy: { createdAt: 'desc' }
        });
        res.json(commissions);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const createCommission = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No org' });

        // Handle "self" userId - convert to actual user ID
        let targetUserId = req.body.userId;
        if (!targetUserId || targetUserId === 'self') {
            targetUserId = user.id;
        }

        // Validate that the user exists
        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId }
        });

        if (!targetUser) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        const commission = await prisma.commission.create({
            data: {
                userId: targetUserId,
                amount: req.body.amount,
                currency: req.body.currency || 'INR',
                status: req.body.status || 'pending',
                type: req.body.type,
                description: req.body.description,
                dealId: req.body.dealId,
                date: req.body.date ? new Date(req.body.date) : new Date(),
                organisationId: orgId,
                createdById: user.id
            }
        });
        res.status(201).json(commission);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const updateCommission = async (req: Request, res: Response) => {
    try {
        const commission = await prisma.commission.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.json(commission);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const deleteCommission = async (req: Request, res: Response) => {
    try {
        await prisma.commission.update({
            where: { id: req.params.id },
            data: { isDeleted: true }
        });
        res.json({ message: 'Commission deleted' });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};
