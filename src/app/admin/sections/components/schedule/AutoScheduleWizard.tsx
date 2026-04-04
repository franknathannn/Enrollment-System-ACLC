// sections/components/schedule/AutoScheduleWizard.tsx
// 3-step wizard: Configure subjects → Preview → Confirm
// UI/UX redesign: card-based mobile-first layout, beautiful custom dropdowns,
// TimePicker for all time fields, SearchableSelect for Room/Teacher.

import { memo, useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import {
  CalendarDays, Plus, Trash2, ChevronRight, ChevronLeft,
  AlertTriangle, CheckCircle2, X, Info, Clock,
  ChevronDown, Search, User, RefreshCw,
} from "lucide-react"
import type { TeacherOption } from "./ScheduleEntryForm"
import { Button } from "@/components/ui/button"
import {
  DURATION_OPTIONS, REPETITION_OPTIONS,
  generateSchedule, getMajorityShift, formatAMPM,
  type SubjectInput, type AutoScheduleConfig,
  type AutoScheduleResult, type ConflictItem, type RepetitionMode,
} from "./autoScheduler"
import { useRooms } from "../../hooks/useRooms"
import type { ScheduleRow } from "./types"

// ── Types ─────────────────────────────────────────────────────────────────────
interface AutoScheduleWizardProps {
  sectionName:       string
  schoolYear:        string
  isICT:             boolean
  isDarkMode:        boolean
  students:          { preferred_shift?: string | null }[]
  existingSchedules: ScheduleRow[]
  teachers:          TeacherOption[]
  onConfirm:         (rows: Omit<ScheduleRow, "id" | "created_at">[]) => Promise<void>
  onCancel:          () => void
}

const STEP_LABELS = ["Configure", "Preview", "Confirm"]

// ── Time options (6:00 AM – 9:30 PM, 30-min steps) ────────────────────────────
function buildTimeOptions() {
  const out: { value: string; label: string; period: "AM" | "PM" }[] = []
  for (let h = 6; h <= 21; h++) {
    for (const m of [0, 30]) {
      const value = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`
      const ampm  = h >= 12 ? "PM" : "AM"
      const hour  = h % 12 || 12
      const label = `${hour}:${String(m).padStart(2,"0")} ${ampm}`
      out.push({ value, label, period: ampm as "AM" | "PM" })
    }
  }
  return out
}
const TIME_OPTIONS = buildTimeOptions()

// ── Shared dropdown styles ────────────────────────────────────────────────────
function dropStyles(isDarkMode: boolean) {
  return {
    overlay:   isDarkMode ? "bg-slate-900 border-slate-700 shadow-black/70" : "bg-white border-slate-200 shadow-slate-200/80",
    rowHov:    isDarkMode ? "hover:bg-slate-700/60"       : "hover:bg-slate-50",
    rowActive: isDarkMode ? "bg-blue-600 text-white"      : "bg-blue-600 text-white",
    group:     isDarkMode ? "text-slate-600"              : "text-slate-400",
    input:     isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400",
    trigger:   isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900",
  }
}

// ── Portal positioning — fixes z-index clipping inside overflow:auto containers ─
function usePortalPos(
  btnRef: React.RefObject<HTMLButtonElement | null>,
  open: boolean
): { top: number; left: number; width: number } | null {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => {
    if (!open || !btnRef.current) { setPos(null); return }
    const update = () => {
      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect()
        setPos({ top: r.bottom + 4, left: r.left, width: r.width })
      }
    }
    update()
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [open]) // eslint-disable-line

  return pos
}

// ── TimePicker (same design as ScheduleEntryForm) ─────────────────────────────
function TimePicker({
  value, onChange, isDarkMode, isICT, placeholder = "Select time", label: labelTxt, error,
}: {
  value: string; onChange: (v: string) => void
  isDarkMode: boolean; isICT: boolean
  placeholder?: string; label?: string; error?: string
}) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState("")
  const ref      = useRef<HTMLDivElement>(null)
  const btnRef   = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pos      = usePortalPos(btnRef, open)

  const selected = TIME_OPTIONS.find(o => o.value === value)
  const ds = dropStyles(isDarkMode)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const inTrigger = ref.current?.contains(e.target as Node)
      const inPanel   = panelRef.current?.contains(e.target as Node)
      if (!inTrigger && !inPanel) { setOpen(false); setSearch("") }
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const filtered = TIME_OPTIONS.filter(o => {
    if (!search) return true
    const s = search.toLowerCase().replace(/\s/g, "")
    return o.label.toLowerCase().replace(/\s/g, "").includes(s) || o.value.replace(":", "").includes(s)
  }).slice(0, 12)

  const accentRing  = isICT ? "ring-blue-500/30 border-blue-500" : "ring-orange-500/30 border-orange-500"
  const accentActive= isICT ? "bg-blue-600 text-white" : "bg-orange-600 text-white"
  const accentHover = isICT ? "hover:bg-blue-500/10 hover:text-blue-400" : "hover:bg-orange-500/10 hover:text-orange-400"

  const dropdown = pos && (
    <div ref={panelRef} style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className={`rounded-2xl border shadow-2xl overflow-hidden ${ds.overlay}`}>
      <div className={`px-3 py-2.5 border-b ${isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-slate-100 bg-slate-50"}`}>
        <div className="relative">
          <Clock size={11} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
          <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder='Search "7:30" or "1pm"…'
            className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium outline-none border ${ds.input}`}
          />
        </div>
      </div>
      <div className="max-h-52 overflow-y-auto py-1.5" style={{ scrollbarWidth: "none" }}>
        {["AM", "PM"].map(period => {
          const opts = filtered.filter(o => o.period === period)
          if (!opts.length) return null
          return (
            <div key={period}>
              <div className={`px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] ${ds.group}`}>
                {period === "AM" ? "Morning" : "Afternoon / Evening"}
              </div>
              {opts.map(o => (
                <button key={o.value} type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setSearch("") }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors
                    ${o.value === value ? accentActive : `${isDarkMode ? "text-white" : "text-slate-900"} ${accentHover}`}`}
                >
                  <span className="font-bold">{o.label.split(" ")[0]}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${o.value === value ? "text-white/70" : period === "AM" ? "text-sky-400" : "text-amber-400"}`}>
                    {period}
                  </span>
                </button>
              ))}
            </div>
          )
        })}
        {!filtered.length && (
          <div className={`px-3 py-6 text-center text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>No times match</div>
        )}
      </div>
    </div>
  )

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button ref={btnRef}
        type="button"
        onClick={() => { setOpen(o => !o); setSearch("") }}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all cursor-pointer
          ${ds.trigger}
          ${open ? `ring-2 ${accentRing}` : ""}
          ${error ? "border-red-500/60" : ""}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Clock size={13} className={selected ? (isICT ? "text-blue-400" : "text-orange-400") : (isDarkMode ? "text-slate-500" : "text-slate-400")} />
          {selected ? (
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-sm">{selected.label.split(" ")[0]}</span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${selected.period === "AM" ? "text-sky-400" : "text-amber-400"}`}>
                {selected.period}
              </span>
            </div>
          ) : (
            <span className={`text-sm ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{placeholder}</span>
          )}
        </div>
        <ChevronDown size={13} className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""} ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
      </button>
      {typeof document !== "undefined" && open && dropdown && createPortal(dropdown, document.body)}
      {error && <p className="text-[9px] text-red-400 mt-1 font-bold">{error}</p>}
    </div>
  )
}

// ── SearchableSelect (for Room, Teacher, options lists) ───────────────────────
function SearchableSelect({
  value, options, placeholder, isDarkMode, isICT, onChange, emptyLabel = "— None —",
}: {
  value: string; options: string[]; placeholder: string
  isDarkMode: boolean; isICT: boolean
  onChange: (v: string) => void; emptyLabel?: string
}) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState("")
  const ref      = useRef<HTMLDivElement>(null)
  const btnRef   = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pos      = usePortalPos(btnRef, open)

  const ds = dropStyles(isDarkMode)
  const filtered = query.trim() ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())) : options

  const accentRing  = isICT ? "ring-blue-500/30 border-blue-500" : "ring-orange-500/30 border-orange-500"
  const accentActive = isICT ? "bg-blue-600 text-white" : "bg-orange-600 text-white"
  const accentHover  = isICT ? "hover:bg-blue-500/10" : "hover:bg-orange-500/10"

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const inTrigger = ref.current?.contains(e.target as Node)
      const inPanel   = panelRef.current?.contains(e.target as Node)
      if (!inTrigger && !inPanel) { setOpen(false); setQuery("") }
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const dropdown = pos && (
    <div ref={panelRef} style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className={`rounded-2xl border shadow-2xl overflow-hidden ${ds.overlay}`}>
      <div className={`px-3 py-2.5 border-b ${isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-slate-100 bg-slate-50"}`}>
        <div className="relative">
          <Search size={11} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
          <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search…"
            className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium outline-none border ${ds.input}`}
          />
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto py-1.5" style={{ scrollbarWidth: "none" }}>
        <button type="button" onClick={() => { onChange(""); setOpen(false) }}
          className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${isDarkMode ? "text-slate-500 hover:bg-slate-700/40" : "text-slate-400 hover:bg-slate-50"}`}>
          {emptyLabel}
        </button>
        {filtered.map(opt => (
          <button key={opt} type="button"
            onClick={() => { onChange(opt); setOpen(false); setQuery("") }}
            className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors
              ${opt === value ? accentActive : `${isDarkMode ? "text-white" : "text-slate-900"} ${accentHover} ${isDarkMode ? "hover:text-white" : ""}`}`}
          >
            {opt}
          </button>
        ))}
        {!filtered.length && <div className={`px-3 py-6 text-center text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>No results</div>}
      </div>
    </div>
  )

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button ref={btnRef} type="button"
        onClick={() => { setOpen(o => !o); setQuery("") }}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all cursor-pointer
          ${ds.trigger} ${open ? `ring-2 ${accentRing}` : ""}`}
      >
        <span className={value ? (isDarkMode ? "text-white" : "text-slate-900") : (isDarkMode ? "text-slate-500" : "text-slate-400")}>
          {value || placeholder}
        </span>
        <ChevronDown size={13} className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""} ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
      </button>
      {typeof document !== "undefined" && open && dropdown && createPortal(dropdown, document.body)}
    </div>
  )
}

// ── OptionSelect (Duration, Repetition, Shift) — portal + searchable ──────────
function OptionSelect<T extends string | number>({
  value, options, isDarkMode, isICT, onChange,
}: {
  value: T
  options: { value: T; label: string; description?: string }[]
  isDarkMode: boolean; isICT: boolean
  onChange: (v: T) => void
}) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState("")
  const ref      = useRef<HTMLDivElement>(null)
  const btnRef   = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pos      = usePortalPos(btnRef, open)
  const ds       = dropStyles(isDarkMode)

  const selected = options.find(o => o.value === value)
  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()) || (o.description ?? "").toLowerCase().includes(query.toLowerCase()))
    : options
  const accentRing   = isICT ? "ring-blue-500/30 border-blue-500" : "ring-orange-500/30 border-orange-500"
  const accentActive = isICT ? "bg-blue-600 text-white" : "bg-orange-600 text-white"
  const accentHover  = isICT ? "hover:bg-blue-500/10" : "hover:bg-orange-500/10"

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const inTrigger = ref.current?.contains(e.target as Node)
      const inPanel   = panelRef.current?.contains(e.target as Node)
      if (!inTrigger && !inPanel) { setOpen(false); setQuery("") }
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const dropdown = pos && (
    <div ref={panelRef} style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className={`rounded-2xl border shadow-2xl overflow-hidden ${ds.overlay}`}>
      {options.length > 4 && (
        <div className={`px-3 py-2.5 border-b ${isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-slate-100 bg-slate-50"}`}>
          <div className="relative">
            <Search size={11} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
            <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium outline-none border ${ds.input}`} />
          </div>
        </div>
      )}
      <div className="max-h-52 overflow-y-auto py-1.5" style={{ scrollbarWidth: "none" }}>
        {filtered.map(opt => (
          <button key={String(opt.value)} type="button"
            onClick={() => { onChange(opt.value); setOpen(false); setQuery("") }}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors
              ${opt.value === value ? accentActive : `${isDarkMode ? "text-white" : "text-slate-900"} ${accentHover}`}`}>
            <span className="font-medium">{opt.label}</span>
            {opt.description && (
              <span className={`text-[10px] font-normal ml-2 ${opt.value === value ? "text-white/70" : isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                {opt.description}
              </span>
            )}
          </button>
        ))}
        {!filtered.length && (
          <div className={`px-3 py-4 text-center text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>No results</div>
        )}
      </div>
    </div>
  )

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button ref={btnRef} type="button"
        onClick={() => { setOpen(o => !o); setQuery("") }}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all cursor-pointer
          ${ds.trigger} ${open ? `ring-2 ${accentRing}` : ""}`}>
        <div className="flex flex-col items-start min-w-0">
          <span className={isDarkMode ? "text-white" : "text-slate-900"}>{selected?.label ?? "Select…"}</span>
          {selected?.description && (
            <span className={`text-[10px] font-normal ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{selected.description}</span>
          )}
        </div>
        <ChevronDown size={13} className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""} ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
      </button>
      {typeof document !== "undefined" && open && dropdown && createPortal(dropdown, document.body)}
    </div>
  )
}

