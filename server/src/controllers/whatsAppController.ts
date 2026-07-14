import { Request, Response } from 'express';
import { WhatsAppService } from '../services/whatsAppService';
import { WhatsAppIntegrationService } from '../services/whatsAppIntegrationService';
import { GallaboxService } from '../services/gallaboxService';
import { getOrgId, getVisibleUserIds } from '../utils/hierarchyUtils';
import { getIO } from '../socket';

// Type extension for Request to include user
interface AuthRequest extends Request {
    user?: {
        id: string;
        organisationId: string;
    };
}

import { decrypt } from '../utils/encryption';
import prisma from '../config/prisma';


export const getWhatsAppConfig = async (req: AuthRequest) => {
    if (!req.user?.organisationId) {
        throw new Error('User not authenticated or missing organisation');
    }

    const org = await prisma.organisation.findUnique({
        where: { id: req.user.organisationId }
    });

    if (!org) throw new Error('Organisation not found');

    const integrations = org.integrations as any;

    // Check for dedicated WhatsApp config first
    let whatsappConfig = integrations?.whatsapp;

    // Fallback to meta config for backward compatibility
    if (!whatsappConfig?.connected && integrations?.meta?.phoneNumberId) {
        whatsappConfig = {
            accessToken: integrations.meta.accessToken,
            phoneNumberId: integrations.meta.phoneNumberId,
            wabaId: integrations.meta.wabaId,
            connected: integrations.meta.connected
        };
    }

    if (!whatsappConfig?.connected || !whatsappConfig.phoneNumberId || !whatsappConfig.accessToken) {
        throw new Error('WhatsApp integration not configured. Please check settings.');
    }

    // Decrypt the token before using it
    return {
        ...whatsappConfig,
        accessToken: decrypt(whatsappConfig.accessToken)
    };
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
    try {
        // Validate required fields
        const { to, message, type = 'text' } = req.body;

        if (!to) {
            return res.status(400).json({ message: 'Phone number (to) is required' });
        }

        // Validate phone number format
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(to)) {
            return res.status(400).json({ message: 'Phone number must be in international format (+1234567890)' });
        }

        if (type === 'text' && !message) {
            return res.status(400).json({ message: 'Message text is required for text messages' });
        }

        if (type === 'template' && !req.body.templateName) {
            return res.status(400).json({ message: 'Template name is required for template messages' });
        }

        // Sanitize message content
        const sanitizedMessage = message ? message.trim().substring(0, 4096) : undefined;

        let result;
        let waMessageId;

        // Try Meta WhatsApp first
        try {
            const config = await getWhatsAppConfig(req);
            const whatsAppService = new WhatsAppService({
                accessToken: config.accessToken,
                phoneNumberId: config.phoneNumberId,
                wabaId: config.wabaId
            });

            if (type === 'template') {
                const { templateName, languageCode = 'en_US', components = [] } = req.body;
                result = await whatsAppService.sendTemplateMessage(to, templateName, languageCode, components);
            } else {
                result = await whatsAppService.sendTextMessage(to, sanitizedMessage!);
            }
            waMessageId = result.messages?.[0]?.id;
        } catch (metaError) {
            // If Meta fails/not configured, try Gallabox
            const user = (req as any).user;
            const gallabox = await GallaboxService.getClientForOrg(user.organisationId);
            
            if (gallabox) {
                if (type === 'template') {
                    throw new Error('Template messages are currently only supported via Meta WhatsApp integration.');
                }
                result = await gallabox.sendWhatsAppMessage(to, sanitizedMessage!);
                waMessageId = result.messageId; // Gallabox specific ID field
            } else {
                // If both fail, throw the original error
                throw metaError;
            }
        }

        // Log the message to database
        const user = req.user;
        const orgId = getOrgId(user);

        if (orgId) {
            await prisma.whatsAppMessage.create({
                data: {
                    conversationId: `${to}_${Date.now()}`,
                    phoneNumber: to,
                    direction: 'outgoing',
                    messageType: type,
                    content: {
                        text: type === 'text' ? sanitizedMessage : undefined,
                        templateName: type === 'template' ? req.body.templateName : undefined,
                        language: type === 'template' ? req.body.languageCode : undefined,
                        components: type === 'template' ? req.body.components : undefined
                    },
                    status: 'sent',
                    waMessageId: waMessageId,
                    sentAt: new Date(),
                    organisationId: orgId,
                    agentId: user?.id
                }
            });

            // Real-time socket notification for outgoing message
            const io = getIO();
            if (io && orgId) {
                io.to(`org:${orgId}`).emit('whatsapp_message_received', {
                    message: {
                        phoneNumber: to,
                        direction: 'outgoing',
                        messageType: type,
                        content: {
                            text: type === 'text' ? sanitizedMessage : undefined,
                            templateName: type === 'template' ? req.body.templateName : undefined,
                            language: type === 'template' ? req.body.languageCode : undefined,
                            components: type === 'template' ? req.body.components : undefined
                        },
                        status: 'sent',
                        sentAt: new Date(),
                        organisationId: orgId,
                        agentId: user?.id
                    },
                    phoneNumber: to
                });
            }
        }

        res.json({ success: true, result });
    } catch (error: any) {
        console.error('Error in sendMessage:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user as any;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No organisation found' });

        const { phoneNumber, limit = 50, offset = 0 } = req.query;

        const visibleUserIds = await getVisibleUserIds(user.id);
        const isOrgAdmin = user.role === 'organisation_admin' || user.role === 'org_admin' || user.role === 'super_admin';

        const where: any = {
            organisationId: orgId,
            isDeleted: false
        };

        if (!isOrgAdmin) {
            where.OR = [
                { agentId: { in: visibleUserIds } },
                { lead: { assignedToId: { in: visibleUserIds } } },
                { lead: { createdById: { in: visibleUserIds } } },
                { contact: { ownerId: { in: visibleUserIds } } },
            ];
        }

        if (phoneNumber) {
            where.phoneNumber = phoneNumber;
        }

        const messages = await prisma.whatsAppMessage.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
            skip: Number(offset),
            include: {
                agent: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                },
                lead: {
                    select: { id: true, firstName: true, lastName: true, email: true, phone: true }
                },
                contact: {
                    select: { id: true, firstName: true, lastName: true, email: true, phones: true }
                }
            }
        });

        res.json(messages);
    } catch (error: any) {
        console.error('Error in getMessages:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getLeadWhatsAppMessages = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No organisation found' });

        const { leadId } = req.params;
        if (!leadId) return res.status(400).json({ message: 'Lead ID is required' });

        // Get the lead's phone number for matching
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            select: { phone: true, secondaryPhone: true }
        });

        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        // Build exact phone number variants to match using the B-Tree index.
        // Avoids a full-table LIKE scan by querying exact formats stored in the DB.
        const buildPhoneVariants = (phone: string): string[] => {
            const digits = phone.replace(/[^0-9]/g, '');
            const last10 = digits.slice(-10);
            if (last10.length < 10) return [];
            return [...new Set([last10, `+91${last10}`, `91${last10}`, `0${last10}`, phone.trim()])];
        };

        const phoneVariantSet = new Set<string>();
        if (lead.phone) buildPhoneVariants(lead.phone).forEach(v => phoneVariantSet.add(v));
        if (lead.secondaryPhone) buildPhoneVariants(lead.secondaryPhone).forEach(v => phoneVariantSet.add(v));

        const agentSelect = { select: { id: true, firstName: true, lastName: true } } as const;

        // 1a. Fetch by leadId — uses WhatsAppMessage_leadId_idx (fast B-Tree scan)
        const byLeadId = await prisma.whatsAppMessage.findMany({
            where: { organisationId: orgId, isDeleted: false, leadId },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { agent: agentSelect }
        });

        // 1b. Fetch by exact phone variants — uses WhatsAppMessage_phoneNumber_idx (fast B-Tree scan)
        const byPhone = phoneVariantSet.size > 0
            ? await prisma.whatsAppMessage.findMany({
                where: {
                    organisationId: orgId,
                    isDeleted: false,
                    phoneNumber: { in: Array.from(phoneVariantSet) }
                },
                orderBy: { createdAt: 'desc' },
                take: 100,
                include: { agent: agentSelect }
            })
            : [];

        // Merge, deduplicate by id, re-sort, cap at 100
        const seen = new Set<string>();
        const waMessages = [...byLeadId, ...byPhone]
            .filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 100);

        // 2. Fetch Interaction records with type='whatsapp' 
        const waInteractions = await prisma.interaction.findMany({
            where: {
                leadId,
                type: 'whatsapp',
                isDeleted: false
            },
            orderBy: { date: 'desc' },
            take: 100,
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true } }
            }
        });

        // Normalize both into a unified format
        const normalized = [
            ...waMessages.map(m => ({
                id: m.id,
                source: 'whatsapp_message' as const,
                direction: m.direction === 'incoming' ? 'inbound' : 'outbound',
                messageType: m.messageType,
                content: (m.content as any)?.text || (m.content as any)?.templateName || m.messageType,
                status: m.status,
                phoneNumber: m.phoneNumber,
                date: m.sentAt || m.createdAt,
                actor: m.agent ? `${m.agent.firstName} ${m.agent.lastName || ''}`.trim() : null
            })),
            ...waInteractions.map(i => ({
                id: i.id,
                source: 'interaction' as const,
                direction: i.direction || 'outbound',
                messageType: 'text',
                content: i.description || i.subject || 'WhatsApp message',
                status: 'logged',
                phoneNumber: i.phoneNumber,
                date: i.date,
                actor: i.createdBy ? `${i.createdBy.firstName} ${i.createdBy.lastName || ''}`.trim() : null,
                subject: i.subject,
                description: i.description,
                duration: i.duration,
                recordingDuration: i.recordingDuration,
                hardwareDuration: i.hardwareDuration,
                callStatus: i.callStatus,
                recordingUrl: i.recordingUrl
            }))
        ];

        const isWhatsAppCall = (msg: any) => {
            const desc = (msg.description || msg.content || '').toLowerCase();
            const subj = (msg.subject || '').toLowerCase();
            return (
                subj.includes('call') ||
                desc.includes('voice call') ||
                desc.includes('video call') ||
                desc.includes('call not connected') ||
                desc.includes('initiated whatsapp call')
            );
        };

        // Determine record priority: ended calls with durations > raw "ongoing" notifications
        const getPriority = (item: any) => {
            const content = (item.content || '').toLowerCase();
            const callStatus = (item.callStatus || '').toLowerCase();
            
            if (content.includes('ongoing') || content.includes('ringing')) {
                return 0;
            }
            
            if (item.source === 'interaction' && (item.duration > 0 || ['completed', 'missed', 'failed', 'rejected'].includes(callStatus))) {
                return 2;
            }
            
            return 1;
        };

        // Sort normalized array by priority descending, then date descending
        normalized.sort((a, b) => {
            const pA = getPriority(a);
            const pB = getPriority(b);
            if (pA !== pB) return pB - pA;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        // Deduplicate by timestamp proximity (60s for calls, 5s for messages)
        const seenCallKeys = new Set<string>();
        const seenMessageKeys = new Set<string>();

        const deduped = normalized.filter(item => {
            const time = new Date(item.date).getTime();
            if (isWhatsAppCall(item)) {
                // Deduplicate calls within the same 60-second window by direction
                const key = `${item.direction}_${Math.floor(time / 60000)}`;
                if (seenCallKeys.has(key)) return false;
                seenCallKeys.add(key);
                return true;
            } else {
                // Deduplicate messages within the same 5-second window by direction and content
                const key = `${item.direction}_${Math.floor(time / 5000)}_${item.content}`;
                if (seenMessageKeys.has(key)) return false;
                seenMessageKeys.add(key);
                return true;
            }
        });

        // Sanitize call descriptions (e.g. if the call has ended or date is in the past, it's not "ongoing" anymore!)
        const sanitized = deduped.map(item => {
            if (isWhatsAppCall(item)) {
                let content = item.content || '';
                const lowerContent = content.toLowerCase();
                const timeDiffMins = (Date.now() - new Date(item.date).getTime()) / 60000;
                
                if (lowerContent.includes('ongoing voice call') || lowerContent.includes('ongoing video call')) {
                    if (timeDiffMins > 2 || ((item as any).duration && (item as any).duration > 0)) {
                        content = lowerContent.includes('video') ? 'Video call' : 'Voice call';
                    }
                }
                
                return {
                    ...item,
                    content
                };
            }
            return item;
        });

        // Sort by date descending strictly for final output
        sanitized.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        res.json(sanitized);
    } catch (error: any) {
        console.error('Error in getLeadWhatsAppMessages:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getConversations = async (req: AuthRequest, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No organisation found' });

        const visibleUserIds = await getVisibleUserIds(user.id);
        const isOrgAdmin = user.role === 'organisation_admin' || user.role === 'org_admin' || user.role === 'super_admin';

        const visibilityFilter: any = isOrgAdmin ? {} : {
            OR: [
                { agentId: { in: visibleUserIds } },
                { lead: { assignedToId: { in: visibleUserIds } } },
                { lead: { createdById: { in: visibleUserIds } } },
                { contact: { ownerId: { in: visibleUserIds } } }
            ]
        };

        // 1. Get unique phone numbers (conversations)
        const conversations = await prisma.whatsAppMessage.groupBy({
            by: ['phoneNumber'],
            where: {
                organisationId: orgId,
                isDeleted: false,
                ...visibilityFilter
            },
            _max: {
                createdAt: true
            },
            orderBy: {
                _max: {
                    createdAt: 'desc'
                }
            }
        });

        // 2. Fetch details for each conversation (latest message, contact info)
        const conversationDetails = await Promise.all(conversations.map(async (conv) => {
            const lastMessage = await prisma.whatsAppMessage.findFirst({
                where: {
                    organisationId: orgId,
                    phoneNumber: conv.phoneNumber,
                    ...visibilityFilter
                },
                include: {
                    lead: { select: { firstName: true, lastName: true, assignedToId: true } },
                    contact: { select: { firstName: true, lastName: true, ownerId: true } },
                    agent: { select: { firstName: true, lastName: true } }
                }
            });

            // Determine display name
            let displayName = conv.phoneNumber;
            if ((lastMessage as any)?.contact) {
                const contact = (lastMessage as any).contact;
                displayName = `${contact.firstName} ${contact.lastName}`;
            } else if ((lastMessage as any)?.lead) {
                const lead = (lastMessage as any).lead;
                displayName = `${lead.firstName} ${lead.lastName}`;
            }

            // Count unread messages for this specific conversation
            const unreadCount = await prisma.whatsAppMessage.count({
                where: {
                    organisationId: orgId,
                    phoneNumber: conv.phoneNumber,
                    direction: 'incoming',
                    isReadByAgent: false,
                    isDeleted: false,
                    ...visibilityFilter
                }
            });

            return {
                phoneNumber: conv.phoneNumber,
                lastMessage: lastMessage?.content,
                lastMessageAt: lastMessage?.createdAt,
                displayName: displayName.trim(),
                leadId: lastMessage?.leadId,
                contactId: lastMessage?.contactId,
                messageType: lastMessage?.messageType,
                unreadCount,
                lastAgentId: lastMessage?.agentId,
                lastAgentName: (lastMessage as any)?.agent ? `${(lastMessage as any).agent.firstName} ${(lastMessage as any).agent.lastName || ''}`.trim() : null,
                ownerId: (lastMessage as any)?.lead?.assignedToId || (lastMessage as any)?.contact?.ownerId || null
            };
        }));

        res.json(conversationDetails);
    } catch (error: any) {
        console.error('Error in getConversations:', error);
        res.status(500).json({ message: error.message });
    }
};

