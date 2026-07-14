import prisma from '../config/prisma';


export class FollowUpService {
    static async createFollowUp(data: {
        subject: string;
        description?: string;
        status?: any; // FollowUpStatus
        priority?: any; // FollowUpPriority
        dueDate: Date;
        organisationId: string;
        createdById?: string;
        leadId?: string;
        contactId?: string;
        accountId?: string;
        opportunityId?: string;
        assignedToId?: string;
        branchId?: string;
    }) {
        const { organisationId, createdById, assignedToId, leadId, contactId, accountId, opportunityId, branchId, ...rest } = data;

        const createData: any = {
            ...rest,
            organisation: organisationId ? { connect: { id: organisationId } } : undefined,
        };

        if (createdById) createData.createdBy = { connect: { id: createdById } };
        if (assignedToId) createData.assignedTo = { connect: { id: assignedToId } };
        if (leadId) createData.lead = { connect: { id: leadId } };
        if (contactId) createData.contact = { connect: { id: contactId } };
        if (accountId) createData.account = { connect: { id: accountId } };
        if (opportunityId) createData.opportunity = { connect: { id: opportunityId } };
        if (branchId) createData.branch = { connect: { id: branchId } };

        return await prisma.task.create({
            data: createData
        });
    }

    static async syncLeadFollowUp(leadId: string) {
        if (!leadId) return;

        // Find the earliest upcoming follow-up that isn't completed
        const nextFollowUp = await prisma.task.findFirst({
            where: {
                leadId,
                isDeleted: false,
                status: { notIn: ['completed', 'deferred'] }
            },
            orderBy: {
                dueDate: 'asc'
            }
        });

        await prisma.lead.update({
            where: { id: leadId },
            data: {
                nextFollowUp: nextFollowUp ? nextFollowUp.dueDate : null
            }
        });
    }

    static async rescheduleOrCreateFollowUp(data: {
        subject: string;
        description?: string;
        status?: any;
        priority?: any;
        dueDate: Date;
        organisationId: string;
        createdById?: string;
        leadId: string;
        assignedToId?: string;
        branchId?: string | null;
    }) {
        const { leadId, branchId, organisationId, dueDate, ...rest } = data;

        let effectiveBranchId = branchId;
        if (!effectiveBranchId) {
            const lead = await prisma.lead.findUnique({
                where: { id: leadId },
                select: { branchId: true }
            });
            effectiveBranchId = lead?.branchId || null;
        }

        // Find existing non-terminal follow-up for this lead
        const existingFollowUp = await prisma.task.findFirst({
            where: {
                leadId,
                organisationId,
                isDeleted: false,
                status: { notIn: ['completed', 'deferred'] }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (existingFollowUp) {
            const updateData: any = {
                subject: rest.subject,
                description: rest.description,
                status: rest.status || existingFollowUp.status,
                priority: rest.priority || existingFollowUp.priority,
                dueDate: dueDate,
                branch: effectiveBranchId ? { connect: { id: effectiveBranchId } } : { disconnect: true }
            };

            if (rest.assignedToId) {
                updateData.assignedTo = { connect: { id: rest.assignedToId } };
            }

            return await prisma.task.update({
                where: { id: existingFollowUp.id },
                data: updateData
            });
        } else {
            return await this.createFollowUp({
                ...data,
                branchId: effectiveBranchId || undefined
            });
        }
    }

    static async rolloverFollowUpForLead(leadId: string, newDueDate: Date) {
        if (!leadId) return;

        // Find the earliest upcoming follow-up that isn't completed
        const overdueFollowUp = await prisma.task.findFirst({
            where: {
                leadId,
                isDeleted: false,
                status: { notIn: ['completed', 'deferred'] },
                dueDate: { lt: new Date() }
            },
            orderBy: {
                dueDate: 'asc'
            }
        });

        if (overdueFollowUp) {
            await prisma.task.update({
                where: { id: overdueFollowUp.id },
                data: {
                    dueDate: newDueDate
                }
            });
        }
    }
}
