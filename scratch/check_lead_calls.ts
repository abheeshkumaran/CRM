import { PrismaClient } from '../server/src/generated/client/index.js';
const prisma = new PrismaClient();

async function main() {
    const leadId = 'fc968ff6-f7e4-4d64-8922-1b651dfe09fe';

    console.log('\n--- TODAY\'S INTERACTIONS ---');
    const interactions = await prisma.interaction.findMany({
        where: {
            leadId,
            date: { gte: new Date('2026-05-17T00:00:00.000Z') }
        },
        orderBy: { date: 'desc' }
    });
    console.dir(interactions, { depth: null });

    console.log('\n--- TODAY\'S WHATSAPP MESSAGES ---');
    const messages = await prisma.whatsAppMessage.findMany({
        where: {
            leadId,
            createdAt: { gte: new Date('2026-05-17T00:00:00.000Z') }
        },
        orderBy: { createdAt: 'desc' }
    });
    console.dir(messages, { depth: null });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
