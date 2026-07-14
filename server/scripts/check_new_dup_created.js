const { PrismaClient } = require('../dist/generated/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const today = new Date('2026-05-17T00:00:00.000Z');
    console.log('Retrieving details of May 17 duplicates...');

    const duplicates = await prisma.interaction.findMany({
      where: {
        type: 'call',
        isDeleted: false,
        phoneNumber: { in: ['9995669133', '7902669133', '+918714744915', '+919633986888', '9447702171'] },
        createdAt: { gte: today }
      },
      select: {
        id: true,
        createdById: true,
        phoneNumber: true,
        date: true,
        callSessionId: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log('Duplicate records details:', JSON.stringify(duplicates, null, 2));

  } catch (err) {
    console.error('Error running check:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
