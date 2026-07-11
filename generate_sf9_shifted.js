const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function createSF9() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'System';
  wb.created = new Date();

  // Load the logo image
  let logoId = null;
  const logoPath = path.join(__dirname, 'public', 'logo-aclc.png');
  if (fs.existsSync(logoPath)) {
    logoId = wb.addImage({
      filename: logoPath,
      extension: 'png',
    });
  }

  function setupSheet(sheet, semData) {
    // ----------------------------------------------------
    // PAGE SETUP & VIEW OPTIONS
    // ----------------------------------------------------
    sheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.25, right: 0.25,
        top: 0.25, bottom: 0.25,
        header: 0, footer: 0
      }
    };

    sheet.views = [
      { showGridLines: true }
    ];

    // Define 25 columns to map perfectly to layout proportions.
    // Adjusted: Column A is widened slightly. Spacer O is smaller.
    // Column W & X (for Semester Final Grade) are widened. Column Y (Remarks) is widened.
    // Column E is increased slightly to help widen the left side.
    sheet.columns = [
      { width: 22.0 }, // A - Attendance labels (e.g. "No of School Days*")
      { width: 2.3 },  // B - Jun
      { width: 2.3 },  // C - Jul
      { width: 2.3 },  // D - Aug
      { width: 2.3 },  // E - Sept
      { width: 2.3 },  // F - Oct
      { width: 2.3 },  // G - Nov
      { width: 2.3 },  // H - Dec
      { width: 2.3 },  // I - Jan
      { width: 2.3 },  // J - Feb
      { width: 2.3 },  // K - Mar
      { width: 2.3 },  // L - Apr
      { width: 2.3 },  // M - May
      { width: 3.5 },  // N - Total
      { width: 1.0 },  // O - Spacer
      { width: 9.5 },  // P - Core Values
      { width: 4.8 },  // Q - Behavioral Statement Column segment 1
      { width: 4.8 },  // R - Behavioral Statement Column segment 2
      { width: 4.8 },  // S - Behavioral Statement Column segment 3
      { width: 4.8 },  // T - Behavioral Statement Column segment 4
      { width: 4.8 },  // U - Behavioral Statement Column segment 5
      { width: 5.0 },  // V - Q1
      { width: 5.0 },  // W - Q2
      { width: 9.65 }, // X - Semester Final Grade
      { width: 9.65 }, // Y - Remarks
    ];

    // Apply base styles (Arial, size 10, default height)
    sheet.eachRow((row) => {
      row.font = { name: 'Arial', size: 10 };
    });

    // Helper to draw clean borders
    const drawBorder = (rangeStr, type = 'all', style = 'thin') => {
      const [start, end] = rangeStr.split(':');
      const startCol = start.match(/[A-Z]+/)[0];
      const startRow = parseInt(start.match(/\d+/)[0]);
      const endCol = end.match(/[A-Z]+/)[0];
      const endRow = parseInt(end.match(/\d+/)[0]);
      
      const colIdx = (c) => {
        let s = 0;
        for(let i=0; i<c.length; i++) s = s * 26 + c.charCodeAt(i) - 64;
        return s;
      };

      const sc = colIdx(startCol);
      const ec = colIdx(endCol);

      for (let i = startRow; i <= endRow; i++) {
        for (let j = sc; j <= ec; j++) {
          let cell = sheet.getCell(i, j);
          
          if (type === 'all') {
            cell.border = {
              top: { style },
              left: { style },
              bottom: { style },
              right: { style }
            };
          } else if (type === 'outline') {
            cell.border = Object.assign({}, cell.border, {
              top: i === startRow ? { style } : cell.border?.top,
              left: j === sc ? { style } : cell.border?.left,
              bottom: i === endRow ? { style } : cell.border?.bottom,
              right: j === ec ? { style } : cell.border?.right
            });
          }
        }
      }
    };

    // ----------------------------------------------------
    // HEADER LOGOS & DEPT DETAILS
    // ----------------------------------------------------
    if (logoId !== null) {
      sheet.addImage(logoId, {
        tl: { col: 0.1, row: 0.2 },
        ext: { width: 95, height: 80 }
      });
      sheet.addImage(logoId, {
        tl: { col: 20.8, row: 0.2 },
        ext: { width: 95, height: 80 }
      });
    }

    sheet.mergeCells('G1:T1');
    sheet.getCell('H1').value = 'Republic of the Philippines';
    sheet.getCell('H1').font = { name: 'Arial', size: 10, bold: true };
    sheet.getCell('H1').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('G2:T2');
    sheet.getCell('H2').value = 'Department of Education';
    sheet.getCell('H2').font = { name: 'Arial', size: 11, bold: true };
    sheet.getCell('H2').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('G3:T3');
    sheet.getCell('H3').value = 'NCR\nManila\nII';
    sheet.getCell('H3').font = { name: 'Arial', size: 9, bold: true };
    sheet.getCell('H3').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    sheet.getRow(3).height = 42;

    sheet.mergeCells('G4:T4');
    sheet.getCell('H4').value = 'ACLC NORTHBAY';
    sheet.getCell('H4').font = { name: 'Arial', size: 14, bold: true };
    sheet.getCell('H4').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('G5:T5');
    sheet.getCell('H5').value = '2-3 Flr. MTSC Bldg. Juan Luna St. Cor. Capulong Tondo, Manila';
    sheet.getCell('H5').font = { name: 'Arial', size: 8 };
    sheet.getCell('H5').alignment = { horizontal: 'center', vertical: 'middle' };

    // F-138 Identifier on the left
    sheet.mergeCells('A5:D6');
    sheet.getCell('A5').value = 'F-138';
    sheet.getCell('A5').font = { name: 'Arial', size: 22, bold: true };
    sheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };

    // ----------------------------------------------------
    // STUDENT INFORMATION
    // ----------------------------------------------------
    let r = 8;
    sheet.getRow(r).height = 20;
    
    sheet.mergeCells(`A${r}:C${r}`);
    sheet.getCell(`A${r}`).value = 'Name:';
    sheet.getCell(`A${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`A${r}`).alignment = { horizontal: 'left', vertical: 'middle' };

    sheet.mergeCells(`D${r}:F${r}`);
    sheet.getCell(`E${r}`).value = '      ' + semData.nameLast; // Added spacing before name value starts
    sheet.getCell(`E${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`E${r}`).alignment = { horizontal: 'left', vertical: 'middle' };
    sheet.getCell(`E${r}`).border = { bottom: { style: 'thin' } };
    sheet.getCell(`F${r}`).border = { bottom: { style: 'thin' } };
    sheet.getCell(`G${r}`).border = { bottom: { style: 'thin' } };
    
    sheet.mergeCells(`G${r}:M${r}`);
    sheet.getCell(`H${r}`).value = semData.nameFirst;
    sheet.getCell(`H${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`H${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
    for (let c = 6; c <= 12; c++) {
      sheet.getCell(r, c).border = { bottom: { style: 'thin' } };
    }
    
    sheet.mergeCells(`N${r}:Y${r}`);
    sheet.getCell(`O${r}`).value = semData.nameMiddle;
    sheet.getCell(`O${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`O${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
    for (let c = 13; c <= 24; c++) {
      sheet.getCell(r, c).border = { bottom: { style: 'thin' } };
    }

    r = 9;
    sheet.getRow(r).height = 20;
    sheet.mergeCells(`A${r}:E${r}`);
    sheet.getCell(`A${r}`).value = 'USN: ' + semData.usn;
    sheet.getCell(`A${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`A${r}`).alignment = { horizontal: 'left', vertical: 'middle' };
    for (let c = 1; c <= 4; c++) {
      sheet.getCell(r, c).border = { bottom: { style: 'thin' } };
    }

    sheet.mergeCells(`G${r}:I${r}`);
    sheet.getCell(`H${r}`).value = 'LRN:';
    sheet.getCell(`H${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`H${r}`).alignment = { horizontal: 'right', vertical: 'middle' };

    sheet.mergeCells(`J${r}:N${r}`);
    sheet.getCell(`K${r}`).value = semData.lrn;
    sheet.getCell(`K${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`K${r}`).alignment = { horizontal: 'left', vertical: 'middle' };
    for (let c = 9; c <= 13; c++) {
      sheet.getCell(r, c).border = { bottom: { style: 'thin' } };
    }

    sheet.mergeCells(`P${r}:Q${r}`);
    sheet.getCell(`Q${r}`).value = 'AGE:';
    sheet.getCell(`Q${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`Q${r}`).alignment = { horizontal: 'right', vertical: 'middle' };

    sheet.getCell(`S${r}`).value = semData.age;
    sheet.getCell(`S${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`S${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell(`S${r}`).border = { bottom: { style: 'thin' } };

    sheet.mergeCells(`S${r}:U${r}`);
    sheet.getCell(`T${r}`).value = 'Sex:';
    sheet.getCell(`T${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`T${r}`).alignment = { horizontal: 'right', vertical: 'middle' };

    sheet.getCell(`W${r}`).value = semData.sex;
    sheet.getCell(`W${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`W${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell(`W${r}`).border = { bottom: { style: 'thin' } };

    r = 10;
    sheet.getRow(r).height = 20;
    sheet.mergeCells(`A${r}:F${r}`);
    sheet.getCell(`A${r}`).value = 'School Year: ' + semData.schoolYear;
    sheet.getCell(`A${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`A${r}`).alignment = { horizontal: 'left', vertical: 'middle' };
    for (let c = 1; c <= 5; c++) {
      sheet.getCell(r, c).border = { bottom: { style: 'thin' } };
    }

    sheet.mergeCells(`H${r}:M${r}`);
    sheet.getCell(`I${r}`).value = 'Track/Strand:';
    sheet.getCell(`I${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`I${r}`).alignment = { horizontal: 'left', vertical: 'middle' }; // Left-aligned to prevent any left-clipping

    sheet.mergeCells(`N${r}:Z${r}`);
    sheet.getCell(`O${r}`).value = semData.track;
    sheet.getCell(`O${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`O${r}`).alignment = { horizontal: 'left', vertical: 'middle' };
    for (let c = 13; c <= 25; c++) {
      sheet.getCell(r, c).border = { bottom: { style: 'thin' } };
    }

    // Dear Parent Note Section
    r = 12;
    sheet.getRow(r).height = 16;
    sheet.getCell(`A${r}`).value = 'Dear Parent';
    sheet.getCell(`A${r}`).font = { bold: true, size: 10 };
    
    r = 13;
    sheet.mergeCells(`A${r}:Z${r}`);
    sheet.getCell(`A${r}`).value = 'This report card shows the ability and progress your child has made in the different learning areas as well as his/her core values. The school welcomes you should you desire to know more about your child\'s progress.';
    sheet.getCell(`A${r}`).font = { size: 9 };
    sheet.getCell(`A${r}`).alignment = { wrapText: true, vertical: 'top' };
    sheet.getRow(r).height = 28;

    // ----------------------------------------------------
    // GRADES & SUBJECT PROGRESS TABLE
    // ----------------------------------------------------
    r = 15;
    sheet.mergeCells(`A${r}:Z${r}`);
    sheet.getCell(`A${r}`).value = 'REPORT ON LEARNING PROGRESS AND ACHIEVEMENT';
    sheet.getCell(`A${r}`).font = { bold: true, size: 11 };
    sheet.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(r).height = 22;

    r = 16;
    sheet.getRow(r).height = 20;
    sheet.getRow(r+1).height = 20;
    
    sheet.mergeCells(`A${r}:F${r+1}`);
    sheet.getCell(`A${r}`).value = `SEMESTER ${semData.sem}`;
    sheet.getCell(`A${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
    
    sheet.mergeCells(`G${r}:V${r+1}`);
    sheet.getCell(`H${r}`).value = 'Subjects';
    sheet.getCell(`H${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`H${r}`).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells(`W${r}:X${r}`);
    sheet.getCell(`X${r}`).value = 'Quarter';
    sheet.getCell(`X${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`X${r}`).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.getCell(`X${r+1}`).value = semData.q1;
    sheet.getCell(`X${r+1}`).font = { bold: true, size: 10 };
    sheet.getCell(`X${r+1}`).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.getCell(`Y${r+1}`).value = semData.q2;
    sheet.getCell(`Y${r+1}`).font = { bold: true, size: 10 };
    sheet.getCell(`Y${r+1}`).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells(`Y${r}:Y${r+1}`);
    sheet.getCell(`Z${r}`).value = "Semester\nFinal\nGrade"; // Exact formatting with \n mapping requested
    sheet.getCell(`Z${r}`).font = { bold: true, size: 9 };
    sheet.getCell(`Z${r}`).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    sheet.mergeCells(`Z${r}:Z${r+1}`);
    sheet.getCell(`Z${r}`).value = 'Remarks';
    sheet.getCell(`Z${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`Z${r}`).alignment = { horizontal: 'center', vertical: 'middle' };

    drawBorder(`A${r}:F${r+1}`, 'all');
    drawBorder(`G${r}:V${r+1}`, 'all');
    drawBorder(`W${r}:X${r}`, 'all');
    drawBorder(`W${r+1}:W${r+1}`, 'all');
    drawBorder(`X${r+1}:X${r+1}`, 'all');
    drawBorder(`Y${r}:Y${r+1}`, 'all');
    drawBorder(`Z${r}:Z${r+1}`, 'all');

    r = 18;
    const addSubjectRow = (cat, code, title, q1, q2, fg, rem) => {
        if (cat) {
            sheet.getRow(r).height = 20;
            sheet.mergeCells(`A${r}:Z${r}`);
            sheet.getCell(`A${r}`).value = cat;
            sheet.getCell(`A${r}`).font = { bold: true, size: 10 };
            sheet.getCell(`A${r}`).alignment = { vertical: 'middle', horizontal: 'left' };
            drawBorder(`A${r}:Z${r}`, 'all', 'medium'); // Applied medium border styling to dividers
            r++;
        }
        
        sheet.getRow(r).height = 18;
        
        sheet.mergeCells(`A${r}:F${r}`);
        sheet.getCell(`A${r}`).value = code;
        sheet.getCell(`A${r}`).font = { size: 10 };
        sheet.getCell(`A${r}`).alignment = { vertical: 'middle', horizontal: 'left' };
        
        sheet.mergeCells(`G${r}:V${r}`);
        sheet.getCell(`H${r}`).value = title;
        sheet.getCell(`H${r}`).font = { size: 10 };
        sheet.getCell(`H${r}`).alignment = { vertical: 'middle', horizontal: 'left' };
        
        sheet.getCell(`X${r}`).value = q1;
        sheet.getCell(`X${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getCell(`X${r}`).font = { size: 10 };
        
        sheet.getCell(`Y${r}`).value = q2;
        sheet.getCell(`Y${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getCell(`Y${r}`).font = { size: 10 };
        
        sheet.getCell(`Z${r}`).value = fg;
        sheet.getCell(`Z${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getCell(`Z${r}`).font = { size: 10 };
        
        sheet.getCell(`Z${r}`).value = rem;
        sheet.getCell(`Z${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getCell(`Z${r}`).font = { size: 10 };

        drawBorder(`A${r}:F${r}`, 'all');
        drawBorder(`G${r}:V${r}`, 'all');
        drawBorder(`W${r}:W${r}`, 'all');
        drawBorder(`X${r}:X${r}`, 'all');
        drawBorder(`Y${r}:Y${r}`, 'all');
        drawBorder(`Z${r}:Z${r}`, 'all');
        
        r++;
    };

    semData.subjects.forEach(sub => {
        addSubjectRow(sub.cat, sub.code, sub.title, sub.q1, sub.q2, sub.fg, sub.rem);
    });

    // General Average Row
    sheet.getRow(r).height = 22;
    sheet.mergeCells(`A${r}:X${r}`);
    sheet.getCell(`A${r}`).value = 'General Average for Semester:';
    sheet.getCell(`A${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`A${r}`).alignment = { horizontal: 'right', vertical: 'middle' };
    
    sheet.getCell(`Z${r}`).value = semData.genAvg;
    sheet.getCell(`Z${r}`).font = { bold: true, size: 10 };
    sheet.getCell(`Z${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
    
    drawBorder(`A${r}:X${r}`, 'all');
    drawBorder(`Y${r}:Y${r}`, 'all');
    drawBorder(`Z${r}:Z${r}`, 'all'); 

    r += 3; // Clear separation spacing

    // ----------------------------------------------------
    // LOWER HALF SPLIT: ATTENDANCE & OBSERVED VALUES
    // ----------------------------------------------------
    let splitR = r;
    sheet.getRow(splitR).height = 20;

    // LEFT HEADER
    sheet.mergeCells(`A${splitR}:O${splitR}`);
    sheet.getCell(`A${splitR}`).value = 'REPORT ON ATTENDANCE';
    sheet.getCell(`A${splitR}`).font = { bold: true, size: 10 };
    sheet.getCell(`A${splitR}`).alignment = { vertical: 'middle' };

    // RIGHT HEADER
    sheet.mergeCells(`Q${splitR}:Z${splitR}`);
    sheet.getCell(`R${splitR}`).value = "REPORT ON LEARNER'S OBSERVED VALUES";
    sheet.getCell(`R${splitR}`).font = { bold: true, size: 10 };
    sheet.getCell(`R${splitR}`).alignment = { vertical: 'middle' };

    splitR++;

    // --- ATTENDANCE TABULATION (LEFT) ---
    const attMonths = ['Jun','Jul','Aug','Sept','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Total'];
    const attLabels = ['No of School Days*', 'No of School Days Present*', 'No of Days Absent'];

    sheet.getRow(splitR).height = 20;
    sheet.mergeCells(`A${splitR}:A${splitR+1}`);
    sheet.getCell(`A${splitR}`).alignment = { horizontal: 'center', vertical: 'middle' };

    let cIdx = 2; // Col B
    attMonths.forEach((m, i) => {
        const col = String.fromCharCode(64 + cIdx + i);
        sheet.mergeCells(`${col}${splitR}:${col}${splitR+1}`);
        sheet.getCell(`${col}${splitR}`).value = m;
        sheet.getCell(`${col}${splitR}`).font = { bold: true, size: 8 };
        sheet.getCell(`${col}${splitR}`).alignment = { horizontal: 'center', vertical: 'middle' };
    });
    
    drawBorder(`A${splitR}:A${splitR+1}`, 'all');
    for(let i=0; i<13; i++) {
        drawBorder(`${String.fromCharCode(64+2+i)}${splitR}:${String.fromCharCode(64+2+i)}${splitR+1}`, 'all');
    }

    let attDataRowStart = splitR + 2;
    semData.attendance.forEach((attRow, idx) => {
        let currR = attDataRowStart + idx;
        sheet.getCell(`A${currR}`).value = attLabels[idx];
        sheet.getCell(`A${currR}`).font = { bold: true, size: 8 };
        sheet.getCell(`A${currR}`).alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };
        sheet.getRow(currR).height = 28; // Reduced a little from 38 to close visual gap spacing

        drawBorder(`A${currR}:A${currR}`, 'all');
        for (let i = 0; i < 13; i++) {
            const col = String.fromCharCode(64 + 2 + i);
            drawBorder(`${col}${currR}:${col}${currR}`, 'all');
        }
        attRow.forEach((val, i) => {
            const col = String.fromCharCode(64 + 2 + i);
            sheet.getCell(`${col}${currR}`).value = val;
            sheet.getCell(`${col}${currR}`).font = { size: 9 };
            sheet.getCell(`${col}${currR}`).alignment = { horizontal: 'center', vertical: 'middle' };
        });
    });

    // --- RIGHT SIDE OBSERVED VALUES ---
    sheet.mergeCells(`Q${splitR}:R${splitR+1}`);
    sheet.getCell(`R${splitR}`).value = 'Core Values';
    sheet.getCell(`R${splitR}`).font = { bold: true, size: 9 };
    sheet.getCell(`R${splitR}`).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells(`S${splitR}:X${splitR+1}`);
    sheet.getCell(`T${splitR}`).value = 'Behavioral Statements';
    sheet.getCell(`T${splitR}`).font = { bold: true, size: 9 };
    sheet.getCell(`T${splitR}`).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells(`Y${splitR}:Z${splitR}`);
    sheet.getCell(`Z${splitR}`).value = 'Quarter';
    sheet.getCell(`Z${splitR}`).font = { bold: true, size: 9 };
    sheet.getCell(`Z${splitR}`).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.getCell(`Z${splitR+1}`).value = semData.q1;
    sheet.getCell(`Z${splitR+1}`).font = { bold: true, size: 9 };
    sheet.getCell(`Z${splitR+1}`).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.getCell(`Z${splitR+1}`).value = semData.q2;
    sheet.getCell(`Z${splitR+1}`).font = { bold: true, size: 9 };
    sheet.getCell(`Z${splitR+1}`).alignment = { horizontal: 'center', vertical: 'middle' };

    drawBorder(`Q${splitR}:R${splitR+1}`, 'all');
    drawBorder(`S${splitR}:X${splitR+1}`, 'all');
    drawBorder(`Y${splitR}:Z${splitR}`, 'all');
    drawBorder(`Y${splitR+1}:Y${splitR+1}`, 'all');
    drawBorder(`Z${splitR+1}:Z${splitR+1}`, 'all');

    let valR = splitR + 2;
    const addValueRow = (core, behavior, v1, v2, mergeCoreLines) => {
        sheet.getRow(valR).height = 24; 
        
        if (core) {
            sheet.mergeCells(`Q${valR}:R${valR + mergeCoreLines - 1}`);
            sheet.getCell(`R${valR}`).value = core;
            sheet.getCell(`R${valR}`).font = { bold: true, size: 9 };
            sheet.getCell(`R${valR}`).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
        }

        sheet.mergeCells(`S${valR}:X${valR}`);
        sheet.getCell(`T${valR}`).value = behavior;
        sheet.getCell(`T${valR}`).font = { size: 8 };
        sheet.getCell(`T${valR}`).alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };

        sheet.getCell(`Z${valR}`).value = v1;
        sheet.getCell(`Z${valR}`).font = { size: 9 };
        sheet.getCell(`Z${valR}`).alignment = { horizontal: 'center', vertical: 'middle' };

        sheet.getCell(`Z${valR}`).value = v2;
        sheet.getCell(`Z${valR}`).font = { size: 9 };
        sheet.getCell(`Z${valR}`).alignment = { horizontal: 'center', vertical: 'middle' };

        if (core) {
            drawBorder(`Q${valR}:R${valR + mergeCoreLines - 1}`, 'all');
        }
        drawBorder(`S${valR}:X${valR}`, 'all');
        drawBorder(`Y${valR}:Y${valR}`, 'all');
        drawBorder(`Z${valR}:Z${valR}`, 'all');
        
        valR++;
    };

    semData.values.forEach(v => {
        addValueRow(v.c, v.b, v.q1, v.q2, v.lines);
    });

    // ----------------------------------------------------
    // SIGNATURES & DESCRIPTORS (BOTTOM AREA)
    // ----------------------------------------------------
    let sigR = splitR + 6;
    sheet.getRow(sigR).height = 18;
    
    // Left: Parent Signatures Header
    sheet.mergeCells(`A${sigR}:L${sigR}`);
    sheet.getCell(`A${sigR}`).value = "PARENT/GUARDIAN'S SIGNATURE";
    sheet.getCell(`A${sigR}`).font = { bold: true, size: 10 };
    sheet.getCell(`A${sigR}`).alignment = { vertical: 'middle' };

    sheet.getRow(sigR+1).height = 18;
    sheet.mergeCells(`A${sigR+1}:I${sigR+1}`);
    const q1Label = semData.q1 === '1' ? '1st' : '3rd';
    sheet.getCell(`A${sigR+1}`).value = `${q1Label} Quarter  ________________________`;
    sheet.getCell(`A${sigR+1}`).font = { size: 9 };
    sheet.getCell(`A${sigR+1}`).alignment = { vertical: 'bottom', horizontal: 'left' };

    sheet.getRow(sigR+2).height = 18;
    sheet.mergeCells(`A${sigR+2}:I${sigR+2}`);
    const q2Label = semData.q2 === '2' ? '2nd' : '4th';
    sheet.getCell(`A${sigR+2}`).value = `${q2Label} Quarter  ________________________`;
    sheet.getCell(`A${sigR+2}`).font = { size: 9 };
    sheet.getCell(`A${sigR+2}`).alignment = { vertical: 'bottom', horizontal: 'left' };

    sigR += 4;
    sheet.getRow(sigR).height = 18;

    // Descriptors Section titles
    sheet.mergeCells(`A${sigR}:L${sigR}`);
    sheet.getCell(`A${sigR}`).value = 'Learner Progress and Achievement';
    sheet.getCell(`A${sigR}`).font = { bold: true, size: 9 };
    sheet.getCell(`A${sigR}`).alignment = { vertical: 'middle' };
    
    sheet.mergeCells(`Q${sigR}:Z${sigR}`);
    sheet.getCell(`R${sigR}`).value = 'Observed Values';
    sheet.getCell(`R${sigR}`).font = { bold: true, size: 9 };
    sheet.getCell(`R${sigR}`).alignment = { vertical: 'middle' };

    sigR++;
    sheet.getRow(sigR).height = 16;
    
    sheet.mergeCells(`A${sigR}:C${sigR}`);
    sheet.getCell(`A${sigR}`).value = 'Descriptors';
    sheet.getCell(`A${sigR}`).font = { bold: true, size: 9 };
    sheet.getCell(`A${sigR}`).alignment = { horizontal: 'left', vertical: 'middle' };

    sheet.mergeCells(`D${sigR}:H${sigR}`);
    sheet.getCell(`E${sigR}`).value = 'Grading Scale';
    sheet.getCell(`E${sigR}`).font = { bold: true, size: 9 };
    sheet.getCell(`E${sigR}`).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells(`I${sigR}:L${sigR}`);
    sheet.getCell(`J${sigR}`).value = 'Remarks';
    sheet.getCell(`J${sigR}`).font = { bold: true, size: 9 };
    sheet.getCell(`J${sigR}`).alignment = { horizontal: 'center', vertical: 'middle' };

    drawBorder(`A${sigR}:C${sigR}`, 'all');
    drawBorder(`D${sigR}:H${sigR}`, 'all');
    drawBorder(`I${sigR}:L${sigR}`, 'all');

    sheet.getCell(`R${sigR}`).value = 'Marking';
    sheet.getCell(`R${sigR}`).font = { bold: true, size: 9 };
    sheet.getCell(`R${sigR}`).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells(`R${sigR}:Z${sigR}`);
    sheet.getCell(`S${sigR}`).value = 'Non-numerical Rating';
    sheet.getCell(`S${sigR}`).font = { bold: true, size: 9 };
    sheet.getCell(`S${sigR}`).alignment = { horizontal: 'left', vertical: 'middle' };

    drawBorder(`Q${sigR}:Q${sigR}`, 'all');
    drawBorder(`R${sigR}:Z${sigR}`, 'all');

    const desc = [
        ['Outstanding', '90-100', 'Passed'],
        ['Very Satisfactory', '85-89', 'Passed'],
        ['Satisfactory', '80-84', 'Passed'],
        ['Fairly Satisfactory', '75-79', 'Passed'],
        ['Did not Meet Expectation', 'Below 75', 'Failed'],
    ];

    const vals = [
        ['AO', 'Always Observed'],
        ['SO', 'Sometimes Observed'],
        ['RO', 'Rarely Observed'],
        ['NO', 'Not Observed'],
    ];

    for(let i=0; i<5; i++) {
        const d = desc[i];
        const v = vals[i] || ['',''];
        
        let currR = sigR + 1 + i;
        sheet.getRow(currR).height = 16;

        sheet.mergeCells(`A${currR}:C${currR}`);
        sheet.getCell(`A${currR}`).value = d[0];
        sheet.getCell(`A${currR}`).font = { size: 9, color: { theme: 1 } };
        sheet.getCell(`A${currR}`).alignment = { vertical: 'middle', horizontal: 'left' };
        
        sheet.mergeCells(`D${currR}:H${currR}`);
        // Widen descriptor columns and explicitly check print bounds to ensure "Grading Scale" isn't cut off
        sheet.getCell(`E${currR}`).value = d[1];
        sheet.getCell(`E${currR}`).font = { size: 9, color: { theme: 1 } };
        sheet.getCell(`E${currR}`).alignment = { vertical: 'middle', horizontal: 'center' };
        
        sheet.mergeCells(`I${currR}:L${currR}`);
        sheet.getCell(`J${currR}`).value = d[2];
        sheet.getCell(`J${currR}`).font = { size: 9, color: { theme: 1 } };
        sheet.getCell(`J${currR}`).alignment = { vertical: 'middle', horizontal: 'center' };

        drawBorder(`A${currR}:C${currR}`, 'all');
        drawBorder(`D${currR}:H${currR}`, 'all');
        drawBorder(`I${currR}:L${currR}`, 'all');

        if(v[0]) {
            sheet.getCell(`R${currR}`).value = v[0];
            sheet.getCell(`R${currR}`).font = { size: 9, color: { theme: 1 } };
            sheet.getCell(`R${currR}`).alignment = { horizontal: 'center', vertical: 'middle' };

            sheet.mergeCells(`R${currR}:Z${currR}`);
            sheet.getCell(`S${currR}`).value = v[1];
            sheet.getCell(`S${currR}`).font = { size: 9, color: { theme: 1 } };
            sheet.getCell(`S${currR}`).alignment = { vertical: 'middle', horizontal: 'left' };

            drawBorder(`Q${currR}:Q${currR}`, 'all');
            drawBorder(`R${currR}:Z${currR}`, 'all');
        }
    }

    sigR += 8; // Leaves 1 blank line after the 5 data rows
    // Signatures Signees names
    sheet.getRow(sigR).height = 20;

    sheet.mergeCells(`A${sigR}:F${sigR}`);
    sheet.getCell(`A${sigR}`).value = semData.adviser;
    sheet.getCell(`A${sigR}`).font = { bold: true, size: 10 };
    sheet.getCell(`A${sigR}`).alignment = { horizontal: 'center', vertical: 'bottom' };
    
    // Left signature: Column A (width 22.0)
    sheet.getCell(`A${sigR}`).value = semData.adviser;
    sheet.getCell(`A${sigR}`).font = { bold: true, size: 10 };
    sheet.getCell(`A${sigR}`).alignment = { horizontal: 'center', vertical: 'bottom' };
    
    // Middle signature: Columns L to Q (width 23.4)
    sheet.mergeCells(`M${sigR}:R${sigR}`);
    sheet.getCell(`N${sigR}`).value = semData.principal;
    sheet.getCell(`N${sigR}`).font = { bold: true, size: 10 };
    sheet.getCell(`N${sigR}`).alignment = { horizontal: 'center', vertical: 'bottom' };
    
    // Right signature: Columns W to Y (width 24.3)
    sheet.mergeCells(`X${sigR}:Z${sigR}`);
    sheet.getCell(`Y${sigR}`).value = semData.registrar;
    sheet.getCell(`Y${sigR}`).font = { bold: true, size: 10 };
    sheet.getCell(`Y${sigR}`).alignment = { horizontal: 'center', vertical: 'bottom' };

    sigR++;
    sheet.getRow(sigR).height = 18;

    sheet.getCell(`A${sigR}`).value = 'Adviser';
    sheet.getCell(`A${sigR}`).font = { size: 9, bold: false };
    sheet.getCell(`A${sigR}`).alignment = { horizontal: 'center', vertical: 'top' };
    sheet.getCell(`A${sigR}`).border = { top: {style: 'thin'} };
    
    sheet.mergeCells(`M${sigR}:R${sigR}`);
    sheet.getCell(`N${sigR}`).value = 'SHS Head/Principal';
    sheet.getCell(`N${sigR}`).font = { size: 9, bold: false };
    sheet.getCell(`N${sigR}`).alignment = { horizontal: 'center', vertical: 'top' };
    sheet.getCell(`N${sigR}`).border = { top: {style: 'thin'} };
    
    sheet.mergeCells(`X${sigR}:Z${sigR}`);
    sheet.getCell(`Y${sigR}`).value = 'Registrar';
    sheet.getCell(`Y${sigR}`).font = { size: 9, bold: false };
    sheet.getCell(`Y${sigR}`).alignment = { horizontal: 'center', vertical: 'top' };
    sheet.getCell(`Y${sigR}`).border = { top: {style: 'thin'} };
  }

  // --- SEMESTER 1 DATA ---
  const sem1 = {
      sem: '1', q1: '1', q2: '2',
      nameLast: 'FAA', nameFirst: 'FRANK NATHAN', nameMiddle: 'VILLA',
      usn: '24001535700', lrn: '136479140602', age: '17', sex: 'M',
      schoolYear: '2025-2026', track: 'TVL/ICT',
      genAvg: '95',
      subjects: [
          {cat: 'CORE Subjects', code: 'HMRM-2121', title: 'Homeroom G12A', q1: 'Good', q2: 'Good', fg: 'Good', rem: ''},
          {cat: '', code: 'FILI-2111', title: 'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino', q1: '95', q2: '97', fg: '96', rem: 'Passed'},
          {cat: '', code: 'MEIL-2122', title: 'Media and Information Literacy', q1: '94', q2: '96', fg: '95', rem: 'Passed'},
          {cat: '', code: 'PDEV-2111', title: 'Personal Development/Pansariling Kaunlaran', q1: '92', q2: '97', fg: '95', rem: 'Passed'},
          {cat: '', code: 'PEDH-2121', title: 'Physical Education & Health G12A', q1: '89', q2: '93', fg: '91', rem: 'Passed'},
          {cat: 'APPLIED Subjects', code: 'FILI-2121B', title: 'Pagsulat sa Filipino sa Piling Larangan (Tech-Voc)', q1: '97', q2: '97', fg: '97', rem: 'Passed'},
          {cat: '', code: 'RSCH-2120', title: 'Practical Research 2', q1: '94', q2: '94', fg: '94', rem: 'Passed'},
          {cat: 'SPECIALIZED Subjects', code: 'PROG-3112', title: 'Programming (Java) NCIII Part 2', q1: '97', q2: '93', fg: '95', rem: 'Passed'},
          {cat: '', code: 'PROG-3113', title: 'Programming (Oracle Database) NC III Part 1', q1: '93', q2: '99', fg: '96', rem: 'Passed'},
      ],
      attendance: [
          [1, 23, 21, 22, 23, 13, '', '', '', '', '', '', 103],
          [1, 23, 21, 22, 23, 13, '', '', '', '', '', '', 103],
          [0, 0, 0, 0, 0, 0, '', '', '', '', '', '', 0]
      ],
      values: [
          {c: 'Maka-Diyos', b: 'Expresses one\'s spiritual belief while respecting the spiritual belief of others', q1: '-', q2: '-', lines: 2},
          {c: null, b: 'Shows adherence to ethical principles by upholding truth', q1: '-', q2: '-'},
          {c: 'Makatao', b: 'Is sensitive to individual, social and cultural differences.', q1: '-', q2: '-', lines: 2},
          {c: null, b: 'Demonstrates contributions toward solidarity.', q1: '-', q2: '-'},
          {c: 'Makakalikasan', b: 'Cares for the environment and utilizes resources wisely, judiciously, and economically.', q1: '-', q2: '-', lines: 1},
          {c: 'Makabansa', b: 'Demonstrates pride in being a Filipino; exercises the rights and responsibilities of a Filipino citizen', q1: '-', q2: '-', lines: 2},
          {c: null, b: 'Demonstrates appropriate behavior in carrying-out activities in the school, community, and country.', q1: '-', q2: '-'}
      ],
      printDate: '12/10/2025 11:07:37am',
      adviser: 'Mr. Sean Denzel A. Unabia',
      principal: 'Emily Leonor-Quin',
      registrar: 'Ms. Mitch Unry P. Oreasll'
  };

  const sem2 = {
      sem: '2', q1: '3', q2: '4',
      nameLast: 'FAA', nameFirst: 'FRANK NATHAN', nameMiddle: 'VILLA',
      usn: '24001535700', lrn: '136479140602', age: '17', sex: 'M', // Kept age consistent as 17 across semesters
      schoolYear: '2025-2026', track: 'TVL/ICT',
      genAvg: '98',
      subjects: [
          {cat: 'CORE Subjects', code: 'CPAR-2122', title: 'Contemporary Philippine Arts from the Regions', q1: '98', q2: '98', fg: '98', rem: 'Passed'},
          {cat: '', code: 'HMRM-2122', title: 'Homeroom G12B', q1: 'Good', q2: 'Good', fg: 'Good', rem: ''},
          {cat: '', code: 'FILI-2112', title: 'Pagbasa at Pagusuri ng Ibat Ibang Teksto Tungo sa Pananaliksik', q1: '97', q2: '99', fg: '98', rem: 'Passed'},
          {cat: '', code: 'PEDH-2122', title: 'Physical Education & Health G12B', q1: '98', q2: '98', fg: '98', rem: 'Passed'},
          {cat: 'APPLIED Subjects', code: 'ENTR-2122', title: 'Entrepreneurship', q1: '96', q2: '95', fg: '96', rem: 'Passed'},
          {cat: '', code: 'RSCH-2122', title: 'Inquiries, Investigations and Immersion', q1: '98', q2: '99', fg: '99', rem: 'Passed'},
          {cat: 'SPECIALIZED Subjects', code: 'PROG-3114', title: 'Programming (Oracle Database) NCIII Part 2', q1: '95', q2: '99', fg: '97', rem: 'Passed'},
          {cat: '', code: 'ICT-2300', title: 'Work Immersion', q1: '99', q2: '96', fg: '98', rem: 'Passed'},
      ],
      attendance: [
          ['','','','',0, 10, 20, 20, 23, 19, 0, 92],
          ['','','','','',10, 20, 20, 23, 19, '', 92],
          ['','','','',0, 0, 0, 0, 0, 0, 0, 0, 0] // Added missing 0 for Total column
      ],
      values: [
          {c: 'Maka-Diyos', b: 'Expresses one\'s spiritual belief while respecting the spiritual belief of others', q1: '-', q2: '-', lines: 2},
          {c: null, b: 'Shows adherence to ethical principles by upholding truth', q1: '-', q2: '-'},
          {c: 'Makatao', b: 'Is sensitive to individual, social and cultural differences.', q1: '-', q2: '-', lines: 2},
          {c: null, b: 'Demonstrates contributions toward solidarity.', q1: '-', q2: '-'},
          {c: 'Makakalikasan', b: 'Cares for the environment and utilizes resources wisely, judiciously, and economically.', q1: '-', q2: '-', lines: 1},
          {c: 'Makabansa', b: 'Demonstrates pride in being a Filipino; exercises the rights and responsibilities of a Filipino citizen', q1: '-', q2: '-', lines: 2},
          {c: null, b: 'Demonstrates appropriate behavior in carrying-out activities in the school, community, and country.', q1: '-', q2: '-'}
      ],
      printDate: '06/23/2026 03:57:28pm',
      adviser: 'Mr. Sean Denzel A. Unabia',
      principal: 'Emily Leonor-Quin',
      registrar: 'Ms. Mitch Unry P. Oreasll'
  };

  const sheet1 = wb.addWorksheet('Semester 1');
  setupSheet(sheet1, sem1);
  const sheet2 = wb.addWorksheet('Semester 2');
  setupSheet(sheet2, sem2);
  
  const targetFile = path.join(process.cwd(), 'F-138_Template_v16.xlsx');
  await wb.xlsx.writeFile(targetFile);
  console.log('Template generated at ' + targetFile);
}

createSF9().catch(err => console.error(err));
