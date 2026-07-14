import prisma from '../src/config/prisma';
async function main() {
    const orgs = await prisma.organisation.findMany({ select: { id: true } });
    if (orgs.length === 0) return;
    const orgId = orgs[0].id;
    const duplicatesByPhone = await prisma.$queryRaw<any[]>`
        SELECT phone, "branchId", COUNT(*) as count, 
               array_agg(id) as lead_ids,
               array_agg("createdAt") as created_ats
        FROM "Lead"
        WHERE "organisationId" = ${orgId}
          AND "isDeleted" = false
          AND phone IS NOT NULL
          AND phone != ''
        GROUP BY phone, "branchId"
        HAVING COUNT(*) > 1
    `;
    console.log(duplicatesByPhone);
}
main().finally(() => prisma.$disconnect());
