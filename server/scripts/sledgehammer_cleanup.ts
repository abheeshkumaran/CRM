import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- SLEDGEHAMMER: Nuclear Duplicate Sanitization (v1.8) ---');

    // 1. Group and Purge by hardwareId + organisationId
    console.log('Scanning for hardwareId collisions...');
    const hwDuplicates = await prisma.$queryRaw<any[]>`
        SELECT "organisationId", "hardwareId", COUNT(*) 
        FROM "Interaction" 
        WHERE "hardwareId" IS NOT NULL AND "hardwareId" != ''
        GROUP BY "organisationId", "hardwareId" 
        HAVING COUNT(*) > 1;
    `;

    console.log(`Discovered ${hwDuplicates.length} hardware collision groups.`);
    for (const group of hwDuplicates) {
        const records = await prisma.interaction.findMany({
            where: {
                organisationId: group.organisationId,
                hardwareId: group.hardwareId
            },
            orderBy: { createdAt: 'asc' }
        });

        const toDeleteIds = records.slice(1).map((r: any) => r.id);
        console.log(`  Cleaning hardwareId ${group.hardwareId}: Keeping ${records[0].id}, nuking ${toDeleteIds.length} clones.`);
        await prisma.interaction.deleteMany({ where: { id: { in: toDeleteIds } } });
    }

    // 2. Group and Purge by callSessionId + organisationId
    console.log('Scanning for callSessionId collisions...');
    const sessionDuplicates = await prisma.$queryRaw<any[]>`
        SELECT "organisationId", "callSessionId", COUNT(*) 
        FROM "Interaction" 
        WHERE "callSessionId" IS NOT NULL AND "callSessionId" != ''
        GROUP BY "organisationId", "callSessionId" 
        HAVING COUNT(*) > 1;
    `;

    console.log(`Discovered ${sessionDuplicates.length} session collision groups.`);
    for (const group of sessionDuplicates) {
        const records = await prisma.interaction.findMany({
            where: {
                organisationId: group.organisationId,
                callSessionId: group.callSessionId
            },
            orderBy: { createdAt: 'asc' }
        });

        const toDeleteIds = records.slice(1).map((r: any) => r.id);
        console.log(`  Cleaning session ${group.callSessionId}: Keeping ${records[0].id}, nuking ${toDeleteIds.length} clones.`);
        await prisma.interaction.deleteMany({ where: { id: { in: toDeleteIds } } });
    }

    // 3. Time-Proximity Purge (Same Phone Number within 60 seconds)
    // This catches ghost entries that might have missed a Hardware ID or Session ID link
    console.log('Scanning for time-proximity ghost entries (last 48 hours)...');
    const recentCalls = await prisma.interaction.findMany({
        where: {
            createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }
        },
        orderBy: { createdAt: 'asc' }
    });

    let ghostsRemoved = 0;
    for (let i = 0; i < recentCalls.length; i++) {
        const current = recentCalls[i];
        for (let j = i + 1; j < recentCalls.length; j++) {
            const next = recentCalls[j];
            
            // If it's same phone, same org, and within 60 seconds
            const timeDiff = Math.abs(next.createdAt.getTime() - current.createdAt.getTime());
            if (current.organisationId === next.organisationId && 
                current.phoneNumber === next.phoneNumber && 
                timeDiff < 60000) {
                
                // Keep the one with hardwareDuration (Carrier Truth)
                let toDelete = null;
                if ((current.hardwareDuration || 0) >= (next.hardwareDuration || 0)) {
                    toDelete = next.id;
                } else {
                    toDelete = current.id;
                }

                console.log(`  TIME COLLISION: Phones ${current.phoneNumber} within ${timeDiff/1000}s. Nuking ${toDelete}.`);
                try {
                    await prisma.interaction.delete({ where: { id: toDelete } });
                    ghostsRemoved++;
                } catch (e) {
                    // Already deleted in previous loop iteration
                }
            }
        }
    }
    console.log(`Handled ${ghostsRemoved} time-proximity ghost entries.`);

    // 4. IRON VEIL (v1.9): Cross-Number Ghosting (0-sec Outbound near ANY Inbound)
    console.log('Scanning for cross-number "Iron Veil" ghost entries (last 48 hours)...');
    let ironVeilsRemoved = 0;
    const allRecent = await prisma.interaction.findMany({
        where: {
            createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }
        },
        orderBy: { createdAt: 'asc' }
    });

    for (let i = 0; i < allRecent.length; i++) {
        const first = allRecent[i];
        for (let j = i + 1; j < allRecent.length; j++) {
            const second = allRecent[j];

            const timeDiff = Math.abs(second.createdAt.getTime() - first.createdAt.getTime());
            if (timeDiff < 15000) { // 15 seconds window
                // Check if one is Inbound and one is 0-sec Outbound (from different or same number)
                let ghostId = null;
                if (first.direction === 'inbound' && second.direction === 'outbound' && (second.duration || 0) === 0) {
                    ghostId = second.id;
                } else if (second.direction === 'inbound' && first.direction === 'outbound' && (first.duration || 0) === 0) {
                    ghostId = first.id;
                }

                if (ghostId) {
                    console.log(`  IRON VEIL: Suppressing UI-Ghost ${ghostId} near Inbound session. TimeDiff: ${timeDiff}ms.`);
                    try {
                        await prisma.interaction.delete({ where: { id: ghostId } });
                        ironVeilsRemoved++;
                    } catch (e) {}
                }
            }
        }
    }
    console.log(`Suppressed ${ironVeilsRemoved} Iron Veil ghosts.`);

    console.log('--- SLEDGEHAMMER PROTOCOL COMPLETE ---');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
