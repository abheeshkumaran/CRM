import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma';


// CRITICAL: Super Admin Protection System
// This middleware protects the super admin account from unauthorized modifications

const SUPER_ADMIN_EMAIL = 'superadmin@crm.com';
const SUPER_ADMIN_SECRET_KEY = process.env.SUPER_ADMIN_SECRET_KEY || ''; // MUST be set in production
const SUPER_ADMIN_ID_HASH = process.env.SUPER_ADMIN_ID_HASH || ''; // Set this in env

// Emergency shutdown flag
let SYSTEM_LOCKED = false;
let LOCK_REASON = '';

/**
 * Verify super admin secret key
 * This ensures only the owner can make changes to super admin
 */
export const verifySuperAdminSecret = (req: Request, res: Response, next: NextFunction) => {
    const secretKey = req.headers['x-super-admin-key'] as string;
    const targetUserId = req.params.id || req.body.userId || req.body.id;

    // Check if this is a super admin modification
    prisma.user.findUnique({
        where: { id: targetUserId },
        select: { email: true, role: true }
    }).then(targetUser => {
        if (targetUser && (targetUser.email === SUPER_ADMIN_EMAIL || targetUser.role === 'super_admin')) {
            // This is a super admin modification - require secret key
            if (!secretKey || secretKey !== SUPER_ADMIN_SECRET_KEY) {
                lockSystem(`Super admin modification attempted without valid secret key. IP: ${req.ip}`);
                return res.status(403).json({
                    message: 'Super admin modifications require special authorization key',
                    code: 'SUPER_ADMIN_SECRET_REQUIRED'
                });
            }
        }
        next();
    }).catch(err => {
        console.error('Error in super admin secret verification:', err);
        next();
    });
};

/**
 * Lock the entire system in case of security breach
 */
export const lockSystem = async (reason: string) => {
    SYSTEM_LOCKED = true;
    LOCK_REASON = reason;
    console.error('🚨🚨🚨 CRITICAL SECURITY ALERT 🚨🚨🚨');
    console.error(`SYSTEM LOCKED: ${reason}`);
    console.error('Timestamp:', new Date().toISOString());
    console.error('🚨🚨🚨 SYSTEM LOCKED 🚨🚨🚨');

    try {
        // Find a valid organisation ID for the log (AuditLog requires it)
        const org = await prisma.organisation.findFirst({ select: { id: true } });
        const orgId = org?.id || 'SYSTEM'; // Fallback, but might still fail if schema requires valid FK

        // Log to audit trail
        await prisma.auditLog.create({
            data: {
                action: 'SYSTEM_LOCKDOWN',
                entity: 'System',
                entityId: 'SECURITY_BREACH',
                actorId: 'SYSTEM',
                organisationId: orgId,
                details: { reason, timestamp: new Date().toISOString() },
                ipAddress: 'SYSTEM',
                userAgent: 'SYSTEM'
            }
        });
    } catch (err) {
        console.error('Failed to log system lockdown to database:', err);
    }
};

/**
 * Check if system is locked
 */
export const checkSystemLock = (req: Request, res: Response, next: NextFunction) => {
    if (SYSTEM_LOCKED) {
        console.error('🚨 Blocked request - System is locked:', LOCK_REASON);
        return res.status(503).json({
            message: 'System temporarily unavailable due to security incident',
            code: 'SYSTEM_LOCKED'
        });
    }
    next();
};

/**
 * Protect super admin from unauthorized modifications
 */
export const protectSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        const targetUserId = req.params.id || req.body.userId || req.body.id;

        // If no target user, continue
        if (!targetUserId) {
            return next();
        }

        // Check if target is super admin
        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { email: true, role: true, id: true }
        });

        if (!targetUser) {
            return next();
        }

        // If target is super admin
        if (targetUser.email === SUPER_ADMIN_EMAIL || targetUser.role === 'super_admin') {
            // Only allow if current user is also super admin
            if (user?.role !== 'super_admin' || user?.email !== SUPER_ADMIN_EMAIL) {
                // SECURITY BREACH DETECTED
                lockSystem(`Unauthorized attempt to modify super admin account by user: ${user?.email || 'UNKNOWN'}`);

                // Log the attempt
                await prisma.auditLog.create({
                    data: {
                        action: 'UNAUTHORIZED_SUPERADMIN_MODIFICATION_ATTEMPT',
                        entity: 'User',
                        entityId: targetUserId,
                        actorId: user?.id || 'UNKNOWN',
                        organisationId: user?.organisationId || 'UNKNOWN',
                        details: {
                            attemptedBy: user?.email,
                            targetEmail: targetUser.email,
                            endpoint: req.path,
                            method: req.method,
                            body: req.body
                        },
                        ipAddress: req.ip,
                        userAgent: req.headers['user-agent']
                    }
                });

                return res.status(403).json({
                    message: 'Security violation detected. System has been locked.',
                    code: 'SUPERADMIN_PROTECTION_TRIGGERED'
                });
            }
        }

        next();
    } catch (error) {
        console.error('Error in super admin protection:', error);
        next();
    }
};

/**
 * Verify super admin integrity on startup
 */
export const verifySuperAdminIntegrity = async () => {
    try {
        const superAdmin = await prisma.user.findFirst({
            where: { email: SUPER_ADMIN_EMAIL }
        });

        if (!superAdmin) {
            console.warn('⚠️  Super admin account not found - may need to run seed');
            return;
        }

        // Check if super admin has been tampered with
        if (superAdmin.role !== 'super_admin') {
            lockSystem('Super admin role has been modified');
            return;
        }

        if (superAdmin.organisationId !== null) {
            lockSystem('Super admin has been assigned to an organisation');
            return;
        }

        if (!superAdmin.isActive) {
            lockSystem('Super admin account has been deactivated');
            return;
        }

        console.log('✅ Super admin integrity verified');
    } catch (error) {
        console.error('Error verifying super admin integrity:', error);
    }
};

/**
 * Monitor super admin password changes
 */
export const monitorSuperAdminPasswordChange = async (
    userId: string,
    changedBy: string,
    ipAddress?: string
) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, role: true }
        });

        if (user && (user.email === SUPER_ADMIN_EMAIL || user.role === 'super_admin')) {
            // Log password change
            await prisma.auditLog.create({
                data: {
                    action: 'SUPERADMIN_PASSWORD_CHANGED',
                    entity: 'User',
                    entityId: userId,
                    actorId: changedBy,
                    organisationId: 'SYSTEM',
                    details: {
                        email: user.email,
                        timestamp: new Date().toISOString(),
                        ipAddress
                    },
                    ipAddress: ipAddress || 'UNKNOWN',
                    userAgent: 'SYSTEM'
                }
            });

            // If changed by someone other than super admin themselves
            if (changedBy !== userId) {
                lockSystem(`Super admin password changed by unauthorized user: ${changedBy}`);
            }
        }
    } catch (error) {
        console.error('Error monitoring super admin password change:', error);
    }
};

export default {
    checkSystemLock,
    protectSuperAdmin,
    verifySuperAdminIntegrity,
    monitorSuperAdminPasswordChange,
    verifySuperAdminSecret,
    lockSystem
};
