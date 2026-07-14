
const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const filename = "img-1770889139757-394300936.jpg"; // Based on 404 error
        const doc = await prisma.document.findFirst({
            where: { name: { contains: "img-1770889139757" } } // Partial match to be safe
        });
        console.log("Document found:", JSON.stringify(doc, null, 2));

        if (doc) {
            console.log(`Suggested Fix: Update User profileImage to '/api/documents/${doc.id}/download'`);
        } else {
            console.log("Document NOT found in DB.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
