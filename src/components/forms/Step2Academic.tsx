"use client"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useEnrollmentStore } from "@/store/useEnrollmentStore"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, ChevronLeft, GraduationCap, School, CalendarDays, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

export default function Step2Academic() {
  const { formData, updateFormData, setStep } = useEnrollmentStore()
  const [dbSchoolYear, setDbSchoolYear] = useState<string>("")
  const [fetchingYear, setFetchingYear] = useState(true)
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({ 
    defaultValues: {
      lrn: formData.lrn || "",
      school_year: formData.school_year || "", 
      student_category: formData.student_category || "JHS Graduate",
      strand: formData.strand || "",
      last_school_attended: formData.last_school_attended || "",
      gwa_grade_10: formData.gwa_grade_10 || ""
    } 
  })

  useEffect(() => {
    async function fetchActiveYear() {
      try {
        const { data } = await supabase.from('system_config').select('school_year').single()
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
    fetchActiveYear()
  }, [setValue])

  const selectedCategory = watch("student_category")

  const onSubmit = (data: any) => {
    updateFormData(data)
    setStep(3)
    toast.success("Academic Profile Saved")
  }

  const onError = () => {
    toast.error("Please complete all required fields.")
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-8 animate-in fade-in duration-500 pb-40">
      <div className="bg-slate-900 rounded-[32px] p-6 text-white flex items-center gap-4 shadow-xl">
        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
          <GraduationCap className="text-blue-400" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Step 02</p>
          <h2 className="text-xl font-black tracking-tight uppercase">Academic Information</h2>
        </div>
      </div>

      {/* ROW 1: LRN (Highest Priority) */}
      <div className="relative z-[100] space-y-2">
        <Label htmlFor="lrn" className={`font-bold text-xs uppercase tracking-widest ${errors.lrn ? 'text-red-500' : 'text-slate-700'}`}>12-Digit LRN *</Label>
        <Input 
          {...register("lrn", { required: "LRN is required", pattern: { value: /^\d{12}$/, message: "Must be 12 digits" } })} 
          id="lrn"
          placeholder="Enter 12-digit LRN" 
          maxLength={12}
          className={`h-14 rounded-2xl border-2 font-mono text-lg tracking-[0.3em] transition-all ${errors.lrn ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`}
        />
        {errors.lrn && <p className="text-red-500 text-[10px] font-black uppercase mt-1 px-1">{errors.lrn.message as string}</p>}
      </div>

      {/* ROW 2: Student Category (Second Priority) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-[90]">
        <div className="space-y-2">
          <Label className="text-slate-700 font-bold text-xs uppercase tracking-widest">Student Category *</Label>
          <Select 
            onValueChange={(v) => {
              const value = v as "JHS Graduate" | "ALS Passer";
              setValue("student_category", value);
              updateFormData({ student_category: value });
            }} 
            defaultValue={formData.student_category || "JHS Graduate"}
          >
            <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 font-bold bg-white focus:ring-2 focus:ring-blue-500">
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            {/* FIX: position="popper" and high z-index keeps menu on top of the Strand field */}
            <SelectContent position="popper" className="rounded-2xl shadow-2xl border-none z-[999] bg-white min-w-[var(--radix-select-trigger-width)]">
              <SelectItem value="JHS Graduate" className="font-bold py-3">Junior High School Graduate</SelectItem>
              <SelectItem value="ALS Passer" className="font-bold py-3">ALS Passer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-700 font-bold text-xs uppercase tracking-widest">School Year (Locked)</Label>
          <div className="h-14 rounded-2xl border border-slate-100 bg-slate-50 flex items-center px-4 gap-3 text-slate-900 shadow-inner">
            {fetchingYear ? <Loader2 size={18} className="animate-spin text-blue-600" /> : <CalendarDays size={18} className="text-blue-600" />}
            <span className="font-black uppercase tracking-tighter text-sm">
              {fetchingYear ? "Syncing..." : `S.Y. ${dbSchoolYear}`}
            </span>
          </div>
          <input type="hidden" {...register("school_year")} />
        </div>
      </div>

      {/* ROW 3: Strand Selection (Third Priority) */}
      <div className="relative z-[80] space-y-2">
        <Label className={`font-bold text-xs uppercase tracking-widest ${errors.strand ? 'text-red-500' : 'text-slate-700'}`}>Desired Academic Strand *</Label>
        <Select 
          onValueChange={(v) => {
            setValue("strand", v, { shouldValidate: true })
            updateFormData({ strand: v })
          }} 
          defaultValue={formData.strand}
        >
          <SelectTrigger className={`h-14 rounded-2xl border-2 font-bold transition-all ${errors.strand ? 'border-red-500 bg-red-50' : 'border-slate-100 text-blue-600 bg-white'}`}>
            <SelectValue placeholder="Choose your strand" />
          </SelectTrigger>
          {/* FIX: position="popper" ensures it overlaps the Last School field */}
          <SelectContent position="popper" className="rounded-2xl shadow-2xl border-none z-[999] bg-white min-w-[var(--radix-select-trigger-width)]">
            <SelectItem value="ICT" className="font-bold py-3">ICT (Information & Communications Technology)</SelectItem>
            <SelectItem value="GAS" className="font-bold py-3">GAS (General Academic Strand)</SelectItem>
          </SelectContent>
        </Select>
        <input type="hidden" {...register("strand", { required: "Strand selection is required" })} />
        {errors.strand && <p className="text-red-500 text-[10px] font-black uppercase mt-1 px-1">{errors.strand.message as string}</p>}
      </div>

      {/* ROW 4: Last School (Lower Priority) */}
      <div className="relative z-[10] space-y-2">
        <Label htmlFor="last_school" className={`font-bold text-xs uppercase tracking-widest ${errors.last_school_attended ? 'text-red-500' : 'text-slate-700'}`}>Last School Attended *</Label>
        <div className="relative">
            <School className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${errors.last_school_attended ? 'text-red-400' : 'text-slate-400'}`} />
            <Input 
                {...register("last_school_attended", { required: "School name is required" })} 
                id="last_school"
                placeholder="Name of previous school" 
                className={`h-14 rounded-2xl border-2 pl-12 font-bold transition-all ${errors.last_school_attended ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`}
            />
        </div>
        {errors.last_school_attended && <p className="text-red-500 text-[10px] font-black uppercase mt-1 px-1">{errors.last_school_attended.message as string}</p>}
      </div>

      {/* ROW 5: GWA */}
      {selectedCategory === "JHS Graduate" && (
        <div className="relative z-[0] space-y-2 animate-in slide-in-from-top-4">
          <Label htmlFor="gwa" className={`font-bold text-xs uppercase tracking-widest ${errors.gwa_grade_10 ? 'text-red-500' : 'text-slate-700'}`}>Grade 10 GWA *</Label>
          <Input 
            {...register("gwa_grade_10", { 
              required: selectedCategory === "JHS Graduate" ? "GWA is required" : false 
            })} 
            id="gwa"
            type="number" 
            step="0.01" 
            placeholder="e.g. 92.50" 
            className={`h-14 rounded-2xl border-2 font-mono text-lg transition-all ${errors.gwa_grade_10 ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`}
          />
          {errors.gwa_grade_10 && <p className="text-red-500 text-[10px] font-black uppercase mt-1 px-1">{errors.gwa_grade_10.message as string}</p>}
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3 text-red-600 animate-pulse">
            <AlertCircle size={18} />
            <p className="text-[10px] font-black uppercase tracking-widest">Academic Validation Error: Check all required fields.</p>
        </div>
      )}

      <div className="flex flex-col gap-4 pt-4">
        <Button 
          type="submit" 
          disabled={fetchingYear}
          className="w-full h-16 bg-blue-600 hover:bg-blue-700 rounded-2xl text-lg font-black uppercase tracking-tight gap-3 shadow-xl shadow-blue-200 transition-all active:scale-[0.98]"
        >
          {fetchingYear ? "Syncing Logic..." : "Next: Family Contacts"} <ArrowRight className="w-6 h-6" />
        </Button>
        <Button type="button" variant="ghost" onClick={() => setStep(1)} className="text-slate-400 font-bold hover:bg-slate-100 rounded-xl">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Identity
        </Button>
      </div>
    </form>
  )
}