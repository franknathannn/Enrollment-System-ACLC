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
    // Find all <c r="[A-Z]+135" tags and print their formulas
    const regex = /<c r="([A-Z]+)135"[^>]*>([\s\S]*?)<\/c>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
        console.log(`${match[1]}135:`, match[0]);
    }
}

main().catch(console.error);
