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
    // Let's print out the row 128, 129, 130 XML
    const matchRow128 = xml.match(/<row r="128"[\s\S]*?<\/row>/);
    const matchRow129 = xml.match(/<row r="129"[\s\S]*?<\/row>/);
    const matchRow130 = xml.match(/<row r="130"[\s\S]*?<\/row>/);
    console.log("Row 128 XML:", matchRow128 ? matchRow128[0] : "Not found");
    console.log("Row 129 XML:", matchRow129 ? matchRow129[0] : "Not found");
    console.log("Row 130 XML:", matchRow130 ? matchRow130[0] : "Not found");
}

main().catch(console.error);
