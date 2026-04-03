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
export function CuttingClassDetector({ schedules, students, dm, session, schoolYear }: Props) {
  const [date, setDate] = useState(todayStr())
  const [records, setRecords] = useState<AttRecord[]>([])
  const [excuses, setExcuses] = useState<Excuse[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"active" | "excused" | "cutting" | "all">("active")
  const [excuseTarget, setExcuseTarget] = useState<{ student: Student; subject: string | null } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [cuttingHistories, setCuttingHistories] = useState<Record<string, Array<{ date: string, subject: string, section: string }>>>({})
  const [trendData, setTrendData] = useState<any[]>([])
  const [historyTarget, setHistoryTarget] = useState<FrequentCutter | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 7

  const card = dm ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
  const glass = dm ? "bg-white/5 backdrop-blur-xl border-white/5" : "bg-slate-50 border-slate-200"
  const sub = dm ? "text-slate-500" : "text-slate-400"
  const head = dm ? "text-white" : "text-slate-900"

  // Derive Suspects with Timeline
  const suspects = useMemo(() => {
    const list: Suspect[] = []
    students.forEach(student => {
      const dayOfWeek = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })
      const daySched = schedules.filter(s => s.day === dayOfWeek && s.section === student.section).sort((a, b) => a.start_time.localeCompare(b.start_time))
      if (daySched.length < 2) return

      const myRecs = records.filter(r => r.student_id === student.id)
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

      // A suspect is anyone with at least one absence today
      if (absents.length > 0) {
        const excuse = excuses.find(e => e.student_id === student.id && (e.subject === null || absents.includes(e.subject as any)))
        // A suspect is "reported" if all their absent subjects already have a CUTTING note
        const isReported = absents.every(sub =>
          myRecs.find(r => r.subject === sub)?.notes === "CUTTING"
        )

        list.push({
          student,
          date,
          timeline,
          absentIn: absents,
          isExcused: !!excuse,
          isReported,
          excuseReason: excuse?.reason,
          riskScore: Math.round((absents.length / timeline.length) * 100)
        })
      }
    })
    return list.sort((a, b) => b.riskScore - a.riskScore)
  }, [students, schedules, records, excuses, date])

  const frequentCutters = useMemo(() => {
    return Object.entries(cuttingHistories)
      .map(([id, history]) => ({
        student: students.find(s => s.id === id)!,
        history
      }))
      .filter(fc => fc.student)
      .sort((a, b) => b.history.length - a.history.length)
      .slice(0, 3)
  }, [cuttingHistories, students])

  // Synchronize Today's point in the graph with current suspected list counts
  const finalTrendData = useMemo(() => {
    const todayName = new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    return trendData.map(t => {
      if (t.name === todayName) {
        return {
          ...t,
          active: suspects.filter(s => !s.isExcused && !s.isReported).length,
          excused: suspects.filter(s => s.isExcused).length,
          reported: suspects.filter(s => s.isReported).length
        }
      }
      return t
    })
  }, [trendData, suspects, date])

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const myStudentIds = students.map(s => s.id)
      if (!myStudentIds.length) return
      const [{ data: attData }, { data: excData }, { data: histData }] = await Promise.all([
        supabase.from("attendance").select("*").in("student_id", myStudentIds).eq("date", date).eq("school_year", schoolYear),
        supabase.from("attendance_excuses").select("*").in("student_id", myStudentIds).eq("attendance_date", date),
        supabase.from("attendance").select("student_id, date, subject, section").in("student_id", myStudentIds).eq("notes", "CUTTING").order("date", { ascending: false })
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

  const markAs = async (ids: string[], status: "Present" | "Absent") => {
    setActionLoading("bulk")
    try {
      for (const studentId of ids) {
        const susp = suspects.find(s => s.student.id === studentId)
        if (!susp) continue
        for (const sub of susp.absentIn) {
          const { data: existing } = await supabase.from("attendance").select("id").eq("student_id", studentId).eq("date", date).eq("subject", sub).maybeSingle()
          const payload = {
            status,
            notes: status === "Absent" ? "CUTTING" : null,
            school_year: schoolYear,
            student_id: studentId,
            date,
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

  const revert = async (studentId: string) => {
    setActionLoading("revert")
    try {
      const susp = suspects.find(s => s.student.id === studentId)
      if (!susp) return

      // Clear Cutting Notes
      if (susp.isReported) {
        await supabase.from("attendance").update({ notes: null }).eq("student_id", studentId).eq("date", date).eq("notes", "CUTTING")
      }
      // Clear Excuses
      if (susp.isExcused) {
        await supabase.from("attendance_excuses").delete().eq("student_id", studentId).eq("attendance_date", date)
      }

      toast.success("Case re-invalidated and active again")
      load()
    } catch (e: any) { toast.error(e.message) } finally { setActionLoading(null) }
  }

  const toggleSelect = (id: string) => {
    const susp = suspects.find(s => s.student.id === id)
    if (susp?.isExcused || susp?.isReported) return // Prevent selection for closed cases
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelectedIds(next)
  }

  const displayed = suspects.filter(s => {
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

        <div className="lg:w-80 flex flex-col gap-4">
          <div className={`rounded-3xl p-6 flex items-center justify-between border border-white/5 ${dm ? "bg-white/5" : "bg-white shadow-sm"}`}>
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest ${sub}`}>Cutting Rate</p>
              <p className={`text-2xl font-black italic tracking-tighter ${head}`}>{Math.round((suspects.length / students.length) * 100 || 1)}% <span className="text-xs font-bold non-italic opacity-40">Total</span></p>
            </div>
            <CircularProgress pct={Math.round((suspects.length / students.length) * 100 || 0)} dm={dm} size={64} />
          </div>
          <div className="flex items-center gap-4">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} max={todayStr()} className={`flex-1 h-14 rounded-2xl px-5 text-xs font-black uppercase outline-none border transition-all ${dm ? "bg-slate-800 border-white/5 text-white focus:bg-slate-700" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50 shadow-sm"}`} />
            <button onClick={() => load()} className={`w-14 h-14 rounded-2xl flex items-center justify-center border border-white/5 hover:scale-105 active:scale-95 transition-all ${dm ? "bg-white/5" : "bg-white shadow-sm"}`}>
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

      {/* ── TOOLBAR ── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className={`flex flex-wrap gap-2 p-1.5 rounded-2xl border ${dm ? "bg-slate-900/40 border-white/5 shadow-none" : "bg-white border-slate-200 shadow-sm"}`}>
          {(["active", "excused", "cutting", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : dm ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"}`}>
              {f} {f === "active" ? `(${suspects.filter(s => !s.isExcused && !s.isReported).length})` : ""}
            </button>
          ))}
        </div>
        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border flex-1 md:max-w-xs transition-all ${dm ? "bg-slate-800/60 border-white/5 focus-within:bg-slate-800" : "bg-white border-slate-200 shadow-sm focus-within:ring-2 ring-blue-500/10"}`}>
          <Search size={14} className={dm ? "opacity-20" : "text-slate-300"} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Investigate student/section..." className={`bg-transparent outline-none text-xs font-bold w-full ${head} ${dm ? "placeholder-slate-600" : "placeholder-slate-400 font-medium"}`} />
        </div>
      </div>

      {/* ── SUSPECTS LIST ── */}
      <div className="space-y-4">
        {displayed.length > 0 ? (
          <>
            {selectedIds.size > 0 && (
              <div className="sticky top-4 z-50 flex items-center justify-between p-4 rounded-[28px] bg-slate-900 text-white border border-blue-500/30 shadow-2xl shadow-blue-500/20 animate-in slide-in-from-top-4">
                <p className="text-[10px] font-black uppercase tracking-widest ml-4">{selectedIds.size} Marked Students</p>
                <div className="flex flex-wrap gap-2">
                  {!Array.from(selectedIds).every(id => suspects.find(s => s.student.id === id)?.isReported) && (
                    <>
                      <button onClick={() => markAs(Array.from(selectedIds), "Present")} className="h-10 px-6 rounded-xl bg-emerald-600 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-colors">Mark Present</button>
                      <button onClick={() => markAs(Array.from(selectedIds), "Absent")} className="h-10 px-6 rounded-xl bg-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 transition-colors">Confirm Cutting</button>
                    </>
                  )}
                  <button onClick={() => setSelectedIds(new Set())} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors"><X size={16} /></button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {paginated.map((susp, idx) => {
                const isSel = selectedIds.has(susp.student.id)
                return (
                  <div key={susp.student.id} className={`rounded-[32px] border transition-all duration-500 overflow-hidden relative group animate-in fade-in slide-in-from-bottom-4 ${card} ${isSel ? "ring-2 ring-blue-500 shadow-2xl" : "hover:shadow-2xl hover:shadow-rose-500/5 hover:-translate-y-1"}`} style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-8">
                      {/* Student Profile */}
                      <div className="flex items-center gap-6 min-w-[280px]">
                        <button onClick={() => toggleSelect(susp.student.id)} className={`w-16 h-16 rounded-[24px] border-4 overflow-hidden relative shrink-0 transition-all ${isSel ? "border-blue-500 scale-110" : "border-slate-800 bg-slate-800"}`}>
                          <img src={susp.student.two_by_two_url || susp.student.profile_picture || ""} alt="" className="w-full h-full object-cover" />
                          {isSel && <div className="absolute inset-0 bg-blue-600/40 flex items-center justify-center text-white"><Check size={24} strokeWidth={4} /></div>}
                        </button>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`text-lg font-black italic tracking-tighter uppercase leading-tight ${head}`}>{susp.student.last_name}, {susp.student.first_name}</h3>
                            <span className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest ${susp.isExcused ? "bg-blue-500/10 text-blue-500" : "bg-rose-500/10 text-rose-500"}`}>{susp.isExcused ? "EXCUSED" : "ACTIVE ALERTS"}</span>
                          </div>
                          <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${sub}`}>{susp.student.section} · {susp.student.lrn}</p>
                        </div>
                      </div>

                      {/* Daily Timeline */}
                      <div className="flex flex-col items-center md:items-start gap-3 flex-1">
                        <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${sub}`}>Daily Activity Index</p>
                        <div className="flex items-center gap-2">
                          {susp.timeline.map((t, tidx) => (
                            <div key={t.subject} className="flex flex-col items-center gap-1.5 group/point relative">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black transition-all border outline outline-offset-2 outline-transparent ${t.status === "P" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                                t.status === "L" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                  t.status === "A" ? (dm ? "bg-rose-500/20 border-rose-500/40 text-rose-500 outline-rose-500/10" : "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20") :
                                    "bg-slate-100 border-slate-200 text-slate-400"
                                }`}>
                                {t.status}
                              </div>
                              <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-[9px] font-black opacity-0 group-hover/point:opacity-100 transition-all pointer-events-none z-10 whitespace-nowrap shadow-2xl">
                                {t.subject} · {fmtT(t.time)}
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-4 border-transparent border-t-slate-900" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row lg:flex-row justify-center lg:justify-end items-center gap-3 w-full lg:w-auto">
                        {(susp.isExcused || susp.isReported) ? (
                          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                            <div className={`flex items-center gap-2.5 px-4 h-12 rounded-xl w-full sm:w-auto ${dm ? "bg-blue-500/5 border border-blue-500/10" : "bg-blue-50 border border-blue-100 shadow-sm"}`}>
                              <ShieldCheck className="text-blue-500" size={14} />
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 line-height-none">{susp.isReported ? "Reported" : "Resolved"}</p>
                                <p className={`text-[8px] font-bold italic truncate max-w-[100px] ${sub}`}>{susp.isReported ? "Confirmed Cutting" : susp.excuseReason}</p>
                              </div>
                            </div>
                            <button onClick={() => revert(susp.student.id)} className={`h-12 px-4 rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all w-full sm:w-auto ${dm ? "bg-white/5 text-slate-400 hover:text-white hover:bg-rose-600/20" : "bg-white border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 shadow-sm"}`}>
                              <MinusCircle size={14} /> Re-invalidate
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                            <button onClick={() => setExcuseTarget({ student: susp.student, subject: susp.absentIn[0] || null })} className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${dm ? "bg-white/5 border-white/5 hover:bg-blue-600/20 hover:border-blue-500/30 text-blue-500" : "bg-white border-slate-200 hover:bg-blue-50 text-blue-600 shadow-sm"}`} title="Excuse Student"><ShieldCheck size={16} /></button>
                            <button onClick={() => markAs([susp.student.id], "Present")} className={`px-5 h-12 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex-1 sm:flex-none ${dm ? "bg-emerald-600/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-600/20" : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 shadow-sm"}`}>Verify Presence</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className={`flex items-center justify-between px-8 py-6 rounded-[32px] border mt-4 ${dm ? "bg-slate-900/40 border-white/5" : "bg-slate-100 border-slate-200"}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${dm ? "text-slate-500" : "text-slate-400"}`}>Page {currentPage} of {totalPages} · {displayed.length} Investigations</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`px-6 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === 1 ? "opacity-30 cursor-not-allowed" : dm ? "bg-white/10 hover:bg-white/20 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-6 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === totalPages ? "opacity-30 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={`rounded-[40px] border p-20 flex flex-col items-center gap-6 text-center ${card}`}>
            <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center animate-bounce duration-[2000ms]">
              <ShieldCheck size={40} className="text-emerald-500" />
            </div>
            <div>
              <p className={`text-xl font-black uppercase italic tracking-tighter ${head}`}>Sector Secure</p>
              <p className={`text-sm mt-1 font-bold ${dm ? "text-slate-500" : "text-slate-400"}`}>Total student presence verified for {new Date(date + "T00:00:00").toLocaleDateString(undefined, { dateStyle: "full" })}.</p>
            </div>
          </div>
        )}
      </div>

      {excuseTarget && (
        <ExcuseModal
          student={excuseTarget.student} subject={excuseTarget.subject} date={date}
          dm={dm} session={session} onClose={() => setExcuseTarget(null)} onSaved={load}
        />
      )}

      {historyTarget && (
        <HistoryModal
          student={historyTarget.student} history={historyTarget.history} dm={dm}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  )
}

// ── Historical Date Modal ─────────────────────────────────────────────────────
function HistoryModal({ student, history, dm, onClose }: {
  student: Student; history: FrequentCutter["history"]; dm: boolean; onClose: () => void
}) {
  const glass = dm ? "bg-slate-900/90 border-white/10" : "bg-white/95 border-slate-200 shadow-2xl"
  const head = dm ? "text-white" : "text-slate-900"
  const sub = dm ? "text-slate-500" : "text-slate-400"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/40 animate-in fade-in duration-300" onClick={onClose}>
      <div className={`rounded-[40px] border w-full max-w-md shadow-2xl overflow-hidden ${glass}`} onClick={e => e.stopPropagation()}>
        <div className="p-10 space-y-8">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-800 shrink-0 border border-white/5">
                <img src={student.two_by_two_url || student.profile_picture || ""} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-[0.3em] text-rose-500`}>Violation Timeline</p>
                <h3 className={`text-xl font-black uppercase italic tracking-tighter mt-1 ${head}`}>{student.last_name}</h3>
              </div>
            </div>
            <button onClick={onClose} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${dm ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}><X size={20} /></button>
          </div>

          <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {history.map((h, i) => (
              <div key={i} className={`p-5 rounded-[24px] border ${dm ? "bg-white/5 border-white/5 hover:border-rose-500/20" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className={`text-[11px] font-black uppercase tracking-tighter ${head}`}>{h.subject}</p>
                    <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${sub}`}>{h.section}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[12px] font-black ${head}`}>{new Date(h.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                    <p className="text-[10px] font-black uppercase text-rose-500 tracking-tighter">Cutting Case</p>
                  </div>
                </div>
              </div>
            ))}
            {!history.length && (
              <div className="py-12 text-center opacity-40">
                <Clock size={40} className="mx-auto mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest">No history recorded yet</p>
              </div>
            )}
          </div>

          <button onClick={onClose} className="w-full py-5 rounded-[24px] bg-rose-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-rose-600/20 hover:bg-rose-500 transition-all active:scale-95">Dismiss Index</button>
        </div>
      </div>
    </div>
  )
}