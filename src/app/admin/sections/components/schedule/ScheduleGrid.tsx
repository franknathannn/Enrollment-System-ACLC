// sections/components/schedule/ScheduleGrid.tsx

import { memo, useMemo } from "react"
import { CalendarDays, Clock, BookOpen, Pencil, Trash2, Globe } from "lucide-react"
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
  
  const { minMins, maxMins, timeLabels, gridH } = useMemo(() => {
    if (schedules.length === 0) return { minMins: 420, maxMins: 1020, timeLabels: [], gridH: 0 }
    
    const toM = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }
    
    let min = 24 * 60
    let max = 0
    schedules.forEach(s => {
      const start = toM(s.start_time)
      const end = toM(s.end_time)
      if (start < min) min = start
      if (end > max) max = end
    })
    
    // Snap exactly to 30-minute bounds instead of whole hours
    const minMins = Math.floor(min / 30) * 30
    const maxMins = Math.ceil(max / 30) * 30
    
    const labels = []
    for (let m = minMins; m <= maxMins; m += 30) labels.push(m)
    
    return { minMins, maxMins, timeLabels: labels, gridH: (labels.length - 1) * 44 + 20 }
  }, [schedules])
  
  const toDisp = (m: number) => {
    const h = Math.floor(m / 60)
    const min = m % 60
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hr = h % 12 || 12
    return `${hr}:${min.toString().padStart(2, '0')} ${ampm}`
  }

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
                      <p className={`text-[10px] font-bold ${isDarkMode ? "text-slate-400" : "text-slate-500"} flex items-center gap-1.5`}>
                        {formatTime(s.start_time)} – {formatTime(s.end_time)}
                        {s.is_online
                          ? <span className="ml-1 flex items-center gap-0.5 text-blue-400"><Globe size={9} /> Online</span>
                          : s.room && <span className="ml-2 opacity-60">{s.room}</span>}
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
      
      {/* ── DESKTOP: timetable canvas ── */}
      <div className="hidden md:block overflow-x-auto">
        <div className={`rounded-[24px] border overflow-hidden
          ${isDarkMode ? "bg-slate-900/40 border-slate-800/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.35)]" : "bg-white border-slate-200 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)]"}`}
          style={{ width: "fit-content", minWidth: "100%" }}>
          
          <div id="schedule-grid-capture" style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 800 }}>
             
             {/* Sticky Header */}
             <div style={{ 
               display: 'flex', 
               borderBottom: `1px solid ${isDarkMode ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.15)'}`,
               background: isDarkMode ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
               backdropFilter: 'blur(12px)',
               position: 'sticky', top: 0, zIndex: 30
             }}>
                {/* Time Gutter Header */}
                <div style={{ width: 70, minWidth: 70, borderRight: `1px solid ${isDarkMode ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.15)'}` }} />
                
                {DAYS.map(day => (
                  <div key={day} style={{ 
                    flex: 1, padding: '12px 8px', textAlign: 'center', 
                    borderRight: day !== 'Saturday' ? `1px solid ${isDarkMode ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.15)'}` : 'none' 
                  }}>
                     <p className={`text-[11px] font-black uppercase tracking-[0.05em]
                       ${byDay[day].length > 0 ? accent : (isDarkMode ? "text-slate-600" : "text-slate-400")}`}>
                       {day}
                     </p>
                     <p className={`text-[7.5px] font-bold mt-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                       {byDay[day].length} period{byDay[day].length !== 1 ? "s" : ""}
                     </p>
                  </div>
                ))}
             </div>

             {/* Absolute Timetable Body */}
             <div style={{ display: 'flex', position: 'relative', height: gridH }}>
                
                {/* Time Axis */}
                <div style={{ 
                  width: 70, minWidth: 70, position: 'relative', zIndex: 15,
                  borderRight: `1px solid ${isDarkMode ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.15)'}`,
                  background: isDarkMode ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
                }}>
                   {timeLabels.map((m, i) => {
                     const isHour = m % 60 === 0
                     return (
                       <div key={m} style={{
                         position: "absolute", top: i * 44, left: 0, right: 0, height: 20,
                         display: "flex", alignItems: "center", justifyContent: "flex-end", 
                         paddingRight: 10, pointerEvents: "none"
                       }}>
                         <span className={`tabular-nums tracking-wide ${isHour ? "font-black text-[9.5px]" : "font-semibold text-[7.5px]"} 
                           ${isDarkMode ? (isHour ? "text-slate-300" : "text-slate-600") : (isHour ? "text-slate-600" : "text-slate-400")}`}>
                           {toDisp(m)}
                         </span>
                       </div>
                     )
                   })}
                </div>

                {/* Day Columns */}
                {DAYS.map((day, dIdx) => (
                   <div key={day} style={{ 
                     flex: 1, position: 'relative', overflow: 'hidden',
                     borderRight: dIdx < DAYS.length-1 ? `1px solid ${isDarkMode ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.15)'}` : 'none' 
                   }}>
                      
                      {/* Grid Horizontal Lines */}
                      {timeLabels.slice(0, -1).map((m, i) => {
                        const isHour = m % 60 === 0
                        return (
                          <div key={m} style={{
                            position: "absolute", top: (i * 44) + 10, left: 0, right: 0, height: 44, pointerEvents: "none",
                            borderBottom: `1px solid ${isDarkMode ? (isHour ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)') : (isHour ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.04)')}`,
                            background: isDarkMode ? (isHour ? 'rgba(255,255,255,0.015)' : 'transparent') : (isHour ? 'rgba(0,0,0,0.01)' : 'transparent')
                          }}/>
                        )
                      })}

                      {/* Absolute Cards */}
                      {byDay[day].map(s => {
                         const color = subjectColorMap[s.subject]
                         if (!color) return null

                         const [hStart, mStart] = s.start_time.split(':').map(Number)
                         const [hEnd, mEnd] = s.end_time.split(':').map(Number)
                         const startMins = hStart * 60 + mStart
                         const endMins = hEnd * 60 + mEnd
                         
                         const top = ((startMins - minMins) / 30) * 44
                         const height = ((endMins - startMins) / 30) * 44
                         
                         const isExtremelyCompact = height <= 50
                         
                         return (
                           <div key={s.id} 
                                className={`absolute left-1.5 right-1.5 rounded-[14px] border ${isExtremelyCompact ? 'p-1.5' : 'p-2.5'} flex flex-col hover:z-20 transition-all ${color.bg} ${color.border} hover:shadow-xl overflow-hidden`}
                                style={{ top: top + 11.5, height: height - 3, zIndex: 10, backdropFilter: 'blur(4px)' }}
                                onMouseEnter={e => {
                                  const btns = e.currentTarget.querySelector<HTMLElement>("[data-actions]")
                                  if (btns) btns.style.opacity = "1"
                                }}
                                onMouseLeave={e => {
                                  const btns = e.currentTarget.querySelector<HTMLElement>("[data-actions]")
                                  if (btns) btns.style.opacity = "0"
                                }}>
                              
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start gap-1">
                                    <p className={`${isExtremelyCompact ? 'text-[8.5px]' : 'text-[10px]'} font-black uppercase leading-[1.2] tracking-[0.05em] ${color.text} truncate`}>
                                      {s.subject}
                                    </p>
                                    {isExtremelyCompact && (
                                      <p className={`text-[7px] font-bold opacity-70 ${isDarkMode ? "text-white" : "text-slate-900"} flex-shrink-0 leading-none`}>
                                        {formatTime(s.start_time)}
                                      </p>
                                    )}
                                  </div>
                                  {!isExtremelyCompact && (
                                    <p className={`text-[8.5px] mt-1 font-bold opacity-80 ${isDarkMode ? "text-white" : "text-slate-900"} truncate`}>
                                       {formatTime(s.start_time)} <span className="opacity-50 mx-0.5">–</span> {formatTime(s.end_time)}
                                    </p>
                                  )}
                                </div>
                                
                                <div className={`${isExtremelyCompact ? 'mt-0 flex justify-between items-baseline gap-2' : 'mt-auto flex-col space-y-0.5'}`} style={{ opacity: 0.6 }}>
                                   {s.teacher && <p className={`text-[7.5px] font-bold truncate ${isDarkMode ? "text-slate-200" : "text-slate-600"}`}>{s.teacher}</p>}
                                   {s.is_online
                                     ? <p className={`text-[7.5px] flex items-center gap-0.5 text-blue-400 font-bold`}><Globe size={7} /> Online</p>
                                     : s.room && <p className={`text-[7.5px] truncate ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{s.room}</p>}
                                </div>

                                <div data-actions
                                  style={{ opacity: 0, transition: "opacity 0.15s" }}
                                  className="absolute top-1.5 right-1.5 flex gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button onClick={() => onEdit(s)}
                                        className={`p-1.5 rounded-[10px] transition-colors border shadow-sm
                                          ${isDarkMode ? "bg-slate-900/60 hover:bg-slate-800 border-slate-700/50 text-slate-300" 
                                                       : "bg-white/80 hover:bg-white border-slate-200/50 text-slate-600"}`}>
                                        <Pencil size={11} />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Edit</p></TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button onClick={() => onDelete(s.id, s.subject)}
                                        className="p-1.5 rounded-[10px] bg-red-500 hover:bg-red-600 text-white shadow-sm border border-black/5 transition-colors">
                                        <Trash2 size={11} />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-red-950 text-red-200 border-red-900"><p>Delete</p></TooltipContent>
                                  </Tooltip>
                                </div>
                           </div>
                         )
                      })}
                   </div>
                ))}
             </div>
          </div>
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