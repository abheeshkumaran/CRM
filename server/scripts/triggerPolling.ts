import prisma from '../src/config/prisma';
import { MetaPollingService } from '../src/services/metaPollingService';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
    console.log('Triggering Meta polling manually...');
    try {
        await MetaPollingService.pollAllOrganisations();
        console.log('Meta polling completed.');
    } catch (err: any) {
        console.error('Failed to run Meta polling:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
