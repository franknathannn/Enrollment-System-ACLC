"use client"

import React, { useState, useEffect } from "react"
import { useEnrollmentStore } from "@/store/useEnrollmentStore"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  Upload, Loader2, ChevronLeft, ChevronRight, Globe,
  FileText, Trash2, Search, ShieldCheck, Sparkles,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import { useEnrollmentValidation } from "@/hooks/useEnrollmentValidation"
import { useThemeStore } from "@/store/useThemeStore"

export default function Step4Documents() {
  const { isDark } = useThemeStore()
  const { formData: rawFormData, updateFormData, setStep } = useEnrollmentStore()
  const formData = rawFormData as any
  const [loadingField, setLoadingField] = useState<string | null>(null)
  const isJHS = formData.student_category === "JHS Graduate"
  const isPrivateJHS = isJHS && formData.school_type === "Private"
  const isALS = formData.student_category === "ALS Passer"
  const showVoucherQuestion = isPrivateJHS || isALS

  const { isFieldRequired } = useEnrollmentValidation()

  useEffect(() => {
    const raf = requestAnimationFrame(() => window.scrollTo(0, 0))
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string, label: string) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error(`"${label}" exceeds 5MB. Please upload a smaller file.`, { description: `Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`, duration: 5000 })
      e.target.value = ""; return
    }
    setLoadingField(field)
    const fileExt = file.name.split('.').pop()
    const fileName = `${formData.lrn || 'student'}_${field}_${Date.now()}.${fileExt}`
    try {
      const { error } = await supabase.storage.from('enrollment-docs').upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('enrollment-docs').getPublicUrl(fileName)
      updateFormData({ [field]: publicUrl })
      toast.success("Document Uploaded", { icon: <span className="w-5 h-5 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-white"><img src="/logo-aclc.png" className="w-full h-full object-contain" alt="" /></span> })
    } catch (error: any) {
      toast.error("Upload failed: " + error.message)
    } finally {
      setLoadingField(null)
    }
  }

  const handleRemove = (field: string) => { updateFormData({ [field]: null }); toast.info("Document Removed") }

  const handleFinalizeStep = () => {
    const missing: string[] = []
    const check = (f: string) => { if (isFieldRequired(f as any) && !formData[f]) missing.push(f) }

    check('profile_2x2_url')
    check('birth_certificate_url')
    if (isJHS) { check('form_138_url'); check('good_moral_url') }
    else { check('cor_url'); check('af5_url'); check('diploma_url') }

    if (showVoucherQuestion && formData.has_voucher_cert === "yes") {
      check('voucher_cert_url')
    }

    if (missing.length > 0) {
      const first = missing[0]
      const el = document.getElementById(`${first}_container`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        toast.error(`Please upload the required document.`, { duration: 4000 })
      }
      return
    }
    setStep(5)
  }

  const UploaderBox = ({ label, field, acceptType }: { label: string; field: string; acceptType?: string }) => {
    const currentFileUrl = formData[field as keyof typeof formData] as string | null
    const required = isFieldRequired(field as any)

    return (
      <div className="space-y-3" id={`${field}_container`}>
        <Label className="font-black text-slate-500 text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 ml-2 transition-colors group-focus-within:text-blue-400">
          {label}
          {required && <span className="text-red-500 text-[8px] font-bold">*</span>}
          {currentFileUrl && <Sparkles className="w-3 h-3 text-blue-500 animate-pulse" />}
        </Label>

        <div className={cn(
          "group relative rounded-[40px] overflow-hidden border-2 spring-upload-box",
          currentFileUrl
            ? isDark ? "border-blue-500/30 shadow-[0_20px_50px_rgba(59,130,246,0.2)]" : "border-blue-500/20 shadow-xl"
            : isDark ? "border-white/5 bg-white/5" : "border-slate-200 bg-slate-50/50"
        )}>
          <div className={cn(
            "relative transition-all duration-500 min-h-[180px] sm:min-h-[220px] flex flex-col items-center justify-center",
            currentFileUrl ? "bg-blue-600/5 transition-opacity" : ""
          )}>
            {loadingField === field ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse rounded-full" />
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500 relative z-10" />
                </div>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] animate-pulse">Syncing...</span>
              </div>
            ) : currentFileUrl ? (
              <div className="absolute inset-0 w-full h-full group">
                {currentFileUrl.toLowerCase().endsWith(".pdf") ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/10 opacity-60">
                    <FileText size={32} className="text-red-400 mb-2" />
                    <p className="text-xs font-black uppercase tracking-widest text-red-400">PDF Document</p>
                  </div>
                ) : (
                  <img src={currentFileUrl} alt={label} className="w-full h-full object-cover opacity-60 transition-transform duration-700 lg:group-hover:scale-105" loading="lazy" style={{ transform: 'translateZ(0)' }} />
                )}
                <div className={cn("absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 sm:gap-4 transition-all duration-300 p-4", isDark ? "bg-slate-950/80" : "bg-white/80")}>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="secondary" size="sm" className="spring-btn-blue w-full max-w-[220px] h-12 rounded-2xl font-black text-[10px] uppercase bg-white text-slate-950 shadow-xl active:scale-95 touch-manipulation border-none">
                        <Search className="w-4 h-4 mr-2 text-blue-600" /> Preview Document
                      </Button>
                    </DialogTrigger>
                    <DialogContent className={cn("w-[95vw] max-w-4xl max-h-[90dvh] overflow-auto rounded-[40px] p-6 sm:p-8 border-none shadow-[0_0_100px_rgba(59,130,246,0.3)]", isDark ? "bg-slate-950 text-white" : "bg-white text-slate-900")}>
                      <DialogHeader>
                        <DialogTitle className="uppercase font-black tracking-[0.3em] text-lg italic text-blue-600 mb-4">{label}</DialogTitle>
                      </DialogHeader>
                      <div className="relative overflow-hidden rounded-[32px] border-4 border-white/10 shadow-2xl h-[60dvh] sm:h-[70vh]">
                        {currentFileUrl.toLowerCase().endsWith(".pdf") ? (
                          <iframe src={currentFileUrl} className="w-full h-full border-none" title={label} />
                        ) : (
                          <img src={currentFileUrl} alt={label} className="w-full h-full object-contain" loading="lazy" style={{ transform: 'translateZ(0)' }} />
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={() => handleRemove(field)} variant="destructive" size="sm" className="spring-btn-red w-full max-w-[220px] h-12 rounded-2xl font-black text-[10px] uppercase bg-red-600/10 text-red-500 border-2 border-red-500/20 active:scale-95 lg:hover:bg-red-600 lg:hover:text-white shadow-xl touch-manipulation">
                    <Trash2 className="w-4 h-4 mr-2" /> Discard File
                  </Button>
                </div>
              </div>
            ) : (
              <label className="w-full h-full min-h-[180px] flex flex-col items-center justify-center cursor-pointer p-6 z-10 group touch-manipulation">
                <input type="file" className="hidden" onChange={e => handleUpload(e, field, label)} accept={acceptType || "image/*"} />
                <div className={cn(
                  "w-16 h-16 rounded-3xl border-2 mb-5 flex items-center justify-center shadow-2xl transition-all duration-500 lg:group-hover:scale-110 lg:group-hover:rotate-6",
                  isDark ? "bg-blue-600/10 border-blue-500/20 lg:group-hover:bg-blue-600 lg:group-hover:border-blue-400" : "bg-blue-50 border-blue-100 lg:group-hover:bg-blue-600 lg:group-hover:border-blue-500"
                )}>
                  <Upload className={cn("w-7 h-7 transition-colors duration-500", isDark ? "text-blue-400 group-hover:text-white" : "text-blue-600 group-hover:text-white")} />
                </div>
                <div className="text-center space-y-1">
                  <span className="block text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 lg:group-hover:text-blue-400 transition-colors">Record File</span>
                  <span className="block text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500 opacity-60">PNG, JPG up to 5MB</span>
                </div>
              </label>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-step-in">
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
          animation: float 12s ease-in-out infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) { .animate-step-in { animation: none; } }
        .spring-btn-blue {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                      background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease;
        }
        .spring-btn-red {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                      background-color 0.3s ease, color 0.3s ease;
        }
        .spring-back-btn {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.3s ease;
        }
        .spring-upload-box {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                      border-color 0.35s ease;
        }
        @media (min-width: 1024px) {
          .spring-btn-blue:hover   { transform: translateY(-3px) scale(1.04) !important; box-shadow: 0 8px 25px rgba(59,130,246,0.35) !important; }
          .spring-btn-red:hover    { transform: translateY(-3px) scale(1.04) !important; box-shadow: 0 8px 25px rgba(220,38,38,0.3) !important; }
          .spring-back-btn:hover   { transform: translateY(-2px) scale(1.02) !important; }
          .spring-upload-box:hover { transform: translateY(-4px) scale(1.02) !important; box-shadow: 0 8px 25px rgba(59,130,246,0.2) !important; border-color: rgba(59,130,246,0.45) !important; }
        }
      `}</style>



      <div className="space-y-8 sm:space-y-10">

        {/* HEADER */}
        <div className={cn(
          "rounded-md p-5 sm:p-6 border flex items-center gap-4 sm:gap-6 shadow-sm relative overflow-hidden",
          isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
        )}>
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-200 dark:bg-slate-800 rounded-md flex items-center justify-center shrink-0 border border-slate-350 dark:border-slate-700">
            <FileText className="text-slate-750 dark:text-slate-300 w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-slate-250 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[8px] font-bold uppercase tracking-widest border border-slate-350 dark:border-slate-700">Step 04</span>
            </div>
            <h2 className={cn(
              "text-lg sm:text-2xl font-serif font-bold tracking-normal leading-none",
              isDark ? "text-white" : "text-slate-900"
            )}>Digital Documents</h2>
          </div>
        </div>

        <div className={cn("p-5 sm:p-6 rounded-md border flex items-center gap-4 relative overflow-hidden", isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100/55 border-slate-200")}>
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
          <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-slate-500 shrink-0" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed text-slate-600">
            Authenticated channels active. Upload <span className="text-blue-600">Clear Images</span> of your requirements. Max 5mb per payload.
          </p>
        </div>

        {/* UPLOAD GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          <UploaderBox label="2x2 Identification" field="profile_2x2_url" />
          <UploaderBox label="Birth Certificate" field="birth_certificate_url" />
          {isJHS ? (
            <>
              <UploaderBox label="F-138 (Report Card)" field="form_138_url" />
              <UploaderBox label="Certificate of Moral" field="good_moral_url" />
            </>
          ) : (
            <>
              <UploaderBox label="ALS COR" field="cor_url" />
              <UploaderBox label="ALS Diploma" field="diploma_url" />
              <UploaderBox label="AF5 Form" field="af5_url" />
            </>
          )}
        </div>

        {/* Voucher Certificate Question (Conditional) */}
        {showVoucherQuestion && (
          <div className={cn("p-6 rounded-[24px] border shadow-sm transition-all duration-300 animate-step-in", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
            <div className="space-y-4">
              <Label className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                Voucher Verification
              </Label>
              <p className="text-xs text-slate-500">Do you have a DepEd QVR (Voucher) Certificate or ESC Certificate?</p>
              
              <RadioGroup
                value={formData.has_voucher_cert || "no"}
                onValueChange={(val) => {
                  updateFormData({ has_voucher_cert: val as any })
                  if (val !== "yes") updateFormData({ voucher_cert_url: undefined })
                }}
                className="flex flex-col gap-3 mt-4"
              >
                <div className={cn(
                  "flex items-center space-x-2 border rounded-xl p-4 flex-1 cursor-pointer transition-colors",
                  formData.has_voucher_cert === "yes" ? (isDark ? "bg-blue-950/40 border-blue-800" : "bg-blue-50 border-blue-200") : (isDark ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-200 hover:bg-slate-50")
                )} onClick={() => updateFormData({ has_voucher_cert: "yes" })}>
                  <RadioGroupItem value="yes" id="voucher_yes" />
                  <Label htmlFor="voucher_yes" className="cursor-pointer font-bold w-full">Yes, I have a certificate</Label>
                </div>
                <div className={cn(
                  "flex items-center space-x-2 border rounded-xl p-4 flex-1 cursor-pointer transition-colors",
                  formData.has_voucher_cert === "pending" ? (isDark ? "bg-amber-950/40 border-amber-800" : "bg-amber-50 border-amber-200") : (isDark ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-200 hover:bg-slate-50")
                )} onClick={() => {
                  updateFormData({ has_voucher_cert: "pending", voucher_cert_url: undefined })
                }}>
                  <RadioGroupItem value="pending" id="voucher_pending" />
                  <Label htmlFor="voucher_pending" className="cursor-pointer font-bold w-full">Applied, awaiting result</Label>
                </div>
                <div className={cn(
                  "flex items-center space-x-2 border rounded-xl p-4 flex-1 cursor-pointer transition-colors",
                  formData.has_voucher_cert === "no" ? (isDark ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-300") : (isDark ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-200 hover:bg-slate-50")
                )} onClick={() => {
                  updateFormData({ has_voucher_cert: "no", voucher_cert_url: undefined })
                }}>
                  <RadioGroupItem value="no" id="voucher_no" />
                  <Label htmlFor="voucher_no" className="cursor-pointer font-bold w-full">No, I do not have one</Label>
                </div>
              </RadioGroup>

              {formData.has_voucher_cert === "yes" && (
                <div className="pt-4 mt-4 border-t border-dashed border-slate-200 dark:border-slate-800 animate-step-in">
                  <div className="grid grid-cols-1">
                    <UploaderBox label="QVR / ESC Certificate (PDF ONLY)" field="voucher_cert_url" acceptType=".pdf" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SUBMIT BUTTON */}
      <div className="mt-10 flex flex-col gap-3">
        <Button onClick={handleFinalizeStep}
            className={cn(
              "w-full min-h-[52px] md:h-16 rounded-md",
              "bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] transition-all",
              "active:scale-98",
              "flex items-center justify-center gap-4 group touch-manipulation border border-transparent shadow-sm"
            )}
          >
            <span>Finalize Application</span>
            <div className="w-8 h-8 bg-white/10 rounded-md flex items-center justify-center shrink-0">
              <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Button>
          <button type="button" onClick={() => setStep(3)}
            className="min-h-[44px] w-full rounded-md t-text-muted font-bold uppercase text-[9px] sm:text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:text-blue-500 py-3 transition-colors active:scale-98">
            <ChevronLeft className="w-4 h-4 shrink-0" /> Go Back
          </button>
      </div>
    </div>
  )
}