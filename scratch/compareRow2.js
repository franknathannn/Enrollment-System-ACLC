const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function main() {
    const templatePath = path.join(__dirname, '..', 'public', 'Automated_School_Form.xlsx');
    const buffer = fs.readFileSync(templatePath);
    const zip = await JSZip.loadAsync(buffer);
    const ssFile = zip.file('xl/sharedStrings.xml');
    if (!ssFile) return;
    const ssXml = await ssFile.async('string');
    const ssRegex = /<si>([\s\S]*?)<\/si>/g;
    const ss = [];
    let match;
    while ((match = ssRegex.exec(ssXml)) !== null) {
        // extract text
        const tMatch = match[1].match(/<t[^>]*>([\s\S]*?)<\/t>/);
        ss.push(tMatch ? tMatch[1] : "");
    }

    const printCells = async (sheetNum) => {
        const file = zip.file(`xl/worksheets/sheet${sheetNum}.xml`);
        if (!file) return;
        const xml = await file.async('string');
        const cells = xml.match(/<c r="[A-Z]+2"[^>]*>([\s\S]*?)<\/c>/g);
        console.log(`--- Sheet ${sheetNum} Row 2 Cells ---`);
        cells.forEach(c => {
            const rMatch = c.match(/r="([A-Z]+2)"/);
            const ref = rMatch ? rMatch[1] : "";
            const vMatch = c.match(/<v>([^<]+)<\/v>/);
            const val = vMatch ? vMatch[1] : "";
            const tMatch = c.match(/t="([^"]+)"/);
            const type = tMatch ? tMatch[1] : "";
            const fMatch = c.match(/<f[^>]*>([\s\S]*?)<\/f>/);
            const formula = fMatch ? fMatch[1] : "";
            
            let displayVal = val;
            if (type === 's') {
                displayVal = `SS[${val}] = "${ss[parseInt(val, 10)]}"`;
            }
            console.log(`${ref}: type=${type || 'n'} formula=${formula} value=${displayVal}`);
        });
    };

    await printCells(3); // June
    await printCells(13); // April
}

main().catch(console.error);
