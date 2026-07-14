import prisma from '../src/config/prisma';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
    console.log('Fetching the 10 most recent leads from the database...');
    try {
        const leads = await prisma.lead.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                source: true,
                status: true,
                metaPageId: true,
                metaFormId: true,
                createdAt: true,
                organisation: {
                    select: {
                        name: true
                    }
                }
            }
        });

        if (leads.length === 0) {
            console.log('No leads found in the database.');
        } else {
            console.table(leads.map(lead => ({
                id: lead.id,
                name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
                phone: lead.phone,
                source: lead.source,
                status: lead.status,
                pageId: lead.metaPageId || 'N/A',
                formId: lead.metaFormId || 'N/A',
                org: lead.organisation?.name || 'N/A',
                created: lead.createdAt.toISOString()
            })));
        }
    } catch (err: any) {
        console.error('Error fetching leads:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

run();
