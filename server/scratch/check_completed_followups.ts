import { PrismaClient } from '../src/generated/client';
const prisma = new PrismaClient();

async function run() {
    try {
        const all = await prisma.followUp.findMany({
            select: {
                id: true,
                subject: true,
                status: true,
                dueDate: true,
                isDeleted: true,
                lead: { select: { id: true, firstName: true, lastName: true, nextFollowUp: true } }
            }
        });
        console.log(`Total follow-ups: ${all.length}`);
        console.log('Follow-ups grouped by status:');
        const grouped: any = {};
        all.forEach(f => {
            grouped[f.status] = (grouped[f.status] || 0) + 1;
        });
        console.log(grouped);

        console.log('\nSample completed followups:');
        const completed = all.filter(f => f.status === 'completed');
        console.log(JSON.stringify(completed.slice(0, 5), null, 2));

        console.log('\nSample active followups:');
        const active = all.filter(f => f.status !== 'completed');
        console.log(JSON.stringify(active.slice(0, 5), null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
