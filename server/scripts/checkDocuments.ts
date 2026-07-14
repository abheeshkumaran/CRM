import prisma from '../src/config/prisma';

async function checkDocuments() {
    try {
        console.log('Checking Document records in database...\n');

        // Check all documents
        const documents = await prisma.document.findMany({
            where: { isDeleted: false },
            include: {
                createdBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                lead: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        company: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        console.log(`Found ${documents.length} document(s) in database:\n`);

        if (documents.length === 0) {
            console.log('❌ No documents found in database!');
            console.log('\nThis means documents are NOT being saved to the database.');
            console.log('Only the file is saved to disk, but no database record exists.\n');
        } else {
            documents.forEach((doc, index) => {
                console.log(`${index + 1}. Document:`);
                console.log(`   ID: ${doc.id}`);
                console.log(`   Name: ${doc.name}`);
                console.log(`   File URL: ${doc.fileUrl}`);
                console.log(`   File Type: ${doc.fileType}`);
                console.log(`   File Size: ${doc.fileSize} bytes`);
                console.log(`   Category: ${doc.category}`);
                console.log(`   Created By: ${doc.createdBy.firstName} ${doc.createdBy.lastName}`);
                console.log(`   Created At: ${doc.createdAt}`);
                if (doc.lead) {
                    console.log(`   Linked to Lead: ${doc.lead.firstName} ${doc.lead.lastName} (${doc.lead.company || 'No company'})`);
                }
                console.log('');
            });
        }

        // Check products with brochures
        console.log('\n--- Products with Brochures ---\n');
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
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        console.log(`Found ${productsWithBrochures.length} product(s) with brochures:\n`);

        productsWithBrochures.forEach((product, index) => {
            console.log(`${index + 1}. ${product.name}`);
            console.log(`   Brochure URL: ${product.brochureUrl}`);
            console.log(`   Created: ${product.createdAt}`);
            console.log('');
        });

        // Check if brochure URLs match document URLs
        console.log('\n--- Checking if Product Brochures are in Document Table ---\n');
        
        for (const product of productsWithBrochures) {
            if (!product.brochureUrl) continue;
            
            const matchingDoc = await prisma.document.findFirst({
                where: {
                    fileUrl: product.brochureUrl,
                    isDeleted: false
                }
            });

            if (matchingDoc) {
                console.log(`✅ ${product.name}: Brochure IS in Document table (ID: ${matchingDoc.id})`);
            } else {
                console.log(`❌ ${product.name}: Brochure NOT in Document table`);
                console.log(`   File: ${product.brochureUrl}`);
            }
        }

        // Summary
        console.log('\n--- Summary ---\n');
        console.log(`Total Documents in DB: ${documents.length}`);
        console.log(`Total Products with Brochures: ${productsWithBrochures.length}`);
        
        const matchedCount = productsWithBrochures.filter(p => 
            documents.some(d => d.fileUrl === p.brochureUrl)
        ).length;
        
        console.log(`Products with Brochures in Document table: ${matchedCount}`);
        console.log(`Products with Brochures NOT in Document table: ${productsWithBrochures.length - matchedCount}`);

        if (matchedCount < productsWithBrochures.length) {
            console.log('\n⚠️  WARNING: Some product brochures are not stored in the Document table!');
            console.log('This means they were uploaded before the document database storage was implemented.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDocuments();
