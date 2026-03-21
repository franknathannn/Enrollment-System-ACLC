// sections/components/schedule/ScheduleEntryForm.tsx

import { memo, useState, useEffect, useRef, useCallback } from "react"
import { X, Save, Clock, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DAYS } from "./types"
import type { ScheduleRow } from "./types"
import { ROOMS } from "./autoScheduler"

export interface TeacherOption {
  id:        string
  full_name: string
}

interface ScheduleEntryFormProps {
  sectionName: string
  schoolYear:  string
  isICT:       boolean
  isDarkMode:  boolean
  editing:     ScheduleRow | null
  teachers:    TeacherOption[]
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

// ── Reusable pretty time picker ───────────────────────────────────────────────
interface TimePickerProps {
  value: string
  onChange: (val: string) => void
  isDarkMode: boolean
  isICT: boolean
  placeholder?: string
  error?: string
}

function TimePicker({ value, onChange, isDarkMode, isICT, placeholder = "Select time", error }: TimePickerProps) {
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState("")
  const containerRef          = useRef<HTMLDivElement>(null)
  const searchRef             = useRef<HTMLInputElement>(null)
  const listRef               = useRef<HTMLDivElement>(null)

  const selected = TIME_OPTIONS.find(o => o.value === value)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  // Filter options by search — accepts "7", "7:30", "730", "7am", "1pm" etc.
  const filtered = TIME_OPTIONS.filter(o => {
    if (!search) return true
    const s = search.toLowerCase().replace(/\s/g, "")
    const label = o.label.toLowerCase().replace(/\s/g, "")
    const val   = o.value.replace(":", "")
    return label.includes(s) || val.includes(s)
  }).slice(0, 8) // max 8 visible at once

  const handleSelect = (val: string) => {
    onChange(val)
    setOpen(false)
    setSearch("")
  }

  const accent      = isICT ? "blue"   : "orange"
  const accentRing  = isICT ? "ring-blue-500/40 border-blue-500" : "ring-orange-500/40 border-orange-500"
  const accentHover = isICT ? "hover:bg-blue-500/10 hover:text-blue-400" : "hover:bg-orange-500/10 hover:text-orange-400"
  const accentActive= isICT ? "bg-blue-600 text-white" : "bg-orange-600 text-white"

  const triggerClass = `w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all cursor-pointer select-none
    ${isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"}
    ${open ? `ring-2 ${accentRing}` : ""}
    ${error ? "border-red-500/60" : ""}`

  const dropdownClass = `absolute z-50 mt-2 w-full rounded-2xl border shadow-2xl overflow-hidden
    ${isDarkMode ? "bg-slate-800 border-slate-700 shadow-black/60" : "bg-white border-slate-200 shadow-slate-200/80"}`

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button type="button" onClick={() => setOpen(v => !v)} className={triggerClass}>
        <div className="flex items-center gap-2 min-w-0">
          <Clock size={13} className={selected
            ? (isICT ? "text-blue-400" : "text-orange-400")
            : (isDarkMode ? "text-slate-500" : "text-slate-400")} />
          {selected ? (
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-sm">
                {selected.label.split(" ")[0]}
              </span>
              <span className={`text-[10px] font-black uppercase tracking-widest
                ${selected.period === "AM"
                  ? "text-sky-400"
                  : "text-amber-400"
                }`}>
                {selected.period}
              </span>
            </div>
          ) : (
            <span className={`text-sm ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
              {placeholder}
            </span>
          )}
        </div>
        <ChevronDown size={14}
          className={`flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""} ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className={dropdownClass}>
          {/* Search input */}
          <div className={`px-3 py-2.5 border-b ${isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-slate-100 bg-slate-50"}`}>
            <div className="relative">
              <Clock size={12} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder='Search "7:30" or "1pm"…'
                className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium outline-none transition-all
                  ${isDarkMode
                    ? "bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-slate-500"
                    : "bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-300"
                  }`}
              />
            </div>
          </div>

          {/* Options list — max 8 items, scrollable */}
          <div ref={listRef} className="max-h-56 overflow-y-auto py-1.5">
            {/* AM group */}
            {filtered.some(o => o.period === "AM") && (
              <>
                <div className={`px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em]
                  ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
                  Morning
                </div>
                {filtered.filter(o => o.period === "AM").map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => handleSelect(o.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors
                      ${o.value === value
                        ? accentActive
                        : `${isDarkMode ? "text-white" : "text-slate-900"} ${accentHover}`
                      }`}
                  >
                    <span className="font-bold">{o.label.split(" ")[0]}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest
                      ${o.value === value ? "text-white/70" : "text-sky-400"}`}>
                      AM
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* PM group */}
            {filtered.some(o => o.period === "PM") && (
              <>
                <div className={`px-3 pt-2 pb-1 text-[9px] font-black uppercase tracking-[0.2em]
                  ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
                  Afternoon / Evening
                </div>
                {filtered.filter(o => o.period === "PM").map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => handleSelect(o.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors
                      ${o.value === value
                        ? accentActive
                        : `${isDarkMode ? "text-white" : "text-slate-900"} ${accentHover}`
                      }`}
                  >
                    <span className="font-bold">{o.label.split(" ")[0]}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest
                      ${o.value === value ? "text-white/70" : "text-amber-400"}`}>
                      PM
                    </span>
                  </button>
                ))}
              </>
            )}

            {filtered.length === 0 && (
              <div className={`px-3 py-6 text-center text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
                No times match
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-[9px] text-red-400 mt-1 font-bold">{error}</p>}
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

const EMPTY = {
  subject: "", day: "Monday", start_time: "07:30", end_time: "08:30",
  teacher_id: "", teacher: "", room: "", notes: "",
}

export const ScheduleEntryForm = memo(function ScheduleEntryForm({
  sectionName, schoolYear, isICT, isDarkMode, editing, teachers, onSave, onCancel,
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

  const accentFocus = isICT
    ? "focus:ring-blue-500/40 focus:border-blue-500"
    : "focus:ring-orange-500/40 focus:border-orange-500"
  const accentBtn = isICT ? "bg-blue-600 hover:bg-blue-500" : "bg-orange-600 hover:bg-orange-500"

  const inputClass = `w-full rounded-xl border px-3 py-2 text-sm font-medium transition-all outline-none ring-0 focus:ring-2
    ${isDarkMode
      ? `bg-slate-800 border-slate-700 text-white placeholder-slate-500 ${accentFocus}`
      : `bg-white border-slate-200 text-slate-900 placeholder-slate-400 ${accentFocus}`}`

  const selectClass = `w-full rounded-xl border px-3 py-2 text-sm font-medium transition-all outline-none cursor-pointer
    ${isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"}`

  const labelClass = `block text-[9px] font-black uppercase tracking-widest mb-1.5
    ${isDarkMode ? "text-slate-400" : "text-slate-500"}`

  return (
    <div className={`rounded-3xl border overflow-visible animate-in slide-in-from-top-2 fade-in duration-300
      ${isDarkMode ? "bg-slate-900/80 border-slate-700" : "bg-white border-slate-200 shadow-lg"}`}>

      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b
        ${isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-slate-100 bg-slate-50"}`}>
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isICT ? "text-blue-400" : "text-orange-400"}`}>
            {editing ? "Edit Entry" : "New Schedule Entry"}
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
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 overflow-visible">

        {/* Subject */}
        <div className="sm:col-span-2 lg:col-span-1">
          <label className={labelClass}>Subject *</label>
          <input className={inputClass} placeholder="e.g. Oral Communication"
            value={form.subject} onChange={e => set("subject", e.target.value)} />
          {errors.subject && <p className="text-[9px] text-red-400 mt-1 font-bold">{errors.subject}</p>}
        </div>

        {/* Day */}
        <div>
          <label className={labelClass}>Day *</label>
          <select className={selectClass} value={form.day} onChange={e => set("day", e.target.value)}>
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Start Time */}
        <div className="relative z-20">
          <label className={labelClass}>Start Time *</label>
          <TimePicker
            value={form.start_time}
            onChange={v => set("start_time", v)}
            isDarkMode={isDarkMode}
            isICT={isICT}
            placeholder="Select start time"
            error={errors.start_time}
          />
        </div>

        {/* End Time */}
        <div className="relative z-10">
          <label className={labelClass}>End Time *</label>
          <TimePicker
            value={form.end_time}
            onChange={v => set("end_time", v)}
            isDarkMode={isDarkMode}
            isICT={isICT}
            placeholder="Select end time"
            error={errors.end_time}
          />
        </div>

        {/* Teacher */}
        <div>
          <label className={labelClass}>Teacher *</label>
          <select
            className={`${selectClass} ${errors.teacher_id ? "border-red-400 focus:ring-red-400/30" : ""}`}
            value={(form as any).teacher_id ?? ""}
            onChange={e => { set("teacher_id", e.target.value); setErrors(p => ({ ...p, teacher_id: "" })) }}>
            <option value="">— Select a teacher —</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
          {errors.teacher_id && <p className="text-[9px] text-red-400 font-bold mt-1">{errors.teacher_id}</p>}
        </div>

        {/* Room */}
        <div>
          <label className={labelClass}>Room <span className="opacity-40 normal-case font-bold">(optional)</span></label>
          <select className={selectClass} value={form.room} onChange={e => set("room", e.target.value)}>
            <option value="">— None —</option>
            {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Notes */}
        <div className="sm:col-span-2 lg:col-span-1">
          <label className={labelClass}>Notes <span className="opacity-40 normal-case font-bold">(optional)</span></label>
          <input className={inputClass} placeholder="Any additional notes..."
            value={form.notes} onChange={e => set("notes", e.target.value)} />
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