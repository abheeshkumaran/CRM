
const fs = require('fs');
const content = fs.readFileSync('src/controllers/androidController.ts', 'utf8');
let balance = 0;
let lineNum = 1;
for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') balance++;
    if (content[i] === '}') balance--;
    if (content[i] === '\n') {
        console.log(`${lineNum}: ${balance}`);
        lineNum++;
    }
}
