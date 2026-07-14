import prisma from '../src/config/prisma';
import DuplicateLeadService from '../src/services/duplicateLeadService';

async function main() {
    const orgs = await prisma.organisation.findMany({ select: { id: true } });
    const orgId = orgs[0].id;
    const duplicateCheck = await DuplicateLeadService.checkDuplicate('9048212514', null, orgId, undefined);
    console.log(duplicateCheck);
}
main().finally(() => prisma.$disconnect());
