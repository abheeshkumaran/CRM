import express from 'express';
import { emitToOrg } from '../socket';
import { getOrgId, getSubordinateIds, getVisibleUserIds } from '../utils/hierarchyUtils';
import { DistributionService } from '../services/distributionService';
import { WorkflowEngine } from '../services/workflowEngine';
import { NotificationService } from '../services/notificationService';
import { isAdmin, isSuperAdmin, isOrgAdmin, isManager } from '../utils/roleUtils';
import { GeoLocationService } from '../services/geoLocationService';
import { FollowUpService } from '../services/followUpService';
import { TaskService } from '../services/taskService';
import { GallaboxService } from '../services/gallaboxService';
import DuplicateLeadService from '../services/duplicateLeadService';
import prisma from '../config/prisma';
import { LeadSource } from '../generated/client';
// Dynamic import used for OpenAI to avoid startup errors if missing



// GET /api/leads
export const getLeads = async (req: express.Request, res: express.Response) => {
    try {
        console.log('[getLeads] Query Params:', req.query); // DEBUG LOG

        const pageSize = Number(req.query.pageSize) || 10;
        const page = Number(req.query.page) || 1;
        const user = (req as any).user;
        const where: any = { isDeleted: false };
        const andConditions: any[] = [];

        console.log('[getLeads] User:', user.id, user.role); // DEBUG LOG

        // 1. Organisation Scoping
        if (user.isSuperAdmin || isSuperAdmin(user)) {
            if (req.query.organisationId) where.organisationId = req.query.organisationId as string;
        } else {
            const orgId = getOrgId(user);
            if (!orgId) return res.status(403).json({ message: 'User has no organisation' });
            where.organisationId = orgId;
        }

        // 2. Hierarchy Visibility
        // Only apply organization-wide override for super_admin. 
        // Standard admins now fall into the hierarchy checking logic below.
        if (!user.isSuperAdmin && !isSuperAdmin(user)) {
            if (isAdmin(user) || isOrgAdmin(user) || isManager(user)) {
                const visibleUserIds = await getVisibleUserIds(user.id);

                andConditions.push({
                    OR: [
                        { assignedToId: { in: visibleUserIds } }, // Assigned to self or any subordinate/branch user
                        { createdById: user.id },                // Created by the user (always visible)
                        {
                            AND: [
                                { createdById: { in: visibleUserIds } }, // Created by subordinate
                                { assignedToId: null }    // But not reassigned to someone else (who might be outside visibility)
                            ]
                        }
                    ]
                });
            } else {
                // Standard users only see leads where they are the assigned owner
                andConditions.push({ assignedToId: user.id });
            }
        }

        // Filter: Status
        if (req.query.status && req.query.status !== 'all') {
            where.status = req.query.status as string;
        }

        // Filter: Branch
        if (req.query.branchId) {
            where.branchId = req.query.branchId as string;
        }

        // Filter: Source
        if (req.query.source && req.query.source !== 'all') {
            where.source = req.query.source as any;
        }

        // Filter: Search (OR condition)
        if (req.query.search) {
            const search = String(req.query.search);
            andConditions.push({
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { company: { contains: search, mode: 'insensitive' } }
                ]
            });
        }

        // Filter: Assigned User
        if (req.query.assignedTo) {
            where.assignedToId = req.query.assignedTo as string;
        }

        // Filter: Date Range (createdAt)
        if (req.query.startDate || req.query.endDate) {
            const dateFilter: any = {};
            if (req.query.startDate) {
                dateFilter.gte = new Date(req.query.startDate as string);
            }
            if (req.query.endDate) {
                const end = new Date(req.query.endDate as string);
                end.setHours(23, 59, 59, 999);
                dateFilter.lte = end;
            }
            where.createdAt = dateFilter;
        }

        // Combine all conditions
        if (andConditions.length > 0) {
            where.AND = andConditions;
        }

        // 3. Sorting
        let orderBy: any = { updatedAt: 'desc' };
        const sortBy = req.query.sortBy as string;
        const sortOrder = (req.query.sortOrder as string) || 'desc';

        if (sortBy) {
            if (sortBy === 'owner') {
                orderBy = { assignedTo: { firstName: sortOrder } };
            } else if (['firstName', 'lastName', 'createdAt', 'updatedAt', 'leadScore', 'status'].includes(sortBy)) {
                orderBy = { [sortBy]: sortOrder };
            }
        }

        console.log('[getLeads] Prisma Where:', JSON.stringify(where, null, 2)); // DEBUG LOG

        const total = await prisma.lead.count({ where });
        const leads = await prisma.lead.findMany({
            where,
            include: {
                assignedTo: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                }
            },
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy
        });

        res.json({ leads, page, pages: Math.ceil(total / pageSize), total });
    } catch (error) {
        console.error('getLeads Error:', error);
        // Return 500 but include error message for debugging
        res.status(500).json({ message: (error as Error).message, stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined });
    }
};

