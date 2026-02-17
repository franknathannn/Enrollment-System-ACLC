"use client"

import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useEnrollmentStore } from "@/store/useEnrollmentStore"
import { EnrollmentFormData } from "@/lib/validators/enrollment"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup } from "@/components/ui/radio-group"
import { ArrowRight, User, Calendar, BookOpen, MapPin, Heart, ChevronDown, Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useEnrollmentValidation } from "@/hooks/useEnrollmentValidation"
import { supabase } from "@/lib/supabase/client"

export default function Step1Identity() {
  const [isMounted, setIsMounted] = useState(false)
  const { formData, updateFormData, setStep } = useEnrollmentStore()
  const headerCanvasRef = useRef<HTMLCanvasElement>(null)
  const { isFieldRequired, isFieldEditable } = useEnrollmentValidation()
  const [checking, setChecking] = useState(false)
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<EnrollmentFormData>({ 
    defaultValues: {
      first_name: formData.first_name || "",
      middle_name: formData.middle_name || "",
      last_name: formData.last_name || "",
      nationality: (formData as any).nationality || "",
      email: formData.email || "",
      age: formData.age || "",
      gender: (formData.gender as "Male" | "Female") || undefined, 
      civil_status: formData.civil_status || "Single",
      birth_date: formData.birth_date || "",
      religion: formData.religion || "",
      address: formData.address || ""
    } 
  })

  const selectedGender = watch("gender")
  const allValues = watch();

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // --- LOCALIZED HEADER CONSTELLATION ENGINE ---
  // useEffect(() => {
  //   const canvas = headerCanvasRef.current;
  //   if (!canvas) return;
  //   const ctx = canvas.getContext("2d");
  //   if (!ctx) return;

  //   let particles: { x: number; y: number; vx: number; vy: number; size: number }[] = [];
  //   const mouse = { x: -1000, y: -1000 };

  //   const init = () => {
  //     canvas.width = canvas.offsetWidth;
  //     canvas.height = canvas.offsetHeight;
  //     particles = [];
  //     for (let i = 0; i < 40; i++) {
  //       particles.push({
  //         x: Math.random() * canvas.width,
  //         y: Math.random() * canvas.height,
  //         vx: (Math.random() - 0.5) * 0.4,
  //         vy: (Math.random() - 0.5) * 0.4,
  //         size: Math.random() * 2 + 0.5
  //       });
  //     }
  //   };

  //   const animate = () => {
  //     ctx.clearRect(0, 0, canvas.width, canvas.height);
  //     ctx.fillStyle = "rgba(59, 130, 246, 0.4)"; 
      
  //     particles.forEach((p) => {
  //       p.x += p.vx; p.y += p.vy;
  //       if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
  //       if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
  //       ctx.beginPath();
  //       ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
  //       ctx.fill();

  //       const dx = mouse.x - p.x;
  //       const dy = mouse.y - p.y;
  //       const dist = Math.sqrt(dx * dx + dy * dy);
  //       if (dist < 120) {
  //         ctx.beginPath();
  //         ctx.lineWidth = 0.8;
  //         ctx.strokeStyle = `rgba(59, 130, 246, ${1 - dist / 120})`;
  //         ctx.moveTo(p.x, p.y);
  //         ctx.lineTo(mouse.x, mouse.y);
  //         ctx.stroke();
  //       }
  //     });
  //     requestAnimationFrame(animate);
  //   };

  //   const handleMouseMove = (e: MouseEvent) => {
  //     const rect = canvas.getBoundingClientRect();
  //     mouse.x = e.clientX - rect.left;
  //     mouse.y = e.clientY - rect.top;
  //   };

  //   window.addEventListener("resize", init);
  //   canvas.addEventListener("mousemove", handleMouseMove);
  //   init(); animate();

  //   return () => {
  //     window.removeEventListener("resize", init);
  //     canvas.removeEventListener("mousemove", handleMouseMove);
  //   };
  // }, []);

  const onSubmit = async (data: any) => {
    if (!data.gender) {
      toast.error("Protocol Error: Selection required.")
      return
    }

    setChecking(true)
    try {
      // 1. Check for duplicate Email
      if (data.email) {
        const { data: existingEmail } = await supabase
          .from('students')
          .select('id')
          .ilike('email', data.email.trim())
          .neq('id', formData.id || '00000000-0000-0000-0000-000000000000') // Exclude self if editing
          .maybeSingle()

        if (existingEmail) {
          toast.error("Email address is already registered in the system.")
          setChecking(false)
          return
        }
      }

      // 2. Check for duplicate Name Combination (First + Middle + Last)
      let nameQuery = supabase
        .from('students')
        .select('id')
        .ilike('first_name', data.first_name.trim())
        .ilike('last_name', data.last_name.trim())
        .neq('id', formData.id || '00000000-0000-0000-0000-000000000000')

      if (data.middle_name && data.middle_name.trim()) {
        nameQuery = nameQuery.ilike('middle_name', data.middle_name.trim())
      } else {
        // If middle name is empty in form, check for NULL or empty in DB
        nameQuery = nameQuery.or('middle_name.is.null,middle_name.eq.""')
      }

      const { data: existingName } = await nameQuery.maybeSingle()

      if (existingName) {
        toast.error("Student identity already exists (Same First, Middle, and Last Name).")
        setChecking(false)
        return
      }

      updateFormData(data)
      setStep(2)
      toast.success("Identity Verified & Submitted")
    } catch (error) {
      console.error("Validation check failed:", error)
      toast.error("System validation failed. Please try again.")
    } finally {
      setChecking(false)
    }
  }

  // UPDATED: Muted darker highlights + Intense Glow Tracer on Focus
  const getFieldClassName = (fieldName: string, isTextArea = false) => {
    const value = (allValues as any)[fieldName];
    const hasError = (errors as any)[fieldName];
    const isNotEmpty = value && value.toString().trim() !== "";

    return cn(
      isTextArea ? "w-full min-h-[120px] p-4 pl-12" : "h-11 md:h-12 rounded-xl",
      "border-2 transition-all duration-300 font-medium outline-none text-white text-xs md:text-sm",
      // THE GLOW TRACER: Sharp blue border + pulsating shadow on focus
      "focus:border-blue-500 focus:shadow-[0_0_20px_rgba(59,130,246,0.3)] focus:bg-slate-900/80",
      hasError 
        ? "border-red-900/50 bg-red-950/30" 
        : isNotEmpty 
          ? "border-blue-900/40 bg-slate-950/60 text-blue-100" // DARKER MUTED HIGHLIGHT
          : "border-white/5 bg-white/5"
    );
  };

  const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>, field: any, allowNumbers = false) => {
    let val = e.target.value;
    if (!allowNumbers) val = val.replace(/[0-9]/g, '');
    // Auto-capitalize first letter of each word
    if (val.length > 0) {
       val = val.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
    setValue(field, val);
  };

  if (!isMounted) return null

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      
      {/* SECTION HEADER */}
      <div className="bg-blue-600/10 rounded-[32px] p-6 border border-blue-500/20 text-white flex items-center gap-5 shadow-2xl relative overflow-hidden group">
        {/*<canvas ref={headerCanvasRef} className="absolute inset-0 pointer-events-auto z-0" />*/}
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 relative z-10 shadow-lg shadow-blue-500/20">
          <User className="text-white w-7 h-7" />
        </div>
        <div className="relative z-10">
          <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-blue-400 mb-1">Step 01</p>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight uppercase italic text-white leading-none">Personal Identity</h2>
        </div>
      </div>

      {/* NAME MATRIX */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {["first_name", "middle_name", "last_name"].map((field) => {
          const required = isFieldRequired(field as any)
          const editable = isFieldEditable(field as any)
          return (
            <div key={field} className="space-y-2">
              <Label className="font-bold text-[10px] uppercase tracking-[0.3em] text-slate-500 ml-2">
                {field.replace('_', ' ')} {required && <span className="text-red-500">*</span>}
              </Label>
              <Input 
                {...register(field as any, { 
                  required,
                  onChange: (e) => {
                    // Apply name formatting logic
                    handleNameInput(e, field, field === 'middle_name');
                  }
                })} 
                disabled={!editable}
                placeholder={
                  field === "first_name" ? "Juan" : 
                  field === "middle_name" ? "Protacio" : "Dela Cruz"
                } 
                className={cn(getFieldClassName(field), !editable && "opacity-50 cursor-not-allowed")} 
              />
            </div>
          )
        })}
      </div>

      {/* NATIONALITY */}
      <div className="space-y-2">
        <Label className="font-bold text-[10px] uppercase tracking-[0.3em] text-slate-500 ml-2">
          Nationality {isFieldRequired("nationality") && <span className="text-red-500">*</span>}
        </Label>
        <Input 
          {...register("nationality", { required: isFieldRequired("nationality") })} 
          placeholder="Filipino" 
          disabled={!isFieldEditable("nationality")}
          className={cn(getFieldClassName("nationality"), !isFieldEditable("nationality") && "opacity-50 cursor-not-allowed")} 
        />
      </div>

      {/* GENDER SELECTION */}
      <div className="space-y-4">
        <Label className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] ml-2 text-center block">
          Gender {isFieldRequired("gender") && <span className="text-red-500">*</span>}
        </Label>
        <div className="flex flex-col sm:flex-row gap-5">
          
          <button
            type="button"
            onClick={() => { setValue("gender", "Male"); updateFormData({ gender: "Male" }); }}
            disabled={!isFieldEditable("gender")}
            className={cn(
              "flex-1 flex items-center justify-between px-8 py-6 rounded-[32px] border-2 transition-all duration-500 active:scale-[0.95] relative overflow-hidden",
              selectedGender === "Male" 
                ? "border-blue-900/80 bg-blue-900/40 text-white shadow-[0_0_25px_rgba(30,58,138,0.3)]" 
                : "bg-white/5 border-white/5 text-slate-500 hover:border-white/10",
              !isFieldEditable("gender") && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="flex items-center gap-4 relative z-10">
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                selectedGender === 'Male' ? "border-blue-400 bg-blue-400/20" : "border-slate-700"
              )}>
                {selectedGender === 'Male' && <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
              </div>
              <span className="font-bold uppercase text-xs tracking-[0.2em]">Male</span>
            </div>
            <User size={22} className={cn("relative z-10", selectedGender === 'Male' ? "text-blue-400" : "text-slate-700")} />
          </button>

          <button
            type="button"
            onClick={() => { setValue("gender", "Female"); updateFormData({ gender: "Female" }); }}
            disabled={!isFieldEditable("gender")}
            className={cn(
              "flex-1 flex items-center justify-between px-8 py-6 rounded-[32px] border-2 transition-all duration-500 active:scale-[0.95] relative overflow-hidden",
              selectedGender === "Female" 
                ? "border-pink-900/80 bg-pink-900/30 text-white shadow-[0_0_25px_rgba(157,23,77,0.2)]" 
                : "bg-white/5 border-white/5 text-slate-500 hover:border-white/10",
              !isFieldEditable("gender") && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="flex items-center gap-4 relative z-10">
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                selectedGender === 'Female' ? "border-pink-400 bg-pink-400/20" : "border-slate-700"
              )}>
                {selectedGender === 'Female' && <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />}
              </div>
              <span className="font-bold uppercase text-xs tracking-[0.2em]">Female</span>
            </div>
            <User size={22} className={cn("relative z-10", selectedGender === 'Female' ? "text-pink-400" : "text-slate-700")} />
          </button>

        </div>
      </div>

      {/* BIRTHDATE & RELIGION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="font-bold text-[10px] uppercase tracking-[0.3em] text-slate-500 ml-2">
            Birth Date {isFieldRequired("birth_date") && <span className="text-red-500">*</span>}
          </Label>
          <div className="relative group">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700 transition-colors group-focus-within:text-blue-400" />
            <Input 
              {...register("birth_date", { required: isFieldRequired("birth_date") })} 
              type="date" 
              disabled={!isFieldEditable("birth_date")}
              className={cn("pl-12 [color-scheme:dark]", getFieldClassName("birth_date"), !isFieldEditable("birth_date") && "opacity-50 cursor-not-allowed")} 
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="font-bold text-[10px] uppercase tracking-[0.3em] text-slate-500 ml-2">
            Religion {isFieldRequired("religion") && <span className="text-red-500">*</span>}
          </Label>
          <div className="relative group">
            <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700 transition-colors group-focus-within:text-blue-400" />
            <Input 
              {...register("religion", { required: isFieldRequired("religion") })} 
              placeholder="..." 
              disabled={!isFieldEditable("religion")}
              className={cn("pl-12", getFieldClassName("religion"), !isFieldEditable("religion") && "opacity-50 cursor-not-allowed")} 
            />
          </div>
        </div>
      </div>

      {/* AGE & CIVIL STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="font-bold text-[10px] uppercase tracking-[0.3em] text-slate-500 ml-2">
            Age {isFieldRequired("age") && <span className="text-red-500">*</span>}
          </Label>
          <Input 
            {...register("age", { required: isFieldRequired("age"), min: 12 })} 
            type="number" 
            placeholder="18" 
            disabled={!isFieldEditable("age")}
            className={cn(getFieldClassName("age"), !isFieldEditable("age") && "opacity-50 cursor-not-allowed")} 
          />
        </div>
        <div className="space-y-2">
          <Label className="font-bold text-[10px] uppercase tracking-[0.3em] text-slate-500 ml-2">
            CIVIL STATUS {isFieldRequired("civil_status") && <span className="text-red-500">*</span>}
          </Label>
          <div className="relative group">
            <Heart className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700 transition-colors group-focus-within:text-blue-400" />
            <select 
              {...register("civil_status", { required: isFieldRequired("civil_status") })}
              disabled={!isFieldEditable("civil_status")}
              className={cn("pl-12 pr-10 appearance-none cursor-pointer w-full text-white", getFieldClassName("civil_status"), !isFieldEditable("civil_status") && "opacity-50 cursor-not-allowed")}
            >
              <option value="Single" className="bg-slate-950">Single</option>
              <option value="Married" className="bg-slate-950">Married</option>
              <option value="Separated" className="bg-slate-950">Separated</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ADDRESS & EMAIL */}
      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="font-bold text-[10px] uppercase tracking-[0.3em] text-slate-500 ml-2">
            Home Address {isFieldRequired("address") && <span className="text-red-500">*</span>}
          </Label>
          <div className="relative group">
            <MapPin className="absolute left-4 top-5 w-4 h-4 text-blue-700 transition-colors group-focus-within:text-blue-400" />
            <textarea 
              {...register("address", { required: isFieldRequired("address") })} 
              placeholder="2049 Alonzo St, Tondo Manila" 
              disabled={!isFieldEditable("address")}
              className={cn(getFieldClassName("address", true), !isFieldEditable("address") && "opacity-50 cursor-not-allowed")} 
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="font-bold text-[10px] uppercase tracking-[0.3em] text-slate-500 ml-2">
            Email {isFieldRequired("email") && <span className="text-red-500">*</span>}
          </Label>
          <Input 
            {...register("email", { required: isFieldRequired("email") })} 
            type="email" 
            placeholder="Student@gmail.com" 
            disabled={!isFieldEditable("email")}
            className={cn(getFieldClassName("email"), !isFieldEditable("email") && "opacity-50 cursor-not-allowed")} 
          />
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="pt-10">
        <Button 
          type="submit" 
          disabled={checking}
          className="w-full h-14 md:h-16 rounded-[28px] bg-blue-600 hover:bg-white hover:text-blue-600 text-white shadow-[0_20px_40px_rgba(0,0,0,0.3)] transition-all duration-500 active:scale-95 flex items-center justify-center gap-4 group"
        >
          {checking ? (
            <><Loader2 className="animate-spin" /> Verifying Identity...</>
          ) : (
            <>
              <span className="font-bold uppercase text-xs tracking-[0.4em] ml-4 text-white group-hover:text-blue-600">Proceed To Step 02</span>
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-all">
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </>
          )}
        </Button>
      </div>
    </form>
  )
}