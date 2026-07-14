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
    // Let's print out the row 6, 7, 8, 9 cell values in Columns B and C to see what values they have
    const rows = xml.match(/<row r="([6-9]|10)"[\s\S]*?<\/row>/g);
    if (rows) {
        rows.forEach(r => console.log(r));
    }
}

main().catch(console.error);