export const testConnection = async (req: AuthRequest, res: Response) => {
    try {
        const config = await getWhatsAppConfig(req);

        const whatsAppService = new WhatsAppService({
            accessToken: config.accessToken,
            phoneNumberId: config.phoneNumberId,
            wabaId: config.wabaId
        });

        // Test by getting phone number info
        const response = await whatsAppService.makeRequest(`${config.phoneNumberId}`, config.accessToken, {
            fields: 'display_phone_number,verified_name,quality_rating'
        });

        res.json({
            success: true,
            phoneNumber: response.display_phone_number,
            verifiedName: response.verified_name,
            qualityRating: response.quality_rating
        });
    } catch (error: any) {
        console.error('Error in testConnection:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getTemplates = async (req: AuthRequest, res: Response) => {
    try {
        const config = await getWhatsAppConfig(req);

        if (!config.wabaId) {
            return res.status(400).json({ message: 'WABA ID required to fetch templates' });
        }

        const whatsAppService = new WhatsAppService({
            accessToken: config.accessToken,
            phoneNumberId: config.phoneNumberId,
            wabaId: config.wabaId
        });

        const response = await whatsAppService.makeRequest(`${config.wabaId}/message_templates`, config.accessToken, {
            fields: 'name,status,category,language,components'
        });

        res.json(response.data || []);
    } catch (error: any) {
        console.error('Error in getTemplates:', error);
        res.status(500).json({ message: error.message });
    }
};

export const createTemplate = async (req: AuthRequest, res: Response) => {
    try {
        const config = await getWhatsAppConfig(req);

        if (!config.wabaId) {
            return res.status(400).json({ message: 'WABA ID required to create templates' });
        }

        const whatsAppService = new WhatsAppService({
            accessToken: config.accessToken,
            phoneNumberId: config.phoneNumberId,
            wabaId: config.wabaId
        });

        const result = await whatsAppService.createTemplate(req.body);
        res.json(result);
    } catch (error: any) {
        console.error('Error in createTemplate:', error);
        res.status(500).json({ message: error.message });
    }
};

export const sendMediaMessage = async (req: AuthRequest, res: Response) => {
    try {
        const { to, mediaType, mediaId, caption, filename } = req.body;

        if (!to || !mediaType || !mediaId) {
            return res.status(400).json({ message: 'Phone number, media type, and media ID are required' });
        }

        const config = await getWhatsAppConfig(req);

        const whatsAppService = new WhatsAppService({
            accessToken: config.accessToken,
            phoneNumberId: config.phoneNumberId,
            wabaId: config.wabaId
        });

        const result = await whatsAppService.sendMediaMessage(to, mediaType, mediaId, caption, filename);

        // Log the message to database
        const user = req.user;
        const orgId = getOrgId(user);

        if (orgId) {
            await prisma.whatsAppMessage.create({
                data: {
                    conversationId: `${to}_${Date.now()}`,
                    phoneNumber: to,
                    direction: 'outgoing',
                    messageType: mediaType,
                    content: {
                        mediaId,
                        caption,
                        filename
                    },
                    status: 'sent',
                    waMessageId: result.messages?.[0]?.id,
                    sentAt: new Date(),
                    organisationId: orgId,
                    agentId: user?.id
                }
            });
        }

        res.json({ success: true, result });
    } catch (error: any) {
        console.error('Error in sendMediaMessage:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getMessageStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { messageId } = req.params;

        if (!messageId) {
            return res.status(400).json({ message: 'Message ID is required' });
        }

        const config = await getWhatsAppConfig(req);

        const whatsAppService = new WhatsAppService({
            accessToken: config.accessToken,
            phoneNumberId: config.phoneNumberId,
            wabaId: config.wabaId
        });

        const result = await whatsAppService.getMessageStatus(messageId);
        res.json(result);
    } catch (error: any) {
        console.error('Error in getMessageStatus:', error);
        res.status(500).json({ message: error.message });
    }
};

export const markMessageAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const { messageId } = req.body;
        const user = req.user;
        const orgId = getOrgId(user);

        if (!orgId) {
            return res.status(400).json({ message: 'No organisation found' });
        }

        if (!messageId) {
            return res.status(400).json({ message: 'Message ID is required' });
        }

        const config = await getWhatsAppConfig(req);

        const whatsAppService = new WhatsAppService({
            accessToken: config.accessToken,
            phoneNumberId: config.phoneNumberId,
            wabaId: config.wabaId
        });

        // Update internal database
        await prisma.whatsAppMessage.updateMany({
            where: {
                waMessageId: messageId as string,
                organisationId: orgId as string
            },
            data: {
                isReadByAgent: true
            }
        });

        const result = await whatsAppService.markMessageAsRead(messageId);
        res.json({ success: true, result });
    } catch (error: any) {
        console.error('Error in markMessageAsRead:', error);
        res.status(500).json({ message: error.message });
    }
};

export const markConversationAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const { phoneNumber } = req.body;
        const user = req.user;
        const orgId = getOrgId(user);

        if (!phoneNumber) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        if (!orgId) return res.status(400).json({ message: 'No organisation found' });

        await prisma.whatsAppMessage.updateMany({
            where: {
                organisationId: orgId,
                phoneNumber,
                direction: 'incoming',
                isReadByAgent: false
            },
            data: {
                isReadByAgent: true
            }
        });

        // Notify via socket to refresh conversation list in other tabs
        const io = getIO();
        if (io) {
            io.to(`org:${orgId}`).emit('whatsapp_conversation_read', {
                phoneNumber
            });
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('Error in markConversationAsRead:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getConversationAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date are required' });
        }

        const config = await getWhatsAppConfig(req);

        const whatsAppService = new WhatsAppService({
            accessToken: config.accessToken,
            phoneNumberId: config.phoneNumberId,
            wabaId: config.wabaId
        });

        const result = await whatsAppService.getConversationAnalytics(startDate as string, endDate as string);
        res.json(result);
    } catch (error: any) {
        console.error('Error in getConversationAnalytics:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getMessageStatistics = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user as any;
        const orgId = getOrgId(user);
        if (!orgId) return res.status(400).json({ message: 'No organisation found' });

        const { startDate, endDate, phoneNumber } = req.query;

        const visibleUserIds = await getVisibleUserIds(user.id);
        const isOrgAdmin = user.role === 'organisation_admin' || user.role === 'org_admin' || user.role === 'super_admin';

        const where: any = {
            organisationId: orgId,
            isDeleted: false
        };

        if (!isOrgAdmin) {
            where.OR = [
                { agentId: { in: visibleUserIds } },
                { lead: { assignedToId: { in: visibleUserIds } } },
                { lead: { createdById: { in: visibleUserIds } } },
                { contact: { ownerId: { in: visibleUserIds } } },
            ];
        }

        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string)
            };
        }

        if (phoneNumber) {
            where.phoneNumber = phoneNumber;
        }

        // Get message counts by status
        const statusCounts = await prisma.whatsAppMessage.groupBy({
            by: ['status'],
            where,
            _count: {
                id: true
            }
        });

        // Get message counts by type
        const typeCounts = await prisma.whatsAppMessage.groupBy({
            by: ['messageType'],
            where,
            _count: {
                id: true
            }
        });

        // Get message counts by direction
        const directionCounts = await prisma.whatsAppMessage.groupBy({
            by: ['direction'],
            where,
            _count: {
                id: true
            }
        });

        // Get total messages
        const totalMessages = await prisma.whatsAppMessage.count({ where });

        // Get unique conversations
        const uniqueConversations = await prisma.whatsAppMessage.findMany({
            where,
            select: { phoneNumber: true },
            distinct: ['phoneNumber']
        });

        res.json({
            totalMessages,
            uniqueConversations: uniqueConversations.length,
            statusBreakdown: statusCounts.reduce((acc, item) => {
                acc[item.status] = item._count.id;
                return acc;
            }, {} as Record<string, number>),
            typeBreakdown: typeCounts.reduce((acc, item) => {
                acc[item.messageType] = item._count.id;
                return acc;
            }, {} as Record<string, number>),
            directionBreakdown: directionCounts.reduce((acc, item) => {
                acc[item.direction] = item._count.id;
                return acc;
            }, {} as Record<string, number>)
        });
    } catch (error: any) {
        console.error('Error in getMessageStatistics:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getMedia = async (req: AuthRequest, res: Response) => {
    try {
        const { mediaId } = req.params;
        if (!mediaId) {
            return res.status(400).json({ message: 'Media ID is required' });
        }

        const config = await getWhatsAppConfig(req);
        const whatsAppService = new WhatsAppService({
            accessToken: config.accessToken,
            phoneNumberId: config.phoneNumberId,
            wabaId: config.wabaId
        });

        // 1. Get media URL
        const mediaUrl = await whatsAppService.getMediaUrl(mediaId);

        // 2. Download/Proxy media
        const mediaStream = await whatsAppService.downloadMedia(mediaUrl);

        mediaStream.pipe(res);
    } catch (error: any) {
        console.error('Error in getMedia:', error);
        res.status(500).json({ message: error.message });
    }
};
export const uploadMedia = async (req: any, res: any) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const config = await getWhatsAppConfig(req);
        const whatsAppService = new WhatsAppService({
            accessToken: config.accessToken,
            phoneNumberId: config.phoneNumberId,
            wabaId: config.wabaId
        });

        const result = await whatsAppService.uploadMedia(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
        );

        res.json(result);
    } catch (error: any) {
        console.error('Error in uploadMedia:', error);
        res.status(500).json({ message: error.message });
    }
};

