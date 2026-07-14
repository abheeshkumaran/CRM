
import { PrismaClient } from '../src/generated/client';
const prisma = new PrismaClient();

async function checkShares() {
    try {
        const shares = await prisma.productShare.findMany({
            include: {
                product: { select: { name: true } },
                organisation: { select: { name: true } }
            }
        });
        console.log('Total shares:', shares.length);
        shares.forEach(s => {
            console.log(`- Slug: ${s.slug}, Product: ${s.product.name}, Org: ${s.organisation.name}, Views: ${s.views}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkShares();
