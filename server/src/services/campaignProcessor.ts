import { WhatsAppService } from './whatsAppService';
import { EmailService } from './emailService';
import { logger } from '../utils/logger';
import prisma from '../config/prisma';



interface CampaignStats {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    replied: number;
    [key: string]: any; // Add index signature for Prisma JSON compatibility
}

export class CampaignProcessor {
    /**
     * Process WhatsApp campaign with batch sending
     */
    static async processWhatsAppCampaign(campaignId: string): Promise<void> {
        try {
            logger.info(`Starting campaign ${campaignId}`, 'CampaignProcessor', undefined, undefined, { campaignId });

            const campaign = await prisma.whatsAppCampaign.findUnique({
                where: { id: campaignId },
                include: {
                    organisation: true,
                    createdBy: true
                }
            });

            if (!campaign) {
                throw new Error('Campaign not found');
            }

            if (campaign.status !== 'scheduled' && campaign.status !== 'draft' && campaign.status !== 'sent') {
                throw new Error('Campaign is not in a sendable state');
            }

            // Get WhatsApp service for the organisation
            const whatsAppService = await WhatsAppService.getClientForOrg(campaign.organisationId);
            if (!whatsAppService) {
                throw new Error('WhatsApp integration not configured for this organisation');
            }

            // Get recipients
            const recipients = await this.getRecipients(campaign);
            if (recipients.length === 0) {
                throw new Error('No recipients found for campaign');
            }

            logger.info(`Found ${recipients.length} recipients`, 'CampaignProcessor', undefined, campaign.organisationId);

            // Initialize stats
            const stats: CampaignStats = {
                sent: 0,
                delivered: 0,
                read: 0,
                failed: 0,
                replied: 0
            };

            // Update campaign status to sending
            await prisma.whatsAppCampaign.update({
                where: { id: campaignId },
                data: {
                    status: 'sent',
                    sentAt: new Date(),
                    stats
                }
            });

            // Process recipients in batches to respect rate limits
            const batchSize = 10; // Process 10 messages at a time
            const delayBetweenBatches = 1000; // 1 second delay between batches

            for (let i = 0; i < recipients.length; i += batchSize) {
                const batch = recipients.slice(i, i + batchSize);

                await Promise.all(
                    batch.map(recipient => this.sendToRecipient(
                        whatsAppService,
                        campaign,
                        recipient,
                        stats
                    ))
                );

                // Update stats after each batch
                await prisma.whatsAppCampaign.update({
                    where: { id: campaignId },
                    data: { stats }
                });

                // Delay between batches to respect rate limits
                if (i + batchSize < recipients.length) {
                    await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
                }
            }

            logger.info(`Campaign ${campaignId} completed`, 'CampaignProcessor', undefined, campaign.organisationId, { stats });

        } catch (error) {
            logger.error(`Error processing campaign ${campaignId}`, error, 'CampaignProcessor');

            // Update campaign status to failed
            await prisma.whatsAppCampaign.update({
                where: { id: campaignId },
                data: {
                    status: 'failed',
                    stats: { error: (error as Error).message }
                }
            }).catch(console.error);
        }
    }

