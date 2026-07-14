import zxcvbn from 'zxcvbn';

export interface PasswordValidationResult {
    isValid: boolean;
    score: number; // 0-4 (zxcvbn score)
    errors: string[];
    suggestions: string[];
    estimatedCrackTime: string;
}

export class PasswordValidator {
    private static readonly MIN_LENGTH = 12;
    private static readonly MIN_SCORE = 3; // Require strong passwords (3-4)

    /**
     * Comprehensive password validation
     */
    static validate(password: string, userInputs: string[] = []): PasswordValidationResult {
        const errors: string[] = [];
        const suggestions: string[] = [];

        // Basic length check
        if (password.length < this.MIN_LENGTH) {
            errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
        }

        // Character type requirements
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChars = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

        if (!hasUppercase) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (!hasLowercase) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (!hasNumbers) {
            errors.push('Password must contain at least one number');
        }
        if (!hasSpecialChars) {
            errors.push('Password must contain at least one special character');
        }

        // Common password patterns
        if (/(.)\1{2,}/.test(password)) {
            errors.push('Password cannot contain repeated characters (e.g., "aaa")');
        }

        if (/123|abc|qwe|password|admin|user/i.test(password)) {
            errors.push('Password cannot contain common sequences or words');
        }

        // Use zxcvbn for advanced analysis
        const zxcvbnResult = zxcvbn(password, userInputs);

        // Add zxcvbn suggestions
        if (zxcvbnResult.feedback.suggestions.length > 0) {
            suggestions.push(...zxcvbnResult.feedback.suggestions);
        }

        if (zxcvbnResult.feedback.warning) {
            suggestions.push(zxcvbnResult.feedback.warning);
        }

        // Check minimum score
        if (zxcvbnResult.score < this.MIN_SCORE) {
            errors.push('Password is too weak. Please choose a stronger password.');
        }

        return {
            isValid: errors.length === 0 && zxcvbnResult.score >= this.MIN_SCORE,
            score: zxcvbnResult.score,
            errors,
            suggestions,
            estimatedCrackTime: String(zxcvbnResult.crack_times_display.offline_slow_hashing_1e4_per_second)
        };
    }

    /**
     * Check if password has been compromised (basic patterns)
     */
    static isCompromised(password: string): boolean {
        const commonPasswords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey',
            'dragon', 'master', 'shadow', 'superman', 'michael'
        ];

        return commonPasswords.some(common =>
            password.toLowerCase().includes(common.toLowerCase())
        );
    }

    /**
     * Generate password strength meter data
     */
    static getStrengthMeter(password: string): {
        score: number;
        label: string;
        color: string;
        percentage: number;
    } {
        const result = zxcvbn(password);
        const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        const colors = ['#ff4757', '#ff6b7a', '#ffa502', '#2ed573', '#20bf6b'];

        return {
            score: result.score,
            label: labels[result.score],
            color: colors[result.score],
            percentage: (result.score / 4) * 100
        };
    }
}

/**
 * Middleware for password validation
 */
export const validatePassword = (req: any, res: any, next: any) => {
    const { password, email, firstName, lastName } = req.body;

    if (!password) {
        return next();
    }

    const userInputs = [email, firstName, lastName].filter(Boolean);
    const validation = PasswordValidator.validate(password, userInputs);

    if (!validation.isValid) {
        return res.status(400).json({
            error: 'Password validation failed',
            details: validation.errors,
            suggestions: validation.suggestions,
            score: validation.score
        });
    }

    next();
};