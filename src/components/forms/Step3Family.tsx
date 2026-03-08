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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, ChevronLeft, Users, Phone, Sparkles, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useEnrollmentValidation } from "@/hooks/useEnrollmentValidation"

// ─────────────────────────────────────────────────────────────────────────────
// buildFieldClass — no isDark, uses t-input CSS vars
// ─────────────────────────────────────────────────────────────────────────────
function buildFieldClass(opts: { hasError: boolean; filled: boolean }) {
  return cn(
    "min-h-[44px] h-11 md:h-12 rounded-xl border-2",
    "transition-[border-color,background-color] duration-150",
    "font-medium outline-none text-sm t-input",
    opts.hasError ? "error" : opts.filled ? "filled" : ""
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
      placeholder="09XX XXX XXXX"
      maxLength={11}
      disabled={!editable}
      className={cn(cls, !editable && "opacity-50 cursor-not-allowed")}
    />
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Step3Family() {
  const { formData, updateFormData, setStep } = useEnrollmentStore()
  const { isFieldRequired, isFieldEditable }  = useEnrollmentValidation()

  const {
    register, handleSubmit, setValue, control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      guardian_first_name:  formData.guardian_first_name  || "",
      guardian_middle_name: formData.guardian_middle_name || "",
      guardian_last_name:   formData.guardian_last_name   || "",
      guardian_phone:       formData.guardian_phone       || "",
      phone:                formData.phone                || "",
    },
  })

  useEffect(() => {
    const raf = requestAnimationFrame(() => window.scrollTo(0, 0))
    return () => cancelAnimationFrame(raf)
  }, [])

  const onSubmit = useCallback((data: any) => {
    updateFormData(data); setStep(4)
    toast.success("Contact Details Submitted", { icon: <Sparkles className="text-blue-400" /> })
  }, [updateFormData, setStep])

  // Title-case, updates native input directly before RHF sync
  const handleNameInput = useCallback((e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const raw = e.target.value.replace(/[0-9]/g, "")
    const val = raw.length > 0
      ? raw.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
      : raw
    e.target.value = val
    setValue(field, val, { shouldDirty: false })
  }, [setValue])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="animate-step-in">
      <style>{`
        @keyframes stepIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-step-in {
          animation: stepIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
          will-change: opacity, transform;
        }
        @media (prefers-reduced-motion: reduce) { .animate-step-in { animation: none; } }
      `}</style>

      <div className="space-y-6 sm:space-y-8 pb-[140px] min-[480px]:pb-[160px]">

        {/* HEADER */}
        <div className="rounded-2xl sm:rounded-[32px] p-4 sm:p-6 border flex items-center gap-3 sm:gap-5 shadow-2xl relative overflow-hidden t-header-block">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
            <Users className="text-white w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.4em] text-blue-400 mb-0.5 sm:mb-1">Step 03</p>
            <h2 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight uppercase italic leading-tight t-text">
              Family & Contacts
            </h2>
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
              <div key={field} className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
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

        {/* PHONE CONTACTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {([
            { field: "guardian_phone" as const, label: "Guardian Contact No." },
            { field: "phone" as const,          label: "Student No." },
          ]).map(({ field, label }) => (
            <div key={field} className="space-y-2">
              <Label className="t-text-muted font-bold text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 ml-2">
                <Phone size={12} className="text-blue-700" />
                {label} {isFieldRequired(field as any) && <span className="text-red-500">*</span>}
              </Label>
              <PhoneInput
                fieldName={field}
                register={register} setValue={setValue}
                hasError={!!(errors as any)[field]}
                editable={isFieldEditable(field as any)}
                required={isFieldRequired(field as any)}
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

        {/* NOTICE */}
        <div className="p-6 rounded-[32px] border flex items-center gap-4 t-surface">
          <ShieldCheck size={24} className="text-blue-700 shrink-0" />
          <p className="text-[10px] font-bold text-slate-600 leading-relaxed uppercase tracking-widest">
            Ensure contact nodes are active. These will serve as the primary encrypted channels for enrollment status updates.
          </p>
        </div>

      </div>

      {/* STICKY BOTTOM BAR */}
      <div className="sticky bottom-0 z-20 left-0 right-0 pt-4 -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 px-4 sm:px-6 md:px-8 lg:px-12 mt-6 backdrop-blur-md border-t flex flex-col gap-3 t-sticky">
        <div style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }} className="flex flex-col gap-3">
          <Button
            type="submit"
            className={cn(
              "w-full min-h-[48px] sm:min-h-[52px] md:h-14 rounded-2xl sm:rounded-[28px]",
              "bg-blue-600 lg:hover:bg-white lg:hover:text-blue-600 text-white",
              "shadow-[0_20px_50px_rgba(59,130,246,0.3)]",
              "transition-[background-color,color] duration-300 active:scale-[0.98]",
              "flex items-center justify-center gap-3 sm:gap-4 group touch-manipulation"
            )}
          >
            <span className="font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.4em] text-white lg:group-hover:text-blue-600">
              Proceed To Step 04
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 rounded-full flex items-center justify-center lg:group-hover:bg-blue-600 shrink-0 transition-[background-color]">
              <ArrowRight size={18} className="sm:w-5 sm:h-5 lg:group-hover:translate-x-1 transition-transform" />
            </div>
          </Button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="min-h-[44px] w-full rounded-xl t-text-muted font-bold uppercase text-[9px] sm:text-[10px] tracking-[0.3em] flex items-center justify-center gap-2 lg:hover:text-blue-400 transition-colors py-3 touch-manipulation active:scale-[0.98]"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" /> Go Back
          </button>
        </div>
      </div>
    </form>
  )
}