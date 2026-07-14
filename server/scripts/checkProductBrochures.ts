import prisma from '../src/config/prisma';

async function checkProductBrochures() {
    try {
        console.log('Checking products with brochures...\n');

        const productsWithBrochures = await prisma.product.findMany({
            where: {
                brochureUrl: { not: null },
                isDeleted: false
            },
            select: {
                id: true,
                name: true,
                brochureUrl: true,
                createdAt: true
            },
            take: 10
        });

        console.log(`Found ${productsWithBrochures.length} products with brochures:\n`);

        productsWithBrochures.forEach((product, index) => {
            console.log(`${index + 1}. ${product.name}`);
            console.log(`   ID: ${product.id}`);
            console.log(`   Brochure URL: ${product.brochureUrl}`);
            console.log(`   Created: ${product.createdAt}`);
            console.log('');
        });

        // Check total products
        const totalProducts = await prisma.product.count({
            where: { isDeleted: false }
        });

        console.log(`\nTotal products: ${totalProducts}`);
        console.log(`Products with brochures: ${productsWithBrochures.length}`);
        console.log(`Products without brochures: ${totalProducts - productsWithBrochures.length}`);

        // Check if any documents exist
        const totalDocuments = await prisma.document.count({
            where: { isDeleted: false, category: 'brochure' }
        });

        console.log(`\nTotal brochure documents in database: ${totalDocuments}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkProductBrochures();
