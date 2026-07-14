import crypto from 'crypto';

export interface EnvValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export class EnvironmentValidator {
    private static readonly REQUIRED_VARS = [
        'JWT_SECRET'
    ];

    private static readonly OPTIONAL_VARS = [
        'META_APP_SECRET',
        'META_WEBHOOK_SECRET',
        'WHATSAPP_WEBHOOK_SECRET',
        'META_VERIFY_TOKEN',
        'WHATSAPP_VERIFY_TOKEN',
        'ALLOWED_ORIGINS'
    ];

    private static readonly MIN_SECRET_LENGTH = 32;

    /**
     * Validate all environment variables
     */
    static validate(): EnvValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check required variables
        for (const varName of this.REQUIRED_VARS) {
            const value = process.env[varName];

            if (!value) {
                errors.push(`Missing required environment variable: ${varName}`);
                continue;
            }

            // Validate secret strength
            if (varName.includes('SECRET') || varName.includes('JWT')) {
                const secretValidation = this.validateSecret(varName, value);
                if (!secretValidation.isValid) {
                    errors.push(...secretValidation.errors);
                }
                warnings.push(...secretValidation.warnings);
            }
        }

        // Check optional variables
        for (const varName of this.OPTIONAL_VARS) {
            const value = process.env[varName];

            if (!value) {
                warnings.push(`Missing optional environment variable: ${varName}`);
                continue;
            }

            // Validate secret strength if it's a secret
            if (varName.includes('SECRET')) {
                const secretValidation = this.validateSecret(varName, value);
                // Errors for optional vars are treated as warnings
                if (!secretValidation.isValid) {
                    warnings.push(...secretValidation.errors);
                }
                warnings.push(...secretValidation.warnings);
            }

            // Check for default values in production
            if (process.env.NODE_ENV === 'production' && this.isDefaultValue(varName, value)) {
                warnings.push(`Optional variable ${varName} is using a default/insecure value in production`);
            }
        }

        // Production-specific checks
        if (process.env.NODE_ENV === 'production') {
            // Check HTTPS enforcement
            if (!process.env.FORCE_HTTPS && !process.env.HTTPS_ONLY) {
                warnings.push('Consider setting FORCE_HTTPS=true for production');
            }
        }

        // CORS validation
        if (process.env.ALLOWED_ORIGINS) {
            const corsValidation = this.validateCorsOrigins(process.env.ALLOWED_ORIGINS);
            if (!corsValidation.isValid) {
                warnings.push(...corsValidation.errors);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate secret strength
     */
    private static validateSecret(name: string, secret: string): EnvValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (secret.length < this.MIN_SECRET_LENGTH) {
            errors.push(`${name} must be at least ${this.MIN_SECRET_LENGTH} characters long`);
        }

        // Check for weak patterns
        if (/^[a-zA-Z0-9]+$/.test(secret) && secret.length < 64) {
            warnings.push(`${name} should contain special characters for better security`);
        }

        // Check entropy
        const entropy = this.calculateEntropy(secret);
        if (entropy < 4.0) {
            warnings.push(`${name} has low entropy (${entropy.toFixed(2)}). Consider using a more random secret`);
        }

        return { isValid: errors.length === 0, errors, warnings };
    }

    /**
     * Check if value is a known default/insecure value
     */
    private static isDefaultValue(name: string, value: string): boolean {
        const defaultValues: Record<string, string[]> = {
            'META_VERIFY_TOKEN': ['my_secure_token', 'verify_token', 'test_token'],
            'WHATSAPP_VERIFY_TOKEN': ['my_whatsapp_secure_token', 'whatsapp_token', 'test_token'],
            'JWT_SECRET': ['secret_key_change_this', 'your_secret_key_here', 'jwt_secret'],
            'META_WEBHOOK_SECRET': ['webhook_secret', 'meta_secret', 'your_webhook_secret_here'],
            'WHATSAPP_WEBHOOK_SECRET': ['your_whatsapp_webhook_secret_here', 'whatsapp_secret']
        };

        const defaults = defaultValues[name] || [];
        return defaults.some(defaultVal =>
            value.toLowerCase().includes(defaultVal.toLowerCase())
        );
    }

    /**
     * Validate CORS origins
     */
    private static validateCorsOrigins(origins: string): EnvValidationResult {
        const errors: string[] = [];
        const originList = origins.split(',').map(o => o.trim());

        for (const origin of originList) {
            if (origin === '*') {
                errors.push('Wildcard (*) CORS origin is not allowed for security');
                continue;
            }

            try {
                new URL(origin);
            } catch {
                errors.push(`Invalid CORS origin format: ${origin}`);
            }
        }

        return { isValid: errors.length === 0, errors, warnings: [] };
    }

    /**
     * Calculate Shannon entropy of a string
     */
    private static calculateEntropy(str: string): number {
        const freq: Record<string, number> = {};

        for (const char of str) {
            freq[char] = (freq[char] || 0) + 1;
        }

        let entropy = 0;
        const len = str.length;

        for (const count of Object.values(freq)) {
            const p = count / len;
            entropy -= p * Math.log2(p);
        }

        return entropy;
    }

    /**
     * Generate secure random secret
     */
    static generateSecureSecret(length: number = 64): string {
        return crypto.randomBytes(length).toString('base64url');
    }

    /**
     * Initialize environment validation on startup
     */
    static initializeValidation(): void {
        const result = this.validate();

        if (result.errors.length > 0) {
            console.error('❌ Environment Validation Errors:');
            result.errors.forEach(error => console.error(`  - ${error}`));

            if (process.env.NODE_ENV === 'production' && result.errors.length > 0) {
                console.error('🚨 Exiting due to CRITICAL environment validation errors in production');
                process.exit(1);
            }
        }

        if (result.warnings.length > 0) {
            console.warn('⚠️  Environment Validation Warnings:');
            result.warnings.forEach(warning => console.warn(`  - ${warning}`));
        }

        if (result.errors.length === 0 && result.warnings.length === 0) {
            console.log('✅ Environment validation passed');
        }
    }
}