// src/app/admin/sections/api/exportSectionRecord.ts
import { toast } from "sonner";

export async function downloadSectionRecord(sectionName: string, students: any[], schoolYear: string) {
  const toastId = toast.loading("Connecting to Grade Registry...");

  try {
    const XlsxPopulate = (window as any).XlsxPopulate;

    if (!XlsxPopulate) {
      throw new Error("Excel Engine not ready. Please refresh the page.");
    }

    const response = await fetch('/ClassRecord.xlsx');
    if (!response.ok) throw new Error("Template file not found.");
    const arrayBuffer = await response.arrayBuffer();

    const workbook = await XlsxPopulate.fromDataAsync(arrayBuffer);
    const sheet = workbook.sheet("INPUT DATA");

    if (!sheet) throw new Error("Sheet 'INPUT DATA' not found!");

    // 1. Fill Header Data
    sheet.cell("G4").value("NCR");
    sheet.cell("O4").value("CITY DIVISION OF MANILA");
    sheet.cell("G5").value("ACLC COMPUTER LEARNING CENTER");
    sheet.cell("X5").value("401144");
    sheet.cell("K7").value(sectionName ? sectionName.toUpperCase() : "UNKNOWN");
    sheet.cell("AG5").value(schoolYear || "");

    // 2. Sort Students
    const sorted = Array.isArray(students) 
      ? [...students].sort((a, b) => a.last_name.localeCompare(b.last_name)) 
      : [];
    
    const males = sorted.filter(s => s.gender === 'Male');
    const females = sorted.filter(s => s.gender === 'Female');

    const format = (s: any) => 
      `${s.last_name.toUpperCase()}, ${s.first_name.toUpperCase()} ${s.middle_name ? s.middle_name.charAt(0) + '.' : ''}`;

    // 3. Inject Names
    males.forEach((s, i) => sheet.cell(`B${13 + i}`).value(format(s)));
    females.forEach((s, i) => sheet.cell(`B${64 + i}`).value(format(s)));

    // 4. Removed the "ForceFullCalc" line to stop the error.
    // Excel's internal engine will handle the update once the user opens the file.

    const outBuffer = await workbook.outputAsync();
    const blob = new Blob([outBuffer], { 
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Class_Record_${sectionName}.xlsx`;
    document.body.appendChild(a);
    a.click();
    
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success("Masterlist Prepared Successfully!", { id: toastId });

  } catch (err: any) {
    console.error("Export Error:", err);
    toast.error(`System Error: ${err.message}`, { id: toastId });
  }
}