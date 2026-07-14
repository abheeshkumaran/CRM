import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import generateToken from '../utils/generateToken';
import prisma from '../config/prisma';


// @desc    Initialize SSO Login
// @route   POST /api/auth/sso/init
// @access  Public
export const initSSO = async (req: Request, res: Response) => {
    const { email, slug } = req.body;

    try {
        let org;
        if (slug) {
            org = await prisma.organisation.findUnique({ where: { slug } });
        } else if (email) {
            // Try to find by domain logic or just user lookup (risky if email not unique across orgs, but schema says email is unique?)
            // Schema: email is NOT unique globally in User model? 
            // Checking schema: User model has "email String". Not marked unique.
            // But usually SaaS has unique email.
            // Let's assume unique email for simplicity for now, OR find user first.
            const user = await prisma.user.findFirst({
                where: { email: { equals: email, mode: 'insensitive' } },
                include: { organisation: true }
            });
            org = user?.organisation;
        }

        if (!org) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        if (!org.ssoConfig) {
            return res.status(400).json({ message: 'SSO is not configured for this organization' });
        }

        // Return the redirect URL for the frontend to navigate to
        // We redirect to a backend route that triggers passport
        // /api/auth/sso/login/:orgId
        return res.json({ redirectUrl: `/api/auth/sso/login/${org.id}` });

    } catch (error) {
        console.error('SSO Init Error:', error);
        return res.status(500).json({ message: 'Server error during SSO init' });
    }
};

// @desc    Trigger SAML Redirect
// @route   GET /api/auth/sso/login/:orgId
export const ssoLogin = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('saml', {
        failureRedirect: '/login?error=sso_failed',
        failureFlash: true
    })(req, res, next);
};

import { logAudit } from '../utils/auditLogger';

// @desc    SAML Callback
// @route   POST /api/auth/sso/callback/:orgId
export const ssoCallback = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('saml', { session: false }, async (err: any, user: any) => {
        if (err || !user) {
            console.error('SSO Authenticate Error:', err);
            return res.redirect('http://localhost:5173/login?error=sso_failed');
        }

        // Generate JWT
        const token = generateToken(user.id);

        // Audit Log
        await logAudit({
            action: 'AUTH_SSO_LOGIN_SUCCESS',
            entity: 'User',
            entityId: user.id,
            actorId: user.id,
            organisationId: user.organisationId,
            details: { email: user.email, provider: 'saml' }
        });

        // Redirect to Frontend Dashboard with Token
        // NOTE: In production, consider a more secure way than query param (e.g. cookie + redirect, or temp code)
        // For MVP, query param is acceptable if short-lived.
        // Better: Set cookie here and redirect.

        // We'll revert to simply passing it in query for now to match current localStorage flow
        const userInfo = JSON.stringify({
            _id: user.id,
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            organisation: user.organisationId, // Simplified
            token: token
        });

        // Encode to pass safely
        const safeInfo = encodeURIComponent(userInfo);
        res.redirect(`http://localhost:5173/sso-callback?data=${safeInfo}`);

    })(req, res, next);
};
