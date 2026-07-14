const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function main() {
    const templatePath = path.join(__dirname, '..', 'public', 'Automated_School_Form.xlsx');
    const buffer = fs.readFileSync(templatePath);
    const zip = await JSZip.loadAsync(buffer);
    const wbFile = zip.file('xl/workbook.xml');
    if (!wbFile) {
        console.log("No xl/workbook.xml found");
        return;
    }
    const xml = await wbFile.async('string');
    console.log("workbook.xml content:");
    console.log(xml);
}

main().catch(console.error);
