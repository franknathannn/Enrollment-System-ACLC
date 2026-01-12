import { toast } from "sonner";
import { createClient } from '@supabase/supabase-js';

export async function downloadEnrolledExcel(strandFilter: string = "ALL", categoryFilter: string = "ALL") {
  const toastId = toast.loading("Initializing Enrolled Registry...");

  try {
    const XlsxPopulate = (window as any).XlsxPopulate;
    if (!XlsxPopulate) throw new Error("Excel Engine not ready. Refresh the page.");

    // 1. Fetch Data
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    toast.loading("Fetching enrolled students...", { id: toastId });
    
    // Only Approved students
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .eq('status', 'Approved')
      .order('last_name', { ascending: true });

    if (error) throw error;
    if (!students || students.length === 0) {
      console.log("No enrolled students found.");
      toast.info("No enrolled students found to export.", { id: toastId });
      return;
    }

    // 2. Filtering Logic
    const filteredStudents = students.filter(student => {
      // Strand Logic
      const matchesStrand = strandFilter === "ALL" || student.strand === strandFilter;

      // Category Logic
      let matchesCategory = true;
      if (categoryFilter !== "ALL") {
        const cat = (student.student_category || "").toLowerCase();
        if (categoryFilter === "JHS") {
          matchesCategory = cat.includes("jhs") || cat.includes("graduate") || cat.includes("standard");
        } else if (categoryFilter === "ALS") {
          matchesCategory = cat.includes("als");
        }
      }

      return matchesStrand && matchesCategory;
    });

    // 3. Sorting Logic
    const sortedStudents = [...filteredStudents];
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

    // 4. Load Template
    const response = await fetch('/Enrolled_MasterList.xlsx');
    if (!response.ok) throw new Error("Template file 'Enrolled_MasterList.xlsx' not found.");
    const arrayBuffer = await response.arrayBuffer();
    const workbook = await XlsxPopulate.fromDataAsync(arrayBuffer);
    const sheet = workbook.sheet(0);
    if (!sheet) throw new Error("Sheet not found in template.");
    const startRow = 10;

    // 5. Surgical Injection
    const total = sortedStudents.length;
    
    for (let i = 0; i < total; i++) {
      const student = sortedStudents[i];
      if (!student) continue;
      const r = startRow + i;
      
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
      statusCell.value('Approved / Enrolled');
      statusCell.style("fill", "E2EFDA"); // Green highlight
    }

    // 6. Finalize
    toast.loading("Finalizing Excel formulas...", { id: toastId });
    const outBuffer = await workbook.outputAsync();
    const blob = new Blob([outBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Enrolled_MasterList_${strandFilter}_${categoryFilter}.xlsx`;
    document.body.appendChild(a);
    a.click();
    
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success("Enrolled List Exported Successfully.", { id: toastId });

  } catch (err: any) {
    console.error(err);
    toast.error(err.message || "Export failed", { id: toastId });
  }
}
