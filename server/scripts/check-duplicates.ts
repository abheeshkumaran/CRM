import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function checkDuplicates() {
    console.log('--- Checking for Duplicate Interactions (Optimized) ---');
    
    const interactions = await prisma.interaction.findMany({
        where: {
            type: 'call',
            isDeleted: false,
            date: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
        },
        orderBy: { date: 'asc' }
    });

    console.log(`Analyzing ${interactions.length} interactions...`);

    const map = new Map<string, any[]>();
    let duplicateCount = 0;

    for (const i of interactions) {
        const phoneSuffix = (i.phoneNumber || '').replace(/[^0-9]/g, '').slice(-10);
        if (!phoneSuffix) continue;

        // Key: OrgId + UserId + PhoneSuffix
        const key = `${i.organisationId}-${i.createdById}-${phoneSuffix}`;
        
        if (!map.has(key)) {
            map.set(key, [i]);
        } else {
            const existing = map.get(key)!;
            let isDuplicate = false;
            for (const other of existing) {
                const diff = Math.abs(i.date.getTime() - other.date.getTime()) / 1000;
                if (diff < 60) { // Within 1 minute
                    isDuplicate = true;
                    duplicateCount++;
                    break;
                }
            }
            existing.push(i);
        }
    }

    console.log(`Found ${duplicateCount} potential duplicates.`);
}

checkDuplicates().catch(console.error).finally(() => prisma.$disconnect());
