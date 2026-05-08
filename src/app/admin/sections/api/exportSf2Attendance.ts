import { toast } from "sonner";
import * as XLSX from "xlsx";

type StudentLike = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  gender?: string | null;
  section?: string | null;
  strand?: string | null;
};

type AttendanceLike = {
  student_id: string;
  date: string;
  status?: string | null;
  notes?: string | null;
};

type Sf2ExportOptions = {
  sectionName: string;
  students: StudentLike[];
  attendance: AttendanceLike[];
  schoolYear: string;
  teacherName?: string;
  monthDate?: Date;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

const DATE_COLS = [
  "F", "H", "I", "J", "K", "L", "N", "O", "P", "Q", "R", "T", "U", "V", "X", "Z",
  "AB", "AC", "AD", "AE", "AF", "AG", "AI", "AJ", "AK",
];

const WEEKDAY_LABELS = ["S", "M", "T", "W", "TH", "F", "S"];

function cleanFilePart(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || "Section";
}

function formatStudentName(student: StudentLike) {
  const last = (student.last_name || "").trim().toUpperCase();
  const first = (student.first_name || "").trim().toUpperCase();
  const middle = (student.middle_name || "").trim();
  const middleInitial = middle ? ` ${middle.charAt(0).toUpperCase()}.` : "";
  return `${last}, ${first}${middleInitial}`.trim();
}

function inferGradeLevel(sectionName: string, students: StudentLike[]) {
  const haystack = [sectionName, ...students.map(s => s.strand || "")].join(" ");
  const gradeMatch = haystack.match(/\b(?:G|GRADE|GR)\s*(11|12)\b/i) || haystack.match(/\b(11|12)\b/);
  return gradeMatch ? `GRADE ${gradeMatch[1]}` : "";
}

function monthBounds(monthDate = new Date()) {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  return { start, end };
}

function isoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildSchoolDays(monthDate: Date) {
  const { start, end } = monthBounds(monthDate);
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day >= 1 && day <= 6) days.push(new Date(d));
  }
  return days.slice(0, DATE_COLS.length);
}

function statusMark(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase();
  if (!normalized || normalized === "present") return "";
  if (normalized === "absent") return "x";
  if (normalized === "late") return "T";
  if (normalized.includes("cut")) return "T";
  return normalized.charAt(0).toUpperCase();
}

function isAbsent(status?: string | null) {
  return (status || "").trim().toLowerCase() === "absent";
}

function rowForStudent(index: number, gender: "Male" | "Female") {
  return gender === "Male" ? 8 + index : 49 + index;
}

function setCell(sheet: XLSX.WorkSheet, address: string, value: string | number) {
  const existing = sheet[address] || { t: "s" };
  existing.v = value;
  existing.t = typeof value === "number" ? "n" : "s";
  delete existing.f;
  sheet[address] = existing;
}

function fillStudentBlock(sheet: XLSX.WorkSheet, students: StudentLike[], gender: "Male" | "Female", attendanceByStudentDate: Map<string, AttendanceLike>, schoolDays: Date[]) {
  const maxRows = 40;
  const presentByDay = schoolDays.map(() => 0);
  let absentTotal = 0;
  let presentTotal = 0;

  for (let i = 0; i < maxRows; i += 1) {
    const row = rowForStudent(i, gender);
    const student = students[i];
    setCell(sheet, `C${row}`, student ? formatStudentName(student) : "");
    setCell(sheet, `AQ${row}`, "");

    let rowAbsents = 0;

    DATE_COLS.forEach((col, dayIndex) => {
      const day = schoolDays[dayIndex];
      const rec = student && day ? attendanceByStudentDate.get(`${student.id}|${isoDate(day)}`) : undefined;
      if (student && day) {
        if (isAbsent(rec?.status)) {
          rowAbsents += 1;
        } else {
          presentByDay[dayIndex] += 1;
        }
      }
      setCell(sheet, `${col}${row}`, rec ? statusMark(rec.status) : "");
    });

    if (student) {
      const rowPresents = schoolDays.length - rowAbsents;
      absentTotal += rowAbsents;
      presentTotal += rowPresents;
      setCell(sheet, `AM${row}`, rowAbsents);
      setCell(sheet, `AO${row}`, rowPresents);
    } else {
      setCell(sheet, `AM${row}`, "");
      setCell(sheet, `AO${row}`, "");
    }
  }

  return { absentTotal, presentTotal, presentByDay };
}

