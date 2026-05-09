const fs = require('fs');
const JSZip = require('jszip');

(async () => {
  const buf = fs.readFileSync('public/Automated_School_Form.xlsx');
  const zip = await JSZip.loadAsync(buf);
  let xml = await zip.file('xl/worksheets/sheet2.xml').async('string');
  
  const ref = "B33";
  const emptyPattern = new RegExp(`<c r="${ref}"((?:\\s+[^>]*?)?)\\s*/>`, "g");
  
  let match;
  while ((match = emptyPattern.exec(xml)) !== null) {
      console.log("MATCH:", match[0]);
      console.log("ATTRS:", match[1]);
  }
})()
