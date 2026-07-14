import { getIO } from '../socket';
import { GallaboxService } from './gallaboxService';
import prisma from '../config/prisma';


export const WhatsAppIntegrationService = {
    /**
     * Handle incoming webhook from Meta / WhatsApp Business API
     */
    async handleWebhook(payload: any): Promise<void> {
        try {
            console.log('[WhatsAppWebhook] Received Meta payload:', JSON.stringify(payload, null, 2));

            if (payload.entry) {
                for (const entry of payload.entry) {
                    if (entry.changes) {
                        for (const change of entry.changes) {
                            if (change.field === 'messages') {
                                const value = change.value;

                                // Handle incoming messages
                                if (value.messages) {
                                    for (const message of value.messages) {
                                        await this.processMetaMessage(value, message);
                                    }
                                }

                                // Handle message status updates
                                if (value.statuses) {
                                    await this.processStatusUpdate(value);
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[WhatsAppWebhook] Error processing Meta webhook:', error);
        }
    },

    /**
     * Handle incoming webhook from Gallabox
     */
    async handleGallaboxWebhook(payload: any): Promise<void> {
        try {
            console.log('[GallaboxWebhook] Received payload:', JSON.stringify(payload, null, 2));

            // Gallabox event structure check
            const event = payload.event;
            if (event !== 'Message.received') {
                console.log(`[GallaboxWebhook] Ignoring event type: ${event}`);
                return;
            }

            const data = payload.data;
            if (!data || !data.phoneNumber) {
                console.warn('[GallaboxWebhook] Missing data or phone number in payload');
                return;
            }

            // Find organisation by Gallabox Channel ID
            const channelId = data.channelId;
            const orgs = await prisma.organisation.findMany({
                select: { id: true, integrations: true }
            }).then(orgs => {
                return orgs.filter(org => {
                    const integrations = org.integrations as any;
                    return integrations?.gallabox?.channelId === channelId;
                });
            });

            if (orgs.length === 0) {
                console.log('[GallaboxWebhook] No organisation found for channelId:', channelId);
                return;
            }
            const organisationId = orgs[0].id;

            // Normalize payload for generic processing
            const normalizedMessage = {
                from: data.phoneNumber,
                id: data.id || `gallabox_${Date.now()}`,
                timestamp: Math.floor(Date.now() / 1000), // Default to current time if missing
                type: data.type === 'text' ? 'text' : 'unknown',
                body: data.messageText || '',
                senderName: data.senderName || data.phoneNumber
            };

            await this.saveIncomingMessage(organisationId, normalizedMessage, 'gallabox');

        } catch (error) {
            console.error('[GallaboxWebhook] Error processing Gallabox webhook:', error);
        }
    },

    /**
     * Parse Meta specific structure and funnel to generic saver
     */
    async processMetaMessage(value: any, message: any) {
        const { metadata, contacts } = value;
        
        // Find organisation
        const orgs = await prisma.organisation.findMany({
            select: { id: true, integrations: true }
        }).then(orgs => {
            return orgs.filter(org => {
                const integrations = org.integrations as any;
                return (integrations?.whatsapp?.phoneNumberId === metadata.phone_number_id) ||
                    (integrations?.meta?.phoneNumberId === metadata.phone_number_id);
            });
        });

        if (orgs.length === 0) return;
        const org = orgs[0];

        const contact = contacts?.find((c: any) => c.wa_id === message.from);
        
        const normalizedMessage = {
            from: message.from,
            id: message.id,
            timestamp: parseInt(message.timestamp),
            type: message.text ? 'text' : (message.image ? 'image' : (message.document ? 'document' : 'unknown')),
            body: message.text?.body || '',
            senderName: contact?.profile?.name || message.from,
            // Meta specific content expansion
            metaImage: message.image,
            metaDoc: message.document,
            metaAudio: message.audio,
            metaVideo: message.video,
            metaLocation: message.location
        };

        await this.saveIncomingMessage(org.id, normalizedMessage, 'meta');
    },

    /**
     * Unified logic for saving messages and creating leads
     */
    async saveIncomingMessage(organisationId: string, message: any, provider: string) {
        try {
            const normalizedPhone = message.from.replace(/\D/g, '');

            // Check if message already exists
            const existingMessage = await prisma.whatsAppMessage.findFirst({
                where: {
                    waMessageId: message.id,
                    organisationId
                }
            });

            if (existingMessage) return;

            // Determine content structure
            let messageType = message.type;
            const content: any = { text: message.body };

            // Handle Meta specific attachments if present
            if (provider === 'meta') {
                if (message.metaImage) {
                    messageType = 'image';
                    content.mediaUrl = message.metaImage.id;
                    content.caption = message.metaImage.caption;
                } else if (message.metaDoc) {
                    messageType = 'document';
                    content.mediaUrl = message.metaDoc.id;
                    content.fileName = message.metaDoc.filename;
                    content.caption = message.metaDoc.caption;
                }
                // ... add other Meta types if needed
            }

            // Try to find existing lead or contact
            const lead = await prisma.lead.findFirst({
                where: {
                    OR: [
                        { phone: message.from },
                        { phone: normalizedPhone },
                        { phone: `+${normalizedPhone}` }
                    ],
                    organisationId,
                    isDeleted: false
                }
            });

            const contactRecord = await prisma.$queryRawUnsafe(`
                SELECT id FROM "Contact" 
                WHERE "organisationId" = $1
                AND ("phones"::text ILIKE $2 OR "phones"::text ILIKE $3)
            `, organisationId, `%${message.from}%`, `%${normalizedPhone}%`) as any[];

            const contactId = contactRecord?.[0]?.id;

            // Create WhatsApp message record
            const messageRecord = await prisma.whatsAppMessage.create({
                data: {
                    conversationId: `${message.from}_${organisationId}`,
                    phoneNumber: message.from,
                    direction: 'incoming',
                    messageType,
                    content,
                    status: 'delivered',
                    waMessageId: message.id,
                    deliveredAt: new Date(message.timestamp * 1000),
                    organisationId,
                    leadId: lead?.id,
                    contactId: contactId,
                    isReadByAgent: false
                }
            });

            // Create lead if none exists and link to message
            if (!lead && !contactId) {
                const contactName = message.senderName || message.from;
                const cleanPhone = normalizedPhone; // Service handles normalization

                // Resolve target branch early to isolate duplicate check
                const { DistributionService } = await import('./distributionService');
                const { DuplicateLeadService } = await import('./duplicateLeadService');

                // Simulate distribution to find target owner and their branch
                // We use a dummy lead object for simulation
                const targetOwnerId = await DistributionService.assignLead(
                    { firstName: contactName, phone: cleanPhone, organisationId },
                    organisationId
                );

                let targetBranchId = null;
                if (targetOwnerId) {
                    const assignedUser = await prisma.user.findUnique({
                        where: { id: targetOwnerId },
                        select: { branchId: true }
                    });
                    targetBranchId = assignedUser?.branchId || null;
                }

                // Check for duplicates in the RESOLVED branch
                const duplicateCheck = await DuplicateLeadService.checkDuplicate(
                    cleanPhone, 
                    null, 
                    organisationId, 
                    targetBranchId
                );

                let leadToLink;

                if (duplicateCheck.isDuplicate && duplicateCheck.existingLead) {
                    await DuplicateLeadService.handleReEnquiry(
                        duplicateCheck.existingLead,
                        {
                            firstName: contactName.split(' ')[0] || contactName,
                            lastName: contactName.split(' ').slice(1).join(' ') || '',
                            phone: cleanPhone,
                            source: 'whatsapp',
                            sourceDetails: { provider, messageId: message.id }
                        },
                        organisationId
                    );
                    leadToLink = duplicateCheck.existingLead;
                } else {
                    const newLead = await prisma.lead.create({
                        data: {
                            firstName: contactName.split(' ')[0] || contactName,
                            lastName: contactName.split(' ').slice(1).join(' ') || '',
                            phone: cleanPhone,
                            source: 'whatsapp',
                            status: 'new',
                            organisationId,
                            assignedToId: targetOwnerId || undefined,
                            branchId: targetBranchId
                        }
                    });
                    leadToLink = newLead;
                }

                await prisma.whatsAppMessage.update({
                    where: { id: messageRecord.id },
                    data: { leadId: leadToLink.id }
                });
            }

            // Real-time notification
            const io = getIO();
            if (io) {
                io.to(`org:${organisationId}`).emit('whatsapp_message_received', {
                    message: messageRecord,
                    phoneNumber: message.from
                });
            }
        } catch (error) {
            console.error('[WhatsAppWebhook] Error in saveIncomingMessage:', error);
        }
    },

    /**
     * Handle message status updates (Meta specific but expandable)
     */
    async processStatusUpdate(value: any) {
        const { statuses } = value;
        if (!statuses || statuses.length === 0) return;

        for (const status of statuses) {
            try {
                const updateData: any = { status: status.status };
                if (status.status === 'delivered') updateData.deliveredAt = new Date(parseInt(status.timestamp) * 1000);
                else if (status.status === 'read') updateData.readAt = new Date(parseInt(status.timestamp) * 1000);
                else if (status.status === 'failed') {
                    updateData.errorCode = status.errors?.[0]?.code;
                    updateData.errorMessage = status.errors?.[0]?.title;
                }

                const updatedMessage = await prisma.whatsAppMessage.updateMany({
                    where: { waMessageId: status.id },
                    data: updateData
                });

                if (updatedMessage.count > 0) {
                    const { CampaignProcessor } = await import('./campaignProcessor');
                    const message = await prisma.whatsAppMessage.findFirst({
                        where: { waMessageId: status.id },
                        select: { id: true, organisationId: true, phoneNumber: true }
                    });

                    if (message) {
                        await CampaignProcessor.updateCampaignStats(message.id, status.status);
                        const io = getIO();
                        if (io) {
                            io.to(`org:${message.organisationId}`).emit('whatsapp_status_update', {
                                messageId: status.id,
                                dbMessageId: message.id,
                                status: status.status,
                                phoneNumber: message.phoneNumber
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('[WhatsAppWebhook] Error updating status:', error);
            }
        }
    },

    /**
     * Verify Webhook (Meta GET request)
     */
    async verifyWebhook(req: any, res: any): Promise<void> {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

        if (!VERIFY_TOKEN) return res.sendStatus(500);

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
};