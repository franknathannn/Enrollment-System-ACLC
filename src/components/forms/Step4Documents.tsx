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
import { cn } from "@/lib/utils"
import { useEnrollmentValidation } from "@/hooks/useEnrollmentValidation"
import { useThemeStore } from "@/store/useThemeStore"

export default function Step4Documents() {
  const { isDark } = useThemeStore()
  const { formData: rawFormData, updateFormData, setStep } = useEnrollmentStore()
  const formData = rawFormData as any
  const [loadingField, setLoadingField] = useState<string | null>(null)
  const isJHS = formData.student_category === "JHS Graduate"
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

  const UploaderBox = ({ label, field }: { label: string; field: string }) => {
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
          "group relative rounded-[40px] overflow-hidden border-2 transition-all duration-500",
          currentFileUrl
            ? isDark ? "border-blue-500/30 shadow-[0_20px_50px_rgba(59,130,246,0.2)]" : "border-blue-500/20 shadow-xl"
            : isDark ? "border-white/5 lg:hover:border-blue-500/30 bg-white/5" : "border-slate-200 lg:hover:border-blue-400/30 bg-slate-50/50"
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
                <img src={currentFileUrl} alt={label} className="w-full h-full object-cover opacity-60 transition-transform duration-700 lg:group-hover:scale-105" loading="lazy" style={{ transform: 'translateZ(0)' }} />
                <div className={cn("absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 sm:gap-4 transition-all duration-300 p-4", isDark ? "bg-slate-950/80" : "bg-white/80")}>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="secondary" size="sm" className="w-full max-w-[220px] h-12 rounded-2xl font-black text-[10px] uppercase bg-white text-slate-950 shadow-xl active:scale-95 lg:hover:scale-105 transition-transform touch-manipulation border-none">
                        <Search className="w-4 h-4 mr-2 text-blue-600" /> Preview Document
                      </Button>
                    </DialogTrigger>
                    <DialogContent className={cn("w-[95vw] max-w-4xl max-h-[90dvh] overflow-auto rounded-[40px] p-6 sm:p-8 border-none shadow-[0_0_100px_rgba(59,130,246,0.3)]", isDark ? "bg-slate-950 text-white" : "bg-white text-slate-900")}>
                      <DialogHeader>
                        <DialogTitle className="uppercase font-black tracking-[0.3em] text-lg italic text-blue-600 mb-4">{label}</DialogTitle>
                      </DialogHeader>
                      <div className="relative overflow-hidden rounded-[32px] border-4 border-white/10 shadow-2xl">
                        <img src={currentFileUrl} alt={label} className="max-h-[60dvh] sm:max-h-[70vh] w-full object-contain" loading="lazy" style={{ transform: 'translateZ(0)' }} />
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={() => handleRemove(field)} variant="destructive" size="sm" className="w-full max-w-[220px] h-12 rounded-2xl font-black text-[10px] uppercase bg-red-600/10 text-red-500 border-2 border-red-500/20 active:scale-95 lg:hover:bg-red-600 lg:hover:text-white shadow-xl touch-manipulation transition-all">
                    <Trash2 className="w-4 h-4 mr-2" /> Discard File
                  </Button>
                </div>
              </div>
            ) : (
              <label className="w-full h-full min-h-[180px] flex flex-col items-center justify-center cursor-pointer p-6 z-10 group touch-manipulation">
                <input type="file" className="hidden" onChange={e => handleUpload(e, field, label)} accept="image/*" />
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
            <FileText className="text-white w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-blue-600/20 text-blue-400 text-[8px] font-black uppercase tracking-[0.2em] border border-blue-500/20">Step 04</span>
              <div className="h-px w-8 bg-blue-500/20" />
              <Sparkles size={10} className="text-blue-400 animate-pulse" />
            </div>
            <h2 className={cn(
              "text-lg sm:text-2xl md:text-3xl font-black tracking-tighter uppercase italic leading-none",
              isDark ? "text-white" : "text-slate-900"
            )}>Digital <span className="text-blue-600">Documents</span></h2>
          </div>
        </div>

        <div className={cn("p-5 sm:p-6 rounded-[32px] border flex items-center gap-4 relative overflow-hidden", isDark ? "bg-blue-900/40 border-blue-500/20" : "bg-blue-50 border-blue-100")}>
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
          <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 shrink-0" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed text-slate-500">
            Authenticated channels active. Upload <span className="text-blue-500">Clear Images</span> of your requirements. max 5mb per payload.
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
      </div>

      {/* STICKY BOTTOM BAR */}
      <div className="sticky bottom-0 z-20 left-0 right-0 pt-8 -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 px-4 sm:px-6 md:px-8 lg:px-12 mt-6 flex flex-col gap-3 bg-transparent">
        <div style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }} className="flex flex-col gap-3">
          <Button onClick={handleFinalizeStep}
            className={cn(
              "w-full min-h-[52px] md:h-16 rounded-[28px]",
              "bg-blue-600 lg:hover:bg-white lg:hover:text-blue-600 text-white",
              "shadow-[0_20px_50px_rgba(59,130,246,0.3)] lg:hover:shadow-blue-600/20",
              "transition-all duration-500 active:scale-[0.98]",
              "flex items-center justify-center gap-4 group touch-manipulation border-2 border-transparent lg:hover:border-blue-600"
            )}
          >
            <span className="font-black uppercase text-[10px] sm:text-xs tracking-[0.4em]">
              Finalize Application
            </span>
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center lg:group-hover:bg-blue-600 shrink-0 transition-all duration-500">
              <ChevronRight size={20} className="lg:group-hover:translate-x-1 transition-transform" />
            </div>
          </Button>
          <button type="button" onClick={() => setStep(3)}
            className="min-h-[44px] w-full rounded-xl t-text-muted font-black uppercase text-[9px] sm:text-[10px] tracking-[0.3em] flex items-center justify-center gap-2 lg:hover:text-blue-400 transition-colors py-3 touch-manipulation active:scale-[0.98]">
            <ChevronLeft className="w-4 h-4 shrink-0" /> Go Back
          </button>
        </div>
      </div>
    </div>
  )
}