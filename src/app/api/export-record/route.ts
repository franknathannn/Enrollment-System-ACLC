// @ts-ignore
import XlsxPopulate from 'xlsx-populate';
import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';

export async function POST(req: NextRequest) {
  try {
    const { sectionName, students, schoolYear } = await req.json();
    const filePath = path.join(process.cwd(), 'public', 'ClassRecord.xlsx');

    if (!fs.existsSync(filePath)) {
      console.error(`Template not found at: ${filePath}`);
      return NextResponse.json({ error: "Template file missing on server" }, { status: 500 });
    }

    if (!fs.existsSync(filePath)) {
      console.error(`Template not found at: ${filePath}`);
      return NextResponse.json({ error: "Template file missing on server" }, { status: 500 });
    }

    // 1. Load the template
    const workbook = await XlsxPopulate.fromFileAsync(filePath);
    const sheet = workbook.sheet("INPUT DATA");

    if (!sheet) {
      return NextResponse.json({ error: "Sheet 'INPUT DATA' not found" }, { status: 404 });
    }

    // --- ADMINISTRATIVE PLACEHOLDERS (REPLACE STRINGS BELOW AS NEEDED) ---
    
    // REGION (G4)
    sheet.cell("G4").value("NCR"); // <--- REPLACE REGION HERE

    // DIVISION (O4)
    sheet.cell("O4").value("CITY DIVISION OF MANILA"); // <--- REPLACE DIVISION HERE

    // SCHOOL NAME (N6)
    sheet.cell("G5").value("ACLC COMPUTER LEARNING CENTER"); // <--- REPLACE SCHOOL NAME HERE

    // SCHOOL ID (X5)
    sheet.cell("X5").value("401144"); // <--- REPLACE SCHOOL ID HERE

    // SECTION (K7)
    sheet.cell("K7").value(sectionName.toUpperCase());

    // SCHOOL YEAR (AG5)
    sheet.cell("AG5").value(schoolYear || "");

    // --- STUDENT DATA INJECTION ---
    const sorted = [...students].sort((a, b) => a.last_name.localeCompare(b.last_name));
    const males = sorted.filter(s => s.gender === 'Male');
    const females = sorted.filter(s => s.gender === 'Female');

    const format = (s: any) => 
      `${s.last_name.toUpperCase()}, ${s.first_name.toUpperCase()} ${s.middle_name ? s.middle_name.charAt(0) + '.' : ''}`;

    // Fill Males (B13 onwards)
    males.forEach((s, i) => {
      sheet.cell(`B${13 + i}`).value(format(s));
    });

    // Fill Females (B64 onwards)
    females.forEach((s, i) => {
      sheet.cell(`B${64 + i}`).value(format(s));
    });

    // 2. Generate Output Buffer
    const outBuffer = await workbook.outputAsync();

    return new NextResponse(outBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Class_Record_For_${sectionName}.xlsx"`,
      },
    });

  } catch (error: any) {
    console.error("Masterlist Process Failed:", error);
    return NextResponse.json({ error: "Export Logic Failed" }, { status: 500 });
  }
}