export const handleWebhook = async (req: Request, res: Response) => {
    try {
        const signature = req.headers['x-hub-signature-256'] as string;
        const appSecret = process.env.WHATSAPP_APP_SECRET;

        if (appSecret && signature) {
            const isValid = WhatsAppService.verifySignature(
                JSON.stringify(req.body),
                signature,
                appSecret
            );

            if (!isValid) {
                console.warn('[WhatsAppWebhook] Invalid signature');
                return res.sendStatus(401);
            }
        }

        await WhatsAppIntegrationService.handleWebhook(req.body);
        res.sendStatus(200);
    } catch (error: any) {
        console.error('Error in handleWebhook:', error);
        res.status(500).json({ message: error.message });
    }
};

export const verifyWebhook = async (req: Request, res: Response) => {
    try {
        await WhatsAppIntegrationService.verifyWebhook(req, res);
    } catch (error: any) {
        console.error('Error in verifyWebhook:', error);
        res.status(500).json({ message: error.message });
    }
};

export const handleGallaboxWebhook = async (req: Request, res: Response) => {
    try {
        const signature = req.headers['x-gallabox-signature'] as string;
        const secret = process.env.GALLABOX_WEBHOOK_SECRET;

        // If secret is configured, verify signature
        if (secret && signature) {
            const isValid = GallaboxService.verifySignature(
                JSON.stringify(req.body),
                signature,
                secret
            );

            if (!isValid) {
                console.warn('[GallaboxWebhook] Invalid signature');
                return res.sendStatus(401);
            }
        }

        await WhatsAppIntegrationService.handleGallaboxWebhook(req.body);
        res.sendStatus(200);
    } catch (error: any) {
        console.error('Error in handleGallaboxWebhook:', error);
        res.status(500).json({ message: error.message });
    }
};

