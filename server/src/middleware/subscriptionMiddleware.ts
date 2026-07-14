import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware'; // Assuming AuthRequest is exported from authMiddleware
import prisma from '../config/prisma';


export const checkPlanLimits = (resource: 'leads' | 'contacts' | 'users' | 'storage') => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const orgId = req.user.organisationId || req.user.organisation;
            if (!orgId) {
                // If super admin or no org, maybe bypass or error?
                // For safety, error if not super admin
                if (req.user.isSuperAdmin) return next();
                return res.status(403).json({ message: 'No organisation context found for limit check' });
            }

            // Fetch Organisation using Prisma
            const org = await prisma.organisation.findUnique({
                where: { id: orgId.toString() }
            });

            if (!org) {
                // If org not found, allow through (edge case)
                return next();
            }

            // If no subscription data, allow through with defaults
            // (don't block users just because subscription field is missing)
            const subscription = org.subscription as any;
            if (!subscription) {
                return next();
            }

            // Check Subscription Status (only block if explicitly inactive/cancelled)
            if (subscription.status === 'cancelled' || subscription.status === 'inactive' || subscription.status === 'suspended') {
                return res.status(403).json({ message: 'Subscription is not active.' });
            }

            // Fetch Plan
            let plan;
            if (subscription.planId) {
                plan = await prisma.subscriptionPlan.findUnique({
                    where: { id: subscription.planId }
                });
            }

            // Fallback for trial or missing plan: Use "Starter" defaults
            if (!plan) {
                plan = {
                    maxLeads: 10000, // Generous limit for testing
                    maxContacts: 5000,
                    maxUsers: 100, // Allow more team members
                    maxStorage: 10000
                };
            }

            let currentCount = 0;
            let limit = 0;

            switch (resource) {
                case 'leads':
                    // Verify if Leads are stored in Postgres or Mongo?
                    // Previous logs showed Lead controller using Prisma (Postgres)
                    currentCount = await prisma.lead.count({ where: { organisationId: orgId.toString(), isDeleted: false } });
                    limit = plan.maxLeads || 100;
                    break;
                case 'contacts':
                    // Contact model in schema does NOT have isDeleted (checked schema.prisma)
                    currentCount = await prisma.contact.count({ where: { organisationId: orgId.toString() } });
                    limit = plan.maxContacts || 500;
                    break;
                case 'users':
                    // User check is usually done in inviteUser, but good to have middleware too
                    currentCount = await prisma.user.count({ where: { organisationId: orgId.toString(), isActive: true } });
                    limit = plan.maxUsers || 1;
                    break;
                // Add storage check if needed
            }

            if (currentCount >= limit) {
                console.log(`[Limit Reached] ${resource}: ${currentCount} >= ${limit}`);
                return res.status(403).json({
                    message: `Plan limit reached for ${resource}. Current: ${currentCount}, Max: ${limit}. Please upgrade your plan.`
                });
            }

            next();
        } catch (error) {
            console.error('[SubscriptionMiddleware] Error:', error);
            res.status(500).json({ message: 'Error checking subscription limits' });
        }
    };
};
