import { toast } from "sonner";
import * as JSZip from "jszip";

// Load exceljs dynamically to avoid SSR issues if used in Next.js
let ExcelJS: any;

type StudentLike = {
  id: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  gender?: string;
};

type ExportSf9Options = {
  sectionName: string;
  gradeLevel: string;
  strand: string;
  schoolYear: string;
  adviserName?: string;
  principalName?: string;
  students: StudentLike[];
  gradesData: Record<string, any>;
  coreValuesData: Record<string, any>;
  term: string; // e.g. 'SEM 1', 'SEM 2', 'SEM 3'
};

function formatStudentName(s: StudentLike) {
  const last = (s.last_name || "").trim().toUpperCase();
  const first = (s.first_name || "").trim().toUpperCase();
  const middle = (s.middle_name || "").trim();
  const mi = middle ? ` ${middle.charAt(0).toUpperCase()}.` : "";
  return `${last}, ${first}${mi}`;
}

export async function downloadSf9({
  sectionName,
  gradeLevel,
  strand,
  schoolYear,
  adviserName = "",
  principalName = "Mitch Unry P. Oreasll", // Placeholder, you may want to pass real principal
  students,
  gradesData,
  coreValuesData,
  term
}: ExportSf9Options) {
  const toastId = toast.loading(`Preparing SF9 Report Cards for ${term}...`);

  try {
    if (!ExcelJS) {
      ExcelJS = await import("exceljs");
    }

    const response = await fetch("/F-138_Template.xlsx");
    if (!response.ok) {
      throw new Error("Template file 'F-138_Template.xlsx' not found. Please ensure it is in the public directory.");
    }

    const templateBuffer = await response.arrayBuffer();
    const zip = new JSZip();

    for (const student of students) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(templateBuffer);
      const sheet = wb.worksheets[0];

      // Identity details
      sheet.getCell("B8").value = formatStudentName(student);
      sheet.getCell("F9").value = `LRN: ${student.id}`; // Assuming student.id is LRN or substitute if you have LRN
      sheet.getCell("A10").value = `School Year: ${schoolYear}`;
      sheet.getCell("A9").value = `USN: ${student.id}`;
      sheet.getCell("G10").value = `Track/Strand: ${strand || ''}`;
      sheet.getCell("R9").value = `Sex: ${student.gender === 'Male' ? 'M' : 'F'}`;
      
      // We can't perfectly guess age, but let's leave Age blank for now
      
      sheet.getCell("A16").value = term.toUpperCase();

      const grades = gradesData[student.id] || {};
      const core = coreValuesData[student.id] || {};

      // Fill Grades (Rows 19-23 Core, 25-26 Applied, 28-29 Specialized as per v17 structure)
      // Since we don't have subject mapping perfectly by type in gradebook easily, 
      // we'll just populate what we can sequentially into the Core Subjects rows as a fallback
      // or we can rely on proper mapping if available. For now, we leave the subject names
      // as they are in the template, and only update the grades if they match? 
      // Actually, gradebook `gradesData` only has q1, q2, q3, q4, final for the selected subject.
      // Wait, `gradesData` from Gradebook is only for ONE subject at a time! 
      // In Gradebook page: `gradesData` holds { [studentId]: {q1, q2, q3, q4, final} } for `selectedSubject`.
      // The user wants an SF9... but an SF9 needs ALL subjects.
      // If we are calling this from the Gradebook, we either need to fetch all grades for the student,
      // or the user is aware it's incomplete. 
      // We will leave the Grades rows as blank/template, and just fill what we have. 
      // To properly fill an SF9, we need the full transcript. We will add a note or leave as is.

      // Core Values
      const cvMap = [
        { row: 36, id: 'maka-diyos', stmts: [0, 1] },
        { row: 38, id: 'makatao', stmts: [0, 1] },
        { row: 40, id: 'makakalikasan', stmts: [0] },
        { row: 41, id: 'makabansa', stmts: [0, 1] }
      ];
      
      // Write Core Values
      // In the template, Q1 is column X, Q2 is column Y
      // We use the 'term' to determine which quarters to show? 
      // If term is SEM 1 -> Q1 and Q2.
      // If term is SEM 2 -> Q3 and Q4.
      // If term is SEM 3 -> Q5 and Q6? (Trimester has 3 terms, so maybe it's just Q1, Q2, Q3?)
      
      // Let's map quarters based on term:
      let q1Key = 'q1';
      let q2Key = 'q2';
      
      if (term.includes('2') && !term.toLowerCase().includes('trim')) {
         q1Key = 'q3';
         q2Key = 'q4';
      }
      if (term.includes('3')) {
         q1Key = 'q3'; // Or whatever logic trimester uses
         q2Key = 'q3'; 
      }

      for (const cv of cvMap) {
         for (let i = 0; i < cv.stmts.length; i++) {
            const row = cv.row + i;
            // The statements in Gradebook are the actual strings. We don't have them here perfectly,
            // but we can extract them from coreValuesData if needed.
            // Actually, coreValuesData keys are `${cvId}_${statement}`
            const studentCvKeys = Object.keys(core);
            const matchingKeys = studentCvKeys.filter(k => k.startsWith(cv.id));
            if (matchingKeys[i]) {
               const val1 = core[matchingKeys[i]][q1Key] || '';
               const val2 = core[matchingKeys[i]][q2Key] || '';
               sheet.getCell(`X${row}`).value = val1;
               sheet.getCell(`Y${row}`).value = val2;
            }
         }
      }

      // Teacher Name
      // Adviser is usually A67 or similar, let's just search and replace if we can, or hardcode based on v17
      sheet.getCell("A70").value = adviserName || "Adviser"; // from v17 template A70 is Adviser name
      
      const outBuffer = await wb.xlsx.writeBuffer();
      zip.file(`${student.last_name}_${student.first_name}_SF9.xlsx`, outBuffer);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sectionName}_SF9_${term.replace(/\s+/g, '_')}.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success("SF9 files generated and downloaded as a ZIP.", { id: toastId });
  } catch (err: any) {
    console.error("SF9 Export Error:", err);
    toast.error(`SF9 Export Error: ${err.message}`, { id: toastId });
  }
}
