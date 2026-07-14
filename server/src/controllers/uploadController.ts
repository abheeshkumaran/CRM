
import { Request, Response } from 'express';
import { getOrgId } from '../utils/hierarchyUtils';
import { synchronizeDurations, resolveBestDurationSeconds, formatCallDurationDescription, normalizeDuration } from '../utils/callUtils';
import prisma from '../config/prisma';


export const uploadCallRecording = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { phoneNumber, duration, timestamp } = req.body;
        const user = (req as any).user;
        const orgId = getOrgId(user);

        if (!phoneNumber) {
            // If no phone number, we can't link it easily, but we still save the file.
            // Or we could require it. Let's require it for now as the mobile app should parse it.
            return res.status(400).json({ message: 'Phone number is required' });
        }

        // Clean phone number (remove non-digits, maybe keep +)
        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

        // 0. Storage Limit Check (basic implementation)
        const org = await prisma.organisation.findUnique({
            where: { id: orgId || user.organisationId },
            select: { storageLimit: true }
        });

        if (org && org.storageLimit > 0) {
            // Calculate total storage used by this org
            const totalUsed = await prisma.interaction.aggregate({
                where: { organisationId: orgId || user.organisationId, recordingUrl: { not: null } },
                _sum: { recordingDuration: true } // Duration is a proxy, but better to check file size if we tracked it.
                // Since we don't track file size in DB, we'll use a count-based heuristic or just duration sum as placeholder
                // or ideally use fs to check size of uploads/recordings.
                // For now, let's assume 1MB per 60s of recording.
            });

            const estimatedMB = Math.ceil((totalUsed._sum.recordingDuration || 0) / 60);
            if (estimatedMB >= org.storageLimit) {
                return res.status(403).json({
                    message: `Storage limit reached (${org.storageLimit}MB). Please upgrade.`,
                    code: 'STORAGE_LIMIT_EXCEEDED'
                });
            }
        }

        // Find Lead or Contact
        let entityId = null;
        let entityType = null;

        // Try Lead — use index-friendly exact match variations instead of LIKE wildcard
        const last10Upload = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
        const uploadVariations = Array.from(new Set([
            last10Upload,
            `+91${last10Upload}`,
            `91${last10Upload}`,
            `0${last10Upload}`,
            cleanPhone,
            phoneNumber
        ].filter(Boolean)));

        const lead = await prisma.lead.findFirst({
            where: {
                organisationId: orgId || undefined,
                isDeleted: false,
                OR: [
                    { phone: { in: uploadVariations } },
                    { secondaryPhone: { in: uploadVariations } }
                ]
            }
        });

        if (lead) {
            entityId = lead.id;
            entityType = 'lead';
        }

        // SAVE TO DATABASE (DOCUMENT TABLE)
        const fileData = req.file.buffer;
        const filename = `recording-${cleanPhone}-${timestamp || Date.now()}.mp3`;

        const document = await prisma.document.create({
            data: {
                name: filename,
                fileKey: filename,
                fileData: fileData,
                fileType: req.file.mimetype || 'audio/mpeg',
                fileSize: req.file.size,
                category: 'recording',
                organisationId: orgId || user.organisationId,
                createdById: user.id,
                leadId: entityType === 'lead' ? entityId : undefined
            }
        });

        // Accurate finalized description
        const durationSecs = normalizeDuration(duration);
        const formattedDescription = formatCallDurationDescription(durationSecs, { hasRecording: true });

        // DEDUPLICATION: Look for an 'initiated' interaction to merge with
        const callDate = new Date(parseInt(timestamp) || Date.now());
        const searchWindowStart = new Date(callDate.getTime() - 120 * 1000); // 2 mins before
        const searchWindowEnd = new Date(callDate.getTime() + 120 * 1000);   // 2 mins after
        const last10 = cleanPhone.slice(-10);

        let existingInteraction = null;
        if (last10.length >= 10) {
            const dedupeVariations = Array.from(new Set([
                last10,
                `+91${last10}`,
                `91${last10}`,
                `0${last10}`,
                cleanPhone,
                phoneNumber
            ].filter(Boolean)));

            existingInteraction = await prisma.interaction.findFirst({
                where: {
                    organisationId: orgId || user.organisationId,
                    createdById: user.id,
                    type: 'call',
                    callStatus: 'initiated',
                    phoneNumber: { in: dedupeVariations },
                    date: { gte: searchWindowStart, lte: searchWindowEnd }
                },
                orderBy: { date: 'desc' }
            });
        }

        let interaction;
        if (existingInteraction) {
            console.log(`[UploadCall] Merging recording into initiated interaction ${existingInteraction.id}`);
            const updateData: any = {
                recordingUrl: `/api/documents/${document.id}/download`,
                documentId: document.id,
                recordingDuration: durationSecs,
                callStatus: 'completed',
                description: formattedDescription,
                leadId: entityType === 'lead' ? entityId : undefined
            };
            synchronizeDurations(updateData);
            interaction = await prisma.interaction.update({
                where: { id: existingInteraction.id },
                data: updateData
            });
        } else {
            // Create New Interaction linked to Document
            const interactionData: any = {
                organisationId: orgId || user.organisationId,
                type: 'call',
                subject: `Recorded Call with ${phoneNumber}`,
                description: formattedDescription,
                date: callDate,
                leadId: entityType === 'lead' ? entityId : undefined,
                createdById: user.id,
                recordingUrl: `/api/documents/${document.id}/download`,
                documentId: document.id,
                recordingDuration: durationSecs,
                direction: 'outbound',
                phoneNumber: phoneNumber,
                callStatus: 'completed'
            };
            synchronizeDurations(interactionData);
            interaction = await prisma.interaction.create({
                data: interactionData
            });
        }

        // 3. Update Lead stats
        if (entityType === 'lead' && entityId) {
            const currentLead = await prisma.lead.findUnique({ where: { id: entityId }, select: { status: true } });
            const newStatus = (currentLead?.status === 'new' && durationSecs > 0) ? 'contacted' : null;

            await prisma.lead.update({
                where: { id: entityId },
                data: {
                    lastContactDate: callDate,
                    ...(newStatus ? { status: newStatus } : {})
                }
            });

            if (newStatus) {
                await prisma.leadHistory.create({
                    data: {
                        leadId: entityId,
                        fieldName: 'status',
                        oldValue: currentLead?.status || 'new',
                        newValue: newStatus,
                        changedById: user.id,
                        reason: 'Auto-updated via Call Recording Upload'
                    }
                });
            }
        }

        res.json({
            message: 'Recording uploaded successfully (DB Storage)',
            interactionId: interaction.id,
            linkedTo: entityType ? `${entityType} ${entityId}` : 'Unlinked'
        });

    } catch (error: any) {
        console.error('[Upload Call] Error:', error);
        res.status(500).json({ message: 'Upload failed: ' + error.message });
    }
};

