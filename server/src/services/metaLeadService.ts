import axios from 'axios';
import { DistributionService } from './distributionService';
import { NotificationService } from './notificationService';
import { decrypt } from '../utils/encryption';
import { MetaLeadGuard } from './metaLeadGuard';
import prisma from '../config/prisma';


interface QueuedLead {
    leadgenId: string;
    pageId: string;
    adId?: string;
    formId?: string;
    attempts: number;
    nextRetry: number;
}

let leadQueue: QueuedLead[] = [];
let isProcessingQueue = false;

export const MetaLeadService = {
    /**
     * Processes an incoming lead from Meta Webhook
     */
    async processIncomingLead(leadgenId: string, pageId: string, adId?: string, formId?: string) {
        try {
            const META_API_VERSION = 'v18.0';
            console.log(`[MetaLeadService] Processing lead ${leadgenId} from Page ${pageId}...`);

            // 1. Find ALL organisations connected to this Page ID
            const candidates = await prisma.organisation.findMany({
                where: {
                    isDeleted: false,
                    OR: [
                        { integrations: { path: ['meta', 'pageId'], equals: pageId } },
                        { integrations: { path: ['facebook_payload', 'pageId'], equals: pageId } },
                        { integrations: { path: ['metaAccounts'], array_contains: [{ pageId: pageId }] } } 
                    ]
                }
            });

            const allCandidates = [...candidates];
            if (allCandidates.length === 0) {
                const potentialOrgs = await prisma.organisation.findMany({
                    where: { isDeleted: false, integrations: { not: any } }
                });
                const dynamicMatches = potentialOrgs.filter(o => {
                    const accounts = (o.integrations as any)?.metaAccounts;
                    return Array.isArray(accounts) && accounts.some((acc: any) => acc.pageId === pageId);
                });
                dynamicMatches.forEach(dm => {
                    if (!allCandidates.find(c => c.id === dm.id)) allCandidates.push(dm);
                });
            }

            if (allCandidates.length === 0) {
                console.error(`[MetaLeadService] No organisation found with Meta Page ID: ${pageId}.`);
                return;
            }

            // 2. Fetch Lead Details
            let metaLeadData: any = null;
            let fetchedSuccess = false;
            let lastError: any = null;

            for (const candidate of allCandidates) {
                const integrations = (candidate.integrations as any) || {};
                const accounts = [...(integrations.metaAccounts || [])];
                if (integrations.meta) accounts.push(integrations.meta);
                const matchedAccount = accounts.find((acc: any) => acc.pageId === pageId);

                if (matchedAccount?.accessToken) {
                    try {
                        const accessToken = decrypt(matchedAccount.accessToken);
                        const response = await axios.get(`https://graph.facebook.com/${META_API_VERSION}/${leadgenId}`, {
                            params: { 
                                access_token: accessToken,
                                fields: 'id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,ad_account_id'
                            }
                        });
                        metaLeadData = response.data;
                        fetchedSuccess = true;
                        break; 
                    } catch (e: any) {
                        lastError = e;
                        console.warn(`[MetaLeadService] Token for org ${candidate.id} failed, trying next...`);
                    }
                }
            }

            // 3. RETRY QUEUE LOGIC
            if (!fetchedSuccess || !metaLeadData) {
                const errorMsg = lastError?.response?.data?.error?.message || lastError?.message;
                const isRateLimit = errorMsg?.includes('rate') || lastError?.response?.status === 400;

                if (isRateLimit) {
                    console.warn(`[MetaLeadService] Rate limited by Meta. Adding lead ${leadgenId} to retry queue.`);
                    this.addToQueue(leadgenId, pageId, adId, formId);
                } else {
                    console.error(`[MetaLeadService] Failed to fetch lead data from Meta for lead ${leadgenId}: ${errorMsg}`);
                }
                return;
            }

            // 4. Process the lead for EACH matching organisation
            for (const org of allCandidates) {
                // ✅ GUARD: Acquire idempotency lock before processing
                // This prevents duplicate creation if webhook + polling both fire for the same lead
                const lockAcquired = await MetaLeadGuard.acquireLock(leadgenId, org.id);
                if (!lockAcquired) continue; // Already being processed or already saved

                try {
                    const integrations = (org.integrations as any) || {};
                    const accounts = [...(integrations.metaAccounts || [])];
                    if (integrations.meta) accounts.push(integrations.meta);
                    const matchedAccount = accounts.find((acc: any) => acc.pageId === pageId);

                    if (!matchedAccount || !matchedAccount.connected) {
                        console.log(`[MetaLeadService] Skipping Org ${org.id}: Page ${pageId} is not connected/enabled for lead sync.`);
                        MetaLeadGuard.releaseLock(leadgenId, org.id);
                        continue;
                    }

                    // --- STRICT AD ACCOUNT VALIDATION ---
                    const adAccountId = metaLeadData.ad_account_id || metaLeadData.ad?.account_id;
                    if (adAccountId) {
                        const strAdAccountId = String(adAccountId);
                        const normalizedLeadAdId = strAdAccountId.startsWith('act_') ? strAdAccountId : `act_${strAdAccountId}`;
                        
                        // 1. Check in Whitelist (enabledLeadSyncAccounts)
                        const enabledAccounts = (matchedAccount.enabledLeadSyncAccounts as string[]) || [];
                        const isWhitelisted = enabledAccounts.some((id: string) => {
                            const strId = String(id);
                            const normalizedId = strId.startsWith('act_') ? strId : `act_${strId}`;
                            return normalizedId === normalizedLeadAdId;
                        });

                        // 2. Check in Main Ad Account Field (adAccountId)
                        const mainAdAccountId = matchedAccount.adAccountId ? String(matchedAccount.adAccountId) : null;
                        const isMainMatch = mainAdAccountId && (
                            (mainAdAccountId.startsWith('act_') ? mainAdAccountId : `act_${mainAdAccountId}`) === normalizedLeadAdId
                        );

                        // 3. If no whitelist is configured AND no adAccountId set,
                        //    allow the lead (user hasn't configured filtering yet)
                        const hasAnyFilter = enabledAccounts.length > 0 || !!mainAdAccountId;

                        // 4. If it matches NEITHER, block it.
                        if (hasAnyFilter && !isWhitelisted && !isMainMatch) {
                            console.warn(`[MetaLeadService] Blocking cross-org lead. Lead ${metaLeadData.id} (AdAccount: ${normalizedLeadAdId}) does not belong to Org ${org.id}. MainAcc: ${mainAdAccountId}, Whitelist: [${enabledAccounts.join(',')}]`);
                            MetaLeadGuard.releaseLock(leadgenId, org.id);
                            continue;
                        }
                        if (!hasAnyFilter) {
                            console.log(`[MetaLeadService] No ad account filter configured for Org ${org.id}. Allowing lead ${metaLeadData.id}.`);
                        }
                    } else {
                        console.log(`[MetaLeadService] Lead ${metaLeadData.id} has no ad_account_id from Meta. Proceeding without account filtering.`);
                    }

                    await this.saveAndDistributeLead(org.id, pageId, metaLeadData, formId, adId);
                    MetaLeadGuard.markSuccess(leadgenId, org.id);
                } catch (orgErr: any) {
                    MetaLeadGuard.markFailure(leadgenId, org.id, orgErr);
                    console.error(`[MetaLeadService] Error processing for Org ${org.id}:`, orgErr.message);
                }
            }
        } catch (error: any) {
            console.error('[MetaLeadService] Error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Add lead to retry queue with backoff
     */
    addToQueue(leadgenId: string, pageId: string, adId?: string, formId?: string, attempts = 0) {
        if (attempts >= 5) {
            console.error(`[MetaLeadService] Max retries reached for lead ${leadgenId}. Giving up.`);
            return;
        }

        // Exponential backoff: 1m, 2m, 4m, 8m, 16m
        const delay = Math.pow(2, attempts) * 60 * 1000;
        
        const alreadyInQueue = leadQueue.some(l => l.leadgenId === leadgenId);
        if (alreadyInQueue && attempts === 0) return; // Don't add fresh if already retrying

        leadQueue.push({
            leadgenId,
            pageId,
            adId,
            formId,
            attempts: attempts + 1,
            nextRetry: Date.now() + delay
        });

        console.log(`[MetaLeadService] Lead ${leadgenId} scheduled for retry #${attempts + 1} in ${delay / 1000}s`);
        this.startQueueProcessor();
    },

    /**
     * Periodically check and process the queue
     */
    startQueueProcessor() {
        if (isProcessingQueue) return;
        isProcessingQueue = true;

        const timer = setInterval(async () => {
            if (leadQueue.length === 0) {
                clearInterval(timer);
                isProcessingQueue = false;
                return;
            }

            const now = Date.now();
            const readyToProcess = leadQueue.filter(l => l.nextRetry <= now);
            leadQueue = leadQueue.filter(l => l.nextRetry > now);

            for (const item of readyToProcess) {
                console.log(`[MetaLeadService] Retrying lead ${item.leadgenId} (Attempt ${item.attempts})...`);
                try {
                    // Try to process again
                    await this.processIncomingLead(item.leadgenId, item.pageId, item.adId, item.formId);
                } catch (err) {
                    // processIncomingLead will re-add to queue if it fails with rate limit
                }
            }
        }, 30000); // Check every 30s
    },

    /**
     * Internal helper to save and distribute a lead
     */
    async saveAndDistributeLead(orgId: string, pageId: string, metaLeadData: any, formId?: string, adId?: string) {
        try {
            const leadgenId = metaLeadData.id;

            // Validate lead data structure before processing
            const validationError = MetaLeadGuard.validateLeadData(metaLeadData);
            if (validationError) {
                console.error(`[MetaLeadService] Invalid lead data for Org ${orgId}: ${validationError}`);
                return;
            }
            
            // 1. Final DB dedup check (last line of defence)
            const existing = await prisma.lead.findFirst({
                where: { 
                    organisationId: orgId, 
                    sourceDetails: { path: ['metaLeadgenId'], equals: leadgenId }
                }
            });

            if (existing) {
                console.log(`[MetaLeadService] Lead ${leadgenId} already exists in DB for Org ${orgId} (Lead ID: ${existing.id}). Skipping save.`);
                return;
            }

            // 2. Map Field Data
            const fieldMap: Record<string, string> = {};
            metaLeadData.field_data.forEach((field: any) => {
                if (field.values && field.values.length > 0) {
                    fieldMap[field.name.toLowerCase()] = field.values[0];
                }
            });

            const getField = (keys: string[]) => {
                for (const key of keys) {
                    if (fieldMap[key]) return fieldMap[key];
                }
                return '';
            };

            const leadData = {
                full_name: getField(['full name', 'full_name', 'name', 'first_name', 'first name']),
                phone: getField(['phone', 'phone number', 'phone_number', 'mobile', 'mobile number']),
                email: getField(['email', 'email address', 'email_address']),
                city: getField(['city', 'location']),
                company: getField(['company', 'organization', 'company name']),
                campaign_name: metaLeadData.campaign_name || metaLeadData.ad_name || metaLeadData.form_name || `Form: ${metaLeadData.form_id || formId}` || 'Meta Lead'
            };

            const targetBranchId = await DistributionService.resolveBranchForMetaPage(orgId, pageId);

            const crmData = {
                firstName: leadData.full_name || 'Meta Lead',
                lastName: '',
                phone: leadData.phone || '',
                email: leadData.email || undefined,
                organisationId: orgId,
                source: LeadSource.meta_leadgen,
                sourceDetails: {
                    metaLeadgenId: leadgenId,
                    metaFormId: formId || metaLeadData.form_id,
                    metaPageId: pageId,
                    metaAdId: adId || metaLeadData.ad_id,
                    adName: metaLeadData.ad_name,
                    campaignId: metaLeadData.campaign_id,
                    campaignName: leadData.campaign_name,
                    metaCreatedTime: metaLeadData.created_time
                }
            };

            const { DuplicateLeadService } = await import('./duplicateLeadService');
            const duplicateCheck = await DuplicateLeadService.checkDuplicate(
                crmData.phone, 
                crmData.email, 
                orgId, 
                targetBranchId || undefined
            );

            if (duplicateCheck.isDuplicate && duplicateCheck.existingLead) {
                await DuplicateLeadService.handleReEnquiry(duplicateCheck.existingLead, crmData, orgId);
                return;
            }

            const lead = await prisma.lead.create({
                data: {
                    ...crmData,
                    branchId: targetBranchId
                }
            });

            await DistributionService.assignLead(lead, orgId);

            const admins = await prisma.user.findMany({
                where: { organisationId: orgId, role: { in: ['admin', 'super_admin'] }, isActive: true },
                select: { id: true }
            });
            for (const admin of admins) {
                await NotificationService.send(admin.id, 'New Meta Lead', `New lead: ${crmData.firstName}`, 'info');
            }
        } catch (error: any) {
            console.error(`[MetaLeadService] Error saving lead ${metaLeadData.id} for Org ${orgId}:`, error.message);
            throw error;
        }
    }
};

export default MetaLeadService;
