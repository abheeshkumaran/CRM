import prisma from '../src/config/prisma';
import axios from 'axios';
import { decrypt } from '../src/utils/encryption';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
    const pageId = '246178733185033'; // Emtees Academy Page ID
    const orgId = '1c2349e1-1552-41de-9a35-cde6876b7052'; // Emtees Academy Org ID
    
    const org = await prisma.organisation.findUnique({
        where: { id: orgId },
        select: { integrations: true }
    });

    if (!org || !org.integrations) {
        console.error('Organisation or integrations not found');
        return;
    }

    const integrations = org.integrations as any;
    const accounts = [...(integrations.metaAccounts || [])];
    const account = accounts.find((acc: any) => acc.pageId === pageId);

    if (!account || !account.accessToken) {
        console.error('Account or access token not found for Page ID', pageId);
        return;
    }

    const accessToken = decrypt(account.accessToken);

    console.log(`Testing direct Page /leads endpoint for Page ${pageId} (${account.pageName})...`);

    try {
        const response = await axios.get(`https://graph.facebook.com/v18.0/${pageId}/leads`, {
            params: {
                access_token: accessToken,
                fields: 'id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,ad_account_id',
                limit: 20
            }
        });
        console.log('Success! Leads retrieved directly from Page:', response.data.data?.length || 0, 'leads found.');
        if (response.data.data && response.data.data.length > 0) {
            console.log('Sample Lead:', JSON.stringify(response.data.data[0], null, 2));
        }
    } catch (error: any) {
        console.error('Failed to fetch from Page /leads:', error.response?.data || error.message);
    } finally {
        await prisma.$disconnect();
    }
}

run();
