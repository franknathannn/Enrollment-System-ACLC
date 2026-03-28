"use client"

import { useEffect, useState, useMemo, useRef, useCallback, memo } from "react"
import { useForm, useWatch } from "react-hook-form"
import { useEnrollmentStore } from "@/store/useEnrollmentStore"
import { EnrollmentFormData } from "@/lib/validators/enrollment"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowRight, User, BookOpen, MapPin, Heart,
  ChevronDown, Loader2, Globe, AlertTriangle, Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useEnrollmentValidation } from "@/hooks/useEnrollmentValidation"
import { supabase } from "@/lib/supabase/client"
import { useThemeStore } from "@/store/useThemeStore"

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA — module-level, zero runtime cost
// ─────────────────────────────────────────────────────────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

const NATIONALITIES = [
  "Afghan","Albanian","Algerian","American","Andorran","Angolan","Antiguans","Argentinean","Armenian","Australian","Austrian","Azerbaijani",
  "Bahamian","Bahraini","Bangladeshi","Barbadian","Barbudans","Batswana","Belarusian","Belgian","Belizean","Beninese","Bhutanese","Bolivian",
  "Bosnian","Brazilian","British","Bruneian","Bulgarian","Burkinabe","Burmese","Burundian","Cambodian","Cameroonian","Canadian","Cape Verdean",
  "Central African","Chadian","Chilean","Chinese","Colombian","Comoran","Congolese","Costa Rican","Croatian","Cuban","Cypriot","Czech",
  "Danish","Djiboutian","Dominican","Dutch","East Timorese","Ecuadorean","Egyptian","Emirian","Equatorial Guinean","Eritrean","Estonian",
  "Ethiopian","Fijian","Filipino","Finnish","French","Gabonese","Gambian","Georgian","German","Ghanaian","Greek","Grenadian","Guatemalan",
  "Guinea-Bissauan","Guinean","Guyanese","Haitian","Honduran","Hungarian","I-Kiribati","Icelander","Indian","Indonesian","Iranian","Iraqi",
  "Irish","Israeli","Italian","Ivorian","Jamaican","Japanese","Jordanian","Kazakhstani","Kenyan","Kittian and Nevisian","Kuwaiti","Kyrgyz",
  "Laotian","Latvian","Lebanese","Liberian","Libyan","Liechtensteiner","Lithuanian","Luxembourger","Macedonian","Malagasy","Malawian",
  "Malaysian","Maldivian","Malian","Maltese","Marshallese","Mauritanian","Mauritian","Mexican","Micronesian","Moldovan","Monacan",
  "Mongolian","Moroccan","Mosotho","Motswana","Mozambican","Namibian","Nauruan","Nepalese","New Zealander","Ni-Vanuatu","Nicaraguan",
  "Nigerian","Nigerien","North Korean","Norwegian","Omani","Pakistani","Palauan","Panamanian","Papua New Guinean","Paraguayan","Peruvian",
  "Polish","Portuguese","Qatari","Romanian","Russian","Rwandan","Saint Lucian","Salvadoran","Samoan","San Marinese","Sao Tomean","Saudi",
  "Senegalese","Serbian","Seychellois","Sierra Leonean","Singaporean","Slovakian","Slovenian","Solomon Islander","Somali","South African",
  "South Korean","Spanish","Sri Lankan","Sudanese","Surinamer","Swazi","Swedish","Swiss","Syrian","Taiwanese","Tajik","Tanzanian","Thai",
  "Togolese","Tongan","Trinidadian","Tunisian","Turkish","Tuvaluan","Ugandan","Ukrainian","Uruguayan","Uzbekistani","Venezuelan",
  "Vietnamese","Yemenite","Zambian","Zimbabwean",
]

const MAX_LENGTHS = {
  first_name: 80, middle_name: 20, last_name: 50,
  nationality: 60, religion: 60, address: 100,
  email: 50, age: 2, civil_status: 20,
} as const

// Year list built once at module load
const CURRENT_YEAR = new Date().getFullYear()
const YEAR_LIST: number[] = []
for (let y = CURRENT_YEAR - 5; y >= CURRENT_YEAR - 50; y--) YEAR_LIST.push(y)

