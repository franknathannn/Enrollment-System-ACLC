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
    // Let's print out the XML of BB13 and BB14 and BC13
    const matchBB13 = xml.match(/<c r="BB13"[\s\S]*?<\/c>/);
    const matchBC13 = xml.match(/<c r="BC13"[\s\S]*?<\/c>/);
    const matchBD13 = xml.match(/<c r="BD13"[\s\S]*?<\/c>/);
    console.log("BB13 XML:", matchBB13 ? matchBB13[0] : "Not found");
    console.log("BC13 XML:", matchBC13 ? matchBC13[0] : "Not found");
    console.log("BD13 XML:", matchBD13 ? matchBD13[0] : "Not found");
}

main().catch(console.error);
