import prisma from './src/config/prisma';
import { runShuffler } from './src/services/shufflerService';

async function test() {
    console.log("Fetching orgs with shufflerConfig:");
    const orgs = await prisma.organisation.findMany({ 
        where: { isDeleted: false, status: 'active' },
        select: { id: true, name: true, shufflerConfig: true, leadStatuses: true }
    });
    
    for (const org of orgs) {
        console.log(`Org: ${org.name}`);
        console.log(`Lead Statuses from org:`, org.leadStatuses);
        console.log(`Config:`, JSON.stringify(org.shufflerConfig, null, 2));

        if (org.shufflerConfig) {
            const config: any = org.shufflerConfig;
            
            // Auto fix incorrect IDs
            if (config.statuses.includes("test lead")) {
                config.statuses = ["test_lead"];
                await prisma.organisation.update({
                    where: { id: org.id },
                    data: { shufflerConfig: config }
                });
                console.log("Fixed config statuses in DB!");
            }
            
            const daysBefore = parseInt(config.shuffleBeforeDays) || 0;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysBefore);

            console.log(`Querying leads with statuses:`, config.statuses);
            console.log(`Cutoff date:`, cutoffDate);

            const allLeads = await prisma.lead.findMany({
                where: { organisationId: org.id, isDeleted: false },
                select: { id: true, status: true }
            });
            console.log(`All lead statuses in DB:`, Array.from(new Set(allLeads.map(l => l.status))));

            const leads = await prisma.lead.findMany({
                where: {
                    organisationId: org.id,
                    isDeleted: false,
                    status: { in: config.statuses },
                    updatedAt: { lt: cutoffDate }
                },
                select: { id: true, status: true, updatedAt: true }
            });
            console.log(`Found ${leads.length} eligible leads.`);
            if (leads.length > 0) {
                console.log(leads.slice(0, 3));
            }
            
            // Test run the actual shuffler service bypass time
            config.shuffleTime = `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`;
            await prisma.organisation.update({
                where: { id: org.id },
                data: { shufflerConfig: config }
            });
            console.log("Updated shuffleTime to current time to force trigger");
        }
    }

    await runShuffler();
}

test().catch(console.error).finally(() => prisma.$disconnect());
