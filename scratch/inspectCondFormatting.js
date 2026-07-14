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
    // Let's print out all conditionalFormatting elements
    const matches = xml.match(/<conditionalFormatting[\s\S]*?<\/conditionalFormatting>/g);
    if (matches) {
        matches.forEach(m => console.log(m));
    } else {
        console.log("No conditionalFormatting elements found");
    }
}

main().catch(console.error);
