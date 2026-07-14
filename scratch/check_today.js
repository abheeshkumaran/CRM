const { PrismaClient } = require('../server/src/generated/client');

const prisma = new PrismaClient();

async function checkTodayInteractions() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  console.log('Checking interactions between:', startOfDay.toISOString(), 'and', endOfDay.toISOString());

  try {
    const count = await prisma.interaction.count({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        },
        isDeleted: false
      }
    });

    console.log('Total interactions today:', count);

    const totalCount = await prisma.interaction.count({ where: { isDeleted: false } });
    console.log('Total interactions in DB:', totalCount);

    if (totalCount > 0) {
      const latest = await prisma.interaction.findFirst({
        where: { isDeleted: false },
        orderBy: { date: 'desc' },
        select: { date: true }
      });
      console.log('Latest interaction date:', latest?.date?.toISOString());
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

checkTodayInteractions();
