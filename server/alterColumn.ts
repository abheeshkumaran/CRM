import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Lead" ALTER COLUMN "status" DROP DEFAULT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Lead" ALTER COLUMN "status" TYPE TEXT USING "status"::text;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Lead" ALTER COLUMN "status" SET DEFAULT 'new';`);
    console.log('Column altered successfully');
  } catch (err) {
    console.error('Error:', err);
  }
}

main().finally(() => prisma.$disconnect())
