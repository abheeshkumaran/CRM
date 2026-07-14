import { PrismaClient } from '../../src/generated/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Debugging Duplicate Interactions ---');
    
    // Look for the specific number from the screenshot
    const phone = '+919958669738';
    const interactions = await prisma.interaction.findMany({
        where: {
            OR: [
                { phoneNumber: { contains: '9958669738' } },
                { phoneNumber: { contains: '9947424434' } }
            ],
            createdAt: {
                gte: new Date('2026-04-14T00:00:00Z')
            }
        },
        orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${interactions.length} interactions for these numbers today.`);
    
    interactions.forEach(i => {
        console.log(`ID: ${i.id}`);
        console.log(`  Type: ${i.type}, Dir: ${i.direction}, Status: ${i.callStatus}`);
        console.log(`  Phone: ${i.phoneNumber}, Dur: ${i.duration}, HardwareID: ${i.hardwareId}`);
        console.log(`  SessionID: ${i.callSessionId}, CreatedAt: ${i.createdAt}`);
        console.log('-----------------------------------');
    });

    // Check unique constraints on the table
    try {
        const indexes = await prisma.$queryRaw`
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'Interaction' 
            AND indexdef LIKE '%UNIQUE%';
        `;
        console.log('Current Unique Indexes on Interaction table:');
        console.log(JSON.stringify(indexes, null, 2));
    } catch (e) {
        console.error('Failed to query indexes:', e);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
