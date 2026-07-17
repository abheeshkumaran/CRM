import { PrismaClient } from './src/generated/client';
const prisma = new PrismaClient();

async function main() {
    const orgs = await prisma.organisation.findMany({
        where: { shufflerConfig: { not: null } },
        select: { id: true, name: true, shufflerConfig: true }
    });
    console.dir(orgs, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
