import { Request, Response } from 'express';
import crypto from 'crypto';
import { getOrgId } from '../utils/hierarchyUtils';
import prisma from '../config/prisma';


export const getApiKeys = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);

        if (!orgId) return res.status(400).json({ message: 'No org' });

        const apiKeys = await prisma.apiKey.findMany({
            where: {
                organisationId: orgId,
                isDeleted: false
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                status: true,
                createdAt: true,
                permissions: true
            }
        });

        // Map for frontend compatibility
        const mappedKeys = apiKeys.map(k => ({
            ...k,
            isActive: k.status === 'active',
            firstEight: k.keyPrefix
        }));

        res.json({ apiKeys: mappedKeys });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const createApiKey = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No org' });

        const keyBytes = crypto.randomBytes(32).toString('hex');
        const rawKey = `crm_${keyBytes}`; // crm_ prefix for identification
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        const keyPrefix = rawKey.substring(0, 12); // e.g., crm_1a2b3c4d

        const apiKey = await prisma.apiKey.create({
            data: {
                name: req.body.name || 'New API Key',
                description: req.body.description,
                keyHash,
                keyPrefix,
                permissions: req.body.permissions || [], // Default no permissions or all? Logic in middleware doesn't check yet.
                organisation: { connect: { id: orgId } },
                createdBy: { connect: { id: user.id } },
                status: 'active'
            }
        });

        // Return the raw key ONLY once
        res.status(201).json({
            apiKey: { ...apiKey, key: rawKey }, // Inject raw key for display
            message: 'Save this key - it will not be shown again'
        });
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const revokeApiKey = async (req: Request, res: Response) => {
    try {
        const apiKey = await prisma.apiKey.update({
            where: { id: req.params.id },
            data: {
                status: 'revoked',
                // usage/revokedAt handling if schema supported it, currently only status
            }
        });
        res.json({ message: 'API key revoked', apiKey });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const deleteApiKey = async (req: Request, res: Response) => {
    try {
        await prisma.apiKey.update({
            where: { id: req.params.id },
            data: { isDeleted: true }
        });
        res.json({ message: 'API key deleted' });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};
