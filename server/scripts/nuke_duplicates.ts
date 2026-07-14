import { PrismaClient } from '../../src/generated/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- IRON SHIELD: Duplicate Sanitization Protocol ---');

    // 1. Find all duplicate groups based on hardwareId
    const duplicates = await prisma.$queryRaw<any[]>`
        SELECT "organisationId", "hardwareId", COUNT(*) 
        FROM "Interaction" 
        WHERE "hardwareId" IS NOT NULL AND "hardwareId" != ''
        GROUP BY "organisationId", "hardwareId" 
        HAVING COUNT(*) > 1;
    `;

    console.log(`Found ${duplicates.length} hardwareId groups with duplicates.`);

    for (const group of duplicates) {
        const records = await prisma.interaction.findMany({
            where: {
                organisationId: group.organisationId,
                hardwareId: group.hardwareId
            },
            orderBy: { createdAt: 'asc' }
        });

        const toDeleteIds = records.slice(1).map((r: any) => r.id);
        console.log(`Cleaning group ${group.hardwareId}: Keeping ${records[0].id}, deleting ${toDeleteIds.length} extras.`);
        
        await prisma.interaction.deleteMany({
            where: { id: { in: toDeleteIds } }
        });
    }

    // 2. Find all duplicate groups based on callSessionId
    const sessionDuplicates = await prisma.$queryRaw<any[]>`
        SELECT "organisationId", "callSessionId", COUNT(*) 
        FROM "Interaction" 
        WHERE "callSessionId" IS NOT NULL AND "callSessionId" != ''
        GROUP BY "organisationId", "callSessionId" 
        HAVING COUNT(*) > 1;
    `;

    console.log(`Found ${sessionDuplicates.length} sessionID groups with duplicates.`);

    for (const group of sessionDuplicates) {
        const records = await prisma.interaction.findMany({
            where: {
                organisationId: group.organisationId,
                callSessionId: group.callSessionId
            },
            orderBy: { createdAt: 'asc' }
        });

        const toDeleteIds = records.slice(1).map((r: any) => r.id);
        console.log(`Cleaning session ${group.callSessionId}: Keeping ${records[0].id}, deleting ${toDeleteIds.length} extras.`);
        
        await prisma.interaction.deleteMany({
            where: { id: { in: toDeleteIds } }
        });
    }

    // 3. Special Case: Outbound/Inbound overlap (Ghost Calls)
    // Find calls with same number and very close timestamps (within 10 seconds) where one is inbound and one is outbound
    // We only clean these if the outbound has 0 duration (typical ghost behavior)
    const ghostOutbounds = await prisma.interaction.findMany({
        where: {
            direction: 'outbound',
            duration: 0,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        }
    });

    for (const ghost of ghostOutbounds) {
        const nearbyInbound = await prisma.interaction.findFirst({
            where: {
                direction: 'inbound',
                phoneNumber: ghost.phoneNumber, // Simplified check
                createdAt: {
                    gte: new Date(ghost.createdAt.getTime() - 15000),
                    lte: new Date(ghost.createdAt.getTime() + 15000)
                }
            }
        });

        if (nearbyInbound) {
            console.log(`Ghost Outbound detected: ID ${ghost.id} overlapping with Inbound ${nearbyInbound.id}. Deleting ghost.`);
            await prisma.interaction.delete({ where: { id: ghost.id } });
        }
    }

    console.log('--- Sanitization Complete ---');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
