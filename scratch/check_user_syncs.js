const { PrismaClient } = require('../server/src/generated/client/index.js');
const prisma = new PrismaClient();

async function main() {
    const userId = 'd685ee31-6a1e-4d3f-98f3-2c5174a0ab9d'; // Mahshook
    console.log(`Checking syncs for Mahshook (${userId})`);

    const recordingCount = await prisma.callRecording.count({
        where: {
            lead: {
                organisationId: '413684d3-9e62-4594-a8c7-d915f9f964f5' // Org ID from report
            }
        }
    });
    console.log(`Total call recordings in org: ${recordingCount}`);

    // Check all interactions created by Mahshook
    const interactions = await prisma.interaction.findMany({
        where: { createdById: userId },
        orderBy: { date: 'desc' },
        take: 10
    });
    console.log(`Latest 10 interactions for Mahshook:`);
    console.dir(interactions);

    // Let's see if there are any records with hardwareId or callSessionId
    const withHardware = await prisma.interaction.count({
        where: {
            createdById: userId,
            hardwareId: { not: null }
        }
    });
    console.log(`Interactions for Mahshook with hardwareId: ${withHardware}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
