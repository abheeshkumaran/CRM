
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma';


export const verifyApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // --- RESILIENCE ENHANCEMENT ---
        // Check for API Key in Header, Body, or Query (for maximum compatibility)
        const apiKey = req.header('X-API-KEY') || 
                       req.body.apiKey || 
                       req.body.api_key || 
                       req.query.apiKey || 
                       req.query.api_key;

        if (!apiKey) {
            console.log(`[verifyApiKey] AUTH REJECTED: Missing API Key for ${req.method} ${req.originalUrl || req.url}`);
            console.log(`[verifyApiKey] Hint: Header 'X-API-KEY' or Body 'apiKey' not found.`);
            return res.status(401).json({ 
                message: 'Missing API Key. Please provide it in the X-API-KEY header or as a body field named "apiKey".' 
            });
        }

        const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
        console.log(`[verifyApiKey] Received Key. Hash prefix: ${keyHash.substring(0, 10)}...`);

        const keyRecord = await prisma.apiKey.findFirst({
            where: {
                keyHash: keyHash,
                status: 'active',
                isDeleted: false
            },
            include: { organisation: true }
        });

        if (!keyRecord) {
            console.log(`[verifyApiKey] AUTH REJECTED: Invalid or inactive Key. Hash prefix: ${keyHash.substring(0, 10)}...`);
            return res.status(401).json({ message: 'Invalid API Key' });
        }

        console.log(`[verifyApiKey] AUTH SUCCESS: Org="${keyRecord.organisation.name}" (${keyRecord.organisationId})`);

        // Update Usage stats
        const currentUsage = (keyRecord.usage as any) || {};
        await prisma.apiKey.update({
            where: { id: keyRecord.id },
            data: {
                usage: { ...currentUsage, lastUsedAt: new Date().toISOString() }
            }
        });

        // Attach user-like object to request for compatibility
        (req as any).user = {
            id: 'api-user',
            organisationId: keyRecord.organisationId,
            role: 'api_client'
        };

        next();
    } catch (error) {
        console.error(`[verifyApiKey] CRITICAL AUTH ERROR:`, error);
        res.status(500).json({ message: 'API Key Error' });
    }
};
