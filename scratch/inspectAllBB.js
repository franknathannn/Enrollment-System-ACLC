const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function main() {
    const templatePath = path.join(__dirname, '..', 'public', 'Automated_School_Form.xlsx');
    const buffer = fs.readFileSync(templatePath);
    const zip = await JSZip.loadAsync(buffer);
    const sheet3 = zip.file('xl/worksheets/sheet3.xml');
    if (!sheet3) {
        console.log("No sheet3.xml");
        return;
    }
    const xml = await sheet3.async('string');
    // Let's print out all BB cells from BB13 to BB62
    const regex = /<c r="BB(\d+)"[^>]*>([\s\S]*?)<\/c>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
        const rowNum = parseInt(match[1], 10);
        if (rowNum >= 13 && rowNum <= 62) {
            console.log(`Row ${rowNum}:`, match[0]);
        }
    }
}

main().catch(console.error);
