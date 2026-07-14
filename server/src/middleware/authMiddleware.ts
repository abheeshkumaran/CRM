import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getOrgId } from '../utils/hierarchyUtils';
import prisma from '../config/prisma';
import { isSuperAdmin as checkSuperAdmin, normalizeRole, isAdmin } from '../utils/roleUtils';


export interface AuthRequest extends Request {
    user?: any; // Ideally this should be the Prisma User type, using any for quick migration
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            console.log(`[AuthDebug] Incoming token: ${token.substring(0, 20)}...`);
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_change_this') as JwtPayload;
            console.log('[AuthDebug] Decoded payload:', decoded);

            // Fetch user from Postgres using Prisma
            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                include: { organisation: true }
            });

            if (!user) {
                console.warn(`[AuthDebug] User not found for ID: ${decoded.id}`);
                res.status(401).json({ message: 'Not authorized, token failed' });
                return;
            }

            console.log(`[AuthDebug] Authenticated user: ${user.email} (Role: ${user.role})`);

            // Exclude password from the object attached to request
            const userWithoutPassword = { ...user };
            delete (userWithoutPassword as any).password;

            // Check if user manages any branch
            const branchManaged = await prisma.branch.findFirst({
                where: { managerId: user.id, isDeleted: false }
            });

            // Attach user to request
            req.user = {
                ...userWithoutPassword,
                isSuperAdmin: checkSuperAdmin(user),
                isBranchManager: !!branchManaged
            };

            // console.log(`[AuthMiddleware] Authenticated user: ${ user.email } `); 
            return next();
        } catch (error: any) {
            // Real token verification failures get 401 (forces logout)
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.message?.includes('jwt')) {
                console.warn(`[AuthMiddleware] JWT verification failed: ${error.message || error.name}`);
                res.status(401).json({ message: 'Not authorized, token failed' });
            } else {
                console.error('[AuthMiddleware] Database or Internal Error:', error);
                // Database or internal connection errors get 503 (keeps users logged in, doesn't wipe localStorage)
                res.status(503).json({ message: 'Database service temporarily unavailable, please try again' });
            }
        }
    }


    // Check for API Key if no Bearer token
    if (!token && req.headers['x-api-key']) {
        try {
            const rawKey = req.headers['x-api-key'] as string;
            // Key format: crm_HEXSTRING (ignore prefix for hash if needed, but model says keyHash stores hash of full key)
            // Model says: verifyKey = sha256 of key.

            const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

            const apiKey = await prisma.apiKey.findUnique({
                where: { keyHash, isDeleted: false, status: 'active' }
            });

            if (apiKey) {
                // Update usage stats (optional, could be fire-and-forget)
                // await prisma.apiKey.update({ where: { id: apiKey.id }, data: { usage: { ...apiKey.usage, lastUsedAt: new Date() } } });

                const user = await prisma.user.findUnique({
                    where: { id: apiKey.createdById },
                    include: { organisation: true }
                });

                if (user) {
                    const userWithoutPassword = { ...user };
                    delete (userWithoutPassword as any).password;

                    // Check if user manages any branch
                    const branchManaged = await prisma.branch.findFirst({
                        where: { managerId: user.id, isDeleted: false }
                    });

                    req.user = {
                        ...userWithoutPassword,
                        isSuperAdmin: checkSuperAdmin(user),
                        isBranchManager: !!branchManaged
                    };
                    return next();
                }
            }
        } catch (error) {
            console.error('[AuthMiddleware] API Key Error:', error);
            // Fallthrough to 401
        }
    }

    if (!token && !req.user) {
        res.status(401).json({ message: 'Not authorized, no token' });
        return;
    }
};

export const admin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && isAdmin(req.user)) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const userRole = req.user ? normalizeRole(req.user.role) : '';
        const normRoles = roles.map(r => r.toLowerCase().replace(/[\s-]/g, '_'));
        if (!req.user || !normRoles.includes(userRole)) {
            return res.status(403).json({ message: `User role ${req.user?.role} is not authorized` });
        }
        next();
    };
};
