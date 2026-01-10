// @ts-ignore
import XlsxPopulate from 'xlsx-populate';
import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { filter } = await req.json();
    const filePath = path.join(process.cwd(), 'public', 'MasterList.xlsx');

    if (!fs.existsSync(filePath)) {
      console.error(`Template not found at: ${filePath}`);
      return NextResponse.json({ error: "Template file missing on server" }, { status: 500 });
    }

    if (!fs.existsSync(filePath)) {
      console.error(`Template not found at: ${filePath}`);
      return NextResponse.json({ error: "Template file missing on server" }, { status: 500 });
    }

    // 1. Fetch Data
    let query = supabase
      .from('students')
      .select('*')
      .order('last_name', { ascending: true });

    if (filter !== 'All') {
      if (filter === 'Accepted') {
        query = query.in('status', ['Accepted', 'Approved']);
      } else {
        query = query.eq('status', filter);
      }
    }

    const { data: students, error } = await query;

    if (error) throw error;
    if (!students) return NextResponse.json({ error: "No data found" }, { status: 404 });

    // 2. Sort Logic (Section Priority then Alphabetical)
    const gasCount = students.filter((s: any) => s.strand === 'GAS').length;
    const ictCount = students.filter((s: any) => s.strand === 'ICT').length;
    const priorityStrand = ictCount > gasCount ? 'ICT' : 'GAS';

    const sortedStudents = [...students].sort((a, b) => {
      // Primary Sort: Strand Priority
      const aStrand = a.strand || '';
      const bStrand = b.strand || '';
      
      const aIsPriority = aStrand === priorityStrand;
      const bIsPriority = bStrand === priorityStrand;

      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;

      // Secondary Sort: Alphabetical by Name
      const nameA = `${a.last_name}, ${a.first_name}`;
      const nameB = `${b.last_name}, ${b.first_name}`;
      return nameA.localeCompare(nameB);
    });

    // 3. Load Template
    const workbook = await XlsxPopulate.fromFileAsync(filePath);
    const sheet = workbook.sheet(0);

    if (!sheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    // 4. Fill Data (Starting at Row 10)
    const startRow = 10;
    
    sortedStudents.forEach((student: any, index: number) => {
      const r = startRow + index;
      
      // A: No.
      sheet.cell(`A${r}`).value(index + 1);

      // B: Name (SURNAME, FIRST NAME, MIDDLE NAME)
      const mName = student.middle_name ? ` ${student.middle_name}` : '';
      sheet.cell(`B${r}`).value(`${student.last_name}, ${student.first_name}${mName}`.toUpperCase());

      // C: LRN
      sheet.cell(`C${r}`).value(student.lrn || '');

      // D: Section
      sheet.cell(`D${r}`).value(student.section || 'Unassigned');

      // E: Gender
      sheet.cell(`E${r}`).value(student.gender || '');

      // F: Contact No. (Student / Parent)
      const sPhone = student.phone || student.contact_no || '';
      const pPhone = student.guardian_phone || student.guardian_contact || '';
      const contact = [sPhone, pPhone].filter(Boolean).join(' / ');
      sheet.cell(`F${r}`).value(contact);

      // G: Guardian Name (FN, MN, LN)
      let gName = student.guardian_name || '';
      if (student.guardian_last_name) {
        gName = `${student.guardian_first_name || ''} ${student.guardian_middle_name || ''} ${student.guardian_last_name}`;
      }
      sheet.cell(`G${r}`).value(gName.toUpperCase().trim());

      // H: Birthdate
      sheet.cell(`H${r}`).value(student.birth_date || '');

      // I: Status (Color Coded)
      const statusCell = sheet.cell(`I${r}`);
      const status = student.status;
      statusCell.value(status === 'Approved' ? 'Accepted' : status);

      if (status === 'Approved' || status === 'Accepted') {
        statusCell.style("fill", { type: "solid", color: "E2EFDA" }); // Soft Green
      } else if (status === 'Rejected') {
        statusCell.style("fill", { type: "solid", color: "FFC7CE" }); // Soft Red
      } else if (status === 'Pending') {
        statusCell.style("fill", { type: "solid", color: "FFEB9C" }); // Soft Orange
      }

      // J: USN (Blank)
      sheet.cell(`J${r}`).value('');
    });

    // 5. Generate Output
    const outBuffer = await workbook.outputAsync();

    return new NextResponse(outBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Applicants_MasterList.xlsx"`,
      },
    });

  } catch (error: any) {
    console.error("Export Failed:", error);
    return NextResponse.json({ error: error.message || "Export Logic Failed" }, { status: 500 });
  }
}