// ─────────────────────────────────────────────────────────────────────────────
// buildFieldClass — pure function, no hooks.
// KEY: uses transition-[border-color,background-color] NOT transition-all.
// transition-all on mobile forces layout+paint recalc on every single keystroke.
// Only transitioning compositor-safe properties keeps it on the GPU.
// ─────────────────────────────────────────────────────────────────────────────
function buildFieldClass(opts: {
  hasError: boolean
  filled: boolean
  isDark: boolean
  isTextArea?: boolean
}) {
  const { hasError, filled, isDark, isTextArea } = opts
  return cn(
    isTextArea
      ? "w-full min-h-[100px] p-4 pl-10 sm:pl-12 rounded-xl"
      : "min-h-[44px] h-11 md:h-12 rounded-xl",
    "border-2 transition-[border-color,background-color] duration-150",
    "font-medium outline-none text-xs md:text-sm",
    isDark ? "text-white" : "text-slate-900",
    hasError
      ? "border-red-500/50 bg-red-950/30 focus:border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
      : cn(
          "focus:border-blue-500 focus:shadow-[0_0_20px_rgba(59,130,246,0.2)]",
          isDark ? "focus:bg-slate-900/80" : "focus:bg-white",
          filled
            ? isDark
              ? "border-blue-900/40 bg-slate-950/60 text-blue-100"
              : "border-blue-500/40 bg-blue-50 text-blue-900 shadow-sm"
            : isDark
              ? "border-white/5 bg-white/5 lg:hover:border-white/20"
              : "border-slate-200 bg-white lg:hover:border-slate-300",
        )
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CharCounter — isolated component with its own useWatch subscription.
// Typing in "address" only re-renders <CharCounter name="address">, never
// the parent Step1Identity or any sibling field. This is the core fix for
// mobile typing lag — previously every keystroke re-rendered the entire form.
// ─────────────────────────────────────────────────────────────────────────────
function CharCounter({ control, name, max }: { control: any; name: string; max: number }) {
  const value = useWatch({ control, name }) as string | undefined
  return <span className="text-[9px] text-slate-600">{(value || "").length}/{max}</span>
}

// ─────────────────────────────────────────────────────────────────────────────
// parseDateParts
// ─────────────────────────────────────────────────────────────────────────────
function parseDateParts(v: string) {
  if (!v) return { m: -1, d: -1, y: -1 }
  const d = new Date(v + "T00:00:00")
  if (isNaN(d.getTime())) return { m: -1, d: -1, y: -1 }
  return { m: d.getMonth(), d: d.getDate(), y: d.getFullYear() }
}

// ─────────────────────────────────────────────────────────────────────────────
// BirthDatePicker — memo'd so it only re-renders when its own props change
// ─────────────────────────────────────────────────────────────────────────────
const BirthDatePicker = memo(function BirthDatePicker({
  value, onChange, error, isDark,
}: {
  value: string; onChange: (val: string) => void; error?: string; isDark: boolean
}) {
  const [month, setMonth] = useState(() => parseDateParts(value).m)
  const [day,   setDay]   = useState(() => parseDateParts(value).d)
  const [year,  setYear]  = useState(() => parseDateParts(value).y)

  const prevValue = useRef(value)
  useEffect(() => {
    if (prevValue.current === value) return
    prevValue.current = value
    const { m, d, y } = parseDateParts(value)
    setMonth(m); setDay(d); setYear(y)
  }, [value])

  const daysInMonth = useMemo(() => {
    if (month === -1) return 31
    return new Date(year === -1 ? 2024 : year, month + 1, 0).getDate()
  }, [month, year])

  const days = useMemo(() => {
    const a: number[] = []
    for (let d = 1; d <= daysInMonth; d++) a.push(d)
    return a
  }, [daysInMonth])

  const handlePart = useCallback(
    (part: "month" | "day" | "year", val: number) => {
      const m = part === "month" ? val : month
      const d = part === "day"   ? val : day
      const y = part === "year"  ? val : year
      if (part === "month") setMonth(val)
      if (part === "day")   setDay(val)
      if (part === "year")  setYear(val)
      if (m !== -1 && d !== -1 && y !== -1) {
        const maxD     = new Date(y, m + 1, 0).getDate()
        const clampedD = Math.min(d, maxD)
        if (clampedD !== d) setDay(clampedD)
        onChange(`${y}-${String(m + 1).padStart(2, "0")}-${String(clampedD).padStart(2, "0")}`)
      }
    },
    [month, day, year, onChange]
  )

  const selectCls = cn(
    "flex-1 appearance-none rounded-xl border-2 px-3 py-2.5",
    "text-xs font-bold uppercase tracking-wider",
    "transition-[border-color,background-color] duration-150 outline-none cursor-pointer",
    isDark
      ? "bg-white/5 border-white/8 text-white focus:bg-slate-900/80"
      : "bg-white border-slate-200 text-slate-900 focus:bg-white",
    error ? "border-red-500/50 bg-red-950/30 focus:border-red-500" : "focus:border-blue-500"
  )

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-[2]">
          <select value={month === -1 ? "" : month} onChange={e => handlePart("month", parseInt(e.target.value))} className={cn(selectCls, "pr-7 w-full")}>
            <option value="" disabled className={isDark ? "bg-slate-950" : "bg-white"}>Month</option>
            {MONTHS.map((m, i) => <option key={m} value={i} className={isDark ? "bg-slate-950" : "bg-white"}>{m}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
        <div className="relative flex-1">
          <select value={day === -1 ? "" : day} onChange={e => handlePart("day", parseInt(e.target.value))} className={cn(selectCls, "pr-7 w-full")}>
            <option value="" disabled className={isDark ? "bg-slate-950" : "bg-white"}>Day</option>
            {days.map(d => <option key={d} value={d} className={isDark ? "bg-slate-950" : "bg-white"}>{d}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
        <div className="relative flex-[1.5]">
          <select value={year === -1 ? "" : year} onChange={e => handlePart("year", parseInt(e.target.value))} className={cn(selectCls, "pr-7 w-full")}>
            <option value="" disabled className={isDark ? "bg-slate-950" : "bg-white"}>Year</option>
            {YEAR_LIST.map(y => <option key={y} value={y} className={isDark ? "bg-slate-950" : "bg-white"}>{y}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
      </div>
      {error && (
        <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 ml-1">
          <AlertTriangle size={10} /> {error}
        </p>
      )}
    </div>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// NationalityPicker — memo'd, isDark via prop
// ─────────────────────────────────────────────────────────────────────────────
const NationalityPicker = memo(function NationalityPicker({
  value, onChange, error, disabled, isDark,
}: {
  value: string; onChange: (val: string) => void
  error?: string; disabled?: boolean; isDark: boolean
}) {
  const [search, setSearch] = useState("")
  const [open, setOpen]     = useState(false)
  const containerRef        = useRef<HTMLDivElement>(null)

  const filtered = useMemo(
    () => NATIONALITIES.filter(n => n.toLowerCase().includes(search.toLowerCase())),
    [search]
  )

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleSelect = useCallback((nat: string) => {
    onChange(nat); setOpen(false); setSearch("")
  }, [onChange])

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700 z-10 pointer-events-none" />
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(p => !p)}
          className={cn(
            "w-full min-h-[44px] h-11 md:h-12 rounded-xl border-2 pl-12 pr-10 text-left text-xs font-bold",
            "transition-[border-color,background-color] duration-150 outline-none",
            isDark ? "text-white" : "text-slate-900",
            error
              ? "border-red-500/50 bg-red-950/30 text-red-300"
              : cn(
                  "focus:border-blue-500",
                  isDark ? "focus:bg-slate-900/80" : "focus:bg-white",
                  value
                    ? isDark ? "border-blue-900/40 bg-slate-950/60 text-blue-100" : "border-blue-500/40 bg-blue-50 text-blue-900"
                    : isDark ? "border-white/5 bg-white/5 text-slate-500" : "border-slate-200 bg-white text-slate-500"
                ),
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {value || "Select Nationality"}
        </button>
        <ChevronDown
          size={14}
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </div>
      {open && (
        <div className={cn(
          "absolute top-full left-0 w-full mt-2 rounded-xl border shadow-2xl z-50 overflow-hidden",
          isDark ? "bg-slate-950 border-white/10" : "bg-white border-slate-200"
        )}>
          <div className={cn("p-2 border-b", isDark ? "border-white/5" : "border-slate-100")}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search nationality..."
              className={cn(
                "w-full rounded-lg px-3 py-2 text-xs outline-none border",
                isDark
                  ? "bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
              )}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0
              ? <p className="text-[10px] text-slate-600 text-center py-4 uppercase tracking-widest">No results</p>
              : filtered.map(nat => (
                <button key={nat} type="button" onClick={() => handleSelect(nat)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors",
                    value === nat
                      ? isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"
                      : isDark ? "text-slate-400 lg:hover:bg-white/5 lg:hover:text-white" : "text-slate-500 lg:hover:bg-slate-50 lg:hover:text-slate-900"
                  )}
                >{nat}</button>
              ))
            }
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
// ISOLATED FIELD COMPONENTS
// Each manages its own "filled" state locally so typing in one field never
// triggers a re-render of any other field or the parent component.
// ─────────────────────────────────────────────────────────────────────────────

const NameInput = memo(function NameInput({
  fieldName, register, required, editable, maxLen, isDark, hasError,
  onNameInput, onEnforceMax, placeholder, defaultFilled,
}: {
  fieldName: "first_name" | "middle_name" | "last_name"
  register: any; required: boolean; editable: boolean; maxLen: number
  isDark: boolean; hasError: boolean; placeholder: string; defaultFilled: boolean
  onNameInput: (e: React.ChangeEvent<HTMLInputElement>, field: any) => void
  onEnforceMax: (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, field: any, max: number) => void
}) {
  const [filled, setFilled] = useState(defaultFilled)
  const cls = buildFieldClass({ hasError, filled, isDark })
  return (
    <Input
      {...register(fieldName, {
        required: required ? "Required" : false,
        maxLength: { value: maxLen, message: `Max ${maxLen} characters` },
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          onNameInput(e, fieldName)
          setFilled(e.target.value.trim().length > 0)
        },
      })}
      disabled={!editable}
      maxLength={maxLen}
      placeholder={placeholder}
      onInput={(e: React.FormEvent<HTMLInputElement>) => {
        onEnforceMax(e, fieldName, maxLen)
        setFilled((e.currentTarget as HTMLInputElement).value.trim().length > 0)
      }}
      className={cn(cls, !editable && "opacity-50 cursor-not-allowed")}
    />
  )
})

const SimpleIconInput = memo(function SimpleIconInput({
  icon, register, fieldName, required, editable, maxLen,
  isDark, hasError, placeholder, onEnforceMax, defaultFilled,
}: {
  icon: React.ReactNode; register: any; fieldName: any
  required: boolean; editable: boolean; maxLen: number
  isDark: boolean; hasError: boolean; placeholder: string; defaultFilled: boolean
  onEnforceMax: (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, field: any, max: number) => void
}) {
  const [filled, setFilled] = useState(defaultFilled)
  const cls = buildFieldClass({ hasError, filled, isDark })
  return (
    <div className="relative group">
      {icon}
      <Input
        {...register(fieldName, {
          required: required ? "Required" : false,
          maxLength: { value: maxLen, message: `Max ${maxLen} characters` },
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFilled(e.target.value.trim().length > 0),
        })}
        placeholder={placeholder}
        maxLength={maxLen}
        disabled={!editable}
        onInput={(e: React.FormEvent<HTMLInputElement>) => {
          onEnforceMax(e, fieldName, maxLen)
          setFilled((e.currentTarget as HTMLInputElement).value.trim().length > 0)
        }}
        className={cn("pl-12", cls, !editable && "opacity-50 cursor-not-allowed")}
      />
    </div>
  )
})

const AgeInput = memo(function AgeInput({
  register, isDark, hasError, editable, required, watchBirthDate, trigger, defaultFilled,
}: {
  register: any; isDark: boolean; hasError: boolean
  editable: boolean; required: boolean; defaultFilled: boolean
  watchBirthDate: string | undefined; trigger: any
}) {
  const [filled, setFilled] = useState(defaultFilled)
  const cls = buildFieldClass({ hasError, filled, isDark })
  return (
    <Input
      {...register("age", {
        required: required ? "Required" : false,
        min: { value: 5, message: "Age too low" },
        max: { value: 99, message: "Max 2 digits" },
        pattern: { value: /^\d{1,2}$/, message: "Numbers only, max 2 digits" },
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          setFilled(e.target.value.trim().length > 0)
          if (watchBirthDate) trigger("birth_date")
        },
      })}
      type="number" placeholder="18" min={5} max={99} maxLength={2}
      disabled={!editable}
      onInput={(e: React.FormEvent<HTMLInputElement>) => {
        const el = e.currentTarget
        if (el.value.length > 2) el.value = el.value.slice(0, 2)
        setFilled(el.value.trim().length > 0)
      }}
      className={cn(cls, !editable && "opacity-50 cursor-not-allowed")}
    />
  )
})

const CivilStatusSelect = memo(function CivilStatusSelect({
  register, isDark, hasError, editable, required,
}: {
  register: any; isDark: boolean; hasError: boolean; editable: boolean; required: boolean
}) {
  const cls = buildFieldClass({ hasError, filled: true, isDark })
  return (
    <div className="relative">
      <Heart className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700" />
      <select
        {...register("civil_status", { required: required ? "Required" : false })}
        disabled={!editable}
        className={cn("pl-12 pr-10 appearance-none cursor-pointer w-full text-white", cls, !editable && "opacity-50 cursor-not-allowed")}
      >
        <option value="Single"  className={isDark ? "bg-slate-950" : "bg-white text-slate-900"}>Single</option>
        <option value="Married" className={isDark ? "bg-slate-950" : "bg-white text-slate-900"}>Married</option>
      </select>
      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
    </div>
  )
})

const AddressTextarea = memo(function AddressTextarea({
  register, isDark, hasError, editable, required, onEnforceMax, defaultFilled,
}: {
  register: any; isDark: boolean; hasError: boolean
  editable: boolean; required: boolean; defaultFilled: boolean
  onEnforceMax: (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, field: any, max: number) => void
}) {
  const max = MAX_LENGTHS.address
  const [filled, setFilled] = useState(defaultFilled)
  const cls = buildFieldClass({ hasError, filled, isDark, isTextArea: true })
  return (
    <div className="relative">
      <MapPin className="absolute left-4 top-4 w-4 h-4 text-blue-700" />
      <textarea
        {...register("address", {
          required: required ? "Required" : false,
          maxLength: { value: max, message: `Max ${max} characters` },
          onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setFilled(e.target.value.trim().length > 0),
        })}
        placeholder="2049 Alonzo St, Tondo Manila"
        maxLength={max}
        disabled={!editable}
        onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
          onEnforceMax(e, "address", max)
          setFilled((e.currentTarget as HTMLTextAreaElement).value.trim().length > 0)
        }}
        className={cn(cls, !editable && "opacity-50 cursor-not-allowed")}
      />
    </div>
  )
})

const EmailInput = memo(function EmailInput({
  register, isDark, hasError, editable, required, onEnforceMax, defaultFilled,
}: {
  register: any; isDark: boolean; hasError: boolean
  editable: boolean; required: boolean; defaultFilled: boolean
  onEnforceMax: (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, field: any, max: number) => void
}) {
  const max = MAX_LENGTHS.email
  const [filled, setFilled] = useState(defaultFilled)
  const cls = buildFieldClass({ hasError, filled, isDark })
  return (
    <Input
      {...register("email", {
        required: required ? "Required" : false,
        pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email format" },
        maxLength: { value: max, message: `Max ${max} characters` },
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFilled(e.target.value.trim().length > 0),
      })}
      type="email" placeholder="student@gmail.com" maxLength={max}
      disabled={!editable}
      onInput={(e: React.FormEvent<HTMLInputElement>) => {
        onEnforceMax(e, "email", max)
        setFilled((e.currentTarget as HTMLInputElement).value.trim().length > 0)
      }}
      className={cn(cls, !editable && "opacity-50 cursor-not-allowed")}
    />
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Step1Identity() {
  const { isDark } = useThemeStore()
  const { formData, updateFormData, setStep } = useEnrollmentStore()
  const { isFieldRequired, isFieldEditable }  = useEnrollmentValidation()
  const [checking, setChecking] = useState(false)

  const {
    register, handleSubmit, setValue, watch,
    trigger, getValues, control,
    formState: { errors },
  } = useForm<EnrollmentFormData>({
    shouldFocusError: false, // We handle manual centering scroll
    defaultValues: {
      first_name:   formData.first_name   || "",
      middle_name:  formData.middle_name  || "",
      last_name:    formData.last_name    || "",
      nationality:  (formData as any).nationality || "",
      email:        formData.email        || "",
      age:          formData.age          || "",
      gender:       (formData.gender as "Male" | "Female") || undefined,
      civil_status: formData.civil_status || "Single",
      birth_date:   formData.birth_date   || "",
      religion:     formData.religion     || "",
      address:      formData.address      || "",
    },
  })

  // Only watch fields that drive conditional rendering.
  // Character counters use <CharCounter control={control}> independently.
  // "filled" state is managed locally inside each field component.
  const selectedGender   = watch("gender")
  const watchBirthDate   = watch("birth_date")
  const watchNationality = watch("nationality")

  useEffect(() => {
    const raf = requestAnimationFrame(() => window.scrollTo(0, 0))
    return () => cancelAnimationFrame(raf)
  }, [])

  const validateBirthDate = useCallback(
    (val: string | undefined) => {
      if (!val) return isFieldRequired("birth_date") ? "Birth date is required" : true
      const dob   = new Date(val + "T00:00:00")
      const today = new Date()
      let age     = today.getFullYear() - dob.getFullYear()
      const m     = today.getMonth() - dob.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
      if (age > 50) return "Age must not exceed 50 years"
      if (age < 5)  return "Invalid birth date"
      const enteredAge = parseInt(getValues("age") || "0")
      if (enteredAge && enteredAge !== age)
        return `Birth date doesn't match your entered age (${enteredAge}). Expected: ${age}`
      return true
    },
    [isFieldRequired, getValues]
  )

  const onSubmit = async (data: any) => {
    setChecking(true)
    try {
      if (data.email) {
        const { data: existingEmail } = await supabase
          .from("students").select("id")
          .ilike("email", data.email.trim())
          .neq("id", formData.id || "00000000-0000-0000-0000-000000000000")
          .maybeSingle()
        if (existingEmail) { toast.error("Email address is already registered."); setChecking(false); return }
      }
      let nameQuery = supabase
        .from("students").select("id")
        .ilike("first_name", data.first_name.trim())
        .ilike("last_name",  data.last_name.trim())
        .neq("id", formData.id || "00000000-0000-0000-0000-000000000000")
      nameQuery = data.middle_name?.trim()
        ? nameQuery.ilike("middle_name", data.middle_name.trim())
        : nameQuery.or('middle_name.is.null,middle_name.eq.""')
      const { data: existingName } = await nameQuery.maybeSingle()
      if (existingName) { toast.error("Student identity already exists."); setChecking(false); return }
      updateFormData(data); setStep(2); toast.success("Identity Verified & Submitted", { icon: <img src="/logo-aclc.png" className="w-5 h-5" alt="" /> })
    } catch { toast.error("System validation failed. Please try again.") }
  }
  const onError = (errors: any) => {
    const errorKeys = Object.keys(errors); if (errorKeys.length === 0) return
    const firstError = errorKeys[0]
    const el = document.getElementById(`${firstError}_container`) || document.getElementsByName(firstError)[0]
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      toast.error(`Missing or invalid: ${firstError.replace(/_/g, " ")}`, { duration: 4000 })
    }
  }

  // Title-case handler. Updates native input value directly first (no extra render),
  // then syncs to RHF with shouldDirty:false to skip unnecessary bookkeeping.
  const handleNameInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
      const raw = e.target.value.replace(/[0-9]/g, "")
      const val = raw.length > 0
        ? raw.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
        : raw
      e.target.value = val
      setValue(field, val, { shouldDirty: false })
    },
    [setValue]
  )

  // Enforces max length on mobile where the maxLength attribute is unreliable.
  // Writes directly to setValue instead of dispatching a synthetic event
  // (synthetic events caused a double RHF update).
  const enforceMaxLength = useCallback(
    (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, field: any, max: number) => {
      const el = e.currentTarget
      if (el.value.length > max) {
        el.value = el.value.slice(0, max)
        setValue(field, el.value, { shouldDirty: false })
      }
    },
    [setValue]
  )

  const birthDateDisplay = watchBirthDate
    ? new Date(watchBirthDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null

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

      <div className="space-y-6 sm:space-y-8 pb-[140px] min-[480px]:pb-[160px]">

        {/* HEADER */}
        <div className={cn(
          "rounded-2xl sm:rounded-[40px] p-5 sm:p-8 border flex items-center gap-4 sm:gap-6 shadow-2xl relative overflow-hidden",
          isDark ? "bg-blue-600/10 border-white/10 text-white" : "bg-white/95 border-blue-100 text-slate-900"
        )}>
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 via-blue-400 to-red-500" />
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl sm:rounded-[24px] flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30 group-hover:scale-110 transition-transform duration-500">
            <User className="text-white w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-blue-600/20 text-blue-400 text-[8px] font-black uppercase tracking-[0.2em] border border-blue-500/20">Step 01</span>
              <div className="h-px w-8 bg-blue-500/20" />
              <Sparkles size={10} className="text-blue-400 animate-pulse" />
            </div>
            <h2 className={cn(
              "text-lg sm:text-2xl md:text-3xl font-black tracking-tighter uppercase italic leading-none",
              isDark ? "text-white" : "text-slate-900"
            )}>Personal <span className="text-blue-600">Identity</span></h2>
          </div>
        </div>

        {/* NAME FIELDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["first_name", "middle_name", "last_name"] as const).map(field => (
            <div key={field} className="space-y-2" id={`${field}_container`}>
              <div className="flex justify-between items-center">
                <Label className="font-bold text-[10px] uppercase tracking-[0.3em] text-slate-500 ml-2">
                  {field.replace("_", " ")} {isFieldRequired(field) && <span className="text-red-500">*</span>}
                </Label>
                <CharCounter control={control} name={field} max={MAX_LENGTHS[field]} />
              </div>
              <NameInput
                fieldName={field}
                register={register}
                required={isFieldRequired(field)}
                editable={isFieldEditable(field)}
                maxLen={MAX_LENGTHS[field]}
                isDark={isDark}
                hasError={!!(errors as any)[field]}
                onNameInput={handleNameInput}
                onEnforceMax={enforceMaxLength}
                placeholder={field === "first_name" ? "Juan" : field === "middle_name" ? "Protacio" : "Dela Cruz"}
                defaultFilled={!!((formData as any)[field]?.trim())}
              />
              {(errors as any)[field] && (
                <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 ml-1">
                  <AlertTriangle size={10} /> {(errors as any)[field]?.message}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* NATIONALITY */}
        <div className="space-y-2" id="nationality_container">
          <Label className="font-bold text-[10px] uppercase tracking-[0.3em] text-slate-500 ml-2">
            Nationality {isFieldRequired("nationality") && <span className="text-red-500">*</span>}
          </Label>
          <input type="hidden" {...register("nationality", { required: isFieldRequired("nationality") ? "Required" : false })} />
          <NationalityPicker
            value={watchNationality || ""}
            onChange={v => setValue("nationality", v, { shouldValidate: true })}
            error={(errors as any).nationality?.message}
            disabled={!isFieldEditable("nationality")}
            isDark={isDark}
          />
        </div>

        {/* GENDER */}
        <div className="space-y-4" id="gender_container">
          <Label className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] ml-2 block">
            Gender Selection {isFieldRequired("gender") && <span className="text-red-500">*</span>}
          </Label>
          <input type="hidden" {...register("gender", { required: isFieldRequired("gender") ? "Required" : false })} />
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {(["Male", "Female"] as const).map(g => {
              const active   = selectedGender === g
              const isFemale = g === "Female"
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => { setValue("gender", g); updateFormData({ gender: g }) }}
                  disabled={!isFieldEditable("gender")}
                  className={cn(
                    "flex-1 flex items-center justify-between px-8 py-7 rounded-[32px] border-2",
                    "transition-all duration-300 transform",
                    "active:scale-95 relative overflow-hidden lg:hover:-translate-y-1",
                    active
                      ? isFemale
                        ? "border-red-500/50 bg-red-950/20 text-white shadow-[0_0_30px_rgba(239,68,68,0.15)]"
                        : "border-blue-500/50 bg-blue-900/20 text-white shadow-[0_0_30px_rgba(59,130,246,0.2)]"
                      : cn("text-slate-500", isDark ? "bg-white/5 border-white/5 lg:hover:border-white/10" : "bg-white border-slate-200 lg:hover:border-blue-400/30"),
                    !isFieldEditable("gender") && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                      "transition-all duration-300",
                      active
                        ? isFemale ? "border-red-400 bg-red-400/20" : "border-blue-400 bg-blue-400/20"
                        : "border-slate-700"
                    )}>
                      {active && <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse", isFemale ? "bg-red-400 shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.8)]")} />}
                    </div>
                    <span className="font-black uppercase text-xs tracking-[0.25em]">{g}</span>
                  </div>
                  <User size={24} className={cn("transition-colors duration-300", active ? isFemale ? "text-red-400" : "text-blue-400" : "text-slate-800")} />
                  
                  {/* Visual Impact Flare */}
                  {active && (
                    <div className={cn(
                      "absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-20 animate-pulse",
                      isFemale ? "bg-red-600" : "bg-blue-600"
                    )} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* BIRTH DATE */}
        <div className="space-y-2" id="birth_date_container">
          <Label className="font-bold text-[10px] uppercase tracking-[0.3em] text-slate-500 ml-2">
            Birth Date {isFieldRequired("birth_date") && <span className="text-red-500">*</span>}
          </Label>
          <input type="hidden" {...register("birth_date", {
            required: isFieldRequired("birth_date") ? "Birth date is required" : false,
            validate: validateBirthDate,
          })} />
          <BirthDatePicker
            value={watchBirthDate || ""}
            onChange={v => setValue("birth_date", v, { shouldValidate: true })}
            error={(errors as any).birth_date?.message}
            isDark={isDark}
          />
          {birthDateDisplay && !(errors as any).birth_date && (
            <p className="text-[9px] text-slate-600 ml-1 uppercase tracking-widest">{birthDateDisplay}</p>
          )}
        </div>

        {/* RELIGION */}
        <div className="space-y-2" id="religion_container">
          <div className="flex justify-between items-center">
            <Label className="font-bold text-[10px] uppercase tracking-[0.3em] text-slate-500 ml-2">
              Religion {isFieldRequired("religion") && <span className="text-red-500">*</span>}
            </Label>
            <CharCounter control={control} name="religion" max={MAX_LENGTHS.religion} />
          </div>
          <SimpleIconInput
            icon={<BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700" />}
            register={register}
            fieldName="religion"
            required={isFieldRequired("religion")}
            editable={isFieldEditable("religion")}
            maxLen={MAX_LENGTHS.religion}
            isDark={isDark}
            hasError={!!errors.religion}
            placeholder="e.g. Roman Catholic"
            onEnforceMax={enforceMaxLength}
            defaultFilled={!!(formData.religion?.trim())}
          />
          {errors.religion && (
            <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 ml-1">
              <AlertTriangle size={10} /> {errors.religion.message as string}
            </p>
          )}
        </div>

        {/* AGE & CIVIL STATUS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2" id="age_container">
            <Label className="font-bold text-[10px] uppercase tracking-[0.3em] text-slate-500 ml-2">
              Age {isFieldRequired("age") && <span className="text-red-500">*</span>}
            </Label>
            <AgeInput
              register={register}
              isDark={isDark}
              hasError={!!errors.age}
              editable={isFieldEditable("age")}
              required={isFieldRequired("age")}
              watchBirthDate={watchBirthDate}
              trigger={trigger}
              defaultFilled={!!(formData.age?.toString().trim())}
            />
            {errors.age && (
              <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 ml-1">
                <AlertTriangle size={10} /> {errors.age.message as string}
              </p>
            )}
          </div>
          <div className="space-y-2" id="civil_status_container">
            <Label className="font-bold text-[10px] uppercase tracking-[0.3em] text-slate-500 ml-2">
              Civil Status {isFieldRequired("civil_status") && <span className="text-red-500">*</span>}
            </Label>
            <CivilStatusSelect
              register={register}
              isDark={isDark}
              hasError={!!errors.civil_status}
              editable={isFieldEditable("civil_status")}
              required={isFieldRequired("civil_status")}
            />
          </div>
        </div>

        {/* ADDRESS & EMAIL */}
        <div className="space-y-6">
          <div className="space-y-2" id="address_container">
            <div className="flex justify-between items-center">
              <Label className="font-bold text-[10px] uppercase tracking-[0.3em] text-slate-500 ml-2">
                Home Address {isFieldRequired("address") && <span className="text-red-500">*</span>}
              </Label>
              <CharCounter control={control} name="address" max={MAX_LENGTHS.address} />
            </div>
            <AddressTextarea
              register={register}
              isDark={isDark}
              hasError={!!errors.address}
              editable={isFieldEditable("address")}
              required={isFieldRequired("address")}
              onEnforceMax={enforceMaxLength}
              defaultFilled={!!(formData.address?.trim())}
            />
            {errors.address && (
              <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 ml-1">
                <AlertTriangle size={10} /> {errors.address.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2" id="email_container">
            <div className="flex justify-between items-center">
              <Label className="font-bold text-[10px] uppercase tracking-[0.3em] text-slate-500 ml-2">
                Email {isFieldRequired("email") && <span className="text-red-500">*</span>}
              </Label>
              <CharCounter control={control} name="email" max={MAX_LENGTHS.email} />
            </div>
            <EmailInput
              register={register}
              isDark={isDark}
              hasError={!!errors.email}
              editable={isFieldEditable("email")}
              required={isFieldRequired("email")}
              onEnforceMax={enforceMaxLength}
              defaultFilled={!!(formData.email?.trim())}
            />
            {errors.email && (
              <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 ml-1">
                <AlertTriangle size={10} /> {errors.email.message as string}
              </p>
            )}
          </div>
        </div>

      </div>

      {/* STICKY SUBMIT */}
      <div className="sticky bottom-0 z-20 left-0 right-0 pt-8 -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 px-4 sm:px-6 md:px-8 lg:px-12 mt-6 flex flex-col gap-3 bg-transparent">
        <div style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }} className="flex flex-col gap-3">
          <Button
            type="submit"
            disabled={checking}
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
                Proceed To Step 02
              </span>
            )}
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center lg:group-hover:bg-blue-600 shrink-0 transition-all duration-500">
              <ArrowRight size={20} className="lg:group-hover:translate-x-1 transition-transform" />
            </div>
          </Button>
        </div>
      </div>
    </form>
  )
}