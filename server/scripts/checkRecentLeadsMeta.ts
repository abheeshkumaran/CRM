import prisma from '../src/config/prisma';
import axios from 'axios';
import { decrypt } from '../src/utils/encryption';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkRecentLeads() {
    const orgs = await prisma.organisation.findMany({
        where: { isDeleted: false },
        select: { id: true, name: true, integrations: true }
    });

    for (const org of orgs) {
        const integrations = org.integrations as any;
        const accounts = integrations?.metaAccounts || [];
        if (accounts.length === 0) continue;

        console.log(`\n========== Org: ${org.name} ==========`);

        for (const account of accounts) {
            if (!account.accessToken || !account.pageId) continue;
            const accessToken = decrypt(account.accessToken);
            console.log(`\n--- Page: ${account.pageName || account.pageId} ---`);

            try {
                // Get forms
                const formsRes = await axios.get(`https://graph.facebook.com/v18.0/${account.pageId}/leadgen_forms`, {
                    params: { access_token: accessToken, fields: 'id,name,status', limit: 100 }
                });
                const allForms = formsRes.data.data || [];
                const activeForms = allForms.filter((f: any) => f.status === 'ACTIVE');
                console.log(`  Forms: ${allForms.length} total, ${activeForms.length} active`);

                // Check each active form for latest lead (no time filter)
                let foundAny = false;
                for (const form of activeForms) {
                    const leadsRes = await axios.get(`https://graph.facebook.com/v18.0/${form.id}/leads`, {
                        params: { access_token: accessToken, fields: 'id,created_time', limit: 1 }
                    });
                    const leads = leadsRes.data.data || [];
                    if (leads.length > 0) {
                        const ts = new Date(leads[0].created_time);
                        const hoursAgo = Math.floor((Date.now() - ts.getTime()) / (1000 * 60 * 60));
                        console.log(`  ✅ Form "${form.name}": last lead ${hoursAgo}h ago (${ts.toISOString()})`);
                        foundAny = true;
                    }
                }
                if (!foundAny) {
                    console.log(`  ⚠️  NO leads found in ANY active form (ever accessible via this token)`);
                }
            } catch (e: any) {
                console.error(`  ❌ Error: ${e.response?.data?.error?.message || e.message}`);
            }
        }
    }
    await prisma.$disconnect();
}

checkRecentLeads();
