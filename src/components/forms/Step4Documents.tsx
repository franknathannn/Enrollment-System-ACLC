"use client"

import React, { useState } from "react"
import { useEnrollmentStore } from "@/store/useEnrollmentStore"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Upload, CheckCircle2, Loader2, ChevronLeft, FileText, Info } from "lucide-react"

export default function Step4Documents() {
  const { formData, updateFormData, setStep } = useEnrollmentStore()
  const [loadingField, setLoadingField] = useState<string | null>(null)

  const isJHS = formData.student_category === "JHS Graduate"

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoadingField(field)
    const fileExt = file.name.split('.').pop()
    const fileName = `${formData.lrn || 'student'}_${field}_${Date.now()}.${fileExt}`
    
    try {
      const { data, error } = await supabase.storage
        .from('enrollment-docs')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('enrollment-docs')
        .getPublicUrl(fileName)

      updateFormData({ [field]: publicUrl })
      toast.success("Document uploaded successfully")
    } catch (error: any) {
      console.error(error)
      toast.error("Upload failed: " + error.message)
    } finally {
      setLoadingField(null)
    }
  }

  const UploaderBox = ({ label, field }: { label: string, field: string }) => (
    <div className="space-y-3">
      <Label className="font-black text-slate-700 text-[11px] uppercase tracking-wider flex justify-between">
        {label} <span className="text-red-500">*</span>
      </Label>
      <label className={`
        border-2 border-dashed rounded-[32px] p-6 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[160px]
        ${formData[field as keyof typeof formData] ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200 hover:border-blue-400"}
      `}>
        <input type="file" className="hidden" onChange={(e) => handleUpload(e, field)} accept="image/*,.pdf" />
        {loadingField === field ? (
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        ) : formData[field as keyof typeof formData] ? (
          <CheckCircle2 className="w-8 h-8 text-blue-600 animate-in zoom-in" />
        ) : (
          <Upload className="w-8 h-8 text-slate-300" />
        )}
        <span className="text-[9px] mt-3 font-black uppercase tracking-widest text-slate-500 text-center">
          {formData[field as keyof typeof formData] ? "File Ready" : `Upload ${label}`}
        </span>
      </label>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-slate-900 rounded-[32px] p-6 text-white flex items-center gap-4 shadow-xl">
        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
          <FileText className="text-blue-400" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Step 04</p>
          <h2 className="text-xl font-black tracking-tight uppercase">Upload Requirements</h2>
        </div>
      </div>

      <div className={`p-4 rounded-2xl flex items-center gap-3 border ${isJHS ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'}`}>
        <Info className={`w-5 h-5 ${isJHS ? 'text-blue-500' : 'text-amber-500'}`} />
        <p className={`text-xs font-bold uppercase tracking-tight ${isJHS ? 'text-blue-700' : 'text-amber-700'}`}>
          Notice: {isJHS ? 'Form 138 and Good Moral are mandatory.' : 'Diploma, COR, and AF5 are mandatory for ALS Passers.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* SHARED REQUIREMENT */}
        <UploaderBox label="2x2 Picture" field="profile_2x2_url" />

        {isJHS ? (
          <>
            <UploaderBox label="Form 138 (Card)" field="form_138_url" />
            <UploaderBox label="Good Moral" field="good_moral_url" />
          </>
        ) : (
          <>
            <UploaderBox label="COR Rating" field="cor_url" />
            <UploaderBox label="AF5 Form" field="af5_url" />
            <UploaderBox label="Diploma" field="diploma_url" />
          </>
        )}
      </div>

      <div className="flex flex-col gap-4 pt-4">
        <Button 
          onClick={() => setStep(5)} 
          disabled={
            !formData.profile_2x2_url || 
            (isJHS 
              ? (!formData.form_138_url || !formData.good_moral_url)
              : (!formData.cor_url || !formData.af5_url || !formData.diploma_url))
          }
          className="h-16 bg-blue-600 hover:bg-blue-700 rounded-2xl text-lg font-black shadow-xl shadow-blue-100 disabled:opacity-30 uppercase tracking-widest transition-all active:scale-95"
        >
          Review Application
        </Button>
        <Button 
          variant="ghost" 
          onClick={() => setStep(3)} 
          className="text-slate-400 font-bold hover:bg-slate-100 rounded-xl"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Family Info
        </Button>
      </div>
    </div>
  )
}