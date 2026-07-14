
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';


/**
 * Data Isolation Middleware
 * Ensures all queries are scoped to the user's organisation
 * This middleware adds org filtering to req for use in controllers
 */
export const dataIsolation = async (req: Request, _res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;

        if (!user) {
            return next(); // Let auth middleware handle this
        }

        // Add organisation filter to request for easy access in controllers
        // Prisma standard: Use organisationId
        (req as any).orgFilter = user.organisationId
            ? { organisationId: user.organisationId }
            : {};

        // Super admins can bypass org filtering
        (req as any).isSuperAdmin = user.role === 'super_admin';

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * License Check Middleware
 * Verifies the organisation has a valid license before allowing access
 */
export const requireValidLicense = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;

        if (!user || !user.organisationId) {
            return res.status(403).json({
                message: 'Organisation not found',
                code: 'NO_ORGANISATION'
            });
        }

        // Super admins bypass license check
        if ((req as any).isSuperAdmin || user.role === 'super_admin') {
            return next();
        }

        const license = await prisma.license.findFirst({
            where: {
                organisationId: user.organisationId,
                status: { in: ['active', 'trial'] },
                endDate: { gt: new Date() }
            },
            include: { plan: true }
        });

        if (!license) {
            return res.status(403).json({
                message: 'Your license has expired. Please renew to continue.',
                code: 'LICENSE_EXPIRED'
            });
        }

        // Add license info to request
        (req as any).license = license;

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * User Limit Check Middleware
 * Prevents adding users beyond the license limit
 */
export const checkUserLimit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;

        if (!user || !user.organisationId) {
            return next();
        }

        const license = await prisma.license.findFirst({
            where: {
                organisationId: user.organisationId,
                status: { in: ['active', 'trial'] }
            }
        });

        if (!license) {
            return res.status(403).json({
                message: 'No active license found',
                code: 'NO_LICENSE'
            });
        }

        if (license.currentUsers >= license.maxUsers) {
            return res.status(403).json({
                message: `User limit reached (${license.maxUsers}). Please upgrade your plan.`,
                code: 'USER_LIMIT_REACHED'
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Feature Access Middleware
 * Checks if a specific feature is available in the current plan
 */
export const requireFeature = (featureName: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;

            if (!user || !user.organisationId) {
                return res.status(403).json({ message: 'Organisation not found' });
            }

            // Super admins have all features
            if ((req as any).isSuperAdmin || user.role === 'super_admin') {
                return next();
            }

            const license = await prisma.license.findFirst({
                where: {
                    organisationId: user.organisationId,
                    status: { in: ['active', 'trial'] }
                },
                include: { plan: true }
            });

            if (!license || !license.plan) {
                return res.status(403).json({
                    message: 'No active license found',
                    code: 'NO_LICENSE'
                });
            }

            const plan = license.plan;
            if (!plan.features || !plan.features.includes(featureName)) {
                return res.status(403).json({
                    message: `This feature (${featureName}) is not available in your current plan.`,
                    code: 'FEATURE_NOT_AVAILABLE'
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};