/**
 * Log a call without a recording (for when Android blocks audio capture)
 * POST /api/upload/log-call
 */
export const logCallWithoutRecording = async (req: Request, res: Response) => {
    try {
        const { phoneNumber, duration, timestamp, subject, description } = req.body;
        const user = (req as any).user;
        const orgId = getOrgId(user);

        if (!phoneNumber) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        // Clean phone number
        const cleanPhoneLog = phoneNumber.replace(/[^0-9]/g, '');
        const cleanPhone = cleanPhoneLog.length >= 10 ? cleanPhoneLog.slice(-10) : cleanPhoneLog;

        // Find Lead by phone — use index-friendly exact match variations
        const logVariations = Array.from(new Set([
            cleanPhone,
            `+91${cleanPhone}`,
            `91${cleanPhone}`,
            `0${cleanPhone}`,
            cleanPhoneLog,
            phoneNumber
        ].filter(Boolean)));

        const lead = await prisma.lead.findFirst({
            where: {
                organisationId: orgId || undefined,
                isDeleted: false,
                OR: [
                    { phone: { in: logVariations } },
                    { secondaryPhone: { in: logVariations } }
                ]
            }
        });

        // Accurate finalized description
        const durationSecs = parseInt(duration) || 0;
        const formattedDescription = description || formatCallDurationDescription(durationSecs, { hasRecording: false });

        // DEDUPLICATION: Look for an 'initiated' interaction to merge with
        const callDate = new Date(parseInt(timestamp) || Date.now());
        const searchWindowStart = new Date(callDate.getTime() - 120 * 1000); 
        const searchWindowEnd = new Date(callDate.getTime() + 120 * 1000);
        
        let existingInteraction = null;
        if (cleanPhone.length >= 10) {
            const logDedupeVariations = Array.from(new Set([
                cleanPhone,
                `+91${cleanPhone}`,
                `91${cleanPhone}`,
                `0${cleanPhone}`,
                cleanPhoneLog,
                phoneNumber
            ].filter(Boolean)));

            existingInteraction = await prisma.interaction.findFirst({
                where: {
                    organisationId: orgId || user.organisationId,
                    createdById: user.id,
                    type: 'call',
                    callStatus: 'initiated',
                    phoneNumber: { in: logDedupeVariations },
                    date: { gte: searchWindowStart, lte: searchWindowEnd }
                },
                orderBy: { date: 'desc' }
            });
        }

        let interaction;
        if (existingInteraction) {
            console.log(`[LogCall] Merging call log into initiated interaction ${existingInteraction.id}`);
            const updateData: any = {
                recordingDuration: durationSecs,
                callStatus: 'completed',
                description: formattedDescription,
                leadId: lead?.id
            };
            synchronizeDurations(updateData);
            interaction = await prisma.interaction.update({
                where: { id: existingInteraction.id },
                data: updateData
            });
        } else {
            // Create Interaction (without recording)
            const interactionData: any = {
                organisationId: orgId || user.organisationId,
                type: 'call',
                subject: subject || `Phone Call with ${phoneNumber}`,
                description: formattedDescription,
                date: callDate,
                leadId: lead?.id,
                createdById: user.id,
                recordingDuration: durationSecs,
                direction: 'outbound',
                phoneNumber: phoneNumber,
                callStatus: 'completed'
            };
            synchronizeDurations(interactionData);
            interaction = await prisma.interaction.create({
                data: interactionData
            });
        }

        res.json({
            message: 'Call logged successfully (without recording)',
            interactionId: interaction.id,
            linkedTo: lead ? `lead ${lead.id}` : 'Unlinked'
        });

    } catch (error: any) {
        console.error('[Log Call] Error:', error);
        res.status(500).json({ message: 'Log call failed: ' + error.message });
    }
};

