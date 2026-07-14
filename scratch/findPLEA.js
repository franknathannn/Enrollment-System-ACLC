const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'teacher', 'dashboard', 'components', 'ReportsTab.tsx'), 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('P / L / E / A') || line.includes('P:') || line.includes('L:') || line.includes('E:') || line.includes('A:')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
