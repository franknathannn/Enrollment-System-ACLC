"use client"
import { useForm } from "react-hook-form"
import { useEnrollmentStore } from "@/store/useEnrollmentStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, ChevronLeft, Users, Phone } from "lucide-react"

export default function Step3Family() {
  const { formData, updateFormData, setStep } = useEnrollmentStore()
  
  const { register, handleSubmit } = useForm({ 
    defaultValues: {
      ...formData,
      guardian_first_name: formData.guardian_first_name || "",
      guardian_middle_name: formData.guardian_middle_name || "",
      guardian_last_name: formData.guardian_last_name || "",
      guardian_phone: formData.guardian_phone || "",
      phone: formData.phone || "" // Student's phone
    } 
  })

  const onSubmit = (data: any) => {
    updateFormData(data)
    setStep(4)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-slate-900 rounded-[32px] p-6 text-white flex items-center gap-4 shadow-xl">
        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
          <Users className="text-blue-400" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Step 03</p>
          <h2 className="text-xl font-black tracking-tight uppercase">Family & Contact Info</h2>
        </div>
      </div>

      {/* Guardian Name Grid */}
      <div className="space-y-4">
        <Label className="text-slate-700 font-bold text-xs uppercase tracking-widest">Guardian Full Name *</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Input 
              {...register("guardian_first_name", { required: true })} 
              placeholder="First Name"
              className="h-14 rounded-2xl border-slate-200 focus:border-blue-500 font-bold"
            />
          </div>
          <div className="space-y-2">
            <Input 
              {...register("guardian_middle_name", { required: true })} 
              placeholder="Middle Name"
              className="h-14 rounded-2xl border-slate-200 focus:border-blue-500 font-bold"
            />
          </div>
          <div className="space-y-2">
            <Input 
              {...register("guardian_last_name", { required: true })} 
              placeholder="Last Name"
              className="h-14 rounded-2xl border-slate-200 focus:border-blue-500 font-bold"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Guardian Phone */}
        <div className="space-y-2">
          <Label className="text-slate-700 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
             <Phone size={14} /> Guardian Phone *
          </Label>
          <Input 
            {...register("guardian_phone", { required: true })} 
            placeholder="09XX XXX XXXX"
            className="h-14 rounded-2xl border-slate-200 font-bold"
          />
        </div>

        {/* Student Phone */}
        <div className="space-y-2">
          <Label className="text-slate-700 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
             <Phone size={14} /> Student Phone *
          </Label>
          <Input 
            {...register("phone", { required: true })} 
            placeholder="09XX XXX XXXX"
            className="h-14 rounded-2xl border-slate-200 font-bold"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-4">
        <Button type="submit" className="h-16 rounded-[24px] bg-blue-600 text-white hover:bg-blue-700 text-lg font-black uppercase tracking-tight shadow-xl shadow-blue-100 transition-all active:scale-[0.98] gap-3">
          Continue to Document Uploads <ArrowRight size={20} />
        </Button>
        <Button type="button" variant="ghost" onClick={() => setStep(2)} className="text-slate-400 font-bold hover:bg-slate-100 rounded-xl">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Academic Info
        </Button>
      </div>
    </form>
  )
}