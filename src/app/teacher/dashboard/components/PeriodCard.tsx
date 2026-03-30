// app/teacher/dashboard/components/PeriodCard.tsx
"use client"

import { useState, useEffect } from "react"
import { Users, MapPin, Clock, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle, MinusCircle, User } from "lucide-react"
import { StudentRow } from "./StudentRow"
import { ScheduleRow, Student, COLORS, fmt } from "../types"
import { supabase } from "@/lib/supabase/teacher-client"
import { toast } from "sonner"

interface PeriodCardProps {
  period: ScheduleRow
  idx: number
  color: typeof COLORS[number]
  students: Student[]
  loading: boolean
  dm: boolean
  onStudentClick: (student: Student) => void
}

type AttendanceStatus = "Present" | "Late" | "Absent"

interface AttendanceRecord {
  student_id: string
  status: AttendanceStatus
  time: string
  subject: string
}

function todayStr() { return new Date().toISOString().split("T")[0] }
function fmtT(t: string) {
  if (!t) return ""
  const [h, m] = t.slice(0, 5).split(":").map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}

export function PeriodCard({ period, idx, color, students, loading: studLoad, dm, onStudentClick }: PeriodCardProps) {
  const [open, setOpen] = useState(false)
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({})
  const [attLoading, setAttLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const mine = students.filter(s => s.section === period.section)

  const dur = (() => {
    const [sh, sm] = period.start_time.slice(0, 5).split(":").map(Number)
    const [eh, em] = period.end_time.slice(0, 5).split(":").map(Number)
    return (eh * 60 + em) - (sh * 60 + sm)
  })()

  // Check if this period is today or currently active
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const isToday = period.day === days[new Date().getDay()]

  // Load attendance for this period (today only) — always, not just when open
  const loadAttendance = async () => {
    if (!isToday || mine.length === 0) return
    setAttLoading(true)
    try {
      const ids = mine.map(s => s.id)
      const { data } = await supabase
        .from("attendance")
        .select("student_id, status, time, subject")
        .in("student_id", ids)
        .eq("date", todayStr())
        .eq("subject", period.subject)
      
      if (data) {
        const map: Record<string, AttendanceRecord> = {}
        data.forEach((r: any) => { map[r.student_id] = r })
        setAttendance(map)
      }
    } finally {
      setAttLoading(false)
    }
  }

  // Load on mount and whenever section roster changes — so switching to
  // the Schedules tab always shows current status even without opening the card.
  useEffect(() => {
    if (isToday && mine.length > 0) loadAttendance()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, mine.length, period.subject])

  // Realtime attendance — always subscribed (not gated on `open`) so status
  // reflects scanner changes immediately from any tab
  useEffect(() => {
    if (!isToday || mine.length === 0) return
    const sub = supabase
      .channel(`period_att_${period.id}_${period.subject}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "attendance",
        filter: `subject=eq.${period.subject}`,
      }, () => loadAttendance())
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, period.id, period.subject, mine.length])

  const updateStatus = async (studentId: string, newStatus: AttendanceStatus) => {
    setUpdatingId(studentId)
    try {
      const rec = attendance[studentId]
      if (rec) {
        // Update existing record
        await supabase.from("attendance").update({ status: newStatus }).eq("student_id", studentId).eq("date", todayStr()).eq("subject", period.subject)
        setAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], status: newStatus } }))
        toast.success(`Status updated to ${newStatus}`)
      } else {
        // Create new record (teacher marking absent/late manually)
        const student = mine.find(s => s.id === studentId)
        if (!student) return
        const { data: sysConf } = await supabase.from("system_config").select("school_year").single()
        const newRec = {
          student_id: studentId,
          lrn: student.lrn,
          student_name: `${student.last_name}, ${student.first_name}`,
          section: period.section,
          strand: student.strand || "",
          subject: period.subject,
          date: todayStr(),
          time: new Date().toTimeString().slice(0, 8),
          status: newStatus,
          school_year: sysConf?.school_year || new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
        }
        const { data: inserted } = await supabase.from("attendance").insert(newRec).select().single()
        if (inserted) {
          setAttendance(prev => ({ ...prev, [studentId]: { student_id: studentId, status: newStatus, time: inserted.time, subject: period.subject } }))
        }
        toast.success(`Marked ${newStatus}`)
      }
    } catch (e: any) {
      toast.error(e?.message || "Update failed")
    } finally {
      setUpdatingId(null)
    }
  }

  const presentCount = Object.values(attendance).filter(r => r.status === "Present").length
  const lateCount = Object.values(attendance).filter(r => r.status === "Late").length
  const scannedCount = Object.values(attendance).length

  const rowBg   = dm ? "bg-slate-800/30 border-slate-700/50" : "bg-white border-slate-200"
  const divLine = dm ? "border-slate-700/40" : "border-slate-100"
  const sub2    = dm ? "text-slate-400" : "text-slate-500"
  const headText = dm ? "text-white" : "text-slate-900"

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all duration-200 ${rowBg}`}>
      {/* Top color accent */}
      <div className={`h-0.5 w-full ${color.dot} opacity-70`} />

      {/* Period row */}
      <div className="flex items-start gap-3 md:gap-4 px-4 md:px-5 py-4">
        <div className={`flex-shrink-0 w-16 md:w-20 text-right pt-0.5 pr-3 border-r ${dm ? "border-slate-700/40" : "border-slate-100"}`}>
          <p className={`text-sm font-black ${headText}`}>{fmt(period.start_time)}</p>
          <p className={`text-[9px] font-bold ${sub2}`}>{fmt(period.end_time)}</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm md:text-base font-black ${color.text}`}>{period.subject}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            <span className={`flex items-center gap-1 text-[10px] font-bold ${sub2}`}><Users size={9} />{period.section}</span>
            {period.room && <span className={`flex items-center gap-1 text-[10px] font-bold ${sub2}`}><MapPin size={9} />{period.room}</span>}
            <span className={`flex items-center gap-1 text-[10px] font-bold ${dm ? "text-slate-600" : "text-slate-400"}`}><Clock size={9} />{dur} min</span>
          </div>
          {/* Today attendance mini-summary */}
          {isToday && scannedCount > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20`}>
                <CheckCircle2 size={9} />{presentCount} present
              </span>
              {lateCount > 0 && (
                <span className={`flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20`}>
                  <Clock size={9} />{lateCount} late
                </span>
              )}
              <span className={`text-[9px] font-bold ${sub2}`}>{scannedCount}/{mine.length}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`text-[9px] font-black w-6 h-6 rounded-full border flex items-center justify-center ${dm ? "border-slate-700 text-slate-600" : "border-slate-200 text-slate-400"}`}>{idx + 1}</span>
          <button onClick={() => setOpen(v => !v)} className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl border transition-all duration-200
            ${open
              ? (dm ? "bg-blue-500/15 border-blue-500/25 text-blue-400" : "bg-blue-50 border-blue-200 text-blue-600")
              : (dm ? "border-slate-700/50 text-slate-400 hover:bg-slate-700/50" : "border-slate-200 text-slate-400 hover:bg-slate-100")
            }`}>
            <Users size={9} />{studLoad ? "…" : mine.length}
            {open ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
          </button>
        </div>
      </div>

      {/* Expandable students list with attendance */}
      {open && (
        <div className={`border-t ${divLine} animate-in slide-in-from-top-1 duration-200`}>
          <div className={`flex items-center justify-between px-4 md:px-5 py-2.5`}>
            <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${sub2}`}>
              {period.subject} · {period.section}
              {isToday && " — Today"}
            </p>
            <div className="flex items-center gap-2">
              {isToday && (
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold ${sub2}`}>{mine.length} students</span>
                  {attLoading && <Loader2 size={10} className="animate-spin text-blue-400" />}
                </div>
              )}
              {!isToday && <p className={`text-[9px] font-bold ${sub2}`}>{mine.length} student{mine.length !== 1 ? "s" : ""}</p>}
            </div>
          </div>

          {studLoad ? (
            <div className="flex items-center gap-2 px-5 py-4"><Loader2 size={12} className="animate-spin text-blue-400" /><span className={`text-xs ${sub2}`}>Loading…</span></div>
          ) : mine.length === 0 ? (
            <p className={`px-5 py-4 text-xs ${dm ? "text-slate-600" : "text-slate-400"}`}>No students assigned yet.</p>
          ) : isToday ? (
            <div className={`max-h-72 overflow-y-auto divide-y ${dm ? "divide-slate-700/30" : "divide-slate-100"}`}>
              {[...mine].sort((a, b) => a.last_name.localeCompare(b.last_name)).map(s => {
                const att = attendance[s.id]
                const isUpdating = updatingId === s.id
                return (
                  <div key={s.id} className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${dm ? "hover:bg-slate-700/20" : "hover:bg-slate-50"}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-xl overflow-hidden shrink-0 ${dm ? "bg-slate-700" : "bg-slate-100"}`}>
                      {(s.two_by_two_url || s.profile_picture)
                        ? <img src={s.two_by_two_url || s.profile_picture} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><User size={14} className={dm ? "text-slate-500" : "text-slate-400"} /></div>
                      }
                    </div>
                    {/* Name */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onStudentClick(s)}>
                      <p className={`text-[11px] font-black uppercase truncate ${dm ? "text-white" : "text-slate-900"}`}>{s.last_name}, {s.first_name}</p>
                      {att ? (
                        <p className={`text-[9px] font-bold ${att.status === "Present" ? "text-green-500" : att.status === "Late" ? "text-amber-500" : "text-red-500"}`}>
                          {att.status} · {fmtT(att.time)}
                        </p>
                      ) : (
                        <p className={`text-[9px] font-bold ${sub2}`}>Not yet scanned</p>
                      )}
                    </div>
                    {/* Status controls */}
                    {isUpdating ? <Loader2 size={14} className="animate-spin text-blue-400 shrink-0" /> : (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => updateStatus(s.id, "Present")} className={`p-1 rounded-lg transition-colors ${att?.status === "Present" ? "bg-green-500/20 text-green-500" : dm ? "text-slate-600 hover:text-green-400" : "text-slate-300 hover:text-green-500"}`} title="Present"><CheckCircle2 size={15} /></button>
                        <button onClick={() => updateStatus(s.id, "Late")} className={`p-1 rounded-lg transition-colors ${att?.status === "Late" ? "bg-amber-500/20 text-amber-500" : dm ? "text-slate-600 hover:text-amber-400" : "text-slate-300 hover:text-amber-500"}`} title="Late"><Clock size={15} /></button>
                        <button onClick={() => updateStatus(s.id, "Absent")} className={`p-1 rounded-lg transition-colors ${att?.status === "Absent" ? "bg-red-500/20 text-red-500" : dm ? "text-slate-600 hover:text-red-400" : "text-slate-300 hover:text-red-500"}`} title="Absent"><MinusCircle size={15} /></button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            // Non-today: standard student list
            <div className={`max-h-56 overflow-y-auto divide-y ${dm ? "divide-slate-700/30" : "divide-slate-100"}`}>
              {[...mine].sort((a, b) => a.last_name.localeCompare(b.last_name)).map(s => (
                <StudentRow key={s.id} student={s} dm={dm} onClick={onStudentClick} />
              ))}
            </div>
          )}

          {/* Legend for today */}
          {isToday && mine.length > 0 && (
            <div className={`px-4 py-2.5 border-t ${divLine} flex items-center gap-4 flex-wrap`}>
              <span className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-green-500`}><CheckCircle2 size={9} /> Present</span>
              <span className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-amber-500`}><Clock size={9} /> Late</span>
              <span className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-red-500`}><MinusCircle size={9} /> Absent</span>
              <span className={`text-[8px] font-bold ${sub2}`}>· Teachers can override status by clicking icons</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}