export function parseWhatsAppCallDuration(text: string): number | null {
    if (!text) return null;
    const lower = text.toLowerCase();
    
    // Check if it's a call-related notification
    const isCall = lower.includes('call') || lower.includes('voice') || lower.includes('video');
    if (!isCall) {
        return null;
    }
    
    // Match format: 00:00:00 or 00:00 or 0:00
    const timeMatch = lower.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
    if (timeMatch) {
        const parts = timeMatch.filter(Boolean);
        if (parts.length === 3) {
            // MM:SS
            const mins = parseInt(timeMatch[1], 10);
            const secs = parseInt(timeMatch[2], 10);
            return mins * 60 + secs;
        } else if (parts.length === 4) {
            // HH:MM:SS
            const hrs = parseInt(timeMatch[1], 10);
            const mins = parseInt(timeMatch[2], 10);
            const secs = parseInt(timeMatch[3], 10);
            return hrs * 3600 + mins * 60 + secs;
        }
    }
    
    // Match text representation: e.g. "5 mins, 20 secs", "45 secs", "1 hr, 2 mins"
    let seconds = 0;
    let matched = false;
    
    // Hrs
    const hrMatch = lower.match(/(\d+)\s*(?:hr|hour|h)s?/);
    if (hrMatch) {
        seconds += parseInt(hrMatch[1], 10) * 3600;
        matched = true;
    }
    
    // Mins
    const minMatch = lower.match(/(\d+)\s*(?:min|minute|m)s?/);
    if (minMatch) {
        seconds += parseInt(minMatch[1], 10) * 60;
        matched = true;
    }
    
    // Secs
    const secMatch = lower.match(/(\d+)\s*(?:sec|second|s)s?/);
    if (secMatch) {
        seconds += parseInt(secMatch[1], 10);
        matched = true;
    }
    
    if (matched) {
        return seconds;
    }
    
    return null;
}

