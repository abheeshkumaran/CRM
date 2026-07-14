import { EmailService } from './emailService';
import { TaskService } from './taskService';
import { WhatsAppService } from './whatsAppService';
import { NotificationService } from './notificationService';
import prisma from '../config/prisma';


export const WorkflowEngine = {
    /**
     * Evaluate triggers and execute matching workflows
     */
    async evaluate(
        entityType: string,
        eventType: string,
        data: any,
        organisationId: string,
        depth: number = 0
    ): Promise<void> {
        try {
            console.log(`[WorkflowEngine] Evaluating ${entityType} ${eventType} for Org ${organisationId}`);

            // Find active workflows for this trigger
            const workflows = await prisma.workflow.findMany({
                where: {
                    organisationId: organisationId,
                    isActive: true,
                    triggerEntity: entityType,
                    triggerEvent: eventType,
                    isDeleted: false
                }
            });

            console.log(`[WorkflowEngine] Found ${workflows.length} potential workflows`);

            for (const workflow of workflows) {
                if (this.checkConditions(workflow.conditions, data)) {
                    await this.executeActions(workflow, data, organisationId, 0, undefined, depth);
                }
            }
        } catch (error) {
            console.error('[WorkflowEngine] Error evaluating workflows:', error);
        }
    },

    /**
     * Check if data matches workflow conditions
     */
    checkConditions(conditions: any, data: any): boolean {
        if (!conditions || !Array.isArray(conditions) || conditions.length === 0) return true;

        for (const condition of conditions) {
            const val = this.getValue(data, condition.field);
            const target = condition.value;

            switch (condition.operator) {
                case 'equals':
                    if (val != target) return false;
                    break;
                case 'not_equals':
                    if (val == target) return false;
                    break;
                case 'contains':
                    if (!String(val).includes(target)) return false;
                    break;
                case 'greater_than':
                    if (val <= target) return false;
                    break;
                case 'less_than':
                    if (val >= target) return false;
                    break;
                // Add more operators as needed
            }
        }

        return true;
    },

    /**
     * Get nested value from data
     */
    getValue(data: any, field: string): any {
        return field.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : null, data);
    },

    /**
     * Replace placeholders in text with data values
     */
    parseTemplate(text: string, data: any): string {
        if (!text) return '';
        return text.replace(/\{\{(.*?)\}\}/g, (match, field) => {
            const value = this.getValue(data, field.trim());
            return value !== null && value !== undefined ? String(value) : match;
        });
    },

    /**
     * Execute workflow actions
     */
    /**
     * Resume a paused workflow from the queue
     */
    async resumeWorkflow(queueId: string): Promise<void> {
        try {
            console.log(`[WorkflowEngine] Resuming workflow queue item: ${queueId}`);

            const queueItem = await prisma.workflowQueue.findUnique({
                where: { id: queueId },
                include: { workflow: true }
            });

            if (!queueItem) {
                console.error(`[WorkflowEngine] Queue item ${queueId} not found`);
                return;
            }

            // Update status to processing
            await prisma.workflowQueue.update({
                where: { id: queueId },
                data: { status: 'processing' }
            });

            // Execute remaining actions
            await this.executeActions(
                queueItem.workflow,
                queueItem.data,
                queueItem.organisationId,
                queueItem.nextActionIndex,
                queueItem.entityId,
                0 // reset depth for queued items
            );

            // Mark as completed/delete
            await prisma.workflowQueue.update({
                where: { id: queueId },
                data: { status: 'completed' }
            });
            // Optional: Delete completed items periodically or now
            // await prisma.workflowQueue.delete({ where: { id: queueId } });

        } catch (error) {
            console.error(`[WorkflowEngine] Error resuming workflow:`, error);
            await prisma.workflowQueue.update({
                where: { id: queueId },
                data: { status: 'failed' }
            });
        }
    },

    /**
     * Execute workflow actions
     */
    async executeActions(
        workflow: any,
        data: any,
        organisationId: string,
        startIndex: number = 0,
        entityId?: string,
        depth: number = 0
    ): Promise<void> {
        // Recursion Protection
        if (depth > 3) {
            console.warn(`[WorkflowEngine] Max recursion depth reached for workflow ${workflow.name}. Stopping.`);
            return;
        }
        console.log(`[WorkflowEngine] Executing workflow: ${workflow.name} from index ${startIndex}`);

        const actions = workflow.actions as any[];
        if (!actions) return;

        // Ensure we have an entityId for updates. If not passed (initial trigger), try to derive it.
        const effectiveEntityId = entityId || data.id;

        for (let i = startIndex; i < actions.length; i++) {
            const action = actions[i];
            try {
                switch (action.type) {
                    case 'delay': {
                        const delayMinutes = action.config?.minutes || 0;
                        const delayHours = action.config?.hours || 0;
                        const delayDays = action.config?.days || 0;

                        if (delayMinutes === 0 && delayHours === 0 && delayDays === 0) break;

                        const executeAt = new Date();
                        executeAt.setMinutes(executeAt.getMinutes() + delayMinutes);
                        executeAt.setHours(executeAt.getHours() + delayHours);
                        executeAt.setDate(executeAt.getDate() + delayDays);

                        console.log(`[WorkflowEngine] Action: Delaying workflow until ${executeAt.toISOString()}`);

                        if (!effectiveEntityId) {
                            console.error('[WorkflowEngine] Cannot delay workflow without entity ID');
                            break;
                        }

                        // Queue the workflow
                        await prisma.workflowQueue.create({
                            data: {
                                workflowId: workflow.id,
                                entityId: effectiveEntityId,
                                organisationId,
                                nextActionIndex: i + 1,
                                executeAt,
                                status: 'pending',
                                data: data
                            }
                        });

                        // Stop execution of this instance
                        return;
                    }

                    case 'update_field': {
                        const field = action.config?.field;
                        const value = action.config?.value;

                        if (!field || !effectiveEntityId) {
                            console.warn('[WorkflowEngine] Missing field or entityId for update_field action');
                            break;
                        }

                        // Determine model based on triggerEntity
                        const modelName = workflow.triggerEntity.toLowerCase();
                        // Handle strict types if needed, but Prisma client is dynamic enough for raw queries or we assume model name matches.
                        // However, prisma[modelName] might be tricky with TS.
                        // We'll trust the model mapping. Lead -> lead, Contact -> contact, etc.


                        const delegate = (prisma as any)[modelName];
                        if (delegate) {
                            console.log(`[WorkflowEngine] Action: Updating ${modelName} ${effectiveEntityId} - ${field} = ${value}`);

                            // Parse value if it's a dynamic placeholder
                            const parsedValue = typeof value === 'string' ? this.parseTemplate(value, data) : value;

                            await delegate.update({
                                where: { id: effectiveEntityId },
                                data: { [field]: parsedValue }
                            });

                            // Re-evaluate workflows for the change (triggers recursion depth check)
                            await this.evaluate(
                                workflow.triggerEntity,
                                'updated',
                                await delegate.findUnique({ where: { id: effectiveEntityId } }),
                                organisationId,
                                depth + 1
                            );
                        } else {
                            console.error(`[WorkflowEngine] Model delegate not found for ${modelName}`);
                        }
                        break;
                    }

                    case 'send_email': {
                        const to = action.config?.to || data.email;
                        const subject = this.parseTemplate(action.config?.subject || 'Notification', data);
                        const body = this.parseTemplate(action.config?.body || 'Hello', data);

                        if (to) {
                            console.log(`[WorkflowEngine] Action: Sending Email to ${to}`);
                            await EmailService.sendEmail(
                                to,
                                subject,
                                body,
                                organisationId,
                                workflow.createdById,
                                {
                                    leadId: workflow.triggerEntity === 'Lead' ? effectiveEntityId : undefined,
                                    contactId: workflow.triggerEntity === 'Contact' ? effectiveEntityId : undefined
                                }
                            );
                        }
                        break;
                    }

                    case 'send_whatsapp': {
                        const phone = action.config?.phone || data.phone;
                        if (!phone) break;

                        const waClient = await WhatsAppService.getClientForOrg(organisationId);
                        if (!waClient) {
                            console.warn(`[WorkflowEngine] WhatsApp not connected for org ${organisationId}`);
                            break;
                        }

                        if (action.config?.templateName) {
                            console.log(`[WorkflowEngine] Action: Sending WhatsApp Template to ${phone}`);
                            await waClient.sendTemplateMessage(
                                phone,
                                action.config.templateName,
                                action.config.languageCode || 'en_US',
                                action.config.components || []
                            );
                        } else if (action.config?.message) {
                            const body = this.parseTemplate(action.config.message, data);
                            console.log(`[WorkflowEngine] Action: Sending WhatsApp Text to ${phone}`);
                            await waClient.sendTextMessage(phone, body);

                            // Log Interaction
                            await prisma.interaction.create({
                                data: {
                                    organisationId,
                                    type: 'other',
                                    subject: 'WhatsApp Workflow Message',
                                    description: body,
                                    direction: 'outbound',
                                    leadId: workflow.triggerEntity === 'Lead' ? effectiveEntityId : undefined,
                                    contactId: workflow.triggerEntity === 'Contact' ? effectiveEntityId : undefined,
                                    createdById: workflow.createdById,
                                    phoneNumber: phone
                                }
                            });
                        }
                        break;
                    }

                    case 'create_task': {
                        const subject = this.parseTemplate(action.config?.subject || 'Workflow Task', data);
                        const description = this.parseTemplate(action.config?.description || '', data);

                        console.log(`[WorkflowEngine] Action: Creating Task '${subject}'`);

                        await TaskService.createTask({
                            subject,
                            description,
                            status: action.config?.status || 'pending',
                            priority: action.config?.priority || 'medium',
                            organisationId,
                            assignedToId: action.config?.assignedToId || workflow.createdById || data.assignedToId,
                            leadId: workflow.triggerEntity === 'Lead' ? effectiveEntityId : undefined,
                            contactId: workflow.triggerEntity === 'Contact' ? effectiveEntityId : undefined,
                            accountId: workflow.triggerEntity === 'Account' ? effectiveEntityId : undefined,
                            opportunityId: workflow.triggerEntity === 'Opportunity' ? effectiveEntityId : undefined,
                        });
                        break;
                    }

                    case 'notify_user': {
                        const userId = action.config?.userId || workflow.createdById || data.assignedToId;
                        if (!userId) break;

                        const title = this.parseTemplate(action.config?.title || 'System Notification', data);
                        const message = this.parseTemplate(action.config?.message || 'A workflow has been triggered.', data);

                        console.log(`[WorkflowEngine] Action: Notifying User ${userId}`);
                        await NotificationService.send(
                            userId,
                            title,
                            message,
                            action.config?.notificationType || 'info'
                        );
                        break;
                    }

                    default:
                        console.log(`[WorkflowEngine] Unknown action type: ${action.type}`);
                }
            } catch (err) {
                console.error(`[WorkflowEngine] Action failed: ${action.type}`, err);
            }
        }

        // Update stats
        await prisma.workflow.update({
            where: { id: workflow.id },
            data: {
                executionCount: { increment: 1 },
                lastExecutedAt: new Date()
            }
        });
    }
};
