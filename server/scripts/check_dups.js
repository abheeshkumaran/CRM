const { PrismaClient } = require('./dist/generated/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const totalCalls = await prisma.interaction.count({ 
      where: { type: 'call', isDeleted: false } 
    });
    console.log('Total calls in DB:', totalCalls);
    
    // Check duplicate interactions by (createdById, phoneNumber, date)
    const duplicates = await prisma.$queryRaw`
      SELECT "createdById", "phoneNumber", date, COUNT(*) as cnt
      FROM "Interaction" 
      WHERE type = 'call' AND "isDeleted" = false AND "phoneNumber" IS NOT NULL
      GROUP BY "createdById", "phoneNumber", date 
      HAVING COUNT(*) > 1 
      ORDER BY cnt DESC
      LIMIT 10
    `;
    console.log('Duplicate entries by phone + time:', duplicates);
    
    // Check duplicate interactions by hardwareId
    const dupHardware = await prisma.$queryRaw`
      SELECT "hardwareId", COUNT(*) as cnt
      FROM "Interaction" 
      WHERE type = 'call' AND "hardwareId" IS NOT NULL AND "hardwareId" != 'none' AND "isDeleted" = false
      GROUP BY "hardwareId" 
      HAVING COUNT(*) > 1 
      ORDER BY cnt DESC
      LIMIT 10
    `;
    console.log('Duplicate entries by hardwareId:', dupHardware);

    // Let's print out one example of a duplicate pair to see what is different between them
    if (dupHardware.length > 0 && dupHardware[0].hardwareId) {
      const sampleHwId = dupHardware[0].hardwareId;
      const samples = await prisma.interaction.findMany({
        where: { hardwareId: sampleHwId },
        select: {
          id: true,
          createdById: true,
          date: true,
          duration: true,
          recordingDuration: true,
          hardwareDuration: true,
          callStatus: true,
          phoneNumber: true,
          createdAt: true,
          updatedAt: true
        }
      });
      console.log(`\nSample duplicates for hardwareId "${sampleHwId}":`, JSON.stringify(samples, null, 2));
    }

    // Let's print out one example of duplicates by time
    if (duplicates.length > 0) {
      const sample = duplicates[0];
      const samples = await prisma.interaction.findMany({
        where: { 
          createdById: sample.createdById,
          phoneNumber: sample.phoneNumber,
          date: sample.date
        },
        select: {
          id: true,
          createdById: true,
          date: true,
          duration: true,
          recordingDuration: true,
          hardwareDuration: true,
          callStatus: true,
          phoneNumber: true,
          createdAt: true,
          updatedAt: true
        }
      });
      console.log(`\nSample duplicates for phone + time:`, JSON.stringify(samples, null, 2));
    }

  } catch (err) {
    console.error('Error running check:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
