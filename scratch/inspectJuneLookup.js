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
    // Let's print out the XML for cells AZ13 to BA24 in sheet3
    const regex = /<c r="(AZ|BA)(\d+)"[^>]*>([\s\S]*?)<\/c>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
        const rowNum = parseInt(match[2], 10);
        if (rowNum >= 13 && rowNum <= 24) {
            console.log(`Cell ${match[1]}${rowNum} in sheet3:`, match[0]);
        }
    }
}

main().catch(console.error);
