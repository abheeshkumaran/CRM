import { PrismaClient } from '../server/src/generated/client';

const prisma = new PrismaClient();

async function checkTodayInteractions() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  console.log('Checking interactions between:', startOfDay.toISOString(), 'and', endOfDay.toISOString());

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

  const samples = await prisma.interaction.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay
      },
      isDeleted: false
    },
    take: 5,
    select: {
      id: true,
      type: true,
      date: true,
      createdBy: { select: { firstName: true, lastName: true } }
    }
  });

  console.log('Sample interactions:', JSON.stringify(samples, null, 2));

  // Check if any interactions exist AT ALL to see if the date filter is the problem
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

  process.exit(0);
}

checkTodayInteractions().catch(err => {
  console.error(err);
  process.exit(1);
});
