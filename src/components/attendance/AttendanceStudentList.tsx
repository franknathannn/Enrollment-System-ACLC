"use client"

import React, { useState, useMemo, useRef } from "react"
import { Search, X, User, CheckCircle2, Clock, ShieldCheck, MinusCircle, Eye, Loader2, Users } from "lucide-react"
import { cn } from "@/lib/utils"

// Types (simplified from AttendanceTab.tsx)
type AttStatus = "Present" | "Late" | "Absent" | "Excused"

interface AttRecord {
  id?: string
  student_id: string
  lrn: string
  student_name: string
  section: string
  strand: string
  subject: string
  date: string
  time: string
  status: AttStatus
  school_year: string
  notes?: string | null
}

interface Student {
  id: string
  lrn: string
  first_name: string
  last_name: string
  section: string
  strand?: string
  two_by_two_url?: string
  profile_picture?: string
}

interface AttendanceStudentListProps {
  students: Student[]
  attendance: Record<string, AttRecord>
  isDarkMode: boolean
  onUpdateStatus: (studentId: string, status: AttStatus) => void
  onViewQr: (student: Student) => void
  updatingId?: string | null
  period?: { subject: string; section: string } | null
  graceMins: number
  onGraceMinsChange: (mins: number) => void
  onMarkAllPresent: () => void
  onMarkRemainingAbsent: () => void
}

function SourceBadge({ notes, size = "sm" }: { notes?: string | null; time?: string; size?: "xs" | "sm" }) {
  const isQR = notes === "QR_SCAN"
  const isCutting = notes === "CUTTING"
  const px = size === "xs" ? "px-1.5 py-px text-[7px]" : "px-2 py-0.5 text-[8px]"
  
  if (isQR) return (
    <span className={cn("inline-flex items-center gap-0.5 font-black rounded-full shrink-0 bg-blue-500/15 text-blue-400 border border-blue-500/20", px)}>
      <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h2v2h-2zM18 14h3M14 18h3M18 18h3"/></svg>
      Scanned
    </span>
  )
  if (isCutting) return (
    <span className={cn("inline-flex items-center gap-0.5 font-black rounded-full shrink-0 bg-orange-500/15 text-orange-400 border border-orange-500/20", px)}>
      Cutting
    </span>
  )
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-black rounded-full shrink-0 bg-slate-500/15 text-slate-400 border border-slate-500/20", px)}>
      Manual
    </span>
  )
}

const fmtT = (t: string) => {
  if (!t || t === "00:00:00") return ""
  const [h, m] = t.slice(0, 5).split(":").map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}

