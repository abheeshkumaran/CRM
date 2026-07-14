import { logger } from '../utils/logger';
import prisma from '../config/prisma';


export class DocumentService {
    /**
     * Create a document record and link it to an entity
     */
    static async createDocument(data: {
        name: string;
        fileKey: string;
        fileUrl: string;
        fileType: string;
        fileSize: number;
        organisationId: string;
        createdById: string;
        leadId?: string;
        contactId?: string;
        accountId?: string;
        opportunityId?: string;
        tags?: string[];
        category?: string;
    }) {
        try {
            const { organisationId, createdById, leadId, contactId, accountId, opportunityId, ...rest } = data;

            const document = await prisma.document.create({
                data: {
                    ...rest,
                    organisation: { connect: { id: organisationId } },
                    createdBy: { connect: { id: createdById } },
                    ...(leadId && { lead: { connect: { id: leadId } } }),
                    ...(contactId && { contact: { connect: { id: contactId } } }),
                    ...(accountId && { account: { connect: { id: accountId } } }),
                    ...(opportunityId && { opportunity: { connect: { id: opportunityId } } })
                }
            });

            // Log Interaction
            await prisma.interaction.create({
                data: {
                    organisationId,
                    type: 'other',
                    subject: 'Document Uploaded',
                    description: `File "${data.name}" uploaded.`,
                    direction: 'inbound',
                    leadId: leadId || undefined,
                    contactId: contactId || undefined,
                    createdById: createdById || undefined
                }
            });

            return document;
        } catch (error) {
            logger.error('DocumentService.createDocument Error:', error);
            throw error;
        }
    }

    /**
     * Get documents for an entity
     */
    static async getEntityDocuments(entityType: 'lead' | 'contact' | 'account' | 'opportunity', entityId: string, orgId: string) {
        try {
            const where: any = {
                organisationId: orgId,
                isDeleted: false,
                [`${entityType}Id`]: entityId
            };

            return await prisma.document.findMany({
                where,
                orderBy: { createdAt: 'desc' }
            });
        } catch (error) {
            logger.error('DocumentService.getEntityDocuments Error:', error);
            throw error;
        }
    }

    /**
     * Soft delete a document
     */
    static async deleteDocument(documentId: string, orgId: string) {
        try {
            return await prisma.document.update({
                where: { id: documentId, organisationId: orgId },
                data: { isDeleted: true }
            });
        } catch (error) {
            logger.error('DocumentService.deleteDocument Error:', error);
            throw error;
        }
    }
}
