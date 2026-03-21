// app/admin/teachers/components/TeacherSchedulePanel.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { CalendarDays, Clock, MapPin, BookOpen, Users } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import type { Teacher } from "../types"

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] as const

const SUBJECT_COLORS = [
  { bg: "bg-blue-500/10",    border: "border-blue-500/25",    text: "text-blue-400"    },
  { bg: "bg-violet-500/10",  border: "border-violet-500/25",  text: "text-violet-400"  },
  { bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-400" },
  { bg: "bg-amber-500/10",   border: "border-amber-500/25",   text: "text-amber-400"   },
  { bg: "bg-rose-500/10",    border: "border-rose-500/25",    text: "text-rose-400"    },
  { bg: "bg-cyan-500/10",    border: "border-cyan-500/25",    text: "text-cyan-400"    },
  { bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/25", text: "text-fuchsia-400" },
]

function fmt(t: string) {
  if (!t) return ""
  const [h, m] = t.slice(0,5).split(":").map(Number)
  const ap = h >= 12 ? "PM" : "AM"
  const hr = h % 12 || 12
  return `${hr}:${String(m).padStart(2,"0")} ${ap}`
}

interface TeacherSchedulePanelProps {
  teacher:    Teacher
  isDarkMode: boolean
}

export function TeacherSchedulePanel({ teacher, isDarkMode }: TeacherSchedulePanelProps) {
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from("schedules")
        .select("*")
        .eq("teacher_id", teacher.id)
        .order("day").order("start_time")
      setSchedules(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [teacher.id])

  const colorMap = useMemo(() => {
    const unique = [...new Set(schedules.map(s => s.subject))]
    return Object.fromEntries(unique.map((sub, i) => [sub, SUBJECT_COLORS[i % SUBJECT_COLORS.length]]))
  }, [schedules])

  const byDay = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const d of DAYS) {
      map[d] = schedules.filter(s => s.day === d).sort((a,b) => a.start_time.localeCompare(b.start_time))
    }
    return map
  }, [schedules])

  const activeDays = DAYS.filter(d => byDay[d].length > 0)

  const dm = isDarkMode

  if (loading) return (
    <div className={`rounded-2xl border p-6 text-center text-xs ${dm ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400"}`}>
      Loading schedule…
    </div>
  )

  if (schedules.length === 0) return (
    <div className={`rounded-2xl border p-8 flex flex-col items-center gap-3 ${dm ? "border-slate-700/50" : "border-slate-200"}`}>
      <CalendarDays size={28} className={dm ? "text-slate-600" : "text-slate-300"} />
      <p className={`text-xs font-bold ${dm ? "text-slate-500" : "text-slate-400"}`}>No schedules assigned yet</p>
      <p className={`text-[10px] ${dm ? "text-slate-600" : "text-slate-400"}`}>
        Assign this teacher to schedule entries in the Sections tab.
      </p>
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className={`flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest px-1 ${dm ? "text-slate-500" : "text-slate-400"}`}>
        <span className="flex items-center gap-1.5">
          <CalendarDays size={11} /> {activeDays.length} day{activeDays.length !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <BookOpen size={11} /> {schedules.length} period{schedules.length !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={11} /> {[...new Set(schedules.map(s => s.section))].length} section{[...new Set(schedules.map(s => s.section))].length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid header */}
      <div className={`grid gap-1.5`} style={{ gridTemplateColumns: `80px repeat(${DAYS.length}, 1fr)` }}>
        <div />
        {DAYS.map(d => (
          <div key={d} className={`text-center py-2 rounded-lg text-[9px] font-black uppercase tracking-widest
            ${byDay[d].length > 0
              ? (dm ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600")
              : (dm ? "text-slate-600" : "text-slate-400")
            }`}>
            {d.slice(0,3)}
            <div className={`text-[8px] mt-0.5 font-bold ${dm ? "text-slate-600" : "text-slate-400"}`}>
              {byDay[d].length > 0 ? `${byDay[d].length}p` : "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Rows — unique time slots */}
      {(() => {
        const allTimes = [...new Set(schedules.map(s => s.start_time))].sort()
        return allTimes.map(time => (
          <div key={time} className={`grid gap-1.5 items-start`} style={{ gridTemplateColumns: `80px repeat(${DAYS.length}, 1fr)` }}>
            <div className={`text-right pr-3 pt-2.5 text-[9px] font-black ${dm ? "text-slate-500" : "text-slate-400"}`}>
              {fmt(time)}
            </div>
            {DAYS.map(day => {
              const slot = byDay[day].find(s => s.start_time === time)
              if (!slot) return (
                <div key={day} className={`h-16 rounded-xl border border-dashed ${dm ? "border-slate-800" : "border-slate-100"}`} />
              )
              const col = colorMap[slot.subject] ?? SUBJECT_COLORS[0]
              return (
                <div key={day} className={`rounded-xl border p-2 ${col.bg} ${col.border}`}>
                  <p className={`text-[10px] font-black leading-tight ${col.text}`}>{slot.subject}</p>
                  <p className={`text-[8px] font-bold mt-0.5 ${dm ? "text-slate-500" : "text-slate-400"}`}>
                    {slot.section}
                  </p>
                  <div className={`flex items-center gap-1 mt-1 text-[8px] ${dm ? "text-slate-600" : "text-slate-400"}`}>
                    <Clock size={8} /> {fmt(slot.start_time)}–{fmt(slot.end_time)}
                  </div>
                  {slot.room && (
                    <div className={`flex items-center gap-1 mt-0.5 text-[8px] ${dm ? "text-slate-600" : "text-slate-400"}`}>
                      <MapPin size={8} /> {slot.room}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))
      })()}
    </div>
  )
}