"use client"

import React, { useState, useEffect } from "react"
import { useEnrollmentStore } from "@/store/useEnrollmentStore"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  Upload, Loader2, ChevronLeft, ChevronRight,
  FileText, Trash2, Search, ShieldCheck, Sparkles,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useEnrollmentValidation } from "@/hooks/useEnrollmentValidation"
import { useThemeStore } from "@/store/useThemeStore"

export default function Step4Documents() {
  const [isMounted, setIsMounted] = useState(false)
  const { isDark } = useThemeStore()
  const { formData: rawFormData, updateFormData, setStep } = useEnrollmentStore()
  const formData = rawFormData as any
  const [loadingField, setLoadingField] = useState<string | null>(null)
  const isJHS = formData.student_category === "JHS Graduate"
  const { isFieldRequired } = useEnrollmentValidation()

  useEffect(() => { window.scrollTo(0, 0); setIsMounted(true) }, [])

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
      toast.success("Document Synced", { icon: <Sparkles className="text-blue-400" /> })
    } catch (error: any) {
      toast.error("Upload failed: " + error.message)
    } finally {
      setLoadingField(null)
    }
  }

  const handleRemove = (field: string) => { updateFormData({ [field]: null }); toast.info("Document Removed") }

  // ── UploaderBox — NO canvas, pure CSS background for empty state ─────────
  const UploaderBox = ({ label, field }: { label: string; field: string }) => {
    const currentFileUrl = formData[field as keyof typeof formData] as string | null
    const required = isFieldRequired(field as any)

    return (
      <div className="space-y-3">
        <Label className="font-bold text-slate-500 text-[9px] uppercase tracking-[0.3em] flex items-center gap-2 ml-2">
          {label}
          {required && <span className="text-red-500 text-[8px] font-bold">*</span>}
          {currentFileUrl && <Sparkles className="w-3 h-3 text-blue-500 lg:animate-pulse" />}
        </Label>

        <div className={cn(
          "group relative rounded-2xl sm:rounded-[32px] overflow-hidden border-2 transition-[border-color,box-shadow] duration-300",
          currentFileUrl
            ? isDark ? "border-blue-900/40 shadow-[0_0_30px_rgba(30,58,138,0.2)]" : "border-blue-500/40 shadow-sm"
            : isDark ? "border-white/5 lg:hover:border-blue-500/30" : "border-slate-200 lg:hover:border-blue-300"
        )}>
          <div className={cn(
            "relative transition-colors duration-300 min-h-[160px] sm:min-h-[200px] md:min-h-[220px] flex flex-col items-center justify-center",
            currentFileUrl
              ? isDark ? "bg-slate-950/60" : "bg-white"
              : isDark
                ? "bg-[radial-gradient(ellipse_at_30%_30%,rgba(59,130,246,0.06)_0%,transparent_60%),rgba(255,255,255,0.03)]"
                : "bg-[radial-gradient(ellipse_at_30%_30%,rgba(59,130,246,0.06)_0%,transparent_60%),rgba(248,250,252,1)]"
          )}>
            {loadingField === field ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.3em]">Uploading...</span>
              </div>
            ) : currentFileUrl ? (
              <div className="absolute inset-0 w-full h-full">
                <img src={currentFileUrl} alt={label} className="w-full h-full object-cover opacity-50 transition-opacity lg:group-hover:opacity-30" loading="lazy" />
                <div className={cn("absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px] p-3 sm:p-4", isDark ? "bg-slate-950/40" : "bg-white/40")}>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="secondary" size="sm" className="w-full max-w-[200px] min-h-[44px] rounded-xl font-bold text-[9px] sm:text-[10px] uppercase bg-white text-slate-950 lg:hover:bg-blue-50 touch-manipulation">
                        <Search className="w-4 h-4 mr-2 text-blue-600 shrink-0" /> View Image
                      </Button>
                    </DialogTrigger>
                    <DialogContent className={cn("w-[95vw] max-w-4xl max-h-[90dvh] overflow-auto rounded-2xl sm:rounded-[40px] p-4 sm:p-6", isDark ? "bg-slate-950/95 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}>
                      <DialogHeader><DialogTitle className={cn("uppercase font-black tracking-widest text-sm sm:text-base", isDark ? "text-white" : "text-slate-900")}>{label}</DialogTitle></DialogHeader>
                      <div className={cn("flex items-center justify-center p-3 sm:p-4 rounded-2xl sm:rounded-3xl border shadow-2xl min-h-[200px]", isDark ? "bg-slate-900 border-white/5" : "bg-slate-100 border-slate-200")}>
                        <img src={currentFileUrl} alt={label} className="max-h-[60dvh] sm:max-h-[70vh] object-contain rounded-xl shadow-2xl" loading="lazy" />
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={() => handleRemove(field)} variant="destructive" size="sm" className="w-full max-w-[200px] min-h-[44px] rounded-xl font-bold text-[9px] sm:text-[10px] uppercase bg-red-900/20 text-red-500 border border-red-500/50 lg:hover:bg-red-600 lg:hover:text-white touch-manipulation">
                    <Trash2 className="w-4 h-4 mr-2 shrink-0" /> Remove Image
                  </Button>
                </div>
              </div>
            ) : (
              <label className="w-full h-full min-h-[140px] flex flex-col items-center justify-center cursor-pointer p-4 sm:p-6 z-10 group touch-manipulation">
                <input type="file" className="hidden" onChange={e => handleUpload(e, field, label)} accept="image/*" />
                <div className={cn("p-4 sm:p-5 rounded-xl sm:rounded-2xl border mb-3 sm:mb-4 lg:group-hover:bg-blue-600 lg:group-active:scale-110 transition-[background-color,transform] duration-300", isDark ? "bg-blue-600/10 border-blue-500/20" : "bg-blue-50 border-blue-200")}>
                  <Upload className="w-6 h-6 text-blue-700 lg:group-hover:text-white" />
                </div>
                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 text-center lg:group-hover:text-blue-400 transition-colors">
                  Tap to upload<br />{label}
                </span>
              </label>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!isMounted) return null

  return (
    <div className="lg:animate-in lg:fade-in lg:slide-in-from-right-6 lg:duration-700">
      <div className="space-y-6 sm:space-y-8 pb-[140px] min-[480px]:pb-[160px]">

        {/* HEADER */}
        <div className={cn("rounded-2xl sm:rounded-[32px] p-4 sm:p-6 border flex items-center gap-3 sm:gap-5 shadow-2xl relative overflow-hidden", isDark ? "bg-blue-600/10 border-blue-500/20 text-white" : "bg-white border-blue-100 text-slate-900")}>
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400" />
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
            <FileText className="text-white w-6 h-6 sm:w-7 sm:h-7 drop-shadow-[0_1px_4px_rgba(255,255,255,0.3)]" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.4em] text-blue-400 mb-0.5 sm:mb-1">Step 04</p>
            <h2 className={cn("text-base sm:text-xl md:text-2xl font-bold tracking-tight uppercase italic leading-tight", isDark ? "text-white" : "text-slate-900")}>Document Application</h2>
          </div>
        </div>

        <div className={cn("p-4 sm:p-5 rounded-2xl sm:rounded-[24px] border flex items-center gap-3 sm:gap-4", isDark ? "bg-blue-950/40 border-blue-900/30" : "bg-blue-50 border-blue-200")}>
          <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-700 shrink-0" />
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest leading-relaxed text-slate-500">
            Use <span className="text-blue-400">JPG, JPEG, or PNG</span> only. <span className="text-blue-400">Max size 5MB</span> per file.
          </p>
        </div>

        {/* UPLOAD GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          <UploaderBox label="2x2 Identification" field="profile_2x2_url" />
          <UploaderBox label="Birth Certificate"  field="birth_certificate_url" />
          {isJHS ? (
            <>
              <UploaderBox label="F-138 (Report Card)"  field="form_138_url" />
              <UploaderBox label="Certificate of Moral" field="good_moral_url" />
            </>
          ) : (
            <>
              <UploaderBox label="ALS COR"    field="cor_url" />
              <UploaderBox label="ALS Diploma" field="diploma_url" />
              <UploaderBox label="AF5 Form"   field="af5_url" />
            </>
          )}
        </div>
      </div>

      {/* STICKY BOTTOM BAR */}
      <div className="sticky bottom-0 z-20 left-0 right-0 pt-4 -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 px-4 sm:px-6 md:px-8 lg:px-12 mt-6 backdrop-blur-md border-t flex flex-col gap-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))", backgroundColor: isDark ? "rgba(2, 6, 23, 0.95)" : "rgba(255, 255, 255, 0.95)", borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(226,232,240,1)" }}>
        <Button onClick={() => setStep(5)}
          disabled={
            (isFieldRequired('profile_2x2_url')       && !formData.profile_2x2_url) ||
            (isFieldRequired('birth_certificate_url') && !formData.birth_certificate_url) ||
            (isJHS  && isFieldRequired('form_138_url')  && !formData.form_138_url) ||
            (isJHS  && isFieldRequired('good_moral_url')&& !formData.good_moral_url) ||
            (!isJHS && isFieldRequired('cor_url')       && !formData.cor_url) ||
            (!isJHS && isFieldRequired('af5_url')       && !formData.af5_url) ||
            (!isJHS && isFieldRequired('diploma_url')   && !formData.diploma_url)
          }
          className="w-full min-h-[48px] sm:min-h-[52px] md:h-14 rounded-2xl sm:rounded-[28px] bg-blue-600 lg:hover:bg-white lg:hover:text-blue-600 text-white shadow-[0_20px_50px_rgba(59,130,246,0.4)] transition-[background-color,color,box-shadow,transform] duration-300 active:scale-[0.98] flex items-center justify-center gap-3 sm:gap-4 group disabled:opacity-50 touch-manipulation">
          <span className="font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.4em] text-white lg:group-hover:text-blue-600">Finalize Application</span>
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 rounded-full flex items-center justify-center lg:group-hover:bg-blue-600 shrink-0 transition-[background-color]">
            <ChevronRight size={18} className="sm:w-5 sm:h-5 lg:group-hover:translate-x-1 transition-transform" />
          </div>
        </Button>
        <button type="button" onClick={() => setStep(3)} className="min-h-[44px] w-full rounded-xl text-slate-500 font-bold uppercase text-[9px] sm:text-[10px] tracking-[0.3em] flex items-center justify-center gap-2 lg:hover:text-white transition-colors py-3 touch-manipulation active:scale-[0.98]">
          <ChevronLeft className="w-4 h-4 shrink-0" /> Go Back
        </button>
      </div>
    </div>
  )
}