const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function main() {
    const templatePath = path.join(__dirname, '..', 'public', 'Automated_School_Form.xlsx');
    const buffer = fs.readFileSync(templatePath);
    const zip = await JSZip.loadAsync(buffer);
    const sheet4 = zip.file('xl/worksheets/sheet4.xml');
    if (!sheet4) {
        console.log("No sheet4.xml");
        return;
    }
    const xml = await sheet4.async('string');
    const match = xml.match(/<c r="AO13"[\s\S]*?<\/c>/);
    console.log("AO13 in sheet4.xml:", match ? match[0] : "Not found");
}

main().catch(console.error);
