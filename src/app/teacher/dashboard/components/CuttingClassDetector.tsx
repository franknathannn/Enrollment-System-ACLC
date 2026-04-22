// src/app/teacher/dashboard/components/CuttingClassDetector.tsx
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  AlertTriangle, CheckCircle2, MinusCircle, Clock, ShieldCheck,
  X, Loader2, Search, UserX, Info, TrendingUp, TrendingDown,
  ArrowRight, ShieldAlert, Zap, Users, Filter, Check, Eye, Activity
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { supabase } from "@/lib/supabase/teacher-client"
import { toast } from "sonner"
import { TeacherSession, ScheduleRow, Student, fmt } from "../types"

// ── Types ─────────────────────────────────────────────────────────────────────
interface AttRecord {
  id?: string
  student_id: string
  student_name: string
  section: string
  subject: string
  date: string
  time: string
  status: "Present" | "Late" | "Absent"
  notes?: string
}

interface Excuse {
  id: string
  student_id: string
  attendance_date: string
  subject: string | null
  reason: string
}

interface Suspect {
  student: Student
  date: string
  timeline: Array<{ subject: string; status: "P" | "L" | "A" | "?"; time: string }>
  absentIn: string[]
  isExcused: boolean
  isReported: boolean
  excuseReason?: string
  riskScore: number // 1-100 based on % of day cut
}

interface FrequentCutter {
  student: Student
  history: Array<{ date: string; subject: string; section: string }>
}

interface Props {
  schedules: ScheduleRow[]
  students: Student[]
  dm: boolean
  session: TeacherSession
  schoolYear: string
  advisorySections?: string[]
}

const localDateStr = (d: Date = new Date()) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
const todayStr = () => localDateStr()

const fmtT = (t: string) => {
  const [h, m] = t.slice(0, 5).split(":").map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}

// ── HELPER: Circular Progress ──────────────────────────────────────────────────
const CircularProgress = ({ pct, size = 60, strokeWidth = 5, dm = true }: { pct: number, size?: number, strokeWidth?: number, dm?: boolean }) => {
  const radius = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - (pct / 100) * circ
  const color = pct > 20 ? "text-rose-500" : pct > 0 ? "text-amber-500" : "text-emerald-500"

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" className={dm ? "text-white/5" : "text-slate-100"} />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className={`${color} transition-all duration-1000`} />
      </svg>
      <span className={`absolute text-[10px] font-black ${dm ? "text-white" : "text-slate-900"}`}>{pct}%</span>
    </div>
  )
}

