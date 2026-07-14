import prisma from '../src/config/prisma';

async function main() {
    console.log("--- Checking Call Recordings on June 8, 2026 ---");
    
    const startOfDay = new Date("2026-06-07T18:30:00.000Z"); // June 8 00:00 IST
    const endOfDay = new Date("2026-06-08T18:29:59.999Z"); // June 8 23:59 IST

    const recordings = await prisma.callRecording.findMany({
        where: {
            timestamp: { gte: startOfDay, lte: endOfDay }
        },
        include: {
            lead: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    assignedTo: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    }
                }
            }
        }
    });

    console.log(`Found ${recordings.length} call recordings:`);
    for (const rec of recordings) {
        console.log(`- ID: ${rec.id}, Timestamp: ${rec.timestamp}, CallType: ${rec.callType}`);
        if (rec.lead) {
            console.log(`  Lead: ${rec.lead.firstName} ${rec.lead.lastName || ''} (${rec.lead.id})`);
            if (rec.lead.assignedTo) {
                console.log(`  Assigned User: ${rec.lead.assignedTo.firstName} ${rec.lead.assignedTo.lastName || ''} (${rec.lead.assignedTo.email})`);
            } else {
                console.log(`  Assigned User: None`);
            }
        } else {
            console.log("  Lead: None");
        }
    }
}

main().finally(() => prisma.$disconnect());
