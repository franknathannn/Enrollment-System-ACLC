const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function main() {
    const templatePath = path.join(__dirname, '..', 'public', 'Automated_School_Form.xlsx');
    const buffer = fs.readFileSync(templatePath);
    const zip = await JSZip.loadAsync(buffer);
    const sheet1 = zip.file('xl/worksheets/sheet1.xml');
    if (!sheet1) {
        console.log("No sheet1.xml");
        return;
    }
    const xml = await sheet1.async('string');
    // Let's print out cell Q5 XML
    const matchQ5 = xml.match(/<c r="Q5"[\s\S]*?<\/c>/);
    console.log("Q5 XML in sheet1:", matchQ5 ? matchQ5[0] : "Not found");
}

main().catch(console.error);
