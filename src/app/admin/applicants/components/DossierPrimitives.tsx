// src/app/admin/applicants/components/DossierPrimitives.tsx
import { memo, useState, useRef, useEffect, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Check, ChevronDown, Search, X, AlertTriangle } from "lucide-react"
import { AnimatedText } from "../../dashboard/components/primitives"
import { SCHOOLS_SORTED } from "@/lib/data/philippineSchools"

// ── Shared class builders ──────────────────────────────────────────────────
export const getInputClass = (isDarkMode: boolean) =>
  `h-9 text-sm font-bold transition-all ${
    isDarkMode
      ? "bg-slate-900 border-slate-700 text-white focus:border-blue-500"
      : "bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
  }`

export const getLabelClass = (isDarkMode: boolean) =>
  `text-[9px] uppercase font-black tracking-[0.2em] ${isDarkMode ? "text-slate-500" : "text-slate-500"}`

// ── InfoBlock ──────────────────────────────────────────────────────────────
// CHANGED: added min-w-0 + overflow-hidden to root div, and to the flex row.
// Value <p> uses break-all + w-full so long strings (URLs, addresses, names)
// never push outside their column margin.
export const InfoBlock = memo(function InfoBlock({
  label, value, icon, isDarkMode, animate = true,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  isDarkMode: boolean
  animate?: boolean
}) {
  return (
    <div className="group transition-all duration-300 min-w-0 overflow-hidden">
      <p className={`text-[9px] md:text-[10px] uppercase font-black tracking-[0.2em] mb-1.5 transition-colors ${isDarkMode ? "text-slate-500 group-hover:text-blue-400" : "text-slate-400 group-hover:text-blue-600"}`}>
        {label}
      </p>
      <div className="flex items-start gap-2.5 min-w-0 overflow-hidden">
        {icon && <span className={`shrink-0 mt-0.5 ${isDarkMode ? "text-blue-400/30" : "text-blue-500/40"}`}>{icon}</span>}
        <p className={`font-bold text-sm md:text-base leading-snug transition-colors duration-500 whitespace-pre-line break-all w-full min-w-0 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
          {animate ? <AnimatedText text={value || "—"} className="whitespace-pre-line break-all" /> : (value || "—")}
        </p>
      </div>
    </div>
  )
})

// ── FieldRow: wraps a single editable/display field ───────────────────────
// CHANGED: added optional maxLength prop + char counter when editing
export const FieldRow = memo(function FieldRow({
  label, field, formData, isEditing, isDarkMode, onChange, icon, maxLength,
}: {
  label: string
  field: string
  formData: any
  isEditing: boolean
  isDarkMode: boolean
  onChange: (field: string, value: string) => void
  icon?: React.ReactNode
  maxLength?: number
}) {
  const inputClass = getInputClass(isDarkMode)
  const labelClass = getLabelClass(isDarkMode)
  return (
    <div className="space-y-1.5 min-w-0 overflow-hidden">
      {isEditing ? (
        <>
          <div className="flex justify-between items-center">
            <p className={labelClass}>{label}</p>
            {maxLength && (
              <span className="text-[9px] text-slate-500">
                {(formData[field] || "").length}/{maxLength}
              </span>
            )}
          </div>
          <Input
            value={formData[field] || ""}
            onChange={(e) => onChange(field, e.target.value)}
            className={inputClass}
            maxLength={maxLength}
          />
        </>
      ) : (
        <InfoBlock label={label} value={formData[field] || "—"} icon={icon} isDarkMode={isDarkMode} />
      )}
    </div>
  )
})

// ── DropdownField: single-select dropdown for edit mode ───────────────────
export const DropdownField = memo(function DropdownField({
  label, field, options, formData, isDarkMode, isOpen, onToggle, onSelect, displayValue,
}: {
  label: string
  field: string
  options: string[]
  formData: any
  isDarkMode: boolean
  isOpen: boolean
  onToggle: () => void
  onSelect: (val: string) => void
  displayValue?: string
}) {
  const inputClass = getInputClass(isDarkMode)
  const labelClass = getLabelClass(isDarkMode)
  return (
    <div className="relative space-y-1.5 min-w-0">
      <p className={labelClass}>{label}</p>
      <Button
        onClick={onToggle}
        className={`w-full justify-between ${inputClass} px-3`}
        variant="ghost"
      >
        {displayValue ?? formData[field] ?? `Select ${label}`}
        <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </Button>
      {isOpen && (
        <div className={`absolute top-full left-0 w-full mt-2 rounded-xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-100"}`}>
          <div className="p-1 space-y-1">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => onSelect(opt)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors text-left ${
                  formData[field] === opt
                    ? isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"
                    : isDarkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {opt}
                {formData[field] === opt && <Check size={12} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

// ── SectionTitle ─────────────────────────────────────────────────────────
export const SectionTitle = memo(function SectionTitle({
  icon, title, isDarkMode, colorClass,
}: {
  icon: React.ReactNode
  title: string
  isDarkMode: boolean
  colorClass: string
}) {
  return (
    <h3 className={`flex items-center gap-3 font-black text-[11px] uppercase tracking-[0.3em] border-b pb-4 transition-colors duration-500 ${colorClass} ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
      {icon} {title}
    </h3>
  )
})

// ── SchoolSearchPicker ─────────────────────────────────────────────────────
const NOT_LISTED = "School Not Listed / Not Found"

export const SchoolSearchPicker = memo(function SchoolSearchPicker({
  value, onChange, isDarkMode, error, disabled
}: {
  value: string
  onChange: (val: string) => void
  isDarkMode: boolean
  error?: string
  disabled?: boolean
}) {
  const [query, setQuery] = useState(value && value !== NOT_LISTED ? value : "")
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value === NOT_LISTED) setQuery("")
    else setQuery(value || "")
  }, [value])

  const filtered = useMemo(() => {
    if (!query.trim()) return SCHOOLS_SORTED.slice(0, 40)
    const q = query.toLowerCase()
    return SCHOOLS_SORTED.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 50)
  }, [query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleSelect = (school: string) => {
    onChange(school)
    setQuery(school === NOT_LISTED ? "" : school)
    setOpen(false)
  }

  const inputClass = getInputClass(isDarkMode)

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative group">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${isDarkMode ? "text-slate-500 group-focus-within:text-blue-500" : "text-slate-400 group-focus-within:text-blue-600"}`} />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          placeholder="Type or search school name..."
          className={`${inputClass} pl-9 pr-8 w-full rounded-md border outline-none`}
        />
        {query && (
          <button type="button" onClick={() => { setQuery(""); onChange(""); setOpen(false) }} className={`absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? "text-slate-600 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"}`}>
            <X size={14} />
          </button>
        )}
      </div>
      {open && !disabled && (
        <div className={`absolute top-full left-0 w-full mt-2 rounded-xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-100"}`}>
          <button type="button" onClick={() => handleSelect(NOT_LISTED)} className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-b transition-colors ${isDarkMode ? "border-slate-800 text-amber-500 hover:bg-amber-900/20" : "border-slate-100 text-amber-600 hover:bg-amber-50"}`}>
            ⚠ School Not Listed / Not Found
          </button>
          <div className="max-h-52 overflow-y-auto p-1 space-y-1">
            {filtered.length === 0 ? (
              <p className={`text-[10px] text-center py-4 uppercase tracking-widest ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>No match — select "Not Listed" above or keep typing</p>
            ) : (
              filtered.map((school) => (
                <button key={school.name} type="button" onClick={() => handleSelect(school.name)} className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${value === school.name ? (isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600") : (isDarkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}`}>
                  <span className="text-[11px] font-bold block truncate">{school.name}</span>
                  <span className={`text-[9px] uppercase tracking-wider ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>{school.type}{school.region ? ` · ${school.region}` : ""}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {error && <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 mt-1.5 ml-1"><AlertTriangle size={10} /> {error}</p>}
    </div>
  )
})
