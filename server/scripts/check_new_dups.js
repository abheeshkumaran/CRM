const { PrismaClient } = require('../dist/generated/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const today = new Date('2026-05-17T00:00:00.000Z');
    console.log('Checking duplicate call logs created since:', today.toISOString());

    const duplicates = await prisma.$queryRaw`
      SELECT "createdById", "phoneNumber", date, COUNT(*) as cnt
      FROM "Interaction" 
      WHERE type = 'call' AND "isDeleted" = false AND "phoneNumber" IS NOT NULL AND "createdAt" >= ${today}
      GROUP BY "createdById", "phoneNumber", date 
      HAVING COUNT(*) > 1 
      ORDER BY cnt DESC
    `;

    console.log('New duplicates found:', duplicates.length);
    if (duplicates.length > 0) {
      console.log('Details:', duplicates);
    } else {
      console.log('✅ SUCCESS: Zero new duplicates have been created since the deduplication fix was deployed today!');
    }

  } catch (err) {
    console.error('Error running check:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
