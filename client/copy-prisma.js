const fs = require('fs');
const path = require('path');

/**
 * This script copies the generated Prisma client from src/generated/client
 * to dist/generated/client so that the compiled JavaScript can access it.
 */

const srcDir = path.join(__dirname, 'src', 'generated', 'client');
const destDir = path.join(__dirname, 'dist', 'generated', 'client');

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();

    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(
                path.join(src, childItemName),
                path.join(dest, childItemName)
            );
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

console.log('--- Post-build: Copying Prisma Client ---');

if (fs.existsSync(srcDir)) {
    try {
        copyRecursiveSync(srcDir, destDir);
        console.log(`✅ Successfully copied Prisma client to ${destDir}`);
    } catch (error) {
        console.error('❌ Error copying Prisma client:', error.message);
        process.exit(1);
    }
} else {
    console.warn('⚠️  Prisma client source directory not found at:', srcDir);
    console.warn('   Ensure "prisma generate" has been run successfully.');
}

console.log('--- Post-build process complete ---');
