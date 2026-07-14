const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function main() {
    const templatePath = path.join(__dirname, '..', 'public', 'Automated_School_Form.xlsx');
    const buffer = fs.readFileSync(templatePath);
    const zip = await JSZip.loadAsync(buffer);
    const sheet13 = zip.file('xl/worksheets/sheet13.xml');
    if (!sheet13) {
        console.log("No sheet13.xml");
        return;
    }
    const xml = await sheet13.xml ?? await sheet13.async('string');
    // Let's print out the XML for cells BA13 to BA24 in sheet13
    const regex = /<c r="BA(\d+)"[^>]*>([\s\S]*?)<\/c>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
        const rowNum = parseInt(match[1], 10);
        if (rowNum >= 13 && rowNum <= 24) {
            console.log(`Cell BA${rowNum}:`, match[0]);
        }
    }
}

main().catch(console.error);
