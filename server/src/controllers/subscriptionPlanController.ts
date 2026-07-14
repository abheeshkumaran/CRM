import { Request, Response } from 'express';
import prisma from '../config/prisma';


export const getPlans = async (req: Request, res: Response) => {
    try {
        // Always filter by isActive: true - deleted plans should not reappear
        const plans = await prisma.subscriptionPlan.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' }
        });
        res.json({ plans });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const createPlan = async (req: Request, res: Response) => {
    try {
        if ((req as any).user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const plan = await prisma.subscriptionPlan.create({ data: req.body });
        res.status(201).json(plan);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const updatePlan = async (req: Request, res: Response) => {
    try {
        if ((req as any).user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const plan = await prisma.subscriptionPlan.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.json(plan);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const deletePlan = async (req: Request, res: Response) => {
    try {
        if ((req as any).user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        // Soft delete
        await prisma.subscriptionPlan.update({
            where: { id: req.params.id },
            data: { isActive: false }
        });
        res.json({ message: 'Plan deactivated' });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};
