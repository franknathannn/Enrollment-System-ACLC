// app/status/components/ScheduleView.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { Clock, MapPin, User, Loader2, Globe, ExternalLink } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { ALL_DAYS, SUBJ_COLORS, fmt, todayDayName, type ScheduleRow } from "../types"

interface Props {
  section: string
  schoolYear: string
  dm?: boolean
}

export function ScheduleView({ section, schoolYear, dm = true }: Props) {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [activeDay, setActiveDay] = useState(todayDayName())

  useEffect(() => {
    setLoading(true)
    supabase
      .from("schedules")
      .select("*")
      .eq("section", section)
      .eq("school_year", schoolYear)
      .order("day").order("start_time")
      .then(({ data }) => { setSchedules(data ?? []); setLoading(false) })
  }, [section, schoolYear])

  const colorMap = useMemo(() => {
    const unique = [...new Set(schedules.map(s => s.subject))]
    return Object.fromEntries(unique.map((sub, i) => [sub, SUBJ_COLORS[i % SUBJ_COLORS.length]]))
  }, [schedules])

  const byDay = useMemo(() => {
    const map: Record<string, ScheduleRow[]> = {}
    for (const d of ALL_DAYS) map[d] = schedules.filter(s => s.day === d)
    return map
  }, [schedules])

  if (loading) return (
    <div className="flex items-center justify-center gap-3 py-8">
      <Loader2 className="animate-spin text-blue-500 w-5 h-5" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Loading schedule…</p>
    </div>
  )

  if (schedules.length === 0) return (
    <p className="text-center text-[11px] text-slate-600 py-6 uppercase tracking-widest">
      No schedules assigned yet for {section}.
    </p>
  )

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-slate-600">
        <span>{schedules.length} period{schedules.length !== 1 ? "s" : ""}</span>
        <span>{[...new Set(schedules.map(s => s.subject))].length} subject{[...new Set(schedules.map(s => s.subject))].length !== 1 ? "s" : ""}</span>
        <span>{ALL_DAYS.filter(d => byDay[d].length > 0).length} active day{ALL_DAYS.filter(d => byDay[d].length > 0).length !== 1 ? "s" : ""}</span>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {ALL_DAYS.map(d => {
          const count  = byDay[d]?.length ?? 0
          const active = activeDay === d
          const today  = d === todayDayName()
          return (
            <button
              key={d}
              onClick={() => setActiveDay(d)}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                ${active
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : count > 0
                    ? dm
                      ? "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                      : "border border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200"
                    : dm
                      ? "border border-white/5 text-slate-700"
                      : "border border-slate-100 text-slate-300"
                }`}
            >
              {d.slice(0,3)}
              {today && !active && <span className="w-1 h-1 rounded-full bg-blue-400" />}
              <span className={`text-[8px] font-bold ${active ? "text-white/60" : dm ? "text-slate-700" : "text-slate-400"}`}>
                {count || "—"}
              </span>
            </button>
          )
        })}
      </div>

      {/* Period cards */}
      {(byDay[activeDay] ?? []).length === 0 ? (
        <p className="text-center text-[11px] text-slate-700 py-4 uppercase tracking-widest">No class on {activeDay}</p>
      ) : (
        <div className="space-y-2">
          {(byDay[activeDay] ?? []).map((s: ScheduleRow) => {
            const col = colorMap[s.subject] ?? SUBJ_COLORS[0]
            return (
              <div key={s.id} className={`rounded-2xl border p-4 ${col.bg} ${col.border}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-black ${col.text}`}>{s.subject}</p>
                      {s.is_online && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full">
                          <Globe size={8} /> online
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500">
                        <Clock size={10} /> {fmt(s.start_time)} – {fmt(s.end_time)}
                      </span>
                      {!s.is_online && s.room && (
                        <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500">
                          <MapPin size={10} /> {s.room}
                        </span>
                      )}
                    </div>
                    {s.teacher && (
                      <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600 mt-1">
                        <User size={10} /> {s.teacher}
                      </span>
                    )}
                    {s.is_online && s.gclass_link && (
                      <a
                        href={s.gclass_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 text-[9px] font-black text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ExternalLink size={9} /> Open Google Classroom
                      </a>
                    )}
                  </div>
                  <span className={`flex-shrink-0 w-2 h-2 rounded-full mt-1 ${col.dot}`} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Weekly overview (mini) */}
      <div className="pt-2 border-t border-white/5 space-y-2">
        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-700">Weekly Overview</p>
        {ALL_DAYS.map(d => (
          <div key={d} className="flex items-center gap-2">
            <button
              onClick={() => setActiveDay(d)}
              className={`text-[9px] font-black uppercase tracking-wider w-8 flex-shrink-0 transition-colors ${activeDay === d ? "text-blue-400" : "text-slate-700 hover:text-slate-500"}`}
            >
              {d.slice(0,3)}
            </button>
            <div className="flex-1 flex gap-1.5 flex-wrap">
              {byDay[d].length === 0
                ? <span className="text-[9px] text-slate-800">—</span>
                : byDay[d].map((s: ScheduleRow) => {
                    const col = colorMap[s.subject] ?? SUBJ_COLORS[0]
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActiveDay(d)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[8px] font-bold transition-opacity hover:opacity-80 ${col.bg} ${col.border} ${col.text}`}
                      >
                        {s.subject} · {fmt(s.start_time)}
                        {s.is_online && <span className="text-blue-400 font-black ml-0.5">(online)</span>}
                      </button>
                    )
                  })
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}