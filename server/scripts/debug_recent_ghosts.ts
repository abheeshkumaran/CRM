import { PrismaClient } from '../../src/generated/client';
const prisma = new PrismaClient();
async function main() {
    console.log('--- Debugging Recent Ghost Calls (v2) ---');
    const records = await prisma.interaction.findMany({
        where: {
            createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) } // Last 6 hours
        },
        orderBy: { createdAt: 'desc' }
    });
    records.forEach(r => {
        console.log(`ID: ${r.id} | Phone: ${r.phoneNumber} | Dir: ${r.direction} | Session: ${r.callSessionId} | HW: ${r.hardwareId} | Created: ${r.createdAt}`);
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
