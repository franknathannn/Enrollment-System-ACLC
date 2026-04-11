// app/portal/[id]/page.tsx
"use client"

import { useEffect, useState, use } from "react"
import { supabase } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import DownloadHub from "./DownloadHub"

interface StudentData {
  id: string
  first_name: string
  last_name: string
  lrn: string
  section: string | null
  strand: string | null
  school_year: string | null
}

export default function DownloadPortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [student, setStudent] = useState<StudentData | null>(null)
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: s } = await supabase
        .from("students")
        .select("id, first_name, last_name, lrn, section, strand, school_year")
        .eq("id", id)
        .single()

      if (!s) { setError(true); setLoading(false); return }
      setStudent(s as StudentData)

      if (s.section) {
        const { data: scheds } = await supabase
          .from("schedules")
          .select("*")
          .eq("section", s.section)
          .eq("school_year", s.school_year || "2025-2026")
        if (scheds) setSchedules(scheds)
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Loading your downloads…</p>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <p className="text-xl font-black text-slate-300 uppercase tracking-widest">Student Not Found</p>
        <p className="text-sm text-slate-400">The download link may have expired or is invalid.</p>
      </div>
    )
  }

  const studentName = `${student.last_name || ""}, ${student.first_name || ""}`.trim()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 pt-12 relative overflow-x-hidden"
      style={{ fontFamily: "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif" }}>

      <div className="w-full max-w-xl space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 relative z-10">

        {/* Header */}
        <div className="text-center space-y-3 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-aclc.png" alt="ACLC" className="w-16 h-16 mx-auto object-contain" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Download Hub</h1>
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.3em]">
            AMA ACLC Northbay · Student Portal
          </p>
          <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full px-5 py-2 mt-2">
            <p className="text-xs font-black text-slate-600 uppercase tracking-wide">
              {studentName} · {student.lrn || "N/A"}
            </p>
          </div>
        </div>

        <DownloadHub
          studentId={student.id}
          studentName={studentName}
          section={student.section || ""}
          lrn={student.lrn || ""}
          strand={student.strand || ""}
          schedules={schedules}
        />

        {/* Footer */}
        <div className="text-center pt-6 pb-8">
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em]">
            &copy; {new Date().getFullYear()} AMA ACLC Northbay Campus
          </p>
        </div>
      </div>
    </div>
  )
}