    /**
     * Process Email campaign with batch sending
     */
    static async processEmailCampaign(campaignId: string): Promise<void> {
        try {
            logger.info(`Starting email campaign ${campaignId}`, 'CampaignProcessor');

            const campaign = await prisma.campaign.findUnique({
                where: { id: campaignId },
                include: {
                    organisation: true,
                    createdBy: true,
                    emailList: true
                }
            });

            if (!campaign) throw new Error('Campaign not found');
            if (campaign.status === 'completed' || campaign.status === 'failed') {
                throw new Error(`Campaign is already in ${campaign.status} state`);
            }

            // Get recipients - Filter by emailList if provided, otherwise fallback to all leads with emails
            const recipients = await prisma.lead.findMany({
                where: {
                    organisationId: campaign.organisationId,
                    isDeleted: false,
                    email: { not: null },
                    ...(campaign.emailListId ? {
                        emailLists: {
                            some: { id: campaign.emailListId }
                        }
                    } : {})
                },
                select: { id: true, email: true, firstName: true, lastName: true, company: true }
            });

            if (recipients.length === 0) throw new Error('No recipients found with valid email addresses');

            logger.info(`Found ${recipients.length} recipients for email campaign`, 'CampaignProcessor', undefined, campaign.organisationId);

            const stats = { sent: 0, failed: 0 };

            await prisma.campaign.update({
                where: { id: campaignId },
                data: { status: 'sending', sentAt: new Date() }
            });

            const batchSize = 10;
            for (let i = 0; i < recipients.length; i += batchSize) {
                const batch = recipients.slice(i, i + batchSize);
                await Promise.all(batch.map(async (recipient) => {
                    try {
                        const personalizedBody = EmailService.personalize(campaign.content, {
                            firstName: recipient.firstName,
                            lastName: recipient.lastName,
                            company: recipient.company
                        });

                        const sent = await EmailService.sendEmail(
                            recipient.email!,
                            campaign.subject,
                            personalizedBody,
                            campaign.organisationId,
                            campaign.createdById || undefined,
                            { leadId: recipient.id }
                        );

                        if (sent) stats.sent++; else stats.failed++;
                    } catch (err) {
                        logger.error(`Failed to send email to ${recipient.email}:`, err);
                        stats.failed++;
                    }
                }));

                // Update intermediate stats
                await prisma.campaign.update({
                    where: { id: campaignId },
                    data: { stats: stats as any }
                });

                // Throttle to avoid hitting mail server limits
                if (i + batchSize < recipients.length) {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            await prisma.campaign.update({
                where: { id: campaignId },
                data: {
                    status: stats.failed === 0 ? 'sent' : 'partially_failed',
                    stats: stats as any
                }
            });

            logger.info(`Email campaign ${campaignId} completed`, 'CampaignProcessor', undefined, campaign.organisationId, { stats });

        } catch (error) {
            logger.error(`Error processing email campaign ${campaignId}`, error, 'CampaignProcessor');
            await prisma.campaign.update({
                where: { id: campaignId },
                data: { status: 'failed', stats: { error: (error as Error).message } as any }
            }).catch(console.error);
        }
    }

    /**
     * Get recipients for a campaign
     */
    private static async getRecipients(campaign: any): Promise<Array<{ phone: string; name: string }>> {
        const recipients: Array<{ phone: string; name: string }> = [];

        // If campaign has explicit recipients list
        if (campaign.recipients && Array.isArray(campaign.recipients) && campaign.recipients.length > 0) {
            for (const recipient of campaign.recipients) {
                if (recipient.type === 'phone') {
                    recipients.push({
                        phone: recipient.phone,
                        name: recipient.name || recipient.phone
                    });
                } else if (recipient.type === 'lead') {
                    const lead = await prisma.lead.findUnique({
                        where: { id: recipient.id, organisationId: campaign.organisationId },
                        select: { phone: true, firstName: true, lastName: true }
                    });
                    if (lead && lead.phone) {
                        recipients.push({
                            phone: lead.phone,
                            name: `${lead.firstName} ${lead.lastName}`.trim()
                        });
                    }
                } else if (recipient.type === 'contact') {
                    const contact = await prisma.contact.findUnique({
                        where: { id: recipient.id, organisationId: campaign.organisationId },
                        select: { phones: true, firstName: true, lastName: true }
                    });
                    if (contact && contact.phones) {
                        // Extract phone from JSON field
                        const phones = contact.phones as any;
                        let phone = null;

                        if (Array.isArray(phones) && phones.length > 0) {
                            phone = phones[0];
                        } else if (typeof phones === 'object' && phones.primary) {
                            phone = phones.primary;
                        } else if (typeof phones === 'string') {
                            phone = phones;
                        }

                        if (phone) {
                            recipients.push({
                                phone,
                                name: `${contact.firstName} ${contact.lastName}`.trim()
                            });
                        }
                    }
                }
            }
        }

        // If no explicit recipients, use test number if provided
        if (recipients.length === 0 && campaign.testNumber) {
            recipients.push({
                phone: campaign.testNumber,
                name: 'Test Recipient'
            });
        }

        return recipients;
    }

    /**
     * Send message to a single recipient
     */
    private static async sendToRecipient(
        whatsAppService: WhatsAppService,
        campaign: any,
        recipient: { phone: string; name: string },
        stats: CampaignStats
    ): Promise<void> {
        try {
            let result;

            if (campaign.templateId) {
                // Send template message
                result = await whatsAppService.sendTemplateMessage(
                    recipient.phone,
                    campaign.templateId,
                    'en_US',
                    []
                );
            } else {
                // Send text message
                result = await whatsAppService.sendTextMessage(
                    recipient.phone,
                    campaign.message
                );
            }

            // Log message to database
            await prisma.whatsAppMessage.create({
                data: {
                    conversationId: `${recipient.phone}_${campaign.organisationId}`,
                    phoneNumber: recipient.phone,
                    direction: 'outgoing',
                    messageType: campaign.templateId ? 'template' : 'text',
                    content: {
                        text: campaign.templateId ? undefined : campaign.message,
                        templateName: campaign.templateId || undefined
                    },
                    status: 'sent',
                    waMessageId: result.messages?.[0]?.id,
                    sentAt: new Date(),
                    organisationId: campaign.organisationId,
                    agentId: campaign.createdById,
                    campaignId: campaign.id
                }
            });

            // Log Interaction for timeline visibility
            await prisma.interaction.create({
                data: {
                    organisationId: campaign.organisationId,
                    type: 'other',
                    subject: campaign.templateId ? `Campaign Template: ${campaign.templateId}` : 'Campaign WhatsApp Message',
                    description: campaign.message || `Sent WhatsApp Template ${campaign.templateId}`,
                    direction: 'outbound',
                    leadId: campaign.recipients?.find((r: any) => r.phone === recipient.phone && r.type === 'lead')?.id,
                    contactId: campaign.recipients?.find((r: any) => r.phone === recipient.phone && r.type === 'contact')?.id,
                    createdById: campaign.createdById,
                    phoneNumber: recipient.phone
                }
            });

            stats.sent++;
            logger.debug(`Sent message to ${recipient.phone}`, 'CampaignProcessor');

        } catch (error) {
            logger.error(`Failed to send to ${recipient.phone}`, error, 'CampaignProcessor');
            stats.failed++;

            // Log failed message
            await prisma.whatsAppMessage.create({
                data: {
                    conversationId: `${recipient.phone}_${campaign.organisationId}`,
                    phoneNumber: recipient.phone,
                    direction: 'outgoing',
                    messageType: campaign.templateId ? 'template' : 'text',
                    content: {
                        text: campaign.templateId ? undefined : campaign.message,
                        templateName: campaign.templateId || undefined
                    },
                    status: 'failed',
                    errorMessage: (error as Error).message,
                    organisationId: campaign.organisationId,
                    agentId: campaign.createdById,
                    campaignId: campaign.id
                }
            }).catch(console.error);
        }
    }

    /**
     * Update campaign statistics based on message status updates
     */
    static async updateCampaignStats(messageId: string, newStatus: string): Promise<void> {
        try {
            const message = await prisma.whatsAppMessage.findUnique({
                where: { id: messageId },
                select: { organisationId: true, sentAt: true, waMessageId: true, campaignId: true }
            });

            if (!message || !message.sentAt) return;

            // Find campaign directly by ID if linked
            let campaign;
            if (message.campaignId) {
                campaign = await prisma.whatsAppCampaign.findUnique({
                    where: { id: message.campaignId }
                });
            } else {
                // Fallback to time-based search for unlinked messages
                campaign = await prisma.whatsAppCampaign.findFirst({
                    where: {
                        organisationId: message.organisationId,
                        sentAt: {
                            gte: new Date(message.sentAt.getTime() - 24 * 60 * 60 * 1000),
                            lte: new Date(message.sentAt.getTime() + 24 * 60 * 60 * 1000)
                        },
                        status: 'sent'
                    }
                });
            }

            if (!campaign) return;

            const stats = (campaign.stats as any) || {
                sent: 0,
                delivered: 0,
                read: 0,
                failed: 0,
                replied: 0
            };

            // Update stats based on new status
            if (newStatus === 'delivered' && stats.delivered !== undefined) {
                stats.delivered++;
            } else if (newStatus === 'read' && stats.read !== undefined) {
                stats.read++;
            } else if (newStatus === 'failed' && stats.failed !== undefined) {
                stats.failed++;
            }

            await prisma.whatsAppCampaign.update({
                where: { id: campaign.id },
                data: { stats }
            });

            logger.debug(`Updated campaign ${campaign.id} stats for status: ${newStatus}`, 'CampaignProcessor');

        } catch (error) {
            logger.error('Error updating campaign stats', error, 'CampaignProcessor');
        }
    }
}