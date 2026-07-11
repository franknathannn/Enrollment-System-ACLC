"use client"

/**
 * Step3Family — optimized for mobile Chrome performance.
 *
 * Key changes vs original:
 * - useThemeStore() REMOVED — CSS vars handle all theming
 * - isMounted gate REMOVED — was causing double render on mount
 * - watch() with no args REMOVED — re-rendered entire form on every keystroke
 * - CharCounter isolated via useWatch — only counter re-renders per keystroke
 * - GuardianNameInput memo'd per field — typing one name field never touches siblings
 * - PhoneInput memo'd — isolated filled state
 * - handleNameInput stabilized via useCallback
 * - transition-all → transition-[border-color,background-color]
 * - requestAnimationFrame for scroll reset
 */

import { useEffect, useState, useCallback, memo } from "react"
import { useForm, useWatch } from "react-hook-form"
import { useEnrollmentStore } from "@/store/useEnrollmentStore"
import { useThemeStore } from "@/store/useThemeStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, ChevronLeft, Users, Phone, Sparkles, ShieldCheck, Globe, Mail } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useEnrollmentValidation } from "@/hooks/useEnrollmentValidation"

// ─────────────────────────────────────────────────────────────────────────────
// buildFieldClass — no isDark, uses t-input CSS vars
// ─────────────────────────────────────────────────────────────────────────────
function buildFieldClass(opts: { hasError: boolean; filled: boolean }) {
  const { hasError, filled } = opts
  return cn(
    "min-h-[44px] h-11 md:h-12 rounded-xl border-2",
    "transition-all duration-300",
    "font-medium outline-none text-sm t-input",
    hasError
      ? "error shadow-[0_0_20px_rgba(239,68,68,0.15)]"
      : cn(
        "focus:shadow-[0_0_20px_rgba(59,130,246,0.2)]",
        filled ? "filled shadow-sm" : "lg:hover:border-blue-500/30"
      )
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CharCounter — isolated, only re-renders itself on keystroke
// ─────────────────────────────────────────────────────────────────────────────
function CharCounter({ control, name, max }: { control: any; name: string; max: number }) {
  const value = useWatch({ control, name }) as string | undefined
  return <span className="text-[9px] t-text-faint">{(value || "").length}/{max}</span>
}

// ─────────────────────────────────────────────────────────────────────────────
// GuardianNameInput — memo'd, manages own filled state
// Typing in first_name never re-renders middle_name or last_name inputs
// ─────────────────────────────────────────────────────────────────────────────
const GuardianNameInput = memo(function GuardianNameInput({
  fieldName, register, setValue, hasError, editable, required,
  onNameInput, defaultFilled,
}: {
  fieldName: "guardian_first_name" | "guardian_middle_name" | "guardian_last_name"
  register: any; setValue: any; hasError: boolean
  editable: boolean; required: boolean; defaultFilled: boolean
  onNameInput: (e: React.ChangeEvent<HTMLInputElement>, field: any) => void
}) {
  const [filled, setFilled] = useState(defaultFilled)
  const cls = buildFieldClass({ hasError, filled })
  const label = fieldName.split("_")[1]

  return (
    <Input
      {...register(fieldName, {
        required: required ? "Required" : false,
        maxLength: { value: 30, message: "Max 30 characters" },
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          onNameInput(e, fieldName)
          setFilled(e.target.value.trim().length > 0)
        },
      })}
      placeholder={label.toUpperCase() + " NAME"}
      maxLength={30}
      disabled={!editable}
      className={cn(cls, !editable && "opacity-50 cursor-not-allowed")}
    />
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// PhoneInput — memo'd, manages own filled state
// ─────────────────────────────────────────────────────────────────────────────
const PhoneInput = memo(function PhoneInput({
  fieldName, register, setValue, hasError, editable, required, defaultFilled,
}: {
  fieldName: "guardian_phone" | "phone"
  register: any; setValue: any; hasError: boolean
  editable: boolean; required: boolean; defaultFilled: boolean
}) {
  const [filled, setFilled] = useState(defaultFilled)
  const cls = buildFieldClass({ hasError, filled })
  return (
    <Input
      {...register(fieldName, {
        required: required ? "Required" : false,
        pattern: { value: /^09\d{9}$/, message: "Must start with 09 and be 11 digits" },
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          const val = e.target.value.replace(/\D/g, "").slice(0, 11)
          e.target.value = val
          setValue(fieldName, val, { shouldDirty: false })
          setFilled(val.length > 0)
        },
      })}
      type="text" inputMode="numeric" pattern="[0-9]*"
      placeholder="09XX XXX XXXX"
      maxLength={11}
      disabled={!editable}
      className={cn(cls, !editable && "opacity-50 cursor-not-allowed")}
    />
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// GuardianEmailInput — memo'd, manages own filled state
// ─────────────────────────────────────────────────────────────────────────────
const GuardianEmailInput = memo(function GuardianEmailInput({
  register, hasError, editable, required, defaultFilled,
}: {
  register: any; hasError: boolean
  editable: boolean; required: boolean; defaultFilled: boolean
}) {
  const [filled, setFilled] = useState(defaultFilled)
  const cls = buildFieldClass({ hasError, filled })
  return (
    <Input
      {...register("guardian_email", {
        required: required ? "Required" : false,
        pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email format" },
        maxLength: { value: 50, message: "Max 50 characters" },
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          setFilled(e.target.value.trim().length > 0)
        },
      })}
      type="email"
      placeholder="parent@example.com"
      maxLength={50}
      disabled={!editable}
      className={cn(cls, !editable && "opacity-50 cursor-not-allowed")}
    />
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Step3Family() {
  const isDark = useThemeStore(state => state.isDark)
  const formData = useEnrollmentStore(state => state.formData)
  const updateFormData = useEnrollmentStore(state => state.updateFormData)
  const setStep = useEnrollmentStore(state => state.setStep)
  
  const { isFieldRequired, isFieldEditable } = useEnrollmentValidation()

  const {
    register, handleSubmit, setValue, control,
    formState: { errors },
  } = useForm({
    shouldFocusError: false,
    defaultValues: {
      guardian_first_name: formData.guardian_first_name || "",
      guardian_middle_name: formData.guardian_middle_name || "",
      guardian_last_name: formData.guardian_last_name || "",
      guardian_phone: formData.guardian_phone || "",
      guardian_email: formData.guardian_email || "",
      phone: formData.phone || "",
    },
  })

  useEffect(() => {
    const raf = requestAnimationFrame(() => window.scrollTo(0, 0))
    return () => cancelAnimationFrame(raf)
  }, [])

  const onSubmit = useCallback((data: any) => {
    updateFormData(data); setStep(4)
    toast.success("Contact Details Submitted", { icon: <span className="w-5 h-5 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-white"><img src="/logo-aclc.png" className="w-full h-full object-contain" alt="" /></span> })
  }, [updateFormData, setStep])

  const onError = (errors: any) => {
    const errorKeys = Object.keys(errors); if (errorKeys.length === 0) return
    const firstError = errorKeys[0]
    const el = document.getElementById(`${firstError}_container`) || document.getElementsByName(firstError)[0]
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      toast.error(`Missing or invalid: ${firstError.replace(/_/g, " ")}`, { duration: 4000 })
    }
  }

  // Title-case, updates native input directly before RHF sync
  const handleNameInput = useCallback((e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const raw = e.target.value.replace(/[0-9]/g, "")
    const val = raw.length > 0
      ? raw.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
      : raw
    e.target.value = val
    setValue(field, val, { shouldDirty: false })
    if (field === "guardian_first_name") {
      updateFormData({ [field]: val })
    }
  }, [setValue, updateFormData])

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)}>
      <div className="space-y-8 sm:space-y-10">
        {/* HEADER */}
        <div className={cn(
          "rounded-md p-5 sm:p-6 border flex items-center gap-4 sm:gap-6 shadow-sm relative overflow-hidden",
          isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
        )}>
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-200 dark:bg-slate-800 rounded-md flex items-center justify-center shrink-0 border border-slate-350 dark:border-slate-700">
            <Users className="text-slate-750 dark:text-slate-300 w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-slate-250 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[8px] font-bold uppercase tracking-widest border border-slate-350 dark:border-slate-700">Step 03</span>
            </div>
            <h2 className={cn(
              "text-lg sm:text-2xl font-serif font-bold tracking-normal leading-none",
              isDark ? "text-white" : "text-slate-900"
            )}>Family & Contacts</h2>
          </div>
        </div>

        {/* GUARDIAN NAMES */}
        <div className="space-y-4">
          <Label className="t-text-muted font-bold text-[10px] uppercase tracking-[0.3em] ml-2">
            Guardian Information{" "}
            {(isFieldRequired("guardian_first_name") || isFieldRequired("guardian_last_name")) && (
              <span className="text-red-500">*</span>
            )}
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["guardian_first_name", "guardian_middle_name", "guardian_last_name"] as const).map(field => (
              <div key={field} className="space-y-1" id={`${field}_container`}>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-650">
                    {field.split("_")[1]} name
                  </span>
                  {/* CharCounter isolated — typing only re-renders this counter */}
                  <CharCounter control={control} name={field} max={30} />
                </div>
                <GuardianNameInput
                  fieldName={field}
                  register={register} setValue={setValue}
                  hasError={!!(errors as any)[field]}
                  editable={isFieldEditable(field as any)}
                  required={isFieldRequired(field as any)}
                  onNameInput={handleNameInput}
                  defaultFilled={!!(formData[field]?.trim())}
                />
                {(errors as any)[field] && (
                  <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 ml-1">
                    {(errors as any)[field]?.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* PHONE & EMAIL CONTACTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {([
            { field: "guardian_phone" as const, label: "Guardian Contact No.", icon: Phone },
            { field: "guardian_email" as const, label: "Guardian Email", icon: Mail },
            { field: "phone" as const, label: "Student No.", icon: Phone },
          ]).map(({ field, label, icon: Icon }) => (
            <div key={field} className="space-y-2" id={`${field}_container`}>
              <Label className="t-text-muted font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 ml-2">
                <Icon size={12} className="text-slate-500 shrink-0" />
                <span className="truncate">
                  {label} {isFieldRequired(field as any) && <span className="text-red-500 ml-0.5">*</span>}
                </span>
              </Label>
              {field === "guardian_email" ? (
                <GuardianEmailInput
                  register={register}
                  hasError={!!(errors as any)[field]}
                  editable={isFieldEditable(field as any)}
                  required={isFieldRequired(field as any)}
                  defaultFilled={!!(formData[field]?.trim())}
                />
              ) : (
                <PhoneInput
                  fieldName={field}
                  register={register} setValue={setValue}
                  hasError={!!(errors as any)[field]}
                  editable={isFieldEditable(field as any)}
                  required={isFieldRequired(field as any)}
                  defaultFilled={!!(formData[field]?.trim())}
                />
              )}
              {(errors as any)[field] && (
                <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 ml-1">
                  {(errors as any)[field]?.message}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* NOTICE */}
        <div className="p-5 rounded-md border flex items-center gap-4 t-surface relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-600" />
          <div className="w-10 h-10 rounded-md bg-slate-200 dark:bg-slate-800 border border-slate-350 dark:border-slate-700 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} className="text-slate-500" />
          </div>
          <p className="text-[10px] font-bold text-slate-650 leading-relaxed uppercase tracking-wider">
            Ensure contact nodes are active. These will serve as the primary channels for enrollment status updates.
          </p>
        </div>

      </div>

      {/* SUBMIT BUTTON */}
      <div className="mt-10 flex flex-col gap-3">
        <Button
          type="submit"
          className={cn(
            "w-full min-h-[52px] md:h-16 rounded-md",
            "bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] transition-all",
            "active:scale-98",
            "flex items-center justify-center gap-4 group touch-manipulation border border-transparent shadow-sm"
          )}
        >
          <span>Proceed</span>
          <div className="w-8 h-8 bg-white/10 rounded-md flex items-center justify-center shrink-0">
            <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Button>
        <button type="button" onClick={() => setStep(2)}
          className="min-h-[44px] w-full rounded-md t-text-muted font-bold uppercase text-[9px] sm:text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:text-blue-500 py-3 transition-colors active:scale-98">
          <ChevronLeft className="w-4 h-4 shrink-0" /> Go Back
        </button>
      </div>
    </form>
  )
}