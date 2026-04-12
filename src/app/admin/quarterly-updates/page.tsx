"use client"

import { useState, useEffect } from "react"
import { useTheme } from "@/hooks/useTheme"
import { QuarterlyUpdatesAdminTab } from "../teachers/components/QuarterlyUpdatesAdminTab"
import { supabase } from "@/lib/supabase/admin-client"

export default function QuarterlyUpdatesPage() {
  const { isDarkMode: dm, mounted } = useTheme()
  const [schoolYear, setSchoolYear] = useState("2025-2026")

  useEffect(() => {
    supabase.from("system_config").select("school_year").single()
      .then(({ data }) => { if (data?.school_year) setSchoolYear(data.school_year) })
  }, [])

  if (!mounted) return null

  const page = dm ? "bg-slate-950" : "bg-slate-50"

  return (
    <div className={`min-h-screen transition-colors duration-500 ${page}`}>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 pb-20">
        <QuarterlyUpdatesAdminTab isDarkMode={dm} schoolYear={schoolYear} />
      </div>
    </div>
  )
}
