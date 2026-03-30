// src/app/teacher/dashboard/components/ReportsTab.tsx
"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
  BarChart2, Users, TrendingDown, AlertCircle, Loader2,
  ChevronDown, ChevronUp, BookOpen, Star, FileDown, RefreshCw, Zap,
  TrendingUp, Minus
} from "lucide-react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ResponsiveContainer as RechartsContainer,
  LineChart, Line
} from "recharts"
import { supabase } from "@/lib/supabase/teacher-client"
import { TeacherSession, ScheduleRow, Student, fmt } from "../types"
import { toast } from "sonner"

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

// --- SUB-COMPONENT: Circular Progress Ring ---
const CircularProgress = ({ pct, size = 60, strokeWidth = 5, dm }: { pct: number, size?: number, strokeWidth?: number, dm: boolean }) => {
  const radius = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - (pct / 100) * circ
  const color = pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444"

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={dm ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circ}
          style={{ strokeDashoffset: offset, transition: "stroke-dashoffset 1s ease-in-out" }}
          strokeLinecap="round"
        />
      </svg>
      <span className={`absolute text-[10px] font-black ${dm ? "text-white" : "text-slate-900"}`}>{Math.round(pct)}%</span>
    </div>
  )
}

export function ReportsTab({ schedules, students, dm, session, schoolYear }: Props) {
  const [attData, setAttData]   = useState<AttRow[]>([])
  const [loading, setLoading]   = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [activeSection, setActiveSection] = useState<string>("ALL")
  const printRef = useRef<HTMLDivElement>(null)

  const card  = dm ? "bg-slate-900/40 backdrop-blur-xl border-white/5" : "bg-white/80 backdrop-blur-xl border-slate-200"
  const glass = dm ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-slate-50 border-slate-200 hover:bg-slate-100/80"
  const sub   = dm ? "text-slate-400" : "text-slate-500"
  const head  = dm ? "text-white" : "text-slate-900"
  const divB  = dm ? "border-white/5" : "border-slate-100"

  const mySections = useMemo(
    () => [...new Set(schedules.map(s => s.section))].filter(Boolean),
    [schedules]
  )

  const load = useCallback(async (silent = false) => {
    const myStudentIds = students.map(s => s.id)
    if (!myStudentIds.length) return
    if (!silent) setLoading(true)
    try {
      const { data } = await supabase
        .from("attendance").select("student_id, subject, date, status")
        .in("student_id", myStudentIds)
        .eq("school_year", schoolYear)
      setAttData(data || [])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [students, schoolYear])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const ch = supabase.channel("reports_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => load(true))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  const sectionReports: SectionReport[] = useMemo(() => {
    return mySections.map(section => {
      const sectionStudents = students.filter(s => s.section === section)
      const sectionSchedules = schedules.filter(s => s.section === section)
      const uniqueSubjects = [...new Set(sectionSchedules.map(s => s.subject))]

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
      const avgAbsents    = sectionStudents.length > 0 ? Math.round(totalAbsents / sectionStudents.length) : 0
      const avgPresents   = sectionStudents.length > 0 ? Math.round(totalPresents / sectionStudents.length) : 0
      const overallPct    = totalExpected > 0 ? Math.round((totalPresents / totalExpected) * 100) : 0

      return {
        section, subjects: subjectReports, totalStudents: sectionStudents.length,
        avgAbsents, avgPresents, attendancePct: overallPct,
      }
    })
  }, [mySections, students, schedules, attData])

  const studentAbsences: StudentAbsence[] = useMemo(() => {
    return students.map(student => {
      const recs = attData.filter(r => r.student_id === student.id && r.status === "Absent")
      const bySubject: Record<string, number> = {}
      recs.forEach(r => { bySubject[r.subject] = (bySubject[r.subject] || 0) + 1 })
      const totalAbsents = recs.length
      const needsCounseling = Object.values(bySubject).some(c => c >= COUNSELING_THRESHOLD)
      return { student, totalAbsents, absentBySubject: bySubject, needsCounseling }
    }).sort((a, b) => b.totalAbsents - a.totalAbsents)
  }, [students, attData])

  const counselingList = studentAbsences.filter(s => s.needsCounseling)
  const filteredReports = activeSection === "ALL" ? sectionReports : sectionReports.filter(r => r.section === activeSection)
  const filteredCounseling = activeSection === "ALL" ? counselingList : counselingList.filter(s => s.student.section === activeSection)

  const handleDownloadPDF = () => {
    const toastId = toast.loading("Preparing high-fidelity PDF report...")
    setTimeout(() => {
      window.print()
      toast.success("PDF Generation Triggered", { id: toastId })
    }, 1000)
  }

  const StackedBar = ({ present, late, excused, absent, total }: { present: number; late: number; excused: number; absent: number; total: number }) => {
    if (total === 0) return <div className={`h-1.5 rounded-full w-full ${dm ? "bg-white/5" : "bg-slate-100"}`} />
    const pPct = (present / total) * 100, lPct = (late / total) * 100, ePct = (excused / total) * 100, aPct = (absent / total) * 100
    return (
      <div className={`h-2 rounded-full overflow-hidden flex w-full ${dm ? "bg-white/5 shadow-inner" : "bg-slate-100"}`}>
        {pPct > 0 && <div className="bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: `${pPct}%`, transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }} />}
        {lPct > 0 && <div className="bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]" style={{ width: `${lPct}%`, transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }} />}
        {ePct > 0 && <div className="bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" style={{ width: `${ePct}%`, transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }} />}
        {aPct > 0 && <div className="bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]" style={{ width: `${aPct}%`, transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }} />}
      </div>
    )
  }

  const toggleExpand = (key: string) => { setExpanded(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s }) }

  // --- ANALYTICS: Trend Data ---
  const trendData = useMemo(() => {
    // 1. Get unique sorted dates from attData
    const dates = [...new Set(attData.map(r => r.date))].sort().slice(-6)
    if (dates.length === 0) return []

    return dates.map(date => {
      const dayRecs = attData.filter(r => r.date === date)
      const isFiltered = activeSection !== "ALL"
      const relevantRecs = isFiltered ? dayRecs.filter(r => {
        const student = students.find(s => s.id === r.student_id)
        return student?.section === activeSection
      }) : dayRecs

      const presents = relevantRecs.filter(r => r.status === "Present" || r.status === "Late").length
      const total = relevantRecs.length
      const pct = total > 0 ? Math.round((presents / total) * 100) : 0
      
      return { 
        name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: date,
        attendance: pct,
        label: date.split("-").slice(1).join("/") // short date e.g. 03/29
      }
    })
  }, [attData, activeSection, students])

  const overallVelocity = useMemo(() => {
    if (trendData.length < 2) return 0
    const last = trendData[trendData.length - 1].attendance
    const prev = trendData[trendData.length - 2].attendance
    return last - prev
  }, [trendData])

  const VelocityChart = () => (
    <div className={`h-[300px] w-full mt-4 rounded-3xl p-4 md:p-6 overflow-hidden relative ${dm ? "bg-slate-900/20" : "bg-slate-50/50"}`}>
       <div className="flex justify-between items-start mb-6">
          <div>
            <h4 className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>Attendance Velocity</h4>
            <p className={`text-2xl font-black italic tracking-tighter ${head}`}>
              {trendData.length > 0 ? trendData[trendData.length-1].attendance : 0}% 
              <span className={`ml-2 text-xs not-italic ${overallVelocity >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {overallVelocity >= 0 ? "+" : ""}{overallVelocity}% vs prev session
              </span>
            </p>
          </div>
          {overallVelocity !== 0 && (
            <div className={`p-2 rounded-xl ${overallVelocity > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
              {overallVelocity > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </div>
          )}
       </div>
       <ResponsiveContainer width="100%" height="80%">
          <AreaChart data={trendData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dm ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} />
            <XAxis 
              dataKey="label" 
              axisLine={false} tickLine={false} 
              tick={{ fontSize: 9, fontWeight: 900, fill: dm ? "#64748b" : "#94a3b8" }}
              dy={10}
            />
            <YAxis 
              hide domain={[0, 110]}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '16px', border: 'none', 
                backgroundColor: dm ? '#1e293b' : '#ffffff',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' 
              }}
              labelStyle={{ fontSize: '10px', fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase', marginBottom: '4px' }}
              itemStyle={{ fontSize: '12px', fontWeight: 900, color: dm ? '#f8fafc' : '#0f172a' }}
            />
            <Area 
              type="monotone" 
              dataKey="attendance" 
              stroke="#3b82f6" 
              strokeWidth={4} 
              fillOpacity={1} 
              fill="url(#velocityGradient)" 
              animationDuration={2000}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }}
            />
          </AreaChart>
       </ResponsiveContainer>
    </div>
  )

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* --- HIDDEN PRINT LAYOUT --- */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; color: black !important; }
          .no-print { display: none !important; }
          .print-card { border: 1px solid #eee; break-inside: avoid; page-break-inside: avoid; margin-bottom: 2rem; padding: 1.5rem; border-radius: 1rem; }
          .print-header { border-bottom: 3px solid #000; padding-bottom: 1rem; margin-bottom: 2rem; }
        }
      `}</style>
      <div id="print-area" className="hidden print:block p-10 font-sans">
        <div className="print-header flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter">Attendance Report</h1>
            <p className="text-sm font-bold text-gray-500 tracking-widest uppercase">AMA ACLC Northbay Campus • S.Y. {schoolYear}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-gray-400">Generated By:</p>
            <p className="text-xs font-bold uppercase">{session.full_name}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="print-card text-center">
            <p className="text-3xl font-black">{Math.round(sectionReports.reduce((a,r)=>a+r.attendancePct,0)/sectionReports.length || 0)}%</p>
            <p className="text-[10px] font-bold uppercase text-gray-400">Average Attendance</p>
          </div>
          <div className="print-card text-center">
            <p className="text-3xl font-black">{students.length}</p>
            <p className="text-[10px] font-bold uppercase text-gray-400">Managed Students</p>
          </div>
          <div className="print-card text-center">
            <p className="text-3xl font-black">{counselingList.length}</p>
            <p className="text-[10px] font-bold uppercase text-gray-400">Priority Counseling</p>
          </div>
        </div>

        <h2 className="text-xl font-black uppercase mb-6 border-b-2 border-gray-100 pb-2">Section Performance</h2>
        {sectionReports.map(r => (
            <div key={r.section} className="print-card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black uppercase">{r.section}</h3>
                <span className="text-sm font-bold">{r.attendancePct}% Present</span>
              </div>
              <table className="w-full text-xs text-left">
                <thead><tr className="border-b uppercase text-[8px] text-gray-500">
                  <th className="py-2">Subject</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Late</th>
                  <th>Excused</th>
                </tr></thead>
                <tbody className="divide-y">
                  {r.subjects.map(s => (
                    <tr key={s.subject}>
                      <td className="py-2 font-bold">{s.subject}</td>
                      <td>{s.presentCount - s.lateCount}</td>
                      <td className="text-red-600">{s.absentCount}</td>
                      <td className="text-amber-600">{s.lateCount}</td>
                      <td className="text-blue-600">{s.excusedCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        ))}
      </div>

      {/* --- DASHBOARD HEADER --- */}
      <div className={`rounded-[32px] border p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl overflow-hidden relative group ${card}`}>
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
        <div className="flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 ${dm ? "bg-blue-600/20 shadow-[0_0_20px_rgba(37,99,235,0.1)]" : "bg-blue-50 shadow-sm shadow-blue-500/10"}`}>
               <BarChart2 className="w-7 h-7 text-blue-500" />
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${sub}`}>Attendance Report</p>
              <h2 className={`text-2xl font-black italic tracking-tighter uppercase ${head}`}>S.Y. {schoolYear} ANALYTICS</h2>
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
            <button
               onClick={() => load()}
               className={`h-12 px-6 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 group border ${dm ? "bg-white/5 border-white/5 hover:bg-white/10 text-white" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"}`}
            >
              <RefreshCw className={`w-4 h-4 text-blue-500 ${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-700"}`} />
              Update Matrix
            </button>
            <button
               onClick={handleDownloadPDF}
               className="h-12 px-6 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 group bg-slate-900 border-none text-white hover:bg-black shadow-xl shadow-slate-950/20"
            >
              <FileDown className="w-4 h-4 text-blue-400 group-hover:-translate-y-0.5 transition-transform" />
              Download PDF
            </button>
        </div>
      </div>

      {/* --- QUICK METRICS --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(() => {
          const avgPct = Math.round(sectionReports.reduce((a, r) => a + r.attendancePct, 0) / (sectionReports.length || 1))
          const totalAbs = attData.filter(r => r.status === "Absent").length
          const totalExc = attData.filter(r => r.status === "Excused").length
          const triageCount = counselingList.length

          return <>
            <div className={`rounded-[28px] border p-5 flex flex-col items-center justify-center text-center gap-3 relative overflow-hidden group transition-all hover:-translate-y-1 ${card}`}>
              <CircularProgress pct={avgPct} size={64} dm={dm} />
              <p className={`text-[9px] font-black uppercase tracking-widest ${sub}`}>Overall Present</p>
              <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
            <div className={`rounded-[28px] border p-5 flex flex-col items-center justify-center text-center gap-3 relative overflow-hidden group transition-all hover:-translate-y-1 ${card}`}>
              <div className="text-2xl font-black text-rose-500 italic tabular-nums">{totalAbs}</div>
              <p className={`text-[9px] font-black uppercase tracking-widest ${sub}`}>Total Absents</p>
              <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
            <div className={`rounded-[28px] border p-5 flex flex-col items-center justify-center text-center gap-3 relative overflow-hidden group transition-all hover:-translate-y-1 ${card}`}>
              <div className="text-2xl font-black text-blue-500 italic tabular-nums">{totalExc}</div>
              <p className={`text-[9px] font-black uppercase tracking-widest ${sub}`}>Total Excused</p>
              <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
            <div className={`rounded-[28px] border p-5 flex flex-col items-center justify-center text-center gap-3 relative overflow-hidden group transition-all hover:-translate-y-1 ${card}`}>
              <div className="text-2xl font-black text-amber-500 animate-pulse italic tabular-nums">{triageCount}</div>
              <p className={`text-[9px] font-black uppercase tracking-widest ${sub}`}>High Risk Students</p>
              <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </>
        })()}
      </div>

      {/* --- TREND ANALYTICS --- */}
      <div className={`p-1 rounded-[32px] overflow-hidden ${card}`}>
        <VelocityChart />
      </div>

      {/* --- FILTER & LEGEND --- */}
      <div className={`rounded-[28px] border p-4 flex flex-col md:flex-row items-center justify-between gap-4 ${card}`}>
        <div className="flex flex-wrap items-center gap-2">
          {["ALL", ...mySections].map(sec => (
            <button key={sec} onClick={() => setActiveSection(sec)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all
                ${activeSection === sec ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : dm ? "bg-white/5 border-white/5 hover:bg-white/10 text-slate-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-500"}`}>
              {sec}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-center">
            {[
              { c: "bg-emerald-500", l: "Present" }, { c: "bg-amber-500", l: "Late" },
              { c: "bg-blue-500", l: "Excused" }, { c: "bg-rose-500", l: "Absent" }
            ].map(i => (
              <div key={i.l} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${i.c}`} />
                <span className={`text-[9px] font-bold uppercase tracking-wider ${sub}`}>{i.l}</span>
              </div>
            ))}
        </div>
      </div>

      {/* --- SECTION AUDIT CARDS --- */}
      <div className="grid grid-cols-1 gap-6">
        {filteredReports.length > 0 ? filteredReports.map(report => {
          const isExpanded = expanded.has(report.section)
          
          // Calculate section-specific trend (last 5 sessions)
          const secDates = [...new Set(attData.filter(d => {
            const s = students.find(st => st.id === d.student_id)
            return s?.section === report.section
          }).map(d => d.date))].sort().slice(-5)
          
          const secTrend = secDates.map(date => {
            const dayRecs = attData.filter(d => d.date === date)
            const relevant = dayRecs.filter(d => {
              const s = students.find(st => st.id === d.student_id)
              return s?.section === report.section
            })
            const presents = relevant.filter(d => d.status === "Present" || d.status === "Late").length
            return relevant.length > 0 ? Math.round((presents / relevant.length) * 100) : 0
          })

          const lastVal = secTrend[secTrend.length-1] || 0
          const prevVal = secTrend[secTrend.length-2] || 0
          const diff = lastVal - prevVal

          return (
            <div key={report.section} className={`rounded-[32px] border transition-all duration-500 overflow-hidden ${card} ${isExpanded ? "ring-2 ring-blue-500/20" : "hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1"}`}>
              {/* Header */}
              <div
                onClick={() => toggleExpand(report.section)}
                className="p-6 md:p-8 cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-6">
                  <CircularProgress pct={report.attendancePct} dm={dm} size={70} strokeWidth={6} />
                  <div>
                    <h3 className={`text-xl font-black italic tracking-tighter uppercase ${head}`}>{report.section}</h3>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>
                      {report.totalStudents} Students • {report.subjects.length} Subjects
                    </p>
                    {secTrend.length > 1 && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`text-[9px] font-black uppercase flex items-center gap-1 ${diff >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                          {diff >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {diff >= 0 ? "+" : ""}{diff}% Trend
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden md:block h-8 w-24">
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={secTrend.map((v, i) => ({ v, i }))} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                           <Line 
                             type="monotone" 
                             dataKey="v" 
                             stroke={diff >= 0 ? "#10b981" : "#f43f5e"} 
                             strokeWidth={4} 
                             dot={false}
                             activeDot={false}
                             isAnimationActive={false}
                           />
                        </LineChart>
                     </ResponsiveContainer>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-500 ${isExpanded ? "rotate-180 bg-blue-500 text-white" : dm ? "bg-white/5 text-slate-400" : "bg-slate-50 text-slate-500"}`}>
                    <ChevronDown size={20} />
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className={`px-6 md:px-10 pb-10 space-y-8 animate-in slide-in-from-top-4 duration-500`}>
                  <div className={`max-w-md mx-auto h-2 relative`}>
                      <StackedBar
                        present={report.subjects.reduce((a,s) => a + s.presentCount - s.lateCount, 0)}
                        late={report.subjects.reduce((a,s) => a + s.lateCount, 0)}
                        excused={report.subjects.reduce((a,s) => a + s.excusedCount, 0)}
                        absent={report.subjects.reduce((a,s) => a + s.absentCount, 0)}
                        total={report.subjects.reduce((a,s) => a + s.totalSessions, 0)}
                      />
                      <div className="text-[8px] font-black uppercase text-center mt-3 tracking-widest opacity-40">Cumulative Attendance Density</div>
                  </div>

                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 pt-4`}>
                      {report.subjects.sort((a,b)=>b.attendancePct - a.attendancePct).map((subj, idx) => (
                        <div key={subj.subject} className={`p-5 rounded-[24px] border border-transparent flex gap-4 items-start ${glass} animate-in fade-in duration-500`} style={{ animationDelay: `${idx * 100}ms` }}>
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${dm ? "bg-white/5" : "bg-white shadow-sm"}`}>
                             <p className="text-[10px] font-black text-blue-500">{idx+1}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-start mb-2">
                                <p className={`text-[11px] font-black uppercase truncate leading-none ${head}`}>{subj.subject}</p>
                                <p className={`text-[11px] font-black italic tracking-tighter ${subj.attendancePct >= 80 ? "text-emerald-500" : "text-rose-500"}`}>{subj.attendancePct}%</p>
                             </div>
                             <StackedBar
                              present={subj.presentCount - subj.lateCount}
                              late={subj.lateCount}
                              excused={subj.excusedCount}
                              absent={subj.absentCount}
                              total={subj.totalSessions}
                             />
                             <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
                                <span className="text-[7px] font-black uppercase tracking-wider text-emerald-500">P: {subj.presentCount - subj.lateCount}</span>
                                <span className="text-[7px] font-black uppercase tracking-wider text-amber-500">L: {subj.lateCount}</span>
                                <span className="text-[7px] font-black uppercase tracking-wider text-blue-500">E: {subj.excusedCount}</span>
                                <span className="text-[7px] font-black uppercase tracking-wider text-rose-500">A: {subj.absentCount}</span>
                                <span className={`text-[7px] font-black uppercase tracking-wider ${sub} ml-auto`}>{subj.scheduledDays} Days</span>
                             </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )
        }) : (
          <div className={`rounded-[32px] border p-20 flex flex-col items-center gap-6 text-center ${card}`}>
             <div className="w-20 h-20 rounded-full bg-slate-500/10 flex items-center justify-center animate-pulse">
                <BarChart2 size={32} className="text-slate-400" />
             </div>
             <div>
                <p className={`text-lg font-black uppercase italic tracking-tighter ${head}`}>No Matrix Data Found</p>
                <p className={`text-xs mt-1 ${sub}`}>Attendance records for S.Y. {schoolYear} are currently empty.</p>
             </div>
          </div>
        )}
      </div>

      {/* --- TRIAGE / COUNSELING LIST --- */}
      {filteredCounseling.length > 0 && (
        <div className={`rounded-[32px] border overflow-hidden shadow-2xl shadow-rose-500/5 ${card}`}>
          <div className={`px-8 py-6 border-b flex items-center justify-between gap-4 ${divB}`}>
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-rose-500 animate-pulse" />
               </div>
               <div>
                  <h3 className={`text-sm font-black uppercase italic tracking-tighter ${head}`}>Triage Matrix</h3>
                  <p className={`text-[9px] font-black tracking-widest ${sub} uppercase`}>Students Requiring Critical Counseling</p>
               </div>
            </div>
            <div className="bg-rose-500 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/30">
               {filteredCounseling.length} RISK ALERTS
            </div>
          </div>

          <div className={`divide-y ${divB}`}>
            {filteredCounseling.map(({ student, totalAbsents, absentBySubject }, idx) => (
              <div key={student.id} className={`px-6 md:px-8 py-5 flex items-center gap-5 transition-colors group ${dm ? "hover:bg-rose-500/5" : "hover:bg-rose-50/50"} animate-in fade-in duration-500`} style={{ animationDelay: `${idx * 50}ms` }}>
                <div className={`w-12 h-12 rounded-2xl border overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-500 ${dm ? "bg-white/5 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
                  {(student.two_by_two_url || student.profile_picture)
                    ? <img src={student.two_by_two_url || student.profile_picture || ""} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Users size={18} className={sub} /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-1">
                    <p className={`text-[12px] font-black uppercase tracking-tight ${head}`}>{student.last_name}, {student.first_name}</p>
                    <p className={`text-[9px] font-black text-blue-500 uppercase tracking-widest`}>{student.section}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-widest border border-rose-500/5">
                       <TrendingDown size={10} /> {totalAbsents} Total Absences
                    </div>
                    {Object.entries(absentBySubject).filter(([,c]) => c >= COUNSELING_THRESHOLD).map(([subj, cnt]) => (
                      <div key={subj} className="px-2 py-0.5 rounded-lg bg-slate-500/10 text-slate-500 text-[7px] font-black uppercase tracking-widest border border-slate-500/10">
                        {subj}: {cnt}× Risk
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-rose-500 border border-rose-500/10 ${dm ? "bg-rose-500/5" : "bg-rose-50"}`}>
                   <Zap size={14} className="fill-rose-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}