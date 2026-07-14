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
    // Let's print out the XML of U129
    const matchU129 = xml.match(/<c r="U129"[\s\S]*?<\/c>/);
    console.log("U129 XML:", matchU129 ? matchU129[0] : "Not found");
}

main().catch(console.error);
