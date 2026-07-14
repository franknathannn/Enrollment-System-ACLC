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
        
        // Find if there is any cell with si="7"
        const matches = xml.match(/<f [^>]*si="7"[^>]*>([\s\S]*?)<\/f>/g) || [];
        const defines = xml.match(/<f [^>]*si="7"[^>]*ref="[^"]*"/) || [];
        
        console.log(`Sheet ${n}: si="7" count=${matches.length}, defined=${defines.length > 0}`);
    }
}

main().catch(console.error);
