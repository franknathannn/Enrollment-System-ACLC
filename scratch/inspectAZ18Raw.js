const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function main() {
    const templatePath = path.join(__dirname, '..', 'public', 'Automated_School_Form.xlsx');
    const buffer = fs.readFileSync(templatePath);
    const zip = await JSZip.loadAsync(buffer);
    const sheet13 = zip.file('xl/worksheets/sheet13.xml');
    const xml = await sheet13.async('string');
    const match = xml.match(/<c r="AZ18"[^>]*>[\s\S]*?<\/c>/);
    console.log("AZ18 raw XML in sheet13:", match ? match[0] : "Not found");
}

main().catch(console.error);
