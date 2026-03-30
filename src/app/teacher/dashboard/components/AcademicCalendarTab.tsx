// src/app/teacher/dashboard/components/AcademicCalendarTab.tsx
// Read-only academic calendar for teachers.
// Auto-fetches public holidays from Nager.Date API (free, no key needed).
// Default country: PH (Philippines). Teacher can switch country.
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  CalendarDays, ChevronLeft, ChevronRight, Loader2,
  Star, Users, BookOpen, CalendarOff, Globe, Flag,
} from "lucide-react"
import { supabase } from "@/lib/supabase/teacher-client"

interface CalendarEvent {
  id: string
  title: string
  description?: string
  event_date: string
  end_date?: string
  event_type: "holiday" | "event" | "meeting" | "exam" | "suspension"
  color: string
  school_year: string
  source?: "admin" | "public"
}

interface PublicHoliday {
  date: string
  localName: string
  name: string
  types: string[]
}

interface Props {
  dm: boolean
  schoolYear: string
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"]

const COUNTRIES = [
  { code: "PH", flag: "🇵🇭", name: "Philippines" },
  { code: "US", flag: "🇺🇸", name: "United States" },
  { code: "JP", flag: "🇯🇵", name: "Japan" },
  { code: "KR", flag: "🇰🇷", name: "South Korea" },
  { code: "SG", flag: "🇸🇬", name: "Singapore" },
  { code: "AU", flag: "🇦🇺", name: "Australia" },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom" },
  { code: "CA", flag: "🇨🇦", name: "Canada" },
  { code: "DE", flag: "🇩🇪", name: "Germany" },
  { code: "FR", flag: "🇫🇷", name: "France" },
]

const EVENT_TYPE_ICON: Record<string, React.ReactNode> = {
  holiday:    <CalendarOff size={10} />,
  event:      <Star size={10} />,
  meeting:    <Users size={10} />,
  exam:       <BookOpen size={10} />,
  suspension: <CalendarOff size={10} />,
}

const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  holiday:    { bg: "bg-red-500/15",    text: "text-red-500",    border: "border-red-500/30"    },
  event:      { bg: "bg-blue-500/15",   text: "text-blue-500",   border: "border-blue-500/30"   },
  meeting:    { bg: "bg-purple-500/15", text: "text-purple-500", border: "border-purple-500/30" },
  exam:       { bg: "bg-amber-500/15",  text: "text-amber-500",  border: "border-amber-500/30"  },
  suspension: { bg: "bg-orange-500/15", text: "text-orange-500", border: "border-orange-500/30" },
}

const todayStr = () => new Date().toISOString().split("T")[0]

// ── In-memory holiday cache ───────────────────────────────────────────────────
const holidayCache: Record<string, PublicHoliday[]> = {}

async function fetchPublicHolidays(year: number, countryCode: string): Promise<PublicHoliday[]> {
  const key = `${year}_${countryCode}`
  if (holidayCache[key]) return holidayCache[key]
  try {
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const data: PublicHoliday[] = await res.json()
    holidayCache[key] = data
    return data
  } catch {
    return []
  }
}

