const fs = require('fs');
const logPath = 'C:\\Users\\Frank\\.gemini\\antigravity\\brain\\6a8c3e27-40bc-4260-8134-950592b5418c\\walkthrough.md.resolved.0';
const fileData = fs.readFileSync(logPath, 'utf8');
const lines = fileData.split(/\r?\n/);

const d = 'c:\\Users\\Frank\\Documents\\Enrollment System\\enrollment-system\\src\\app\\admin\\sections\\components\\schedule';

fs.writeFileSync(d + '\\BulkScheduleManagerDialog.tsx', lines.slice(348, 760).join('\n'));

console.log('Restored BulkScheduleManagerDialog!');
