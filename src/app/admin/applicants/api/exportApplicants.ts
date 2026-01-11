// src/app/admin/applicants/api/exportApplicants.ts
import { toast } from "sonner";
import { createClient } from '@supabase/supabase-js';

export async function downloadApplicantsExcel(filter: string) {
  const toastId = toast.loading(`Initializing ${filter} Registry...`);

  try {
    const XlsxPopulate = (window as any).XlsxPopulate;
    if (!XlsxPopulate) throw new Error("Excel Engine not ready. Refresh the page.");

    // 1. Fetch Data
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    toast.loading("Fetching applicants from database...", { id: toastId });
    
    let query = supabase.from('students').select('*').order('last_name', { ascending: true });
    
    if (filter !== 'All') {
      if (filter === 'Accepted') query = query.in('status', ['Accepted', 'Approved']);
      else query = query.eq('status', filter);
    }

    const { data: students, error } = await query;
    if (error) throw error;
    if (!students || students.length === 0) throw new Error("No applicants found.");

    // 2. Sorting Logic
    const sortedStudents = [...students];
    const ictCount = sortedStudents.filter((s: any) => s.strand === 'ICT').length;
    const gasCount = sortedStudents.filter((s: any) => s.strand === 'GAS').length;
    const priorityStrand = ictCount > gasCount ? 'ICT' : 'GAS';

    sortedStudents.sort((a, b) => {
      const aP = a.strand === priorityStrand;
      const bP = b.strand === priorityStrand;
      if (aP && !bP) return -1;
      if (!aP && bP) return 1;
      return (`${a.last_name}, ${a.first_name}`).localeCompare(`${b.last_name}, ${b.first_name}`);
    });

    // 3. Load Template
    const response = await fetch('/MasterList.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = await XlsxPopulate.fromDataAsync(arrayBuffer);
    const sheet = workbook.sheet(0);
    const startRow = 10;

    // 4. Surgical Injection with Progress Update
    const total = sortedStudents.length;
    
    for (let i = 0; i < total; i++) {
      const student = sortedStudents[i];
      const r = startRow + i;
      
      // Update toast every 10 students to keep UI snappy
      if (i % 10 === 0 || i === total - 1) {
        const percent = Math.round(((i + 1) / total) * 100);
        toast.loading(`Injecting Data: ${percent}%`, { id: toastId });
      }

      sheet.cell(`A${r}`).value(i + 1);
      const mName = student.middle_name ? ` ${student.middle_name.charAt(0)}.` : '';
      sheet.cell(`B${r}`).value(`${student.last_name}, ${student.first_name}${mName}`.toUpperCase());
      sheet.cell(`C${r}`).value(student.lrn || '');
      sheet.cell(`D${r}`).value(student.section || 'Unassigned');
      sheet.cell(`E${r}`).value(student.gender || '');
      
      const contact = [student.phone, student.guardian_phone].filter(Boolean).join(' / ');
      sheet.cell(`F${r}`).value(contact);
      
      let gName = student.guardian_name || '';
      if (student.guardian_last_name) gName = `${student.guardian_first_name} ${student.guardian_last_name}`;
      sheet.cell(`G${r}`).value(gName.toUpperCase().trim());
      
      sheet.cell(`H${r}`).value(student.birth_date || '');
      
      const statusCell = sheet.cell(`I${r}`);
      const status = student.status === 'Approved' ? 'Accepted' : student.status;
      statusCell.value(status);
      
      // Styling
      if (status === 'Accepted' || status === 'Approved') statusCell.style("fill", "E2EFDA");
      else if (status === 'Rejected') statusCell.style("fill", "FFC7CE");
      else if (status === 'Pending') statusCell.style("fill", "FFEB9C");
    }

    // 5. Finalize
    toast.loading("Finalizing Excel formulas...", { id: toastId });
    const outBuffer = await workbook.outputAsync();
    const blob = new Blob([outBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Applicants_${filter}_MasterList.xlsx`;
    document.body.appendChild(a);
    a.click();
    
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success("Kaboom! List Exported Successfully.", { id: toastId });

  } catch (err: any) {
    console.error(err);
    toast.error(err.message || "Export failed", { id: toastId });
  }
}