import prisma from '../src/config/prisma';
async function main() {
    const leads = await prisma.lead.findMany({
        where: { phone: '9048212514' },
        select: { id: true, source: true, createdAt: true, updatedAt: true, branchId: true }
    });
    console.log(leads);
}
main().finally(() => prisma.$disconnect());
