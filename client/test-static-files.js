// Quick test to verify static file serving
const path = require('path');
const fs = require('fs');

console.log('Current directory:', __dirname);
console.log('Expected static path from dist:', path.join(__dirname, 'dist', '../uploads'));
console.log('Resolved:', path.resolve(__dirname, 'dist', '../uploads'));

const uploadsPath = path.join(__dirname, 'uploads');
console.log('\nChecking uploads directory:', uploadsPath);
console.log('Exists:', fs.existsSync(uploadsPath));

if (fs.existsSync(uploadsPath)) {
    const documentsPath = path.join(uploadsPath, 'documents');
    console.log('\nDocuments directory:', documentsPath);
    console.log('Exists:', fs.existsSync(documentsPath));
    
    if (fs.existsSync(documentsPath)) {
        const files = fs.readdirSync(documentsPath);
        console.log('Files in documents:', files);
    }
}

console.log('\n--- When running from dist/index.js ---');
console.log('__dirname would be: dist');
console.log('path.join(__dirname, "../uploads") would resolve to:', path.resolve('dist', '../uploads'));
