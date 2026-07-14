const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function main() {
    const templatePath = path.join(__dirname, '..', 'public', 'Automated_School_Form.xlsx');
    const buffer = fs.readFileSync(templatePath);
    const zip = await JSZip.loadAsync(buffer);
    for (let n = 3; n <= 13; n++) {
        const file = zip.file(`xl/worksheets/sheet${n}.xml`);
        if (!file) continue;
        const xml = await file.async('string');
        
        // Find the shared formula definition cell and its ref attribute
        const match = xml.match(/<c r="([A-Z]+\d+)"[^>]*><f [^>]*si="7"[^>]*ref="([^"]*)"/);
        if (match) {
            console.log(`Sheet ${n}: Defined at ${match[1]}, ref range is ${match[2]}`);
        } else {
            console.log(`Sheet ${n}: No definition found for si="7"`);
        }
    }
}

main().catch(console.error);
