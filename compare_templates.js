const ExcelJS = require('exceljs');

async function compare() {
  const wb1 = new ExcelJS.Workbook();
  await wb1.xlsx.readFile('F-138_Template_v17.xlsx');
  const ws1 = wb1.worksheets[0];

  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.readFile('F-138_Template.xlsx');
  const ws2 = wb2.worksheets[0];

  console.log("Checking for differences in cell values...");
  let diffs = 0;
  for (let r = 1; r <= 80; r++) {
    for (let c = 1; c <= 30; c++) {
      const v1 = ws1.getCell(r, c).value;
      const v2 = ws2.getCell(r, c).value;
      
      const sv1 = JSON.stringify(v1);
      const sv2 = JSON.stringify(v2);

      if (sv1 !== sv2) {
        console.log(`Cell ${ws1.getCell(r,c).address}: v17=${sv1} | new=${sv2}`);
        diffs++;
        if(diffs > 20) {
           console.log("Too many diffs, stopping.");
           return;
        }
      }
    }
  }
  if (diffs === 0) console.log("No value differences found.");
}

compare().catch(console.error);
