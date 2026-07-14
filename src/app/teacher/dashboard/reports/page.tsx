// app/teacher/dashboard/reports/page.tsx
"use client"

import { useDashboard } from "../context"
import { ReportsTab } from "../components/ReportsTab"

export default function ReportsPage() {
  const { schedules, students, dm, session, schoolYear, advisorySections } = useDashboard()

  if (!session) return null

  return (
    <ReportsTab
      schedules={schedules}
      students={students}
      dm={dm}
      session={session}
      schoolYear={schoolYear}
      advisorySections={advisorySections}
    />
  )
}
