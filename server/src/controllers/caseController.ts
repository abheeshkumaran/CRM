import { Request, Response } from 'express';
import { getSubordinateIds, getOrgId, getVisibleUserIds } from '../utils/hierarchyUtils';
import { logAudit } from '../utils/auditLogger';
import prisma from '../config/prisma';


export const getCases = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string || '1');
        const limit = parseInt(req.query.limit as string || '20');
        const search = req.query.search as string;
        const status = req.query.status as string;
        const skip = (page - 1) * limit;
        const user = (req as any).user;
        const orgId = getOrgId(user);

        if (!orgId) return res.status(400).json({ message: 'Organisation not found' });

        const where: any = {
            organisationId: orgId,
            isDeleted: false
        };

        // 1. Hierarchy Visibility
        if (user.role !== 'super_admin' && user.role !== 'admin') {
            const visibleUserIds = await getVisibleUserIds(user.id);
            // Show cases assigned to self OR visible subordinates/branches, AND cases created by the user
            where.OR = [
                { assignedToId: { in: visibleUserIds } },
                { createdById: user.id }
            ];
        }

        if (search) {
            where.OR = [
                { subject: { contains: search, mode: 'insensitive' } },
                { caseNumber: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (status && status !== 'all') {
            where.status = status;
        }

        const cases = await prisma.case.findMany({
            where,
            include: {
                contact: { select: { firstName: true, lastName: true, email: true } },
                account: { select: { name: true } },
                assignedTo: { select: { firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        });

        const total = await prisma.case.count({ where });

        res.json({
            cases,
            page,
            totalPages: Math.ceil(total / limit),
            totalCases: total
        });
    } catch (error) {
        console.error('getCases Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

export const createCase = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);

        if (!orgId) return res.status(400).json({ message: 'Organisation not found' });

        // Generate case number
        const count = await prisma.case.count({ where: { organisationId: orgId } });
        const caseNumber = `CASE-${String(count + 1).padStart(5, '0')}`;

        // Get user's direct manager for automatic assignment
        const currentUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                reportsToId: true,
                reportsTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        reportsToId: true
                    }
                }
            }
        });

        // Assign to direct manager if exists, otherwise leave unassigned
        const assignedToId = req.body.assignedTo || req.body.assignedToId || currentUser?.reportsToId || undefined;

        const newCase = await prisma.case.create({
            data: {
                ...req.body,
                caseNumber,
                organisationId: orgId,
                createdById: user.id,
                contactId: req.body.contact || req.body.contactId || undefined,
                accountId: req.body.account || req.body.accountId || undefined,
                assignedToId
            },
            include: {
                createdBy: {
                    select: { firstName: true, lastName: true }
                }
            }
        });

        // Create notification for direct manager
        if (assignedToId) {
            await prisma.notification.create({
                data: {
                    title: 'New Support Case Assigned',
                    message: `${currentUser?.firstName} ${currentUser?.lastName} created a new support case: ${newCase.subject}`,
                    type: 'info',
                    relatedResource: 'case',
                    relatedId: newCase.id,
                    recipientId: assignedToId,
                    organisationId: orgId
                }
            });
        }

        // Notify all managers up the hierarchy chain
        const managersToNotify: string[] = [];
        let currentManagerId = currentUser?.reportsTo?.reportsToId; // Start from manager's manager

        while (currentManagerId) {
            managersToNotify.push(currentManagerId);
            const manager = await prisma.user.findUnique({
                where: { id: currentManagerId },
                select: { reportsToId: true }
            });
            currentManagerId = manager?.reportsToId || null;
        }

        // Create notifications for all managers in the chain
        if (managersToNotify.length > 0) {
            await prisma.notification.createMany({
                data: managersToNotify.map(managerId => ({
                    title: 'New Support Case Created',
                    message: `${currentUser?.firstName} ${currentUser?.lastName} created a support case: ${newCase.subject} (Priority: ${newCase.priority})`,
                    type: 'info',
                    relatedResource: 'case',
                    relatedId: newCase.id,
                    recipientId: managerId,
                    organisationId: orgId
                }))
            });
        }

        await logAudit({
            organisationId: orgId,
            actorId: user.id,
            action: 'CREATE_CASE',
            entity: 'Case',
            entityId: newCase.id,
            details: { caseNumber: newCase.caseNumber, assignedTo: assignedToId }
        });

        res.status(201).json(newCase);
    } catch (error) {
        console.error('createCase Error:', error);
        res.status(400).json({ message: (error as Error).message });
    }
};

