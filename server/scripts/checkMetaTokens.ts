import prisma from '../src/config/prisma';
import axios from 'axios';
import { decrypt } from '../src/utils/encryption';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;

async function checkTokens() {
    const orgs = await prisma.organisation.findMany({
        where: { isDeleted: false, status: { in: ['active', 'suspended'] } },
        select: { id: true, name: true, integrations: true }
    });

    for (const org of orgs) {
        const integrations = org.integrations as any;
        const accounts = integrations?.metaAccounts || [];
        if (accounts.length === 0) continue;

        console.log(`\n=== Org: ${org.name} ===`);

        for (const account of accounts) {
            if (!account.accessToken || !account.pageId) continue;
            const accessToken = decrypt(account.accessToken);

            console.log(`\nPage: ${account.pageName || account.pageId}`);
            console.log(`  Token expires at: ${account.tokenExpiresAt || 'UNKNOWN'}`);

            // 1. Debug the token via Meta's /debug_token endpoint
            try {
                const debugRes = await axios.get('https://graph.facebook.com/debug_token', {
                    params: {
                        input_token: accessToken,
                        access_token: `${APP_ID}|${APP_SECRET}`
                    }
                });
                const data = debugRes.data.data;
                console.log(`  Token Valid:     ${data.is_valid}`);
                console.log(`  Token Type:      ${data.type}`);
                console.log(`  App ID matches:  ${data.app_id === APP_ID}`);
                console.log(`  Expires at:      ${data.expires_at ? new Date(data.expires_at * 1000).toISOString() : 'Never (long-lived)'}`);
                console.log(`  Scopes:          ${(data.scopes || []).join(', ')}`);
                
                if (!data.is_valid) {
                    console.log(`  ❌ TOKEN IS INVALID — Error: ${data.error?.message}`);
                } else if (!data.scopes?.includes('leads_retrieval')) {
                    console.log(`  ⚠️  MISSING leads_retrieval PERMISSION!`);
                } else {
                    console.log(`  ✅ Token is valid and has leads_retrieval permission`);
                }
            } catch (e: any) {
                console.error(`  ❌ Failed to debug token: ${e.response?.data?.error?.message || e.message}`);
            }
        }
    }

    await prisma.$disconnect();
}

checkTokens();
