import prisma from '../config/prisma';


export enum AuditAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    RESTORE = 'RESTORE',
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    LOGIN_FAILED = 'LOGIN_FAILED',
    EXPORT = 'EXPORT',
    VIEW_SENSITIVE = 'VIEW_SENSITIVE',
    SETTINGS_CHANGE = 'SETTINGS_CHANGE',
    LEAD_STATUS_CHANGE = 'LEAD_STATUS_CHANGE',
    LEAD_ASSIGNED = 'LEAD_ASSIGNED'
}

export enum AuditEntity {
    LEAD = 'Lead',
    CONTACT = 'Contact',
    USER = 'User',
    ORGANISATION = 'Organisation',
    REPORT = 'Report',
    SETTINGS = 'Settings',
    AUTH = 'Auth',
    INTEGRATION = 'Integration'
}

interface AuditLogParams {
    action: AuditAction | string;
    entity: AuditEntity | string;
    entityId?: string;
    actorId?: string;
    organisationId: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
}

export const logAudit = async (params: AuditLogParams) => {
    try {
        await prisma.auditLog.create({
            data: {
                action: params.action,
                entity: params.entity,
                entityId: params.entityId,
                actorId: params.actorId,
                organisationId: params.organisationId,
                details: params.details || {},
                ipAddress: params.ipAddress,
                userAgent: params.userAgent
            }
        });
    } catch (error) {
        // Audit logging should not block main execution flow, so we just log the error
        console.error('Failed to create audit log:', error);
    }
};

/**
 * Specifically log data export actions (PDF, CSV, etc)
 */
export const logExportAudit = async (req: any, reportName: string, metadata?: any) => {
    const user = req.user;
    if (!user) return;

    await logAudit({
        action: AuditAction.EXPORT,
        entity: AuditEntity.REPORT,
        actorId: user.id,
        organisationId: user.organisationId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
            reportName,
            ...metadata
        }
    });
};