export const getCaseById = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'Organisation not found' });

        const supportCase = await prisma.case.findFirst({
            where: {
                id: req.params.id,
                organisationId: orgId,
                isDeleted: false
            },
            include: {
                contact: true,
                account: true,
                assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } }
            }
        });

        if (!supportCase) {
            return res.status(404).json({ message: 'Case not found' });
        }

        // Hierarchy check
        if (user.role !== 'super_admin' && user.role !== 'admin' && supportCase.assignedToId !== user.id && supportCase.createdById !== user.id) {
            const visibleUserIds = await getVisibleUserIds(user.id);
            if (!visibleUserIds.includes(supportCase.assignedToId || '')) {
                return res.status(403).json({ message: 'Not authorized to view this case' });
            }
        }

        res.json(supportCase);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const updateCase = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };

        // Handle relation updates if passed as objects or IDs
        if (updates.contact) updates.contactId = updates.contact;
        if (updates.account) updates.accountId = updates.account;
        if (updates.assignedTo) updates.assignedToId = updates.assignedTo;

        delete updates.contact; // Clean up
        delete updates.account;
        delete updates.assignedTo;

        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'Organisation not found' });

        // Get the old case data to check for changes
        const oldCase = await prisma.case.findUnique({
            where: { id },
            select: {
                status: true,
                assignedToId: true,
                subject: true,
                priority: true
            }
        });

        const supportCase = await prisma.case.update({
            where: {
                id,
                organisationId: orgId
            },
            data: updates
        });

        // Send notification if assignee changed
        if (updates.assignedToId && updates.assignedToId !== oldCase?.assignedToId) {
            await prisma.notification.create({
                data: {
                    title: 'Support Case Assigned to You',
                    message: `A support case has been assigned to you: ${oldCase?.subject}`,
                    type: 'info',
                    relatedResource: 'case',
                    relatedId: supportCase.id,
                    recipientId: updates.assignedToId,
                    organisationId: orgId
                }
            });
        }

        // Send notification if status changed to resolved
        if (updates.status === 'resolved' && oldCase?.status !== 'resolved') {
            // Notify the case creator
            const caseWithCreator = await prisma.case.findUnique({
                where: { id },
                select: { createdById: true }
            });

            if (caseWithCreator?.createdById) {
                await prisma.notification.create({
                    data: {
                        title: 'Support Case Resolved',
                        message: `Your support case has been resolved: ${oldCase?.subject}`,
                        type: 'success',
                        relatedResource: 'case',
                        relatedId: supportCase.id,
                        recipientId: caseWithCreator.createdById,
                        organisationId: orgId
                    }
                });
            }
        }

        await logAudit({
            organisationId: orgId,
            actorId: user.id,
            action: 'UPDATE_CASE',
            entity: 'Case',
            entityId: supportCase.id,
            details: { updatedFields: Object.keys(updates) }
        });

        res.json(supportCase);
    } catch (error) {
        // P2025: Record not found
        if ((error as any).code === 'P2025') return res.status(404).json({ message: 'Case not found' });
        res.status(500).json({ message: (error as Error).message });
    }
};

export const deleteCase = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'Organisation not found' });

        await prisma.case.update({
            where: {
                id: req.params.id,
                organisationId: orgId
            },
            data: { isDeleted: true, deletedAt: new Date() }
        });

        await logAudit({
            organisationId: orgId,
            actorId: user.id,
            action: 'DELETE_CASE',
            entity: 'Case',
            entityId: req.params.id
        });

        res.json({ message: 'Case deleted' });
    } catch (error) {
        if ((error as any).code === 'P2025') return res.status(404).json({ message: 'Case not found' });
        res.status(500).json({ message: (error as Error).message });
    }
};
