import prisma from '../src/config/prisma';

async function main() {
    const orgId = '85cc3715-7f8d-4f22-b0b0-a40a502bc6fa';
    const cleanPhone = '9048212514';
    
    // Simulate what checkDuplicate does
    const conditions = [
        { phone: cleanPhone },
        { secondaryPhone: cleanPhone },
        { phone: `+${cleanPhone}` },
        { secondaryPhone: `+${cleanPhone}` },
        { phone: '91' + cleanPhone },
        { secondaryPhone: '91' + cleanPhone }
    ];
    
    const where: any = {
        OR: conditions,
        isDeleted: false,
        organisationId: orgId
    };
    
    console.log("Where clause:", JSON.stringify(where, null, 2));

    const existingLead = await prisma.lead.findFirst({
        where: where
    });
    
    console.log("Found:", existingLead?.id);
}
main().finally(() => prisma.$disconnect());
