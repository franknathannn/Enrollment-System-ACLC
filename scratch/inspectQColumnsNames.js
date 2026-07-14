const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function main() {
    const templatePath = path.join(__dirname, '..', 'public', 'Automated_School_Form.xlsx');
    const buffer = fs.readFileSync(templatePath);
    const zip = await JSZip.loadAsync(buffer);
    const sheet1 = zip.file('xl/worksheets/sheet1.xml');
    if (!sheet1) {
        console.log("No sheet1.xml");
        return;
    }
    const xml = await sheet1.async('string');
    // Let's print out all cells in column Q of sheet1.xml
    const regex = /<c r="Q(\d+)"[^>]*>([\s\S]*?)<\/c>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
        console.log(`Q${match[1]}:`, match[0]);
    }
}

main().catch(console.error);
