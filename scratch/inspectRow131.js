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
    // Let's print out the row 131 XML
    const matchRow131 = xml.match(/<row r="131"[\s\S]*?<\/row>/);
    console.log("Row 131 XML:", matchRow131 ? matchRow131[0] : "Not found");
}

main().catch(console.error);