export async function downloadSf2Attendance({
  sectionName,
  students,
  attendance,
  schoolYear,
  teacherName,
  monthDate = new Date(),
}: Sf2ExportOptions) {
  const toastId = toast.loading("Preparing SF2 attendance form...");

  try {
    const response = await fetch("/DEPED SF2_Month.xls");
    if (!response.ok) throw new Error("Template file 'DEPED SF2_Month.xls' not found.");

    const workbook = XLSX.read(await response.arrayBuffer(), {
      type: "array",
      cellFormula: true,
      cellStyles: true,
    });
    const sheet = workbook.Sheets.COPY || workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error("SF2 worksheet not found.");

    const sorted = [...(students || [])].sort((a, b) =>
      `${a.last_name || ""}, ${a.first_name || ""}`.localeCompare(`${b.last_name || ""}, ${b.first_name || ""}`)
    );
    const males = sorted.filter(s => (s.gender || "").toLowerCase() === "male");
    const females = sorted.filter(s => (s.gender || "").toLowerCase() === "female");
    const schoolDays = buildSchoolDays(monthDate);

    const attendanceByStudentDate = new Map<string, AttendanceLike>();
    for (const rec of attendance || []) {
      if (rec.student_id && rec.date) attendanceByStudentDate.set(`${rec.student_id}|${rec.date}`, rec);
    }

    DATE_COLS.forEach((col, i) => {
      const day = schoolDays[i];
      setCell(sheet, `${col}6`, day ? day.getDate() : "");
      setCell(sheet, `${col}7`, day ? WEEKDAY_LABELS[day.getDay()] : "");
    });

    setCell(sheet, "M3", schoolYear || "");
    setCell(sheet, "AA3", monthDate.toLocaleString("en-US", { month: "long" }).toUpperCase());
    setCell(sheet, "AA4", inferGradeLevel(sectionName, sorted));
    setCell(sheet, "AM4", sectionName ? sectionName.toUpperCase() : "");
    setCell(sheet, "AX3", males.length);
    setCell(sheet, "AX4", females.length);
    setCell(sheet, "AY7", schoolDays.length);
    if (teacherName) setCell(sheet, "AN116", teacherName.toUpperCase());

    const maleStats = fillStudentBlock(sheet, males, "Male", attendanceByStudentDate, schoolDays);
    const femaleStats = fillStudentBlock(sheet, females, "Female", attendanceByStudentDate, schoolDays);

    DATE_COLS.forEach((col, dayIndex) => {
      const malePresent = maleStats.presentByDay[dayIndex] ?? "";
      const femalePresent = femaleStats.presentByDay[dayIndex] ?? "";
      setCell(sheet, `${col}48`, malePresent);
      setCell(sheet, `${col}89`, femalePresent);
      setCell(sheet, `${col}90`, (Number(malePresent) || 0) + (Number(femalePresent) || 0));
    });
    setCell(sheet, "A48", males.length);
    setCell(sheet, "A89", females.length);
    setCell(sheet, "A90", males.length + females.length);
    setCell(sheet, "AM48", maleStats.absentTotal);
    setCell(sheet, "AM89", femaleStats.absentTotal);
    setCell(sheet, "AM90", maleStats.absentTotal + femaleStats.absentTotal);
    setCell(sheet, "AO48", maleStats.presentTotal);
    setCell(sheet, "AO89", femaleStats.presentTotal);
    setCell(sheet, "AO90", maleStats.presentTotal + femaleStats.presentTotal);

    const outBuffer = XLSX.write(workbook, {
      bookType: "xls",
      type: "array",
      cellStyles: true,
    }) as ArrayBuffer;
    const blob = new Blob([outBuffer], { type: "application/vnd.ms-excel" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SF2_Attendance_${cleanFilePart(sectionName)}_${monthDate.toLocaleString("en-US", { month: "long" })}.xls`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success("SF2 attendance form prepared.", { id: toastId });
  } catch (err: unknown) {
    console.error("SF2 Export Error:", err);
    toast.error(`SF2 Export Error: ${errorMessage(err)}`, { id: toastId });
  }
}