function publicHolidayToEvent(h: PublicHoliday, countryCode: string): CalendarEvent {
  return {
    id:          `nager_${countryCode}_${h.date}`,
    title:       h.localName || h.name,
    description: h.localName !== h.name ? h.name : undefined,
    event_date:  h.date,
    event_type:  "holiday",
    color:       "#ef4444",
    school_year: h.date.slice(0, 4),
    source:      "public",
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export function AcademicCalendarTab({ dm, schoolYear }: Props) {
  const [adminEvents, setAdminEvents]             = useState<CalendarEvent[]>([])
  const [publicHols,  setPublicHols]              = useState<CalendarEvent[]>([])
  const [loading,     setLoading]                 = useState(false)
  const [holLoading,  setHolLoading]              = useState(false)
  const [year,        setYear]                    = useState(() => new Date().getFullYear())
  const [month,       setMonth]                   = useState(() => new Date().getMonth())
  const [selected,    setSelected]                = useState<string | null>(null)
  const [country,     setCountry]                 = useState("PH")
  const [showPicker,  setShowPicker]              = useState(false)
  const [showHols,    setShowHols]                = useState(true)

  const card = dm ? "bg-slate-900/60 border-slate-700/50" : "bg-white border-slate-200"
  const sub  = dm ? "text-slate-400" : "text-slate-500"
  const head = dm ? "text-white" : "text-slate-900"
  const divB = dm ? "border-slate-700/40" : "border-slate-100"

  // Load admin events
  const loadAdmin = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from("school_calendar_events").select("*")
        .eq("school_year", schoolYear).order("event_date")
      setAdminEvents((data || []).map((e: any) => ({ ...e, source: "admin" as const })))
    } finally { setLoading(false) }
  }, [schoolYear])

  useEffect(() => { loadAdmin() }, [loadAdmin])

  useEffect(() => {
    const ch = supabase.channel("academic_cal_teacher_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "school_calendar_events" }, loadAdmin)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [loadAdmin])

  // Load public holidays for current view-year (and next year for cross-year school years)
  useEffect(() => {
    if (!showHols) { setPublicHols([]); return }
    setHolLoading(true)
    const years = year === new Date().getFullYear() ? [year] : [year]
    Promise.all(years.map(y => fetchPublicHolidays(y, country)))
      .then(results => {
        const all = results.flat().map(h => publicHolidayToEvent(h, country))
        const seen = new Set<string>()
        setPublicHols(all.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true }))
      })
      .finally(() => setHolLoading(false))
  }, [year, country, showHols])

  // Merge: admin events override public holidays on same date
  const allEvents = useMemo<CalendarEvent[]>(() => {
    if (!showHols) return adminEvents
    const adminHolDates = new Set(adminEvents.filter(e => e.event_type === "holiday").map(e => e.event_date))
    return [...adminEvents, ...publicHols.filter(h => !adminHolDates.has(h.event_date))]
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
  }, [adminEvents, publicHols, showHols])

  const daysInMonth    = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()

  const eventsForDay = useCallback((dateStr: string) =>
    allEvents.filter(e => e.end_date ? dateStr >= e.event_date && dateStr <= e.end_date : e.event_date === dateStr),
  [allEvents])

  const selectedEvents = selected ? eventsForDay(selected) : []
  const monthEvents    = allEvents.filter(e => e.event_date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
  const selectedCountry = COUNTRIES.find(c => c.code === country)

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className={`rounded-2xl md:rounded-3xl border overflow-hidden ${card}`}>

        {/* Header */}
        <div className={`px-5 py-4 border-b ${divB}`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${sub}`}>Academic Calendar</p>
              <p className={`text-sm font-black mt-0.5 ${head}`}>{schoolYear}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {/* Row 1: Holiday toggle + Country picker */}
              <div className="flex items-center gap-2">
                {(loading || holLoading) && <Loader2 size={13} className="animate-spin text-blue-400" />}

                {/* Holiday toggle */}
                <button onClick={() => setShowHols(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wide border transition-all
                    ${showHols
                      ? (dm ? "bg-red-500/15 border-red-500/30 text-red-400" : "bg-red-50 border-red-200 text-red-600")
                      : (dm ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400")}`}>
                  <Flag size={10} /> {showHols ? "Holidays ON" : "Holidays OFF"}
                </button>

                {/* Country picker */}
                {showHols && (
                  <div className="relative">
                    <button onClick={() => setShowPicker(v => !v)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wide border transition-all
                        ${dm ? "border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-700" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}>
                      <Globe size={10} /> {selectedCountry?.flag} {selectedCountry?.code}
                    </button>
                    {showPicker && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
                        <div className={`absolute right-0 top-full mt-1.5 z-50 rounded-2xl border shadow-xl overflow-hidden w-52
                          ${dm ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
                          {COUNTRIES.map(c => (
                            <button key={c.code} onClick={() => { setCountry(c.code); setShowPicker(false) }}
                              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[10px] font-bold transition-colors
                                ${country === c.code
                                  ? "bg-blue-600 text-white"
                                  : (dm ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-50 text-slate-700")}`}>
                              <span className="text-base leading-none">{c.flag}</span>
                              <span>{c.name}</span>
                              {country === c.code && <span className="ml-auto text-[8px]">✓</span>}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Row 2: Month nav */}
              <div className="flex items-center gap-2">
                <button onClick={() => { const d = new Date(year, month - 1); setMonth(d.getMonth()); setYear(d.getFullYear()); setSelected(null) }}
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center ${dm ? "border-slate-700 hover:bg-slate-700" : "border-slate-200 hover:bg-slate-100"}`}>
                  <ChevronLeft size={14} className={sub} />
                </button>
                <span className={`text-[11px] font-black min-w-[100px] text-center ${head}`}>{MONTH_NAMES[month]} {year}</span>
                <button onClick={() => { const d = new Date(year, month + 1); setMonth(d.getMonth()); setYear(d.getFullYear()); setSelected(null) }}
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center ${dm ? "border-slate-700 hover:bg-slate-700" : "border-slate-200 hover:bg-slate-100"}`}>
                  <ChevronRight size={14} className={sub} />
                </button>
              </div>
            </div>
          </div>
          {showHols && (
            <p className={`text-[8px] mt-2 ${sub}`}>
              Public holidays via <span className="font-black">Nager.Date API</span> · {selectedCountry?.flag} {selectedCountry?.name}
            </p>
          )}
        </div>

        {/* Calendar grid */}
        <div className="p-4">
          <div className="grid grid-cols-7 mb-1">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
              <div key={d} className={`text-center text-[11px] font-black uppercase tracking-widest py-1 ${sub}`}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day     = i + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
              const dayEvs  = eventsForDay(dateStr)
              const isToday    = dateStr === todayStr()
              const isSelected = dateStr === selected
              const isSunday   = new Date(dateStr).getDay() === 0
              const hasHoliday    = dayEvs.some(e => e.event_type === "holiday")
              const hasSuspension = dayEvs.some(e => e.event_type === "suspension")
              const hasAny        = dayEvs.length > 0

              const cellBg = hasHoliday
                ? (dm ? "bg-red-500/20" : "bg-red-100")
                : hasSuspension
                  ? (dm ? "bg-orange-500/20" : "bg-orange-100")
                  : hasAny
                    ? (dm ? "bg-blue-500/10 hover:bg-blue-500/20" : "bg-blue-50 hover:bg-blue-100")
                    : isSunday
                      ? (dm ? "bg-slate-800/30" : "bg-slate-50")
                      : (dm ? "hover:bg-slate-800/40" : "hover:bg-slate-50")

              return (
                <button key={day} onClick={() => setSelected(isSelected ? null : dateStr)}
                  title={dayEvs.map(e => e.title).join(" · ") || undefined}
                  style={{ minHeight: 52 }}
                  className={`relative w-full rounded-xl flex flex-col items-start justify-start p-1.5 transition-all overflow-hidden
                    ${isSelected ? `ring-2 ring-blue-500 ring-offset-1 ${dm ? "ring-offset-slate-900" : "ring-offset-white"}` : ""}
                    ${isToday ? (dm ? "border border-blue-500/60" : "border-2 border-blue-400") : "border border-transparent"}
                    ${cellBg}`}>
                  <span className={`text-[11px] font-black leading-none ${isToday ? "text-blue-500" : isSunday ? (dm ? "text-slate-600" : "text-slate-300") : head}`}>
                    {day}
                  </span>
                  {hasAny && (
                    <div className="flex flex-col gap-px w-full mt-1">
                      {dayEvs.slice(0, 2).map(e => {
                        const isPublic = e.source === "public"
                        const dotColor = isPublic || e.event_type === "holiday" ? "#ef4444"
                          : e.event_type === "suspension" ? "#f97316"
                          : e.event_type === "exam" ? "#f59e0b"
                          : e.event_type === "meeting" ? "#a855f7" : "#3b82f6"
                        const txtColor = isPublic || e.event_type === "holiday"
                          ? (dm ? "text-red-400" : "text-red-700")
                          : e.event_type === "suspension" ? (dm ? "text-orange-400" : "text-orange-700")
                          : e.event_type === "exam" ? (dm ? "text-amber-400" : "text-amber-700")
                          : e.event_type === "meeting" ? (dm ? "text-purple-400" : "text-purple-700")
                          : (dm ? "text-blue-400" : "text-blue-700")
                        return (
                          <div key={e.id} className="flex items-start gap-0.5 w-full min-w-0">
                            <div style={{ width: 5, height: 5, borderRadius: "50%", background: dotColor, marginTop: 2, flexShrink: 0 }} />
                            <span className={`text-[9px] font-bold leading-tight break-words ${txtColor}`}
                              style={{ wordBreak: "break-word", overflowWrap: "anywhere", lineClamp: 2, WebkitLineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {e.title}
                            </span>
                          </div>
                        )
                      })}
                      {dayEvs.length > 2 && (
                        <span style={{ fontSize: 6 }} className={sub}>+{dayEvs.length - 2} more</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {[
              { color: dm ? "bg-red-500/20" : "bg-red-100",                         label: "Holiday" },
              { color: dm ? "bg-orange-500/20" : "bg-orange-100",                   label: "Suspended" },
              { color: dm ? "bg-blue-500/10" : "bg-blue-50",                        label: "Event/Meeting" },
              { color: dm ? "bg-red-500/30" : "bg-red-200",                         label: `${selectedCountry?.flag ?? "🇵🇭"} Public Holiday` },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded ${l.color}`} />
                <span className={`text-[8px] font-bold ${sub}`}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day detail */}
        {selected && selectedEvents.length > 0 && (
          <div className={`border-t ${divB} p-4 space-y-2`}>
            <p className={`text-[9px] font-black uppercase tracking-wider ${sub}`}>
              {new Date(selected + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            {selectedEvents.map(e => {
              const c = EVENT_TYPE_COLORS[e.event_type] || EVENT_TYPE_COLORS.event
              return (
                <div key={e.id} className={`rounded-2xl border p-3 ${c.bg} ${c.border}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={c.text}>{EVENT_TYPE_ICON[e.event_type]}</span>
                    <p className={`text-[10px] font-black ${c.text}`}>{e.title}</p>
                    <span className={`ml-auto text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border}`}>
                      {e.source === "public" ? `${selectedCountry?.flag} Official` : e.event_type}
                    </span>
                  </div>
                  {e.description && <p className={`text-[9px] mt-1.5 ${dm ? "text-slate-300" : "text-slate-600"}`}>{e.description}</p>}
                  {e.end_date && e.end_date !== e.event_date && <p className={`text-[8px] mt-1 ${sub}`}>Until: {e.end_date}</p>}
                </div>
              )
            })}
          </div>
        )}

        {selected && selectedEvents.length === 0 && (
          <div className={`border-t ${divB} px-5 py-3`}>
            <p className={`text-[9px] ${sub}`}>
              {new Date(selected + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} — no events
            </p>
          </div>
        )}
      </div>

      {/* Month list */}
      {monthEvents.length > 0 && (
        <div className={`rounded-2xl md:rounded-3xl border overflow-hidden ${card}`}>
          <div className={`px-5 py-3 border-b ${divB}`}>
            <p className={`text-[9px] font-black uppercase tracking-wider ${sub}`}>{MONTH_NAMES[month]} Events ({monthEvents.length})</p>
          </div>
          <div className={`divide-y ${dm ? "divide-slate-700/30" : "divide-slate-100"}`}>
            {monthEvents.map(e => {
              const c = EVENT_TYPE_COLORS[e.event_type]
              const isPast = e.event_date < todayStr()
              return (
                <div key={e.id} className={`px-5 py-3 flex items-start gap-3 ${isPast ? "opacity-50" : ""}`}>
                  <div className={`rounded-xl ${c.bg} border ${c.border} px-2 py-1.5 text-center shrink-0 min-w-[38px]`}>
                    <p className={`text-[10px] font-black ${c.text}`}>{new Date(e.event_date + "T00:00:00").getDate()}</p>
                    <p className={`text-[7px] font-bold uppercase ${c.text}`}>{MONTH_NAMES[new Date(e.event_date + "T00:00:00").getMonth()].slice(0, 3)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-[11px] font-black uppercase ${head}`}>{e.title}</p>
                      {e.source === "public" && (
                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full ${dm ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700"}`}>
                          {selectedCountry?.flag} Official
                        </span>
                      )}
                    </div>
                    {e.description && <p className={`text-[9px] mt-0.5 ${sub}`}>{e.description}</p>}
                    <span className={`inline-block mt-1 text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border}`}>{e.event_type}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {monthEvents.length === 0 && !loading && !holLoading && (
        <div className={`rounded-2xl border p-8 flex flex-col items-center gap-3 ${card}`}>
          <CalendarDays size={24} className={dm ? "text-slate-700" : "text-slate-300"} />
          <p className={`text-xs ${sub}`}>No events in {MONTH_NAMES[month]}</p>
        </div>
      )}
    </div>
  )
}