import passport from 'passport';
import { MultiSamlStrategy } from 'passport-saml';
// UserRole import removed
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';


export const setupPassport = () => {
    passport.serializeUser((user: any, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
        try {
            const user = await prisma.user.findUnique({ where: { id } });
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });

    const strategy = new MultiSamlStrategy(
        {
            passReqToCallback: true,
            getSamlOptions: async (req: any, done: any) => {
                try {
                    const { orgId } = req.params;
                    if (!orgId) return done(new Error('Organization ID missing for SSO'));

                    const org = await prisma.organisation.findUnique({
                        where: { id: orgId }
                    });

                    if (!org || !org.ssoConfig) {
                        return done(new Error('SSO not configured for this organization'));
                    }

                    const ssoConfig = org.ssoConfig as any;

                    return done(null, {
                        path: `/api/auth/sso/callback/${orgId}`,
                        entryPoint: ssoConfig.entryPoint,
                        issuer: ssoConfig.issuer || 'mern-crm',
                        cert: ssoConfig.cert,
                        identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
                    });
                } catch (err) {
                    done(err);
                }
            }
        } as any, // Cast options to any
        async (req: any, profile: any, done: any) => { // Cast args to any
            // User finding/creation logic
            try {
                // Profile usually has nameID (email) or attributes
                const email = profile.nameID || profile.email;

                if (!email) return done(new Error('No email found in SAML response'));

                const { orgId } = req.params;

                // 1. Find User
                let user = await prisma.user.findFirst({
                    where: {
                        email: { equals: email, mode: 'insensitive' },
                        organisationId: orgId
                    }
                });

                // 2. JIT Provisioning
                if (!user) {
                    // Create basic user
                    const firstName = profile.firstName || profile.givenName || email.split('@')[0];
                    const lastName = profile.lastName || profile.sn || '-';

                    // Generate random password
                    const randomPass = Math.random().toString(36).slice(-8);
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(randomPass, salt);

                    // Get Org for defaults
                    const org = await prisma.organisation.findUnique({ where: { id: orgId } });
                    if (!org) return done(new Error('Org not found'));

                    user = await prisma.user.create({
                        data: {
                            firstName,
                            lastName,
                            email,
                            password: hashedPassword,
                            role: 'sales_rep', // Default role
                            organisationId: orgId,
                            userId: `${org.name.slice(0, 3).toUpperCase()}_${Date.now()}`,
                            isActive: true
                        }
                    });
                }

                return done(null, user);
            } catch (err) {
                console.error('SAML Verify Error:', err);
                return done(err);
            }
        }
    );

    passport.use('saml', strategy);
};
