// app/teacher/dashboard/gradebook/page.tsx
"use client"

import { useDashboard } from "../context"
import { GradebookTab } from "../components/GradebookTab"

export default function GradebookPage() {
  const { dm, session, schedules, advisorySections, schoolYear } = useDashboard()

  if (!session) return null

  return (
    <GradebookTab
      dm={dm}
      session={session}
      schedules={schedules}
      advisorySections={advisorySections}
      schoolYear={schoolYear}
    />
  )
}
