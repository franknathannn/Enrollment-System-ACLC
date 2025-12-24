"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { useEnrollmentStore } from "@/store/useEnrollmentStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowRight, User, AlertCircle, Calendar, BookOpen, MapPin } from "lucide-react"
import { toast } from "sonner" // Ensure sonner is imported for better UX

export default function Step1Identity() {
  const { formData, updateFormData, setStep } = useEnrollmentStore()
  
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({ 
    defaultValues: {
      first_name: formData.first_name || "",
      middle_name: formData.middle_name || "",
      last_name: formData.last_name || "",
      email: formData.email || "",
      age: formData.age || "",
      gender: formData.gender || "Male",
      civil_status: formData.civil_status || "Single",
      birth_date: formData.birth_date || "",
      religion: formData.religion || "",
      address: formData.address || ""
    } 
  })

  // Sync gender/civil status specifically if they are missing
  useEffect(() => {
    if (!formData.gender) updateFormData({ gender: "Male" })
    if (!formData.civil_status) updateFormData({ civil_status: "Single" })
  }, [formData.gender, formData.civil_status, updateFormData])

  const onSubmit = (data: any) => {
    updateFormData(data)
    setStep(2)
    toast.success("Identity Verified")
  }

  const onError = (formErrors: any) => {
    // FIX: Catch empty error object and show specific message
    const errorCount = Object.keys(formErrors).length;
    if (errorCount > 0) {
      toast.error(`Please correct ${errorCount} errors before proceeding.`)
    } else {
      toast.error("Please fill in the required fields.")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-blue-600 rounded-[32px] p-6 text-white flex items-center gap-4 shadow-lg shadow-blue-100">
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
          <User className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">Step 01</p>
          <h2 className="text-xl font-black tracking-tight uppercase">Personal Identity</h2>
        </div>
      </div>

      {/* Name Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label className={`font-bold text-xs uppercase tracking-widest ${errors.first_name ? 'text-red-500' : 'text-slate-700'}`}>First Name *</Label>
          <Input 
            {...register("first_name", { required: "First name is required" })} 
            placeholder="Juan" 
            className={`h-12 rounded-xl border-2 transition-all ${errors.first_name ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`}
          />
          {errors.first_name && <p className="text-red-500 text-[10px] font-black uppercase mt-1 px-1">{errors.first_name.message as string}</p>}
        </div>
        <div className="space-y-2">
          <Label className={`font-bold text-xs uppercase tracking-widest ${errors.middle_name ? 'text-red-500' : 'text-slate-700'}`}>Middle Name *</Label>
          <Input 
            {...register("middle_name", { required: "Middle name is required" })} 
            placeholder="Protacio" 
            className={`h-12 rounded-xl border-2 transition-all ${errors.middle_name ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`}
          />
          {errors.middle_name && <p className="text-red-500 text-[10px] font-black uppercase mt-1 px-1">{errors.middle_name.message as string}</p>}
        </div>
        <div className="space-y-2">
          <Label className={`font-bold text-xs uppercase tracking-widest ${errors.last_name ? 'text-red-500' : 'text-slate-700'}`}>Last Name *</Label>
          <Input 
            {...register("last_name", { required: "Last name is required" })} 
            placeholder="Dela Cruz" 
            className={`h-12 rounded-xl border-2 transition-all ${errors.last_name ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`}
          />
          {errors.last_name && <p className="text-red-500 text-[10px] font-black uppercase mt-1 px-1">{errors.last_name.message as string}</p>}
        </div>
      </div>

      {/* Birthdate and Religion Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className={`font-bold text-xs uppercase tracking-widest ${errors.birth_date ? 'text-red-500' : 'text-slate-700'}`}>Birth Date *</Label>
          <div className="relative">
            <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.birth_date ? 'text-red-400' : 'text-slate-400'}`} />
            <Input 
              {...register("birth_date", { required: "Birth date is required" })} 
              type="date"
              className={`h-12 pl-10 rounded-xl border-2 transition-all ${errors.birth_date ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`}
            />
          </div>
          {errors.birth_date && <p className="text-red-500 text-[10px] font-black uppercase mt-1 px-1">{errors.birth_date.message as string}</p>}
        </div>
        <div className="space-y-2">
          <Label className={`font-bold text-xs uppercase tracking-widest ${errors.religion ? 'text-red-500' : 'text-slate-700'}`}>Religion *</Label>
          <div className="relative">
            <BookOpen className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.religion ? 'text-red-400' : 'text-slate-400'}`} />
            <Input 
              {...register("religion", { required: "Religion is required" })} 
              placeholder="e.g. Roman Catholic"
              className={`h-12 pl-10 rounded-xl border-2 transition-all ${errors.religion ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`}
            />
          </div>
          {errors.religion && <p className="text-red-500 text-[10px] font-black uppercase mt-1 px-1">{errors.religion.message as string}</p>}
        </div>
      </div>

      {/* Age and Civil Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className={`font-bold text-xs uppercase tracking-widest ${errors.age ? 'text-red-500' : 'text-slate-700'}`}>Age *</Label>
          <Input 
            {...register("age", { 
              required: "Age is required", 
              min: { value: 12, message: "Min age is 12" }, 
              max: { value: 100, message: "Max age is 100" } 
            })} 
            type="number"
            placeholder="16" 
            className={`h-12 rounded-xl border-2 transition-all ${errors.age ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`}
          />
          {errors.age && <p className="text-red-500 text-[10px] font-black uppercase mt-1 px-1">{errors.age.message as string}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-slate-700 font-bold text-xs uppercase tracking-widest">Civil Status *</Label>
          <select 
            {...register("civil_status", { required: true })}
            className="w-full h-12 rounded-xl border-2 border-slate-100 bg-white px-3 font-bold text-sm focus:border-blue-500 outline-none transition-all"
          >
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Widowed">Widowed</option>
            <option value="Separated">Separated</option>
          </select>
        </div>
      </div>

      {/* Gender Selection */}
      <div className="space-y-4">
        <Label className="text-slate-700 font-bold text-xs uppercase tracking-widest">Gender Identity *</Label>
        <RadioGroup 
          defaultValue={formData.gender || "Male"} 
          onValueChange={(value) => setValue("gender", value)}
          className="flex gap-4"
        >
          <div className="flex-1 flex items-center space-x-3 bg-slate-50 px-5 py-4 rounded-2xl border border-slate-100 hover:border-blue-300 cursor-pointer transition-all">
            <RadioGroupItem value="Male" id="male" />
            <Label htmlFor="male" className="cursor-pointer font-bold text-slate-700">Male</Label>
          </div>
          <div className="flex-1 flex items-center space-x-3 bg-slate-50 px-5 py-4 rounded-2xl border border-slate-100 hover:border-blue-300 cursor-pointer transition-all">
            <RadioGroupItem value="Female" id="female" />
            <Label htmlFor="female" className="cursor-pointer font-bold text-slate-700">Female</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Home Address */}
      <div className="space-y-2">
        <Label className={`font-bold text-xs uppercase tracking-widest ${errors.address ? 'text-red-500' : 'text-slate-700'}`}>Home Address *</Label>
        <div className="relative">
          <MapPin className={`absolute left-3 top-3 w-4 h-4 ${errors.address ? 'text-red-400' : 'text-slate-400'}`} />
          <textarea 
            {...register("address", { required: "Home address is required" })} 
            placeholder="House No., Street, Brgy, City, Province"
            className={`w-full min-h-[100px] p-3 pl-10 rounded-xl border-2 transition-all ${errors.address ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-blue-500'} outline-none font-bold text-sm`}
          />
        </div>
        {errors.address && <p className="text-red-500 text-[10px] font-black uppercase mt-1 px-1">{errors.address.message as string}</p>}
      </div>

      {/* Contact Info */}
      <div className="space-y-2">
        <Label className={`font-bold text-xs uppercase tracking-widest ${errors.email ? 'text-red-500' : 'text-slate-700'}`}>Email Address *</Label>
        <Input 
          {...register("email", { 
            required: "Email is required",
            pattern: {
                value: /\S+@\S+\.\S+/,
                message: "Invalid email format"
            }
          })} 
          type="email"
          placeholder="juan@example.com" 
          className={`h-12 rounded-xl border-2 transition-all ${errors.email ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`}
        />
        {errors.email && <p className="text-red-500 text-[10px] font-black uppercase mt-1 px-1">{errors.email.message as string}</p>}
      </div>

      {/* Warning if errors exist */}
      {Object.keys(errors).length > 0 && (
        <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3 text-red-600 animate-pulse">
            <AlertCircle size={18} />
            <p className="text-[10px] font-black uppercase tracking-widest">Matrix Validation Failed: Please complete all required fields.</p>
        </div>
      )}

      <Button type="submit" className="w-full h-16 bg-blue-600 hover:bg-blue-700 rounded-2xl text-lg font-black uppercase tracking-tight gap-3 shadow-xl shadow-blue-200 transition-all active:scale-[0.98]">
        Next: Academic Info <ArrowRight className="w-6 h-6" />
      </Button>
    </form>
  )
}