export const uploadGenericImage = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const user = (req as any).user;
        const orgId = getOrgId(user);

        // DEBUG LOGGING
        console.log(`[UploadController] uploadGenericImage called for user ${user.id}`);
        console.log(`[UploadController] File: ${req.file.originalname}, Size: ${req.file.size}, Mime: ${req.file.mimetype}`);

        // Read file data as buffer
        const fileData = req.file.buffer;

        // Save image to database
        const document = await prisma.document.create({
            data: {
                name: req.file.originalname,
                fileKey: req.file.originalname,
                fileData: fileData,
                fileUrl: null,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
                category: 'image',
                tags: [],
                organisationId: orgId || user.organisationId,
                createdById: user.id
            }
        });

        res.json({
            message: 'Image uploaded successfully',
            url: `/api/documents/${document.id}/download`,
            documentId: document.id
        });
    } catch (error) {
        console.error('[Upload Image] Error:', error);
        res.status(500).json({ message: 'Upload failed: ' + (error as Error).message });
    }
};

export const uploadDocument = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const user = (req as any).user;
        const orgId = getOrgId(user);

        // Get optional metadata from request body
        const { name, description, category, leadId, contactId, accountId, opportunityId } = req.body;

        // Read file data as buffer
        const fileData = req.file.buffer;

        // Save document to database with binary data
        const document = await prisma.document.create({
            data: {
                name: name || req.file.originalname,
                description: description || null,
                fileKey: req.file.originalname,
                fileData: fileData, // Store binary data in database
                fileUrl: null, // No external URL needed
                fileType: req.file.mimetype,
                fileSize: req.file.size,
                category: category || 'other',
                tags: [],
                organisationId: orgId || user.organisationId,
                createdById: user.id,
                leadId: leadId || null,
                contactId: contactId || null,
                accountId: accountId || null,
                opportunityId: opportunityId || null
            }
        });

        res.json({
            message: 'Document uploaded successfully',
            url: `/api/documents/${document.id}/download`, // API endpoint to retrieve file
            originalName: req.file.originalname,
            size: req.file.size,
            documentId: document.id,
            document: {
                id: document.id,
                name: document.name,
                fileUrl: `/api/documents/${document.id}/download`,
                fileType: document.fileType,
                fileSize: document.fileSize,
                category: document.category,
                createdAt: document.createdAt
            }
        });
    } catch (error) {
        console.error('[Upload Document] Error:', error);
        res.status(500).json({ message: 'Upload failed: ' + (error as Error).message });
    }
};
