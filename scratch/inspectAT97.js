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
    // Let's print out the row 97 XML
    const matchRow97 = xml.match(/<row r="97"[\s\S]*?<\/row>/);
    console.log("Row 97 XML:", matchRow97 ? matchRow97[0] : "Not found");
    
    // Also let's print out cell AT97
    const matchAT97 = xml.match(/<c r="AT97"[\s\S]*?<\/c>/);
    console.log("AT97 XML:", matchAT97 ? matchAT97[0] : "Not found");
}

main().catch(console.error);
