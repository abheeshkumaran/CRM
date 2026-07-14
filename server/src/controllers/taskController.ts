import { Request, Response } from 'express';
import { getOrgId, getVisibleUserIds, getAncestorIds } from '../utils/hierarchyUtils';
import { logAudit } from '../utils/auditLogger';
import { TaskService } from '../services/taskService';
import prisma from '../config/prisma';
import { isAdmin } from '../utils/roleUtils';


// Helper to consolidate polymorphic 'relatedTo' for Frontend compatibility
const transformTask = (task: any) => {
    let relatedTo = null;
    let onModel = null;

    if (task.lead) { relatedTo = task.lead; onModel = 'Lead'; }
    else if (task.contact) { relatedTo = task.contact; onModel = 'Contact'; }
    else if (task.account) { relatedTo = task.account; onModel = 'Account'; }
    else if (task.opportunity) { relatedTo = task.opportunity; onModel = 'Opportunity'; }

    const transformed = {
        ...task,
        relatedTo,
        onModel
    };

    if (task.assignedTo) {
        transformed.assignedTo = {
            ...task.assignedTo,
            _id: task.assignedTo.id || task.assignedTo._id
        };
    }

    return transformed;
};

export const getTasks = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string || '1');
        const limit = parseInt(req.query.limit as string || '20');
        const search = req.query.search as string;
        const status = req.query.status as string;
        const skip = (page - 1) * limit;
        const user = (req as any).user;

        const where: any = { isDeleted: false };

        // 1. Organisation Scoping
        if (user.role === 'super_admin') {
            if (req.query.organisationId) {
                where.organisationId = String(req.query.organisationId);
            }
        } else {
            const orgId = getOrgId(user);
            if (!orgId) return res.status(403).json({ message: 'User has no organisation' });
            where.organisationId = orgId;
        }

        // Resolve custom roles if necessary to correctly identify admins
        let userWithResolvedRole = user;
        if (typeof user.role === 'string' && user.role.startsWith('custom_')) {
            const roleData = await prisma.role.findUnique({ where: { id: user.role } });
            if (roleData) {
                userWithResolvedRole = { ...user, role: roleData };
            }
        }

        // 2. Hierarchy Visibility - Show tasks if:
        // - Assigned to the logged-in user (override to only show assigned to == logged person unless admin)
        // - Or created by someone higher in the hierarchy (managers, super admins)
        if (!isAdmin(userWithResolvedRole)) {
            const ancestorIds = await getAncestorIds(user.id);
            
            // Delete assignedToId if it was set previously, we are using OR now
            delete where.assignedToId;

            where.OR = [
                { assignedToId: user.id },
                { createdById: { in: ancestorIds } }
            ];
        }

        if (search) {
            const searchConditions = [
                { subject: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];

            // Use AND to combine with other filters
            if (!where.AND) where.AND = [];
            (where.AND as any[]).push({ OR: searchConditions });
        }

        if (status && status !== 'all') {
            where.status = status as any;
        }

        const branchId = req.query.branchId as string;
        if (branchId && branchId !== 'all') {
            where.branchId = branchId;
        }

        const count = await prisma.task.count({ where });
        const tasks = await prisma.task.findMany({
            where,
            include: {
                assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
                branch: { select: { id: true, name: true } },
                // Include all potential relations to reconstruct 'relatedTo'
                // Filter out deleted leads
                lead: {
                    where: { isDeleted: false },
                    select: { id: true, firstName: true, lastName: true, company: true }
                },
                contact: { select: { id: true, firstName: true, lastName: true } },
                account: { select: { id: true, name: true } },
                opportunity: { select: { id: true, name: true } },
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        const transformedTasks = tasks.map(transformTask);

        res.json({
            tasks: transformedTasks,
            page,
            totalPages: Math.ceil(count / limit),
            totalTasks: count
        });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const createTask = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);

        // Allow super admins without organization
        if (!orgId && user.role !== 'super_admin') {
            return res.status(400).json({ message: 'User must belong to an organization to create tasks' });
        }

        const { relatedTo, onModel } = req.body;

        // Keep the exact time for dueDate (don't normalize to midnight)
        // This allows users to set specific follow-up times
        let dueDateISO: string | undefined = undefined;
        if (req.body.dueDate) {
            dueDateISO = new Date(req.body.dueDate).toISOString();
        }

        const data: any = {
            subject: req.body.subject,
            description: req.body.description,
            status: req.body.status || 'not_started',
            priority: req.body.priority || 'medium',
            dueDate: dueDateISO,

            createdBy: { connect: { id: user.id } },
        };

        // Only connect organization if user has one
        if (orgId) {
            data.organisation = { connect: { id: orgId } };
        }

        if (user.branchId) {
            data.branch = { connect: { id: user.branchId } };
        } else if (req.body.branchId) {
            data.branch = { connect: { id: req.body.branchId } };
        }

        if (req.body.assignedTo) {
            // Handle if string ID or object? Assuming string ID from frontend
            data.assignedTo = { connect: { id: req.body.assignedTo } };
        }

        // Polymorphic mapping
        if (relatedTo && onModel) {
            if (onModel === 'Lead') data.lead = { connect: { id: relatedTo } };
            else if (onModel === 'Contact') data.contact = { connect: { id: relatedTo } };
            else if (onModel === 'Account') data.account = { connect: { id: relatedTo } };
            else if (onModel === 'Opportunity') data.opportunity = { connect: { id: relatedTo } };
        }

        // Standard task creation
        const task = await prisma.task.create({
            data,
            include: {
                assignedTo: { select: { id: true, firstName: true, lastName: true } },
                lead: { select: { firstName: true, lastName: true } },
                contact: { select: { firstName: true, lastName: true } },
                account: { select: { name: true } },
                opportunity: { select: { name: true } }
            }
        });

        if (orgId) {
            await logAudit({
                organisationId: orgId,
                actorId: user.id,
                action: 'CREATE_TASK',
                entity: 'Task',
                entityId: task.id,
                details: { subject: task.subject }
            });
        }

        res.status(201).json(transformTask(task));
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const getTaskById = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);

        const where: any = { id: req.params.id, isDeleted: false };
        if (user.role !== 'super_admin') {
            if (!orgId) return res.status(403).json({ message: 'User has no organisation' });
            where.organisationId = orgId;
        }

        const task = await prisma.task.findFirst({
            where,
            include: {
                assignedTo: { select: { id: true, firstName: true, lastName: true } },
                lead: {
                    where: { isDeleted: false },
                    select: { id: true, firstName: true, lastName: true, company: true }
                },
                contact: { select: { id: true, firstName: true, lastName: true } },
                account: { select: { id: true, name: true } },
                opportunity: { select: { id: true, name: true } },
            }
        });

        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json(transformTask(task));
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const updateTask = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };

        // Keep the exact time for dueDate (don't normalize to midnight)
        // This allows users to set specific follow-up times
        if (updates.dueDate) {
            updates.dueDate = new Date(updates.dueDate).toISOString();
        }

        // Handle Relation Updates
        if (updates.assignedTo && typeof updates.assignedTo === 'string') {
            updates.assignedTo = { connect: { id: updates.assignedTo } };
        }

        // Handle Polymorphic updates (if changing relation)
        if (updates.relatedTo && updates.onModel) {
            // Reset others? Or just set new one? 
            // Prisma doesn't auto-disconnect others unless we explicitly set to null.
            // Ideally we should disconnect others if we are switching model type.
            updates.lead = undefined;
            updates.contact = undefined;
            updates.account = undefined;
            updates.opportunity = undefined;

            if (updates.onModel === 'Lead') updates.lead = { connect: { id: updates.relatedTo } };
            else if (updates.onModel === 'Contact') updates.contact = { connect: { id: updates.relatedTo } };
            else if (updates.onModel === 'Account') updates.account = { connect: { id: updates.relatedTo } };
            else if (updates.onModel === 'Opportunity') updates.opportunity = { connect: { id: updates.relatedTo } };

            delete updates.relatedTo;
            delete updates.onModel;
        }

        const requester = (req as any).user;
        const whereObj: any = { id };
        if (requester.role !== 'super_admin') {
            const orgId = getOrgId(requester);
            if (!orgId) return res.status(403).json({ message: 'No org' });
            whereObj.organisationId = orgId;
        }

        const task = await prisma.task.update({
            where: whereObj,
            data: updates,
            include: {
                assignedTo: { select: { id: true, firstName: true, lastName: true } },
                lead: { select: { id: true, firstName: true, lastName: true } },
                contact: { select: { id: true, firstName: true, lastName: true } },
                account: { select: { id: true, name: true } },
                opportunity: { select: { id: true, name: true } },
            }
        });

        await logAudit({
            organisationId: requester.organisationId || getOrgId(requester),
            actorId: requester.id,
            action: 'UPDATE_TASK',
            entity: 'Task',
            entityId: task.id,
            details: { updatedFields: Object.keys(updates) }
        });

        res.json(transformTask(task));
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const deleteTask = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);

        const where: any = { id: req.params.id };
        if (user.role !== 'super_admin') {
            if (!orgId) return res.status(403).json({ message: 'User has no organisation' });
            where.organisationId = orgId;
        }

        await prisma.task.update({
            where,
            data: { isDeleted: true, deletedAt: new Date() }
        });

        await logAudit({
            organisationId: (orgId || getOrgId(user)) as string,
            actorId: user.id,
            action: 'DELETE_TASK',
            entity: 'Task',
            entityId: req.params.id
        });

        res.json({ message: 'Task deleted' });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};
