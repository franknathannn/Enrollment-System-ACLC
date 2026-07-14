// app/teacher/dashboard/quarterly/page.tsx
"use client"

import { useDashboard } from "../context"
import { QuarterlyUpdateTab } from "../components/QuarterlyUpdateTab"

export default function QuarterlyPage() {
  const { dm, session } = useDashboard()

  if (!session) return null

  return (
    <QuarterlyUpdateTab dm={dm} session={session} />
  )
}
