const ExcelJS = require('exceljs');

async function dump() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('public/F-138_Template.xlsx');
  const ws = wb.worksheets[0];

  for(let r = 1; r <= 35; r++) {
    let rowText = `Row ${r.toString().padStart(2, ' ')}: `;
    for(let c = 1; c <= 25; c++) {
      let v = ws.getCell(r, c).value;
      if (v && typeof v === 'object' && v.richText) {
         v = v.richText.map(rt => rt.text).join('');
      }
      if (v) rowText += `[${ws.getCell(r,c).address}: ${v.toString().substring(0, 15)}] `;
    }
    if (rowText.includes('[')) console.log(rowText);
  }
}

dump().catch(console.error);
