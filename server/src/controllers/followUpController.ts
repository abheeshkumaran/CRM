import { Request, Response } from 'express';
import { getOrgId, getVisibleUserIds, getAncestorIds } from '../utils/hierarchyUtils';
import { FollowUpService } from '../services/followUpService';
import { logAudit } from '../utils/auditLogger';
import prisma from '../config/prisma';
import { isAdmin } from '../utils/roleUtils';
// GET /api/follow-ups - Get all follow-up tasks for user and subordinates
export const getFollowUps = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string || '1');
        const limit = parseInt(req.query.limit as string || '20');
        const search = req.query.search as string;
        const status = req.query.status as string;
        const skip = (page - 1) * limit;
        const user = (req as any).user;

        console.log('[getFollowUps] User:', user.id, user.role, user.email);

        const where: any = {
            isDeleted: false
        };

        // 1. Organisation Scoping
        if (user.role === 'super_admin') {
            if (req.query.organisationId) {
                where.organisationId = String(req.query.organisationId);
            }
        } else {
            const orgId = getOrgId(user);
            console.log('[getFollowUps] Org ID:', orgId);
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

        // 2. Hierarchy Visibility - Show follow-ups if:
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
                { description: { contains: search, mode: 'insensitive' } },
                { lead: { firstName: { contains: search, mode: 'insensitive' } } },
                { lead: { lastName: { contains: search, mode: 'insensitive' } } },
                { lead: { company: { contains: search, mode: 'insensitive' } } },
                { contact: { firstName: { contains: search, mode: 'insensitive' } } },
                { contact: { lastName: { contains: search, mode: 'insensitive' } } },
                { account: { name: { contains: search, mode: 'insensitive' } } },
                { opportunity: { name: { contains: search, mode: 'insensitive' } } },
                { assignedTo: { firstName: { contains: search, mode: 'insensitive' } } },
                { assignedTo: { lastName: { contains: search, mode: 'insensitive' } } }
            ];

            if (!where.AND) where.AND = [];
            (where.AND as any[]).push({ OR: searchConditions });
        }

        if (status) {
            if (status !== 'all') {
                where.status = status as any;
            }
            // If status is 'all', we omit where.status to return all statuses (active, completed, deferred)
        } else {
            where.status = { in: ['not_started', 'in_progress'] };
        }
        
        const branchId = req.query.branchId as string;
        if (branchId && branchId !== 'all') {
            if (!where.AND) where.AND = [];
            (where.AND as any[]).push({
                OR: [
                    { branchId: branchId },
                    { lead: { branchId: branchId } },
                    { opportunity: { branchId: branchId } },
                    { contact: { branchId: branchId } },
                    { account: { branchId: branchId } }
                ]
            });
        }

        const userId = req.query.userId as string;
        if (userId && userId !== 'all') {
            where.assignedToId = userId;
        }

        console.log('[getFollowUps] Final query where:', JSON.stringify(where, null, 2));

        const count = await prisma.task.count({ where });
        console.log('[getFollowUps] Count:', count);

        const followUps = await prisma.task.findMany({
            where,
            include: {
                assignedTo: { select: { firstName: true, lastName: true, email: true } },
                createdBy: { select: { firstName: true, lastName: true, email: true } },
                lead: {
                    where: { isDeleted: false },
                    select: { id: true, firstName: true, lastName: true, company: true }
                },
                contact: { select: { id: true, firstName: true, lastName: true } },
                account: { select: { id: true, name: true } },
                opportunity: { select: { id: true, name: true } },
                branch: { select: { id: true, name: true } },
            },
            skip,
            take: limit,
            orderBy: { dueDate: 'asc' }
        });

        console.log('[getFollowUps] Follow-ups found:', followUps.length);

        // Transform follow-ups to include relatedTo for Frontend compatibility
        const transformedFollowUps = followUps.map(followUp => {
            let relatedTo = null;
            let onModel = null;

            if (followUp.lead) { relatedTo = followUp.lead; onModel = 'Lead'; }
            else if (followUp.contact) { relatedTo = followUp.contact; onModel = 'Contact'; }
            else if (followUp.account) { relatedTo = followUp.account; onModel = 'Account'; }
            else if (followUp.opportunity) { relatedTo = followUp.opportunity; onModel = 'Opportunity'; }

            return {
                ...followUp,
                relatedTo,
                onModel
            };
        });

        const baseWhere = { ...where };
        delete baseWhere.status;

        const now = new Date();
        const endOfToday = (() => {
            const istTime = now.getTime() + (5.5 * 60 * 60 * 1000);
            const istDate = new Date(istTime);
            const endOfTodayIST = new Date(Date.UTC(
                istDate.getUTCFullYear(),
                istDate.getUTCMonth(),
                istDate.getUTCDate(),
                23, 59, 59, 999
            ));
            return new Date(endOfTodayIST.getTime() - (5.5 * 60 * 60 * 1000));
        })();

        const startOfToday = (() => {
            const istTime = now.getTime() + (5.5 * 60 * 60 * 1000);
            const istDate = new Date(istTime);
            const startOfTodayIST = new Date(Date.UTC(
                istDate.getUTCFullYear(),
                istDate.getUTCMonth(),
                istDate.getUTCDate(),
                0, 0, 0, 0
            ));
            return new Date(startOfTodayIST.getTime() - (5.5 * 60 * 60 * 1000));
        })();

        const [activeCount, overdueCount, todayCount, upcomingCount] = await Promise.all([
            prisma.task.count({
                where: {
                    ...baseWhere,
                    status: { in: ['not_started', 'in_progress'] }
                }
            }),
            prisma.task.count({
                where: {
                    ...baseWhere,
                    status: { in: ['not_started', 'in_progress'] },
                    dueDate: { lt: startOfToday }
                }
            }),
            prisma.task.count({
                where: {
                    ...baseWhere,
                    status: { in: ['not_started', 'in_progress'] },
                    dueDate: { gte: startOfToday, lte: endOfToday }
                }
            }),
            prisma.task.count({
                where: {
                    ...baseWhere,
                    status: { in: ['not_started', 'in_progress'] },
                    dueDate: { gt: endOfToday }
                }
            })
        ]);

        res.json({
            tasks: transformedFollowUps, // Keep 'tasks' key for backward compat with frontend if needed, or change to 'followUps'
            page,
            totalPages: Math.ceil(count / limit),
            totalTasks: count,
            counts: {
                active: activeCount,
                overdue: overdueCount,
                today: todayCount,
                upcoming: upcomingCount
            }
        });
    } catch (error) {
        console.error('[getFollowUps] Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// POST /api/follow-ups - Create a new follow-up
export const createFollowUp = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const { subject, description, priority, dueDate, relatedTo, onModel, assignedToId } = req.body;

        if (!dueDate) {
            return res.status(400).json({ message: 'Due date is required for follow-ups' });
        }

        const data: any = {
            subject,
            description,
            priority: priority || 'medium',
            status: 'not_started',
            dueDate: new Date(dueDate),
            organisationId: orgId,
            createdById: user.id,
            assignedToId: assignedToId || user.id,
            branchId: user.branchId
        };

        if (relatedTo && onModel) {
            if (onModel === 'Lead') data.leadId = relatedTo;
            else if (onModel === 'Contact') data.contactId = relatedTo;
            else if (onModel === 'Account') data.accountId = relatedTo;
            else if (onModel === 'Opportunity') data.opportunityId = relatedTo;
        }

        const followUp = await FollowUpService.createFollowUp(data);

        // Sync Lead follow-up date
        if (data.leadId) {
            await FollowUpService.syncLeadFollowUp(data.leadId);
        }

        if (orgId) {
            await logAudit({
                organisationId: orgId,
                actorId: user.id,
                action: 'CREATE_FOLLOW_UP',
                entity: 'FollowUp',
                entityId: followUp.id,
                details: { subject: followUp.subject }
            });
        }

        res.status(201).json(followUp);
    } catch (error) {
        console.error('[createFollowUp] Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// PUT /api/follow-ups/:id - Update a follow-up
export const updateFollowUp = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const { status, dueDate, subject, description, priority, assignedToId } = req.body;

        const followUp = await prisma.task.findUnique({
            where: { id },
            include: { 
                createdBy: true, 
                assignedTo: true,
                lead: true,
                contact: true,
                account: true,
                opportunity: true
            }
        });

        if (!followUp) {
            return res.status(404).json({ message: 'Follow-up not found' });
        }

        const isCreator = followUp.createdById === user.id;
        const isAssignee = followUp.assignedToId === user.id;
        const isAdmin = user.role === 'admin' || user.role === 'super_admin';

        let isAuthorized = isCreator || isAssignee || isAdmin;

        if (!isAuthorized) {
            // Check hierarchy and related entity ownership
            const visibleUserIds = await getVisibleUserIds(user.id);
            
            const isCreatedBySubordinate = followUp.createdById ? visibleUserIds.includes(followUp.createdById) : false;
            const isAssignedToSubordinate = followUp.assignedToId ? visibleUserIds.includes(followUp.assignedToId) : false;
            
            const isLeadOwner = followUp.lead?.assignedToId ? visibleUserIds.includes(followUp.lead.assignedToId) : false;
            const isContactOwner = (followUp.contact as any)?.ownerId ? visibleUserIds.includes((followUp.contact as any).ownerId) : false;
            const isAccountOwner = (followUp.account as any)?.ownerId ? visibleUserIds.includes((followUp.account as any).ownerId) : false;
            const isOpportunityOwner = (followUp.opportunity as any)?.ownerId ? visibleUserIds.includes((followUp.opportunity as any).ownerId) : false;

            if (isCreatedBySubordinate || isAssignedToSubordinate || isLeadOwner || isContactOwner || isAccountOwner || isOpportunityOwner) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Not authorized to update this follow-up' });
        }

        const updatedFollowUp = await prisma.task.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(dueDate && { dueDate: new Date(dueDate) }),
                ...(subject && { subject }),
                ...(description !== undefined && { description }),
                ...(priority && { priority }),
                ...(assignedToId !== undefined && { assignedToId })
            },
            include: {
                assignedTo: { select: { firstName: true, lastName: true, email: true } },
                createdBy: { select: { firstName: true, lastName: true, email: true } },
                lead: {
                    where: { isDeleted: false },
                    select: { id: true, firstName: true, lastName: true, company: true }
                },
                contact: { select: { id: true, firstName: true, lastName: true } },
                account: { select: { id: true, name: true } },
                opportunity: { select: { id: true, name: true } },
            }
        });

        // Sync Lead follow-up date
        if (updatedFollowUp.leadId) {
            await FollowUpService.syncLeadFollowUp(updatedFollowUp.leadId);
        }

        // Transform response
        let relatedTo = null;
        let onModel = null;

        if (updatedFollowUp.lead) { relatedTo = updatedFollowUp.lead; onModel = 'Lead'; }
        else if (updatedFollowUp.contact) { relatedTo = updatedFollowUp.contact; onModel = 'Contact'; }
        else if (updatedFollowUp.account) { relatedTo = updatedFollowUp.account; onModel = 'Account'; }
        else if (updatedFollowUp.opportunity) { relatedTo = updatedFollowUp.opportunity; onModel = 'Opportunity'; }

        res.json({
            ...updatedFollowUp,
            relatedTo,
            onModel
        });
    } catch (error) {
        console.error('[updateFollowUp] Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};
