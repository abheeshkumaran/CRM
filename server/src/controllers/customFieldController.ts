import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../config/prisma';


/**
 * Get all custom fields for an entity type
 * GET /api/custom-fields?entityType=Lead
 */
export const getCustomFields = async (req: AuthRequest, res: Response) => {
    try {
        const { entityType } = req.query;
        const organisationId = req.user?.organisationId;

        if (!organisationId) {
            return res.status(400).json({ message: 'Organisation ID is required' });
        }

        const where: any = {
            organisationId,
            isDeleted: false
        };

        if (entityType) {
            where.entityType = entityType as string;
        }

        const customFields = await prisma.customField.findMany({
            where,
            orderBy: [
                { order: 'asc' },
                { createdAt: 'asc' }
            ],
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

        res.json(customFields);
    } catch (error: any) {
        console.error('Error fetching custom fields:', error);
        res.status(500).json({ message: 'Failed to fetch custom fields', error: error.message });
    }
};

/**
 * Create a new custom field
 * POST /api/custom-fields
 */
export const createCustomField = async (req: AuthRequest, res: Response) => {
    try {
        const {
            name,
            label,
            entityType,
            fieldType,
            options,
            isRequired,
            defaultValue,
            placeholder,
            order,
            isActive,
            showInList,
            showInForm
        } = req.body;

        const organisationId = req.user?.organisationId;
        const createdById = req.user?.id;

        if (!organisationId || !createdById) {
            return res.status(400).json({ message: 'Organisation ID and User ID are required' });
        }

        // Validate required fields
        if (!name || !label || !entityType || !fieldType) {
            return res.status(400).json({ 
                message: 'Name, label, entityType, and fieldType are required' 
            });
        }

        // Validate field name format
        const fieldNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
        if (!fieldNameRegex.test(name)) {
            return res.status(400).json({ 
                message: 'Field name must start with a letter or underscore and contain only letters, numbers, and underscores' 
            });
        }

        // Check for reserved field names
        const reservedNames = [
            'id', 'createdAt', 'updatedAt', 'organisationId', 'createdById',
            'isDeleted', 'deletedAt', 'customFields'
        ];
        if (reservedNames.includes(name)) {
            return res.status(400).json({ 
                message: `Field name '${name}' is reserved and cannot be used` 
            });
        }

        // Validate field type
        const validFieldTypes = [
            'text', 'textarea', 'number', 'date', 'select', 'multiselect',
            'boolean', 'email', 'phone', 'url'
        ];
        if (!validFieldTypes.includes(fieldType)) {
            return res.status(400).json({ 
                message: `Invalid field type. Must be one of: ${validFieldTypes.join(', ')}` 
            });
        }

        // Validate entity type
        const validEntityTypes = ['Lead', 'Contact', 'Account', 'Opportunity'];
        if (!validEntityTypes.includes(entityType)) {
            return res.status(400).json({ 
                message: `Invalid entity type. Must be one of: ${validEntityTypes.join(', ')}` 
            });
        }

        // Validate options for select/multiselect
        if ((fieldType === 'select' || fieldType === 'multiselect') && (!options || options.length === 0)) {
            return res.status(400).json({ 
                message: 'Options are required for select and multiselect field types' 
            });
        }

        // Check if field name already exists for this entity type and organization
        const existingField = await prisma.customField.findFirst({
            where: {
                name,
                entityType,
                organisationId,
                isDeleted: false
            }
        });

        if (existingField) {
            return res.status(400).json({ 
                message: `A field with name '${name}' already exists for ${entityType}` 
            });
        }

        // Create the custom field
        const customField = await prisma.customField.create({
            data: {
                name,
                label,
                entityType,
                fieldType,
                options: options || [],
                isRequired: isRequired || false,
                defaultValue,
                placeholder,
                order: order || 0,
                isActive: isActive !== undefined ? isActive : true,
                showInList: showInList || false,
                showInForm: showInForm !== undefined ? showInForm : true,
                organisationId,
                createdById
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

        res.status(201).json(customField);
    } catch (error: any) {
        console.error('Error creating custom field:', error);
        res.status(500).json({ message: 'Failed to create custom field', error: error.message });
    }
};

/**
 * Update a custom field
 * PUT /api/custom-fields/:id
 */
export const updateCustomField = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const {
            label,
            options,
            isRequired,
            defaultValue,
            placeholder,
            order,
            isActive,
            showInList,
            showInForm
        } = req.body;

        const organisationId = req.user?.organisationId;

        if (!organisationId) {
            return res.status(400).json({ message: 'Organisation ID is required' });
        }

        // Check if field exists and belongs to the organization
        const existingField = await prisma.customField.findFirst({
            where: {
                id,
                organisationId,
                isDeleted: false
            }
        });

        if (!existingField) {
            return res.status(404).json({ message: 'Custom field not found' });
        }

        // Validate options for select/multiselect if provided
        if (options && (existingField.fieldType === 'select' || existingField.fieldType === 'multiselect')) {
            if (options.length === 0) {
                return res.status(400).json({ 
                    message: 'Options cannot be empty for select and multiselect field types' 
                });
            }
        }

        // Update the custom field
        const updatedField = await prisma.customField.update({
            where: { id },
            data: {
                ...(label && { label }),
                ...(options && { options }),
                ...(isRequired !== undefined && { isRequired }),
                ...(defaultValue !== undefined && { defaultValue }),
                ...(placeholder !== undefined && { placeholder }),
                ...(order !== undefined && { order }),
                ...(isActive !== undefined && { isActive }),
                ...(showInList !== undefined && { showInList }),
                ...(showInForm !== undefined && { showInForm })
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

        res.json(updatedField);
    } catch (error: any) {
        console.error('Error updating custom field:', error);
        res.status(500).json({ message: 'Failed to update custom field', error: error.message });
    }
};

/**
 * Delete a custom field (soft delete)
 * DELETE /api/custom-fields/:id
 */
export const deleteCustomField = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const organisationId = req.user?.organisationId;

        if (!organisationId) {
            return res.status(400).json({ message: 'Organisation ID is required' });
        }

        // Check if field exists and belongs to the organization
        const existingField = await prisma.customField.findFirst({
            where: {
                id,
                organisationId,
                isDeleted: false
            }
        });

        if (!existingField) {
            return res.status(404).json({ message: 'Custom field not found' });
        }

        // Soft delete the custom field
        await prisma.customField.update({
            where: { id },
            data: {
                isDeleted: true,
                isActive: false
            }
        });

        res.json({ message: 'Custom field deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting custom field:', error);
        res.status(500).json({ message: 'Failed to delete custom field', error: error.message });
    }
};
