import { PrismaClient } from './src/generated/client';
const prisma = new PrismaClient();

async function main() {
    const org = await prisma.organisation.findFirst({ where: { shufflerConfig: { not: null } } });
    if (!org) return;

    const config = org.shufflerConfig as any;
    const restPeriodDays = parseInt(config.restPeriodDays) || 0;
    const cutoffDate = new Date();
    cutoffDate.setHours(0, 0, 0, 0);
    cutoffDate.setDate(cutoffDate.getDate() - restPeriodDays);

    console.log(`Now: ${new Date()}`);
    console.log(`Rest Period: ${restPeriodDays}`);
    console.log(`Cutoff Date: ${cutoffDate}`);
    
    // Find ALL leads in statuses
    const allLeads = await prisma.lead.findMany({
        where: { organisationId: org.id, isDeleted: false, status: { in: config.statuses } },
        select: { id: true, firstName: true, lastAssignedAt: true, assignedToId: true }
    });
    console.log(`\nALL leads in statuses (${config.statuses.join(', ')}):`);
    console.log(allLeads);

    // Find ELIGIBLE leads
    const eligibleLeads = await prisma.lead.findMany({
        where: {
            organisationId: org.id,
            isDeleted: false,
            status: { in: config.statuses },
            lastAssignedAt: { lt: cutoffDate },
            assignedToId: { in: config.users || [] }
        },
        select: { id: true, firstName: true, lastAssignedAt: true, assignedToId: true }
    });
    console.log('\nELIGIBLE leads (which WILL be shuffled):');
    console.log(eligibleLeads);
}
main().catch(console.error).finally(() => prisma.$disconnect());
