"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { studentSupabase } from "@/lib/supabase/student-client"
import { ChevronLeft, ChevronRight, Loader2, CalendarDays, Clock, BookOpen } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
type AttStatus = "Present" | "Late" | "Absent" | "Excused"

interface SubjectEntry {
  status: AttStatus
  time: string
  notes?: string | null
}

// Per-day map: subject → entry
type DayMap = Record<string, Record<string, SubjectEntry>>

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function localDateStr(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
const todayStr = () => localDateStr()

function fmtTime(t: string) {
  if (!t) return ""
  const [h, m] = t.slice(0, 5).split(":").map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}

// Determine overall day status from subjects
function dayOverall(subjects: Record<string, SubjectEntry>): AttStatus | null {
  const statuses = Object.values(subjects).map(s => s.status)
  if (!statuses.length) return null
  if (statuses.every(s => s === "Present")) return "Present"
  if (statuses.every(s => s === "Absent")) return "Absent"
  if (statuses.every(s => s === "Excused")) return "Excused"
  if (statuses.some(s => s === "Present" || s === "Late")) return "Late" // mixed = partial presence
  return "Absent"
}

const STATUS_STYLES: Record<AttStatus, { cell: string; badge: string; dot: string }> = {
  Present: {
    cell: "bg-green-500/20 hover:bg-green-500/30 text-green-400 cursor-pointer",
    badge: "bg-green-500/15 border-green-500/25 text-green-400",
    dot:  "bg-green-400",
  },
  Late: {
    cell: "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 cursor-pointer",
    badge: "bg-amber-500/15 border-amber-500/25 text-amber-400",
    dot:  "bg-amber-400",
  },
  Absent: {
    cell: "bg-red-500/20 hover:bg-red-500/30 text-red-400 cursor-pointer",
    badge: "bg-red-500/15 border-red-500/25 text-red-400",
    dot:  "bg-red-400",
  },
  Excused: {
    cell: "bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 cursor-pointer",
    badge: "bg-violet-500/15 border-violet-500/25 text-violet-400",
    dot:  "bg-violet-400",
  },
}

// ── Summary strip ─────────────────────────────────────────────────────────────
function MonthlySummary({ dayMap }: { dayMap: DayMap }) {
  const counts: Record<AttStatus, number> = { Present: 0, Late: 0, Absent: 0, Excused: 0 }

  // Count per-subject records (not per-day overall)
  Object.values(dayMap).forEach(subjects => {
    Object.values(subjects).forEach(({ status }) => { counts[status]++ })
  })

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  if (!total) return null

  return (
    <div className="grid grid-cols-4 gap-2">
      {(["Present", "Late", "Absent", "Excused"] as AttStatus[]).map(s => {
        const styles = STATUS_STYLES[s]
        return (
          <div key={s} className={`rounded-2xl border p-3 text-center ${styles.badge}`}>
            <p className="text-xl font-black">{counts[s]}</p>
            <p className="text-[8px] font-black uppercase tracking-widest mt-0.5 opacity-70">{s}</p>
          </div>
        )
      })}
    </div>
  )
}


// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  studentId: string
  schoolYear: string
  dm?: boolean
}

