const { PrismaClient } = require('../server/src/generated/client/index.js');
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.callSettings.findMany({});
    console.log('--- CALL SETTINGS ---');
    console.dir(settings);

    const users = await prisma.user.findMany({
        where: {
            firstName: { in: ['Mahshook', 'Girish', 'Sharon', 'Sneha', 'Dhanya', 'Aparna'] }
        },
        select: {
            firstName: true,
            lastName: true,
            organisationId: true
        }
    });
    console.log('\n--- TARGET USERS ORGANISATIONS ---');
    console.dir(users);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
