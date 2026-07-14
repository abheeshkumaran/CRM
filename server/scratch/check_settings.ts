import prisma from '../src/config/prisma';

async function main() {
    const user = await prisma.user.findFirst({
        where: { email: 'mahshook@iitseducation.org' }
    });
    if (!user || !user.organisationId) {
        console.log("User or Org not found");
        return;
    }

    const settings = await prisma.callSettings.findUnique({
        where: { organisationId: user.organisationId }
    });

    console.log("Org ID:", user.organisationId);
    console.log("Call Settings:", settings);
}

main().finally(() => prisma.$disconnect());
