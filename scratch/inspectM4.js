const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function main() {
    const templatePath = path.join(__dirname, '..', 'public', 'Automated_School_Form.xlsx');
    const buffer = fs.readFileSync(templatePath);
    const zip = await JSZip.loadAsync(buffer);
    const sheet14 = zip.file('xl/worksheets/sheet14.xml');
    if (!sheet14) {
        console.log("No sheet14.xml");
        return;
    }
    const xml = await sheet14.async('string');
    // Let's print out cell M4 in sheet14
    const matchM4 = xml.match(/<c r="M4"[\s\S]*?<\/c>/);
    console.log("M4 XML in Consolidation:", matchM4 ? matchM4[0] : "Not found");
}

main().catch(console.error);
