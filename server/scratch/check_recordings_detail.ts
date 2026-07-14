import prisma from '../src/config/prisma';

async function main() {
    const user = await prisma.user.findFirst({
        where: { email: 'mahshook@iitseducation.org' }
    });
    if (!user) {
        console.log("User not found");
        return;
    }

    console.log(`Found user: ${user.firstName} ${user.lastName} (ID: ${user.id})`);

    const startOfDay = new Date("2026-06-08T18:30:00.000Z"); // June 9 00:00 IST
    const endOfDay = new Date("2026-06-09T18:29:59.999Z"); // June 9 23:59 IST

    const interactions = await prisma.interaction.findMany({
        where: {
            createdById: user.id,
            type: 'call',
            date: { gte: startOfDay, lte: endOfDay }
        }
    });

    console.log(`Found ${interactions.length} call interactions on June 9, 2026:`);
    for (const inter of interactions) {
        console.log(`- ID: ${inter.id}, Date: ${inter.date}, Status: ${inter.callStatus}, Duration: ${inter.duration}, Phone: ${inter.phoneNumber}`);
    }
}

main().finally(() => prisma.$disconnect());