// POST /api/leads
export const createLead = async (req: express.Request, res: express.Response) => {
    try {
        const { email, phone } = req.body;

        if (!phone) return res.status(400).json({ message: 'Phone number is required' });

        // Sanitize Phone (Support scientific notation and international prefixes)
        let cleanPhone = phone.toString();

        // Handle scientific notation (e.g., 9.19E+11)
        if (cleanPhone.includes('E+') || cleanPhone.includes('e+')) {
            const num = Number(cleanPhone);
            if (!isNaN(num)) {
                cleanPhone = num.toLocaleString('fullwide', { useGrouping: false });
            }
        }

        // Final digit-only cleaning
        cleanPhone = cleanPhone.replace(/\D/g, '');

        const orgId = getOrgId((req as any).user);
        if (!orgId) return res.status(400).json({ message: 'Organisation context required' });

        const currentUser = (req as any).user;
        const assignedTo = req.body.assignedTo;
        const leadOwnerId = assignedTo || currentUser.id;

        // Resolve Branch (Lead branch is the lead owner's branch)
        let targetBranchId = req.body.branchId || currentUser.branchId;
        if (assignedTo) {
            const assignedUser = await prisma.user.findUnique({
                where: { id: assignedTo },
                select: { branchId: true }
            });
            if (assignedUser?.branchId) targetBranchId = assignedUser.branchId;
        }

        const { firstName, lastName, source, sourceDetails, company, enquiryAbout } = req.body;

        // Check for duplicates using DuplicateLeadService (Strictly isolated by branch)
        const duplicateCheck = await DuplicateLeadService.checkDuplicate(cleanPhone, email, orgId, targetBranchId || undefined);

        if (duplicateCheck.isDuplicate && duplicateCheck.existingLead) {
            // Handle as re-enquiry
            const reEnquiryData = {
                firstName: firstName,
                lastName: lastName,
                email: email,
                phone: cleanPhone,
                company: company,
                enquiryAbout: enquiryAbout,
                source: source,
                sourceDetails: sourceDetails
            };

            const updatedLead = await DuplicateLeadService.handleReEnquiry(
                duplicateCheck.existingLead,
                reEnquiryData,
                orgId
            );

            // Hierarchy Check: Only return full lead details if requester has permission
            const visibleUserIds = await getVisibleUserIds(currentUser.id);
            const hasPermission =
                currentUser.isSuperAdmin ||
                isSuperAdmin(currentUser) ||
                updatedLead.assignedToId === currentUser.id ||
                visibleUserIds.includes(updatedLead.assignedToId || '') ||
                updatedLead.createdById === currentUser.id ||
                (updatedLead.createdById && visibleUserIds.includes(updatedLead.createdById) && !updatedLead.assignedToId);

            return res.status(200).json({
                message: 'Lead already exists. Marked as re-enquiry and notifications sent.',
                lead: hasPermission ? updatedLead : { id: updatedLead.id, firstName: 'Private', lastName: 'Lead', isPrivate: true },
                isReEnquiry: true,
                matchedBy: duplicateCheck.matchedBy,
                reEnquiryCount: updatedLead.reEnquiryCount
            });
        }

        // Sanitize email: treat empty string as no email
        const cleanEmail = email && email.trim() !== '' ? email.trim() : undefined;

        // Detect country from IP address if not provided
        let geoData = null;
        if (!req.body.country && !req.body.countryCode) {
            const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress;
            if (ipAddress) {
                geoData = await GeoLocationService.detectCountryFromIP(ipAddress as string);
            }

            // Fallback: Try to detect from phone number
            if (!geoData && cleanPhone) {
                geoData = GeoLocationService.detectCountryFromPhone(cleanPhone);
            }
        }

        // Custom Field Validation
        if (req.body.customFields) {
            const { CustomFieldValidationService } = await import('../services/customFieldValidationService');
            await CustomFieldValidationService.validateFields('Lead', orgId, req.body.customFields);
        }

        // Resolve Default Status from Organisation Settings
        let leadStatus = req.body.status;
        if (!leadStatus) {
            const org = await prisma.organisation.findUnique({
                where: { id: orgId },
                select: { leadStatuses: true }
            });

            if (org?.leadStatuses && Array.isArray(org.leadStatuses)) {
                const statuses = org.leadStatuses as any[];
                const configuredDefault = statuses.find((s) => s.isDefault);
                if (configuredDefault) {
                    leadStatus = configuredDefault.id;
                }
            }

            // Final Fallback
            if (!leadStatus) leadStatus = 'new';
        }

        // Create — only pass explicitly known Lead fields (no blind spreading)
        const lead = await prisma.lead.create({
            data: {
                firstName: req.body.firstName || '',
                lastName: req.body.lastName || undefined,
                email: cleanEmail,
                phone: cleanPhone,
                secondaryPhone: req.body.secondaryPhone || undefined,
                company: req.body.company || undefined,
                enquiryAbout: req.body.enquiryAbout || undefined,
                jobTitle: req.body.jobTitle || undefined,
                address: req.body.address || undefined,
                customFields: req.body.customFields || undefined,
                tags: req.body.tags || undefined,
                stage: req.body.stage || undefined,
                sourceDetails: req.body.sourceDetails || undefined,
                country: req.body.country || geoData?.country || undefined,
                countryCode: req.body.countryCode || geoData?.countryCode || undefined,
                phoneCountryCode: req.body.phoneCountryCode || geoData?.phoneCountryCode || undefined,
                organisation: { connect: { id: orgId } },
                branch: targetBranchId ? { connect: { id: targetBranchId } } : undefined,
                // Assign to creator by default, or to specified user
                assignedTo: { connect: { id: leadOwnerId } },
                source: req.body.source as LeadSource || LeadSource.manual,
                status: leadStatus,
                potentialValue: req.body.potentialValue ? parseFloat(req.body.potentialValue) : 0,
                createdBy: { connect: { id: currentUser.id } } // Track creator for visibility
            }
        });

        // 3a. Handle Products if provided (products field is optional)
        if (req.body.products !== undefined && Array.isArray(req.body.products)) {
            const productItems = req.body.products;
            let totalValue = 0;

            // Only process if products array is not empty
            if (productItems.length > 0) {
                for (const item of productItems) {
                    // Validate that productId exists
                    if (!item.productId) {
                        continue; // Skip invalid items
                    }

                    const product = await prisma.product.findUnique({ where: { id: item.productId } });
                    if (product) {
                        const price = product.basePrice || 0;
                        const quantity = item.quantity || 1;
                        totalValue += price * quantity;

                        await prisma.leadProduct.create({
                            data: {
                                leadId: lead.id,
                                productId: item.productId,
                                quantity: quantity,
                                price: price
                            }
                        });
                    }
                }

                // Update lead with calculated value if products were added
                if (totalValue > 0) {
                    await prisma.lead.update({
                        where: { id: lead.id },
                        data: { potentialValue: totalValue }
                    });
                    lead.potentialValue = totalValue; // Update local obj for response
                }
            }
        }

        // Audit Log
        try {
            const { logAudit } = await import('../utils/auditLogger');
            logAudit({
                action: 'CREATE_LEAD',
                entity: 'Lead',
                entityId: lead.id,
                actorId: (req as any).user.id,
                organisationId: orgId,
                details: { name: `${lead.firstName} ${lead.lastName || ''}`.trim(), company: lead.company }
            });
        } catch (e) {
            console.error('Audit Log Error:', e);
        }

        // Enable Distribution only if no explicit assignment was made
        // This allows assignment rules to work for automated leads, but respects manual assignments
        if (!assignedTo) {
            await DistributionService.assignLead(lead, orgId);
        }

        // Trigger Workflow Engine for lead creation
        try {
            await WorkflowEngine.evaluate('Lead', 'created', lead, orgId);
            import('../services/webhookService').then(({ WebhookService }) => {
                WebhookService.triggerEvent('lead.created', lead, orgId).catch(console.error);
            });
            // AI Scoring
            import('../services/leadScoringService').then(({ LeadScoringService }) => {
                LeadScoringService.scoreLead(lead.id).catch(console.error);
            });
            // Goal Automation
            import('../services/goalService').then(({ GoalService }) => {
                const assignedId = lead.assignedToId;
                if (assignedId) {
                    GoalService.updateProgressForUser(assignedId, 'leads').catch(console.error);
                }
            });

            // Meta Conversion API: New Lead
            import('../services/metaConversionService').then(({ MetaConversionService }) => {
                MetaConversionService.sendEvent(orgId, {
                    eventName: 'Lead',
                    userData: {
                        email: lead.email,
                        phone: lead.phone,
                        firstName: lead.firstName,
                        lastName: lead.lastName,
                        externalId: lead.id
                    },
                    actionSource: 'system_generated' // or website if we knew source url
                }).catch(console.error);
            });
            // Gallabox Sync
            GallaboxService.getClientForOrg(orgId).then(gallabox => {
                if (gallabox) {
                    gallabox.syncLeadToContact(lead).catch(err => {
                        console.error('Auto Gallabox Sync Error:', err.message);
                    });
                }
            }).catch(console.error);
        } catch (workflowErr) {
            console.error('WorkflowEngine error:', workflowErr);
            // Don't fail the request if workflow fails
        }

        // Socket Emit for Real-time Sync
        emitToOrg(orgId, 'lead_created', lead);

        res.status(201).json(lead);
    } catch (error: any) {
        console.error('createLead Error:', error);

        // Handle Prisma Unique Constraint Errors (e.g., P2002)
        if (error.code === 'P2002') {
            const target = error.meta?.target || [];
            if (target.includes('phone')) {
                return res.status(400).json({
                    message: 'A lead with this phone number already exists in your organisation.'
                });
            }
            if (target.includes('email')) {
                return res.status(400).json({
                    message: 'A lead with this email address already exists in your organisation.'
                });
            }
            return res.status(400).json({
                message: 'A lead with these details already exists in your organisation.'
            });
        }

        res.status(400).json({ message: (error as Error).message });
    }
};

