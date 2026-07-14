// app/teacher/dashboard/calendar/page.tsx
"use client"

import { useDashboard } from "../context"
import { AcademicCalendarTab } from "../components/AcademicCalendarTab"

export default function CalendarPage() {
  const { dm, schoolYear } = useDashboard()

  return (
    <AcademicCalendarTab dm={dm} schoolYear={schoolYear} />
  )
}
