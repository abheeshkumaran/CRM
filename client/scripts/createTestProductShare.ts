import prisma from '../src/config/prisma';
import fs from 'fs';
import path from 'path';

async function createTestProductShare() {
    try {
        console.log('Creating test product with share link...\n');

        // Get first user and org
        const user = await prisma.user.findFirst({
            where: { 
                organisationId: { not: null }
            }
        });

        if (!user || !user.organisationId) {
            console.error('No users with organisation found. Please create a user first.');
            return;
        }

        console.log(`Using user: ${user.firstName} ${user.lastName}`);

        // Create test PDF file
        const uploadsDir = path.join(__dirname, '../uploads/documents');
        console.log('Uploads directory:', uploadsDir);
        
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
            console.log('Created uploads directory');
        }

        const testFileName = `test-brochure-${Date.now()}.pdf`;
        const testFilePath = path.join(uploadsDir, testFileName);
        const testContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 24 Tf
100 700 Td
(Test Product Brochure) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
410
%%EOF`;

        fs.writeFileSync(testFilePath, testContent);
        console.log(`Created test PDF: ${testFileName}\n`);

        // Create document record in database
        const document = await prisma.document.create({
            data: {
                name: 'Test Product Brochure',
                description: 'Auto-generated test brochure for product share testing',
                fileKey: testFileName,
                fileUrl: `/uploads/documents/${testFileName}`,
                fileType: 'application/pdf',
                fileSize: Buffer.byteLength(testContent),
                category: 'brochure',
                tags: ['test', 'auto-generated'],
                organisationId: user.organisationId,
                createdById: user.id
            }
        });
        console.log(`Created document record in database (ID: ${document.id})\n`);

        // Create or find a product
        let product = await prisma.product.findFirst({
            where: {
                organisationId: user.organisationId,
                isDeleted: false
            }
        });

        if (!product) {
            // Create new product
            product = await prisma.product.create({
                data: {
                    name: 'Test Product',
                    basePrice: 999.99,
                    currency: 'INR',
                    description: 'This is a test product with brochure and video',
                    category: 'Test',
                    brochureUrl: `/uploads/documents/${testFileName}`,
                    organisationId: user.organisationId,
                    createdById: user.id
                }
            });
            console.log('Created new product:', product.name);
        } else {
            // Update existing product
            product = await prisma.product.update({
                where: { id: product.id },
                data: {
                    brochureUrl: `/uploads/documents/${testFileName}`
                }
            });
            console.log('Updated existing product:', product.name);
        }

        // Create or update product share
        const slug = Math.random().toString(36).substring(2, 10);
        
        let share = await prisma.productShare.findFirst({
            where: { productId: product.id }
        });

        if (share) {
            // Update existing share
            share = await prisma.productShare.update({
                where: { id: share.id },
                data: {
                    youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
                    customTitle: 'Amazing Test Product',
                    customDescription: 'This is a test product with both brochure and video. Check out the features!'
                }
            });
            console.log('Updated existing share');
        } else {
            // Create new share
            share = await prisma.productShare.create({
                data: {
                    productId: product.id,
                    organisationId: user.organisationId,
                    createdById: user.id,
                    slug,
                    notificationsEnabled: true,
                    youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
                    customTitle: 'Amazing Test Product',
                    customDescription: 'This is a test product with both brochure and video. Check out the features!'
                }
            });
            console.log('Created new share');
        }

        console.log('\n✅ Test product share created successfully!\n');
        console.log('Product Details:');
        console.log(`  Name: ${product.name}`);
        console.log(`  Price: ${product.currency} ${product.basePrice}`);
        console.log(`  Brochure: ${product.brochureUrl}`);
        console.log('\nShare Details:');
        console.log(`  Slug: ${share.slug}`);
        console.log(`  YouTube: ${share.youtubeUrl}`);
        console.log(`  Custom Title: ${share.customTitle}`);
        console.log(`  Views: ${share.views}`);
        console.log('\n🔗 Share URLs:');
        console.log(`  Local: http://localhost:5173/shared-product/${share.slug}`);
        console.log(`  API: http://localhost:5001/api/share/${share.slug}`);
        console.log(`  Brochure: http://localhost:5001${product.brochureUrl}`);
        console.log('\n📝 Test Steps:');
        console.log('  1. Start your server: npm run dev');
        console.log('  2. Start your client: npm run dev');
        console.log(`  3. Visit: http://localhost:5173/shared-product/${share.slug}`);
        console.log('  4. You should see:');
        console.log('     - Product name and price');
        console.log('     - YouTube video embedded');
        console.log('     - PDF brochure preview');
        console.log('     - Seller contact info');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createTestProductShare();
