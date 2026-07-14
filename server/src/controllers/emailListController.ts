import { Request, Response } from 'express';
import { getOrgId } from '../utils/hierarchyUtils';
import prisma from '../config/prisma';


export const getEmailLists = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);

        if (!orgId) return res.status(403).json({ message: 'User not associated with an organisation' });

        // Strict Organisation Scoping
        const where: any = {
            isDeleted: false,
            organisationId: orgId
        };
        // If super_admin allows override? 
        if (user.role === 'super_admin' && req.query.organisationId) {
            where.organisationId = String(req.query.organisationId);
        }

        const lists = await prisma.emailList.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        res.json(lists);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const createEmailList = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No org' });

        const list = await prisma.emailList.create({
            data: {
                name: req.body.name,
                description: req.body.description,
                organisation: { connect: { id: orgId } },
                createdBy: { connect: { id: user.id } }
            }
        });

        // Audit Log
        try {
            const { logAudit } = await import('../utils/auditLogger');
            logAudit({
                action: 'CREATE_EMAIL_LIST',
                entity: 'EmailList',
                entityId: list.id,
                actorId: user.id,
                organisationId: orgId,
                details: { name: list.name }
            });
        } catch (e) {
            console.error('Audit Log Error:', e);
        }
        res.status(201).json(list);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const getEmailListById = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);

        const where: any = { id: req.params.id, isDeleted: false };
        if (user.role !== 'super_admin') {
            if (!orgId) return res.status(403).json({ message: 'No org' });
            where.organisationId = orgId;
        }

        const list = await prisma.emailList.findFirst({
            where
        });
        if (!list) return res.status(404).json({ message: 'List not found' });
        res.json(list);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const deleteEmailList = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No org' });

        const list = await prisma.emailList.update({
            where: {
                id: req.params.id,
                organisationId: orgId
            },
            data: { isDeleted: true }
        });

        // Audit Log
        try {
            const { logAudit } = await import('../utils/auditLogger');
            logAudit({
                action: 'DELETE_EMAIL_LIST',
                entity: 'EmailList',
                entityId: req.params.id,
                actorId: user.id,
                organisationId: orgId,
                details: { name: list.name }
            });
        } catch (e) {
            console.error('Audit Log Error:', e);
        }
        res.json({ message: 'List deleted' });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};
