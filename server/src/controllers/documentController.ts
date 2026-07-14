import { Request, Response } from 'express';
import { getOrgId } from '../utils/hierarchyUtils';
import prisma from '../config/prisma';


/**
 * Get all documents for the organization
 * GET /api/documents
 */
export const getDocuments = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);

        const { leadId, contactId, accountId, opportunityId, category, search } = req.query;

        const where: any = {
            organisationId: orgId || user.organisationId,
            isDeleted: false
        };

        if (leadId) where.leadId = leadId as string;
        if (contactId) where.contactId = contactId as string;
        if (accountId) where.accountId = accountId as string;
        if (opportunityId) where.opportunityId = opportunityId as string;
        if (category) where.category = category as string;
        if (search) {
            where.OR = [
                { name: { contains: search as string, mode: 'insensitive' } },
                { description: { contains: search as string, mode: 'insensitive' } }
            ];
        }

        const documents = await prisma.document.findMany({
            where,
            include: {
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                lead: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        company: true
                    }
                },
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                account: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                opportunity: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            documents,
            total: documents.length
        });
    } catch (error) {
        console.error('[Get Documents] Error:', error);
        res.status(500).json({ message: 'Failed to fetch documents: ' + (error as Error).message });
    }
};

/**
 * Get a single document by ID
 * GET /api/documents/:id
 */
export const getDocumentById = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const { id } = req.params;

        const document = await prisma.document.findFirst({
            where: {
                id,
                organisationId: orgId || user.organisationId,
                isDeleted: false
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                lead: true,
                contact: true,
                account: true,
                opportunity: true
            }
        });

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        res.json(document);
    } catch (error) {
        console.error('[Get Document] Error:', error);
        res.status(500).json({ message: 'Failed to fetch document: ' + (error as Error).message });
    }
};

/**
 * Update document metadata
 * PUT /api/documents/:id
 */
export const updateDocument = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const { id } = req.params;
        const { name, description, category, tags, leadId, contactId, accountId, opportunityId } = req.body;

        // Check if document exists and belongs to org
        const existingDoc = await prisma.document.findFirst({
            where: {
                id,
                organisationId: orgId || user.organisationId,
                isDeleted: false
            }
        });

        if (!existingDoc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Authorization check: Admin or Creator
        const isOrgAdmin = user.role === 'organisation_admin' || user.role === 'admin';
        const isCreator = existingDoc.createdById === user.id;

        if (!isOrgAdmin && !isCreator) {
            return res.status(403).json({ message: 'You do not have permission to update this document' });
        }

        const document = await prisma.document.update({
            where: { id },
            data: {
                name: name || existingDoc.name,
                description: description !== undefined ? description : existingDoc.description,
                category: category || existingDoc.category,
                tags: tags || existingDoc.tags,
                leadId: leadId !== undefined ? leadId : existingDoc.leadId,
                contactId: contactId !== undefined ? contactId : existingDoc.contactId,
                accountId: accountId !== undefined ? accountId : existingDoc.accountId,
                opportunityId: opportunityId !== undefined ? opportunityId : existingDoc.opportunityId
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });

        res.json({
            message: 'Document updated successfully',
            document
        });
    } catch (error) {
        console.error('[Update Document] Error:', error);
        res.status(500).json({ message: 'Failed to update document: ' + (error as Error).message });
    }
};

/**
 * Delete document (soft delete)
 * DELETE /api/documents/:id
 */
export const deleteDocument = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const { id } = req.params;

        // Check if document exists and belongs to org
        const existingDoc = await prisma.document.findFirst({
            where: {
                id,
                organisationId: orgId || user.organisationId,
                isDeleted: false
            }
        });

        if (!existingDoc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Authorization check: Admin or Creator
        const isOrgAdmin = user.role === 'organisation_admin' || user.role === 'admin';
        const isCreator = existingDoc.createdById === user.id;

        if (!isOrgAdmin && !isCreator) {
            return res.status(403).json({ message: 'You do not have permission to delete this document' });
        }

        // Soft delete
        await prisma.document.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });

        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('[Delete Document] Error:', error);
        res.status(500).json({ message: 'Failed to delete document: ' + (error as Error).message });
    }
};

/**
 * Download document file from database
 * GET /api/documents/:id/download
 */
export const downloadDocument = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const document = await prisma.document.findFirst({
            where: {
                id,
                isDeleted: false
            },
            select: {
                fileData: true,
                fileType: true,
                name: true,
                fileKey: true
            }
        });

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        if (!document.fileData) {
            return res.status(404).json({ message: 'File data not available' });
        }

        // Set appropriate headers
        res.setHeader('Content-Type', document.fileType);
        res.setHeader('Content-Disposition', `inline; filename="${document.fileKey}"`);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        
        // Send binary data
        res.send(document.fileData);
    } catch (error) {
        console.error('[Download Document] Error:', error);
        res.status(500).json({ message: 'Failed to download document: ' + (error as Error).message });
    }
};
