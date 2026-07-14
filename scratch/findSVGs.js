const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'teacher', 'dashboard', 'components', 'ReportsTab.tsx'), 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('<svg') || line.includes('path') || line.includes('className="w-') || line.includes('className="h-')) {
        if (line.includes('M') || line.includes('stroke') || line.includes('fill')) {
            console.log(`${idx + 1}: ${line.trim()}`);
        }
    }
});
