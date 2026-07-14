import { Request, Response, NextFunction } from 'express';

/**
 * Validation utility functions for request data
 */

export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
    // International phone number format
    const phoneRegex = /^[+]?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
};

export const validateRequired = (value: any): boolean => {
    return value !== undefined && value !== null && value !== '';
};

export const validateStringLength = (value: string, min: number = 0, max: number = 255): boolean => {
    if (typeof value !== 'string') return false;
    return value.length >= min && value.length <= max;
};

export const validateNumber = (value: any, min?: number, max?: number): boolean => {
    const num = Number(value);
    if (isNaN(num)) return false;
    if (min !== undefined && num < min) return false;
    if (max !== undefined && num > max) return false;
    return true;
};

export const validateDate = (value: any): boolean => {
    const date = new Date(value);
    return !isNaN(date.getTime());
};

/**
 * Middleware to validate common request parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '20');

    if (page < 1 || page > 1000) {
        return res.status(400).json({ message: 'Page must be between 1 and 1000' });
    }

    if (limit < 1 || limit > 100) {
        return res.status(400).json({ message: 'Limit must be between 1 and 100' });
    }

    req.query.page = page.toString();
    req.query.limit = limit.toString();
    next();
};

/**
 * Sanitize string input to prevent XSS
 */
export const sanitizeString = (input: string): string => {
    if (typeof input !== 'string') return '';
    return input
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .trim()
        .substring(0, 1000); // Limit length
};

/**
 * Validate and sanitize object properties
 */
export const sanitizeObject = (obj: any, allowedFields: string[]): any => {
    const sanitized: any = {};

    for (const field of allowedFields) {
        if (obj[field] !== undefined) {
            if (typeof obj[field] === 'string') {
                sanitized[field] = sanitizeString(obj[field]);
            } else {
                sanitized[field] = obj[field];
            }
        }
    }

    return sanitized;
};

/**
 * Common validation schemas
 */
export const leadValidation = {
    firstName: (value: string) => validateRequired(value) && validateStringLength(value, 1, 50),
    lastName: (value: string) => validateRequired(value) && validateStringLength(value, 1, 50),
    email: (value: string) => validateRequired(value) && validateEmail(value),
    phone: (value: string) => validateRequired(value) && validatePhone(value),
    company: (value: string) => validateStringLength(value, 0, 100)
};

export const contactValidation = {
    firstName: (value: string) => validateRequired(value) && validateStringLength(value, 1, 50),
    lastName: (value: string) => validateRequired(value) && validateStringLength(value, 1, 50),
    email: (value: string) => validateRequired(value) && validateEmail(value),
    phone: (value: string) => validatePhone(value)
};

export const opportunityValidation = {
    name: (value: string) => validateRequired(value) && validateStringLength(value, 1, 100),
    amount: (value: any) => validateNumber(value, 0, 999999999),
    probability: (value: any) => validateNumber(value, 0, 100),
    closeDate: (value: any) => validateDate(value)
};