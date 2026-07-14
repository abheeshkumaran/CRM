
const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const email = "iits@iitseducation.org";
        const user = await prisma.user.update({
            where: { email },
            data: { profileImage: null }
        });
        console.log(`Reset profileImage for ${email} to null.`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
