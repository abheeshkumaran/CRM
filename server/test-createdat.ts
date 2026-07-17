import { PrismaClient } from './src/generated/client';
const prisma = new PrismaClient();

async function main() {
    const org = await prisma.organisation.findFirst({ where: { shufflerConfig: { not: null } } });
    if (!org) return;
    const config = org.shufflerConfig as any;
    const leads = await prisma.lead.findMany({
        where: { organisationId: org.id, status: { in: config.statuses } },
        select: { id: true, firstName: true, createdAt: true, lastAssignedAt: true }
    });
    console.log(leads);
}
main().finally(() => prisma.$disconnect());