export const getLeadById = async (req: express.Request, res: express.Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);

        // 1. Organization & Existence scoping (Check if it even exists in their world)
        const existingLead = await prisma.lead.findUnique({
            where: { id: req.params.id },
            select: { organisationId: true, isDeleted: true }
        });

        if (!existingLead || existingLead.isDeleted || (orgId && existingLead.organisationId !== orgId)) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        const where: any = { id: req.params.id, isDeleted: false };

        // 2. Hierarchy Visibility scoping
        if (!user.isSuperAdmin && !isSuperAdmin(user)) {
            if (isAdmin(user)) {
                const visibleUserIds = await getVisibleUserIds(user.id);

                where.OR = [
                    { assignedToId: { in: visibleUserIds } }, // Assigned to self or any subordinate/branch user
                    { createdById: user.id },                // Created by the user (always visible)
                    {
                        AND: [
                            { createdById: { in: visibleUserIds } }, // Created by subordinate
                            { assignedToId: null }    // But not reassigned to someone else
                        ]
                    }
                ];
            } else {
                // Standard users only see leads where they are the assigned owner
                where.assignedToId = user.id;
            }
        }

        const lead = await prisma.lead.findFirst({
            where,
            include: {
                assignedTo: { select: { firstName: true, lastName: true, email: true } },
                products: { include: { product: true } },
                convertedOpportunities: { select: { stage: true, id: true } }
            }
        });

        if (!lead) {
            return res.status(403).json({
                message: 'Access Denied: This lead is outside of your visibility hierarchy.',
                error: 'HIERARCHY_FORBIDDEN'
            });
        }

        res.json(lead);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const updateLead = async (req: express.Request, res: express.Response) => {
    try {
        const updates = { ...req.body };
        const leadId = req.params.id;
        const requester = (req as any).user;
        let historyData: any = null;

        // Fetch current lead to check for ownership change
        const currentLead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!currentLead) return res.status(404).json({ message: 'Lead not found' });

        // Hierarchy Check
        if (updates.assignedToId || updates.assignedTo) { // Handle payload differences
            const targetUserId = updates.assignedToId || updates.assignedTo; // Assuming ID string

            if (!requester.isSuperAdmin && !isSuperAdmin(requester) && !isAdmin(requester)) {
                const allowedIds = await getVisibleUserIds(requester.id);

                // If passing an object (legacy), extract ID?? Usually frontend sends ID string for update.
                // Let's assume ID string.
                if (typeof targetUserId === 'string' && !allowedIds.includes(targetUserId)) {
                    return res.status(403).json({ message: 'You can only assign leads to your subordinates.' });
                }
            }

            // Track History
            if (currentLead.assignedToId !== targetUserId) {
                historyData = {
                    leadId,
                    oldOwnerId: currentLead.assignedToId,
                    newOwnerId: targetUserId,
                    changedById: requester.id,
                    reason: req.body.reason || 'Manual Assignment'
                };
            }

            // Sync branch with new owner
            const assignedUser = await prisma.user.findUnique({
                where: { id: targetUserId },
                select: { branchId: true }
            });
            if (assignedUser?.branchId) {
                updates.branchId = assignedUser.branchId;
            }

            // Remap for Prisma - store the ID directly
            updates.assignedToId = targetUserId;
            delete updates.assignedTo; // Clean up the relation object

            // Notify new owner
            if (currentLead.assignedToId !== targetUserId) {
                const leadName = `${currentLead.firstName} ${currentLead.lastName || ''}`.trim();
                NotificationService.send(
                    targetUserId,
                    'New Lead Assigned',
                    `Lead "${leadName}" has been assigned to you by ${requester.firstName}.`,
                    'info'
                ).catch(console.error);
            }
        }

        // Phone Sanitization & Country Detection
        if (updates.phone) {
            let cleanPhone = updates.phone.toString();

            // Handle scientific notation
            if (cleanPhone.includes('E+') || cleanPhone.includes('e+')) {
                const num = Number(cleanPhone);
                if (!isNaN(num)) {
                    cleanPhone = num.toLocaleString('fullwide', { useGrouping: false });
                }
            }

            updates.phone = cleanPhone.replace(/\D/g, '');

            // Detect country if not provided or explicitly requested
            if (!updates.country || !updates.countryCode) {
                const geoData = GeoLocationService.detectCountryFromPhone(updates.phone);
                if (geoData) {
                    updates.country = geoData.country;
                    updates.countryCode = geoData.countryCode;
                    updates.phoneCountryCode = geoData.phoneCountryCode;
                }
            }
        }

        // Duplicate Check for phone/email update
        if ((updates.phone && updates.phone !== currentLead.phone) || (updates.email && updates.email !== currentLead.email)) {
            const duplicateCheck = await DuplicateLeadService.checkDuplicate(
                updates.phone || currentLead.phone,
                updates.email || currentLead.email,
                currentLead.organisationId,
                currentLead.branchId || undefined
            );

            if (duplicateCheck.isDuplicate && duplicateCheck.existingLead && duplicateCheck.existingLead.id !== currentLead.id) {
                return res.status(400).json({
                    message: `A lead with this ${duplicateCheck.matchedBy} already exists in this branch.`
                });
            }
        }

        // Track Status Change
        if (updates.status && updates.status !== currentLead.status) {
            // CRITICAL: Block transition to 'qualified' or 'converted' if no products
            if (['qualified', 'converted'].includes(updates.status)) {
                const productCount = await prisma.leadProduct.count({ where: { leadId } });
                if (productCount === 0) {
                    return res.status(400).json({
                        message: 'Please add at least one product before qualifying or converting this lead.'
                    });
                }
            }

            const { logAudit } = await import('../utils/auditLogger');
            logAudit({
                action: 'LEAD_STATUS_CHANGE',
                entity: 'Lead',
                entityId: leadId,
                actorId: requester.id,
                organisationId: currentLead.organisationId,
                details: {
                    name: `${currentLead.firstName} ${currentLead.lastName || ''}`.trim(),
                    oldStatus: currentLead.status,
                    newStatus: updates.status
                }
            });

            // CRITICAL for Reporting: Create LeadHistory record
            await prisma.leadHistory.create({
                data: {
                    leadId,
                    fieldName: 'status',
                    oldValue: currentLead.status,
                    newValue: updates.status,
                    changedById: requester.id,
                    reason: req.body.reason || 'Manual Status Update'
                }
            }).catch(() => { });
        }

        // Track Follow-up Change and Create Task
        if (updates.nextFollowUp) {
            // Create interaction log
            await prisma.interaction.create({
                data: {
                    leadId: leadId,
                    type: 'other',
                    subject: 'Follow-up Scheduled',
                    description: `Next follow-up scheduled for ${new Date(updates.nextFollowUp).toLocaleDateString()}`,
                    createdById: requester.id,
                    organisationId: currentLead.organisationId
                }
            });

            // Auto-create or reschedule follow-up task
            const leadName = `${currentLead.firstName} ${currentLead.lastName || ''}`.trim();
            const dueDate = new Date(updates.nextFollowUp);

            await FollowUpService.rescheduleOrCreateFollowUp({
                subject: `Follow up with ${leadName}`,
                description: `Follow-up scheduled for ${leadName} from ${currentLead.company || 'Unknown Company'}`,
                status: 'not_started',
                priority: 'medium',
                dueDate: dueDate,
                organisationId: currentLead.organisationId,
                createdById: requester.id,
                leadId: leadId,
                assignedToId: updates.assignedToId || currentLead.assignedToId || requester.id,
                branchId: currentLead.branchId
            });
        }

        if (updates.customFields) {
            const { CustomFieldValidationService } = await import('../services/customFieldValidationService');
            await CustomFieldValidationService.validateFields('Lead', currentLead.organisationId, updates.customFields);
        }

        const whereObj: any = { id: leadId, isDeleted: false };
        if (requester.role !== 'super_admin') {
            const orgId = getOrgId(requester);
            if (!orgId) return res.status(403).json({ message: 'No org' });
            whereObj.organisationId = orgId;
            // Don't filter by branchId on update - users can update leads across branches if they have access
        }

        // Sanitize phone if it's being updated
        if (updates.phone) {
            let cleanPhone = updates.phone.toString().replace(/\D/g, '');
            updates.phone = cleanPhone;
        }

        // List of allowed fields to prevent relation/schema mismatches crashing Prisma
        const allowedFields = [
            'firstName', 'lastName', 'email', 'phone', 'secondaryPhone', 'company', 'enquiryAbout', 'jobTitle', 'address',
            'status', 'source', 'sourceDetails', 'stage', 'tags', 'potentialValue',
            'nextFollowUp', 'customFields', 'isHotLead',
            'country', 'countryCode', 'phoneCountryCode'
        ];

        const leadUpdates: any = {};
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                leadUpdates[field] = updates[field];
            }
        });

        // Add special handling for relation IDs if they are strings (Prisma connect is handled above)
        if (updates.assignedToId) leadUpdates.assignedToId = updates.assignedToId;
        if (updates.branchId) leadUpdates.branchId = updates.branchId;

        // Update Lead Basic Info
        const [lead] = await prisma.$transaction([
            prisma.lead.update({
                where: whereObj,
                data: leadUpdates,
                include: { assignedTo: { select: { firstName: true, lastName: true, email: true } } }
            }),
            ...(historyData ? [prisma.leadHistory.create({ data: historyData })] : [])
        ]);

        let finalLead = lead;

        // Auto-update associated opportunities if lead status changes to won or lost
        if (updates.status === 'won' || updates.status === 'lost') {
            const oppStage = updates.status === 'won' ? 'closed_won' : 'closed_lost';
            try {
                await prisma.opportunity.updateMany({
                    where: { leadId: leadId },
                    data: {
                        stage: oppStage,
                        leadStatus: updates.status
                    }
                });
            } catch (err) {
                console.error('Failed to auto-update opportunity from lead:', err);
            }
        }

        // Handle Products Update (products field is optional)
        if (req.body.products !== undefined && Array.isArray(req.body.products)) {
            const productItems = req.body.products;

            // 1. Clear existing products (simplest approach for full replace)
            await prisma.leadProduct.deleteMany({ where: { leadId } });

            // 2. Add new products and calculate value (only if products array is not empty)
            let totalValue = 0;

            if (productItems.length > 0) {
                for (const item of productItems) {
                    // Validate that productId exists
                    if (!item.productId) {
                        continue; // Skip invalid items
                    }

                    const product = await prisma.product.findUnique({ where: { id: item.productId } });
                    if (product) {
                        // Priority 1: Price from payload (custom pricing), Priority 2: Product base price
                        const price = item.price !== undefined ? Number(item.price) : (product.basePrice || 0);
                        const quantity = item.quantity || 1;
                        totalValue += price * quantity;

                        await prisma.leadProduct.create({
                            data: {
                                leadId,
                                productId: item.productId,
                                quantity: quantity,
                                price: price
                            }
                        });
                    }
                }
            }

            // 3. Update Lead Value
            finalLead = await prisma.lead.update({
                where: { id: leadId },
                data: { potentialValue: totalValue },
                include: {
                    assignedTo: { select: { firstName: true, lastName: true, email: true } },
                    products: { include: { product: true } }
                }
            });

            // Log History for Value Change
            if (currentLead.potentialValue !== totalValue) {
                await prisma.leadHistory.create({
                    data: {
                        leadId,
                        changedById: requester.id,
                        fieldName: 'potentialValue',
                        oldValue: currentLead.potentialValue?.toString() || '0',
                        newValue: totalValue.toString()
                    }
                });
            }
        }

        // Audit Log for update
        try {
            const { logAudit } = await import('../utils/auditLogger');
            logAudit({
                action: 'UPDATE_LEAD',
                entity: 'Lead',
                entityId: leadId,
                actorId: requester.id,
                organisationId: currentLead.organisationId,
                details: { name: `${currentLead.firstName} ${currentLead.lastName || ''}`.trim(), updatedFields: Object.keys(updates) }
            });
        } catch (e) {
            console.error('Audit Log Error:', e);
        }

        res.json(finalLead);

        // Webhook
        import('../services/webhookService').then(({ WebhookService }) => {
            WebhookService.triggerEvent('lead.updated', lead, lead.organisationId).catch(console.error);
        });

        // AI Scoring Trigger (if relevant fields changed)
        if (updates.jobTitle || updates.company || updates.email || updates.phone) {
            import('../services/leadScoringService').then(({ LeadScoringService }) => {
                LeadScoringService.scoreLead(leadId).catch(console.error);
            });
        }

        // Socket Emit for Real-time Sync
        emitToOrg(finalLead.organisationId, 'lead_updated', finalLead);

        // Notifications
        import('../services/notificationService').then(({ NotificationService }) => {
            const leadName = `${finalLead.firstName} ${finalLead.lastName || ''}`.trim();

            // 1. Hierarchy Notification (existing)
            NotificationService.sendToHierarchy(
                requester.id,
                'Lead Updated',
                `${requester.firstName} updated lead: ${leadName}`,
                'info'
            ).catch(console.error);

            // 2. Owner Notification for Status Change
            if (updates.status && updates.status !== currentLead.status) {
                if (finalLead.assignedToId && finalLead.assignedToId !== requester.id) {
                    NotificationService.send(
                        finalLead.assignedToId,
                        'Lead Status Updated',
                        `Your lead "${leadName}" status has been updated to "${updates.status}" by ${requester.firstName}.`,
                        'info'
                    ).catch(console.error);
                }
            }
        });

    } catch (error: any) {
        console.error('[updateLead] Error:', error);

        // Handle Prisma Unique Constraint Errors (e.g., P2002)
        if (error.code === 'P2002') {
            const target = error.meta?.target || [];
            if (target.includes('phone')) {
                return res.status(400).json({
                    message: 'A lead with this phone number already exists in your organisation.'
                });
            }
            if (target.includes('email')) {
                return res.status(400).json({
                    message: 'A lead with this email address already exists in your organisation.'
                });
            }
            return res.status(400).json({
                message: 'A lead with these details already exists in your organisation.'
            });
        }

        res.status(400).json({ message: (error as Error).message });
    }
};