export function AttendanceCalendar({ studentId, dm = true }: Props) {
  const [year, setYear]           = useState(() => new Date().getFullYear())
  const [month, setMonth]         = useState(() => new Date().getMonth())
  const [dayMap, setDayMap]       = useState<DayMap>({})
  const [loading, setLoading]     = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const daysInMonth    = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const today          = todayStr()
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth()

  // Theme helpers
  const textPri   = dm ? "text-white"      : "text-slate-900"
  const textSub   = dm ? "text-slate-600"  : "text-slate-400"
  const textMuted = dm ? "text-slate-700"  : "text-slate-300"
  const navBtn    = dm
    ? "border-white/8 bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.08]"
    : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50"
  const emptyBorder = dm ? "border-white/5 bg-white/[0.01]" : "border-slate-200 bg-white"
  const noDataCell  = dm ? "border border-white/5 text-slate-700" : "border border-slate-100 text-slate-300"
  const detailCard  = dm ? "border-white/8 bg-white/[0.02]" : "border-slate-200 bg-white"
  const detailHdr   = dm ? "border-white/5" : "border-slate-100"

  // ── Load month ──────────────────────────────────────────────────────────────
  const loadMonth = useCallback(async (y: number, m: number, silent = false) => {
    if (!silent) setLoading(true)
    setSelectedDay(null)
    try {
      const from = `${y}-${String(m + 1).padStart(2, "0")}-01`
      const lastDay = new Date(y, m + 1, 0).getDate()
      const to   = `${y}-${String(m + 1).padStart(2, "0")}-${lastDay}`

      const { data } = await studentSupabase
        .from("attendance")
        .select("date, subject, status, time, notes")
        .eq("student_id", studentId)
        .gte("date", from)
        .lte("date", to)
        .order("date").order("time")

      const map: DayMap = {}
      if (data) {
        data.forEach((r: { date: string; subject: string; status: string; time: string; notes?: string | null }) => {
          if (!map[r.date]) map[r.date] = {}
          map[r.date][r.subject] = {
            status: r.status as AttStatus,
            time:   r.time || "",
            notes:  r.notes,
          }
        })
      }
      setDayMap(map)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [studentId])

  useEffect(() => { loadMonth(year, month) }, [year, month, loadMonth])

  // Realtime: refresh current month silently when attendance changes
  useEffect(() => {
    const ch = studentSupabase
      .channel(`student_att_cal_${studentId}_${year}_${month}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" },
        () => loadMonth(year, month, true))
      .subscribe()
    return () => { studentSupabase.removeChannel(ch) }
  }, [studentId, year, month, loadMonth])

  // ── Navigation ──────────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (isCurrentMonth) return // don't go into the future
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // ── Selected day subjects ───────────────────────────────────────────────────
  const selectedSubjects = useMemo(
    () => (selectedDay ? (dayMap[selectedDay] ?? {}) : null),
    [selectedDay, dayMap]
  )

  return (
    <div className="space-y-5">

      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className={`w-9 h-9 rounded-2xl border flex items-center justify-center transition-all ${navBtn}`}
        >
          <ChevronLeft size={16} />
        </button>

        <div className="text-center">
          <p className={`text-base font-black uppercase tracking-tight ${textPri}`}>
            {MONTH_NAMES[month]}
          </p>
          <p className={`text-[9px] font-bold uppercase tracking-widest ${textSub}`}>{year}</p>
        </div>

        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className={`w-9 h-9 rounded-2xl border flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-default ${navBtn}`}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Monthly summary */}
      {!loading && Object.keys(dayMap).length > 0 && <MonthlySummary dayMap={dayMap} />}

      {/* Calendar grid */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-12">
          <Loader2 className="animate-spin text-blue-500 w-6 h-6" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Loading…</p>
        </div>
      ) : (
        <div>
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className={`text-center text-[9px] font-black uppercase tracking-widest py-1.5 ${textMuted}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {/* Leading empty cells */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day     = i + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
              const subjects  = dayMap[dateStr]
              const overall   = subjects ? dayOverall(subjects) : null
              const isFuture  = dateStr > today
              const isToday   = dateStr === today
              const isSelected = dateStr === selectedDay
              const hasData   = !!subjects && Object.keys(subjects).length > 0

              const styles = overall ? STATUS_STYLES[overall] : null

              const cellCls = isFuture
                ? `${textMuted} cursor-default`
                : hasData && styles
                ? styles.cell
                : `${noDataCell} cursor-default`

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isFuture || !hasData}
                  onClick={() => {
                    if (!hasData || isFuture) return
                    setSelectedDay(dateStr === selectedDay ? null : dateStr)
                  }}
                  className={`relative aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all
                    ${isSelected ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-950" : ""}
                    ${isToday ? "border-2 border-blue-500/60" : ""}
                    ${cellCls}`}
                >
                  <span className="text-sm font-black leading-none">{day}</span>

                  {/* Status dots — one per subject */}
                  {hasData && subjects && (
                    <div className="flex items-center gap-0.5 flex-wrap justify-center mt-0.5 px-0.5">
                      {Object.entries(subjects).map(([subj, entry]) => {
                        const s = STATUS_STYLES[entry.status] ?? STATUS_STYLES.Absent
                        return <span key={subj} className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                      })}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {(["Present", "Late", "Absent", "Excused"] as AttStatus[]).map(s => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${STATUS_STYLES[s].dot}`} />
            <span className={`text-[8px] font-black uppercase tracking-widest ${textSub}`}>{s}</span>
          </div>
        ))}
      </div>

      {/* Day detail */}
      {selectedDay && selectedSubjects !== null && (
        <div className={`rounded-[24px] border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${detailCard}`}>
          <div className={`px-5 py-4 border-b flex items-center gap-2 ${detailHdr}`}>
            <CalendarDays size={14} className="text-blue-500 shrink-0" />
            <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${textSub}`}>
              {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          {Object.keys(selectedSubjects).length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>No records for this day</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {Object.entries(selectedSubjects)
                .sort(([, a], [, b]) => (a.time || "").localeCompare(b.time || ""))
                .map(([subject, entry]) => {
                  const styles = STATUS_STYLES[entry.status] ?? STATUS_STYLES.Absent
                  return (
                    <div key={subject} className={`rounded-[18px] border px-4 py-3 flex items-center justify-between gap-3 ${styles.badge}`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${styles.dot}`} />
                        <div className="min-w-0">
                          <p className={`text-sm font-black truncate ${textPri}`}>{subject}</p>
                          {entry.time && (
                            <p className={`flex items-center gap-1 text-[8px] font-bold mt-0.5 opacity-60 ${textSub}`}>
                              <Clock size={8} /> {fmtTime(entry.time)}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`shrink-0 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${styles.badge}`}>
                        {entry.status}
                      </span>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && Object.keys(dayMap).length === 0 && (
        <div className={`text-center py-12 border rounded-[24px] ${emptyBorder}`}>
          <BookOpen className={`w-8 h-8 mx-auto mb-3 ${textMuted}`} />
          <p className={`text-[10px] font-black uppercase tracking-widest ${textSub}`}>No attendance recorded this month</p>
        </div>
      )}
    </div>
  )
}
