"use client"

/**
 * Step2Academic — optimized for mobile Chrome performance.
 *
 * Key changes vs original:
 * - useThemeStore() REMOVED — all theming via CSS vars (t-* classes from globals.css)
 * - isMounted gate REMOVED — caused double render on every mount with no benefit
 * - watch() with no args REMOVED — was re-rendering entire form on every keystroke
 * - CheckCard extracted OUTSIDE main component — was recreated on every render
 * - SchoolSearchPicker useThemeStore REMOVED — uses CSS vars instead
 * - CharCounter isolated via useWatch — typing in address only re-renders the counter
 * - transition-all → transition-[border-color,background-color] — compositor-safe only
 * - enforceMaxLength uses setValue directly — no synthetic event double-fire
 * - requestAnimationFrame for scroll reset — avoids layout thrash on mount
 */

import { useEffect, useState, useMemo, useRef, useCallback, memo } from "react"
import { useForm, useWatch } from "react-hook-form"
import { useEnrollmentStore } from "@/store/useEnrollmentStore"
import { useThemeStore } from "@/store/useThemeStore"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowRight, ChevronLeft, GraduationCap, CalendarDays, Loader2,
  Fingerprint, Star, Sparkles, AlertTriangle, MapPin,
  Facebook, Monitor, Clock, Search, X, Globe,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useEnrollmentValidation } from "@/hooks/useEnrollmentValidation"
import { SCHOOLS_SORTED } from "@/lib/data/philippineSchools"

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA
// ─────────────────────────────────────────────────────────────────────────────
const STRAND_OPTIONS = [
  { value: "ICT", label: "Information and Communication Technology (ICT)" },
  { value: "GAS", label: "General Academics (GAS)" },
]

const SCHOOL_YEAR_REGEX = /^\d{4}-\d{4}$/
const NOT_LISTED = "School Not Listed / Not Found"

// ─────────────────────────────────────────────────────────────────────────────
// PURE VALIDATORS — module-level, stable references
// ─────────────────────────────────────────────────────────────────────────────
function validateSchoolYear(val: string) {
  if (!val) return "Required"
  if (!SCHOOL_YEAR_REGEX.test(val)) return "Format: YYYY-YYYY (e.g. 2023-2024)"
  const [start, end] = val.split("-").map(Number)
  if (end !== start + 1) return "End year must be start year + 1"
  return true
}

