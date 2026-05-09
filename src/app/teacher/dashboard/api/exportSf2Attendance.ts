// teacher/dashboard/api/exportSf2Attendance.ts
//
// Client-side helper — calls POST /api/exportSf2Attendance (route.ts),
// which fills Automated_School_Form.xlsx server-side and streams it back.

import { toast } from "sonner"

export type Sf2AttendanceRecord = {
    student_id: string
    date: string              // "YYYY-MM-DD"
    status: string            // "Present" | "Late" | "Absent" | "Excused"
    subject: string
}

export type Sf2CalendarEvent = {
    event_date: string          // "YYYY-MM-DD"
    title: string
    event_type: string          // "holiday" | "suspension" | etc.
}

export type Sf2ExportOptions = {
    sectionName: string
    schoolYear: string        // start year only, e.g. "2025" for SY 2025-2026
    gradeLevel?: string        // "11" or "12" — read directly from student DB record
    teacherName?: string
    principal?: string
    hasSaturday?: boolean       // derived from schedule — true = keep SAT columns visible
    currentMonth: number        // 0-indexed JS month (0=Jan..11=Dec) — fill sheets JUN→this month
    students: {
        id: string
        last_name: string
        first_name: string
        middle_name?: string | null
        gender: string      // "Male" | "Female"
    }[]
    attendance: Sf2AttendanceRecord[]   // all records from JUN of school year through currentMonth
    calendarEvents?: Sf2CalendarEvent[] // holidays & suspensions for the Holidays sheet
}

function cleanFileName(v: string) {
    return v.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || "Section"
}

export async function downloadSf2Attendance({
    sectionName,
    schoolYear,
    gradeLevel = "",
    teacherName = "",
    principal = "",
    hasSaturday = false,
    currentMonth = new Date().getMonth(),
    students = [],
    attendance = [],
    calendarEvents = [],
}: Sf2ExportOptions) {
    const toastId = toast.loading("Preparing SF2 Attendance Form…")

    try {
        const res = await fetch("/api/exportSf2Attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sectionName,
                schoolYear,
                gradeLevel,
                teacherName,
                principal,
                hasSaturday,
                currentMonth,
                students,
                attendance,
                calendarEvents,
            }),
        })

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "Unknown server error" }))
            throw new Error(err.error ?? `Server responded with ${res.status}`)
        }

        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `SF2_${cleanFileName(sectionName)}_SY${schoolYear}.xlsx`
        document.body.appendChild(a)
        a.click()
        URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast.success(`SF2 downloaded — ${sectionName} SY ${schoolYear}`, { id: toastId })
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        console.error("[SF2 Export]", err)
        toast.error(`SF2 Export failed: ${msg}`, { id: toastId })
    }
}