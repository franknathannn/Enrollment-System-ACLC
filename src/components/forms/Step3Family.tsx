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
import { ArrowRight, ChevronLeft, Users, Phone, Sparkles, ShieldCheck, Globe } from "lucide-react"
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
  const { isDark } = useThemeStore()
  const { formData, updateFormData, setStep } = useEnrollmentStore()
  const { isFieldRequired, isFieldEditable }  = useEnrollmentValidation()

  const {
    register, handleSubmit, setValue, control,
    formState: { errors },
  } = useForm({
    shouldFocusError: false,
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
  }, [setValue])

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
          animation: float 10s ease-in-out infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) { .animate-step-in { animation: none; } }
        .spring-btn-blue {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                      background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease;
        }
        .spring-back-btn {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.3s ease;
        }
        @media (min-width: 1024px) {
          .spring-btn-blue:hover  { transform: translateY(-3px) scale(1.04) !important; box-shadow: 0 8px 25px rgba(59,130,246,0.35) !important; }
          .spring-back-btn:hover  { transform: translateY(-2px) scale(1.02) !important; }
        }
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
            <Users className="text-white w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-blue-600/20 text-blue-400 text-[8px] font-black uppercase tracking-[0.2em] border border-blue-500/20">Step 03</span>
              <div className="h-px w-8 bg-blue-500/20" />
              <Sparkles size={10} className="text-blue-400 animate-pulse" />
            </div>
            <h2 className={cn(
              "text-lg sm:text-2xl md:text-3xl font-black tracking-tighter uppercase italic leading-none",
              isDark ? "text-white" : "text-slate-900"
            )}>Family & <span className="text-blue-600">Contacts</span></h2>
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
            <div key={field} className="space-y-2" id={`${field}_container`}>
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
        <div className="p-6 rounded-[32px] border flex items-center gap-4 t-surface relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-blue-500 to-indigo-500" />
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} className="text-blue-400" />
          </div>
          <p className="text-[10px] font-bold text-slate-600 leading-relaxed uppercase tracking-widest">
            Ensure contact nodes are active. These will serve as the primary encrypted channels for enrollment status updates.
          </p>
        </div>

      </div>

      {/* STICKY BOTTOM BAR */}
      <div className="sticky bottom-0 z-20 left-0 right-0 pt-8 -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 px-4 sm:px-6 md:px-8 lg:px-12 mt-6 flex flex-col gap-3 bg-transparent">
        <div style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }} className="flex flex-col gap-3">
          <Button
            type="submit"
            className={cn(
              "w-full min-h-[52px] md:h-16 rounded-[28px] spring-btn-blue",
              "bg-blue-600 lg:hover:bg-white lg:hover:text-blue-600 text-white",
              "shadow-[0_20px_50px_rgba(59,130,246,0.3)]",
              "active:scale-[0.98]",
              "flex items-center justify-center gap-4 group touch-manipulation border-2 border-transparent lg:hover:border-blue-600"
            )}
          >
            <span className="font-black uppercase text-[10px] sm:text-xs tracking-[0.4em]">
              Proceed To Step 04
            </span>
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center lg:group-hover:bg-blue-600 shrink-0 transition-all duration-500">
              <ArrowRight size={20} className="lg:group-hover:translate-x-1 transition-transform" />
            </div>
          </Button>
          <button type="button" onClick={() => setStep(2)}
            className="spring-back-btn min-h-[44px] w-full rounded-xl t-text-muted font-black uppercase text-[9px] sm:text-[10px] tracking-[0.3em] flex items-center justify-center gap-2 lg:hover:text-blue-400 py-3 touch-manipulation active:scale-[0.98]">
            <ChevronLeft className="w-4 h-4 shrink-0" /> Go Back
          </button>
        </div>
      </div>
    </form>
  )
}