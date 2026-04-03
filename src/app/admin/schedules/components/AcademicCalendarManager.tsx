// src/app/admin/schedules/components/AcademicCalendarManager.tsx
// Admin-side: create/edit/delete academic calendar events (holidays, meetings, exams, etc.)
// Also fetches and displays official public holidays via Nager.Date API.
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight, Trash2,
  Loader2, X, Star, Users, BookOpen, CalendarOff, Edit2, Check,
  Globe, Flag,
} from "lucide-react"
import { supabase } from "@/lib/supabase/admin-client"
import { toast } from "sonner"

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  event_date: string
  end_date?: string
  event_type: "holiday" | "event" | "meeting" | "exam" | "suspension"
  color: string
  school_year: string
}

interface Props {
  isDarkMode: boolean
  surf: string
  bdr: string
  txt: string
  muted: string
  schoolYear: string
}

// ── Public holidays (Nager.Date, free, no key) ────────────────────────────────
interface PublicHoliday { date: string; localName: string; name: string }
const _holCache: Record<string, PublicHoliday[]> = {}
async function fetchHols(year: number, cc: string): Promise<PublicHoliday[]> {
  const k = `${year}_${cc}`
  if (_holCache[k]) return _holCache[k]
  try {
    const r = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${cc}`, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) return []
    const d = await r.json()
    _holCache[k] = d
    return d
  } catch { return [] }
}

const COUNTRIES = [
  { code: "PH", flag: "🇵🇭", name: "Philippines" },
  { code: "US", flag: "🇺🇸", name: "United States" },
  { code: "JP", flag: "🇯🇵", name: "Japan" },
  { code: "KR", flag: "🇰🇷", name: "South Korea" },
  { code: "SG", flag: "🇸🇬", name: "Singapore" },
  { code: "AU", flag: "🇦🇺", name: "Australia" },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom" },
  { code: "CA", flag: "🇨🇦", name: "Canada" },
]

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const EVENT_TYPES = ["holiday","event","meeting","exam","suspension"] as const
type EventType = typeof EVENT_TYPES[number]

const TYPE_COLORS: Record<EventType, { badge: string; text: string; border: string; hex: string }> = {
  holiday:    { badge: "bg-red-500/15",    text: "text-red-500",    border: "border-red-500/30",    hex: "#ef4444" },
  event:      { badge: "bg-blue-500/15",   text: "text-blue-500",   border: "border-blue-500/30",   hex: "#3b82f6" },
  meeting:    { badge: "bg-purple-500/15", text: "text-purple-500", border: "border-purple-500/30", hex: "#a855f7" },
  exam:       { badge: "bg-amber-500/15",  text: "text-amber-500",  border: "border-amber-500/30",  hex: "#f59e0b" },
  suspension: { badge: "bg-orange-500/15", text: "text-orange-500", border: "border-orange-500/30", hex: "#f97316" },
}

const ICONS: Record<EventType, React.ReactNode> = {
  holiday:    <CalendarOff size={12} />,
  event:      <Star size={12} />,
  meeting:    <Users size={12} />,
  exam:       <BookOpen size={12} />,
  suspension: <CalendarOff size={12} />,
}

const todayStr = () => new Date().toISOString().split("T")[0]

// ── Event Form Modal ──────────────────────────────────────────────────────────
function EventFormModal({
  editing, defaultDate, isDarkMode, schoolYear,
  onClose, onSaved,
}: {
  editing: CalendarEvent | null
  defaultDate: string
  isDarkMode: boolean
  schoolYear: string
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle]       = useState(editing?.title || "")
  const [desc, setDesc]         = useState(editing?.description || "")
  const [date, setDate]         = useState(editing?.event_date || defaultDate)
  const [endDate, setEndDate]   = useState(editing?.end_date || "")
  const [type, setType]         = useState<EventType>(editing?.event_type || "event")
  const [saving, setSaving]     = useState(false)

  const bdr  = isDarkMode ? "rgba(51,65,85,0.5)" : "rgba(226,232,240,0.8)"
  const surf = isDarkMode ? "rgba(15,23,42,0.96)" : "rgba(255,255,255,0.97)"
  const txt  = isDarkMode ? "#f8fafc" : "#0f172a"
  const inp  = isDarkMode
    ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"

  const save = async () => {
    if (!title.trim()) { toast.error("Title required"); return }
    setSaving(true)
    try {
      const payload: any = {
        title: title.trim(),
        description: desc.trim() || null,
        event_date: date,
        end_date: endDate || null,
        event_type: type,
        color: TYPE_COLORS[type].hex,
        school_year: schoolYear,
      }
      if (editing) {
        const { error } = await supabase.from("school_calendar_events").update(payload).eq("id", editing.id)
        if (error) throw error
        toast.success("Event updated")
      } else {
        const { error } = await supabase.from("school_calendar_events").insert(payload)
        if (error) throw error
        toast.success("Event created")
      }
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const modalBg = isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
  const lbl     = isDarkMode ? "text-slate-400" : "text-slate-500"
  const divB    = isDarkMode ? "border-slate-700" : "border-slate-100"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      onClick={onClose}>
      <div className={`rounded-[20px] border w-full max-w-md overflow-hidden ${modalBg}`}
        style={{
          boxShadow: isDarkMode
            ? "0 32px 80px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04)"
            : "0 32px 80px -12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.8)",
        }}
        onClick={e => e.stopPropagation()}>
        <div className={`px-5 py-4 flex items-center justify-between border-b ${divB}`}>
          <div>
            <p className={`text-[8px] font-black uppercase tracking-widest ${lbl}`}>{editing ? "Edit" : "New"} Calendar Event</p>
            <p className={`text-sm font-black mt-0.5 ${isDarkMode ? "text-white" : "text-slate-900"}`}>{editing ? editing.title : "Create Event"}</p>
          </div>
          <button onClick={onClose} className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>
            <X size={14} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Event type */}
          <div>
            <label className={`text-[9px] font-black uppercase tracking-wider mb-2 block ${lbl}`}>Type</label>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TYPES.map(t => {
                const c = TYPE_COLORS[t]
                return (
                  <button key={t} onClick={() => setType(t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wide border transition-all
                      ${type === t ? `${c.badge} ${c.text} ${c.border}` : isDarkMode ? "border-slate-700 text-slate-400 hover:border-slate-600" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                    {ICONS[t]} {t}
                    {type === t && <Check size={9} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={`text-[9px] font-black uppercase tracking-wider mb-1.5 block ${lbl}`}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Independence Day, Midterm Exams…"
              className={`w-full rounded-2xl border px-3 py-2.5 text-xs font-medium outline-none transition-colors ${inp}`} />
          </div>

          {/* Description */}
          <div>
            <label className={`text-[9px] font-black uppercase tracking-wider mb-1.5 block ${lbl}`}>Description <span className={`normal-case font-normal ${lbl}`}>(optional)</span></label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Additional details…" rows={2}
              className={`w-full rounded-2xl border px-3 py-2.5 text-xs font-medium outline-none resize-none transition-colors ${inp}`} />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-[9px] font-black uppercase tracking-wider mb-1.5 block ${lbl}`}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className={`w-full rounded-2xl border px-3 py-2 text-xs font-medium outline-none transition-colors ${inp}`} />
            </div>
            <div>
              <label className={`text-[9px] font-black uppercase tracking-wider mb-1.5 block ${lbl}`}>
                End Date <span className={`normal-case font-normal ${lbl}`}>(optional)</span>
              </label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={date}
                className={`w-full rounded-2xl border px-3 py-2 text-xs font-medium outline-none transition-colors ${inp}`} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className={`flex-1 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-colors
                ${isDarkMode ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
              Cancel
            </button>
            <button onClick={save} disabled={saving || !title.trim()}
              className={`flex-1 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5
                ${TYPE_COLORS[type].hex === "#ef4444" ? "bg-red-500 hover:bg-red-600" : TYPE_COLORS[type].hex === "#f59e0b" ? "bg-amber-500 hover:bg-amber-600" : TYPE_COLORS[type].hex === "#10b981" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-blue-600 hover:bg-blue-700"}`}
              style={{ boxShadow: saving ? "none" : "0 4px 12px -2px rgba(37,99,235,0.3)" }}>
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              {editing ? "Update" : "Create"}
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
export function AcademicCalendarManager({ isDarkMode, surf, bdr, txt, muted, schoolYear }: Props) {
  const [events, setEvents]           = useState<CalendarEvent[]>([])
  const [publicHols, setPublicHols]   = useState<CalendarEvent[]>([])
  const [loading, setLoading]         = useState(false)
  const [holLoading, setHolLoading]   = useState(false)
  const [year, setYear]               = useState(() => new Date().getFullYear())
  const [month, setMonth]             = useState(() => new Date().getMonth())
  const [selected, setSelected]       = useState<string | null>(null)
  const [formOpen, setFormOpen]       = useState(false)
  const [editing, setEditing]         = useState<CalendarEvent | null>(null)
  const [deleting, setDeleting]       = useState<string | null>(null)
  const [typeFilter, setTypeFilter]   = useState<EventType | "ALL">("ALL")
  const [country, setCountry]         = useState("PH")
  const [showPicker, setShowPicker]   = useState(false)
  const [showHols, setShowHols]       = useState(true)

  const dm = isDarkMode
  const cardBg   = dm ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.8)"
  const cardBdr  = dm ? "rgba(51,65,85,0.5)" : "rgba(226,232,240,0.7)"
  const sub   = dm ? "text-slate-400" : "text-slate-500"
  const head  = dm ? "text-white" : "text-slate-900"
  const divB  = dm ? "border-slate-700/40" : "border-slate-100"
  const rowHov = dm ? "hover:bg-slate-800/30" : "hover:bg-slate-50"

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from("school_calendar_events")
        .select("*")
        .eq("school_year", schoolYear)
        .order("event_date")
      setEvents(data || [])
    } finally {
      setLoading(false)
    }
  }, [schoolYear])

  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("admin_calendar_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "school_calendar_events" }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  // Fetch public holidays for current year
  useEffect(() => {
    if (!showHols) { setPublicHols([]); return }
    setHolLoading(true)
    fetchHols(year, country).then(hols => {
      const adminHolDates = new Set(events.filter(e => e.event_type === "holiday").map(e => e.event_date))
      setPublicHols(
        hols
          .filter(h => !adminHolDates.has(h.date))
          .map(h => ({
            id: `nager_${country}_${h.date}`,
            title: h.localName || h.name,
            description: h.localName !== h.name ? h.name : undefined,
            event_date: h.date,
            event_type: "holiday" as const,
            color: "#ef4444",
            school_year: h.date.slice(0, 4),
            _isPublic: true,
          } as CalendarEvent & { _isPublic: boolean }))
      )
    }).finally(() => setHolLoading(false))
  }, [year, country, showHols, events])

  // Merged event list: admin + public (admin takes priority)
  const allEvents = useMemo(() => {
    if (!showHols) return events
    return [...events, ...publicHols].sort((a, b) => a.event_date.localeCompare(b.event_date))
  }, [events, publicHols, showHols])

  const deleteEvent = async (id: string) => {
    if (!confirm("Delete this event?")) return
    setDeleting(id)
    try {
      const { error } = await supabase.from("school_calendar_events").delete().eq("id", id)
      if (error) throw error
      toast.success("Event deleted")
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete")
    } finally {
      setDeleting(null) }
  }

  // ── Calendar grid helpers ─────────────────────────────────────────────────
  const daysInMonth    = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()

  const eventsForDay = (dateStr: string) =>
    allEvents.filter(e => {
      if (e.end_date) return dateStr >= e.event_date && dateStr <= e.end_date
      return e.event_date === dateStr
    })

  const selectedEvents = selected ? eventsForDay(selected) : []

  const filteredEvents = (typeFilter === "ALL" ? allEvents : allEvents.filter(e => e.event_type === typeFilter))
    .filter(e => e.event_date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))

  const selectedCountry = COUNTRIES.find(c => c.code === country)

  const cardShadow = dm
    ? "0 4px 24px -4px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)"
    : "0 4px 24px -4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)"

  return (
    <div className="space-y-4" style={{ animation: "saas-fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both" }}>
      <style>{`
        @keyframes saas-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="rounded-[20px] sm:rounded-[24px] border overflow-hidden" style={{ background: cardBg, borderColor: cardBdr, boxShadow: cardShadow }}>

        {/* Top gradient accent */}
        <div style={{ height: 3, background: "linear-gradient(90deg, #2563eb, #7c3aed, #06b6d4, #2563eb)", backgroundSize: "200% 100%" }} />

        {/* Header */}
        <div className="px-6 py-5 flex flex-col gap-3" style={{ borderBottom: `1px solid ${cardBdr}` }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", color: muted }}>Academic Calendar</p>
              <p style={{ fontSize: 18, fontWeight: 900, marginTop: 2, color: txt }}>{schoolYear}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {(loading || holLoading) && <Loader2 size={13} className="animate-spin text-blue-400" />}
              <button onClick={() => { setEditing(null); setFormOpen(true) }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-white text-[9px] font-black uppercase tracking-wider transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 4px 16px -2px rgba(37,99,235,0.4)" }}>
                <Plus size={11} /> Add Event
              </button>
              <button onClick={() => setShowHols(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wide border transition-all
                  ${showHols ? (dm ? "bg-red-500/15 border-red-500/30 text-red-400" : "bg-red-50 border-red-200 text-red-600") : ""}`}
                style={!showHols ? { borderColor: cardBdr, color: muted } : {}}>
                <Flag size={10} /> {showHols ? "Holidays ON" : "Holidays OFF"}
              </button>
              {showHols && (
                <div className="relative">
                  <button onClick={() => setShowPicker(v => !v)}
                    style={{ borderColor: cardBdr, background: "transparent", color: txt }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wide border transition-all">
                    <Globe size={10} style={{ color: muted }} /> {selectedCountry?.flag} {selectedCountry?.code}
                  </button>
                  {showPicker && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
                      <div className="absolute right-0 top-full mt-1.5 z-50 rounded-2xl border overflow-hidden w-52"
                        style={{
                          background: dm ? "rgba(15,23,42,0.98)" : "rgba(255,255,255,0.98)",
                          borderColor: cardBdr,
                          boxShadow: dm
                            ? "0 16px 40px -8px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)"
                            : "0 16px 40px -8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)",
                          backdropFilter: "blur(16px)",
                        }}>
                        {COUNTRIES.map(c => (
                          <button key={c.code} onClick={() => { setCountry(c.code); setShowPicker(false) }}
                            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[10px] font-bold transition-opacity hover:opacity-70
                              ${country === c.code ? "bg-blue-600 text-white" : ""}`}
                            style={country !== c.code ? { color: txt } : {}}>
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
              <button onClick={() => { const d = new Date(year, month - 1); setMonth(d.getMonth()); setYear(d.getFullYear()); setSelected(null) }}
                style={{
                  width: 32, height: 32, borderRadius: 12,
                  border: `1.5px solid ${cardBdr}`, background: "transparent", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(59,130,246,0.4)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = cardBdr}>
                <ChevronLeft size={14} style={{ color: muted }} />
              </button>
              <span style={{ fontSize: 11, fontWeight: 800, minWidth: 100, textAlign: "center", color: txt }}>{MONTH_NAMES[month]} {year}</span>
              <button onClick={() => { const d = new Date(year, month + 1); setMonth(d.getMonth()); setYear(d.getFullYear()); setSelected(null) }}
                style={{
                  width: 32, height: 32, borderRadius: 12,
                  border: `1.5px solid ${cardBdr}`, background: "transparent", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(59,130,246,0.4)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = cardBdr}>
                <ChevronRight size={14} style={{ color: muted }} />
              </button>
            </div>
          </div>
          {showHols && (
            <p style={{ fontSize: 8, color: muted }}>
              Public holidays via <strong>Nager.Date API</strong> · {selectedCountry?.flag} {selectedCountry?.name}
            </p>
          )}
        </div>

        <div className="p-5">
          {/* Type filter */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(["ALL", ...EVENT_TYPES] as const).map(t => {
              const c = t === "ALL" ? null : TYPE_COLORS[t as EventType]
              return (
                <button key={t} onClick={() => setTypeFilter(t as any)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wide border transition-all
                    ${typeFilter === t
                      ? (c ? `${c.badge} ${c.text} ${c.border}` : (dm ? "bg-slate-700 text-white border-slate-600" : "bg-slate-200 text-slate-800 border-slate-300"))
                      : (dm ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500")}`}>
                  {t === "ALL" ? "All" : t}
                </button>
              )
            })}
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
              <div key={d} style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: muted, textAlign: "center", paddingTop: 4, paddingBottom: 4 }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day     = i + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
              const rawEvs  = eventsForDay(dateStr)
              const dayEvs  = rawEvs.filter(e => typeFilter === "ALL" || e.event_type === typeFilter)
              const isToday   = dateStr === todayStr()
              const isSel     = dateStr === selected
              const isSunday  = new Date(dateStr).getDay() === 0
              const hasHol    = rawEvs.some(e => e.event_type === "holiday")
              const hasSusp   = rawEvs.some(e => e.event_type === "suspension")

              const bg = hasHol ? (dm ? "rgba(239,68,68,0.15)" : "#fee2e2")
                : hasSusp   ? (dm ? "rgba(249,115,22,0.15)" : "#ffedd5")
                : dayEvs.length > 0 ? (dm ? "rgba(59,130,246,0.08)" : "#eff6ff")
                : isSunday ? (dm ? "rgba(15,23,42,0.5)" : "#f8fafc")
                : "transparent"

              return (
                <button key={day}
                  onClick={() => { setSelected(isSel ? null : dateStr) }}
                  title={rawEvs.map(e => e.title).join(" · ") || undefined}
                  style={{
                    minHeight: 52,
                    background: bg,
                    border: isToday ? "2px solid #3b82f6" : isSel ? `2px solid ${dm ? "#60a5fa" : "#3b82f6"}` : "1.5px solid transparent",
                    borderRadius: 10, padding: "6px 4px 4px",
                    display: "flex", flexDirection: "column", alignItems: "flex-start",
                    cursor: "pointer", transition: "opacity 0.15s, transform 0.15s", overflow: "hidden", width: "100%",
                    boxShadow: isToday ? "0 0 0 2px rgba(59,130,246,0.15)" : "none",
                  }}
                  className="hover:opacity-75 active:scale-95"
                >
                  <span style={{ fontSize: 11, fontWeight: 800, color: isToday ? "#3b82f6" : isSunday ? (dm ? "#475569" : "#cbd5e1") : txt, lineHeight: 1 }}>
                    {day}
                  </span>
                  {dayEvs.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4, width: "100%", overflow: "hidden" }}>
                      {dayEvs.slice(0, 2).map(e => {
                        const isP = (e as any)._isPublic
                        const dotColor = isP || e.event_type === "holiday" ? "#ef4444"
                          : e.event_type === "suspension" ? "#f97316"
                          : e.event_type === "exam" ? "#f59e0b"
                          : e.event_type === "meeting" ? "#a855f7" : "#3b82f6"
                        return (
                          <div key={e.id} style={{ display: "flex", alignItems: "flex-start", gap: 3, width: "100%", minWidth: 0 }}>
                            <div style={{
                              width: 5, height: 5, borderRadius: "50%", background: dotColor, flexShrink: 0, marginTop: 2,
                              boxShadow: `0 0 4px ${dotColor}30`,
                            }} />
                            <span style={{
                              fontSize: 7, fontWeight: 700, color: dotColor,
                              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                              overflow: "hidden", wordBreak: "break-word", lineHeight: 1.3, flex: 1
                            }}>
                              {e.title}
                            </span>
                          </div>
                        )
                      })}
                      {dayEvs.length > 2 && <span style={{ fontSize: 6, color: muted }}>+{dayEvs.length - 2}</span>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {[
              { bg: dm ? "rgba(239,68,68,0.2)" : "#fee2e2",   label: "Holiday" },
              { bg: dm ? "rgba(249,115,22,0.2)" : "#ffedd5",  label: "Suspended" },
              { bg: dm ? "rgba(59,130,246,0.1)" : "#eff6ff",  label: "Event" },
              { bg: dm ? "rgba(239,68,68,0.3)" : "#fecaca",   label: `${selectedCountry?.flag} Public` },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div style={{ width: 10, height: 10, borderRadius: 3, background: l.bg }} />
                <span style={{ fontSize: 8, color: muted, fontWeight: 700 }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected day panel */}
        {selected && (
          <div style={{ borderTop: `1px solid ${cardBdr}` }} className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <p style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: txt }}>
                {new Date(selected + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
              <button onClick={() => { setEditing(null); setFormOpen(true) }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 2px 8px -2px rgba(37,99,235,0.4)" }}>
                <Plus size={9} /> Add here
              </button>
            </div>
            {selectedEvents.length === 0 && (
              <p style={{ fontSize: 9, color: muted }}>No events — click "Add here" to create one</p>
            )}
            {selectedEvents.map(e => {
              const c = TYPE_COLORS[e.event_type] || TYPE_COLORS.holiday
              const isP = (e as any)._isPublic
              return (
                <div key={e.id} className={`rounded-2xl border p-3 flex items-start gap-3 ${c.badge} ${c.border}`}>
                  <span className={c.text}>{ICONS[e.event_type as EventType]}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[10px] font-black uppercase ${c.text}`}>{e.title}</p>
                    {e.description && <p style={{ fontSize: 9, color: muted }} className="mt-0.5">{e.description}</p>}
                    <span className={`inline-block mt-1 text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${c.badge} ${c.text} border ${c.border}`}>
                      {isP ? `${selectedCountry?.flag} Public Holiday` : e.event_type}
                    </span>
                  </div>
                  {!isP && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { setEditing(e); setFormOpen(true) }}
                        className={`p-1.5 rounded-lg ${dm ? "hover:bg-white/10 text-slate-400" : "hover:bg-white/80 text-slate-400"}`}>
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => deleteEvent(e.id)} disabled={deleting === e.id}
                        className={`p-1.5 rounded-lg ${dm ? "hover:bg-red-500/20 text-slate-400 hover:text-red-400" : "hover:bg-red-50 text-slate-400 hover:text-red-500"}`}>
                        {deleting === e.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Month event list */}
      {filteredEvents.length > 0 && (
        <div className="rounded-[20px] sm:rounded-[24px] border overflow-hidden" style={{ background: cardBg, borderColor: cardBdr, boxShadow: cardShadow }}>
          <div style={{ borderBottom: `1px solid ${cardBdr}` }} className="px-5 py-3">
            <p className={`text-[9px] font-black uppercase tracking-wider ${sub}`}>{MONTH_NAMES[month]} Events ({filteredEvents.length})</p>
          </div>
          <div className={`divide-y ${dm ? "divide-slate-700/30" : "divide-slate-100"}`}>
            {filteredEvents.map(e => {
              const c = TYPE_COLORS[e.event_type] || TYPE_COLORS.holiday
              const isPast = e.event_date < todayStr()
              const isP = (e as any)._isPublic
              return (
                <div key={e.id} className={`px-5 py-3 flex items-start gap-3 ${rowHov} ${isPast ? "opacity-60" : ""}`}>
                  <div className={`rounded-xl ${c.badge} border ${c.border} px-2 py-1.5 text-center shrink-0 min-w-[38px]`}>
                    <p className={`text-[10px] font-black ${c.text}`}>{new Date(e.event_date + "T00:00:00").getDate()}</p>
                    <p className={`text-[7px] font-bold uppercase ${c.text}`}>{MONTH_NAMES[new Date(e.event_date + "T00:00:00").getMonth()].slice(0, 3)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-[11px] font-black uppercase truncate ${head}`}>{e.title}</p>
                      {isP && <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${dm ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700"}`}>{selectedCountry?.flag} Official</span>}
                    </div>
                    {e.description && <p className={`text-[9px] mt-0.5 ${sub} truncate`}>{e.description}</p>}
                    <span className={`inline-block mt-1 text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${c.badge} ${c.text} border ${c.border}`}>{e.event_type}</span>
                  </div>
                  {!isP && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { setEditing(e); setFormOpen(true) }}
                        className={`p-1.5 rounded-lg ${dm ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-400"}`}><Edit2 size={12} /></button>
                      <button onClick={() => deleteEvent(e.id)} disabled={deleting === e.id}
                        className={`p-1.5 rounded-lg ${dm ? "hover:bg-red-500/10 text-slate-400 hover:text-red-400" : "hover:bg-red-50 text-slate-400 hover:text-red-500"}`}>
                        {deleting === e.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {filteredEvents.length === 0 && !loading && !holLoading && (
        <div className="rounded-[20px] sm:rounded-[24px] border p-10 flex flex-col items-center gap-3" style={{ background: cardBg, borderColor: cardBdr, boxShadow: cardShadow }}>
          <CalendarDays size={24} className={dm ? "text-slate-700" : "text-slate-300"} />
          <p className={`text-xs ${sub}`}>No events in {MONTH_NAMES[month]} — click "Add Event" to create one</p>
        </div>
      )}

      {formOpen && (
        <EventFormModal
          editing={editing}
          defaultDate={selected || todayStr()}
          isDarkMode={isDarkMode}
          schoolYear={schoolYear}
          onClose={() => { setFormOpen(false); setEditing(null) }}
          onSaved={load}
        />
      )}
    </div>
  )
}