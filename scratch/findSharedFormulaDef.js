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
    // Let's find the formula definition block for si="0"
    const regex = /<f [^>]*si="0"[^>]*>([\s\S]*?)<\/f>/;
    const match = xml.match(regex);
    console.log("Formula si=0 Definition:", match ? match[0] : "Not found");
}

main().catch(console.error);
