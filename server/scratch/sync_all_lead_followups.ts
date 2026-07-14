import { PrismaClient } from '../src/generated/client';
const prisma = new PrismaClient();

async function run() {
    try {
        console.log('1. Loading all active followups...');
        const activeFollowUps = await prisma.followUp.findMany({
            where: {
                leadId: { not: null },
                isDeleted: false,
                status: { notIn: ['completed', 'deferred'] }
            },
            select: { leadId: true, dueDate: true },
            orderBy: { dueDate: 'asc' }
        });
        console.log(`Found ${activeFollowUps.length} active followups.`);

        // Build a map of leadId -> earliest active dueDate
        const earliestMap = new Map<string, Date>();
        for (const f of activeFollowUps) {
            if (f.leadId && !earliestMap.has(f.leadId)) {
                earliestMap.set(f.leadId, f.dueDate);
            }
        }
        console.log(`Earliest active dates mapped for ${earliestMap.size} leads.`);

        console.log('2. Fetching all leads nextFollowUp status...');
        const leads = await prisma.lead.findMany({
            where: { isDeleted: false },
            select: { id: true, nextFollowUp: true }
        });
        console.log(`Loaded ${leads.length} leads.`);

        let fixToNullCount = 0;
        let fixToDateCount = 0;
        const updates: { id: string; nextFollowUp: Date | null }[] = [];

        for (const lead of leads) {
            const mappedDate = earliestMap.get(lead.id);
            const currentDate = lead.nextFollowUp;

            if (mappedDate) {
                // If it has active follow-up but lead's nextFollowUp is null or different
                if (!currentDate || currentDate.getTime() !== mappedDate.getTime()) {
                    updates.push({ id: lead.id, nextFollowUp: mappedDate });
                    fixToDateCount++;
                }
            } else {
                // If it has NO active follow-up but lead's nextFollowUp is NOT null
                if (currentDate) {
                    updates.push({ id: lead.id, nextFollowUp: null });
                    fixToNullCount++;
                }
            }
        }

        const totalUpdates = updates.length;
        console.log(`3. Need to fix ${totalUpdates} leads (Clear to null: ${fixToNullCount}, Update to date: ${fixToDateCount}).`);

        if (totalUpdates === 0) {
            console.log('All leads are already in sync!');
            return;
        }

        // Perform updates in batches
        const batchSize = 100;
        console.log(`Starting execution in batches of ${batchSize}...`);
        for (let i = 0; i < totalUpdates; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            await Promise.all(
                batch.map(update =>
                    prisma.lead.update({
                        where: { id: update.id },
                        data: { nextFollowUp: update.nextFollowUp }
                    })
                )
            );
            console.log(`Processed batch ${Math.floor(i / batchSize) + 1} / ${Math.ceil(totalUpdates / batchSize)}`);
        }

        console.log('Sync complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
