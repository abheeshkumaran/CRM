import { PrismaClient } from '../src/generated/client';
import axios from 'axios';
import { decrypt } from '../src/utils/encryption';
import { MetaLeadService } from '../src/services/metaLeadService';
import { MetaLeadGuard } from '../src/services/metaLeadGuard';
import logger from '../src/utils/logger';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function backfill() {
    console.log('Starting Meta Leads 7-day Backfill...');
    const organisations = await prisma.organisation.findMany({
        where: {
            isDeleted: false,
            status: 'active'
        },
        select: {
            id: true,
            name: true,
            integrations: true
        }
    });

    // 7 days ago
    const sinceTime = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);

    for (const org of organisations) {
        const integrations = (org.integrations as any) || {};
        const accounts = [...(integrations.metaAccounts || [])];
        
        if (integrations.meta && integrations.meta.connected) {
            const exists = accounts.some(acc => acc.pageId === integrations.meta.pageId);
            if (!exists) accounts.push(integrations.meta);
        }

        if (accounts.length === 0) continue;

        console.log(`\nChecking Organisation: ${org.name}`);

        for (const account of accounts) {
            if (!account.connected || !account.accessToken || !account.pageId) continue;

            console.log(`  Page: ${account.pageName || account.pageId}`);
            try {
                const accessToken = decrypt(account.accessToken);
                
                // Fetch leadgen forms
                const formsResponse = await axios.get(`https://graph.facebook.com/v18.0/${account.pageId}/leadgen_forms`, {
                    params: {
                        access_token: accessToken,
                        fields: 'id,name,status',
                        limit: 100
                    }
                });

                const forms = formsResponse.data.data || [];
                console.log(`    Found ${forms.length} forms.`);

                for (const form of forms) {
                    try {
                        const leadsResponse = await axios.get(`https://graph.facebook.com/v18.0/${form.id}/leads`, {
                            params: {
                                access_token: accessToken,
                                fields: 'id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,ad_account_id',
                                filtering: JSON.stringify([{ 
                                    field: 'time_created', 
                                    operator: 'GREATER_THAN', 
                                    value: sinceTime 
                                }]),
                                limit: 1000
                            }
                        });

                        const leads = leadsResponse.data.data || [];
                        let addedCount = 0;
                        let skipCount = 0;

                        for (const leadData of leads) {
                            try {
                                // Check if already in DB
                                const existing = await prisma.lead.findFirst({
                                    where: {
                                        organisationId: org.id,
                                        sourceDetails: { path: ['metaLeadgenId'], equals: leadData.id }
                                    }
                                });

                                if (existing) {
                                    skipCount++;
                                    continue;
                                }

                                // Attach form name as fallback
                                leadData.form_name = form.name;

                                // Lock to prevent race condition
                                const lockAcquired = await MetaLeadGuard.acquireLock(leadData.id, org.id);
                                if (!lockAcquired) {
                                    skipCount++;
                                    continue;
                                }

                                try {
                                    await MetaLeadService.saveAndDistributeLead(org.id, account.pageId, leadData, form.id);
                                    MetaLeadGuard.markSuccess(leadData.id, org.id);
                                    addedCount++;
                                    console.log(`      Saved lead ${leadData.id} for form "${form.name}" (created: ${leadData.created_time})`);
                                } catch (err) {
                                    MetaLeadGuard.markFailure(leadData.id, org.id, err);
                                    throw err;
                                }
                            } catch (leadErr: any) {
                                console.error(`      Error processing lead ${leadData.id}:`, leadErr.message);
                            }
                        }

                        if (leads.length > 0) {
                            console.log(`    Form "${form.name}": Fetched ${leads.length} leads. Added ${addedCount}, Skipped ${skipCount} already existing.`);
                        }
                    } catch (formErr: any) {
                        console.error(`    Error fetching leads for form "${form.name}":`, formErr.response?.data || formErr.message);
                    }
                }
            } catch (pageErr: any) {
                console.error(`  Error processing page ${account.pageName}:`, pageErr.response?.data || pageErr.message);
            }
        }
    }
}

backfill()
    .then(() => {
        console.log('\nBackfill completed successfully.');
        prisma.$disconnect().then(() => process.exit(0));
    })
    .catch(err => {
        console.error('Backfill failed:', err);
        prisma.$disconnect().then(() => process.exit(1));
    });
