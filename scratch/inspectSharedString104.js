const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function main() {
    const templatePath = path.join(__dirname, '..', 'public', 'Automated_School_Form.xlsx');
    const buffer = fs.readFileSync(templatePath);
    const zip = await JSZip.loadAsync(buffer);
    const ssFile = zip.file('xl/sharedStrings.xml');
    if (!ssFile) {
        console.log("No sharedStrings.xml found");
        return;
    }
    const xml = await ssFile.async('string');
    // Parse the shared strings xml
    // Shared strings are <si><t>STRING</t></si>
    // We want index 104 (0-based)
    const regex = /<si>([\s\S]*?)<\/si>/g;
    let index = 0;
    let match;
    while ((match = regex.exec(xml)) !== null) {
        if (index === 104) {
            console.log("String at index 104:", match[1]);
            break;
        }
        index++;
    }
}

main().catch(console.error);
