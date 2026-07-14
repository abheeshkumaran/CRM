import { Request, Response } from 'express';
import prisma from '../config/prisma';


// Get active FAQs for public landing page
export const getPublicFAQs = async (req: Request, res: Response) => {
    try {
        const faqs = await prisma.siteFAQ.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' }
        });
        res.json({ faqs });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

// Get all FAQs (SuperAdmin)
export const getAllFAQs = async (req: Request, res: Response) => {
    try {
        if (!(req as any).user.isSuperAdmin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const faqs = await prisma.siteFAQ.findMany({
            orderBy: { order: 'asc' }
        });
        res.json({ faqs });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

// Create FAQ (SuperAdmin)
export const createFAQ = async (req: Request, res: Response) => {
    try {
        if (!(req as any).user.isSuperAdmin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { question, answer, order, isActive } = req.body;
        const faq = await prisma.siteFAQ.create({
            data: {
                question,
                answer,
                order: order || 0,
                isActive: isActive !== undefined ? isActive : true
            }
        });
        res.status(201).json(faq);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

// Update FAQ (SuperAdmin)
export const updateFAQ = async (req: Request, res: Response) => {
    try {
        if (!(req as any).user.isSuperAdmin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { id } = req.params;
        const { question, answer, order, isActive } = req.body;

        const faq = await prisma.siteFAQ.update({
            where: { id },
            data: {
                question,
                answer,
                order,
                isActive
            }
        });
        res.json(faq);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

// Delete FAQ (SuperAdmin)
export const deleteFAQ = async (req: Request, res: Response) => {
    try {
        if (!(req as any).user.isSuperAdmin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { id } = req.params;
        await prisma.siteFAQ.delete({
            where: { id }
        });
        res.json({ message: 'FAQ deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};
