const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function checkBrochures() {
    try {
        const products = await prisma.product.findMany({
            where: {
                brochureUrl: {
                    not: null
                }
            },
            take: 5,
            select: {
                id: true,
                name: true,
                brochureUrl: true
            }
        });

        console.log('Products with brochures:', JSON.stringify(products, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkBrochures();
