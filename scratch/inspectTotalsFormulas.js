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
    // Let's find the cell AO13 and AP13 and AQ13 formulas
    const matchAO13 = xml.match(/<c r="AO13"[\s\S]*?<\/c>/);
    const matchAP13 = xml.match(/<c r="AP13"[\s\S]*?<\/c>/);
    const matchAQ13 = xml.match(/<c r="AQ13"[\s\S]*?<\/c>/);
    console.log("AO13 XML:", matchAO13 ? matchAO13[0] : "Not found");
    console.log("AP13 XML:", matchAP13 ? matchAP13[0] : "Not found");
    console.log("AQ13 XML:", matchAQ13 ? matchAQ13[0] : "Not found");
}

main().catch(console.error);
