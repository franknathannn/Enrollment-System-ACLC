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
    // Let's print out cell AO135 XML if found
    const match = xml.match(/<c r="AO135"[\s\S]*?<\/c>/);
    console.log("AO135 XML:", match ? match[0] : "Not found");
    
    // Also print out the end of the file (around row 135 or similar)
    const matchRow135 = xml.match(/<row r="135"[\s\S]*?<\/row>/);
    console.log("Row 135 XML:", matchRow135 ? matchRow135[0] : "Not found");
}

main().catch(console.error);
