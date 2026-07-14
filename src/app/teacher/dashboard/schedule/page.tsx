// app/teacher/dashboard/schedule/page.tsx
"use client"

import { useMemo } from "react"
import { useDashboard } from "../context"
import { ScheduleTab } from "../components/ScheduleTab"
import { COLORS } from "../types"

export default function SchedulePage() {
  const {
    schedules,
    students,
    studLoad,
    dm,
    setSelectedStudent,
    setSchedules,
    session,
    schoolYear,
    allowTeacherGrading,
    sectionMap,
  } = useDashboard()

  const colorMap = useMemo(() => {
    const unique = [...new Set(schedules.map(s => s.subject))]
    return Object.fromEntries(unique.map((sub, i) => [sub, COLORS[i % COLORS.length]]))
  }, [schedules])

  return (
    <ScheduleTab
      schedules={schedules}
      students={students}
      studLoad={studLoad}
      colorMap={colorMap}
      dm={dm}
      onStudentClick={setSelectedStudent}
      onLinkUpdated={(id, link) => setSchedules(prev => prev.map(s => s.id === id ? { ...s, gclass_link: link } : s))}
      session={session}
      schoolYear={schoolYear}
      allowTeacherGrading={allowTeacherGrading}
      sectionMap={sectionMap}
    />
  )
}
