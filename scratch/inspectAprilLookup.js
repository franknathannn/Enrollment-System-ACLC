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
    const xml = await sheet13.async('string');
    // Let's print out the XML for cells AX13 to AY25
    const regex = /<c r="(AX|AY)(\d+)"[^>]*>([\s\S]*?)<\/c>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
        const rowNum = parseInt(match[2], 10);
        if (rowNum >= 13 && rowNum <= 25) {
            console.log(`Cell ${match[1]}${rowNum}:`, match[0]);
        }
    }
}

main().catch(console.error);
