import prisma from '../src/config/prisma';
import axios from 'axios';
import { decrypt } from '../src/utils/encryption';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function subscribePages() {
    const orgs = await prisma.organisation.findMany({
        where: {
            isDeleted: false,
            status: 'active'
        }
    });

    console.log(`Found ${orgs.length} active organisations to inspect...`);

    for (const org of orgs) {
        const integrations = (org.integrations as any) || {};
        const accounts: any[] = [...(integrations.metaAccounts || [])];
        
        if (integrations.meta && integrations.meta.connected) {
            const exists = accounts.some(acc => acc.pageId === integrations.meta.pageId);
            if (!exists) accounts.push(integrations.meta);
        }

        if (accounts.length === 0) continue;

        console.log(`Org: ${org.name} has ${accounts.length} connected page(s).`);

        for (const account of accounts) {
            if (!account.pageId || !account.accessToken) continue;
            
            const accessToken = decrypt(account.accessToken);
            console.log(`Attempting to subscribe Page ${account.pageId} (${account.pageName || 'No Name'}) to app...`);

            try {
                const response = await axios.post(`https://graph.facebook.com/v18.0/${account.pageId}/subscribed_apps`, null, {
                    params: {
                        access_token: accessToken,
                        subscribed_fields: 'leadgen'
                    }
                });
                console.log(`✅ Success for ${account.pageName || account.pageId}:`, response.data);
            } catch (error: any) {
                console.error(`❌ Failed for ${account.pageName || account.pageId}:`, error.response?.data || error.message);
            }
        }
    }
    await prisma.$disconnect();
}

subscribePages();