export const deleteLead = async (req: express.Request, res: express.Response) => {
    try {
        const user = (req as any).user;
        const leadId = req.params.id;


        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        // Org Check
        if (!isSuperAdmin(user)) {
            const userOrgId = getOrgId(user);
            if (lead.organisationId !== userOrgId) {
                return res.status(403).json({ message: 'Not authorized to delete this lead' });
            }
        }

        // Check for attached opportunities
        const opportunities = await prisma.opportunity.findMany({
            where: { leadId: leadId, isDeleted: false }
        });

        // We ALWAYS delete the lead. But we only delete the opportunity if it is NOT closed won/lost.
        const openOpportunities = opportunities.filter(opp => opp.stage !== 'closed_won' && opp.stage !== 'closed_lost');

        const transactionOperations = [];

        // If there are expected/open opportunities, delete them
        if (openOpportunities.length > 0) {
            transactionOperations.push(
                prisma.opportunity.updateMany({
                    where: { id: { in: openOpportunities.map(o => o.id) } },
                    data: { isDeleted: true }
                })
            );
        }

        // Delete the lead itself ALWAYS
        transactionOperations.push(
            prisma.lead.update({
                where: { id: leadId },
                data: { isDeleted: true }
            })
        );

        await prisma.$transaction(transactionOperations);

        // Audit Log
        try {
            const { logAudit } = await import('../utils/auditLogger');
            logAudit({
                action: 'DELETE_LEAD',
                entity: 'Lead',
                entityId: leadId,
                actorId: user.id,
                organisationId: lead.organisationId,
                details: { name: `${lead.firstName} ${lead.lastName || ''}`.trim() }
            });
        } catch (e) {
            console.error('Audit Log Error:', e);
        }

        // Socket Emit for Real-time Sync
        emitToOrg(lead.organisationId, 'lead_deleted', { id: leadId });

        res.json({ message: 'Lead deleted' });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const createBulkLeads = async (req: express.Request, res: express.Response) => {
    try {
        const { leads, assignmentRuleId, applyAssignmentRules, splitUserIds } = req.body;
        const user = (req as any).user;

        // Support both direct array (legacy) and object with options
        const leadsData = Array.isArray(req.body) ? req.body : leads;
        const ruleId = Array.isArray(req.body) ? undefined : assignmentRuleId;
        const applyRules = Array.isArray(req.body) ? true : (applyAssignmentRules !== false); // Default to true if not explicitly false
        const splitIds = Array.isArray(req.body) ? [] : (splitUserIds || []);
        let splitIndex = 0;

        console.log('[createBulkLeads] Received:', leadsData?.length || 0, 'leads', 'RuleID:', ruleId, 'SplitIds:', splitIds);

        if (!Array.isArray(leadsData) || leadsData.length === 0) {
            return res.status(400).json({ message: 'Invalid input' });
        }

        // Map data
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No org' });

        let createdCount = 0;
        let duplicateCount = 0;
        let reEnquiryCount = 0;
        const errors: any[] = [];

        // Pre-fetch users for email resolution
        const orgUsers = await prisma.user.findMany({
            where: { organisationId: orgId },
            select: { id: true, email: true }
        });
        const userEmailMap = new Map(orgUsers.map(u => [u.email.toLowerCase(), u.id]));

        for (const l of leadsData) {
            try {
                // Sanitize phone: keep all digits for the service to handle normalization
                let cleanPhone = l.phone?.toString().replace(/\D/g, '') || '';

                // Resolve owner and branch EARLY to correctly isolate duplicate check
                let targetOwnerId = l.assignedTo || l.assignedToId;
                let targetBranchId = l.branchId || user.branchId;

                // Resolution via ownerEmail if provided in import
                if (!targetOwnerId && l.ownerEmail && typeof l.ownerEmail === 'string') {
                    const resolvedId = userEmailMap.get(l.ownerEmail.toLowerCase());
                    if (resolvedId) targetOwnerId = resolvedId;
                }

                // If specific user resolved, sync branch with them
                if (targetOwnerId) {
                    const assignedUser = await prisma.user.findUnique({
                        where: { id: targetOwnerId },
                        select: { branchId: true }
                    });
                    if (assignedUser?.branchId) targetBranchId = assignedUser.branchId;
                }

                // Check for duplicates in the RESOLVED branch
                const DuplicateLeadService = (await import('../services/duplicateLeadService')).default;
                const duplicateCheck = await DuplicateLeadService.checkDuplicate(
                    cleanPhone,
                    l.email,
                    orgId,
                    targetBranchId || undefined
                );

                if (duplicateCheck.isDuplicate && duplicateCheck.existingLead) {
                    // Handle as re-enquiry
                    await DuplicateLeadService.handleReEnquiry(
                        duplicateCheck.existingLead,
                        {
                            firstName: l.firstName,
                            lastName: l.lastName || '',
                            email: l.email,
                            phone: cleanPhone,
                            company: l.company,
                            enquiryAbout: l.enquiryAbout,
                            source: l.source || 'import',
                            sourceDetails: l.sourceDetails
                        },
                        orgId
                    );
                    reEnquiryCount++;
                    continue;
                }

                // Try to detect country from phone if not provided
                let geoData = null;
                if (!l.country && !l.countryCode && cleanPhone) {
                    geoData = GeoLocationService.detectCountryFromPhone(cleanPhone);
                }

                let finalOwnerId = targetOwnerId;

                if (splitIds.length > 0) {
                    finalOwnerId = splitIds[splitIndex % splitIds.length];
                    splitIndex++;
                } else if (!finalOwnerId && applyRules) {
                    const { DistributionService } = await import('../services/distributionService');
                    finalOwnerId = await DistributionService.assignLead(
                        { ...l, id: undefined, branchId: targetBranchId || undefined },
                        orgId,
                        ruleId,
                        user.id // Importer fallback
                    ) || undefined;
                }

                // Robust Status and Stage Resolution for Bulk Creation
                const csvStatus = (l.status || l.Status || '').toString().trim().toLowerCase();
                const csvStage = (l.stage || l.Stage || '').toString().trim().toLowerCase();

                let finalStatus = 'new';
                let finalStage = null;

                if (csvStage) {
                    finalStatus = csvStage;
                    finalStage = csvStage;
                } else if (csvStatus) {
                    finalStatus = csvStatus;
                    finalStage = csvStatus;
                } else {
                    finalStatus = csvStatus || 'new';
                    finalStage = null;
                }

                const data: any = {
                    firstName: l.firstName,
                    lastName: l.lastName || '',
                    phone: cleanPhone,
                    email: l.email,
                    company: l.company,
                    country: l.country || geoData?.country || undefined,
                    countryCode: l.countryCode || geoData?.countryCode || undefined,
                    phoneCountryCode: l.phoneCountryCode || geoData?.phoneCountryCode || undefined,
                    organisation: { connect: { id: orgId } },
                    source: l.source || LeadSource.import,
                    status: finalStatus,
                    leadScore: l.leadScore ? parseInt(l.leadScore.toString()) : 0,
                    stage: finalStage || undefined,
                    createdBy: { connect: { id: user.id } }
                };

                // Connect to branch if available
                const finalBranchId = l.branchId || user.branchId;
                if (finalBranchId) {
                    data.branch = { connect: { id: finalBranchId } };
                }

                // Connect to assigned user if determined
                // If finalOwnerId is null (e.g., no rule matched), it creates an unassigned lead 
                // (or you can fallback to the importer: user.id)
                // We'll fallback to user (the importer) if no rule matched and no manual assignment.
                const finalAssignedTo = finalOwnerId || user.id;
                if (finalAssignedTo) {
                    data.assignedTo = { connect: { id: finalAssignedTo } };
                }

                console.log('[createBulkLeads] Creating lead:', data.firstName, data.phone, 'Assigned to:', finalAssignedTo);

                const lead = await prisma.lead.create({ data });

                // AI Scoring
                import('../services/leadScoringService').then(({ LeadScoringService }) => {
                    LeadScoringService.scoreLead(lead.id).catch(console.error);
                });

                createdCount++;
            } catch (error: any) {
                console.error('[createBulkLeads] Error creating lead:', error.message, 'Lead data:', l);
                errors.push({ lead: l, error: error.message });
                duplicateCount++;
            }
        }

        console.log('[createBulkLeads] Results:', { created: createdCount, reEnquiries: reEnquiryCount, duplicates: duplicateCount, errors: errors.length });

        res.status(201).json({
            message: `Bulk import completed`,
            created: createdCount,
            reEnquiries: reEnquiryCount,
            duplicates: duplicateCount,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const bulkAssignLeads = async (req: express.Request, res: express.Response) => {
    try {
        const { leadIds, assignedTo, reason } = req.body;
        const requester = (req as any).user;

        if (!isAdmin(requester)) {
            const allowedIds = await getVisibleUserIds(requester.id);
            if (!allowedIds.includes(assignedTo)) {
                return res.status(403).json({ message: 'Forbidden assignment' });
            }
        }

        // Fetch current leads to track old owners
        const currentLeads = await prisma.lead.findMany({
            where: { id: { in: leadIds } },
            select: { id: true, assignedToId: true }
        });

        // Update leads
        const result = await prisma.lead.updateMany({
            where: { id: { in: leadIds } },
            data: { assignedToId: assignedTo }
        });

        // Create history records for each lead
        const historyRecords = currentLeads.map(lead => ({
            leadId: lead.id,
            oldOwnerId: lead.assignedToId,
            newOwnerId: assignedTo,
            changedById: requester.id,
            reason: reason || 'Bulk Assignment'
        }));

        if (historyRecords.length > 0) {
            await prisma.leadHistory.createMany({
                data: historyRecords
            });

            // Notify new owner
            if (assignedTo !== requester.id) {
                const { NotificationService } = await import('../services/notificationService');
                NotificationService.send(
                    assignedTo,
                    'Bulk Leads Assigned',
                    `${result.count} leads have been assigned to you by ${requester.firstName}.`,
                    'info'
                ).catch(console.error);
            }
        }

        res.json({ message: 'Assigned successfully', count: result.count });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const convertLead = async (req: express.Request, res: express.Response) => {
    try {
        const { id } = req.params;
        const leadId = id;

        const { dealName, amount, accountId, accountName, contactName, stage, paymentType, paidAmount, installments, lostReason } = req.body;
        const user = (req as any).user;

        // Initial org check for the converting user
        const userOrgId = getOrgId(user);
        if (!userOrgId && !user.isSuperAdmin) return res.status(400).json({ message: 'No organisation context' });

        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: {
                organisation: true,
                products: { include: { product: true } }
            }
        });
        if (!lead) return res.status(404).json({ message: 'Lead not found' });



        // Use lead's organisationId to ensure deal stays in correct tenant
        const orgId = (lead.organisationId || userOrgId) as string;

        // Additional check to strictly prevent the same lead in multiple opportunities
        const existingOpportunity = await prisma.opportunity.findFirst({
            where: { leadId }
        });

        // Allow Quick Close Won/Lost to update an already converted lead
        if ((lead.status === "converted" || existingOpportunity) && (stage === 'closed_won' || stage === 'closed_lost')) {
            if (!existingOpportunity) {
                return res.status(404).json({ message: 'No opportunity found for this converted lead.' });
            }

            const updatedOpp = await prisma.$transaction(async (tx) => {
                const opp = await tx.opportunity.update({
                    where: { id: existingOpportunity.id },
                    data: {
                        stage: stage,
                        leadStatus: stage === 'closed_won' ? 'won' : 'lost',
                        lostReason: stage === 'closed_lost' ? lostReason : undefined,
                        amount: stage === 'closed_won' && amount ? Number(amount) : existingOpportunity.amount
                    }
                });

                await tx.lead.update({
                    where: { id: leadId },
                    data: { status: stage === 'closed_won' ? 'won' : 'lost' }
                });

                return opp;
            });

            // Handle Immediate Closure Logic
            if (stage === 'closed_won') {
                const oppId = updatedOpp.id;
                if (paymentType === 'paid') {
                    import('../services/paymentService').then(m => m.default.recordFullPayment(oppId, user.id, orgId));
                } else if (paymentType === 'partial') {
                    import('../services/paymentService').then(async m => {
                        if (paidAmount > 0) {
                            await m.default.recordPartialPayment(oppId, paidAmount, user.id, orgId);
                        }
                        if (installments && installments.length > 0) {
                            const { default: EMIService } = await import('../services/emiService');
                            await EMIService.convertToEMI(oppId, installments, orgId, Number(paidAmount) || 0);
                        }
                    });
                } else if (paymentType === 'emi' && installments && installments.length > 0) {
                    import('../services/emiService').then(m => m.default.convertToEMI(oppId, installments, orgId, 0));
                }
            }

            return res.json({ message: 'Lead updated successfully', opportunity: updatedOpp });
        }

        if (lead.status === "converted") {
            return res.status(400).json({ message: 'Lead already converted' });
        }

        if (existingOpportunity) {
            return res.status(400).json({ message: 'This lead is already associated with an opportunity' });
        }

        // Calculate opportunity amount from lead products if not provided
        let opportunityAmount = Number(amount) || 0;

        // If no amount provided, use lead's potentialValue or calculate from products
        if (!amount || opportunityAmount === 0) {
            if (lead.potentialValue && lead.potentialValue > 0) {
                console.log(`[convertLead] Using potentialValue ${lead.potentialValue} as fallback for amount`);
                opportunityAmount = lead.potentialValue;
            } else if (lead.products && lead.products.length > 0) {
                // Calculate from products
                opportunityAmount = lead.products.reduce((total, item) => {
                    return total + (item.price * item.quantity);
                }, 0);
                console.log(`[convertLead] Using product sum ${opportunityAmount} as fallback for amount`);
            }
        }

        // orgId was moved up

        // 0. Limit Check
        const org = lead.organisation;
        if (org.contactLimit > 0) {
            const contactCount = await prisma.contact.count({
                where: { organisationId: orgId, isDeleted: false }
            });
            if (contactCount >= org.contactLimit) {
                return res.status(403).json({
                    message: `Contact limit reached (${org.contactLimit}). Please upgrade your plan.`,
                    code: 'LIMIT_EXCEEDED',
                    limit: org.contactLimit
                });
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            // Determine owner for new entities (preserve lead owner if assigned)
            const finalOwnerId = lead.assignedToId || user.id;

            // 1. Handle Account
            let targetAccountId = accountId;
            let account;

            if (targetAccountId) {
                account = await tx.account.findUnique({ where: { id: targetAccountId } });
                if (!account) throw new Error('Target account not found');
            } else {
                // Create new Account
                account = await tx.account.create({
                    data: {
                        name: accountName || lead.company || `${lead.firstName} ${lead.lastName || ''}`.trim(),
                        organisationId: orgId,
                        ownerId: finalOwnerId,
                        type: 'customer',
                        phone: lead.phone,
                        address: lead.address as any,
                        leadId: lead.id, // Link to original lead
                        branchId: lead.branchId || undefined
                    }
                });
                targetAccountId = account.id;
            }

            // 2. Create Contact
            let firstName = lead.firstName;
            let lastName = lead.lastName || '';

            if (contactName) {
                const parts = contactName.trim().split(/\s+/);
                if (parts.length > 1) {
                    lastName = parts.pop() || '';
                    firstName = parts.join(' ');
                } else {
                    firstName = contactName;
                    lastName = '';
                }
            }

            const contact = await tx.contact.create({
                data: {
                    firstName,
                    lastName,
                    email: lead.email,
                    phones: lead.phone ? [{ type: 'mobile', number: lead.phone }] : [],
                    jobTitle: lead.jobTitle,
                    organisationId: orgId,
                    ownerId: finalOwnerId,
                    accountId: targetAccountId,
                    address: lead.address as any,
                    customFields: lead.customFields as any, // Migrate custom fields
                    leadId: lead.id, // Link to original lead
                    branchId: lead.branchId || undefined
                }
            });

            // Determine default opportunity lead status
            let defaultOppStatus = 'new_opportunity';
            if (stage === 'closed_won') {
                defaultOppStatus = 'won';
            } else if (stage === 'closed_lost') {
                defaultOppStatus = 'lost';
            } else if (org.opportunityLeadStatuses && Array.isArray(org.opportunityLeadStatuses)) {
                const statuses = org.opportunityLeadStatuses as any[];
                const configuredDefault = statuses.find((s) => s.isDefault);
                if (configuredDefault) {
                    defaultOppStatus = configuredDefault.id;
                } else if (statuses.length > 0) {
                    defaultOppStatus = statuses[0].id;
                }
            }

            // 3. Create Opportunity
            const opportunity = await tx.opportunity.create({
                data: {
                    name: dealName || `Deal - ${lead.company || lead.lastName || lead.firstName}`,
                    amount: opportunityAmount,
                    stage: stage || 'prospecting',
                    closeDate: new Date(), // Set to today by default instead of +30 days
                    organisationId: orgId,
                    ownerId: finalOwnerId,
                    accountId: targetAccountId,
                    leadId: lead.id,
                    branchId: lead.branchId || undefined,
                    pipelineId: lead.pipelineId || undefined, // Preserve pipeline context
                    contacts: { connect: { id: contact.id } },
                    lostReason: stage === 'closed_lost' ? lostReason : undefined,
                    leadStatus: defaultOppStatus
                }
            });

            // 4. Migrate Products from Lead to Account
            const leadProducts = await tx.leadProduct.findMany({
                where: { leadId: leadId },
                include: { product: true }
            });

            if (leadProducts.length > 0) {
                // Create AccountProduct entries for each LeadProduct
                for (const leadProduct of leadProducts) {
                    await tx.accountProduct.create({
                        data: {
                            accountId: targetAccountId,
                            productId: leadProduct.productId,
                            organisationId: orgId,
                            quantity: leadProduct.quantity,
                            // price: leadProduct.price || 0, // Migrate custom price
                            // customName: leadProduct.customName, // Migrate custom name
                            // Remove custom fields that don't exist on AccountProduct
                            purchaseDate: new Date(),
                            status: 'active',
                            notes: `Converted from lead: ${lead.firstName} ${lead.lastName || ''}`.trim()
                        }
                    });
                }
            }

            // 5. Update Lead
            let leadNewStatus = 'converted';
            if (stage === 'closed_won') leadNewStatus = 'won';
            if (stage === 'closed_lost') leadNewStatus = 'lost';

            const updatedLead = await tx.lead.update({
                where: { id: leadId },
                data: {
                    status: leadNewStatus
                }
            });

            // 6. Log History for Reporting
            await tx.leadHistory.create({
                data: {
                    leadId: leadId,
                    fieldName: 'status',
                    oldValue: lead.status,
                    newValue: leadNewStatus,
                    changedById: user.id,
                    reason: 'Lead Converted to Opportunity'
                }
            });

            // 6. Migrate Interactions
            await tx.interaction.updateMany({
                where: { leadId: leadId },
                data: {
                    contactId: contact.id,
                    accountId: targetAccountId
                }
            });

            // 7. Migrate WhatsApp Messages
            await tx.whatsAppMessage.updateMany({
                where: { leadId: leadId },
                data: {
                    contactId: contact.id
                }
            });

            // 8. Migrate Tasks
            await tx.task.updateMany({
                where: { leadId: leadId },
                data: {
                    leadId: null, // Unlink from lead
                    contactId: contact.id,
                    accountId: targetAccountId,
                    opportunityId: opportunity.id
                }
            });

            return { account, contact, opportunity, lead: updatedLead, migratedProducts: leadProducts.length };
        });

        // Audit Log for conversion
        try {
            const { logAudit } = await import('../utils/auditLogger');
            logAudit({
                action: 'CONVERT_LEAD',
                entity: 'Lead',
                entityId: leadId,
                actorId: user.id,
                organisationId: orgId,
                details: {
                    name: `${lead.firstName} ${lead.lastName || ''}`.trim(),
                    company: lead.company,
                    accountId: result.account.id,
                    contactId: result.contact.id,
                    opportunityId: result.opportunity.id,
                    migratedProducts: result.migratedProducts
                }
            });
        } catch (e) {
            console.error('Audit Log Error:', e);
        }

        // Notify Lead Owner
        if (lead.assignedToId && lead.assignedToId !== user.id) {
            const { NotificationService } = await import('../services/notificationService');
            const leadName = `${lead.firstName} ${lead.lastName || ''}`.trim();
            NotificationService.send(
                lead.assignedToId,
                'Lead Moved to Pipeline',
                `Your lead "${leadName}" has been moved to the pipeline by ${user.firstName}.`,
                'info'
            ).catch(console.error);
        }

        // --- NEW: Handle Immediate Closure Logic ---
        if (stage === 'closed_won' && result.opportunity) {
            const oppId = result.opportunity.id;

            if (paymentType === 'paid') {
                import('../services/paymentService').then(m => m.default.recordFullPayment(oppId, user.id, orgId));
            } else if (paymentType === 'partial') {
                import('../services/paymentService').then(async m => {
                    if (paidAmount > 0) {
                        await m.default.recordPartialPayment(oppId, paidAmount, user.id, orgId);
                    }
                    if (installments && installments.length > 0) {
                        const { default: EMIService } = await import('../services/emiService');
                        await EMIService.convertToEMI(oppId, installments, orgId, Number(paidAmount) || 0);
                    }
                });
            } else if (paymentType === 'emi') {
                (async () => {
                    try {
                        await prisma.opportunity.update({
                            where: { id: oppId },
                            data: { paymentStatus: 'emi' }
                        });
                        if (installments && installments.length > 0) {
                            const { default: EMIService } = await import('../services/emiService');
                            await EMIService.convertToEMI(oppId, installments, orgId);
                        }
                    } catch (error) {
                        console.error('Error in EMI conversion:', error);
                    }
                })();
            }

            // Target/Goal Updates
            import('../services/salesTargetService').then(({ SalesTargetService }) => {
                SalesTargetService.updateProgressForUser(result.opportunity.ownerId!).catch(console.error);
            });
            import('../services/goalService').then(({ GoalService }) => {
                GoalService.updateProgressForUser(result.opportunity.ownerId!, 'revenue').catch(console.error);
            });

            // Hierarchy Notification
            try {
                if (paymentType && (paymentType === 'paid' || paymentType === 'partial' || paymentType === 'emi')) {
                    const { NotificationService } = await import('../services/notificationService');
                    const owner = await prisma.user.findUnique({
                        where: { id: result.opportunity.ownerId! },
                        select: { reportsToId: true, firstName: true, lastName: true }
                    });

                    if (owner && owner.reportsToId) {
                        let paymentMessage = '';
                        if (paymentType === 'paid') paymentMessage = `Full payment of ₹${result.opportunity.amount.toLocaleString('en-IN')} received.`;
                        else if (paymentType === 'partial') paymentMessage = `Partial payment of ₹${paidAmount?.toLocaleString('en-IN')} received (Total: ₹${result.opportunity.amount.toLocaleString('en-IN')}).`;
                        else if (paymentType === 'emi') paymentMessage = `EMI payment plan initiated for ₹${result.opportunity.amount.toLocaleString('en-IN')}.`;

                        await NotificationService.sendToHierarchy(
                            result.opportunity.ownerId!,
                            'Sale Closed with Payment! 🎉💰',
                            `${owner.firstName} ${owner.lastName} closed a deal "${result.opportunity.name}". ${paymentMessage}`,
                            'success'
                        );
                    }
                }
            } catch (notifyErr) {
                console.error('Hierarchy notification error:', notifyErr);
            }
        }

        res.json({
            message: 'Lead converted successfully',
            data: result
        });

    } catch (error) {
        console.error('Lead conversion error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

import fs from 'fs';
import path from 'path';

const logDebug = (msg: string) => {
    try {
        const logPath = path.join(__dirname, '../../debug_crash.log');
        fs.appendFileSync(logPath, `${new Date().toISOString()} - [Leads] ${msg}\n`);
    } catch (e) {
        console.error('Failed to write log', e);
    }
};

export const getViolations = async (req: express.Request, res: express.Response) => {
    try {
        logDebug('Entered getViolations');
        const user = (req as any).user;
        const pageSize = Number(req.query.pageSize) || 10;
        const page = Number(req.query.page) || 1;
        logDebug(`User: ${user?.id}, Role: ${user?.role}`);

        // User sees violations where they were the PREVIOUS owner (the one who failed)
        // OR if they are a manager, seeing violations of their subordinates?
        // Prompt says "user and their managers need to give an explanation".

        const where: any = {
            rotationViolation: true,
            isDeleted: false,
        };

        if (user.role !== 'super_admin') {
            const orgId = getOrgId(user);
            if (!orgId) return res.status(403).json({ message: 'No org' });
            where.organisationId = orgId;

            let visibleUserIds: string[] = [];
            try {
                logDebug('Fetching visible users...');
                visibleUserIds = await getVisibleUserIds(user.id);
                logDebug(`Visible users found: ${visibleUserIds.length}`);
            } catch (subError) {
                logDebug(`Error fetching visible users: ${(subError as Error).message}`);
                console.error('[getViolations] Error fetching visible users:', subError);
                visibleUserIds = [user.id];
            }

            where.previousOwnerId = { in: visibleUserIds };
        }

        logDebug(`[Leads] Querying Prisma with where: ${JSON.stringify(where)}`);
        const violations = await prisma.lead.findMany({
            where,
            include: {
                previousOwner: { select: { firstName: true, lastName: true } },
                assignedTo: { select: { firstName: true, lastName: true } }
            },
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { violationTime: 'desc' }
        });

        logDebug(`[Leads] Violations found: ${violations.length}`);

        const total = await prisma.lead.count({ where });
        res.json({ violations, page, pages: Math.ceil(total / pageSize), total });

    } catch (error) {
        logDebug(`getViolations CRASHED: ${(error as Error).message}\nStack: ${(error as Error).stack}`);
        console.error('[getViolations] Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

export const getLeadHistory = async (req: express.Request, res: express.Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        // Verify access (simple org check)
        const lead = await prisma.lead.findUnique({ where: { id } });
        const orgId = getOrgId(user);

        if (!lead || (orgId && lead.organisationId !== orgId && user.role !== 'super_admin')) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        const history = await prisma.leadHistory.findMany({
            where: { leadId: id },
            include: {
                oldOwner: { select: { firstName: true, lastName: true } },
                newOwner: { select: { firstName: true, lastName: true } },
                changedBy: { select: { firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};


export const submitExplanation = async (req: express.Request, res: express.Response) => {
    try {
        const { leadId, explanation, type } = req.body; // type = 'user' | 'manager'
        const user = (req as any).user;

        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        if (!lead.rotationViolation) {
            return res.status(400).json({ message: 'This lead is not flagged for violation' });
        }

        const data: any = {};

        if (type === 'user') {
            if (lead.previousOwnerId !== user.id && !isAdmin(user) && !user.isSuperAdmin) {
                return res.status(403).json({ message: 'Only the previous owner can submit a user explanation' });
            }
            data.userExplanation = explanation;
        } else if (type === 'manager') {
            // Check if user is manager of previousOwner
            // Ideally we check hierarchy properly.
            // For MVP, if user is admin or has subordinates including previousOwner
            const userRole = await prisma.role.findFirst({
                where: {
                    OR: [
                        { id: user.role },
                        { roleKey: user.role, organisationId: user.organisationId },
                        { roleKey: user.role, organisationId: null }
                    ]
                }
            });
            if (userRole && userRole.name === 'Sales Rep') {
                return res.status(403).json({ message: 'Sales reps cannot submit manager explanations' });
            }
            data.managerExplanation = explanation;
        } else {
            return res.status(400).json({ message: 'Invalid explanation type' });
        }

        const updatedLead = await prisma.lead.update({
            where: { id: leadId },
            data
        });

        res.json(updatedLead);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const getPendingFollowUpsCount = async (req: express.Request, res: express.Response) => {
    try {
        const user = (req as any).user;
        const now = new Date();
        const endOfToday = new Date(now.setHours(23, 59, 59, 999));

        const where: any = {
            nextFollowUp: { lte: endOfToday },
            status: { not: 'converted' },
            isDeleted: false
        };

        if (user.role !== 'super_admin') {
            const orgId = getOrgId(user);
            if (!orgId) return res.status(403).json({ message: 'User has no organisation' });
            where.organisationId = orgId;
        }

        // Daily Briefing is personal
        where.assignedToId = user.id;

        const leads = await prisma.lead.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                nextFollowUp: true,
                company: true
            },
            orderBy: { nextFollowUp: 'asc' }
        });

        res.json({ count: leads.length, leads });
    } catch (error) {
        console.error('[getPendingFollowUpsCount] Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

export const generateAIResponse = async (req: express.Request, res: express.Response) => {
    try {
        const { id } = req.params;
        const { context } = req.body; // e.g. "Draft an intro email"

        const lead = await prisma.lead.findUnique({ where: { id } });
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        // Lazy load OpenAI
        const { OpenAI } = await import('openai');
        if (!process.env.OPENAI_API_KEY) {
            return res.json({ draft: `[Mock AI Draft]\n\nHi ${lead.firstName},\n\nI noticed you work at ${lead.company}. We'd love to chat.\n\nBest,\n[Your Name]` });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a helpful sales assistant. Draft a short, professional email." },
                { role: "user", content: `Lead: ${lead.firstName} ${lead.lastName} from ${lead.company}. Title: ${lead.jobTitle}. Context: ${context || 'Introduction'}` }
            ],
        });

        res.json({ draft: completion.choices[0].message.content });

    } catch (error) {
        console.error('[generateAIResponse] Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};



// GET /api/leads/re-enquiries - Get all re-enquiry leads
export const getReEnquiryLeads = async (req: express.Request, res: express.Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(403).json({ message: 'No organisation context' });

        // Enforce hierarchy: Managers only see their branch's re-enquiries
        let branchId = undefined;
        if (!isAdmin(user) && !isOrgAdmin(user) && user.branchId) {
            branchId = user.branchId;
        }

        const DuplicateLeadService = (await import('../services/duplicateLeadService')).default;
        const reEnquiryLeads = await DuplicateLeadService.getReEnquiryLeads(orgId, branchId);

        res.json({
            leads: reEnquiryLeads,
            count: reEnquiryLeads.length
        });
    } catch (error) {
        console.error('getReEnquiryLeads Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// GET /api/leads/duplicates - Find all duplicate leads
export const getDuplicateLeads = async (req: express.Request, res: express.Response) => {
    try {
        const orgId = getOrgId((req as any).user);
        if (!orgId) return res.status(403).json({ message: 'No organisation context' });

        const DuplicateLeadService = (await import('../services/duplicateLeadService')).default;
        const duplicates = await DuplicateLeadService.findDuplicates(orgId);

        res.json({
            duplicates,
            count: duplicates.length
        });
    } catch (error) {
        console.error('getDuplicateLeads Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// POST /api/leads/:id/sync-gallabox
export const syncToGallabox = async (req: express.Request, res: express.Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const leadId = req.params.id;

        if (!orgId) return res.status(403).json({ message: 'Organisation context required' });

        const lead = await prisma.lead.findUnique({
            where: { id: leadId, organisationId: orgId }
        });

        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        const gallabox = await GallaboxService.getClientForOrg(orgId);
        if (!gallabox) {
            return res.status(400).json({ message: 'Gallabox is not connected or configured for your organisation.' });
        }

        const result = await gallabox.syncLeadToContact(lead);

        res.json({
            success: true,
            message: 'Lead successfully synced to Gallabox',
            result
        });
    } catch (error: any) {
        console.error('syncToGallabox Error:', error);
        res.status(500).json({ message: error.message });
    }
};
