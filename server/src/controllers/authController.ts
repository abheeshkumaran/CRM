
import { Request, Response } from 'express';
import crypto from 'crypto';
import generateToken from '../utils/generateToken';
import bcrypt from 'bcryptjs';
// UserRole import removed
import { logAudit } from '../utils/auditLogger';
import { EmailService } from '../services/emailService';
import { validatePassword } from '../utils/passwordValidator';
import prisma from '../config/prisma';
import { isAdmin, isSuperAdmin } from '../utils/roleUtils';


// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const authUser = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    if (!email || !password) {
        console.log('Login failed: Missing email or password');
        res.status(400).json({ message: 'Please provide email and password' });
        return;
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: { equals: email, mode: 'insensitive' } },
                    { userId: email }
                ]
            },
            include: {
                organisation: true
            }
        });

        if (user && (await bcrypt.compare(password, user.password))) {
            console.log(`Login SUCCESS for: ${email}`);

            // Check if user manages any branch
            const branchManaged = await prisma.branch.findFirst({
                where: { managerId: user.id, isDeleted: false }
            });
            const isBranchManager = !!branchManaged;

            // Check if active
            if (!user.isActive) {
                res.status(401).json({ message: 'User account is deactivated' });
                return;
            }

            if (user.organisationId) {
                // Fire and forget audit log
                logAudit({
                    action: 'LOGIN',
                    entity: 'User',
                    entityId: user.id,
                    actorId: user.id,
                    organisationId: user.organisationId,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });
            }

            // Resolve custom roles if necessary to correctly identify admins
            let userWithResolvedRole = user;
            if (typeof user.role === 'string' && user.role.startsWith('custom_')) {
                const roleData = await prisma.role.findUnique({ where: { id: user.role } });
                if (roleData) {
                    userWithResolvedRole = { ...user, role: roleData };
                }
            }

            res.json({
                _id: user.id, // Keep _id for frontend compatibility if needed
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                isAdmin: isAdmin(userWithResolvedRole),
                isSuperAdmin: isSuperAdmin(userWithResolvedRole),
                isBranchManager,
                organisation: user.organisation,
                branchId: user.branchId,
                token: generateToken(user.id),
            });
        } else {
            console.log(`Login FAILED for: ${email}`);
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error: any) {
        console.error("Login Error Details:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register a new user & organisation
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
    const { firstName, lastName, email, password, companyName } = req.body;

    try {
        const userExists = await prisma.user.findFirst({
            where: { email }
        });

        if (userExists) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ message: 'Password must be at least 6 characters long' });
            return;
        }

        // Default plan ID can be null or a generic string since the SubscriptionPlan model doesn't exist
        const defaultPlan = { id: 'starter-plan' };

        const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substr(2, 4);

        // Transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx: any) => {
            const org = await tx.organisation.create({
                data: {
                    name: companyName,
                    slug,
                    domain: `${slug}.${email.split('@')[1] || 'unknown.com'}`,
                    status: 'active',
                    subscription: {
                        status: 'trialing',
                        planId: defaultPlan?.id,
                        startDate: new Date(),
                        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
                        autoRenew: false
                    },
                    userIdCounter: 1
                }
            });

            // Generate userId
            const prefix = (companyName.substring(0, 3) + 'USR').substring(0, 3).toUpperCase();
            const generatedUserId = `${prefix}${Math.floor(10000 + Math.random() * 90000)}`;

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // 2. Create Admin User
            const user = await tx.user.create({
                data: {
                    firstName,
                    lastName,
                    email,
                    password: hashedPassword,
                    role: 'admin', // Downgrade from super_admin to admin for tenant creators
                    organisationId: org.id,
                    userId: generatedUserId,
                    isActive: true
                }
            });

            // 3. Link Creator to Org
            await tx.organisation.update({
                where: { id: org.id },
                data: { createdBy: user.id }
            });

            return { user, org };
        });

        const { user, org } = result;

        if (user) {
            // Audit Log
            logAudit({
                action: 'REGISTER_ORGANISATION',
                entity: 'Organisation',
                entityId: org.id,
                actorId: user.id,
                organisationId: org.id,
                details: { companyName, email }
            });

            res.status(201).json({
                _id: user.id,
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                organisationId: org.id,
                branchId: user.branchId,
                token: generateToken(user.id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error: any) {
        // Unique constraint P2002
        if (error.code === 'P2002') {
            if (error.meta?.target?.includes('slug')) {
                res.status(400).json({ message: 'Company name/slug already exists, please try a variation.' });
            } else {
                res.status(400).json({ message: 'User or Organisation already exists' });
            }
        } else {
            res.status(500).json({ message: error.message });
        }
    }
};

/**
 * @desc    Forgot Password - Send Reset Email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
        const users = await prisma.user.findMany({ where: { email } });

        if (users.length === 0) {
            // Security: Don't reveal user existence
            res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
            return;
        }

        // Generate Reset Token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash it
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Expire in 10 minutes
        const resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.user.updateMany({
            where: { email },
            data: {
                resetPasswordToken,
                resetPasswordExpire
            }
        });

        const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

        const message = `
            <h1>Password Reset Request</h1>
            <p>You requested a password reset. Please click the link below to reset your password:</p>
            <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
            <p>This link expires in 10 minutes.</p>
        `;

        const sent = await EmailService.sendEmail(user.email, 'Password Reset Request', message);

        if (sent) {
            // Log security event
            logAudit({
                action: 'AUTH_FORGOT_PASSWORD_REQUESTED',
                entity: 'User',
                entityId: user.id,
                actorId: user.id,
                organisationId: user.organisationId || 'SYSTEM',
                details: { email: user.email }
            });

            res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
        } else {
            // Revert on failure
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    resetPasswordToken: null,
                    resetPasswordExpire: null
                }
            });
            res.status(500).json({ message: 'Email could not be sent' });
        }

    } catch (error: any) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Reset Password
 * @route   PUT /api/auth/reset-password/:resetToken
 * @access  Public
 */
export const resetPassword = async (req: Request, res: Response) => {
    const { resetToken } = req.params;
    const { password } = req.body;

    if (!password) {
        res.status(400).json({ message: 'Please provide a new password' });
        return;
    }

    try {
        // Hash the token from params to compare with DB
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken,
                resetPasswordExpire: { gt: new Date() }
            }
        });

        if (!user) {
            res.status(400).json({ message: 'Invalid or expired token' });
            return;
        }

        // CRITICAL: Monitor super admin password changes
        const { monitorSuperAdminPasswordChange } = await import('../middleware/superAdminProtection');
        await monitorSuperAdminPasswordChange(user.id, user.id, req.ip);

        // Set new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpire: null
            }
        });

        // Log security event
        logAudit({
            action: 'AUTH_PASSWORD_RESET_SUCCESS',
            entity: 'User',
            entityId: user.id,
            actorId: user.id,
            organisationId: user.organisationId || 'SYSTEM',
            details: { email: user.email }
        });

        res.status(200).json({ message: 'Password reset successful' });

    } catch (error: any) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get current user profile (session refresh)
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        res.json({
            _id: user.id,
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            isBranchManager: user.isBranchManager,
            isSuperAdmin: user.isSuperAdmin,
            organisation: user.organisation,
            branchId: user.branchId,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