export const logExternalMessage = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user || !user.organisationId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const { phoneNumber, messageText, direction, timestamp, leadId, duration, callDuration } = req.body;

        if (!phoneNumber || !messageText) {
            return res.status(400).json({ error: 'phoneNumber and messageText are required.' });
        }

        // 0. Check if WhatsApp sync is enabled for this organisation
        const organisation = await prisma.organisation.findUnique({
            where: { id: user.organisationId },
            select: { whatsAppScrapingEnabled: true }
        });

        if (!organisation?.whatsAppScrapingEnabled) {
            console.log(`[WhatsAppSync] Request rejected: Sync is disabled for org ${user.organisationId}`);
            return res.status(200).json({ 
                success: false, 
                message: 'WhatsApp synchronization is currently disabled by the administrator.' 
            });
        }

        console.log(`[WhatsAppSync] Request: phone=${phoneNumber}, leadId=${leadId}, direction=${direction}`);

        let targetLeadId = leadId;
        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
        const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : null;

        // 1. Lead Lookup (if not provided or to verify)
        if (!targetLeadId && last10) {
            const variations = Array.from(new Set([
                last10,
                `+91${last10}`,
                `91${last10}`,
                `0${last10}`,
                cleanPhone,
                phoneNumber
            ].filter(Boolean)));

            const lead = await prisma.lead.findFirst({
                where: {
                    organisationId: user.organisationId,
                    isDeleted: false,
                    OR: [
                        { phone: { in: variations } },
                        { secondaryPhone: { in: variations } }
                    ]
                },
                select: { id: true, firstName: true }
            });
            if (lead) {
                targetLeadId = lead.id;
                console.log(`[WhatsAppSync] Found matching lead: ${lead.firstName} (${lead.id}) by phone ${last10}`);
            }
        }
        
        // Fallback: If still no lead found, try matching by name (phoneNumber field might contain a name)
        if (!targetLeadId && phoneNumber && phoneNumber.length > 2) {
                const leadByName = await prisma.lead.findFirst({
                    where: {
                        organisationId: user.organisationId,
                        OR: [
                            { firstName: { equals: phoneNumber, mode: 'insensitive' } },
                            { lastName: { equals: phoneNumber, mode: 'insensitive' } }
                        ],
                        isDeleted: false
                    },
                    select: { id: true, firstName: true }
                });
                if (leadByName) {
                    targetLeadId = leadByName.id;
                    console.log(`[WhatsAppSync] Found matching lead: ${leadByName.firstName} (${leadByName.id}) by name fallback: ${phoneNumber}`);
                }
            }
        

        // 1.5 Parse WhatsApp call duration from body or message text
        let durationSecs = 0;
        if (duration !== undefined && duration !== null) {
            durationSecs = parseInt(String(duration), 10) || 0;
        } else if (callDuration !== undefined && callDuration !== null) {
            durationSecs = parseInt(String(callDuration), 10) || 0;
        } else {
            durationSecs = parseWhatsAppCallDuration(messageText) || 0;
        }
        
        const durationMinutes = durationSecs / 60;

        // 2. Deduplicate: Check if a WhatsApp interaction already exists within a 5-min window
        const callDate = timestamp ? new Date(parseInt(timestamp, 10)) : new Date();
        const windowStart = new Date(callDate.getTime() - 5 * 60 * 1000);
        const windowEnd = new Date(callDate.getTime() + 5 * 60 * 1000);

        // Normalize direction: accept inbound/incoming as 'inbound' and outbound/outgoing as 'outbound'
        const rawDirection = String(direction || '').toLowerCase().trim();
        const isInbound = ['inbound', 'incoming', 'in', '1'].includes(rawDirection);
        const normalizedDirection: 'inbound' | 'outbound' = isInbound ? 'inbound' : 'outbound';
        const msgDirection: 'incoming' | 'outgoing' = isInbound ? 'incoming' : 'outgoing';

        const existingInteraction = await prisma.interaction.findFirst({
            where: {
                organisationId: user.organisationId,
                type: 'whatsapp' as any,
                leadId: targetLeadId || undefined,
                phoneNumber: targetLeadId ? undefined : phoneNumber,
                date: { gte: windowStart, lte: windowEnd },
                direction: normalizedDirection
            },
            orderBy: { date: 'desc' }
        });

        let interaction;
        if (existingInteraction) {
            console.log(`[WhatsAppSync] Healing existing interaction ${existingInteraction.id}`);
            
            const shouldUpdateDuration = durationSecs > 0 || (existingInteraction.duration || 0) === 0;
            
            interaction = await prisma.interaction.update({
                where: { id: existingInteraction.id },
                data: {
                    description: messageText,
                    date: callDate, // Keep it fresh
                    duration: shouldUpdateDuration ? (Math.round(durationMinutes * 100) / 100) : undefined,
                    recordingDuration: shouldUpdateDuration ? durationSecs : undefined,
                    callStatus: durationSecs > 0 ? 'completed' : existingInteraction.callStatus
                }
            });
        } else {
            console.log(`[WhatsAppSync] Creating NEW interaction for ${phoneNumber}`);
            
            // Map status based on duration if it is a call
            let status = 'completed';
            const lowerMessage = messageText.toLowerCase();
            const isCall = lowerMessage.includes('call') || lowerMessage.includes('voice') || lowerMessage.includes('video');
            
            if (isCall) {
                if (lowerMessage.includes('missed') || lowerMessage.includes('unanswered')) {
                    status = 'missed';
                } else if (lowerMessage.includes('declined') || lowerMessage.includes('rejected')) {
                    status = 'rejected';
                } else if (lowerMessage.includes('ongoing') || lowerMessage.includes('ringing')) {
                    status = 'initiated';
                } else if (durationSecs === 0) {
                    status = 'failed';
                }
            } else {
                status = 'completed'; // Default for messages
            }

            interaction = await prisma.interaction.create({
                data: {
                    type: 'whatsapp' as any,
                    direction: normalizedDirection,
                    subject: normalizedDirection === 'inbound' ? 'Incoming WhatsApp' : 'Outgoing WhatsApp',
                    description: messageText,
                    date: callDate,
                    phoneNumber: phoneNumber,
                    leadId: targetLeadId || undefined,
                    organisationId: user.organisationId,
                    createdById: user.id,
                    duration: durationSecs > 0 ? (Math.round(durationMinutes * 100) / 100) : undefined,
                    recordingDuration: durationSecs > 0 ? durationSecs : undefined,
                    callStatus: status
                }
            });
        }

        console.log(`[WhatsAppSync] Logged interaction for ${phoneNumber} (Lead: ${targetLeadId || 'Unknown'})`);

        // 3. Create a WhatsAppMessage record so it shows up in the WhatsApp Inbox
        
        // Deduplicate WhatsAppMessage within same 5-minute window
        const existingMessage = await prisma.whatsAppMessage.findFirst({
            where: {
                organisationId: user.organisationId,
                phoneNumber: phoneNumber,
                direction: msgDirection,
                content: { path: ['text'], equals: messageText },
                createdAt: { gte: windowStart, lte: windowEnd }
            }
        });

        let waMessage;
        if (!existingMessage) {
            waMessage = await prisma.whatsAppMessage.create({
                data: {
                    conversationId: `${phoneNumber}_${callDate.getTime()}`,
                    phoneNumber: phoneNumber,
                    direction: msgDirection,
                    messageType: 'text',
                    content: { text: messageText },
                    status: 'delivered',
                    sentAt: callDate,
                    organisationId: user.organisationId,
                    leadId: targetLeadId || undefined,
                    isReadByAgent: false,
                    createdAt: callDate
                }
            });
            console.log(`[WhatsAppSync] Logged WhatsAppMessage for Inbox: ${waMessage.id}`);
        } else {
            console.log(`[WhatsAppSync] Skipped duplicate WhatsAppMessage for Inbox`);
        }
        
        // Emit socket event for real-time UI updates
        const io = req.app.get('io');
        if (io && targetLeadId) {
            io.to(`lead_${targetLeadId}`).emit('new_interaction', {
                interaction: {
                    ...interaction,
                    type: 'whatsapp'
                }
            });
        }
        
        if (io && waMessage && user.organisationId) {
            io.to(`org:${user.organisationId}`).emit('whatsapp_message_received', {
                message: waMessage,
                phoneNumber: phoneNumber
            });
        }

        res.status(201).json({ 
            success: true, 
            interactionId: interaction.id,
            linkedToLead: !!targetLeadId 
        });

    } catch (error) {
        console.error('[WhatsAppSync] Error logging external message:', error);
        res.status(500).json({ error: 'Failed to log WhatsApp message' });
    }
};
