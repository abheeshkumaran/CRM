import { Request, Response } from 'express';
import { getSubordinateIds, getOrgId, getVisibleUserIds } from '../utils/hierarchyUtils';
import { logAudit } from '../utils/auditLogger';
import prisma from '../config/prisma';
import { GoalService } from '../services/goalService';


export const getGoals = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);

        if (!orgId) {
            return res.status(400).json({ message: 'Organisation not found' });
        }

        const where: any = {
            organisationId: orgId,
            isDeleted: false
        };

        // Hierarchy visibility removed as requested - all users can see all org goals

        // Refresh all goals before fetching so they are perfectly up to date
        await GoalService.refreshOrgGoals(orgId);

        const goals = await prisma.goal.findMany({
            where,
            include: {
                assignedTo: { select: { firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ goals });
    } catch (error) {
        console.error('getGoals Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

export const createGoal = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'Organisation not found' });

        const now = new Date();
        const startDate = new Date();
        const endDate = new Date();

        switch (req.body.period) {
            case 'weekly':
                startDate.setDate(now.getDate() - now.getDay());
                startDate.setHours(0, 0, 0, 0);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'monthly':
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
                endDate.setMonth(now.getMonth() + 1);
                endDate.setDate(0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'quarterly':
                const quarter = Math.floor(now.getMonth() / 3);
                startDate.setMonth(quarter * 3);
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
                endDate.setMonth((quarter + 1) * 3);
                endDate.setDate(0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'yearly':
                startDate.setMonth(0, 1);
                startDate.setHours(0, 0, 0, 0);
                endDate.setMonth(11, 31);
                endDate.setHours(23, 59, 59, 999);
                break;
            default:
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
                endDate.setMonth(now.getMonth() + 1);
                endDate.setDate(0);
                endDate.setHours(23, 59, 59, 999);
        }

        const goal = await prisma.goal.create({
            data: {
                description: req.body.description || undefined,
                type: req.body.type || 'manual',
                targetValue: req.body.targetValue,
                currentValue: req.body.currentValue || 0,
                period: req.body.period,
                status: 'active',
                startDate,
                endDate,
                organisationId: orgId,
                createdById: user.id,
                assignedToId: req.body.assignedToId || user.id
            }
        });

        // Initial progress update if not manual
        let returnedGoal = goal;
        if (goal.type !== 'manual') {
            await GoalService.updateProgressForUser(goal.assignedToId, goal.type);
            const updated = await prisma.goal.findUnique({ where: { id: goal.id } });
            if (updated) returnedGoal = updated;
        }

        await logAudit({
            organisationId: orgId,
            actorId: user.id,
            action: 'CREATE_GOAL',
            entity: 'Goal',
            entityId: goal.id,
            details: { type: goal.type, targetValue: goal.targetValue }
        });

        res.status(201).json(returnedGoal);
    } catch (error) {
        console.error('createGoal Error:', error);
        res.status(400).json({ message: (error as Error).message });
    }
};

export const updateGoal = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'Organisation not found' });

        const { id } = req.params;
        const updates = { ...req.body };

        const goal = await prisma.goal.findFirst({
            where: {
                id,
                organisationId: orgId
            }
        });

        if (!goal) return res.status(404).json({ message: 'Goal not found' });

        if (updates.currentValue !== undefined) {
            const targetVal = updates.targetValue !== undefined ? updates.targetValue : goal.targetValue;
            updates.achievementPercent = Math.round((updates.currentValue / targetVal) * 100);

            if (updates.currentValue >= targetVal && goal.status === 'active') {
                updates.status = 'completed';
                updates.completedAt = new Date();
            }
        }

        const updatedGoal = await prisma.goal.update({
            where: { id },
            data: updates
        });

        await logAudit({
            organisationId: orgId,
            actorId: user.id,
            action: 'UPDATE_GOAL',
            entity: 'Goal',
            entityId: updatedGoal.id,
            details: { updatedFields: Object.keys(updates) }
        });

        res.json(updatedGoal);
    } catch (error) {
        console.error('updateGoal Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

export const deleteGoal = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'Organisation not found' });

        await prisma.goal.update({
            where: {
                id: req.params.id,
                organisationId: orgId
            },
            data: { isDeleted: true }
        });

        await logAudit({
            organisationId: orgId,
            actorId: user.id,
            action: 'DELETE_GOAL',
            entity: 'Goal',
            entityId: req.params.id
        });

        res.json({ message: 'Goal deleted' });
    } catch (error) {
        if ((error as any).code === 'P2025') return res.status(404).json({ message: 'Goal not found' });
        res.status(500).json({ message: (error as Error).message });
    }
};

export const recalculateGoal = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'Organisation not found' });

        const { id } = req.params;
        const goal = await prisma.goal.findFirst({
            where: {
                id,
                organisationId: orgId
            }
        });

        if (!goal) return res.status(404).json({ message: 'Goal not found' });

        if (goal.type === 'manual') {
            return res.status(400).json({ message: 'Cannot automatically recalculate manual goals' });
        }


        await GoalService.updateProgressForUser(goal.assignedToId, goal.type);

        const updatedGoal = await prisma.goal.findUnique({ where: { id } });
        res.json(updatedGoal);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};
