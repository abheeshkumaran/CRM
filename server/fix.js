
const fs = require('fs');
const path = require('path');

const srcDir = 'c:/Users/DELL/OneDrive/Desktop/crm/MERN CRM 2/MERN CRM/server/src';

function findAndReplace(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findAndReplace(fullPath);
        } else if (fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            
            // Fix backslashes in prisma imports
            if (content.includes('import prisma from')) {
                content = content.replace(/import prisma from '([^']+)'/g, (match, p1) => {
                    const corrected = p1.replace(/\\\\/g, '/');
                    if (p1 !== corrected) {
                        modified = true;
                    }
                    return 'import prisma from \'' + corrected + '\'';
                });
            }

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed backslashes in', fullPath);
            }
        }
    }
}

findAndReplace(srcDir);

