import prisma from '../src/config/prisma';
async function main() {
    const leads = await prisma.lead.findMany({
        where: { phone: '9048212514' },
        select: { id: true, source: true, sourceDetails: true, branchId: true, createdAt: true }
    });
    console.log(leads);
}
main().finally(() => prisma.$disconnect());
