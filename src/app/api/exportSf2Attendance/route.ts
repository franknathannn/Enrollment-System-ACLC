// app/api/exportSf2Attendance/route.ts
//
// Next.js App Router — Vercel serverless compatible (Node.js runtime).
//
// Reads  /public/Automated_School_Form.xlsx, fills the Names sheet
// via XML-level zip manipulation (preserves ALL formatting, borders,
// conditional formatting — no corruption), then streams the file back.
//
// POST body (JSON):
// {
//   sectionName:  "ICT-12A",
//   schoolYear:   "2025",        // the START year  (SY 2025-2026)
//   teacherName:  "JUAN DELA CRUZ",
//   principal?:   "MARIA SANTOS",
//   hasSaturday?: boolean,        // false (default) = hide SAT columns
//   currentMonth: number,         // 0-indexed JS month to fill up to
//   students: [
//     { id, last_name, first_name, middle_name?, gender }  // gender "Male"|"Female"
//   ],
//   attendance: [
//     { student_id, date, status, subject }
//   ]
// }
//
// How the template works:
//   - Names sheet Q4  → School ID      (read by every SF2 sheet via formula)
//   - Names sheet Q5  → School Year
//   - Names sheet Q6  → Grade Level
//   - Names sheet Q7  → Section
//   - Names sheet Q8  → Name of School
//   - Names sheet Q9  → Grade and Section
//   - Names sheet Q10 → Teacher-in-Charge
//   - Names sheet Q11 → School Head / Principal
//   - Names sheet B5:B44 → Male student names   (SF2 pulls via formula)
//   - Names sheet G5:G44 → Female student names
//
// SF2 monthly sheet layout (each sheet3–sheet13):
//   - Row 11:  date numbers (formulas)
//   - Row 12:  weekday labels (S, M, T, W, TH, F, SAT)
//   - Rows 13–52:  male students (40 slots → Names!B5:B44)
//   - Row 53:  male total
//   - Rows 54–93:  female students (40 slots → Names!G5:G44)
//   - Row 94:  female total
//   - Row 95:  combined total
//
// Day columns per week (7 cols each, 6 weeks):
//   Week 1: D(Sun) E(Mon) F(Tue) G(Wed) H(Thu) I(Fri) J(Sat)
//   Week 2: K(Sun) L(Mon) M(Tue) N(Wed) O(Thu) P(Fri) Q(Sat)
//   Week 3: R(Sun) S(Mon) T(Tue) U(Wed) V(Thu) W(Fri) X(Sat)
//   Week 4: Y(Sun) Z(Mon) AA(Tue) AB(Wed) AC(Thu) AD(Fri) AE(Sat)
//   Week 5: AF(Sun) AG(Mon) AH(Tue) AI(Wed) AJ(Thu) AK(Fri) AL(Sat)
//   Week 6: AM(Sun) AN(Mon)
//
// Saturday columns (1-based): 10, 17, 24, 31, 38
// Sunday  columns (always hidden): 4, 11, 18, 25, 32, 39

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import JSZip from "jszip";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StudentInput {
    id: string;
    last_name: string;
    first_name: string;
    middle_name?: string | null;
    gender: string;
}

interface AttendanceInput {
    student_id: string;
    date: string;       // "YYYY-MM-DD"
    status: string;     // "Present" | "Late" | "Absent" | "Excused"
    subject: string;
}

interface ExportBody {
    sectionName: string;
    schoolYear: string;
    teacherName: string;
    principal?: string;
    gradeLevel?: string;   // "11" or "12" passed directly from DB
    hasSaturday?: boolean;
    currentMonth?: number; // 0-indexed JS month (0=Jan..11=Dec)
    students: StudentInput[];
    attendance?: AttendanceInput[];
    calendarEvents?: {
        event_date: string;
        title: string;
        event_type: string;
    }[];
}

// ─── XML Helpers ─────────────────────────────────────────────────────────────

function escapeXml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function formatName(s: StudentInput): string {
    const last = (s.last_name ?? "").trim().toUpperCase();
    const first = (s.first_name ?? "").trim().toUpperCase();
    const mid = (s.middle_name ?? "").trim();
    const mi = mid ? ` ${mid.charAt(0).toUpperCase()}.` : "";
    return `${last}, ${first}${mi}`;
}

