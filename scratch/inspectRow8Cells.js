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
    // Let's print out the XML for cells AX8, AY8, AZ8, BA8
    const cols = ['AX', 'AY', 'AZ', 'BA'];
    for (const c of cols) {
        const match = xml.match(new RegExp(`<c r="${c}8"[^>]*>([\\s\\S]*?)<\\/c>`));
        console.log(`${c}8 XML:`, match ? match[0] : "Not found");
    }
}

main().catch(console.error);
