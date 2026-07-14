const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function main() {
    const templatePath = path.join(__dirname, '..', 'public', 'Automated_School_Form.xlsx');
    const buffer = fs.readFileSync(templatePath);
    const zip = await JSZip.loadAsync(buffer);
    const sheet2 = zip.file('xl/worksheets/sheet2.xml');
    if (!sheet2) {
        console.log("No sheet2.xml");
        return;
    }
    const xml = await sheet2.async('string');
    // Let's print out the row 6 and row 33 to see their XML structure
    const match6 = xml.match(/<row r="6"[\s\S]*?<\/row>/);
    const match33 = xml.match(/<row r="33"[\s\S]*?<\/row>/);
    console.log("Row 6 XML:", match6 ? match6[0] : "Not found");
    console.log("Row 33 XML:", match33 ? match33[0] : "Not found");
}

main().catch(console.error);
