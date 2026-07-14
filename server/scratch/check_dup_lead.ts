import prisma from '../src/config/prisma';

async function main() {
    const leads = await prisma.lead.findMany({
        where: { phone: '916282808737' },
        select: { id: true, firstName: true, phone: true, branchId: true, isDeleted: true, organisationId: true, createdAt: true }
    });
    console.log(leads);
}
main().finally(() => prisma.$disconnect());