export function AttendanceStudentList({
  students,
  attendance,
  isDarkMode,
  onUpdateStatus,
  onViewQr,
  updatingId,
  period,
  graceMins,
  onGraceMinsChange,
  onMarkAllPresent,
  onMarkRemainingAbsent,
}: AttendanceStudentListProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Present" | "Late" | "Excused" | "Absent" | "Not Scanned">("ALL")
  const [sortMode, setSortMode] = useState<"alpha" | "scan_time" | "manual" | "late" | "absent">("scan_time")
  const listRef = useRef<HTMLDivElement>(null)

  const sub = isDarkMode ? "text-slate-400" : "text-slate-500"
  const head = isDarkMode ? "text-white" : "text-slate-900"
  const divB = isDarkMode ? "border-slate-800" : "border-slate-100"

  const filtered = useMemo(() => {
    return students.filter(s => {
      if (search) {
        const q = search.toLowerCase()
        if (!s.first_name.toLowerCase().includes(q) && !s.last_name.toLowerCase().includes(q) && !s.lrn.includes(q)) return false
      }
      if (statusFilter === "Not Scanned") return !attendance[s.id]
      if (statusFilter !== "ALL") return attendance[s.id]?.status === statusFilter
      return true
    })
  }, [students, search, statusFilter, attendance])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortMode === "alpha") return a.last_name.localeCompare(b.last_name)
      if (sortMode === "scan_time") {
        const ta = attendance[a.id]?.time || "99:99"
        const tb = attendance[b.id]?.time || "99:99"
        return ta.localeCompare(tb)
      }
      if (sortMode === "manual") {
        const isManualA = attendance[a.id] && attendance[a.id].time === "00:00:00" ? 0 : 1
        const isManualB = attendance[b.id] && attendance[b.id].time === "00:00:00" ? 0 : 1
        return isManualA - isManualB
      }
      if (sortMode === "late") {
        const isLateA = attendance[a.id]?.status === "Late" ? 0 : 1
        const isLateB = attendance[b.id]?.status === "Late" ? 0 : 1
        return isLateA - isLateB
      }
      if (sortMode === "absent") {
        const isAbsentA = (!attendance[a.id] || attendance[a.id].status === "Absent") ? 0 : 1
        const isAbsentB = (!attendance[b.id] || attendance[b.id].status === "Absent") ? 0 : 1
        return isAbsentA - isAbsentB
      }
      return 0
    })
  }, [filtered, sortMode, attendance])

  const counts = useMemo(() => {
    const vals = Object.values(attendance)
    return {
      Present: vals.filter(r => r.status === "Present").length,
      Late: vals.filter(r => r.status === "Late").length,
      Absent: vals.filter(r => r.status === "Absent").length,
      Excused: vals.filter(r => r.status === "Excused").length,
      NotScanned: students.length - vals.length
    }
  }, [attendance, students.length])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search & Period Info */}
      <div className={cn("p-4 border-b space-y-3", divB)}>
        <div>
          <p className={cn("text-[9px] font-black uppercase tracking-[0.2em] mb-1", sub)}>Attendance List</p>
          {period && (
            <div>
              <p className={cn("text-[10px] font-black uppercase tracking-widest", sub)}>{period.section}</p>
              <p className={cn("text-xs font-black", head)}>{period.subject}</p>
            </div>
          )}
        </div>

        <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border", isDarkMode ? "bg-slate-800/60 border-slate-700/40" : "bg-slate-50 border-slate-200")}>
          <Search size={14} className={sub} />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search student..."
            className={cn("flex-1 text-xs font-bold bg-transparent outline-none", head)} 
          />
          {search && <button onClick={() => setSearch("")}><X size={14} className={sub} /></button>}
        </div>
      </div>

      {/* Filters */}
      <div className={cn("px-4 py-3 border-b space-y-2", divB)}>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {([
            { val: "ALL", label: "All" },
            { val: "Present", label: "Present" },
            { val: "Late", label: "Late" },
            { val: "Excused", label: "Excused" },
            { val: "Absent", label: "Absent" },
            { val: "Not Scanned", label: "Pending" },
          ] as const).map(f => {
            const cnt = f.val === "Not Scanned" ? counts.NotScanned
              : f.val === "Present" ? counts.Present
              : f.val === "Late" ? counts.Late
              : f.val === "Excused" ? counts.Excused
              : f.val === "Absent" ? counts.Absent : students.length
            
            const active = statusFilter === f.val
            const activeStyle = f.val === "Present" ? "bg-green-500/20 text-green-500 border border-green-500/30"
              : f.val === "Late" ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
              : f.val === "Excused" ? "bg-blue-500/20 text-blue-500 border border-blue-500/30"
              : f.val === "Absent" ? "bg-red-500/20 text-red-500 border border-red-500/30"
              : isDarkMode ? "bg-slate-700 text-white border border-slate-600" : "bg-slate-200 text-slate-800 border border-slate-300"
            
            return (
              <button 
                key={f.val} 
                onClick={() => setStatusFilter(f.val)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5",
                  active ? activeStyle : cn("text-slate-400 hover:text-slate-700 dark:hover:text-slate-200", isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100")
                )}
              >
                {f.label}
                <span className="tabular-nums opacity-80">{cnt}</span>
              </button>
            )
          })}
        </div>
        
        <div className="flex items-center gap-3 overflow-x-auto pb-0.5 no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn("text-[8px] font-black uppercase tracking-wide", sub)}>Sort:</span>
            <select
              value={sortMode}
              onChange={e => setSortMode(e.target.value as "alpha" | "scan_time" | "manual" | "late" | "absent")}
              className={cn(
                "rounded-lg border px-2 py-0.5 text-[9px] font-black outline-none transition-colors",
                isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
              )}
            >
              <option value="alpha">A-Z</option>
              <option value="scan_time">Time</option>
              <option value="manual">Manual</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn("text-[8px] font-black uppercase tracking-wide", sub)}>Grace:</span>
            <select
              value={graceMins}
              onChange={e => onGraceMinsChange(Number(e.target.value))}
              className={cn(
                "rounded-lg border px-2 py-0.5 text-[9px] font-black outline-none transition-colors",
                isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
              )}
            >
              {[0, 10, 20, 30, 40, 50].map(m => (
                <option key={m} value={m}>{m === 0 ? "Off" : `${m}m`}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div
        ref={listRef}
        className={cn("flex-1 overflow-y-auto thin-scroll divide-y", isDarkMode ? "divide-slate-800/40" : "divide-slate-100")}
      >
        {sorted.map(student => {
          const att = attendance[student.id]
          const isUpdating = updatingId === student.id
          
          return (
            <div key={student.id} className={cn("flex items-start gap-3 px-4 py-3 transition-colors", isDarkMode ? "hover:bg-slate-800/30" : "hover:bg-slate-50")}>
              <div className={cn("w-9 h-9 rounded-xl overflow-hidden shrink-0 mt-0.5", isDarkMode ? "bg-slate-700" : "bg-slate-100")}>
                {(student.two_by_two_url || student.profile_picture)
                  ? <img src={student.two_by_two_url || student.profile_picture} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><User size={14} className={sub} /></div>}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className={cn("text-[11px] font-black uppercase truncate", head)}>{student.last_name}, {student.first_name}</p>
                  {att && <SourceBadge notes={att.notes} size="xs" />}
                </div>
                
                {att ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {att.status === "Present" && <CheckCircle2 size={11} className="text-green-500 shrink-0" />}
                    {att.status === "Late" && <Clock size={11} className="text-amber-500 shrink-0" />}
                    {att.status === "Excused" && <ShieldCheck size={11} className="text-blue-500 shrink-0" />}
                    {att.status === "Absent" && <MinusCircle size={11} className="text-red-500 shrink-0" />}
                    <p className={cn("text-[9px] font-bold", 
                      att.status === "Present" ? "text-green-500" : 
                      att.status === "Late" ? "text-amber-500" : 
                      att.status === "Excused" ? "text-blue-500" : "text-red-500"
                    )}>
                      {att.status}{att.time && att.time !== "00:00:00" ? ` · ${fmtT(att.time)}` : ""}
                    </p>
                  </div>
                ) : (
                  <p className={cn("text-[9px] font-bold mt-0.5", sub)}>Not yet scanned</p>
                )}
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                {isUpdating ? (
                  <Loader2 size={14} className="animate-spin text-blue-400 mx-auto" />
                ) : (
                  <>
                    <button 
                      onClick={() => onViewQr(student)}
                      className={cn("p-1.5 rounded-lg transition-colors", isDarkMode ? "text-slate-500 hover:text-blue-400 hover:bg-blue-500/10" : "text-slate-300 hover:text-blue-500 hover:bg-blue-50")}
                    >
                      <Eye size={14} />
                    </button>
                    {([
                      { st: "Present" as const, icon: <CheckCircle2 size={14} />, active: "bg-green-500/20 text-green-500" },
                      { st: "Late" as const, icon: <Clock size={14} />, active: "bg-amber-500/20 text-amber-500" },
                      { st: "Excused" as const, icon: <ShieldCheck size={14} />, active: "bg-blue-500/20 text-blue-500" },
                      { st: "Absent" as const, icon: <MinusCircle size={14} />, active: "bg-red-500/20 text-red-500" },
                    ]).map(({ st, icon, active }) => (
                      <button 
                        key={st} 
                        onClick={() => onUpdateStatus(student.id, st)}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          att?.status === st ? active : isDarkMode ? "text-slate-600 active:text-white" : "text-slate-300 active:text-slate-700"
                        )}
                      >
                        {icon}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )
        })}

        {sorted.length === 0 && (
          <div className="py-20 text-center px-4">
            <Users size={32} className={cn("mx-auto mb-3 opacity-20", head)} />
            <p className={cn("text-xs font-bold", sub)}>No students found</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className={cn("p-4 border-t space-y-2", divB)}>
        <button 
          onClick={onMarkAllPresent}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          <CheckCircle2 size={12} /> Mark All Present
        </button>
        <button 
          onClick={onMarkRemainingAbsent}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-colors",
            isDarkMode ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" : "bg-red-50 border-red-100 text-red-600 hover:bg-red-100"
          )}
        >
          <MinusCircle size={12} /> Mark Remaining Absent
        </button>
      </div>
    </div>
  )
}
