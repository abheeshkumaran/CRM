import prisma from '../src/config/prisma';
import axios from 'axios';
import { decrypt } from '../src/utils/encryption';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkLeads() {
    const orgId = '1c2349e1-1552-41de-9a35-cde6876b7052';
    const org = await prisma.organisation.findUnique({
        where: { id: orgId },
        select: { integrations: true }
    });

    const account = (org?.integrations as any)?.metaAccounts?.find((a: any) => a.pageName === 'Emtees Academy');
    const accessToken = decrypt(account.accessToken);

    const formsResponse = await axios.get(`https://graph.facebook.com/v18.0/${account.pageId}/leadgen_forms`, {
        params: { access_token: accessToken, fields: 'id,name,status', limit: 100 }
    });

    const forms = formsResponse.data.data;
    console.log(`Found ${forms.length} total forms.`);

    // Today midnight UTC
    const sinceTime = Math.floor(new Date().setUTCHours(0,0,0,0) / 1000);
    
    let activeFound = 0;
    for (const form of forms) {
        if (form.status !== 'ACTIVE') continue;
        activeFound++;
        try {
            const leadsResponse = await axios.get(`https://graph.facebook.com/v18.0/${form.id}/leads`, {
                params: { 
                    access_token: accessToken, 
                    fields: 'id,created_time', 
                    filtering: JSON.stringify([{ field: 'time_created', operator: 'GREATER_THAN', value: sinceTime }]),
                    limit: 10 
                }
            });
            const leads = leadsResponse.data.data;
            if (leads && leads.length > 0) {
                console.log(`✅ Form ${form.name} (${form.id}): found ${leads.length} leads TODAY! Latest: ${leads[0].created_time}`);
            }
        } catch (e: any) {
            console.error(`Error on form ${form.name}: ${e.response?.data?.error?.message || e.message}`);
        }
    }
    console.log(`Checked ${activeFound} active forms for leads submitted today.`);
    await prisma.$disconnect();
}

checkLeads();
