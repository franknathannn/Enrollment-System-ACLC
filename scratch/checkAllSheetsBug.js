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
        const hasBug = xml.includes('ref="X135:X174" si="43"');
        const hasFormula = xml.includes('COUNTIF(X54,"x")');
        console.log(`Sheet ${n}: hasBugRef=${hasBug}, hasFormula=${hasFormula}`);
    }
}

main().catch(console.error);
