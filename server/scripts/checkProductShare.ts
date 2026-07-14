import prisma from '../src/config/prisma';

async function checkProductShare() {
    try {
        console.log('Checking ProductShare records...\n');

        const shares = await prisma.productShare.findMany({
            include: {
                product: true,
                createdBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            },
            take: 5,
            orderBy: { createdAt: 'desc' }
        });

        if (shares.length === 0) {
            console.log('No product shares found.');
            return;
        }

        console.log(`Found ${shares.length} product share(s):\n`);

        shares.forEach((share, index) => {
            console.log(`${index + 1}. Share Details:`);
            console.log(`   Slug: ${share.slug}`);
            console.log(`   Product: ${share.product.name}`);
            console.log(`   Brochure URL: ${share.product.brochureUrl || 'None'}`);
            console.log(`   YouTube URL: ${share.youtubeUrl || 'None'}`);
            console.log(`   Custom Title: ${share.customTitle || 'None'}`);
            console.log(`   Custom Description: ${share.customDescription || 'None'}`);
            console.log(`   Views: ${share.views}`);
            console.log(`   Created by: ${share.createdBy.firstName} ${share.createdBy.lastName}`);
            console.log(`   Share URL: http://localhost:5173/shared-product/${share.slug}`);
            console.log('');
        });

        // Check if any products have brochures
        const productsWithBrochures = await prisma.product.findMany({
            where: {
                brochureUrl: { not: null },
                isDeleted: false
            },
            select: {
                id: true,
                name: true,
                brochureUrl: true
            },
            take: 5
        });

        console.log(`\nProducts with brochures: ${productsWithBrochures.length}`);
        productsWithBrochures.forEach((product, index) => {
            console.log(`${index + 1}. ${product.name}`);
            console.log(`   Brochure: ${product.brochureUrl}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkProductShare();
