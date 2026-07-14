import prisma from '../src/config/prisma';
async function main() {
    const duplicatesByPhone = await prisma.$queryRaw<any[]>`
        SELECT phone, "branchId", "organisationId", COUNT(*) as count, 
               array_agg(id) as lead_ids,
               array_agg("createdAt") as created_ats
        FROM "Lead"
        WHERE "isDeleted" = false
          AND phone IS NOT NULL
          AND phone != ''
        GROUP BY phone, "branchId", "organisationId"
        HAVING COUNT(*) > 1
    `;
    console.log(duplicatesByPhone.map(d => ({ phone: d.phone, count: Number(d.count), dates: d.created_ats })));
}
main().finally(() => prisma.$disconnect());