function inferGrade(sectionName: string): string {
    const m = sectionName.match(/\b(11|12)\b/);
    return m ? m[1] : "";
}

/**
 * Replace a self-closing empty cell  <c r="REF" s="NNN" t="n" />
 * with an inlineStr cell carrying the given value, keeping its style.
 *
 * If value is empty string the cell is left as a clean self-closer (no type).
 *
 * Validated against every cell form found in Automated_School_Form.xlsx.
 */
function setCell(xml: string, ref: string, value: string): string {
    // Matches:  <c r="REF"   ...any attrs...   />
    const pattern = new RegExp(
        `<c r="${ref}"((?:\\s+[^>]*?)?)\\s*/>`,
        "g"
    );

    return xml.replace(pattern, (_, attrs) => {
        // Strip existing t="..." so we can set our own
        const cleanAttrs = attrs.replace(/\s+t="[^"]*"/g, "");
        if (!value) {
            return `<c r="${ref}"${cleanAttrs}/>`;
        }
        return `<c r="${ref}"${cleanAttrs} t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
    });
}

/**
 * Replace a cell that might already have content (like dummy data in the Holidays sheet).
 * It handles both self-closing <c ... /> and open-close <c ...>...</c>.
 */
function setCellOverride(xml: string, ref: string, value: string): string {
    const emptyPattern = new RegExp(`<c r="${ref}"((?:\\s+[^>]*?)?)\\s*/>`, "g");
    const fullPattern = new RegExp(`<c r="${ref}"((?:\\s+[^>]*?)?)>[\\s\\S]*?</c>`, "g");

    let result = xml;
    let replaced = false;

    // Try empty pattern first (self-closing tag)
    result = result.replace(emptyPattern, (_, attrs) => {
        replaced = true;
        const cleanAttrs = attrs.replace(/\s+t="[^"]*"/g, "");
        if (!value) return `<c r="${ref}"${cleanAttrs}/>`;
        return `<c r="${ref}"${cleanAttrs} t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
    });

    if (!replaced) {
        // Try full pattern (tag with content)
        result = result.replace(fullPattern, (_, attrs) => {
            const cleanAttrs = attrs.replace(/\s+t="[^"]*"/g, "");
            if (!value) return `<c r="${ref}"${cleanAttrs}/>`;
            return `<c r="${ref}"${cleanAttrs} t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
        });
    }

    return result;
}

/**
 * Apply multiple cell updates at once.
 */
function setCells(xml: string, updates: Record<string, string>): string {
    let result = xml;
    for (const [ref, value] of Object.entries(updates)) {
        result = setCell(result, ref, value);
    }
    return result;
}

/**
 * Hide or un-hide Saturday columns in one SF2 monthly sheet.
 *
 * The template stores each SAT column as its own <col> element with
 * min="N" max="N" (N = 10, 17, 24, 31, 38).  We toggle hidden="1".
 *
 * Validated: correct toggle confirmed on real sheet3.xml.
 */
function toggleSaturday(xml: string, hide: boolean): string {
    const SAT_COLS = [10, 17, 24, 31, 38];
    let result = xml;

    for (const col of SAT_COLS) {
        // Capture: <col ...before... min="N" max="N" ...after... />
        const pat = new RegExp(
            `(<col\\b(?:[^>]*?))(\\bmin="${col}"\\s+max="${col}")([^/]*?)\\s*/>`,
            "g"
        );
        result = result.replace(pat, (_, before, minMax, after) => {
            const b = before.replace(/\s*hidden="[^"]*"/g, "");
            const a = after.replace(/\s*hidden="[^"]*"/g, "");
            const h = hide ? ' hidden="1"' : "";
            return `${b} ${minMax}${a}${h}/>`;
        });
    }

    return result;
}

// ─── Attendance Helpers ──────────────────────────────────────────────────────

/**
 * Weekly column layout for the SF2 sheet.
 * Each sub-array is [Sun, Mon, Tue, Wed, Thu, Fri, Sat].
 * Week 6 only has Sunday and Monday slots (max days in any month's 6th week).
 */
const WEEK_COLS: (string | null)[][] = [
    ["D", "E", "F", "G", "H", "I", "J"],           // Week 1
    ["K", "L", "M", "N", "O", "P", "Q"],           // Week 2
    ["R", "S", "T", "U", "V", "W", "X"],           // Week 3
    ["Y", "Z", "AA", "AB", "AC", "AD", "AE"],      // Week 4
    ["AF", "AG", "AH", "AI", "AJ", "AK", "AL"],    // Week 5
    ["AM", "AN", null, null, null, null, null],      // Week 6
];

/**
 * Map month number (1=Jan .. 12=Dec) to the SF2 sheet file index.
 * School year runs JUN→APR:
 *   JUN=sheet3, JUL=sheet4, AUG=sheet5, SEP=sheet6, OCT=sheet7,
 *   NOV=sheet8, DEC=sheet9, JAN=sheet10, FEB=sheet11, MAR=sheet12, APR=sheet13
 */
function monthToSheetFile(monthOneBased: number): string | null {
    const map: Record<number, number> = {
        6: 3, 7: 4, 8: 5, 9: 6, 10: 7,
        11: 8, 12: 9, 1: 10, 2: 11, 3: 12, 4: 13,
    };
    const n = map[monthOneBased];
    return n ? `xl/worksheets/sheet${n}.xml` : null;
}

/**
 * Get the SF2 column letter(s) for a given day-of-month.
 *
 * @param dayOfMonth 1-based day (1–31)
 * @param firstDow   day-of-week of the 1st of the month (0=Sun, 1=Mon, ..., 6=Sat)
 * @returns column letter(s) or null if the day falls outside the template grid
 */
function dateToColumn(dayOfMonth: number, firstDow: number): string | null {
    // Offset from the start of the grid (column D = first Sunday of the week
    // containing day 1).  gridOffset tells us which position in the 42-slot
    // grid (6 weeks × 7 days) this day-of-month falls in.
    const gridOffset = firstDow + (dayOfMonth - 1);
    const weekIndex = Math.floor(gridOffset / 7);
    const dowIndex = gridOffset % 7; // 0=Sun, 1=Mon, ..., 6=Sat

    if (weekIndex >= WEEK_COLS.length) return null;
    return WEEK_COLS[weekIndex][dowIndex] ?? null;
}

/**
 * Resolve a student's daily attendance status from multiple subject records.
 *
 * Rules (majority wins, positives break ties):
 *   - Count present, late, absent+excused across all subjects
 *   - Strict majority → that status
 *   - Ties: Late > Present > Absent
 *
 * @returns "" (present), "T" (tardy), "x" (absent)
 */
function resolveDailyStatus(records: { status: string }[]): string {
    if (records.length === 0) return "";

    let present = 0;
    let late = 0;
    let absent = 0;

    for (const r of records) {
        const s = (r.status || "").trim().toLowerCase();
        if (s === "present") present++;
        else if (s === "late") late++;
        else if (s === "absent" || s === "excused") absent++;
        else present++; // unknown → treat as present
    }

    const max = Math.max(present, late, absent);

    // Strict majority
    if (late === max && late > present && late > absent) return "T";
    if (absent === max && absent > present && absent > late) return "x";
    if (present === max && present > late && present > absent) return "";

    // Tied — Late wins if it's one of the maxima, then Present, then Absent
    if (late === max) return "T";
    if (present === max) return "";
    return "x";
}

/**
 * Iterate the months from startMonth through endMonth in school-year order
 * (JUN, JUL, AUG, SEP, OCT, NOV, DEC, JAN, FEB, MAR, APR).
 *
 * @param startYear   the school year start (e.g. 2025 for SY 2025-2026)
 * @param endMonth    0-indexed JS month to stop at (inclusive)
 * @returns array of { year, month } where month is 1-based (1=Jan..12=Dec)
 */
function schoolYearMonths(startYear: number, endMonth: number): { year: number; month: number }[] {
    // School year months in order: Jun(6)..Dec(12) of startYear, then Jan(1)..Apr(4) of startYear+1
    const SY_ORDER = [6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4];
    const result: { year: number; month: number }[] = [];

    for (const m of SY_ORDER) {
        const y = m >= 6 ? startYear : startYear + 1;
        result.push({ year: y, month: m });

        // endMonth is 0-indexed JS month, so convert: JS 0=Jan → 1-based 1=Jan
        const endM1 = endMonth + 1;
        const endY = endM1 >= 6 ? startYear : startYear + 1;
        if (y === endY && m === endM1) break;
    }

    return result;
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const body: ExportBody = await req.json();
        const {
            sectionName,
            schoolYear,
            teacherName,
            gradeLevel = "",
            principal = "",
            hasSaturday = false,
            currentMonth = new Date().getMonth(),
            students = [],
            attendance = [],
        } = body;

        if (!sectionName || !schoolYear || !teacherName) {
            return NextResponse.json(
                { error: "sectionName, schoolYear, and teacherName are required." },
                { status: 400 }
            );
        }

        // 1 ── Load template
        const templatePath = path.join(
            process.cwd(), "public", "Automated_School_Form.xlsx"
        );
        const templateBuffer = await readFile(templatePath);
        const zip = await JSZip.loadAsync(templateBuffer);

        // 2 ── Sort & split students
        const sorted = [...students].sort((a, b) =>
            `${a.last_name},${a.first_name}`.localeCompare(
                `${b.last_name},${b.first_name}`
            )
        );
        const males = sorted.filter(s => s.gender.toLowerCase() === "male");
        const females = sorted.filter(s => s.gender.toLowerCase() === "female");

        // 3 ── Build Names sheet updates
        const updates: Record<string, string> = {
            Q4: "401144",                           // School ID (static)
            Q5: schoolYear,                         // School Year (start year)
            Q6: gradeLevel || inferGrade(sectionName), // Grade Level (from DB, fallback to section name)
            Q7: sectionName.toUpperCase(),          // Section
            Q8: "ACLC NORTHBAY CAMPUS",            // Name of School (static)
            Q9: sectionName.toUpperCase(),          // Grade and Section
            Q10: teacherName.toUpperCase(),          // Teacher-in-Charge
            Q11: principal ? principal.toUpperCase() : "",
        };

        // Male names  → B5:B44
        // Female names → G5:G44
        for (let i = 0; i < 40; i++) {
            updates[`B${i + 5}`] = males[i] ? formatName(males[i]) : "";
            updates[`G${i + 5}`] = females[i] ? formatName(females[i]) : "";
        }

        // 4 ── Patch Names sheet (sheet1.xml)
        const namesFile = zip.file("xl/worksheets/sheet1.xml");
        if (!namesFile) throw new Error("Names sheet not found in template.");
        const namesXml = await namesFile.async("string");
        zip.file("xl/worksheets/sheet1.xml", setCells(namesXml, updates));

        // 5 ── Toggle Saturday columns in all 11 SF2 monthly sheets (sheet3–sheet13)
        //       sheet3=JUN, 4=JUL, 5=AUG, 6=SEP, 7=OCT, 8=NOV, 9=DEC,
        //       10=JAN, 11=FEB, 12=MAR, 13=APR
        const hideSat = !hasSaturday;
        for (let n = 3; n <= 13; n++) {
            const filePath = `xl/worksheets/sheet${n}.xml`;
            const file = zip.file(filePath);
            if (!file) continue;
            const xml = await file.async("string");
            zip.file(filePath, toggleSaturday(xml, hideSat));
        }

        // 5.5 ── Fill Holidays sheet (sheet2) with calendar events ─────────────────
        const calendarEvents = body.calendarEvents || [];
        // Only include holiday and suspension events
        const validEvents = calendarEvents.filter(e => 
            e.event_type === "holiday" || e.event_type === "suspension"
        );
        
        if (validEvents.length > 0) {
            const holidaysFile = zip.file("xl/worksheets/sheet2.xml");
            if (holidaysFile) {
                let hXml = await holidaysFile.async("string");
                const hUpdates: Record<string, string> = {};
                
                // Keep track of the row to write to. Rows 33-55 are available (6-32 have existing holidays).
                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                
                let rowIndex = 33;
                for (const ev of validEvents) {
                    if (rowIndex > 55) break; // Template only has 50 slots
                    
                    const parts = ev.event_date.split("-");
                    if (parts.length < 3) continue;
                    
                    const mName = monthNames[parseInt(parts[1], 10) - 1];
                    const dayNum = parseInt(parts[2], 10);
                    
                    // Column B = Month name, Column C = Day number, Column D = Title
                    hUpdates[`B${rowIndex}`] = String(mName);
                    hUpdates[`C${rowIndex}`] = String(dayNum);
                    hUpdates[`D${rowIndex}`] = String(ev.title);
                    
                    rowIndex++;
                }
                
                // Apply to Holidays sheet using setCellOverride
                for (const [ref, value] of Object.entries(hUpdates)) {
                    hXml = setCellOverride(hXml, ref, value);
                }
                
                zip.file("xl/worksheets/sheet2.xml", hXml);
            }
        }

        // 6 ── Fill attendance marks into SF2 monthly sheets ──────────────────
        if (attendance.length > 0) {
            // Build student-id → sorted index for males and females
            const maleIndex = new Map<string, number>();
            males.forEach((s, i) => maleIndex.set(s.id, i));
            const femaleIndex = new Map<string, number>();
            females.forEach((s, i) => femaleIndex.set(s.id, i));

            // Group attendance: "studentId|date" → records[]
            const byStudentDate = new Map<string, { status: string }[]>();
            for (const rec of attendance) {
                const key = `${rec.student_id}|${rec.date}`;
                if (!byStudentDate.has(key)) byStudentDate.set(key, []);
                byStudentDate.get(key)!.push({ status: rec.status });
            }

            // Iterate school-year months from JUN through currentMonth
            const syStart = parseInt(schoolYear, 10);
            const months = schoolYearMonths(syStart, currentMonth);

            for (const { year, month } of months) {
                const sheetPath = monthToSheetFile(month);
                if (!sheetPath) continue;

                const file = zip.file(sheetPath);
                if (!file) continue;
                let xml = await file.async("string");

                // Compute date-to-column mapping for this month
                const firstDay = new Date(year, month - 1, 1); // month is 1-based
                const firstDow = firstDay.getDay(); // 0=Sun
                const daysInMonth = new Date(year, month, 0).getDate();

                // Build cell updates for this month
                const cellUpdates: Record<string, string> = {};

                for (let day = 1; day <= daysInMonth; day++) {
                    const col = dateToColumn(day, firstDow);
                    if (!col) continue;

                    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                    // Fill male rows (13–52)
                    for (const [studentId, idx] of maleIndex) {
                        const key = `${studentId}|${dateStr}`;
                        const records = byStudentDate.get(key);
                        const mark = records ? resolveDailyStatus(records) : "";
                        const row = 13 + idx;
                        cellUpdates[`${col}${row}`] = mark;
                    }

                    // Fill female rows (54–93)
                    for (const [studentId, idx] of femaleIndex) {
                        const key = `${studentId}|${dateStr}`;
                        const records = byStudentDate.get(key);
                        const mark = records ? resolveDailyStatus(records) : "";
                        const row = 54 + idx;
                        cellUpdates[`${col}${row}`] = mark;
                    }
                }

                // Apply all cell updates to this sheet
                xml = setCells(xml, cellUpdates);
                zip.file(sheetPath, xml);
            }
        }

        // 7 ── Re-pack and return
        const output = await zip.generateAsync({
            type: "nodebuffer",
            compression: "DEFLATE",
            compressionOptions: { level: 6 },
        });

        const safeName = sectionName.replace(/[^a-z0-9_-]/gi, "_");
        const nextYear = parseInt(schoolYear, 10) + 1;
        const filename = `SF2_${safeName}_SY${schoolYear}-${nextYear}.xlsx`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new NextResponse(output as any, {
            status: 200,
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": String(output.length),
            },
        });
    } catch (err) {
        console.error("[exportSf2Attendance]", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        );
    }
}