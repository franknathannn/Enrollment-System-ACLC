// app/teacher/dashboard/attendance/page.tsx
"use client"

import { useDashboard } from "../context"
import { AttendanceTab } from "../components/AttendanceTab"

export default function AttendancePage() {
  const { schedules, students, dm, session, schoolYear, advisorySections } = useDashboard()

  if (!session) return null

  return (
    <AttendanceTab
      schedules={schedules}
      students={students}
      dm={dm}
      session={session}
      schoolYear={schoolYear}
      advisorySections={advisorySections}
    />
  )
}
