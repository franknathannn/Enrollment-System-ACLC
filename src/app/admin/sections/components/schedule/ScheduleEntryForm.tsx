// sections/components/schedule/ScheduleEntryForm.tsx

import { memo, useState, useEffect, useRef, useMemo } from "react"
import { X, Save, Clock, ChevronDown, Search, User, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DAYS } from "./types"
import type { ScheduleRow } from "./types"
import { useRooms } from "../../hooks/useRooms"

export interface TeacherOption {
  id:         string
  full_name:  string
  avatar_url?: string | null
}

interface ScheduleEntryFormProps {
  sectionName: string
  schoolYear:  string
  isICT:       boolean
  isDarkMode:  boolean
  editing:     ScheduleRow | null
  teachers:    TeacherOption[]
  schedules:   ScheduleRow[]
  onSave:      (data: Omit<ScheduleRow, "id" | "created_at"> & { teacher_id?: string | null }) => Promise<void>
  onCancel:    () => void
}

// ── Time options: 6:00 AM → 9:30 PM, 30-min steps ────────────────────────────
function buildTimeOptions() {
  const options: { value: string; label: string; period: "AM" | "PM" }[] = []
  for (let h = 6; h <= 21; h++) {
    for (const m of [0, 30]) {
      const value  = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
      const ampm   = h >= 12 ? "PM" : "AM"
      const hour   = h % 12 || 12
      const label  = `${hour}:${String(m).padStart(2, "0")} ${ampm}`
      options.push({ value, label, period: ampm as "AM" | "PM" })
    }
  }
  return options
}
const TIME_OPTIONS = buildTimeOptions()

function normalizeTime(t: string) {
  return t ? t.slice(0, 5) : ""
}

// ── TimePicker ────────────────────────────────────────────────────────────────
interface TimePickerProps {
  value: string
  onChange: (val: string) => void
  isDarkMode: boolean
  isICT: boolean
  placeholder?: string
  error?: string
}

