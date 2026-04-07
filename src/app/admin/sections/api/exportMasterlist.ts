import { toast } from "sonner";

export async function exportSimpleMasterlist(
  title: string,
  students: any[],
  subtitle?: string
) {
  const toastId = toast.loading("Generating Masterlist...");

  try {
    const XlsxPopulate = (window as any).XlsxPopulate;

    if (!XlsxPopulate) {
      throw new Error("Excel Engine not ready. Please refresh the page.");
    }

    const workbook = await XlsxPopulate.fromBlankAsync();
    const sheet = workbook.sheet(0);
    sheet.name("Masterlist");

    // Format: "LASTNAME, FIRSTNAME M."
    const formatName = (s: any) =>
      `${s.last_name?.toUpperCase() || ""}, ${s.first_name?.toUpperCase() || ""} ${
        s.middle_name ? s.middle_name.charAt(0).toUpperCase() + "." : ""
      }`.trim();

    // Sort all students alphabetically
    const sortedStudents = [...students].sort((a, b) => {
      const nameA = formatName(a);
      const nameB = formatName(b);
      return nameA.localeCompare(nameB);
    });

    // Write title
    sheet.cell("A1").value(title.toUpperCase());
    sheet.cell("A1").style("bold", true);
    sheet.cell("A1").style("fontSize", 20);
    sheet.cell("A1").style("horizontalAlignment", "center");
    sheet.cell("A1").style("verticalAlignment", "center");
    
    // Merge cells for title to occupy 2 rows
    sheet.range("A1:C2").merged(true);

    let startRow = 3;

    // Write subtitle if present (like Adviser Name)
    if (subtitle) {
      sheet.cell(`A${startRow}`).value(subtitle);
      sheet.cell(`A${startRow}`).style("bold", true);
      sheet.cell(`A${startRow}`).style("fontSize", 16);
      sheet.cell(`A${startRow}`).style("horizontalAlignment", "center");
      sheet.range(`A${startRow}:C${startRow}`).merged(true);
      startRow++;
    }

    // Set column widths
    sheet.column("A").width(5);
    sheet.column("B").width(50);

    // Write students
    sortedStudents.forEach((student, index) => {
      const row = startRow + index;
      
      // Number
      sheet.cell(`A${row}`).value(index + 1);
      sheet.cell(`A${row}`).style("horizontalAlignment", "center");
      sheet.cell(`A${row}`).style("border", true);
      
      // Name
      sheet.cell(`B${row}`).value(formatName(student));
      sheet.cell(`B${row}`).style("border", true);
    });

    const outBuffer = await workbook.outputAsync();
    const blob = new Blob([outBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Masterlist_${title.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success("Masterlist Downloaded Successfully!", { id: toastId });
  } catch (err: any) {
    console.error("Export Error:", err);
    toast.error(`System Error: ${err.message}`, { id: toastId });
  }
}
