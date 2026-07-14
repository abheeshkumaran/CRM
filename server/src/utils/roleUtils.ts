import prisma from '../config/prisma';


/**
 * Normalizes a role string or object to a standardized key format.
 * (e.g. "Super Admin" -> "super_admin")
 */
export function normalizeRole(role: any): string {
    if (!role) return '';

    if (typeof role === 'object') {
        const roleStr = role.roleKey || role.name || '';
        return String(roleStr).toLowerCase().replace(/[\s-]/g, '_');
    }

    return String(role).toLowerCase().replace(/[\s-]/g, '_');
}

/**
 * Checks if a user has any of the target roles.
 */
export function checkRole(user: any, targetRoles: string | string[]): boolean {
    if (!user) return false;

    const userRoleStr = normalizeRole(user.role);
    const userPositionStr = user.position ? normalizeRole(user.position) : '';

    const targets = Array.isArray(targetRoles) ? targetRoles : [targetRoles];

    return targets.some(target => {
        const normalizedTarget = target.toLowerCase().replace(/[\s-]/g, '_');
        return normalizedTarget === userRoleStr || normalizedTarget === userPositionStr;
    });
}

/**
 * Helper for Super Admin check
 */
export function isSuperAdmin(user: any): boolean {
    return checkRole(user, 'super_admin');
}

/**
 * Helper for Admin check (includes Super Admin)
 */
export function isAdmin(user: any): boolean {
    return checkRole(user, ['admin', 'super_admin']);
}

/**
 * Helper for Org Admin check (includes Admin and Super Admin)
 */
export function isOrgAdmin(user: any): boolean {
    return checkRole(user, ['org_admin', 'organisation_admin', 'admin', 'super_admin']);
}

/**
 * Helper for Manager check (includes Admin and Super Admin)
 */
export function isManager(user: any): boolean {
    return checkRole(user, ['manager', 'admin', 'super_admin']);
}


/**
 * Resolves whether a user has a specific permission based on direct overrides or role templates.
 */
export async function hasUserPermission(userId: string, targetPermission: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, permissions: true }
    });

    if (!user) return false;

    // Standard admins and super admins have all permissions
    const normalizedRole = normalizeRole(user.role);
    if (normalizedRole === 'admin' || normalizedRole === 'super_admin') {
        return true;
    }

    // Check direct user permissions override
    if (user.permissions && Array.isArray(user.permissions)) {
        if (user.permissions.includes('*') || user.permissions.includes(targetPermission)) {
            return true;
        }

        // Handle namespace wildcard like 'users:*'
        const parts = targetPermission.split(':');
        if (parts.length > 1) {
            const wildcardNamespace = `${parts[0]}:*`;
            if (user.permissions.includes(wildcardNamespace)) {
                return true;
            }
        }
    }

    // Check role permissions override
    const roleRecord = await prisma.role.findFirst({
        where: {
            OR: [
                { id: user.role },
                { roleKey: user.role }
            ]
        }
    });

    if (roleRecord && roleRecord.permissions && Array.isArray(roleRecord.permissions)) {
        if (roleRecord.permissions.includes('*') || roleRecord.permissions.includes(targetPermission)) {
            return true;
        }

        // Handle namespace wildcard like 'users:*'
        const parts = targetPermission.split(':');
        if (parts.length > 1) {
            const wildcardNamespace = `${parts[0]}:*`;
            if (roleRecord.permissions.includes(wildcardNamespace)) {
                return true;
            }
        }
    }

    return false;
}

