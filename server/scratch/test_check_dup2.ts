import prisma from '../src/config/prisma';
import DuplicateLeadService from '../src/services/duplicateLeadService';

async function main() {
    const leads = await prisma.lead.findMany({
        where: { phone: '9048212514' },
        select: { id: true, organisationId: true, branchId: true }
    });
    console.log("Leads in DB:", leads);
    if (leads.length > 0) {
        const orgId = leads[0].organisationId;
        console.log("Using orgId:", orgId);
        const duplicateCheck = await DuplicateLeadService.checkDuplicate('9048212514', null, orgId, undefined);
        console.log("Duplicate check result:", duplicateCheck);
    }
}
main().finally(() => prisma.$disconnect());
