import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface CSRFRequest extends Request {
    csrfToken?: string;
    session: any; // Match augmented required session from express-session
}

/**
 * CSRF Protection Middleware
 * Implements double-submit cookie pattern for CSRF protection
 */
export class CSRFProtection {
    private static readonly CSRF_TOKEN_LENGTH = 32;
    private static readonly CSRF_HEADER_NAME = 'X-CSRF-Token';
    private static readonly CSRF_COOKIE_NAME = 'csrf-token';

    /**
     * Generate a cryptographically secure CSRF token
     */
    static generateToken(): string {
        return crypto.randomBytes(this.CSRF_TOKEN_LENGTH).toString('hex');
    }

    /**
     * Middleware to generate and set CSRF token
     */
    static setToken() {
        return (req: CSRFRequest, res: Response, next: NextFunction) => {
            const session = req.session as any;

            // Generate new token if not exists
            if (!session?.csrfToken) {
                req.session = req.session || {};
                (req.session as any).csrfToken = CSRFProtection.generateToken();
            }

            // Set token in cookie for client access
            res.cookie(CSRFProtection.CSRF_COOKIE_NAME, (req.session as any).csrfToken, {
                httpOnly: false, // Client needs to read this
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });

            // Make token available to request
            req.csrfToken = (req.session as any).csrfToken;
            next();
        };
    }

    /**
     * Middleware to verify CSRF token
     */
    static verifyToken() {
        return (req: CSRFRequest, res: Response, next: NextFunction) => {
            // Skip CSRF for safe methods
            if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                console.log(`[CSRF] Skipping for ${req.method} ${req.path}`);
                return next();
            }

            // Skip CSRF for API key authentication
            if (req.headers['x-api-key']) {
                return next();
            }

            // Skip CSRF for webhooks (they have signature verification)
            if (req.path.includes('/webhook')) {
                return next();
            }

            // Skip CSRF for file uploads (multipart/form-data)
            if (req.path.includes('/import') || req.headers['content-type']?.includes('multipart/form-data')) {
                return next();
            }

            const session = req.session;
            const sessionToken = session?.csrfToken;
            const headerToken = req.headers[CSRFProtection.CSRF_HEADER_NAME.toLowerCase()] as string;
            const cookieToken = req.cookies[CSRFProtection.CSRF_COOKIE_NAME];

            // Check if tokens exist
            if (!sessionToken || !headerToken) {
                return res.status(403).json({
                    error: 'CSRF token missing',
                    code: 'CSRF_TOKEN_MISSING'
                });
            }

            // Verify tokens match (double-submit cookie pattern)
            if (!crypto.timingSafeEqual(
                Buffer.from(sessionToken, 'hex'),
                Buffer.from(headerToken, 'hex')
            )) {
                return res.status(403).json({
                    error: 'CSRF token mismatch',
                    code: 'CSRF_TOKEN_INVALID'
                });
            }

            // Verify cookie token matches (additional security)
            if (cookieToken && !crypto.timingSafeEqual(
                Buffer.from(sessionToken, 'hex'),
                Buffer.from(cookieToken, 'hex')
            )) {
                return res.status(403).json({
                    error: 'CSRF cookie mismatch',
                    code: 'CSRF_COOKIE_INVALID'
                });
            }

            next();
        };
    }

    /**
     * Endpoint to get CSRF token for client
     */
    static getTokenEndpoint() {
        return (req: CSRFRequest, res: Response) => {
            const session = req.session as any;
            res.json({
                csrfToken: req.csrfToken || session?.csrfToken,
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });
        };
    }
}

// Export middleware functions
export const setCSRFToken = CSRFProtection.setToken();
export const verifyCSRFToken = CSRFProtection.verifyToken();
export const getCSRFToken = CSRFProtection.getTokenEndpoint();