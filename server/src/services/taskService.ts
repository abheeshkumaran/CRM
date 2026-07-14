import prisma from '../config/prisma';


export class TaskService {
    static async createTask(data: {
        subject: string;
        description?: string;
        status?: any; // TaskStatus
        priority?: any; // TaskPriority
        dueDate?: Date;
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
            organisation: { connect: { id: organisationId } },
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

}
