// app/teacher/dashboard/page.tsx
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function TeacherDashboardIndex() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace("/teacher/dashboard/schedule")
  }, [router])

  return null
}