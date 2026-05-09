const fs = require('fs');
const JSZip = require('jszip');

function escapeXml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function setCellOverride(xml, ref, value) {
    const emptyPattern = new RegExp(`<c r="${ref}"((?:\\s+[^>]*?)?)\\s*/>`, "g");
    const fullPattern = new RegExp(`<c r="${ref}"((?:\\s+[^>]*?)?)>[\\s\\S]*?</c>`, "g");

    let result = xml;
    let replaced = false;

    // Try full pattern first
    result = result.replace(fullPattern, (_, attrs) => {
        replaced = true;
        const cleanAttrs = attrs.replace(/\s+t="[^"]*"/g, "");
        if (!value) return `<c r="${ref}"${cleanAttrs}/>`;
        return `<c r="${ref}"${cleanAttrs} t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
    });

    if (!replaced) {
        // Try empty pattern
        result = result.replace(emptyPattern, (_, attrs) => {
            const cleanAttrs = attrs.replace(/\s+t="[^"]*"/g, "");
            if (!value) return `<c r="${ref}"${cleanAttrs}/>`;
            return `<c r="${ref}"${cleanAttrs} t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
        });
    }

    return result;
}

(async () => {
  const buf = fs.readFileSync('public/Automated_School_Form.xlsx');
  const zip = await JSZip.loadAsync(buf);
  let xml = await zip.file('xl/worksheets/sheet2.xml').async('string');
  
  const hUpdates = {};
  hUpdates['B33'] = 'June';
  hUpdates['C33'] = '5';
  hUpdates['D33'] = 'Suspension Demo';

  for (const [ref, value] of Object.entries(hUpdates)) {
      xml = setCellOverride(xml, ref, value);
  }

  // Validate XML
  try {
      const xmldom = require('xmldom').DOMParser;
      new xmldom().parseFromString(xml, 'text/xml');
      console.log('XML parse SUCCESS');
  } catch(e) {
      console.log('XML parse ERROR', e);
  }

  zip.file('xl/worksheets/sheet2.xml', xml);
  const out = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('scratch_test_output.xlsx', out);
  console.log("Saved scratch_test_output.xlsx");
})()
