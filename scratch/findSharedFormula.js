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
    // Let's find all occurrences of <f t="shared" si="0"> in sheet3.xml
    const regex = /<f [^>]*si="0"[^>]*>([\s\S]*?)<\/f>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
        console.log("Match:", match[0]);
    }
}

main().catch(console.error);
