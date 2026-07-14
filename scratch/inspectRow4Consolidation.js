const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function main() {
    const templatePath = path.join(__dirname, '..', 'public', 'Automated_School_Form.xlsx');
    const buffer = fs.readFileSync(templatePath);
    const zip = await JSZip.loadAsync(buffer);
    const sheet14 = zip.file('xl/worksheets/sheet14.xml');
    if (!sheet14) {
        console.log("No sheet14.xml");
        return;
    }
    const xml = await sheet14.async('string');
    // Let's print out all cells in row 4
    const regex = /<c r="([A-Z]+)4"[^>]*>([\s\S]*?)<\/c>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
        console.log(`${match[1]}4:`, match[0]);
    }
}

main().catch(console.error);
