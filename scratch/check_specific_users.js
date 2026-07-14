const { PrismaClient } = require('../server/src/generated/client/index.js');
const prisma = new PrismaClient();

async function main() {
    const targetNames = ['Aparna', 'Girish', 'Sharon', 'Sneha', 'Mahshook', 'Dhanya'];
    console.log('Searching for users matching:', targetNames);

    const users = await prisma.user.findMany({
        where: {
            OR: targetNames.map(name => ({
                firstName: { contains: name, mode: 'insensitive' }
            }))
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
        }
    });

    console.log(`Found ${users.length} users:`);
    console.dir(users);

    for (const u of users) {
        console.log(`\n=== Interactions for ${u.firstName} ${u.lastName} ===`);
        const total = await prisma.interaction.count({
            where: { createdById: u.id, type: 'call' }
        });
        console.log(`Total calls: ${total}`);

        const statusCounts = await prisma.interaction.groupBy({
            by: ['callStatus'],
            where: { createdById: u.id, type: 'call' },
            _count: { id: true }
        });
        console.log('Status counts:');
        console.dir(statusCounts);

        if (total > 0) {
            const latest = await prisma.interaction.findMany({
                where: { createdById: u.id, type: 'call' },
                orderBy: { date: 'desc' },
                take: 3,
                select: {
                    id: true,
                    date: true,
                    callStatus: true,
                    duration: true,
                    phoneNumber: true,
                    subject: true
                }
            });
            console.log('Latest 3 calls:');
            console.dir(latest);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
