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
    // Let's print out cell values for J128, Q128, X128, AE128, AL128
    const cols = ['J', 'Q', 'X', 'AE', 'AL'];
    for (const c of cols) {
        const match = xml.match(new RegExp(`<c r="${c}128"[^>]*>([\\s\\S]*?)<\\/c>`));
        console.log(`${c}128:`, match ? match[0] : "Not found");
    }
}

main().catch(console.error);