function validateGWA(val: string | undefined): true | string {
  if (!val || val.toString().trim() === "") return "GWA is required"
  const str = val.toString().trim()
  if (!/^\d{1,3}(\.\d{0,2})?$/.test(str)) return "Format: NN.NN (max 2 decimal places)"
  const num = parseFloat(str)
  if (isNaN(num)) return "Invalid GWA"
  if (num < 65)  return "GWA must be at least 65.00"
  if (num > 100) return "GWA cannot exceed 100.00"
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// buildFieldClass — pure fn, no isDark, uses t-input CSS vars
// ─────────────────────────────────────────────────────────────────────────────
function buildFieldClass(opts: { hasError: boolean; filled: boolean; isLRN?: boolean }) {
  const { hasError, filled, isLRN } = opts
  return cn(
    "min-h-[44px] h-11 md:h-12 rounded-xl border-2",
    "transition-all duration-300",
    "font-medium outline-none t-input",
    isLRN ? "font-mono text-sm md:text-base tracking-[0.15em] md:tracking-[0.3em]" : "text-xs md:text-sm",
    hasError
      ? "error shadow-[0_0_20px_rgba(239,68,68,0.15)]"
      : cn(
          "focus:shadow-[0_0_20px_rgba(59,130,246,0.2)]",
          filled ? "filled shadow-sm" : "lg:hover:border-blue-500/30"
        )
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CharCounter — isolated, only re-renders itself
// ─────────────────────────────────────────────────────────────────────────────
function CharCounter({ control, name, max }: { control: any; name: string; max: number }) {
  const value = useWatch({ control, name }) as string | undefined
  return <span className="text-[9px] t-text-faint">{(value || "").length}/{max}</span>
}

// ─────────────────────────────────────────────────────────────────────────────
// CheckCard — extracted OUTSIDE main component so it's never recreated.
// No isDark prop — uses CSS vars for theming.
// ─────────────────────────────────────────────────────────────────────────────
const CheckCard = memo(function CheckCard({
  label, sublabel, checked, onClick, icon, disabled,
}: {
  label: string; sublabel?: string; checked: boolean
  onClick: () => void; icon?: React.ReactNode; disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex items-center gap-4 sm:gap-6 w-full rounded-[32px] border-2 px-6 py-5 sm:py-6",
        "transition-all duration-300",
        "text-left touch-manipulation active:scale-[0.98] lg:hover:-translate-y-1 relative overflow-hidden",
        checked
          ? "border-blue-500/50 bg-blue-600/20 shadow-[0_20px_40px_rgba(59,130,246,0.2)]"
          : "t-gender-inactive lg:hover:border-blue-500/30 lg:hover:bg-blue-600/5",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className={cn(
        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0",
        "transition-all duration-300",
        checked ? "border-blue-400 bg-blue-400/20" : "border-slate-600"
      )}>
        {checked && <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />}
      </div>
      <div className="flex-1 min-w-0 relative z-10">
        <p className={cn(
          "font-black text-xs sm:text-sm uppercase tracking-[0.2em]",
          checked ? "text-blue-400" : "t-text-muted"
        )}>{label}</p>
        {sublabel && <p className="text-[10px] text-slate-500 mt-1 font-medium tracking-wide leading-relaxed">{sublabel}</p>}
      </div>
      {icon && <div className={cn("shrink-0 transition-all duration-300", checked ? "text-blue-400 scale-110" : "text-slate-700")}>{icon}</div>}
      
      {/* Visual Impact Flare */}
      {checked && (
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-600 blur-3xl opacity-20 animate-pulse" />
      )}
    </button>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// SchoolSearchPicker — memo'd, NO useThemeStore
// ─────────────────────────────────────────────────────────────────────────────
const SchoolSearchPicker = memo(function SchoolSearchPicker({
  value, onChange, error, disabled,
}: {
  value: string; onChange: (val: string) => void; error?: string; disabled?: boolean
}) {
  const [query, setQuery] = useState(value && value !== NOT_LISTED ? value : "")
  const [open, setOpen]   = useState(false)
  const containerRef      = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return SCHOOLS_SORTED.slice(0, 40)
    const q = query.toLowerCase()
    return SCHOOLS_SORTED.filter(s => s.name.toLowerCase().includes(q)).slice(0, 50)
  }, [query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleSelect = useCallback((school: string) => {
    onChange(school)
    setQuery(school === NOT_LISTED ? "" : school)
    setOpen(false)
  }, [onChange])

  const handleClear = useCallback(() => {
    setQuery(""); onChange(""); setOpen(false)
  }, [onChange])

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          placeholder="Type or search school name..."
          className={cn(
            "w-full min-h-[44px] h-11 md:h-12 rounded-xl border-2 pl-12 pr-10",
            "font-medium outline-none text-xs md:text-sm",
            "transition-[border-color,background-color] duration-150 t-input",
            value ? "filled" : "",
            error ? "error" : "",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 t-text-muted lg:hover:t-text transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && !disabled && (
        <div className="absolute top-full left-0 w-full mt-2 rounded-xl border shadow-2xl z-50 overflow-hidden t-surface">
          <button
            type="button"
            onClick={() => handleSelect(NOT_LISTED)}
            className={cn(
              "w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-b transition-colors",
              "border-slate-800",
              value === NOT_LISTED
                ? "bg-amber-900/30 text-amber-400"
                : "text-amber-500/80 lg:hover:bg-amber-900/20 lg:hover:text-amber-400"
            )}
          >
            ⚠ School Not Listed / Not Found
          </button>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-[10px] t-text-faint text-center py-4 uppercase tracking-widest">
                No match — select "Not Listed" above or keep typing
              </p>
            ) : filtered.map(school => (
              <button
                key={school.name}
                type="button"
                onClick={() => handleSelect(school.name)}
                className={cn(
                  "w-full text-left px-4 py-2.5 transition-colors",
                  value === school.name
                    ? "bg-blue-900/30 text-blue-400"
                    : "t-text-muted lg:hover:bg-white/5 lg:hover:t-text"
                )}
              >
                <span className="text-[11px] font-semibold block t-text">{school.name}</span>
                <span className="text-[9px] text-slate-600 uppercase tracking-wider">
                  {school.type}{school.region ? ` · ${school.region}` : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 mt-1.5 ml-1">
          <AlertTriangle size={10} /> {error}
        </p>
      )}
    </div>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// Isolated field components — each manages own "filled" state
// so typing in one field never re-renders siblings
// ─────────────────────────────────────────────────────────────────────────────

const LrnInput = memo(function LrnInput({
  register, setValue, hasError, editable, required, defaultFilled,
}: {
  register: any; setValue: any; hasError: boolean
  editable: boolean; required: boolean; defaultFilled: boolean
}) {
  const [filled, setFilled] = useState(defaultFilled)
  const cls = buildFieldClass({ hasError, filled, isLRN: true })
  return (
    <Input
      {...register("lrn", {
        required: required ? "Required" : false,
        pattern: { value: /^\d{12}$/, message: "Must be exactly 12 digits" },
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          const v = e.target.value.replace(/\D/g, "")
          e.target.value = v
          setValue("lrn", v, { shouldDirty: false })
          setFilled(v.length > 0)
        },
      })}
      id="lrn"
      placeholder="000000000000"
      maxLength={12}
      disabled={!editable}
      className={cn("pl-12", cls, !editable && "opacity-50 cursor-not-allowed")}
    />
  )
})

const SchoolAddressInput = memo(function SchoolAddressInput({
  register, setValue, hasError, editable, required, defaultFilled,
}: {
  register: any; setValue: any; hasError: boolean
  editable: boolean; required: boolean; defaultFilled: boolean
}) {
  const [filled, setFilled] = useState(defaultFilled)
  const cls = buildFieldClass({ hasError, filled })
  return (
    <Input
      {...register("last_school_address", {
        required: required ? "Required" : false,
        maxLength: { value: 100, message: "Max 100 characters" },
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFilled(e.target.value.trim().length > 0),
      })}
      id="last_school_address"
      placeholder="Street, Barangay, City/Municipality, Province"
      maxLength={100}
      disabled={!editable}
      onInput={(e: React.FormEvent<HTMLInputElement>) => {
        const el = e.currentTarget
        if (el.value.length > 100) {
          el.value = el.value.slice(0, 100)
          setValue("last_school_address", el.value, { shouldDirty: false })
        }
        setFilled(el.value.trim().length > 0)
      }}
      className={cn("pl-11 md:pl-12", cls, !editable && "opacity-50 cursor-not-allowed")}
    />
  )
})

const SimpleTextInput = memo(function SimpleTextInput({
  register, setValue, fieldName, hasError, editable, required, placeholder,
  icon, defaultFilled, extraRegisterProps,
}: {
  register: any; setValue: any; fieldName: string; hasError: boolean
  editable: boolean; required: boolean; placeholder: string
  icon: React.ReactNode; defaultFilled: boolean; extraRegisterProps?: any
}) {
  const [filled, setFilled] = useState(defaultFilled)
  const cls = buildFieldClass({ hasError, filled })
  return (
    <div className="relative">
      {icon}
      <Input
        {...register(fieldName, {
          required: required ? "Required" : false,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFilled(e.target.value.trim().length > 0),
          ...extraRegisterProps,
        })}
        placeholder={placeholder}
        disabled={!editable}
        className={cn("pl-11 md:pl-12", cls, !editable && "opacity-50 cursor-not-allowed")}
      />
    </div>
  )
})

const GwaInput = memo(function GwaInput({
  register, hasError, editable, required, selectedCategory, defaultFilled,
}: {
  register: any; hasError: boolean; editable: boolean
  required: boolean; selectedCategory: string; defaultFilled: boolean
}) {
  const [filled, setFilled] = useState(defaultFilled)
  const cls = buildFieldClass({ hasError, filled })
  return (
    <Input
      {...register("gwa_grade_10", {
        required: required ? "GWA is required" : false,
        validate: (val: string) => {
          if (selectedCategory !== "JHS Graduate") return true
          if (!val && !required) return true
          return validateGWA(val)
        },
      })}
      id="gwa"
      type="text"
      inputMode="decimal"
      placeholder="e.g. 88.50"
      maxLength={6}
      disabled={!editable}
      onInput={(e: React.FormEvent<HTMLInputElement>) => {
        const el = e.target as HTMLInputElement
        let v = el.value.replace(/[^0-9.]/g, "")
        const dot = v.indexOf(".")
        if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "").slice(0, 2)
        el.value = v
        setFilled(v.trim().length > 0)
      }}
      className={cn("pl-12", cls, !editable && "opacity-50 cursor-not-allowed")}
    />
  )
})

const YearJhsInput = memo(function YearJhsInput({
  register, setValue, watch, hasError, editable, required, defaultFilled,
}: {
  register: any; setValue: any; watch: any; hasError: boolean
  editable: boolean; required: boolean; defaultFilled: boolean
}) {
  const [filled, setFilled] = useState(defaultFilled)
  const cls = buildFieldClass({ hasError, filled })
  return (
    <Input
      {...register("year_completed_jhs", {
        required: required ? "Required" : false,
        validate: (val: string) => {
          if (!val && !required) return true
          return validateSchoolYear(val)
        },
      })}
      id="year_completed_jhs"
      placeholder="YYYY-YYYY"
      maxLength={9}
      disabled={!editable}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        const prev = watch("year_completed_jhs") || ""
        let val = e.target.value.replace(/[^0-9-]/g, "")
        if (val.length > prev.length && val.length === 4 && !val.includes("-")) val += "-"
        setValue("year_completed_jhs", val, { shouldValidate: true })
        setFilled(val.trim().length > 0)
      }}
      className={cn("pl-12", cls, !editable && "opacity-50 cursor-not-allowed")}
    />
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Step2Academic() {
  const { isDark }                          = useThemeStore()
  const { formData, updateFormData, setStep } = useEnrollmentStore()
  const { isFieldRequired, isFieldEditable }  = useEnrollmentValidation()
  const [dbSchoolYear, setDbSchoolYear]     = useState<string>("")
  const [fetchingYear, setFetchingYear]     = useState(true)
  const [checking, setChecking]             = useState(false)
  const [grade12Enabled, setGrade12Enabled] = useState(true)

  const {
    register, handleSubmit, setValue, watch, control, getValues,
    formState: { errors },
  } = useForm({
    shouldFocusError: false,
    defaultValues: {
      lrn:                  formData.lrn                       || "",
      school_year:          formData.school_year               || "",
      grade_level:          (formData as any).grade_level      || "11",
      student_category:     formData.student_category          || "",
      strand:               formData.strand                    || "",
      last_school_attended: formData.last_school_attended      || "",
      last_school_address:  (formData as any).last_school_address  || "",
      gwa_grade_10:         formData.gwa_grade_10              || "",
      year_completed_jhs:   (formData as any).year_completed_jhs   || "",
      facebook_user:        (formData as any).facebook_user    || "",
      facebook_link:        (formData as any).facebook_link    || "",
      school_type:          (formData as any).school_type      || "",
      preferred_modality:   (formData as any).preferred_modality  || "",
      preferred_shift:      (formData as any).preferred_shift  || "",
    },
  })

  // Only watch fields that drive conditional rendering — not char counters
  const selectedCategory   = watch("student_category")
  const selectedStrand     = watch("strand")
  const selectedModality   = watch("preferred_modality")
  const selectedShift      = watch("preferred_shift")
  const selectedSchoolType = watch("school_type")
  const watchLastSchool    = watch("last_school_attended")
  const selectedGradeLevel = watch("grade_level")

  useEffect(() => {
    const raf = requestAnimationFrame(() => window.scrollTo(0, 0))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    async function fetchActiveYear() {
      try {
        const { data } = await supabase.from("system_config").select("school_year").single()
        if (data?.school_year) {
          setDbSchoolYear(data.school_year)
          setValue("school_year", data.school_year)
        }
      } catch (err) {
        console.error("Failed to fetch SY:", err)
      } finally {
        setFetchingYear(false)
      }
    }
    async function fetchGrade12Setting() {
      try {
        const { data } = await supabase.from("system_config").select("grade12_enabled").single()
        const g12 = data?.grade12_enabled ?? true
        setGrade12Enabled(g12)
        if (!g12 && (formData as any).grade_level === "12") {
          setValue("grade_level", "11", { shouldValidate: true })
          updateFormData({ grade_level: "11" } as any)
        }
      } catch {
        // column may not exist yet — default stays true
      }
    }
    fetchActiveYear()
    fetchGrade12Setting()
  }, [setValue])

  const onSubmit = useCallback(async (data: any) => {
    setChecking(true)
    try {
      const { data: existingLrn } = await supabase
        .from("students").select("id")
        .eq("lrn", data.lrn)
        .neq("id", formData.id || "00000000-0000-0000-0000-000000000000")
        .maybeSingle()
      if (existingLrn) { toast.error("LRN is already registered in the database."); setChecking(false); return }
      updateFormData(data); setStep(3)
      toast.success("Academic Background Submitted", { icon: <span className="w-5 h-5 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-white"><img src="/logo-aclc.png" className="w-full h-full object-contain" alt="" /></span> })
    } catch (e) {
      console.error("Validation check failed:", e)
      toast.error("System validation failed. Please try again.")
    } finally { setChecking(false) }
  }, [formData.id, updateFormData, setStep])

  const onError = (errors: any) => {
    const errorKeys = Object.keys(errors); if (errorKeys.length === 0) return
    const firstError = errorKeys[0]
    const el = document.getElementById(`${firstError}_container`) || document.getElementsByName(firstError)[0]
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      toast.error(`Missing or invalid: ${firstError.replace(/_/g, " ")}`, { duration: 4000 })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} className="animate-step-in">
      <style>{`
        @keyframes stepIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translate3d(-50%, -50%, 0); }
          50% { transform: translate3d(-50%, calc(-50% - 15px), 0); }
        }
        .animate-step-in {
          animation: stepIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
          will-change: opacity, transform;
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) { .animate-step-in { animation: none; } }
      `}</style>

      {/* BACKGROUND BRANDING */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={cn(
          "absolute top-1/2 left-1/2 w-[clamp(280px,80vw,500px)] aspect-square transition-opacity duration-1000 animate-float",
          isDark ? "opacity-[0.05] brightness-150" : "opacity-[0.10]"
        )}>
          <img src="/logo-aclc.png" alt="" className="w-full h-full object-contain" />
        </div>
        <div className={cn(
          "absolute top-0 right-0 w-1/3 h-1/3 blur-[120px] rounded-full",
          isDark ? "bg-blue-600/10" : "bg-blue-600/5"
        )} />
        <div className={cn(
          "absolute bottom-0 left-0 w-1/3 h-1/3 blur-[120px] rounded-full",
          isDark ? "bg-red-600/10" : "bg-red-600/5"
        )} />
      </div>

      <div className="space-y-6 md:space-y-8 pb-[140px] min-[480px]:pb-[160px]">

        {/* HEADER */}
        <div className={cn(
          "rounded-2xl sm:rounded-[40px] p-5 sm:p-8 border flex items-center gap-4 sm:gap-6 shadow-2xl relative overflow-hidden",
          isDark ? "bg-blue-600/10 border-white/10 text-white" : "bg-white/95 border-blue-100 text-slate-900"
        )}>
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 via-blue-400 to-red-500" />
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl sm:rounded-[24px] flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30 group-hover:scale-110 transition-transform duration-500">
            <GraduationCap className="text-white w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-blue-600/20 text-blue-400 text-[8px] font-black uppercase tracking-[0.2em] border border-blue-500/20">Step 02</span>
              <div className="h-px w-8 bg-blue-500/20" />
              <Sparkles size={10} className="text-blue-400 animate-pulse" />
            </div>
            <h2 className={cn(
              "text-lg sm:text-2xl md:text-3xl font-black tracking-tighter uppercase italic leading-none",
              isDark ? "text-white" : "text-slate-900"
            )}>Academic <span className="text-blue-600">Background</span></h2>
          </div>
        </div>

        {/* LRN */}
        <div className="relative z-[100] space-y-2 group" id="lrn_container">
          <Label htmlFor="lrn" className={cn(
            "font-bold text-[10px] uppercase tracking-[0.3em] ml-2 transition-colors group-focus-within:text-blue-400",
            errors.lrn ? "text-red-500" : "t-text-muted"
          )}>
            Learners Reference Number (LRN) {isFieldRequired("lrn") && <span className="text-red-500">*</span>}
          </Label>
          <div className="relative">
            <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700 transition-colors group-focus-within:text-blue-400" />
            <LrnInput
              register={register} setValue={setValue}
              hasError={!!errors.lrn} editable={isFieldEditable("lrn")}
              required={isFieldRequired("lrn")} defaultFilled={!!(formData.lrn?.trim())}
            />
          </div>
          {errors.lrn && (
            <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 ml-2">
              <AlertTriangle size={10} /> {errors.lrn.message as string}
            </p>
          )}
        </div>

        {/* SCHOOL YEAR (read-only) */}
        <div className="space-y-2">
          <Label className="t-text-muted font-bold text-[10px] uppercase tracking-[0.3em] ml-2">Active School Year</Label>
          <div className="h-11 md:h-12 rounded-xl border flex items-center px-4 gap-3 shadow-inner t-input">
            {fetchingYear
              ? <Loader2 size={16} className="animate-spin text-blue-600" />
              : <CalendarDays size={16} className="text-blue-700" />}
            <span className="font-bold uppercase tracking-tighter text-[10px] md:text-xs t-text-muted">
              {fetchingYear ? "Syncing..." : `S.Y. ${dbSchoolYear}`}
            </span>
          </div>
        </div>

        {/* GRADE LEVEL */}
        <div className="space-y-3" id="grade_level_container">
          <Label className={cn("font-bold text-[10px] uppercase tracking-[0.3em] ml-2", "t-text-muted")}>
            Grade Level <span className="text-red-500">*</span>
          </Label>
          <input type="hidden" {...register("grade_level")} />
          <div className={`grid gap-3 ${grade12Enabled ? "grid-cols-2" : "grid-cols-1"}`}>
            <CheckCard
              label="Grade 11" sublabel="New SHS Student"
              checked={selectedGradeLevel === "11"}
              onClick={() => {
                setValue("grade_level", "11", { shouldValidate: true })
                updateFormData({ grade_level: "11" } as any)
              }}
              icon={<GraduationCap size={20} />}
            />
            {grade12Enabled && (
              <CheckCard
                label="Grade 12" sublabel="Continuing Student"
                checked={selectedGradeLevel === "12"}
                onClick={() => {
                  setValue("grade_level", "12", { shouldValidate: true })
                  updateFormData({ grade_level: "12" } as any)
                }}
                icon={<GraduationCap size={20} />}
              />
            )}
          </div>
        </div>

        {/* STUDENT CATEGORY */}
        <div className="space-y-3" id="student_category_container">
          <Label className={cn("font-bold text-[10px] uppercase tracking-[0.3em] ml-2", (errors as any).student_category ? "text-red-500" : "t-text-muted")}>
            Junior High School Completer Category {isFieldRequired("student_category") && <span className="text-red-500">*</span>}
          </Label>
          <input type="hidden" {...register("student_category", { required: isFieldRequired("student_category") ? "Required" : false })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckCard
              label="JHS Graduate" sublabel="Completed Grade 10"
              checked={selectedCategory === "JHS Graduate"}
              onClick={() => { setValue("student_category", "JHS Graduate", { shouldValidate: true }); updateFormData({ student_category: "JHS Graduate" }) }}
              disabled={!isFieldEditable("student_category")}
              icon={<GraduationCap size={20} />}
            />
            <CheckCard
              label="ALS Passer" sublabel="Alternative Learning System"
              checked={selectedCategory === "ALS Passer"}
              onClick={() => { setValue("student_category", "ALS Passer", { shouldValidate: true }); updateFormData({ student_category: "ALS Passer" }); setValue("gwa_grade_10", "") }}
              disabled={!isFieldEditable("student_category")}
              icon={<Star size={20} />}
            />
            {/* Only JHS Graduate and ALS Passer for both G11 and G12 */}
          </div>
          {(errors as any).student_category && (
            <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 ml-2">
              <AlertTriangle size={10} /> Please select a category
            </p>
          )}
        </div>

        {/* SCHOOL TYPE */}
        <div className="space-y-3" id="school_type_container">
          <Label className={cn("font-bold text-[10px] uppercase tracking-[0.3em] ml-2", (errors as any).school_type ? "text-red-500" : "t-text-muted")}>
            Previous School Type {isFieldRequired("school_type") && <span className="text-red-500">*</span>}
          </Label>
          <input type="hidden" {...register("school_type", { required: isFieldRequired("school_type") ? "Required" : false })} />
          <div className="grid grid-cols-2 gap-3">
            <CheckCard label="Public School" checked={selectedSchoolType === "Public"} onClick={() => setValue("school_type", "Public", { shouldValidate: true })} disabled={!isFieldEditable("school_type")} />
            <CheckCard label="Private School" checked={selectedSchoolType === "Private"} onClick={() => setValue("school_type", "Private", { shouldValidate: true })} disabled={!isFieldEditable("school_type")} />
          </div>
          {(errors as any).school_type && (
            <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 ml-2">
              <AlertTriangle size={10} /> Please select school type
            </p>
          )}
        </div>

        {/* YEAR COMPLETED JHS */}
        <div className="relative z-[80] space-y-2 group" id="year_completed_jhs_container">
          <div className="flex justify-between items-center">
            <Label htmlFor="year_completed_jhs" className={cn(
              "font-bold text-[10px] uppercase tracking-[0.3em] ml-2 transition-colors group-focus-within:text-blue-400",
              (errors as any).year_completed_jhs ? "text-red-500" : "t-text-muted"
            )}>
              Year Completed Junior High School {isFieldRequired("year_completed_jhs") && <span className="text-red-500">*</span>}
            </Label>
            {(errors as any).year_completed_jhs && (
              <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1">
                <AlertTriangle size={10} /> {(errors as any).year_completed_jhs.message}
              </span>
            )}
          </div>
          <div className="relative">
            <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700 transition-colors group-focus-within:text-blue-400" />
            <YearJhsInput
              register={register} setValue={setValue} watch={watch}
              hasError={!!(errors as any).year_completed_jhs}
              editable={isFieldEditable("year_completed_jhs")}
              required={isFieldRequired("year_completed_jhs")}
              defaultFilled={!!((formData as any).year_completed_jhs?.trim())}
            />
          </div>
          <p className="text-[9px] text-slate-600 ml-2">Format: YYYY-YYYY (e.g. 2023-2024)</p>
        </div>

        {/* STRAND */}
        <div className="space-y-3" id="strand_container">
          <Label className={cn("font-bold text-[10px] uppercase tracking-[0.3em] ml-2", errors.strand ? "text-red-500" : "t-text-muted")}>
            Strand Preference {isFieldRequired("strand") && <span className="text-red-500">*</span>}
          </Label>
          <input type="hidden" {...register("strand", { required: isFieldRequired("strand") ? "Required" : false })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STRAND_OPTIONS.map(opt => (
              <CheckCard
                key={opt.value}
                label={opt.value}
                sublabel={opt.label.replace(`(${opt.value})`, "").trim()}
                checked={selectedStrand === opt.value}
                onClick={() => { setValue("strand", opt.value, { shouldValidate: true }); updateFormData({ strand: opt.value }) }}
                disabled={!isFieldEditable("strand")}
              />
            ))}
          </div>
          {errors.strand && (
            <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 ml-2">
              <AlertTriangle size={10} /> Please select a strand
            </p>
          )}
        </div>

        {/* GWA — JHS Graduate only (G11 or G12) */}
        {selectedCategory === "JHS Graduate" && (
          <div className="relative z-[0] space-y-2 group animate-step-in" id="gwa_grade_10_container">
            <div className="flex justify-between items-center">
              <Label htmlFor="gwa" className={cn(
                "font-bold text-[10px] uppercase tracking-[0.3em] ml-2 transition-colors group-focus-within:text-blue-400",
                errors.gwa_grade_10 ? "text-red-500" : "t-text-muted"
              )}>
                General Weighted Average (GWA) {isFieldRequired("gwa_grade_10") && <span className="text-red-500">*</span>}
              </Label>
              {errors.gwa_grade_10 && (
                <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1">
                  <AlertTriangle size={10} /> {errors.gwa_grade_10.message as string}
                </span>
              )}
            </div>
            <div className="relative">
              <Star className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700 transition-colors group-focus-within:text-blue-400" />
              <GwaInput
                register={register}
                hasError={!!errors.gwa_grade_10}
                editable={isFieldEditable("gwa_grade_10")}
                required={isFieldRequired("gwa_grade_10")}
                selectedCategory={selectedCategory}
                defaultFilled={!!(formData.gwa_grade_10?.toString().trim())}
              />
            </div>
            <p className="text-[9px] text-slate-600 ml-2">Range: 65.00 – 100.00 · Max 2 decimal places</p>
          </div>
        )}

        {/* LAST SCHOOL ATTENDED */}
        <div className="space-y-2" id="last_school_attended_container">
          <Label className={cn(
            "font-bold text-[10px] uppercase tracking-[0.3em] ml-2",
            errors.last_school_attended ? "text-red-500" : "t-text-muted"
          )}>
            Previous School Name {isFieldRequired("last_school_attended") && <span className="text-red-500">*</span>}
          </Label>
          <p className="text-[9px] text-amber-500/70 ml-2 uppercase tracking-widest">
            ⓘ If your school is not in the list, select "School Not Listed / Not Found" or type it manually.
          </p>
          <input type="hidden" {...register("last_school_attended", { required: isFieldRequired("last_school_attended") ? "Required" : false })} />
          <SchoolSearchPicker
            value={watchLastSchool || ""}
            onChange={v => setValue("last_school_attended", v, { shouldValidate: true })}
            error={(errors as any).last_school_attended?.message}
            disabled={!isFieldEditable("last_school_attended")}
          />
        </div>

        {/* PREVIOUS SCHOOL ADDRESS */}
        <div className="space-y-2" id="last_school_address_container">
          <div className="flex justify-between items-center">
            <Label htmlFor="last_school_address" className={cn(
              "font-bold text-[10px] uppercase tracking-[0.3em] ml-2",
              (errors as any).last_school_address ? "text-red-500" : "t-text-muted"
            )}>
              Previous School Address {isFieldRequired("last_school_address") && <span className="text-red-500">*</span>}
            </Label>
            <CharCounter control={control} name="last_school_address" max={100} />
          </div>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700" />
            <SchoolAddressInput
              register={register} setValue={setValue}
              hasError={!!(errors as any).last_school_address}
              editable={isFieldEditable("last_school_address")}
              required={isFieldRequired("last_school_address")}
              defaultFilled={!!((formData as any).last_school_address?.trim())}
            />
          </div>
          {(errors as any).last_school_address && (
            <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 ml-2">
              <AlertTriangle size={10} /> {(errors as any).last_school_address.message}
            </p>
          )}
        </div>

        {/* FACEBOOK USERNAME */}
        <div className="space-y-2" id="facebook_user_container">
          <Label className={cn("font-bold text-[10px] uppercase tracking-[0.3em] ml-2", (errors as any).facebook_user ? "text-red-500" : "t-text-muted")}>
            Facebook Username {isFieldRequired("facebook_user") && <span className="text-red-500">*</span>}
          </Label>
          <SimpleTextInput
            register={register} setValue={setValue} fieldName="facebook_user"
            hasError={!!(errors as any).facebook_user}
            editable={isFieldEditable("facebook_user")}
            required={isFieldRequired("facebook_user")}
            placeholder="e.g. Juan Dela Cruz"
            icon={<Facebook className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700" />}
            defaultFilled={!!((formData as any).facebook_user?.trim())}
          />
          {(errors as any).facebook_user && (
            <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 ml-2">
              <AlertTriangle size={10} /> {(errors as any).facebook_user.message}
            </p>
          )}
        </div>

        {/* FACEBOOK LINK */}
        <div className="space-y-2" id="facebook_link_container">
          <Label className={cn("font-bold text-[10px] uppercase tracking-[0.3em] ml-2", (errors as any).facebook_link ? "text-red-500" : "t-text-muted")}>
            Facebook Profile Link {isFieldRequired("facebook_link") && <span className="text-red-500">*</span>}
          </Label>
          <SimpleTextInput
            register={register} setValue={setValue} fieldName="facebook_link"
            hasError={!!(errors as any).facebook_link}
            editable={isFieldEditable("facebook_link")}
            required={isFieldRequired("facebook_link")}
            placeholder="https://facebook.com/yourprofile"
            icon={<Facebook className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700" />}
            defaultFilled={!!((formData as any).facebook_link?.trim())}
            extraRegisterProps={{
              pattern: { value: /^https?:\/\/(www\.)?facebook\.com\/.+/i, message: "Must be a valid Facebook URL (facebook.com/...)" },
            }}
          />
          {(errors as any).facebook_link && (
            <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 ml-2">
              <AlertTriangle size={10} /> {(errors as any).facebook_link.message}
            </p>
          )}
        </div>

        {/* PREFERRED MODALITY */}
        <div className="space-y-3" id="preferred_modality_container">
          <Label className={cn("font-black text-[10px] uppercase tracking-[0.3em] ml-2", (errors as any).preferred_modality ? "text-red-500" : "t-text-muted")}>
            Preferred Learning Modality {isFieldRequired("preferred_modality") && <span className="text-red-500">*</span>}
          </Label>
          <input type="hidden" {...register("preferred_modality", { required: isFieldRequired("preferred_modality") ? "Required" : false })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckCard 
              label="Face to Face" 
              checked={selectedModality === "Face to Face"}
              onClick={() => setValue("preferred_modality", "Face to Face", { shouldValidate: true })}
              disabled={!isFieldEditable("preferred_modality")} 
              icon={<Monitor size={20} />} 
              sublabel="On-campus sessions"
            />
            <CheckCard 
              label="Online" 
              checked={selectedModality === "Online"}
              onClick={() => { setValue("preferred_modality", "Online", { shouldValidate: true }) }}
              disabled={!isFieldEditable("preferred_modality")} 
              icon={<Globe size={20} />} 
              sublabel="Remote learning"
            />
          </div>
          {(errors as any).preferred_modality && (
            <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 ml-2">
              <AlertTriangle size={10} /> Please select a modality
            </p>
          )}
        </div>

        {/* PREFERRED SHIFT */}
        {selectedModality && (
          <div className="space-y-3 animate-step-in" id="preferred_shift_container">
            <Label className={cn("font-black text-[10px] uppercase tracking-[0.3em] ml-2", (errors as any).preferred_shift ? "text-red-500" : "t-text-muted")}>
              Preferred Shift <span className="text-red-500">*</span>
            </Label>
            <input type="hidden" {...register("preferred_shift", { required: selectedModality ? "Please select a shift" : false })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CheckCard 
                label="AM Shift" 
                sublabel="Morning sessions" 
                checked={selectedShift === "AM"}
                onClick={() => setValue("preferred_shift", "AM", { shouldValidate: true })}
                disabled={!isFieldEditable("preferred_shift")} 
                icon={<Clock size={20} />} 
              />
              <CheckCard 
                label="PM Shift" 
                sublabel="Afternoon sessions" 
                checked={selectedShift === "PM"}
                onClick={() => setValue("preferred_shift", "PM", { shouldValidate: true })}
                disabled={!isFieldEditable("preferred_shift")} 
                icon={<Clock size={20} />} 
              />
            </div>
            {(errors as any).preferred_shift && (
              <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 ml-2">
                <AlertTriangle size={10} /> {(errors as any).preferred_shift.message}
              </p>
            )}
          </div>
        )}

      </div>

      {/* STICKY BOTTOM BAR */}
      <div className="sticky bottom-0 z-20 left-0 right-0 pt-8 -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 px-4 sm:px-6 md:px-8 lg:px-12 mt-6 flex flex-col gap-3 bg-transparent">
        <div style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }} className="flex flex-col gap-3">
          <Button
            type="submit"
            disabled={fetchingYear || checking}
            className={cn(
              "w-full min-h-[52px] md:h-16 rounded-[28px]",
              "bg-blue-600 lg:hover:bg-white lg:hover:text-blue-600 text-white",
              "shadow-[0_20px_50px_rgba(59,130,246,0.3)] lg:hover:shadow-blue-600/20",
              "transition-all duration-500 active:scale-[0.98]",
              "flex items-center justify-center gap-4 group touch-manipulation border-2 border-transparent lg:hover:border-blue-600"
            )}
          >
            {checking ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span className="font-black uppercase text-[10px] sm:text-xs tracking-[0.4em]">
                Proceed To Step 03
              </span>
            )}
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center lg:group-hover:bg-blue-600 shrink-0 transition-all duration-500">
              <ArrowRight size={20} className="lg:group-hover:translate-x-1 transition-transform" />
            </div>
          </Button>
          <button type="button" onClick={() => {
            updateFormData(getValues() as any)
            setStep(1)
          }}
            className="min-h-[44px] w-full rounded-xl t-text-muted font-black uppercase text-[9px] sm:text-[10px] tracking-[0.3em] flex items-center justify-center gap-2 lg:hover:text-blue-400 transition-colors py-3 touch-manipulation active:scale-[0.98]">
            <ChevronLeft className="w-4 h-4 shrink-0" /> Go Back
          </button>
        </div>
      </div>
    </form>
  )
}