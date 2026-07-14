const { PrismaClient } = require('../server/src/generated/client/index.js');
const prisma = new PrismaClient();

async function main() {
    console.log('--- CALL STATUSES IN THE LAST 7 DAYS ---');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const users = await prisma.user.findMany({
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
        }
    });

    for (const u of users) {
        const counts = await prisma.interaction.groupBy({
            by: ['callStatus'],
            where: {
                createdById: u.id,
                type: 'call',
                date: { gte: sevenDaysAgo },
                isDeleted: false
            },
            _count: {
                id: true
            }
        });

        if (counts.length > 0) {
            console.log(`User: ${u.firstName} ${u.lastName} (${u.email})`);
            console.dir(counts);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