// ── Field label ───────────────────────────────────────────────────────────────
function FieldLabel({ children, isDarkMode }: { children: React.ReactNode; isDarkMode: boolean }) {
  return (
    <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
      {children}
    </p>
  )
}

// ── WizardTeacherSelect — searchable teacher picker for wizard cards ──────────
function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map(p => p[0]).join("").slice(0, 2).toUpperCase()
}

function WizardTeacherSelect({ value, teachers, onChange, isDarkMode, isICT, error }: {
  value: string; teachers: TeacherOption[]
  onChange: (id: string, name: string) => void
  isDarkMode: boolean; isICT: boolean; error?: boolean
}) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState("")
  const ref      = useRef<HTMLDivElement>(null)
  const btnRef   = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pos      = usePortalPos(btnRef, open)
  const ds       = dropStyles(isDarkMode)

  const selected = teachers.find(t => t.id === value)
  const filtered = query.trim()
    ? teachers.filter(t => t.full_name.toLowerCase().includes(query.toLowerCase()))
    : teachers

  const accentRing   = isICT ? "ring-blue-500/30 border-blue-500" : "ring-orange-500/30 border-orange-500"
  const accentActive = isICT ? "bg-blue-600 text-white"           : "bg-orange-600 text-white"
  const avatarBg     = isICT ? "bg-blue-600 text-white"           : "bg-orange-600 text-white"
  const avatarIdle   = isICT ? "bg-blue-500/15 text-blue-400"     : "bg-orange-500/15 text-orange-400"

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const inTrigger = ref.current?.contains(e.target as Node)
      const inPanel   = panelRef.current?.contains(e.target as Node)
      if (!inTrigger && !inPanel) { setOpen(false); setQuery("") }
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const dropdown = pos && (
    <div ref={panelRef} style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className={`rounded-2xl border shadow-2xl overflow-hidden ${ds.overlay}`}>
      <div className={`px-3 py-2.5 border-b ${isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-slate-100 bg-slate-50"}`}>
        <div className="relative">
          <Search size={11} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
          <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search teacher…"
            className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium outline-none border ${ds.input}`} />
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto py-1" style={{ scrollbarWidth: "none" }}>
        {filtered.length === 0 && (
          <div className={`px-3 py-6 text-center text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>No teachers found</div>
        )}
        {filtered.map(t => (
          <button key={t.id} type="button"
            onClick={() => { onChange(t.id, t.full_name); setOpen(false); setQuery("") }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 transition-colors
              ${t.id === value ? accentActive : `${isDarkMode ? "text-white hover:bg-slate-700/50" : "text-slate-900 hover:bg-slate-50"}`}`}>
            <div className={`w-6 h-6 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center text-[9px] font-black
              ${t.id === value ? "bg-white/20 text-white" : avatarIdle}`}>
              {t.avatar_url
                ? <img src={t.avatar_url} alt={t.full_name} className="w-full h-full object-cover" />
                : getInitials(t.full_name)
              }
            </div>
            <span className="text-sm font-medium">{t.full_name}</span>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button ref={btnRef} type="button"
        onClick={() => { setOpen(o => !o); setQuery("") }}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all cursor-pointer
          ${ds.trigger}
          ${open ? `ring-2 ${accentRing}` : ""}
          ${error ? "border-red-500/60" : ""}`}>
        <div className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <div className={`w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center text-[9px] font-black flex-shrink-0 ${avatarBg}`}>
                {selected.avatar_url
                  ? <img src={selected.avatar_url} alt={selected.full_name} className="w-full h-full object-cover" />
                  : getInitials(selected.full_name)
                }
              </div>
              <span className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {selected.full_name}
              </span>
            </>
          ) : (
            <>
              <User size={13} className={isDarkMode ? "text-slate-500" : "text-slate-400"} />
              <span className={`text-sm ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>— Select teacher —</span>
            </>
          )}
        </div>
        <ChevronDown size={13} className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""} ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
      </button>
      {typeof document !== "undefined" && open && dropdown && createPortal(dropdown, document.body)}
      {error && <p className="text-[9px] text-red-400 mt-1 font-bold">Assign a teacher</p>}
    </div>
  )
}

// ── Subject Card (replaces table row — mobile-friendly) ───────────────────────
function SubjectCard({
  subj, idx, count, isDarkMode, isICT, teachers, onChange, onRemove, roomNames
}: {
  subj: SubjectInput & { teacher_id?: string }
  idx: number; count: number; isDarkMode: boolean; isICT: boolean
  teachers: TeacherOption[]
  onChange: (id: string, key: string, val: any) => void
  onRemove: (id: string) => void
  roomNames: string[]
}) {
  const accentColor = isICT ? (isDarkMode ? "text-blue-400" : "text-blue-600") : (isDarkMode ? "text-amber-400" : "text-amber-600")
  const borderColor = isICT
    ? isDarkMode ? "border-blue-500/20" : "border-blue-100"
    : isDarkMode ? "border-amber-500/20" : "border-amber-100"
  const cardBg = isDarkMode ? "bg-slate-800/50 border-slate-700/80" : "bg-white border-slate-200"

  const shiftOpts = [
    { value: "AM", label: "AM Shift", description: "Morning" },
    { value: "PM", label: "PM Shift", description: "Afternoon" },
  ]

  return (
    <div className={`rounded-2xl border p-4 transition-all ${cardBg}`}>
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black
            ${isICT ? isDarkMode ? "bg-blue-500/15 text-blue-400" : "bg-blue-50 text-blue-600"
                    : isDarkMode ? "bg-amber-500/15 text-amber-400" : "bg-amber-50 text-amber-600"}`}>
            {idx + 1}
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
            Subject {idx + 1}
          </span>
        </div>
        {count > 1 && (
          <button onClick={() => onRemove(subj.id)}
            className={`p-1.5 rounded-lg transition-colors
              ${isDarkMode ? "text-slate-600 hover:text-red-400 hover:bg-red-950/40" : "text-slate-300 hover:text-red-500 hover:bg-red-50"}`}>
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Subject name — full width */}
      <div className="mb-4">
        <FieldLabel isDarkMode={isDarkMode}>Subject Name *</FieldLabel>
        <input
          value={subj.subject}
          onChange={e => onChange(subj.id, "subject", e.target.value)}
          placeholder="e.g. Oral Communication"
          className={`w-full rounded-xl border px-3 py-2.5 text-sm font-medium outline-none transition-all
            ${isDarkMode
              ? "bg-slate-800 border-slate-700 text-white placeholder-slate-600 focus:border-blue-500/60"
              : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-400"}`}
        />
      </div>

      {/* Teacher — required */}
      <div className="mb-4">
        <FieldLabel isDarkMode={isDarkMode}>Teacher *</FieldLabel>
        <WizardTeacherSelect
          value={(subj as any).teacher_id ?? ""}
          teachers={teachers}
          onChange={(id, name) => { onChange(subj.id, "teacher_id", id); onChange(subj.id, "teacher", name) }}
          isDarkMode={isDarkMode}
          isICT={isICT}
          error={!!(subj as any)._teacherError}
        />
      </div>

      {/* 2-col: Room + Duration */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <FieldLabel isDarkMode={isDarkMode}>Room *</FieldLabel>
          <SearchableSelect
            value={subj.room}
            options={roomNames}
            placeholder="Pick room…"
            isDarkMode={isDarkMode}
            isICT={isICT}
            onChange={v => onChange(subj.id, "room", v)}
            emptyLabel="— No room —"
          />
        </div>
        <div>
          <FieldLabel isDarkMode={isDarkMode}>Duration</FieldLabel>
          <OptionSelect
            value={subj.duration}
            options={[...DURATION_OPTIONS]}
            isDarkMode={isDarkMode}
            isICT={isICT}
            onChange={v => onChange(subj.id, "duration", Number(v))}
          />
        </div>
      </div>

      {/* 2-col: Shift + Repetition */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel isDarkMode={isDarkMode}>Shift</FieldLabel>
          <OptionSelect
            value={subj.preferred_shift}
            options={shiftOpts}
            isDarkMode={isDarkMode}
            isICT={isICT}
            onChange={v => onChange(subj.id, "preferred_shift", v as "AM" | "PM")}
          />
        </div>
        <div>
          <FieldLabel isDarkMode={isDarkMode}>Repetition</FieldLabel>
          <OptionSelect
            value={subj.repetition}
            options={REPETITION_OPTIONS.map(r => ({ value: r.value, label: r.label, description: r.description }))}
            isDarkMode={isDarkMode}
            isICT={isICT}
            onChange={v => onChange(subj.id, "repetition", v as RepetitionMode)}
          />
        </div>
      </div>
    </div>
  )
}

// ── Conflict card ─────────────────────────────────────────────────────────────
function ConflictCard({ c, isDarkMode }: { c: ConflictItem; isDarkMode: boolean }) {
  return (
    <div className={`flex gap-3 p-3 rounded-xl border text-sm
      ${isDarkMode ? "bg-red-950/30 border-red-800/50" : "bg-red-50 border-red-200"}`}>
      <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className={`text-[10px] font-black uppercase tracking-wide mb-0.5 ${isDarkMode ? "text-red-300" : "text-red-700"}`}>
          {c.type} Conflict — {c.day} · {c.time}
        </p>
        <p className={`text-xs ${isDarkMode ? "text-red-400" : "text-red-600"}`}>{c.detail}</p>
      </div>
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ label, isDarkMode }: { label: string; isDarkMode: boolean }) {
  return (
    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
      {label}
    </p>
  )
}

// ── Settings row ──────────────────────────────────────────────────────────────
function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      {children}
    </div>
  )
}

// ── ID counter ────────────────────────────────────────────────────────────────
let uid = 0
const newSubject = (shift: "AM" | "PM") => ({
  id: String(++uid), subject: "", room: "", teacher: null as string | null,
  teacher_id: "" as string, duration: 60 as number,
  preferred_shift: shift as "AM" | "PM", repetition: "ONCE" as RepetitionMode,
})

// ── SPREAD OPTIONS ─────────────────────────────────────────────────────────────
const SPREAD_OPTIONS = [
  { value: "MON_FRI", label: "Mon – Fri", description: "5 days" },
  { value: "MON_SAT", label: "Mon – Sat", description: "6 days" },
]

// ── SCHOOL START/END OPTIONS ──────────────────────────────────────────────────
const SCHOOL_START_OPTS = ["06:00","06:30","07:00","07:30","08:00"].map(t => ({ value: t, label: formatAMPM(t) }))
const SCHOOL_END_OPTS   = ["15:00","16:00","17:00","17:30","18:00","19:00"].map(t => ({ value: t, label: formatAMPM(t) }))
const LUNCH_START_OPTS  = ["11:00","11:30","12:00","12:30"].map(t => ({ value: t, label: formatAMPM(t) }))
const LUNCH_END_OPTS    = ["12:00","12:30","13:00","13:30","14:00"].map(t => ({ value: t, label: formatAMPM(t) }))

// ── Main Wizard ───────────────────────────────────────────────────────────────
export const AutoScheduleWizard = memo(function AutoScheduleWizard({
  sectionName, schoolYear, isICT, isDarkMode,
  students, existingSchedules, teachers, onConfirm, onCancel,
}: AutoScheduleWizardProps) {

  const majorityShift = getMajorityShift(students)
  const accent  = isICT ? "blue"   : "amber"
  const accentColor  = isICT
    ? (isDarkMode ? "text-blue-400"  : "text-blue-600")
    : (isDarkMode ? "text-amber-400" : "text-amber-600")
  const accentBtn    = isICT
    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25"
    : "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/25"
  const accentBorder = isICT
    ? isDarkMode ? "border-blue-500/25 bg-blue-500/8"  : "border-blue-200 bg-blue-50/60"
    : isDarkMode ? "border-amber-500/25 bg-amber-500/8" : "border-amber-200 bg-amber-50/60"

  const [step,       setStep]    = useState(0)
  const [subjects,   setSubjects]= useState<SubjectInput[]>([newSubject(majorityShift)])
  const [spreadMode, setSpread]  = useState<"MON_FRI" | "MON_SAT">("MON_FRI")
  const [schoolStart,setStart]   = useState("07:00")
  const [schoolEnd,  setEnd]     = useState("17:00")
  const [lunchStart, setLS]      = useState("12:00")
  const [lunchEnd,   setLE]      = useState("13:00")
  const [result,     setResult]  = useState<AutoScheduleResult | null>(null)
  const [saving,     setSaving]  = useState(false)
  const [stepError,  setStepErr] = useState("")

  const roomsList = useRooms()
  const roomNames = roomsList.map(r => r.name)

  const subjectListEndRef = useRef<HTMLDivElement>(null)

  const addSubject = () => {
    setSubjects(p => [...p, newSubject(majorityShift)])
    // scroll to newly added card after render
    setTimeout(() => subjectListEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60)
  }
  const removeSubject = (id: string) => setSubjects(p => p.filter(s => s.id !== id))
  const updateSubject = (id: string, key: string, val: any) =>
    setSubjects(p => p.map(s => s.id === id ? { ...s, [key]: val } : s))

  const validateStep1 = (): string => {
    if (!subjects.length) return "Please add at least one subject."
    const empty = subjects.find(s => !s.subject.trim())
    if (empty) return "All subjects require a name."
    const noTeacher = subjects.find(s => !(s as any).teacher_id)
    if (noTeacher) return `"${noTeacher.subject || "A subject"}" does not have a teacher assigned.`
    const noRoom = subjects.find(s => !s.room)
    if (noRoom) return `"${noRoom.subject}" does not have a room assigned.`
    return ""
  }

  const goNext = () => {
    if (step === 0) {
      const err = validateStep1()
      if (err) { setStepErr(err); return }
      setStepErr("")
      const cfg: AutoScheduleConfig = {
        sectionName, schoolYear, subjects, spreadMode,
        schoolDayStart: schoolStart, schoolDayEnd: schoolEnd,
        lunchStart, lunchEnd, existingSchedules,
      }
      setResult(generateSchedule(cfg))
      setStep(1)
    } else if (step === 1) {
      setStep(2)
    }
  }

  const handleConfirm = async () => {
    if (!result) return
    setSaving(true)
    try {
      // Map teacher_id from subjects onto the generated rows by matching teacher name
      const teacherIdByName = new Map(
        subjects.map(s => [s.teacher?.trim().toLowerCase() ?? "", (s as any).teacher_id ?? null])
      )
      const rowsWithTeacherId = result.rows.map(row => ({
        ...row,
        teacher_id: teacherIdByName.get(row.teacher?.trim().toLowerCase() ?? "") ?? null,
      }))
      await onConfirm(rowsWithTeacherId as any)
    } finally {
      setSaving(false)
    }
  }

  // Theme tokens
  const surface   = isDarkMode ? "bg-slate-900 border-slate-700/80"    : "bg-white border-slate-200"
  const headerBg  = isDarkMode ? "bg-slate-800/70 border-slate-700/80"  : "bg-slate-50/80 border-slate-100"
  const footerBg  = isDarkMode ? "bg-slate-800/50 border-slate-700/80"  : "bg-slate-50/80 border-slate-100"
  const muted     = isDarkMode ? "text-slate-400"  : "text-slate-500"
  const labelTxt  = isDarkMode ? "text-slate-200"  : "text-slate-800"
  const tHead     = isDarkMode ? "bg-slate-800/60 text-slate-400 border-slate-700" : "bg-slate-50 text-slate-500 border-slate-200"
  const configBg  = isDarkMode ? "bg-slate-800/40 border-slate-700/60" : "bg-slate-50/80 border-slate-200"

  return (
    <div className={`rounded-2xl border overflow-hidden shadow-xl ${surface}`}
      style={{ scrollbarWidth: "none" }}>
      {/* Global hide scrollbars inside wizard */}
      <style>{`.wizard-scroll::-webkit-scrollbar{display:none}`}</style>

      {/* ── Header ── */}
      <div className={`flex items-center justify-between px-4 sm:px-6 py-4 border-b ${headerBg}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-xl border flex-shrink-0 ${accentBorder}`}>
            <CalendarDays size={16} className={accentColor} />
          </div>
          <div className="min-w-0">
            <h2 className={`text-sm font-black uppercase tracking-wide truncate ${labelTxt}`}>
              Auto-Schedule Wizard
            </h2>
            <p className={`text-[9px] mt-0.5 ${muted}`}>{sectionName} · {schoolYear}</p>
          </div>
        </div>

        {/* Step indicator — compact pills */}
        <div className="hidden sm:flex items-center gap-1 mx-4">
          {STEP_LABELS.map((lbl, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all
                ${i === step
                  ? `${accentBorder} ${accentColor}`
                  : i < step
                    ? isDarkMode ? "bg-emerald-950/30 text-emerald-400 border-emerald-700/60" : "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : isDarkMode ? "bg-slate-800/60 text-slate-600 border-slate-700" : "bg-white text-slate-400 border-slate-200"
                }`}>
                {i < step
                  ? <CheckCircle2 size={10} />
                  : <span className="text-[9px] font-black">{i + 1}</span>
                }
                <span className="hidden md:inline">{lbl}</span>
              </div>
              {i < STEP_LABELS.length - 1 && <ChevronRight size={10} className={muted} />}
            </div>
          ))}
        </div>

        {/* Mobile step indicator */}
        <div className="sm:hidden flex items-center gap-1 mr-2">
          <span className={`text-[10px] font-black ${accentColor}`}>{step + 1}</span>
          <span className={`text-[10px] ${muted}`}>/ 3</span>
        </div>

        <button onClick={onCancel}
          className={`p-2 rounded-xl transition-colors flex-shrink-0
            ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-200 text-slate-500"}`}>
          <X size={15} />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="wizard-scroll overflow-y-auto" style={{ maxHeight: "72vh" }}>

        {/* ── STEP 0: Configure ── */}
        {step === 0 && (
          <div className="px-4 sm:px-6 py-5 space-y-6">

            {/* Info banner */}
            <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${isDarkMode ? "bg-slate-800/40 border-slate-700/60" : "bg-blue-50/60 border-blue-100"}`}>
              <Info size={14} className={`${accentColor} flex-shrink-0 mt-0.5`} />
              <p className={`text-xs leading-relaxed ${muted}`}>
                Subjects are placed on <strong className={labelTxt}>distinct days only</strong>. Use <strong className={labelTxt}>Repetition</strong> to schedule a subject multiple times a week.
                Default shift for <span className={accentColor}>{sectionName}</span> is{" "}
                <strong className={majorityShift === "AM" ? "text-sky-500" : "text-amber-500"}>{majorityShift}</strong>.
              </p>
            </div>

            {/* ── Schedule Settings ── */}
            <div>
              <SectionLabel label="Schedule Settings" isDarkMode={isDarkMode} />
              <div className={`rounded-2xl border p-4 space-y-4 ${configBg}`}>

                {/* Row 1: Day Spread + School Day Start */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel isDarkMode={isDarkMode}>Day Spread</FieldLabel>
                    <OptionSelect
                      value={spreadMode}
                      options={SPREAD_OPTIONS}
                      isDarkMode={isDarkMode}
                      isICT={isICT}
                      onChange={v => setSpread(v as any)}
                    />
                  </div>
                  <div>
                    <FieldLabel isDarkMode={isDarkMode}>School Day Start</FieldLabel>
                    <TimePicker
                      value={schoolStart}
                      onChange={setStart}
                      isDarkMode={isDarkMode}
                      isICT={isICT}
                      placeholder="Start time"
                    />
                  </div>
                </div>

                {/* Row 2: Lunch Break (start → end) + School Day End */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel isDarkMode={isDarkMode}>Lunch Break</FieldLabel>
                    <div className="flex items-center gap-2">
                      <TimePicker value={lunchStart} onChange={setLS} isDarkMode={isDarkMode} isICT={isICT} placeholder="Start" />
                      <span className={`text-xs font-bold flex-shrink-0 ${muted}`}>–</span>
                      <TimePicker value={lunchEnd} onChange={setLE} isDarkMode={isDarkMode} isICT={isICT} placeholder="End" />
                    </div>
                  </div>
                  <div>
                    <FieldLabel isDarkMode={isDarkMode}>School Day End</FieldLabel>
                    <TimePicker
                      value={schoolEnd}
                      onChange={setEnd}
                      isDarkMode={isDarkMode}
                      isICT={isICT}
                      placeholder="End time"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Subject Cards ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel label={`Subjects (${subjects.length})`} isDarkMode={isDarkMode} />
              </div>
              <div className="space-y-3">
                {subjects.map((s, i) => (
                  <SubjectCard
                    key={s.id}
                    subj={s as any} idx={i} count={subjects.length}
                    isDarkMode={isDarkMode} isICT={isICT}
                    teachers={teachers} roomNames={roomNames}
                    onChange={updateSubject} onRemove={removeSubject}
                  />
                ))}
                <div ref={subjectListEndRef} />
              </div>
            </div>

            {/* Add subject button */}
            <button onClick={addSubject}
              className={`flex items-center gap-2 w-full justify-center px-4 py-3 rounded-2xl border-2 border-dashed
                text-xs font-bold transition-all active:scale-[0.98]
                ${isDarkMode
                  ? "border-slate-700 text-slate-600 hover:border-slate-500 hover:text-slate-300 hover:bg-slate-800/30"
                  : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:bg-slate-50"
                }`}>
              <Plus size={14} /> Add Another Subject
            </button>

            {stepError && (
              <div className="flex items-center gap-2 text-xs text-red-500 font-bold p-3 rounded-xl bg-red-500/8 border border-red-500/20">
                <AlertTriangle size={13} className="flex-shrink-0" /> {stepError}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 1: Preview ── */}
        {step === 1 && result && (
          <div className="px-4 sm:px-6 py-5 space-y-5">

            {/* Summary badges */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold
                ${isDarkMode ? "bg-emerald-950/30 border-emerald-800/50 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                <CheckCircle2 size={12} /> {result.rows.length} periods generated
              </span>
              {result.conflicts.length > 0 && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold
                  ${isDarkMode ? "bg-red-950/30 border-red-800/50 text-red-400" : "bg-red-50 border-red-200 text-red-700"}`}>
                  <AlertTriangle size={12} /> {result.conflicts.length} conflict{result.conflicts.length !== 1 ? "s" : ""}
                </span>
              )}
              {result.warnings.length > 0 && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold
                  ${isDarkMode ? "bg-amber-950/30 border-amber-800/50 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                  <AlertTriangle size={12} /> {result.warnings.length} warning{result.warnings.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Generated schedule table */}
            <div>
              <SectionLabel label="Generated Schedule" isDarkMode={isDarkMode} />
              <div className={`rounded-xl border overflow-hidden ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
                <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b text-[9px] font-black uppercase tracking-widest ${tHead}`}>
                        <th className="px-4 py-2.5 text-left">Subject</th>
                        <th className="px-4 py-2.5 text-left">Day</th>
                        <th className="px-4 py-2.5 text-left">Time</th>
                        <th className="px-4 py-2.5 text-left hidden sm:table-cell">Room</th>
                        <th className="px-4 py-2.5 text-left">Shift</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                      {result.rows.map((r, i) => {
                        const shift = parseInt(r.start_time) < 12 ? "AM" : "PM"
                        return (
                          <tr key={i} className={`text-sm transition-colors ${isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}`}>
                            <td className={`px-4 py-2.5 font-bold text-xs ${labelTxt}`}>{r.subject}</td>
                            <td className={`px-4 py-2.5 text-xs ${muted}`}>{r.day}</td>
                            <td className={`px-4 py-2.5 font-mono text-xs ${muted}`}>{formatAMPM(r.start_time)} – {formatAMPM(r.end_time)}</td>
                            <td className={`px-4 py-2.5 text-xs hidden sm:table-cell ${muted}`}>{r.room ?? "—"}</td>
                            <td className="px-4 py-2.5">
                              <span className={`text-[10px] font-black ${shift === "AM" ? "text-sky-500" : "text-amber-500"}`}>{shift}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div className="space-y-2">
                <SectionLabel label="Warnings" isDarkMode={isDarkMode} />
                {result.warnings.map((w, i) => (
                  <div key={i} className={`flex items-start gap-2 p-3 rounded-xl border text-xs font-medium
                    ${isDarkMode ? "bg-amber-950/30 border-amber-800/40 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" /> {w}
                  </div>
                ))}
              </div>
            )}

            {result.conflicts.length > 0 && (
              <div className="space-y-2">
                <SectionLabel label="Conflicts Detected" isDarkMode={isDarkMode} />
                {result.conflicts.map((c, i) => <ConflictCard key={i} c={c} isDarkMode={isDarkMode} />)}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Confirm ── */}
        {step === 2 && result && (
          <div className="px-4 sm:px-6 py-5">
            {result.conflicts.length > 0 ? (
              <div className="space-y-4">
                <div className={`flex items-start gap-3 p-4 rounded-xl border
                  ${isDarkMode ? "bg-red-950/30 border-red-800/50" : "bg-red-50 border-red-200"}`}>
                  <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-sm font-bold mb-1 ${isDarkMode ? "text-red-300" : "text-red-700"}`}>
                      Cannot save — {result.conflicts.length} conflict{result.conflicts.length !== 1 ? "s" : ""} must be resolved.
                    </p>
                    <p className={`text-xs ${isDarkMode ? "text-red-400" : "text-red-600"}`}>
                      Return to Step 1 and adjust room or shift settings.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {result.conflicts.map((c, i) => <ConflictCard key={i} c={c} isDarkMode={isDarkMode} />)}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`flex items-start gap-3 p-4 rounded-xl border
                  ${isDarkMode ? "bg-emerald-950/30 border-emerald-800/50" : "bg-emerald-50 border-emerald-200"}`}>
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className={`text-sm font-bold mb-1 ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}>
                      No conflicts — schedule is ready to apply.
                    </p>
                    <p className={`text-xs ${isDarkMode ? "text-emerald-500" : "text-emerald-600"}`}>
                      This replaces the existing schedule for <strong>{sectionName}</strong> with {result.rows.length} new entries. This cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Total Periods", value: result.rows.length },
                    { label: "Subjects",      value: [...new Set(result.rows.map(r => r.subject))].length },
                    { label: "Days Covered",  value: [...new Set(result.rows.map(r => r.day))].length },
                  ].map(item => (
                    <div key={item.label} className={`p-3 rounded-xl border text-center ${configBg}`}>
                      <p className={`text-2xl font-black ${labelTxt}`}>{item.value}</p>
                      <p className={`text-[9px] mt-0.5 ${muted}`}>{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className={`flex items-center justify-between px-4 sm:px-6 py-4 border-t ${footerBg}`}>
        <button
          onClick={step === 0 ? onCancel : () => setStep(s => s - 1)}
          className={`flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold transition-all
            ${isDarkMode ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}>
          <ChevronLeft size={14} />
          {step === 0 ? "Cancel" : "Back"}
        </button>

        <div className="flex items-center gap-3">
          {step === 0 && (
            <span className={`text-[9px] font-bold hidden sm:block ${muted}`}>
              {subjects.length} subject{subjects.length !== 1 ? "s" : ""} configured
            </span>
          )}

          {step < 2 ? (
            <button onClick={goNext}
              className={`h-10 px-5 rounded-xl text-xs font-black text-white shadow-lg
                flex items-center gap-2 transition-all active:scale-95 ${accentBtn}`}>
              {step === 0 ? "Generate Schedule" : "Review & Confirm"}
              <ChevronRight size={13} />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={saving || (result?.conflicts.length ?? 0) > 0}
              className={`h-10 px-5 rounded-xl text-xs font-black text-white shadow-lg
                flex items-center gap-2 transition-all active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed ${accentBtn}`}>
              {saving
                ? <><RefreshCw size={13} className="animate-spin" /> Saving…</>
                : <><CheckCircle2 size={13} /> Apply Schedule</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
})