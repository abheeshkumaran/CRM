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
    let leadsFound = false;

    for (const form of forms) {
        if (form.status !== 'ACTIVE') continue;
        try {
            const leadsResponse = await axios.get(`https://graph.facebook.com/v18.0/${form.id}/leads`, {
                params: { 
                    access_token: accessToken, 
                    fields: 'id,created_time', 
                    limit: 1 
                }
            });
            const leads = leadsResponse.data.data;
            if (leads && leads.length > 0) {
                console.log(`✅ Form ${form.name}: Absolute latest lead was on ${leads[0].created_time}`);
                leadsFound = true;
                break; // Stop after finding the first one to prove it works
            }
        } catch (e: any) {}
    }
    
    if (!leadsFound) {
        console.log('No leads found in any active form of Emtees Academy for all time (or they expired).');
    }
    await prisma.$disconnect();
}

checkLeads();
