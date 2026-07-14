// @ts-ignore
import { PrismaClient } from '../../src/generated/client';

const prisma = new PrismaClient();

async function cleanupDuplicates() {
  console.log('Starting duplicate cleanup...');

  // 1. Find all duplicate callSessionIds within the same organisation
  const duplicates = await prisma.$queryRaw`
    SELECT "organisationId", "callSessionId", COUNT(*) as cnt
    FROM "Interaction"
    WHERE "callSessionId" IS NOT NULL AND "callSessionId" != 'none'
    GROUP BY "organisationId", "callSessionId"
    HAVING COUNT(*) > 1
  ` as any[];

  console.log(`Found ${duplicates.length} groups of duplicates by callSessionId.`);

  for (const group of duplicates) {
    const records = await prisma.interaction.findMany({
      where: {
        organisationId: group.organisationId,
        callSessionId: group.callSessionId
      },
      orderBy: { createdAt: 'desc' }
    });

    // Keep the first one, delete the rest
    const idsToDelete = records.slice(1).map((r: any) => r.id);
    await prisma.interaction.deleteMany({
      where: { id: { in: idsToDelete } }
    });
    console.log(`Deleted ${idsToDelete.length} duplicates for session ${group.callSessionId}`);
  }

  // 2. Resolve duplicates by hardwareId (if any)
  const hwDuplicates = await prisma.$queryRaw`
    SELECT "organisationId", "hardwareId", COUNT(*) as cnt
    FROM "Interaction"
    WHERE "hardwareId" IS NOT NULL AND "hardwareId" != 'none'
    GROUP BY "organisationId", "hardwareId"
    HAVING COUNT(*) > 1
  ` as any[];

  console.log(`Found ${hwDuplicates.length} groups of duplicates by hardwareId.`);

  for (const group of hwDuplicates) {
    const records = await prisma.interaction.findMany({
      where: {
        organisationId: group.organisationId,
        hardwareId: group.hardwareId
      },
      orderBy: { createdAt: 'desc' }
    });

    const idsToDelete = records.slice(1).map((r: any) => r.id);
    await prisma.interaction.deleteMany({
      where: { id: { in: idsToDelete } }
    });
    console.log(`Deleted ${idsToDelete.length} duplicates for hardwareId ${group.hardwareId}`);
  }

  console.log('Cleanup complete.');
}

cleanupDuplicates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