// ── Excuse Modal ──────────────────────────────────────────────────────────────
function ExcuseModal({ student, subject, date, dm, session, onClose, onSaved }: {
  student: Student; subject: string | null; date: string; dm: boolean; session: TeacherSession; onClose: () => void; onSaved: () => void
}) {
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)

  const glass = dm ? "bg-slate-900/90 border-white/10" : "bg-white/95 border-slate-200"
  const inp = dm ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"

  const save = async () => {
    if (!reason.trim()) { toast.error("Please enter a reason"); return }
    setSaving(true)
    try {
      const { error } = await supabase.from("attendance_excuses").insert({
        student_id: student.id, attendance_date: date, subject, reason: reason.trim(), excused_by: session.id,
      })
      if (error) throw error
      toast.success(`${student.first_name} excused`)
      onSaved(); onClose()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/40 animate-in fade-in duration-300" onClick={onClose}>
      <div className={`rounded-[32px] border w-full max-w-sm shadow-2xl overflow-hidden ${glass}`} onClick={e => e.stopPropagation()}>
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.3em] text-blue-500`}>Official Excuse</p>
              <h3 className={`text-xl font-black uppercase italic tracking-tighter mt-1 ${dm ? "text-white" : "text-slate-900"}`}>{student.first_name} {student.last_name}</h3>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1">{subject || "Full Day"} · {date}</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"><X size={18} /></button>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {["Clinic Visit", "Official Business", "Family Emergency", "Event Detail"].map(tag => (
                <button key={tag} onClick={() => setReason(tag)} className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${reason === tag ? "bg-blue-600 border-blue-600 text-white" : dm ? "bg-white/5 border-white/5 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-600"}`}>
                  {tag}
                </button>
              ))}
            </div>
            <textarea
              value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Specify the reason for being excused..."
              className={`w-full h-24 rounded-2xl border p-4 text-xs font-bold outline-none resize-none transition-all ${inp} focus:ring-2 ring-blue-500/20`}
            />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border ${dm ? "border-white/5 text-slate-400" : "border-slate-200 text-slate-500"}`}>Cancel</button>
            <button onClick={save} disabled={saving || !reason.trim()} className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />} Resolve
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function CuttingClassDetector({ schedules, students, dm, session, schoolYear, advisorySections = [] }: Props) {
  const [date, setDate] = useState(todayStr())
  const [records, setRecords] = useState<AttRecord[]>([])
  const [excuses, setExcuses] = useState<Excuse[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"active" | "excused" | "cutting" | "all">("active")
  const [sectionFilter, setSectionFilter] = useState<string>("ALL")
  const [excuseTarget, setExcuseTarget] = useState<{ student: Student; subject: string | null; date: string } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [cuttingHistories, setCuttingHistories] = useState<Record<string, Array<{ date: string, subject: string, section: string }>>>({})
  const [adviserMap, setAdviserMap] = useState<Record<string, string>>({})
  const [trendData, setTrendData] = useState<any[]>([])
  const [historyTarget, setHistoryTarget] = useState<FrequentCutter | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 7

  const mySections = useMemo(
    () => [...new Set([...schedules.map(s => s.section), ...advisorySections])].filter(Boolean).sort(),
    [schedules, advisorySections]
  )

  const isAdvisory = useCallback((section: string) => {
    return advisorySections.includes(section)
  }, [advisorySections])

  const card = dm ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
  const glass = dm ? "bg-white/5 backdrop-blur-xl border-white/5" : "bg-slate-50 border-slate-200"
  const sub = dm ? "text-slate-500" : "text-slate-400"
  const head = dm ? "text-white" : "text-slate-900"

  // Derive Suspects with Timeline
  const suspects = useMemo(() => {
    const list: Suspect[] = []
    students.forEach(student => {
      const studentRecs = records.filter(r => r.student_id === student.id)
      const datesToProcess = date === "ALL"
        ? [...new Set(studentRecs.map(r => r.date))].sort((a, b) => b.localeCompare(a))
        : [date]

      datesToProcess.forEach(d => {
        const dayOfWeek = new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })
        const daySched = schedules.filter(s => s.day === dayOfWeek && s.section === student.section).sort((a, b) => a.start_time.localeCompare(b.start_time))
        if (daySched.length < 2) return

        const myRecs = studentRecs.filter(r => r.date === d)
        const timeline = daySched.map(s => {
          const r = myRecs.find(rec => rec.subject === s.subject)
          return {
            subject: s.subject,
            status: r?.status === "Present" ? "P" : r?.status === "Late" ? "L" : r?.status === "Absent" ? "A" : "?" as any,
            time: s.start_time
          }
        })

        const absents = timeline.filter(t => t.status === "A").map(t => t.subject)
        const presents = timeline.filter(t => t.status === "P" || t.status === "L")

        // A suspect is anyone with at least one absence
        if (absents.length > 0) {
          const excuse = excuses.find(e => e.student_id === student.id && e.attendance_date === d && (e.subject === null || absents.includes(e.subject as any)))
          // A suspect is "reported" if all their absent subjects already have a CUTTING note
          const isReported = absents.every(sub =>
            myRecs.find(r => r.subject === sub)?.notes === "CUTTING"
          )

          list.push({
            student,
            date: d,
            timeline,
            absentIn: absents,
            isExcused: !!excuse,
            isReported,
            excuseReason: excuse?.reason,
            riskScore: Math.round((absents.length / timeline.length) * 100)
          })
        }
      })
    })
    return list.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date) // latest first
      return b.riskScore - a.riskScore
    })
  }, [students, schedules, records, excuses, date])

  const filteredSuspects = useMemo(() => {
    if (sectionFilter === "ALL") return suspects
    return suspects.filter(s => s.student.section === sectionFilter)
  }, [suspects, sectionFilter])

  const frequentCutters = useMemo(() => {
    return Object.entries(cuttingHistories)
      .map(([id, history]) => ({
        student: students.find(s => s.id === id)!,
        history
      }))
      .filter(fc => fc.student && (sectionFilter === "ALL" || fc.student.section === sectionFilter))
      .sort((a, b) => b.history.length - a.history.length)
      .slice(0, 3)
  }, [cuttingHistories, students, sectionFilter])

  // Synchronize Today's point in the graph with current suspected list counts
  const finalTrendData = useMemo(() => {
    if (date === "ALL") return trendData;
    const todayName = new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    return trendData.map(t => {
      if (t.name === todayName) {
        return {
          ...t,
          active: filteredSuspects.filter(s => !s.isExcused && !s.isReported).length,
          excused: filteredSuspects.filter(s => s.isExcused).length,
          reported: filteredSuspects.filter(s => s.isReported).length
        }
      }
      return t
    })
  }, [trendData, filteredSuspects, date])

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const myStudentIds = students.map(s => s.id)
      if (!myStudentIds.length) return

      let attQuery = supabase.from("attendance").select("*").in("student_id", myStudentIds).eq("school_year", schoolYear)
      if (date !== "ALL") attQuery = attQuery.eq("date", date)

      let excQuery = supabase.from("attendance_excuses").select("*").in("student_id", myStudentIds)
      if (date !== "ALL") excQuery = excQuery.eq("attendance_date", date)

      const [{ data: attData }, { data: excData }, { data: histData }, { data: secData }] = await Promise.all([
        attQuery,
        excQuery,
        supabase.from("attendance").select("student_id, date, subject, section").in("student_id", myStudentIds).eq("notes", "CUTTING").order("date", { ascending: false }),
        supabase.from("sections").select("name, adviser_name").in("name", mySections)
      ])
      setRecords(attData || [])
      setExcuses(excData || [])

      // Process historical cutting details
      const hists: Record<string, Array<{ date: string, subject: string, section: string }>> = {}
      histData?.forEach(h => {
        if (!hists[h.student_id]) hists[h.student_id] = []
        hists[h.student_id].push({ date: h.date, subject: h.subject, section: h.section })
      })
      setCuttingHistories(hists)

      // Map Adviser Names
      const advMap: Record<string, string> = {}
      secData?.forEach(s => {
        if (s.name && s.adviser_name) advMap[s.name] = s.adviser_name
      })
      setAdviserMap(advMap)

      // ── TREND DATA: LAST 6 DAYS ──
      const days = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - i)
        return localDateStr(d)
      }).reverse()

      const [{ data: h_att }, { data: h_exc }] = await Promise.all([
        supabase.from("attendance").select("date, notes, student_id, section, status").in("student_id", myStudentIds).in("date", days),
        supabase.from("attendance_excuses").select("attendance_date, student_id").in("student_id", myStudentIds).in("attendance_date", days)
      ])

      const trends = days.map(d => {
        const d_att = (h_att || []).filter(r => r.date === d)
        const d_exc = (h_exc || []).filter(r => r.attendance_date === d)

        // Certified Cuttings (Reported)
        const reportedIds = new Set(d_att.filter(r => r.notes === "CUTTING").map(r => r.student_id))
        // Excused Cases
        const excusedIds = new Set(d_exc.map(r => r.student_id))

        // Active Alerts logic for trends:
        // Match the "Anomaly" rule: only count students with absences 
        // who are NOT yet excused or reported as cutting.
        const activeIds = new Set(
          d_att
            .filter(r => r.status === "Absent" && r.notes !== "CUTTING")
            .map(r => r.student_id)
            .filter(id => !excusedIds.has(id))
        )

        return {
          name: new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          active: activeIds.size,
          excused: excusedIds.size,
          reported: reportedIds.size,
        }
      })
      setTrendData(trends)
    } finally { setLoading(false) }
  }, [date, students, schoolYear])

  useEffect(() => { load() }, [load])

  const markAs = async (keys: string[], status: "Present" | "Absent") => {
    setActionLoading("bulk")
    try {
      for (const key of keys) {
        const [studentId, suspectDate] = key.split("_")
        const susp = suspects.find(s => s.student.id === studentId && s.date === suspectDate)
        if (!susp) continue
        for (const sub of susp.absentIn) {
          const { data: existing } = await supabase.from("attendance").select("id").eq("student_id", studentId).eq("date", suspectDate).eq("subject", sub).maybeSingle()
          const payload = {
            status,
            notes: status === "Absent" ? "CUTTING" : null,
            school_year: schoolYear,
            student_id: studentId,
            date: suspectDate,
            subject: sub,
            student_name: `${susp.student.last_name}, ${susp.student.first_name}`,
            lrn: susp.student.lrn,
            section: susp.student.section,
            strand: susp.student.strand || "",
            time: "00:00:00"
          }
          if (existing) {
            await supabase.from("attendance").update({ status, notes: payload.notes }).eq("id", existing.id)
          } else {
            await supabase.from("attendance").insert(payload)
          }
        }
      }
      toast.success("Resolved marked students")
      setSelectedIds(new Set())
      load()
    } catch (e: any) { toast.error(e.message) } finally { setActionLoading(null) }
  }

  const revert = async (key: string) => {
    setActionLoading("revert")
    try {
      const [studentId, suspectDate] = key.split("_")
      const susp = suspects.find(s => s.student.id === studentId && s.date === suspectDate)
      if (!susp) return

      // Clear Cutting Notes
      if (susp.isReported) {
        await supabase.from("attendance").update({ notes: null }).eq("student_id", studentId).eq("date", suspectDate).eq("notes", "CUTTING")
      }
      // Clear Excuses
      if (susp.isExcused) {
        await supabase.from("attendance_excuses").delete().eq("student_id", studentId).eq("attendance_date", suspectDate)
      }

      toast.success("Case re-invalidated and active again")
      load()
    } catch (e: any) { toast.error(e.message) } finally { setActionLoading(null) }
  }

  const toggleSelect = (key: string) => {
    const [studentId, suspectDate] = key.split("_")
    const susp = suspects.find(s => s.student.id === studentId && s.date === suspectDate)
    if (susp && !canModifySuspect(susp)) return // Prevent selection for read-only
    const next = new Set(selectedIds)
    if (next.has(key)) next.delete(key); else next.add(key)
    setSelectedIds(next)
  }

  const canModifySuspect = useCallback((susp: Suspect) => {
    // Only allow modification if the teacher handles AT LEAST ONE of the absent subjects
    return schedules.some(s => s.section === susp.student.section && susp.absentIn.includes(s.subject))
  }, [schedules])

  const displayed = filteredSuspects.filter(s => {
    if (filter === "active" && (s.isExcused || s.isReported)) return false
    if (filter === "excused" && !s.isExcused) return false
    if (filter === "cutting" && !s.isReported) return false
    if (search) {
      const q = search.toLowerCase()
      const n = `${s.student.first_name} ${s.student.last_name}`.toLowerCase()
      return n.includes(q) || s.student.lrn.includes(q) || s.student.section.toLowerCase().includes(q)
    }
    return true
  })

  const paginated = displayed.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const totalPages = Math.ceil(displayed.length / pageSize) || 1

  // Handle current page overflow if filter changes
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1)
  }, [displayed.length, totalPages, currentPage])

  return (
    <>
      <style>{`
        .cd-btn {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .cd-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99,102,241,0.12);
        }
        .cd-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.97);
        }
        .cd-action-present {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .cd-action-present:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(16,185,129,0.2);
          border-color: rgba(16,185,129,0.5) !important;
        }
        .cd-action-present:active { transform: translateY(0) scale(0.95); }
        .cd-action-cutting {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .cd-action-cutting:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(244,63,94,0.2);
          border-color: rgba(244,63,94,0.5) !important;
        }
        .cd-action-cutting:active { transform: translateY(0) scale(0.95); }
        .cd-action-excuse {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .cd-action-excuse:hover {
          transform: translateY(-2px) scale(1.08);
          box-shadow: 0 8px 25px rgba(59,130,246,0.2);
          border-color: rgba(59,130,246,0.5) !important;
        }
        .cd-action-excuse:active { transform: translateY(0) scale(0.95); }
        .cd-action-revert {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .cd-action-revert:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(244,63,94,0.15);
          border-color: rgba(244,63,94,0.4) !important;
        }
        .cd-action-revert:active { transform: translateY(0) scale(0.95); }
        .cd-row {
          transition: all 0.2s ease;
          position: relative;
        }
        .cd-row:hover {
          background: ${dm ? 'rgba(99,102,241,0.04)' : 'rgba(99,102,241,0.02)'};
        }
        .cd-row-selected {
          background: ${dm ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.04)'};
          box-shadow: inset 3px 0 0 0 #3b82f6;
        }
        .cd-row-male::before {
          content: '';
          position: absolute;
          left: 0;
          top: 15%;
          bottom: 15%;
          width: 3px;
          border-radius: 0 4px 4px 0;
          background: linear-gradient(180deg, #3b82f6, #60a5fa);
          box-shadow: 0 0 8px rgba(59,130,246,0.3);
        }
        .cd-row-female::before {
          content: '';
          position: absolute;
          left: 0;
          top: 15%;
          bottom: 15%;
          width: 3px;
          border-radius: 0 4px 4px 0;
          background: linear-gradient(180deg, #ec4899, #f472b6);
          box-shadow: 0 0 8px rgba(236,72,153,0.3);
        }
        .cd-row-selected.cd-row-male::before,
        .cd-row-selected.cd-row-female::before {
          display: none;
        }
      `}</style>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* ── HEADER: INVESTIGATION OPS ── */}
        <div className={`rounded-[40px] border p-8 md:p-10 flex flex-col lg:flex-row gap-10 overflow-hidden relative group ${card}`}>
          <div className="absolute top-0 left-0 w-2 h-full bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)]" />
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 ${dm ? "bg-rose-500/10" : "bg-rose-50"}`}>
                <ShieldAlert className="w-7 h-7 text-rose-500 animate-pulse" />
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${sub}`}>Possible Cuttings</p>
                <h2 className={`text-3xl font-black italic tracking-tighter uppercase ${head}`}>Attendance Irregularities</h2>
              </div>
            </div>

            <div className="h-40 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={finalTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={dm ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: dm ? "#475569" : "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: dm ? "#0f172a" : "#ffffff",
                      border: "none",
                      borderRadius: "16px",
                      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                      fontSize: "9px",
                      fontWeight: "bold"
                    }}
                  />
                  <Line type="monotone" dataKey="active" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: "#f97316", strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="excused" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="reported" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: "#ef4444", strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:w-80">
            <div className={`rounded-3xl p-6 flex items-center justify-between border border-white/5 ${dm ? "bg-white/5" : "bg-white shadow-sm"}`}>
              <div>
                <p className={`text-[9px] font-black uppercase tracking-widest ${sub}`}>Cutting Rate</p>
                <p className={`text-2xl font-black italic tracking-tighter ${head}`}>{Math.round((filteredSuspects.length / (sectionFilter === "ALL" ? students.length : students.filter(s => s.section === sectionFilter).length)) * 100 || 1)}% <span className="text-xs font-bold non-italic opacity-40">Total</span></p>
              </div>
              <CircularProgress pct={Math.round((filteredSuspects.length / (sectionFilter === "ALL" ? students.length : students.filter(s => s.section === sectionFilter).length)) * 100 || 0)} dm={dm} size={64} />
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setDate(date === "ALL" ? todayStr() : "ALL")} className={`px-4 h-14 rounded-2xl flex-1 text-[10px] font-black uppercase tracking-widest transition-all ${date === "ALL" ? "bg-blue-600 text-white" : dm ? "bg-white/5 text-slate-400 hover:text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {date === "ALL" ? "Showing All Time" : "View All Dates"}
              </button>
            </div>

            <div className="flex items-center gap-4">
              {date !== "ALL" ? (
                <input type="date" value={date} onChange={e => setDate(e.target.value)} max={todayStr()} className={`flex-1 h-14 w-0 rounded-2xl px-5 text-xs font-black uppercase outline-none border transition-all ${dm ? "bg-slate-800 border-white/5 text-white focus:bg-slate-700" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50 shadow-sm"}`} />
              ) : (
                <div className={`flex-1 h-14 rounded-2xl px-5 flex items-center text-[10px] font-black uppercase tracking-widest border ${dm ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-blue-50 border-blue-200 text-blue-600"}`}>
                  Date Filter Disabled
                </div>
              )}
              <button onClick={() => load()} className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center border border-white/5 hover:scale-105 active:scale-95 transition-all ${dm ? "bg-white/5" : "bg-white shadow-sm"}`}>
                <Loader2 size={20} className={loading ? "animate-spin text-blue-500" : "text-blue-500"} />
              </button>
            </div>
          </div>
        </div>

        {/* ── PATTERN RECOGNITION ── */}
        {frequentCutters.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {frequentCutters.map(fc => (
              <button
                key={fc.student.id} onClick={() => setHistoryTarget(fc)}
                className={`rounded-[32px] border p-5 flex items-center gap-4 relative overflow-hidden group text-left transition-all hover:scale-[1.02] active:scale-95 ${card}`}
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform"><TrendingUp size={40} className="text-rose-500" /></div>
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-800 shrink-0 border border-white/10">
                  <img src={fc.student.two_by_two_url || fc.student.profile_picture || ""} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className={`text-[11px] font-black uppercase tracking-tighter mb-0.5 ${head}`}>{fc.student.last_name}</p>
                  <p className="text-[9px] font-black uppercase text-rose-500 tracking-widest">{fc.history.length} Instances This Year</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── SECTION FILTER ── */}
        {mySections.length > 1 && (
          <div className={`rounded-[28px] border p-4 flex flex-wrap items-center gap-2 ${dm ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
            {["ALL", ...mySections].map(sec => (
              <button key={sec} onClick={() => { setSectionFilter(sec); setCurrentPage(1) }}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all
                ${sectionFilter === sec ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : dm ? "bg-white/5 border-white/5 hover:bg-white/10 text-slate-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-500"}`}>
                {sec}{sec !== "ALL" && isAdvisory(sec) ? " (Advisory)" : ""}
              </button>
            ))}
          </div>
        )}

        {/* ── TOOLBAR ── */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className={`flex flex-wrap gap-1 p-1 rounded-xl border ${dm ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
            {(["active", "excused", "cutting", "all"] as const).map(f => (
              <button key={f} onClick={() => { setFilter(f); setSelectedIds(new Set()); setCurrentPage(1) }} className={`cd-btn px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : dm ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"}`}>
                {f} ({f === "active" ? filteredSuspects.filter(s => !s.isExcused && !s.isReported).length : f === "excused" ? filteredSuspects.filter(s => s.isExcused).length : f === "cutting" ? filteredSuspects.filter(s => s.isReported).length : filteredSuspects.length})
              </button>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`cd-btn w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${currentPage === 1 ? "opacity-30 cursor-not-allowed" : dm ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"}`}>‹</button>
              <span className={`text-[9px] font-black uppercase tracking-widest tabular-nums ${sub}`}>{currentPage}/{totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`cd-btn w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${currentPage === totalPages ? "opacity-30 cursor-not-allowed" : dm ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"}`}>›</button>
            </div>
          )}
          <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border md:max-w-[200px] w-full transition-all ${dm ? "bg-slate-800/60 border-white/5 focus-within:bg-slate-800" : "bg-white border-slate-200 shadow-sm focus-within:ring-2 ring-blue-500/10"}`}>
            <Search size={12} className={dm ? "opacity-20" : "text-slate-300"} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className={`bg-transparent outline-none text-[11px] font-bold w-full ${head} ${dm ? "placeholder-slate-600" : "placeholder-slate-400 font-medium"}`} />
          </div>
        </div>

        {/* ── SUSPECTS LIST ── */}
        <div className="space-y-4">
          {displayed.length > 0 ? (
            <>
              {selectedIds.size > 0 && (() => {
                const allReported = Array.from(selectedIds).every(key => {
                  const [sId, sDate] = key.split("_")
                  return suspects.find(s => s.student.id === sId && s.date === sDate)?.isReported
                })
                const allExcused = Array.from(selectedIds).every(key => {
                  const [sId, sDate] = key.split("_")
                  return suspects.find(s => s.student.id === sId && s.date === sDate)?.isExcused
                })
                const allClosed = allReported || allExcused
                return (
                  <div className="sticky top-4 z-50 flex items-center justify-between p-4 rounded-[28px] bg-slate-900 text-white border border-blue-500/30 shadow-2xl shadow-blue-500/20 animate-in slide-in-from-top-4">
                    <p className="text-[10px] font-black uppercase tracking-widest ml-4">{selectedIds.size} Selected</p>
                    <div className="flex flex-wrap gap-2">
                      {allClosed ? (
                        <button onClick={() => { Array.from(selectedIds).forEach(k => revert(k)); setSelectedIds(new Set()) }} className="h-10 px-6 rounded-xl bg-amber-600 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 transition-colors">Re-invalidate All</button>
                      ) : (
                        <>
                          <button onClick={() => markAs(Array.from(selectedIds), "Present")} className="h-10 px-6 rounded-xl bg-emerald-600 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-colors">Mark Present</button>
                          <button onClick={() => markAs(Array.from(selectedIds), "Absent")} className="h-10 px-6 rounded-xl bg-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 transition-colors">Confirm Cutting</button>
                        </>
                      )}
                      <button onClick={() => setSelectedIds(new Set())} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors"><X size={16} /></button>
                    </div>
                  </div>
                )
              })()}

              <div className={`rounded-2xl border overflow-hidden ${dm ? "bg-slate-900/30 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
                <div className={`divide-y ${dm ? 'divide-white/5' : 'divide-slate-100'}`}>
                  {paginated.map((susp, idx) => {
                    const key = `${susp.student.id}_${susp.date}`
                    const isSel = selectedIds.has(key)
                    const canModify = canModifySuspect(susp)
                    const pastCuts = cuttingHistories[susp.student.id]?.length || 0

                    return (
                      <div key={key} onClick={() => canModify && toggleSelect(key)} className={`cd-row ${susp.student.gender?.toLowerCase() === 'male' ? 'cd-row-male' : susp.student.gender?.toLowerCase() === 'female' ? 'cd-row-female' : ''} ${canModify ? "cursor-pointer" : ""} ${isSel ? "cd-row-selected" : ""}`} style={{ animationDelay: `${idx * 40}ms` }}>
                        <div className="px-5 py-3.5 md:px-6 md:py-4 flex items-center gap-5">
                          {/* Student Profile — takes remaining space */}
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <button onClick={(e) => { e.stopPropagation(); setHistoryTarget({ student: susp.student, history: cuttingHistories[susp.student.id] || [] }) }} className={`w-12 h-12 rounded-2xl border-[3px] overflow-hidden relative shrink-0 transition-all ${isSel ? "border-blue-500 scale-110" : dm ? "border-slate-700 bg-slate-800 hover:scale-105" : "border-slate-200 bg-slate-100 hover:scale-105"}`}>
                              <img src={susp.student.two_by_two_url || susp.student.profile_picture || ""} alt="" className="w-full h-full object-cover" />
                              {isSel && <div className="absolute inset-0 bg-blue-600/40 flex items-center justify-center text-white"><Check size={18} strokeWidth={4} /></div>}
                            </button>
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <h3 className={`text-sm font-black italic tracking-tighter uppercase leading-tight truncate ${head}`}>{susp.student.last_name}, {susp.student.first_name}</h3>
                                <span className={`px-1.5 py-0.5 rounded text-[6px] font-black uppercase tracking-widest shrink-0 ${susp.isExcused ? "bg-blue-500/10 text-blue-500" : susp.isReported ? "bg-rose-500/10 text-rose-500" : "bg-rose-500/10 text-rose-500"}`}>{susp.isExcused ? "EXCUSED" : susp.isReported ? "CUTTING" : "ACTIVE"}</span>
                                {date === "ALL" && (
                                  <span className={`px-1.5 py-0.5 rounded text-[6px] font-black uppercase tracking-widest shrink-0 ${dm ? "bg-slate-500/10 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                                    {new Date(susp.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                  </span>
                                )}
                              </div>
                              <p className={`text-[8px] font-bold uppercase tracking-widest truncate ${sub}`}>{susp.student.section} · {susp.student.lrn}{pastCuts > 0 ? ` · ${pastCuts} offense${pastCuts !== 1 ? 's' : ''}` : ''}</p>
                            </div>
                          </div>

                          {/* Right side: Timeline + Actions */}
                          <div className="flex items-center gap-3 shrink-0">
                            {/* Daily Timeline */}
                            <div className="flex items-center gap-1">
                              {susp.timeline.map((t) => (
                                <div key={t.subject} className="group/point relative">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${t.status === "P" ? "bg-emerald-500/10 text-emerald-500" :
                                    t.status === "L" ? "bg-amber-500/10 text-amber-500" :
                                      t.status === "A" ? (dm ? "bg-rose-500/20 text-rose-400" : "bg-rose-500 text-white shadow-sm shadow-rose-500/20") :
                                        dm ? "bg-white/5 text-slate-600" : "bg-slate-100 text-slate-400"
                                    }`}>
                                    {t.status}
                                  </div>
                                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-[8px] font-bold opacity-0 group-hover/point:opacity-100 transition-all pointer-events-none z-10 whitespace-nowrap shadow-xl">
                                    {t.subject} · {fmtT(t.time)}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {!canModify ? (
                                <div className={`flex items-center gap-2 px-3 h-9 rounded-lg text-[8px] font-black uppercase tracking-widest ${dm ? "bg-violet-500/5 border border-violet-500/10 text-violet-400" : "bg-violet-50 border border-violet-100 text-violet-500"}`}>
                                  <Eye size={12} /> View Only
                                </div>
                              ) : (susp.isExcused || susp.isReported) ? (
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => revert(`${susp.student.id}_${susp.date}`)} className={`cd-action-revert h-9 px-3 rounded-lg flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest ${dm ? "bg-white/5 border border-white/10 text-slate-400" : "bg-white border border-slate-200 text-slate-500"}`}>
                                    <MinusCircle size={12} /> Revert
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => setExcuseTarget({ student: susp.student, subject: susp.absentIn[0] || null, date: susp.date })} className={`cd-action-excuse w-9 h-9 rounded-lg flex items-center justify-center border ${dm ? "bg-white/5 border-white/10 text-blue-500" : "bg-white border-slate-200 text-blue-600"}`} title="Excuse"><ShieldCheck size={14} /></button>
                                  <button onClick={() => markAs([`${susp.student.id}_${susp.date}`], "Present")} className={`cd-action-present px-4 h-9 rounded-lg text-[8px] font-black uppercase tracking-widest border ${dm ? "bg-emerald-600/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>Present</button>
                                  <button onClick={() => markAs([`${susp.student.id}_${susp.date}`], "Absent")} className={`cd-action-cutting px-4 h-9 rounded-lg text-[8px] font-black uppercase tracking-widest border ${dm ? "bg-rose-600/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700"}`}>Cutting</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </>
          ) : (
            <div className={`rounded-[40px] border p-20 flex flex-col items-center gap-6 text-center ${card}`}>
              <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center animate-bounce duration-[2000ms]">
                <ShieldCheck size={40} className="text-emerald-500" />
              </div>
              <div>
                <p className={`text-xl font-black uppercase italic tracking-tighter ${head}`}>No Students Yet</p>
                <p className={`text-sm mt-1 font-bold ${dm ? "text-slate-500" : "text-slate-400"}`}>Total student presence verified for {new Date(date + "T00:00:00").toLocaleDateString(undefined, { dateStyle: "full" })}.</p>
              </div>
            </div>
          )}
        </div>

        {excuseTarget && (
          <ExcuseModal
            student={excuseTarget.student} subject={excuseTarget.subject} date={excuseTarget.date}
            dm={dm} session={session} onClose={() => setExcuseTarget(null)} onSaved={load}
          />
        )}

        {historyTarget && (
          <HistoryModal
            student={historyTarget.student} history={historyTarget.history} adviserName={adviserMap[historyTarget.student.section]} allSchedules={schedules} dm={dm}
            onClose={() => setHistoryTarget(null)}
          />
        )}
      </div>
    </>
  )
}

// ── Historical Date Modal ─────────────────────────────────────────────────────
function HistoryModal({ student, history, adviserName, allSchedules, dm, onClose }: {
  student: Student; history: FrequentCutter["history"]; adviserName?: string; allSchedules: ScheduleRow[]; dm: boolean; onClose: () => void
}) {
  const [page, setPage] = useState(1)
  const pageSize = 5
  const totalPages = Math.ceil(history.length / pageSize) || 1
  const paginated = history.slice((page - 1) * pageSize, page * pageSize)

  const resolveTeacher = (section: string, subject: string) => {
    const sched = allSchedules.find(s => s.section === section && s.subject === subject)
    return sched?.teacher || null
  }

  const glass = dm ? "bg-slate-900/90 border-white/10" : "bg-white/95 border-slate-200 shadow-2xl"
  const head = dm ? "text-white" : "text-slate-900"
  const sub = dm ? "text-slate-500" : "text-slate-400"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/40 animate-in fade-in duration-300" onClick={onClose}>
      <div className={`rounded-[40px] border w-full max-w-md shadow-2xl overflow-hidden ${glass}`} onClick={e => e.stopPropagation()}>
        <div className="p-8 md:p-10 space-y-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-800 shrink-0 border border-white/5">
                <img src={student.two_by_two_url || student.profile_picture || ""} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500">Violation Timeline</p>
                <h3 className={`text-xl font-black uppercase italic tracking-tighter mt-1 ${head}`}>{student.last_name}</h3>
                <p className={`text-[8px] font-bold uppercase tracking-widest ${sub}`}>{student.section} · {history.length} record{history.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button onClick={onClose} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 ${dm ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}><X size={18} /></button>
          </div>

          <div className="space-y-3 min-h-[200px]">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-50 py-10">
                <Clock size={40} className="mx-auto mb-3" />
                <p className={`text-[11px] font-black uppercase tracking-widest ${sub}`}>No Past Records</p>
              </div>
            ) : paginated.map((h, i) => {
              const teacher = resolveTeacher(h.section, h.subject)
              return (
                <div key={i} className={`p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.01] ${dm ? "bg-white/5 border-white/5 hover:border-rose-500/20" : "bg-slate-50 border-slate-200 hover:border-rose-200 hover:shadow-sm"}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`text-[11px] font-black uppercase tracking-tighter ${head}`}>{h.subject}</p>
                      <p className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${sub}`}>{h.section}</p>
                      {teacher && (
                        <p className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${dm ? "text-amber-400/70" : "text-amber-600/70"}`}>Teacher: {teacher}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-[11px] font-black ${head}`}>{new Date(h.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                      <p className="text-[8px] font-black uppercase tracking-widest mt-0.5 text-rose-500">Cutting Case</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={`text-[9px] font-black uppercase tracking-widest px-4 h-9 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 ${page === 1 ? "opacity-30 cursor-not-allowed" : dm ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}>Prev</button>
              <span className={`text-[8px] font-black uppercase tracking-widest ${sub}`}>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={`text-[9px] font-black uppercase tracking-widest px-4 h-9 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 ${page === totalPages ? "opacity-30 cursor-not-allowed" : dm ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}>Next</button>
            </div>
          )}

          <div className="space-y-3">
            <button onClick={onClose} className="w-full h-12 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-200 shadow-lg shadow-rose-500/20 hover:shadow-xl hover:shadow-rose-500/30 hover:scale-[1.02] active:scale-95">
              Dismiss Index
            </button>
            {adviserName && (
              <p className={`text-center text-[8px] font-black uppercase tracking-widest ${sub}`}>
                Section Adviser: <span className={head}>{adviserName}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}