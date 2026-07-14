/**
 * Enhanced logging utility for better error tracking and debugging
 */

export enum LogLevel {
    ERROR = 'ERROR',
    WARN = 'WARN',
    INFO = 'INFO',
    DEBUG = 'DEBUG'
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: string;
    userId?: string;
    organisationId?: string;
    error?: any;
    metadata?: any;
}

class Logger {
    private isDevelopment = process.env.NODE_ENV === 'development';

    private formatLog(entry: LogEntry): string {
        const { timestamp, level, message, context, userId, organisationId, error, metadata } = entry;
        
        let logString = `[${timestamp}] ${level}`;
        
        if (context) logString += ` [${context}]`;
        if (userId) logString += ` [User:${userId}]`;
        if (organisationId) logString += ` [Org:${organisationId}]`;
        
        logString += `: ${message}`;
        
        if (error) {
            logString += `\nError: ${error.message || error}`;
            if (error.stack && this.isDevelopment) {
                logString += `\nStack: ${error.stack}`;
            }
        }
        
        if (metadata && this.isDevelopment) {
            logString += `\nMetadata: ${JSON.stringify(metadata, null, 2)}`;
        }
        
        return logString;
    }

    private log(level: LogLevel, message: string, options: Partial<LogEntry> = {}) {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...options
        };

        const formattedLog = this.formatLog(entry);
        
        switch (level) {
            case LogLevel.ERROR:
                console.error(formattedLog);
                break;
            case LogLevel.WARN:
                console.warn(formattedLog);
                break;
            case LogLevel.INFO:
                console.info(formattedLog);
                break;
            case LogLevel.DEBUG:
                if (this.isDevelopment) {
                    console.debug(formattedLog);
                }
                break;
        }
    }

    error(message: string, error?: any, context?: string, userId?: string, organisationId?: string, metadata?: any) {
        this.log(LogLevel.ERROR, message, { error, context, userId, organisationId, metadata });
    }

    warn(message: string, context?: string, userId?: string, organisationId?: string, metadata?: any) {
        this.log(LogLevel.WARN, message, { context, userId, organisationId, metadata });
    }

    info(message: string, context?: string, userId?: string, organisationId?: string, metadata?: any) {
        this.log(LogLevel.INFO, message, { context, userId, organisationId, metadata });
    }

    debug(message: string, context?: string, userId?: string, organisationId?: string, metadata?: any) {
        this.log(LogLevel.DEBUG, message, { context, userId, organisationId, metadata });
    }

    // Convenience methods for common scenarios
    apiRequest(method: string, url: string, userId?: string, organisationId?: string, body?: any) {
        this.info(`${method} ${url}`, 'API', userId, organisationId, { body });
    }

    apiError(method: string, url: string, error: any, userId?: string, organisationId?: string) {
        this.error(`${method} ${url} failed`, error, 'API', userId, organisationId);
    }

    dbQuery(operation: string, model: string, userId?: string, organisationId?: string, metadata?: any) {
        this.debug(`DB ${operation} on ${model}`, 'DATABASE', userId, organisationId, metadata);
    }

    dbError(operation: string, model: string, error: any, userId?: string, organisationId?: string) {
        this.error(`DB ${operation} on ${model} failed`, error, 'DATABASE', userId, organisationId);
    }

    auth(message: string, userId?: string, organisationId?: string, metadata?: any) {
        this.info(message, 'AUTH', userId, organisationId, metadata);
    }

    authError(message: string, error?: any, metadata?: any) {
        this.error(message, error, 'AUTH', undefined, undefined, metadata);
    }

    webhook(service: string, event: string, organisationId?: string, metadata?: any) {
        this.info(`${service} webhook: ${event}`, 'WEBHOOK', undefined, organisationId, metadata);
    }

    webhookError(service: string, event: string, error: any, organisationId?: string) {
        this.error(`${service} webhook ${event} failed`, error, 'WEBHOOK', undefined, organisationId);
    }
}

// Export singleton instance
export const logger = new Logger();
export default logger;