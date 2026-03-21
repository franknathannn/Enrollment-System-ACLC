// src/app/teacher/dashboard/components/CuttingClassDetector.tsx
// Detects students who were present in one subject but absent in another on the same day.
// Also handles: excuses. Date defaults to current week (last Sunday → today).
"use client"

import { useState, useEffect, useCallback } from "react"
import {
  AlertTriangle, CheckCircle2, MinusCircle, Clock, ShieldCheck,
  X, Loader2, Search, UserX, Info,
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
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
  presentIn: string[]
  absentIn: string[]
  isExcused: boolean
  excuseReason?: string
}

interface Props {
  schedules: ScheduleRow[]
  students: Student[]
  dm: boolean
  session: TeacherSession
  schoolYear: string
}

// localDateStr: returns a date as "YYYY-MM-DD" in the device's LOCAL timezone.
// toISOString() is UTC — in UTC+8 (Philippines) midnight local is still
// the previous UTC day, so toISOString gives the wrong date after midnight.
const localDateStr = (d: Date = new Date()) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
const todayStr = () => localDateStr()
const lastSundayStr = () => {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return localDateStr(d)
}

// Returns the last 6 school days (Mon–Sat only, no Sunday) going BACKWARD
// from yesterday. Today is always handled by the dedicated TODAY button.
// Example: today = Mon Mar 16 → returns SAT 14, FRI 13, THU 12, WED 11, TUE 10, MON 9
const getWeekDays = (): Array<{ label: string; short: string; date: string; isFuture: boolean; isToday: boolean }> => {
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
  const fullNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
  const results: Array<{ label: string; short: string; date: string; isFuture: boolean; isToday: boolean }> = []
  const cursor = new Date()
  // Start from yesterday and walk backward, collecting Mon–Sat days only
  cursor.setDate(cursor.getDate() - 1)
  while (results.length < 6) {
    const dow = cursor.getDay()
    if (dow !== 0) { // skip Sunday
      results.push({
        label: fullNames[dow],
        short: dayNames[dow],
        date: localDateStr(cursor),
        isFuture: false, // these are all past days by definition
        isToday: false,
      })
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return results // already in reverse order: most recent first (SAT → MON)
}
const fmtT = (t: string) => {
  const [h, m] = t.slice(0, 5).split(":").map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}

// ── Excuse Modal ──────────────────────────────────────────────────────────────
function ExcuseModal({
  student, subject, date, dm, session,
  onClose, onSaved,
}: {
  student: Student; subject: string | null; date: string
  dm: boolean; session: TeacherSession
  onClose: () => void; onSaved: () => void
}) {
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const card = dm ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
  const inp  = dm
    ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"

  const save = async () => {
    if (!reason.trim()) { toast.error("Please enter a reason"); return }
    setSaving(true)
    try {
      const { error } = await supabase.from("attendance_excuses").insert({
        student_id: student.id,
        attendance_date: date,
        subject: subject,
        reason: reason.trim(),
        excused_by: session.id,
      })
      if (error) throw error
      toast.success(`${student.first_name} excused${subject ? ` for ${subject}` : " for the day"}`)
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e.message || "Failed to save excuse")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className={`rounded-3xl border w-full max-w-sm shadow-2xl ${card}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`px-5 py-4 flex items-center justify-between border-b ${dm ? "border-slate-700" : "border-slate-100"}`}>
          <div>
            <p className={`text-[8px] font-black uppercase tracking-widest ${dm ? "text-slate-400" : "text-slate-500"}`}>Mark as Excused</p>
            <p className={`text-sm font-black uppercase mt-0.5 ${dm ? "text-white" : "text-slate-900"}`}>
              {student.last_name}, {student.first_name}
            </p>
            {subject && (
              <p className={`text-[9px] mt-0.5 ${dm ? "text-slate-400" : "text-slate-500"}`}>
                {subject} · {date}
              </p>
            )}
          </div>
          <button onClick={onClose} className={`w-8 h-8 rounded-xl flex items-center justify-center ${dm ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>
            <X size={14} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={`text-[9px] font-black uppercase tracking-wider mb-1.5 block ${dm ? "text-slate-400" : "text-slate-500"}`}>
              Reason for Excuse
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Medical appointment, family emergency…"
              rows={3}
              className={`w-full rounded-2xl border px-3 py-2.5 text-xs font-medium outline-none resize-none transition-colors ${inp}`}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-colors
                ${dm ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !reason.trim()}
              className="flex-1 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
              Excuse
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function CuttingClassDetector({ schedules, students, dm, session, schoolYear }: Props) {
  const [date, setDate]                   = useState(todayStr())
  const [dateEnd, setDateEnd]             = useState(todayStr())
  const [records, setRecords]             = useState<AttRecord[]>([])
  const [excuses, setExcuses]             = useState<Excuse[]>([])
  const [loading, setLoading]             = useState(false)
  const [search, setSearch]               = useState("")
  const [excuseTarget, setExcuseTarget]   = useState<{ student: Student; subject: string | null } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null) // "studentId_dateKey"
  const [filter, setFilter]               = useState<"all" | "suspects" | "excused">("all")
  const [useCustomDate, setUseCustomDate] = useState(false)
  const [showOverall,   setShowOverall]   = useState(false)

  const card  = dm ? "bg-slate-900/60 border-slate-700/50" : "bg-white border-slate-200"
  const card2 = dm ? "bg-slate-800/40 border-slate-700/40" : "bg-slate-50 border-slate-200"
  const sub   = dm ? "text-slate-400" : "text-slate-500"
  const head  = dm ? "text-white" : "text-slate-900"
  const divB  = dm ? "border-slate-700/40" : "border-slate-100"

  const mySections = [...new Set(schedules.map(s => s.section))].filter(Boolean)

  // ── Load data ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const myStudentIds = students.map(s => s.id)
      if (!myStudentIds.length) return

      // Load attendance — overall mode has no date filter
      const [{ data: attData }, { data: excData }] = await Promise.all([
        showOverall
          ? supabase.from("attendance").select("*").in("student_id", myStudentIds).eq("school_year", schoolYear)
          : supabase.from("attendance").select("*").in("student_id", myStudentIds).gte("date", date).lte("date", dateEnd),
        showOverall
          ? supabase.from("attendance_excuses").select("*").in("student_id", myStudentIds)
          : supabase.from("attendance_excuses").select("*").in("student_id", myStudentIds).gte("attendance_date", date).lte("attendance_date", dateEnd),
      ])
      setRecords(attData || [])
      setExcuses(excData || [])
    } finally {
      setLoading(false)
    }
  // Fix 6: include showOverall and dateEnd so re-fetch fires when mode or
  // date range changes. Previously only 'date' was in the array, causing the
  // overall mode to not re-run when the date picker changed underneath it.
  }, [date, dateEnd, showOverall, students, session.id])

  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("cutting_class_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_excuses" }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  // ── Mark student Present or Absent from the irregularity report ────────────
  // dateKey format: "studentId_YYYY-MM-DD" — extract actual date from the end
  const markAs = async (student: Student, dateKey: string, absentIn: string[], status: "Present" | "Absent") => {
    // Extract the actual date portion: last 10 characters are always "YYYY-MM-DD"
    const actualDate = dateKey.slice(-10)
    const loadKey = dateKey
    setActionLoading(loadKey)
    try {
      for (const subject of absentIn) {
        const { data: existing } = await supabase.from("attendance").select("id, status")
          .eq("student_id", student.id).eq("date", actualDate).eq("subject", subject).maybeSingle()
        if (existing?.id) {
          const updatePayload: Record<string, string> = { status }
          if (status === "Absent") updatePayload.notes = "CUTTING"
          await supabase.from("attendance").update(updatePayload).eq("id", existing.id)
        } else {
          const sched = schedules.find(s => s.subject === subject && s.section === student.section)
          await supabase.from("attendance").insert({
            student_id: student.id, lrn: student.lrn,
            student_name: `${student.last_name}, ${student.first_name}`,
            section: student.section, strand: student.strand || "",
            subject, date: actualDate,
            time: sched?.start_time?.slice(0, 8) || "00:00:00",
            status,
            notes: status === "Absent" ? "CUTTING" : null,
            school_year: schoolYear,
          })
        }
      }
      toast.success(`${student.first_name} marked ${status}${status === "Absent" ? " (CUTTING noted)" : ""}`)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed")
    } finally { setActionLoading(null) }
  }

  // ── Derive suspects across all dates in range ─────────────────────────────
  // Build a set of unique dates present in records
  const uniqueDates = [...new Set(records.map(r => r.date))].sort()

  const suspects: Suspect[] = []
  students.forEach(student => {
    uniqueDates.forEach(d => {
      const dayOfWeek = new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })
      const scheduledThatDay = schedules.filter(s => s.day === dayOfWeek && s.section === student.section)
      const subjectsOnDay = [...new Set(scheduledThatDay.map(s => s.subject))]
      if (subjectsOnDay.length < 2) return

      const studentRecs = records.filter(r => r.student_id === student.id && r.date === d)
      const presentIn = studentRecs
        .filter(r => r.status === "Present" || r.status === "Late")
        .map(r => r.subject)
      const absentIn = subjectsOnDay.filter(sub =>
        !studentRecs.some(r => r.subject === sub && (r.status === "Present" || r.status === "Late"))
      )

      if (presentIn.length > 0 && absentIn.length > 0) {
        const excuse = excuses.find(e =>
          e.student_id === student.id &&
          (e.subject === null || absentIn.some(a => e.subject === a))
        )
        // Avoid duplicate entries for same student+date
        const key = `${student.id}_${d}`
        if (!suspects.some(s => s.student.id === student.id && (s as any)._dateKey === key)) {
          const suspect: Suspect & { _dateKey: string } = {
            student, presentIn, absentIn,
            isExcused: !!excuse,
            excuseReason: excuse?.reason,
            _dateKey: key,
          }
          suspects.push(suspect)
        }
      }
    })
  })

  // ── Filter + search ────────────────────────────────────────────────────────
  const displayed = suspects.filter(s => {
    if (filter === "suspects" && s.isExcused) return false
    if (filter === "excused" && !s.isExcused) return false
    if (search) {
      const q = search.toLowerCase()
      const name = `${s.student.first_name} ${s.student.last_name}`.toLowerCase()
      return name.includes(q) || s.student.lrn.includes(q)
    }
    return true
  })

  const suspectCount = suspects.filter(s => !s.isExcused).length
  const excusedCount = suspects.filter(s => s.isExcused).length

  return (
    <div className="space-y-4 animate-in fade-in duration-300">

      {/* Header card */}
      <div className={`rounded-2xl md:rounded-3xl border p-5 ${card}`}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${sub}`}>Cutting Class Detector</p>
            <p className={`text-sm font-black mt-0.5 ${head}`}>Attendance Irregularity Report</p>
          </div>

        </div>

        {/* Humanized explanation */}
        <div className={`rounded-xl border px-4 py-3 text-[10px] leading-relaxed ${dm ? "border-slate-700/40 bg-slate-800/30 text-slate-400" : "border-blue-100 bg-blue-50/60 text-slate-600"}`}>
          <span className={`font-black ${dm ? "text-blue-400" : "text-blue-600"}`}>How it works: </span>
          This report checks if a student was <span className="font-bold">present in one subject but absent in another</span> on the same day — a sign they may have attended class selectively. Each day&apos;s records are scanned. If a student scanned in for Math but has no record for Filipino on the same day, they&apos;ll appear here. You can then <span className="font-bold">mark them Present</span> (if it was a mistake), <span className="font-bold">mark them Absent</span> (to confirm), or <span className="font-bold">Excuse</span> them with a reason.
        </div>



        {/* Day tabs (Mon–Sat of current week) or custom date range */}
        <div className="space-y-3">
          {!useCustomDate ? (
            <>
              {/* Day tabs — order: ALL TIME | WEEK ALL | TODAY | SAT | FRI | ... | MON */}
              <div className="flex flex-wrap gap-1.5">
                {/* ALL TIME — rightmost/first in reverse order */}
                <button
                  onClick={() => setShowOverall(v => !v)}
                  className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all
                    ${showOverall
                      ? (dm ? "bg-orange-600 border-orange-500 text-white" : "bg-orange-500 border-orange-400 text-white")
                      : (dm ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50")}`}>
                  <span className="block">All</span>
                  <span className={`block text-[8px] font-bold ${sub}`}>Time</span>
                </button>
                {/* WEEK ALL = oldest of last-6-days → today */}
                <button
                  onClick={() => {
                    const days = getWeekDays()
                    if (days.length) {
                      // days[0] = most recent past day, days[last] = oldest
                      // set range from oldest to today
                      setDate(days[days.length - 1].date)
                      setDateEnd(todayStr())
                      setShowOverall(false)
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all
                    ${!showOverall && dateEnd === todayStr() && date === getWeekDays()[getWeekDays().length - 1]?.date
                      ? (dm ? "bg-purple-600 border-purple-500 text-white" : "bg-purple-600 border-purple-500 text-white")
                      : (dm ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50")}`}>
                  <span className="block">Week</span>
                  <span className={`block text-[8px] font-bold ${sub}`}>All</span>
                </button>
                {/* TODAY — always shown, always points to today's date */}
                {(() => {
                  const todayDate = todayStr()
                  const todayDay = new Date().getDate()
                  const isSelected = date === todayDate && dateEnd === todayDate && !showOverall
                  return (
                    <button
                      onClick={() => { setDate(todayDate); setDateEnd(todayDate); setShowOverall(false) }}
                      className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border
                        ${isSelected
                          ? "bg-emerald-600 border-emerald-500 text-white shadow-lg"
                          : dm ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10" : "border-emerald-300 text-emerald-600 hover:bg-emerald-50"}`}
                    >
                      <span className="block">Today</span>
                      <span className={`block text-[8px] font-bold ${isSelected ? "text-white/80" : dm ? "text-emerald-400" : "text-emerald-600"}`}>
                        {todayDay}
                      </span>
                    </button>
                  )
                })()}
                {/* Week days — SAT → MON (getWeekDays already returns most-recent-first) */}
                {getWeekDays().map(day => {
                  const isSelected = date === day.date && dateEnd === day.date && !showOverall
                  return (
                    <button
                      key={day.date}
                      onClick={() => { if (!day.isFuture) { setDate(day.date); setDateEnd(day.date); setShowOverall(false) } }}
                      disabled={day.isFuture}
                      className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border
                        ${isSelected
                          ? (dm ? "bg-blue-600 border-blue-500 text-white shadow-md" : "bg-blue-600 border-blue-500 text-white shadow-md")
                          : day.isFuture
                            ? (dm ? "border-slate-800 text-slate-700 cursor-not-allowed" : "border-slate-100 text-slate-300 cursor-not-allowed")
                            : (dm ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50")}`}
                    >
                      <span className="block">{day.short}</span>
                      <span className={`block text-[8px] font-bold ${isSelected ? "text-white/80" : sub}`}>
                        {new Date(day.date + "T00:00:00").getDate()}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className={`text-[9px] ${sub}`}>
                {showOverall ? "Showing: All-time records" : (
                  <>
                    Showing: {date === todayStr() ? "Today" : new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {date !== dateEnd ? ` – ${dateEnd === todayStr() ? "Today" : new Date(dateEnd + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                  </>
                )}
              </p>
            </>
          ) : (
            /* Custom date range */
            <div className="flex items-center gap-2 flex-wrap">
              <div>
                <label className={`text-[8px] font-black uppercase tracking-widest block mb-1 ${sub}`}>From</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} max={dateEnd}
                  className={`rounded-2xl border px-3 py-2 text-xs font-bold outline-none transition-colors
                    ${dm ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`} />
              </div>
              <div>
                <label className={`text-[8px] font-black uppercase tracking-widest block mb-1 ${sub}`}>To</label>
                <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} min={date} max={todayStr()}
                  className={`rounded-2xl border px-3 py-2 text-xs font-bold outline-none transition-colors
                    ${dm ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`} />
              </div>
            </div>
          )}

          {/* Toggle between week tabs and custom date range */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={() => setUseCustomDate(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wide border transition-all
                ${useCustomDate
                  ? (dm ? "bg-blue-500/15 border-blue-500/30 text-blue-400" : "bg-blue-50 border-blue-200 text-blue-600")
                  : (dm ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50")}`}>
              {useCustomDate ? "◀ Back to Week View" : "📅 Custom Date Range"}
            </button>
            {/* Stats */}
            <div className="flex items-center gap-2">
              {[
                { label: "Suspects", val: suspectCount, color: "text-orange-500", bg: dm ? "bg-orange-500/10 border-orange-500/20" : "bg-orange-50 border-orange-200" },
                { label: "Excused",  val: excusedCount, color: "text-blue-500",   bg: dm ? "bg-blue-500/10 border-blue-500/20"   : "bg-blue-50 border-blue-200"   },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border px-3 py-2 text-center ${s.bg}`}>
                  <p className={`text-base font-black ${s.color}`}>{s.val}</p>
                  <p className={`text-[8px] font-bold uppercase tracking-wider ${s.color}`}>{s.label}</p>
                </div>
              ))}
              {loading && <Loader2 size={14} className="animate-spin text-blue-400" />}
            </div>
          </div>
        </div>


      </div>

      {/* Filter + search */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className={`flex gap-1.5 p-1.5 rounded-2xl border ${dm ? "bg-slate-800/30 border-slate-700/50" : "bg-slate-100 border-slate-200"}`}>
          {(["all", "suspects", "excused"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wide transition-all
                ${filter === f ? "bg-blue-600 text-white shadow" : sub}`}>
              {f === "all" ? `All (${suspects.length})` : f === "suspects" ? `Cutting (${suspectCount})` : `Excused (${excusedCount})`}
            </button>
          ))}
        </div>
        <div className={`flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 rounded-2xl border ${dm ? "bg-slate-800/60 border-slate-700/40" : "bg-slate-50 border-slate-200"}`}>
          <Search size={12} className={sub} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student…"
            className={`flex-1 text-[11px] font-bold bg-transparent outline-none ${head}`} />
          {search && <button onClick={() => setSearch("")}><X size={12} className={sub} /></button>}
        </div>
      </div>

      {/* Results */}
      {displayed.length === 0 ? (
        <div className={`rounded-2xl border p-12 flex flex-col items-center gap-3 ${card}`}>
          <CheckCircle2 size={28} className={dm ? "text-green-600" : "text-green-400"} />
          <p className={`text-xs font-bold ${sub}`}>
            {suspects.length === 0
              ? "No irregularities detected for this date"
              : "No suspects in current filter"}
          </p>
        </div>
      ) : (
        <div className={`rounded-2xl md:rounded-3xl border overflow-hidden ${card}`}>
          <div className={`px-5 py-3 border-b ${divB} flex items-center gap-2`}>
            <AlertTriangle size={13} className="text-orange-500" />
            <p className={`text-[10px] font-black uppercase tracking-wider ${head}`}>
              {filter === "suspects" ? "Possible Cutting Class" : filter === "excused" ? "Excused Students" : "All Irregularities"}
            </p>
            <span className={`ml-auto text-[9px] font-bold ${sub}`}>{displayed.length} student{displayed.length !== 1 ? "s" : ""}</span>
          </div>

          <div className={`divide-y ${dm ? "divide-slate-700/30" : "divide-slate-100"}`}>
            {displayed.map((susp) => {
              const { student, presentIn, absentIn, isExcused, excuseReason } = susp
              const dateKey = (susp as any)._dateKey || ""
              const actualDate = dateKey.slice(-10)
              const isLoading = actionLoading === dateKey
              return (
                <div key={`${student.id}_${dateKey}`}
                  className={`px-4 py-3 transition-colors ${dm ? "hover:bg-slate-800/30" : "hover:bg-slate-50"}`}>
                  {/* ── Compact row: avatar + key info + actions ── */}
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-xl overflow-hidden shrink-0 ${dm ? "bg-slate-700" : "bg-slate-100"}`}>
                      {(student.two_by_two_url || student.profile_picture)
                        ? <img src={student.two_by_two_url || student.profile_picture || ""} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><UserX size={12} className={sub} /></div>
                      }
                    </div>

                    {/* Info block — section · LRN · date · subject(s) */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`text-[11px] font-black uppercase leading-none ${head}`}>
                          {student.last_name}, {student.first_name}
                        </p>
                        {isExcused
                          ? <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full leading-none ${dm ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700"}`}>EXCUSED</span>
                          : <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full leading-none ${dm ? "bg-orange-500/20 text-orange-400" : "bg-orange-100 text-orange-700"}`}>⚠ CUTTING</span>
                        }
                      </div>
                      {/* Key identifiers on one line */}
                      <p className={`text-[9px] mt-0.5 ${sub} leading-none`}>
                        {student.section}&nbsp;·&nbsp;LRN {student.lrn}&nbsp;·&nbsp;{actualDate}
                      </p>
                      {/* Absent subjects only */}
                      {absentIn.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {absentIn.map(subj => (
                            <span key={subj} className={`flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-md
                              ${dm ? "bg-red-500/15 text-red-400" : "bg-red-50 text-red-700"}`}>
                              <MinusCircle size={7} /> {subj}
                            </span>
                          ))}
                        </div>
                      )}
                      {excuseReason && (
                        <p className={`text-[8px] mt-0.5 italic ${dm ? "text-blue-400" : "text-blue-600"}`}>
                          Excuse: {excuseReason}
                        </p>
                      )}
                    </div>

                    {/* Actions — fixed width prevents layout shift */}
                    <div className="flex flex-col gap-1 shrink-0" style={{ minWidth: 76 }}>
                      {isLoading ? (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 size={15} className="animate-spin text-blue-400" />
                        </div>
                      ) : (
                        <>
                          <button onClick={() => markAs(student, dateKey, absentIn, "Present")}
                            className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wide border transition-colors
                              ${dm ? "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20" : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"}`}>
                            <CheckCircle2 size={9} /> Present
                          </button>
                          <button onClick={() => markAs(student, dateKey, absentIn, "Absent")}
                            className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wide border transition-colors
                              ${dm ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20" : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"}`}>
                            <MinusCircle size={9} /> Absent
                          </button>
                          {!isExcused && (
                            <button onClick={() => setExcuseTarget({ student, subject: absentIn[0] || null })}
                              className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wide border transition-colors
                                ${dm ? "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" : "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"}`}>
                              <ShieldCheck size={9} /> Excuse
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Excuse Modal */}
      {excuseTarget && (
        <ExcuseModal
          student={excuseTarget.student}
          subject={excuseTarget.subject}
          date={date}
          dm={dm}
          session={session}
          onClose={() => setExcuseTarget(null)}
          onSaved={load}
        />
      )}


    </div>
  )
}