function TimePicker({ value, onChange, isDarkMode, isICT, placeholder = "Select time", error }: TimePickerProps) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState("")
  const containerRef        = useRef<HTMLDivElement>(null)
  const searchRef           = useRef<HTMLInputElement>(null)

  const selected = TIME_OPTIONS.find(o => o.value === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setSearch("")
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  const filtered = TIME_OPTIONS.filter(o => {
    if (!search) return true
    const s = search.toLowerCase().replace(/\s/g, "")
    return o.label.toLowerCase().replace(/\s/g, "").includes(s) || o.value.replace(":", "").includes(s)
  }).slice(0, 8)

  const accentRing   = isICT ? "ring-blue-500/40 border-blue-500"   : "ring-orange-500/40 border-orange-500"
  const accentHover  = isICT ? "hover:bg-blue-500/10 hover:text-blue-400" : "hover:bg-orange-500/10 hover:text-orange-400"
  const accentActive = isICT ? "bg-blue-600 text-white"              : "bg-orange-600 text-white"

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all cursor-pointer select-none
          ${isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"}
          ${open ? `ring-2 ${accentRing}` : ""}
          ${error ? "border-red-500/60" : ""}`}>
        <div className="flex items-center gap-2 min-w-0">
          <Clock size={13} className={selected
            ? (isICT ? "text-blue-400" : "text-orange-400")
            : (isDarkMode ? "text-slate-500" : "text-slate-400")} />
          {selected ? (
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-sm">{selected.label.split(" ")[0]}</span>
              <span className={`text-[10px] font-black uppercase tracking-widest
                ${selected.period === "AM" ? "text-sky-400" : "text-amber-400"}`}>
                {selected.period}
              </span>
            </div>
          ) : (
            <span className={`text-sm ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{placeholder}</span>
          )}
        </div>
        <ChevronDown size={14} className={`flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""} ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
      </button>

      {open && (
        <div className={`absolute z-[100] mt-2 w-full rounded-2xl border shadow-2xl overflow-hidden
          ${isDarkMode ? "bg-slate-800 border-slate-700 shadow-black/60" : "bg-white border-slate-200 shadow-slate-200/80"}`}>
          <div className={`px-3 py-2.5 border-b ${isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-slate-100 bg-slate-50"}`}>
            <div className="relative">
              <Clock size={12} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
              <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder='Search "7:30" or "1pm"…'
                className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium outline-none transition-all
                  ${isDarkMode ? "bg-slate-800 border border-slate-700 text-white placeholder-slate-500" : "bg-white border border-slate-200 text-slate-900 placeholder-slate-400"}`} />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1.5" style={{ scrollbarWidth: "none" }}>
            {["AM", "PM"].map(period => {
              const opts = filtered.filter(o => o.period === period)
              if (!opts.length) return null
              return (
                <div key={period}>
                  <div className={`px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
                    {period === "AM" ? "Morning" : "Afternoon / Evening"}
                  </div>
                  {opts.map(o => (
                    <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); setSearch("") }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors
                        ${o.value === value ? accentActive : `${isDarkMode ? "text-white" : "text-slate-900"} ${accentHover}`}`}>
                      <span className="font-bold">{o.label.split(" ")[0]}</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest
                        ${o.value === value ? "text-white/70" : period === "AM" ? "text-sky-400" : "text-amber-400"}`}>
                        {period}
                      </span>
                    </button>
                  ))}
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className={`px-3 py-6 text-center text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>No times match</div>
            )}
          </div>
        </div>
      )}
      {error && <p className="text-[9px] text-red-400 mt-1 font-bold">{error}</p>}
    </div>
  )
}

// ── DayPicker — pill buttons ──────────────────────────────────────────────────
const DAY_META: { key: string; abbr: string }[] = [
  { key: "Monday",    abbr: "Mon" },
  { key: "Tuesday",  abbr: "Tue" },
  { key: "Wednesday",abbr: "Wed" },
  { key: "Thursday", abbr: "Thu" },
  { key: "Friday",   abbr: "Fri" },
  { key: "Saturday", abbr: "Sat" },
]

function DayPicker({ value, onChange, isDarkMode, isICT }: {
  value: string; onChange: (d: string) => void; isDarkMode: boolean; isICT: boolean
}) {
  const activeClass = isICT
    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30"
    : "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-500/30"
  const inactiveClass = isDarkMode
    ? "bg-slate-800/70 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white hover:bg-slate-700"
    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 hover:bg-slate-50"

  return (
    <div className="flex gap-1.5">
      {DAY_META.map(({ key, abbr }) => (
        <button key={key} type="button" onClick={() => onChange(key)}
          className={`flex-1 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wide transition-all active:scale-95
            ${value === key ? activeClass : inactiveClass}`}>
          {abbr}
        </button>
      ))}
    </div>
  )
}

// ── TeacherSelect — searchable with initials avatar ───────────────────────────
function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map(p => p[0]).join("").slice(0, 2).toUpperCase()
}

function TeacherSelect({ value, teachers, onChange, isDarkMode, isICT, error }: {
  value: string; teachers: TeacherOption[]; onChange: (id: string) => void
  isDarkMode: boolean; isICT: boolean; error?: string
}) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState("")
  const ref               = useRef<HTMLDivElement>(null)
  const selected          = teachers.find(t => t.id === value)
  const filtered          = query.trim()
    ? teachers.filter(t => t.full_name.toLowerCase().includes(query.toLowerCase()))
    : teachers

  const accentRing   = isICT ? "ring-blue-500/40 border-blue-500"   : "ring-orange-500/40 border-orange-500"
  const accentActive = isICT ? "bg-blue-600 text-white"              : "bg-orange-600 text-white"
  const avatarBg     = isICT ? "bg-blue-600 text-white"              : "bg-orange-600 text-white"
  const avatarBgIdle = isICT ? "bg-blue-500/15 text-blue-400"        : "bg-orange-500/15 text-orange-400"

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery("") }
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => { setOpen(v => !v); setQuery("") }}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all cursor-pointer select-none
          ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}
          ${open ? `ring-2 ${accentRing}` : ""}
          ${error ? "border-red-500/60" : ""}`}>
        <div className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              {selected.avatar_url ? (
                <img src={selected.avatar_url} alt={selected.full_name}
                  className="w-6 h-6 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black flex-shrink-0 ${avatarBg}`}>
                  {getInitials(selected.full_name)}
                </div>
              )}
              <span className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {selected.full_name}
              </span>
            </>
          ) : (
            <>
              <User size={13} className={isDarkMode ? "text-slate-500" : "text-slate-400"} />
              <span className={`text-sm ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>— Select a teacher —</span>
            </>
          )}
        </div>
        <ChevronDown size={14} className={`flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""} ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
      </button>

      {open && (
        <div className={`absolute z-[100] mt-2 w-full rounded-2xl border shadow-2xl overflow-hidden
          ${isDarkMode ? "bg-slate-800 border-slate-700 shadow-black/60" : "bg-white border-slate-200 shadow-slate-200/80"}`}>
          <div className={`px-3 py-2.5 border-b ${isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-slate-100 bg-slate-50"}`}>
            <div className="relative">
              <Search size={12} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
              <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search teacher…"
                className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium outline-none border
                  ${isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"}`} />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto py-1" style={{ scrollbarWidth: "none" }}>
            {filtered.length === 0 && (
              <div className={`px-3 py-6 text-center text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>No teachers found</div>
            )}
            {filtered.map(t => (
              <button key={t.id} type="button"
                onClick={() => { onChange(t.id); setOpen(false); setQuery("") }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors
                  ${t.id === value ? accentActive : isDarkMode ? "text-white hover:bg-slate-700/50" : "text-slate-900 hover:bg-slate-50"}`}>
                {t.avatar_url ? (
                  <img src={t.avatar_url} alt={t.full_name}
                    className="w-7 h-7 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0
                    ${t.id === value ? "bg-white/20 text-white" : avatarBgIdle}`}>
                    {getInitials(t.full_name)}
                  </div>
                )}
                <span className="text-sm font-medium">{t.full_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-[9px] text-red-400 mt-1 font-bold">{error}</p>}
    </div>
  )
}

// ── RoomSelect — searchable ───────────────────────────────────────────────────
function RoomSelect({ value, onChange, isDarkMode, isICT, error }: {
  value: string; onChange: (v: string) => void; isDarkMode: boolean; isICT: boolean; error?: string
}) {
  const roomsList         = useRooms()
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState("")
  const ref               = useRef<HTMLDivElement>(null)
  const filtered          = query.trim()
    ? roomsList.filter(r => r.name.toLowerCase().includes(query.toLowerCase()))
    : roomsList

  const accentRing   = isICT ? "ring-blue-500/40 border-blue-500" : "ring-orange-500/40 border-orange-500"
  const accentActive = isICT ? "bg-blue-600 text-white"           : "bg-orange-600 text-white"

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery("") }
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => { setOpen(v => !v); setQuery("") }}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all cursor-pointer select-none
          ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}
          ${open ? `ring-2 ${accentRing}` : ""}
          ${error ? "border-red-500/60" : ""}`}>
        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={13} className={value ? (isICT ? "text-blue-400" : "text-orange-400") : (isDarkMode ? "text-slate-500" : "text-slate-400")} />
          <span className={value ? (isDarkMode ? "text-white" : "text-slate-900") : (isDarkMode ? "text-slate-500" : "text-slate-400")}>
            {value || "— None —"}
          </span>
        </div>
        <ChevronDown size={14} className={`flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""} ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
      </button>

      {open && (
        <div className={`absolute z-[100] mt-2 w-full rounded-2xl border shadow-2xl overflow-hidden
          ${isDarkMode ? "bg-slate-800 border-slate-700 shadow-black/60" : "bg-white border-slate-200 shadow-slate-200/80"}`}>
          <div className={`px-3 py-2.5 border-b ${isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-slate-100 bg-slate-50"}`}>
            <div className="relative">
              <Search size={12} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
              <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search room…"
                className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium outline-none border
                  ${isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"}`} />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto py-1" style={{ scrollbarWidth: "none" }}>
            <button type="button" onClick={() => { onChange(""); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors
                ${isDarkMode ? "text-slate-500 hover:bg-slate-700/40" : "text-slate-400 hover:bg-slate-50"}`}>
              — None —
            </button>
            {filtered.map(r => (
              <button key={r.id} type="button" onClick={() => { onChange(r.name); setOpen(false); setQuery("") }}
                className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors
                  ${r.name === value ? accentActive : isDarkMode ? "text-white hover:bg-slate-700/50" : "text-slate-900 hover:bg-slate-50"}`}>
                {r.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className={`px-3 py-6 text-center text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>No rooms found</div>
            )}
          </div>
        </div>
      )}
      {error && <p className="text-[9px] text-red-400 mt-1 font-bold">{error}</p>}
    </div>
  )
}

// ── Subject color palette (matches ScheduleGrid colors) ──────────────────────
const SUBJECT_PALETTE = [
  { dot: "bg-blue-500",    label: "text-blue-400",    ring: "ring-blue-500/30"    },
  { dot: "bg-violet-500",  label: "text-violet-400",  ring: "ring-violet-500/30"  },
  { dot: "bg-emerald-500", label: "text-emerald-400", ring: "ring-emerald-500/30" },
  { dot: "bg-amber-500",   label: "text-amber-400",   ring: "ring-amber-500/30"   },
  { dot: "bg-rose-500",    label: "text-rose-400",    ring: "ring-rose-500/30"    },
  { dot: "bg-cyan-500",    label: "text-cyan-400",    ring: "ring-cyan-500/30"    },
  { dot: "bg-fuchsia-500", label: "text-fuchsia-400", ring: "ring-fuchsia-500/30" },
  { dot: "bg-teal-500",    label: "text-teal-400",    ring: "ring-teal-500/30"    },
  { dot: "bg-orange-500",  label: "text-orange-400",  ring: "ring-orange-500/30"  },
  { dot: "bg-lime-500",    label: "text-lime-400",    ring: "ring-lime-500/30"    },
  { dot: "bg-sky-500",     label: "text-sky-400",     ring: "ring-sky-500/30"     },
  { dot: "bg-pink-500",    label: "text-pink-400",    ring: "ring-pink-500/30"    },
]

function subjectColorIndex(subject: string): number {
  if (!subject.trim()) return 0
  let h = 5381
  for (let i = 0; i < subject.length; i++) { h = ((h << 5) + h) + subject.charCodeAt(i); h = h & h }
  return Math.abs(h) % SUBJECT_PALETTE.length
}

// ── Main form ─────────────────────────────────────────────────────────────────

const EMPTY = {
  subject: "", day: "Monday", start_time: "07:30", end_time: "08:30",
  teacher_id: "", teacher: "", room: "", notes: "",
}

export const ScheduleEntryForm = memo(function ScheduleEntryForm({
  sectionName, schoolYear, isICT, isDarkMode, editing, teachers, schedules, onSave, onCancel,
}: ScheduleEntryFormProps) {
  const [form, setForm]     = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editing) {
      setForm({
        subject:    editing.subject,
        day:        editing.day,
        start_time: normalizeTime(editing.start_time),
        end_time:   normalizeTime(editing.end_time),
        teacher_id: (editing as any).teacher_id ?? "",
        teacher:    editing.teacher ?? "",
        room:       editing.room    ?? "",
        notes:      editing.notes   ?? "",
      })
    } else {
      setForm({ ...EMPTY })
    }
    setErrors({})
  }, [editing])

  const set = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: "" }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.subject.trim()) e.subject    = "Subject is required"
    if (!form.start_time)     e.start_time = "Select a start time"
    if (!form.end_time)       e.end_time   = "Select an end time"
    if (form.start_time && form.end_time && form.start_time >= form.end_time)
      e.end_time = "End time must be after start time"
    if (!(form as any).teacher_id) e.teacher_id = "Assign a teacher"
    if (!form.room)            e.room       = "Room is required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const selectedTeacher = teachers.find(t => t.id === (form as any).teacher_id)
      await onSave({
        section:     sectionName,
        subject:     form.subject.trim(),
        day:         form.day,
        start_time:  form.start_time,
        end_time:    form.end_time,
        school_year: schoolYear,
        teacher:     selectedTeacher?.full_name ?? form.teacher.trim() ?? null,
        teacher_id:  (form as any).teacher_id || null,
        room:        form.room.trim()  || null,
        notes:       form.notes.trim() || null,
      })
    } finally {
      setSaving(false)
    }
  }

  const accentBtn  = isICT ? "bg-blue-600 hover:bg-blue-500 shadow-blue-500/25" : "bg-orange-600 hover:bg-orange-500 shadow-orange-500/25"
  const labelClass = `block text-[9px] font-black uppercase tracking-widest mb-2
    ${isDarkMode ? "text-slate-400" : "text-slate-500"}`

  // Build color map same way as ScheduleGrid (insertion order of unique subjects)
  const subjColorMap = useMemo(() => {
    const unique = [...new Set(schedules.map(s => s.subject))]
    return Object.fromEntries(unique.map((sub, i) => [sub, SUBJECT_PALETTE[i % SUBJECT_PALETTE.length]]))
  }, [schedules])

  // Use grid color if this subject already exists; hash-based fallback for new subjects
  const subjColor = subjColorMap[form.subject.trim()] ?? SUBJECT_PALETTE[subjectColorIndex(form.subject)]
  const inputClass = `w-full rounded-xl border px-3 py-2 text-sm font-medium transition-all outline-none ring-0 focus:ring-2
    ${isDarkMode
      ? `bg-slate-800 border-slate-700 text-white placeholder-slate-500 ${isICT ? "focus:ring-blue-500/40 focus:border-blue-500" : "focus:ring-orange-500/40 focus:border-orange-500"}`
      : `bg-white border-slate-200 text-slate-900 placeholder-slate-400 ${isICT ? "focus:ring-blue-500/40 focus:border-blue-500" : "focus:ring-orange-500/40 focus:border-orange-500"}`}`

  return (
    <div className={`rounded-3xl border overflow-visible animate-in slide-in-from-top-3 fade-in duration-300 relative
      ${isDarkMode ? "bg-slate-900/80 border-slate-700" : "bg-white border-slate-200 shadow-xl"}`}>
      {/* Subject color strip */}
      {form.subject.trim() && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl ${subjColor.dot}`} />
      )}

      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b
        ${isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-slate-100 bg-slate-50"}`}>
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isICT ? "text-blue-400" : "text-orange-400"}`}>
            {editing ? "Edit Schedule Entry" : "New Schedule Entry"}
          </p>
          <p className={`text-[9px] mt-0.5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
            {sectionName} · {schoolYear}
          </p>
        </div>
        <button onClick={onCancel}
          className={`p-2 rounded-xl transition-colors ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-200 text-slate-500"}`}>
          <X size={16} />
        </button>
      </div>

      {/* Form body */}
      <div className="p-6 space-y-5 overflow-visible">

        {/* Subject */}
        <div>
          <label className={`${labelClass} flex items-center gap-2`}>
            {form.subject.trim() && (
              <span className={`inline-block w-2 h-2 rounded-full ${subjColor.dot}`} />
            )}
            Subject *
          </label>
          <input className={`${inputClass} ${errors.subject ? "border-red-500/60" : ""} ${form.subject.trim() ? `ring-1 ${subjColor.ring}` : ""}`}
            placeholder="e.g. Oral Communication"
            value={form.subject} onChange={e => set("subject", e.target.value)} />
          {errors.subject && <p className="text-[9px] text-red-400 mt-1 font-bold">{errors.subject}</p>}
        </div>

        {/* Day — pill picker */}
        <div>
          <label className={labelClass}>Day *</label>
          <DayPicker value={form.day} onChange={d => set("day", d)} isDarkMode={isDarkMode} isICT={isICT} />
        </div>

        {/* Start + End time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Start Time *</label>
            <TimePicker value={form.start_time} onChange={v => set("start_time", v)}
              isDarkMode={isDarkMode} isICT={isICT} placeholder="Start" error={errors.start_time} />
          </div>
          <div>
            <label className={labelClass}>End Time *</label>
            <TimePicker value={form.end_time} onChange={v => set("end_time", v)}
              isDarkMode={isDarkMode} isICT={isICT} placeholder="End" error={errors.end_time} />
          </div>
        </div>

        {/* Teacher */}
        <div>
          <label className={labelClass}>Teacher *</label>
          <TeacherSelect
            value={(form as any).teacher_id ?? ""}
            teachers={teachers}
            onChange={id => set("teacher_id", id)}
            isDarkMode={isDarkMode}
            isICT={isICT}
            error={errors.teacher_id}
          />
        </div>

        {/* Room + Notes */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Room *</label>
            <RoomSelect value={form.room} onChange={v => set("room", v)} isDarkMode={isDarkMode} isICT={isICT} error={errors.room} />
          </div>
          <div>
            <label className={labelClass}>
              Notes <span className="opacity-40 normal-case font-bold">(optional)</span>
            </label>
            <input className={inputClass} placeholder="Additional notes…"
              value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t
        ${isDarkMode ? "border-slate-700 bg-slate-800/40" : "border-slate-100 bg-slate-50"}`}>
        <Button variant="ghost" onClick={onCancel}
          className={`rounded-2xl font-black text-[9px] uppercase tracking-widest h-10 px-5
            ${isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}>
          Cancel
        </Button>
        <button onClick={handleSave} disabled={saving}
          className={`h-10 px-6 rounded-2xl font-black uppercase text-[9px] tracking-widest text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 ${accentBtn}`}>
          <Save size={13} />
          {saving ? "Saving…" : editing ? "Save Changes" : "Add Entry"}
        </button>
      </div>
    </div>
  )
})
