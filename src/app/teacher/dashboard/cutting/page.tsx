// app/teacher/dashboard/cutting/page.tsx
"use client"

import { useDashboard } from "../context"
import { CuttingClassDetector } from "../components/CuttingClassDetector"

export default function CuttingPage() {
  const { schedules, students, dm, session, schoolYear, advisorySections } = useDashboard()

  if (!session) return null

  return (
    <CuttingClassDetector
      schedules={schedules}
      students={students}
      dm={dm}
      session={session}
      schoolYear={schoolYear}
      advisorySections={advisorySections}
    />
  )
}
