// app/teacher/dashboard/components/ScheduleTab.tsx
"use client"

import { useState, useEffect } from "react"
import { CalendarDays } from "lucide-react"
import { PeriodCard } from "./PeriodCard"

import { ScheduleRow, Student, TeacherSession, COLORS, ALL_DAYS, DayName, fmt, todayName } from "../types"

interface ScheduleTabProps {
  schedules: ScheduleRow[]
  students: Student[]
  studLoad: boolean
  colorMap: Record<string, typeof COLORS[number]>
  dm: boolean
  onStudentClick: (student: Student) => void
  onLinkUpdated?: (scheduleId: string, link: string | null) => void
  session: TeacherSession
  schoolYear: string
}

export function ScheduleTab({ schedules, students, studLoad, colorMap, dm, onStudentClick, onLinkUpdated, session, schoolYear }: ScheduleTabProps) {
  // Smart initial day: find the next day that has scheduled classes, starting from today
  const getSmartDay = (): DayName => {
    const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
    const todayIdx = new Date().getDay() // 0=Sun
    // Try today first, then look forward up to 6 days
    for (let offset = 0; offset < 7; offset++) {
      const idx = (todayIdx + offset) % 7
      const name = dayNames[idx] as DayName
      if (ALL_DAYS.includes(name) && schedules.some(s => s.day === name)) return name
    }
    return todayName()
  }
  const [activeDay, setActiveDay] = useState<DayName>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("teacher_schedule_day")
      if (saved && ALL_DAYS.includes(saved as DayName)) return saved as DayName
    }
    return getSmartDay()
  })

  useEffect(() => {
    sessionStorage.setItem("teacher_schedule_day", activeDay)
  }, [activeDay])

  const card = dm ? "bg-slate-900/60 border-slate-700/50" : "bg-white border-slate-200"
  const sub  = dm ? "text-slate-400" : "text-slate-500"
  const head = dm ? "text-white"     : "text-slate-900"
  const divB = dm ? "border-slate-700/50" : "border-slate-100"

  const byDay: Record<string, ScheduleRow[]> = {}
  for (const d of ALL_DAYS) {
    byDay[d] = schedules.filter(s => s.day === d).sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  const today = todayName()

  if (schedules.length === 0) {
    return (
      <div className={`rounded-2xl md:rounded-3xl border p-12 flex flex-col items-center gap-4 ${card}`}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${dm ? "bg-slate-800" : "bg-slate-100"}`}>
          <CalendarDays size={28} className={dm ? "text-slate-600" : "text-slate-400"} />
        </div>
        <div className="text-center">
          <p className={`text-sm font-black ${head}`}>No schedules assigned yet</p>
          <p className={`text-xs mt-1 ${dm ? "text-slate-600" : "text-slate-400"} max-w-xs`}>
            Your admin will assign you to sections soon.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Day tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {ALL_DAYS.map(d => {
          const count    = byDay[d].length
          const isActive = activeDay === d
          const isToday  = d === today
          return (
            <button
              key={d}
              onClick={() => setActiveDay(d)}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 md:px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all duration-200
                ${isActive
                  ? "bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30"
                  : count > 0
                    ? (dm ? "border border-slate-700/50 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600/50" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm")
                    : (dm ? "border border-slate-800/40 text-slate-700" : "border border-slate-100 text-slate-300 bg-slate-50/50")
                }`}
            >
              <span>{d.slice(0, 3)}</span>
              {count > 0
                ? <span className={`text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center mt-0.5 ${isActive ? "bg-white/25 text-white" : (dm ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-500")}`}>{count}</span>
                : <span className={`text-[8px] ${isActive ? "text-white/40" : (dm ? "text-slate-700" : "text-slate-300")}`}>—</span>
              }
              {isToday && !isActive && <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />}
            </button>
          )
        })}
      </div>

      {/* Day panel */}
      <div className={`rounded-2xl md:rounded-3xl border overflow-hidden shadow-sm ${card}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${divB}`}>
          <div>
            <h2 className={`text-base font-black flex items-center gap-2 ${head}`}>
              {activeDay}
              {(() => {
                const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
                const todayIdx = new Date().getDay()
                const tomorrowIdx = (todayIdx + 1) % 7
                const todayDayName = dayNames[todayIdx]
                const tomorrowDayName = dayNames[tomorrowIdx]
                if (activeDay === todayDayName && ALL_DAYS.includes(todayDayName as DayName)) {
                  return <span className="text-[8px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">Today</span>
                }
                if (activeDay === tomorrowDayName && ALL_DAYS.includes(tomorrowDayName as DayName)) {
                  return <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Tomorrow</span>
                }
                // If it's beyond tomorrow, show the actual date
                const activeIdx = ALL_DAYS.indexOf(activeDay as DayName)
                if (activeIdx >= 0 && activeDay !== today) {
                  const daysUntil = (ALL_DAYS.indexOf(activeDay as DayName) - (todayIdx === 0 ? 6 : todayIdx - 1) + 7) % 7
                  if (daysUntil > 1) {
                    const d = new Date()
                    d.setDate(d.getDate() + ((ALL_DAYS.indexOf(activeDay as DayName) + 1 - todayIdx + 7) % 7 || 7))
                    return <span className={`text-[8px] font-black uppercase tracking-widest ${dm ? "text-slate-400 bg-slate-700/40" : "text-slate-500 bg-slate-100"} px-2 py-0.5 rounded-full`}>{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  }
                }
                return null
              })()}
            </h2>
            <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${sub}`}>
              {byDay[activeDay]?.length ?? 0} period{(byDay[activeDay]?.length ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {(byDay[activeDay] ?? []).length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className={`text-xs ${dm ? "text-slate-600" : "text-slate-400"}`}>No classes on {activeDay}</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {(byDay[activeDay] ?? []).map((p, i) => (
              <PeriodCard
                key={p.id}
                period={p}
                idx={i}
                color={colorMap[p.subject] ?? COLORS[0]}
                students={students}
                loading={studLoad}
                dm={dm}
                onStudentClick={onStudentClick}
                onLinkUpdated={onLinkUpdated}
                session={session}
                schoolYear={schoolYear}
              />
            ))}
          </div>
        )}
      </div>

      {/* Weekly overview */}
      <div className={`rounded-2xl md:rounded-3xl border overflow-hidden shadow-sm ${card}`}>
        <div className={`px-5 py-3 border-b ${divB}`}>
          <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${sub}`}>Weekly Overview</p>
        </div>
        <div className="p-4 space-y-1.5">
          {ALL_DAYS.map(d => {
            const isActive = activeDay === d
            const isToday  = d === today
            return (
              <div key={d} className={`flex items-start gap-3 px-2 py-1.5 rounded-xl transition-colors ${isActive ? (dm ? "bg-blue-500/8" : "bg-blue-50/70") : ""}`}>
                <button
                  onClick={() => setActiveDay(d)}
                  className={`text-[9px] font-black uppercase tracking-wider w-8 flex-shrink-0 mt-1 transition-colors flex flex-col items-center gap-0.5
                    ${isActive ? "text-blue-500" : (dm ? "text-slate-500 hover:text-blue-400" : "text-slate-400 hover:text-blue-500")}`}
                >
                  {d.slice(0, 3)}
                  {isToday && <span className="w-1 h-1 rounded-full bg-blue-400" />}
                </button>
                <div className="flex-1 flex gap-1.5 flex-wrap">
                  {byDay[d].length === 0
                    ? <span className={`text-[9px] mt-1 ${dm ? "text-slate-700" : "text-slate-300"}`}>No classes</span>
                    : byDay[d].map(p => {
                        const col = colorMap[p.subject] ?? COLORS[0]
                        return (
                          <button
                            key={p.id}
                            onClick={() => setActiveDay(d)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[9px] font-bold transition-all hover:opacity-75 hover:scale-[0.98] ${col.bg} ${col.border} ${col.text}`}
                          >
                            <span className={`w-1 h-1 rounded-full shrink-0 ${col.dot}`} />
                            {p.subject} · {fmt(p.start_time)}
                          </button>
                        )
                      })
                  }
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}