import prisma from '../src/config/prisma';
import axios from 'axios';
import { decrypt } from '../src/utils/encryption';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function subscribePage() {
    const orgId = '85cc3715-7f8d-4f22-b0b0-a40a502bc6fa'; // Edufolio
    const org = await prisma.organisation.findUnique({
        where: { id: orgId },
        select: { integrations: true }
    });

    if (!org || !org.integrations) {
        console.error('Organisation or integrations not found');
        return;
    }

    const metaConfig = (org.integrations as any).meta;
    if (!metaConfig || !metaConfig.accessToken || !metaConfig.pageId) {
        console.error('Meta config missing pageId or accessToken');
        return;
    }

    const pageId = metaConfig.pageId;
    const accessToken = decrypt(metaConfig.accessToken);

    console.log(`Attempting to subscribe Page ${pageId} to app...`);

    try {
        const response = await axios.post(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, null, {
            params: {
                access_token: accessToken,
                subscribed_fields: 'leadgen,ads'
            }
        });
        console.log('Success:', response.data);
    } catch (error: any) {
        console.error('Failed:', error.response?.data || error.message);
    } finally {
        await prisma.$disconnect();
    }
}

subscribePage();
