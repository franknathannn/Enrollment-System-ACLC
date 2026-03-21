// src/app/teacher/dashboard/components/ReportsTab.tsx
// Attendance analytics: per-section/subject % , avg absents, top absentees for counselling
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  BarChart2, Users, TrendingDown, AlertCircle, Loader2,
  ChevronDown, ChevronUp, BookOpen, Star,
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { TeacherSession, ScheduleRow, Student, fmt } from "../types"

interface Props {
  schedules: ScheduleRow[]
  students: Student[]
  dm: boolean
  session: TeacherSession
  schoolYear: string
}

interface AttRow {
  student_id: string
  subject: string
  date: string
  status: string
}

interface SectionReport {
  section: string
  subjects: SubjectReport[]
  totalStudents: number
  avgAbsents: number
  avgPresents: number
  attendancePct: number
}

interface SubjectReport {
  subject: string
  scheduledDays: number
  totalSessions: number
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  attendancePct: number
}

interface StudentAbsence {
  student: Student
  totalAbsents: number
  absentBySubject: Record<string, number>
  needsCounseling: boolean
}

const COUNSELING_THRESHOLD = 3 // absences in any single subject

export function ReportsTab({ schedules, students, dm, session, schoolYear }: Props) {
  const [attData, setAttData]   = useState<AttRow[]>([])
  const [loading, setLoading]   = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [activeSection, setActiveSection] = useState<string>("ALL")

  const card  = dm ? "bg-slate-900/60 border-slate-700/50" : "bg-white border-slate-200"
  const card2 = dm ? "bg-slate-800/40 border-slate-700/40" : "bg-slate-50 border-slate-200"
  const sub   = dm ? "text-slate-400" : "text-slate-500"
  const head  = dm ? "text-white" : "text-slate-900"
  const divB  = dm ? "border-slate-700/40" : "border-slate-100"

  const mySections = useMemo(
    () => [...new Set(schedules.map(s => s.section))].filter(Boolean),
    [schedules]
  )

  // ── Load all attendance for my sections ────────────────────────────────────
  const load = useCallback(async () => {
    const myStudentIds = students.map(s => s.id)
    if (!myStudentIds.length) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from("attendance").select("student_id, subject, date, status")
        .in("student_id", myStudentIds)
        .eq("school_year", schoolYear)
      setAttData(data || [])
    } finally {
      setLoading(false)
    }
  }, [students, schoolYear])

  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("reports_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  // ── Build reports ──────────────────────────────────────────────────────────
  const sectionReports: SectionReport[] = useMemo(() => {
    return mySections.map(section => {
      const sectionStudents = students.filter(s => s.section === section)
      const sectionSchedules = schedules.filter(s => s.section === section)
      const uniqueSubjects = [...new Set(sectionSchedules.map(s => s.subject))]

      // Count distinct dates with records per subject
      const subjectReports: SubjectReport[] = uniqueSubjects.map(subject => {
        const recs = attData.filter(r =>
          sectionStudents.some(s => s.id === r.student_id) && r.subject === subject
        )
        const distinctDates = [...new Set(recs.map(r => r.date))].length
        const presentCount = recs.filter(r => r.status === "Present" || r.status === "Late").length
        const absentCount  = recs.filter(r => r.status === "Absent").length
        const lateCount    = recs.filter(r => r.status === "Late").length
        const excusedCount = recs.filter(r => r.status === "Excused").length
        const totalExpected = distinctDates * sectionStudents.length
        const pct = totalExpected > 0 ? Math.round((presentCount / totalExpected) * 100) : 0
        return {
          subject, scheduledDays: distinctDates,
          totalSessions: totalExpected, presentCount, absentCount, lateCount, excusedCount,
          attendancePct: pct,
        }
      })

      const totalAbsents  = subjectReports.reduce((a, s) => a + s.absentCount, 0)
      const totalPresents = subjectReports.reduce((a, s) => a + s.presentCount, 0)
      const totalExpected = subjectReports.reduce((a, s) => a + s.totalSessions, 0)
      const avgAbsents    = sectionStudents.length > 0
        ? Math.round(totalAbsents / sectionStudents.length) : 0
      const avgPresents   = sectionStudents.length > 0
        ? Math.round(totalPresents / sectionStudents.length) : 0
      const overallPct    = totalExpected > 0
        ? Math.round((totalPresents / totalExpected) * 100) : 0

      return {
        section, subjects: subjectReports, totalStudents: sectionStudents.length,
        avgAbsents, avgPresents, attendancePct: overallPct,
      }
    })
  }, [mySections, students, schedules, attData])

  // ── Students needing counseling ────────────────────────────────────────────
  const studentAbsences: StudentAbsence[] = useMemo(() => {
    return students.map(student => {
      const recs = attData.filter(r => r.student_id === student.id && r.status === "Absent")
      const bySubject: Record<string, number> = {}
      recs.forEach(r => { bySubject[r.subject] = (bySubject[r.subject] || 0) + 1 })
      const totalAbsents = recs.length
      const needsCounseling = Object.values(bySubject).some(c => c >= COUNSELING_THRESHOLD)
      return { student, totalAbsents, absentBySubject: bySubject, needsCounseling }
    })
      .sort((a, b) => b.totalAbsents - a.totalAbsents)
  }, [students, attData])

  const counselingList = studentAbsences.filter(s => s.needsCounseling)

  // ── Filter by section ──────────────────────────────────────────────────────
  const filteredReports = activeSection === "ALL"
    ? sectionReports
    : sectionReports.filter(r => r.section === activeSection)

  const filteredCounseling = activeSection === "ALL"
    ? counselingList
    : counselingList.filter(s => s.student.section === activeSection)

  // ── Bar component ──────────────────────────────────────────────────────────
  // Stacked bar: green=present, yellow=late, grey=excused, red=absent
  const StackedBar = ({ present, late, excused, absent, total }: { present: number; late: number; excused: number; absent: number; total: number }) => {
    if (total === 0) return (
      <div className={`h-2 rounded-full w-full ${dm ? "bg-slate-700/50" : "bg-slate-200"}`} />
    )
    const pPct = (present / total) * 100
    const lPct = (late / total) * 100
    const ePct = (excused / total) * 100
    const aPct = (absent / total) * 100
    return (
      <div className={`h-2 rounded-full overflow-hidden flex w-full ${dm ? "bg-slate-700/50" : "bg-slate-200"}`}>
        {pPct > 0 && <div style={{ width: `${pPct}%`, background: "#22c55e", transition: "width 0.5s" }} />}
        {lPct > 0 && <div style={{ width: `${lPct}%`, background: "#f59e0b", transition: "width 0.5s" }} />}
        {ePct > 0 && <div style={{ width: `${ePct}%`, background: "#3b82f6", transition: "width 0.5s" }} />}
        {aPct > 0 && <div style={{ width: `${aPct}%`, background: "#ef4444", transition: "width 0.5s" }} />}
      </div>
    )
  }
  // Simple single-colour bar kept for backward compat
  const PctBar = ({ pct }: { pct: number }) => {
    const color = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500"
    return (
      <div className={`h-2 rounded-full overflow-hidden w-full ${dm ? "bg-slate-700/50" : "bg-slate-200"}`}>
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    )
  }

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const s = new Set(prev)
      if (s.has(key)) s.delete(key); else s.add(key)
      return s
    })
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">

      {/* Header */}
      <div className={`rounded-2xl md:rounded-3xl border p-5 ${card}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${sub}`}>Attendance Reports</p>
            <p className={`text-sm font-black mt-0.5 ${head}`}>Section & Subject Analytics</p>
          </div>
          {loading && <Loader2 size={14} className="animate-spin text-blue-400" />}
        </div>

        {/* Section filter */}
        <div className="flex flex-wrap gap-1.5">
          {["ALL", ...mySections].map(sec => (
            <button key={sec} onClick={() => setActiveSection(sec)}
              className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all
                ${activeSection === sec ? "bg-blue-600 text-white" : dm ? "bg-slate-700/50 text-slate-400 hover:text-white" : "bg-slate-100 text-slate-500 hover:text-slate-800"}`}>
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      {filteredReports.length > 0 && (() => {
        const totalStudents = filteredReports.reduce((a, r) => a + r.totalStudents, 0)
        const avgPct = Math.round(filteredReports.reduce((a, r) => a + r.attendancePct, 0) / filteredReports.length)
        const avgAbs = Math.round(filteredReports.reduce((a, r) => a + r.avgAbsents, 0) / filteredReports.length)
        return (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Avg Attendance", val: `${avgPct}%`, color: avgPct >= 80 ? "text-green-500" : avgPct >= 60 ? "text-amber-500" : "text-red-500", bg: dm ? "bg-slate-900/60 border-slate-700/50" : "bg-white border-slate-200" },
              { label: "Total Students", val: totalStudents, color: "text-blue-400", bg: dm ? "bg-slate-900/60 border-slate-700/50" : "bg-white border-slate-200" },
              { label: "Avg Absents",    val: avgAbs,        color: "text-red-500",  bg: dm ? "bg-slate-900/60 border-slate-700/50" : "bg-white border-slate-200" },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl border p-3 text-center ${s.bg}`}>
                <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                <p className={`text-[8px] font-black uppercase tracking-wider mt-0.5 ${sub}`}>{s.label}</p>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Per-section reports */}
      {filteredReports.map(report => (
        <div key={report.section} className={`rounded-2xl md:rounded-3xl border overflow-hidden ${card}`}>
          {/* Section header */}
          <button
            onClick={() => toggleExpand(report.section)}
            className={`w-full px-5 py-4 flex items-center gap-3 transition-colors ${dm ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}`}
          >
            <div className="flex-1 text-left">
              <div className="flex items-center gap-3">
                <p className={`text-sm font-black uppercase ${head}`}>{report.section}</p>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full
                  ${report.attendancePct >= 80 ? "bg-green-500/15 text-green-500"
                  : report.attendancePct >= 60 ? "bg-amber-500/15 text-amber-500"
                  : "bg-red-500/15 text-red-500"}`}>
                  {report.attendancePct}% overall
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <span className={`text-[9px] ${sub}`}>{report.totalStudents} students</span>
                <span className={`text-[9px] text-red-500`}>~{report.avgAbsents} avg absents</span>
                <span className={`text-[9px] text-green-500`}>~{report.avgPresents} avg presents</span>
              </div>
              <div className="mt-2 max-w-xs">
                <StackedBar
                  present={report.subjects.reduce((a,s) => a + s.presentCount - s.lateCount, 0)}
                  late={report.subjects.reduce((a,s) => a + s.lateCount, 0)}
                  excused={report.subjects.reduce((a,s) => a + s.excusedCount, 0)}
                  absent={report.subjects.reduce((a,s) => a + s.absentCount, 0)}
                  total={report.subjects.reduce((a,s) => a + s.totalSessions, 0)}
                />
              </div>
            </div>
            {expanded.has(report.section) ? <ChevronUp size={14} className={sub} /> : <ChevronDown size={14} className={sub} />}
          </button>

          {/* Subject breakdown */}
          {expanded.has(report.section) && (
            <div className={`border-t ${divB}`}>
              {/* Per-subject rows */}
              <div className={`divide-y ${dm ? "divide-slate-700/30" : "divide-slate-100"}`}>
                {report.subjects.sort((a, b) => a.attendancePct - b.attendancePct).map(subj => (
                  <div key={subj.subject} className={`px-5 py-3 flex items-center gap-4`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-[10px] font-black uppercase truncate ${head}`}>{subj.subject}</p>
                        <span className={`text-[9px] font-black ml-2 shrink-0
                          ${subj.attendancePct >= 80 ? "text-green-500" : subj.attendancePct >= 60 ? "text-amber-500" : "text-red-500"}`}>
                          {subj.attendancePct}%
                        </span>
                      </div>
                      <StackedBar
                        present={subj.presentCount - subj.lateCount}
                        late={subj.lateCount}
                        excused={subj.excusedCount}
                        absent={subj.absentCount}
                        total={subj.totalSessions}
                      />
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[8px] font-bold text-green-500">Present: {subj.presentCount - subj.lateCount}</span>
                        <span className="text-[8px] font-bold text-amber-500">Late: {subj.lateCount}</span>
                        <span className="text-[8px] font-bold text-blue-500">Excused: {subj.excusedCount}</span>
                        <span className="text-[8px] font-bold text-red-500">Absent: {subj.absentCount}</span>
                        <span className={`text-[8px] font-bold ${sub}`}>{subj.scheduledDays} sessions</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Counseling List */}
      {filteredCounseling.length > 0 && (
        <div className={`rounded-2xl md:rounded-3xl border overflow-hidden ${card}`}>
          <div className={`px-5 py-4 border-b ${divB} flex items-center gap-2`}>
            <AlertCircle size={14} className="text-red-500" />
            <p className={`text-[10px] font-black uppercase tracking-wider ${head}`}>
              Needs Counseling / Questioning
            </p>
            <span className={`ml-auto text-[9px] font-black text-red-500`}>{filteredCounseling.length} student{filteredCounseling.length !== 1 ? "s" : ""}</span>
          </div>
          <div className={`divide-y ${dm ? "divide-slate-700/30" : "divide-slate-100"}`}>
            {filteredCounseling.map(({ student, totalAbsents, absentBySubject }) => (
              <div key={student.id} className={`px-5 py-3 flex items-start gap-3 ${dm ? "hover:bg-slate-800/30" : "hover:bg-slate-50"}`}>
                <div className={`w-8 h-8 rounded-xl overflow-hidden shrink-0 ${dm ? "bg-slate-700" : "bg-slate-100"}`}>
                  {(student.two_by_two_url || student.profile_picture)
                    ? <img src={student.two_by_two_url || student.profile_picture || ""} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Users size={14} className={sub} /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-[11px] font-black uppercase ${head}`}>{student.last_name}, {student.first_name}</p>
                    <span className={`text-[7px] font-black px-2 py-0.5 rounded-full bg-red-500/15 text-red-500`}>
                      {totalAbsents} total absences
                    </span>
                  </div>
                  <p className={`text-[9px] mt-0.5 ${sub}`}>{student.section}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {Object.entries(absentBySubject).sort(([,a],[,b]) => b - a).map(([subj, cnt]) => (
                      <span key={subj} className={`text-[8px] font-black px-2 py-0.5 rounded-full
                        ${cnt >= COUNSELING_THRESHOLD
                          ? (dm ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700")
                          : (dm ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500")}`}>
                        {subj}: {cnt}×
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredReports.length === 0 && !loading && (
        <div className={`rounded-2xl border p-12 flex flex-col items-center gap-3 ${card}`}>
          <BarChart2 size={28} className={dm ? "text-slate-700" : "text-slate-300"} />
          <p className={`text-xs ${sub}`}>No attendance data yet for this school year</p>
        </div>
      )}
    </div>
  )
}