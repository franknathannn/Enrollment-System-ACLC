// sections/components/schedule/ScheduleGrid.tsx

import { memo, useMemo } from "react"
import { CalendarDays, Clock, BookOpen, Pencil, Trash2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DAYS, formatTime } from "./types"
import type { ScheduleRow } from "./types"

interface ScheduleGridProps {
  schedules: ScheduleRow[]
  isICT: boolean
  isDarkMode: boolean
  sectionName: string
  onEdit: (row: ScheduleRow) => void
  onDelete: (id: string, label: string) => void
}

const SUBJECT_COLORS = [
  { bg: "bg-blue-500/10",    border: "border-blue-500/25",    text: "text-blue-400"    },
  { bg: "bg-violet-500/10",  border: "border-violet-500/25",  text: "text-violet-400"  },
  { bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-400" },
  { bg: "bg-amber-500/10",   border: "border-amber-500/25",   text: "text-amber-400"   },
  { bg: "bg-rose-500/10",    border: "border-rose-500/25",    text: "text-rose-400"    },
  { bg: "bg-cyan-500/10",    border: "border-cyan-500/25",    text: "text-cyan-400"    },
  { bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/25", text: "text-fuchsia-400" },
  { bg: "bg-teal-500/10",    border: "border-teal-500/25",    text: "text-teal-400"    },
  { bg: "bg-orange-500/10",  border: "border-orange-500/25",  text: "text-orange-400"  },
  { bg: "bg-lime-500/10",    border: "border-lime-500/25",    text: "text-lime-400"    },
  { bg: "bg-sky-500/10",     border: "border-sky-500/25",     text: "text-sky-400"     },
  { bg: "bg-pink-500/10",    border: "border-pink-500/25",    text: "text-pink-400"    },
]

export const ScheduleGrid = memo(function ScheduleGrid({
  schedules,
  isICT,
  isDarkMode,
  sectionName,
  onEdit,
  onDelete,
}: ScheduleGridProps) {
  const accent    = isICT ? "text-blue-400"  : "text-orange-400"
  const accentBg  = isICT ? "bg-blue-500"    : "bg-orange-500"

  const subjectColorMap = useMemo(() => {
    const unique = [...new Set(schedules.map(s => s.subject))]
    return Object.fromEntries(unique.map((sub, i) => [sub, SUBJECT_COLORS[i % SUBJECT_COLORS.length]]))
  }, [schedules])

  const byDay = useMemo(() => {
    const map: Record<string, ScheduleRow[]> = {}
    for (const day of DAYS) {
      map[day] = schedules
        .filter(s => s.day === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
    }
    return map
  }, [schedules])

  const totalSubjects = new Set(schedules.map(s => s.subject)).size

  if (schedules.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-32 rounded-3xl border-2 border-dashed
        ${isDarkMode ? "border-slate-800 text-slate-600" : "border-slate-200 text-slate-400"}`}>
        <CalendarDays size={48} strokeWidth={1} className="mb-4 opacity-30" />
        <p className="font-black uppercase tracking-[0.4em] text-xs opacity-40">No Schedule Configured</p>
        <p className="text-[10px] mt-1 opacity-30">Click "Add Subject" above to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-4 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${accentBg}`} />
          <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            {sectionName}
          </span>
        </div>
        <span className={`text-[10px] font-bold ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
          {schedules.length} period{schedules.length !== 1 ? "s" : ""} · {totalSubjects} subject{totalSubjects !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── MOBILE: stacked cards ── */}
      <div className="md:hidden space-y-4">
        {DAYS.filter(d => byDay[d].length > 0).map(day => (
          <div key={day} className={`rounded-2xl border overflow-hidden
            ${isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
            <div className={`px-4 py-2 flex items-center gap-2
              ${isDarkMode ? "bg-slate-800/80" : "bg-slate-50"}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${accentBg}`} />
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${accent}`}>{day}</span>
            </div>
            <div className={`divide-y ${isDarkMode ? "divide-slate-800" : "divide-slate-100"}`}>
              {byDay[day].map(s => {
                const color = subjectColorMap[s.subject]
                return (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 group">
                    <div className={`flex-shrink-0 rounded-lg border px-2 py-1 ${color.bg} ${color.border}`}>
                      <Clock size={10} className={color.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black uppercase truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        {s.subject}
                      </p>
                      <p className={`text-[10px] font-bold ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {formatTime(s.start_time)} – {formatTime(s.end_time)}
                        {s.room && <span className="ml-2 opacity-60">{s.room}</span>}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => onEdit(s)}
                        className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => onDelete(s.id, s.subject)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500 hover:text-white transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── DESKTOP: timetable grid ── */}
      <div className="hidden md:block overflow-x-auto">
        <div className={`rounded-3xl border overflow-hidden
          ${isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>

          {/* Day headers */}
          <div className={`grid border-b ${isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-slate-50 border-slate-200"}`}
            style={{ gridTemplateColumns: `130px repeat(${DAYS.length}, 1fr)` }}>
            <div className="px-4 py-3" />
            {DAYS.map(day => (
              <div key={day} className="px-3 py-3 text-center">
                <p className={`text-[10px] font-black uppercase tracking-[0.15em]
                  ${byDay[day].length > 0 ? accent : (isDarkMode ? "text-slate-600" : "text-slate-400")}`}>
                  {day.slice(0, 3)}
                </p>
                <p className={`text-[9px] font-bold mt-0.5 ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
                  {byDay[day].length} period{byDay[day].length !== 1 ? "s" : ""}
                </p>
              </div>
            ))}
          </div>

          {/* Time slot rows */}
          {[...new Set(schedules.map(s => s.start_time))].sort().map((time, tIdx) => (
            <div key={time}
              className={`grid border-b last:border-b-0
                ${isDarkMode
                  ? tIdx % 2 === 0 ? "bg-transparent" : "bg-slate-800/20"
                  : tIdx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                } ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}
              style={{ gridTemplateColumns: `130px repeat(${DAYS.length}, 1fr)` }}>

              {/* Time label */}
              <div className={`flex flex-col justify-center px-4 py-3 border-r
                ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
                <p className={`text-[10px] font-black tabular-nums ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                  {formatTime(time)}
                </p>
              </div>

              {/* Day cells */}
              {DAYS.map(day => {
                const entry = byDay[day].find(s => s.start_time === time)
                const color = entry ? subjectColorMap[entry.subject] : null
                return (
                  <div key={day} className={`px-2 py-2 border-r last:border-r-0
                    ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
                    {entry && color ? (
                      <div className={`rounded-xl border px-3 py-2 h-full relative ${color.bg} ${color.border}`}
                        onMouseEnter={e => {
                          const btns = e.currentTarget.querySelector<HTMLElement>("[data-actions]")
                          if (btns) btns.style.opacity = "1"
                        }}
                        onMouseLeave={e => {
                          const btns = e.currentTarget.querySelector<HTMLElement>("[data-actions]")
                          if (btns) btns.style.opacity = "0"
                        }}>
                        <p className={`text-[11px] font-black uppercase leading-tight ${color.text}`}>
                          {entry.subject}
                        </p>
                        <p className={`text-[9px] mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                          {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
                        </p>
                        {entry.teacher && (
                          <p className={`text-[8px] mt-0.5 opacity-60 truncate ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                            {entry.teacher}
                          </p>
                        )}
                        {entry.room && (
                          <p className={`text-[8px] opacity-50 truncate ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                            {entry.room}
                          </p>
                        )}
                        {/* Edit / Delete actions */}
                        <div data-actions
                          style={{ opacity: 0, transition: "opacity 0.15s" }}
                          className="absolute top-1.5 right-1.5 flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button onClick={() => onEdit(entry)}
                                className={`p-1 rounded-lg transition-colors ${isDarkMode ? "bg-slate-700 hover:bg-slate-600 text-slate-300" : "bg-white hover:bg-slate-100 text-slate-600"} shadow-sm`}>
                                <Pencil size={10} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Edit</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button onClick={() => onDelete(entry.id, entry.subject)}
                                className="p-1 rounded-lg bg-red-500 hover:bg-red-600 text-white shadow-sm transition-colors">
                                <Trash2 size={10} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-red-950 text-red-200 border-red-900"><p>Delete</p></TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <span className={`text-[10px] ${isDarkMode ? "text-slate-800" : "text-slate-200"}`}>—</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Subject legend */}
      <div className="flex flex-wrap gap-2 px-1">
        {Object.entries(subjectColorMap).map(([subject, color]) => (
          <div key={subject} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${color.bg} ${color.border}`}>
            <BookOpen size={9} className={color.text} />
            <span className={`text-[9px] font-black uppercase tracking-wider ${color.text}`}>{subject}</span>
          </div>
        ))}
      </div>
    </div>
  )
})