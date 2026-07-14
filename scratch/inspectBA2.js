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
    const regex = /<si>([\s\S]*?)<\/si>/g;
    let index = 0;
    let match;
    while ((match = regex.exec(xml)) !== null) {
        if (index === 31) {
            console.log("String at index 31:", match[1]);
        }
        if (index === 30) {
            console.log("String at index 30:", match[1]);
        }
        index++;
    }
    
    // Also let's print cell BA2 XML in sheet13.xml
    const sheet13 = zip.file('xl/worksheets/sheet13.xml');
    if (sheet13) {
        const sXml = await sheet13.async('string');
        const matchBA2 = sXml.match(/<c r="BA2"[\s\S]*?<\/c>/);
        console.log("BA2 XML:", matchBA2 ? matchBA2[0] : "Not found");
    }
}

main().catch(console.error);
