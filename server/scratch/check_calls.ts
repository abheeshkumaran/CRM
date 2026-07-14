import prisma from '../src/config/prisma';

async function main() {
    console.log("--- Checking Call Logs Sync ---");
    
    // 1. Total Interactions with type 'call'
    const totalCalls = await prisma.interaction.count({
        where: { type: 'call' }
    });
    console.log(`Total Call Interactions in DB: ${totalCalls}`);

    // 2. Call counts by User
    const userCallCounts = await prisma.interaction.groupBy({
        by: ['createdById'],
        where: { type: 'call' },
        _count: {
            id: true
        },
        _max: {
            date: true
        }
    });

    console.log("\nCall logs count and latest call by user ID:");
    for (const record of userCallCounts) {
        const user = await prisma.user.findUnique({
            where: { id: record.createdById || '' },
            select: { firstName: true, lastName: true, email: true }
        });
        console.log(`- ${user?.firstName} ${user?.lastName} (${user?.email || 'N/A'}): ${record._count.id} calls, Latest: ${record._max.date}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
