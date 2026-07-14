
import { PrismaClient } from '../src/generated/client';
const prisma = new PrismaClient();

async function testShare() {
    try {
        // Find a product
        const product = await prisma.product.findFirst();
        if (!product) {
            console.log('No products found');
            return;
        }

        console.log(`Sharing product: ${product.name} (${product.id})`);

        // Create a share link
        const slug = 'test-' + Math.random().toString(36).substring(2, 7);
        const share = await prisma.productShare.create({
            data: {
                productId: product.id,
                organisationId: product.organisationId,
                createdById: product.createdById || '',
                slug,
                customTitle: 'Test Share',
                customDescription: 'Test Description'
            }
        });

        console.log(`Share created: ${slug}`);
        console.log(`URL: http://localhost:5173/shared-product/${slug}`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

testShare();
