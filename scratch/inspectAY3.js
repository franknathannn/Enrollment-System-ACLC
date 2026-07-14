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
    // Let's print out the AY3 XML
    const matchAY3 = xml.match(/<c r="AY3"[\s\S]*?<\/c>/);
    console.log("AY3 XML:", matchAY3 ? matchAY3[0] : "Not found");
}

main().catch(console.error);
