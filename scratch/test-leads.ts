import { PrismaClient } from '../server/src/generated/client/index.js';
const prisma = new PrismaClient();

async function main() {
    console.log("Retrieving opportunities and linked leads...");
    const opps = await prisma.opportunity.findMany({
        where: { isDeleted: false },
        take: 5,
        include: {
            lead: true
        }
    });

    for (const opp of opps) {
        console.log(`Opportunity: "${opp.name}" (ID: ${opp.id})`);
        if (opp.lead) {
            console.log(`  Linked Lead: "${opp.lead.firstName} ${opp.lead.lastName || ''}" (ID: ${opp.lead.id})`);
            console.log(`    Current Lead Status: "${opp.lead.status}"`);
            
            // Try updating the status to 'demo_scheduled' to see if it throws any database constraint errors
            try {
                const updatedLead = await prisma.lead.update({
                    where: { id: opp.lead.id },
                    data: { status: 'demo_scheduled' }
                });
                console.log(`    Successfully updated lead status to "demo_scheduled"! New status: "${updatedLead.status}"`);
                
                // Restore original status
                await prisma.lead.update({
                    where: { id: opp.lead.id },
                    data: { status: opp.lead.status }
                });
                console.log(`    Successfully restored lead status.`);
            } catch (e) {
                console.error(`    FAILED to update lead status:`, e);
            }
        } else {
            console.log("  No linked lead.");
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
