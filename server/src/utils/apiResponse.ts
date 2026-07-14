import { Response } from 'express';

/**
 * Standardized API response utility
 */

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    errors?: string[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    meta?: any;
}

export class ResponseHandler {
    /**
     * Send success response
     */
    static success<T>(
        res: Response,
        data?: T,
        message?: string,
        statusCode: number = 200,
        pagination?: ApiResponse['pagination'],
        meta?: any
    ) {
        const response: ApiResponse<T> = {
            success: true,
            data,
            message,
            pagination,
            meta
        };

        return res.status(statusCode).json(response);
    }

    /**
     * Send error response
     */
    static error(
        res: Response,
        error: string | string[],
        statusCode: number = 400,
        data?: any
    ) {
        const response: ApiResponse = {
            success: false,
            data
        };

        if (Array.isArray(error)) {
            response.errors = error;
            response.error = error[0]; // First error as main error
        } else {
            response.error = error;
        }

        return res.status(statusCode).json(response);
    }

    /**
     * Send validation error response
     */
    static validationError(
        res: Response,
        errors: string | string[],
        data?: any
    ) {
        return this.error(res, errors, 422, data);
    }

    /**
     * Send not found response
     */
    static notFound(
        res: Response,
        message: string = 'Resource not found'
    ) {
        return this.error(res, message, 404);
    }

    /**
     * Send unauthorized response
     */
    static unauthorized(
        res: Response,
        message: string = 'Unauthorized access'
    ) {
        return this.error(res, message, 401);
    }

    /**
     * Send forbidden response
     */
    static forbidden(
        res: Response,
        message: string = 'Access forbidden'
    ) {
        return this.error(res, message, 403);
    }

    /**
     * Send internal server error response
     */
    static serverError(
        res: Response,
        message: string = 'Internal server error'
    ) {
        return this.error(res, message, 500);
    }

    /**
     * Send created response
     */
    static created<T>(
        res: Response,
        data: T,
        message: string = 'Resource created successfully'
    ) {
        return this.success(res, data, message, 201);
    }

    /**
     * Send no content response
     */
    static noContent(res: Response) {
        return res.status(204).send();
    }

    /**
     * Send paginated response
     */
    static paginated<T>(
        res: Response,
        data: T[],
        page: number,
        limit: number,
        total: number,
        message?: string
    ) {
        const totalPages = Math.ceil(total / limit);
        
        return this.success(res, data, message, 200, {
            page,
            limit,
            total,
            totalPages
        });
    }
}

/**
 * Convenience functions for common responses
 */
export const sendSuccess = ResponseHandler.success;
export const sendError = ResponseHandler.error;
export const sendValidationError = ResponseHandler.validationError;
export const sendNotFound = ResponseHandler.notFound;
export const sendUnauthorized = ResponseHandler.unauthorized;
export const sendForbidden = ResponseHandler.forbidden;
export const sendServerError = ResponseHandler.serverError;
export const sendCreated = ResponseHandler.created;
export const sendNoContent = ResponseHandler.noContent;
export const sendPaginated = ResponseHandler.paginated;