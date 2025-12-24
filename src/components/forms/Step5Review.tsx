"use client"

import { useState, useEffect } from "react"
import { useEnrollmentStore } from "@/store/useEnrollmentStore"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  Loader2, User, BookOpen, ShieldCheck, BadgeCheck, 
  MapPin, Phone, Mail, FileText, Sparkles, Building2, PartyPopper
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { getEnrollmentStatus } from "@/lib/actions/settings" 
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export default function Step5Review() {
  const { formData, setStep, resetForm } = useEnrollmentStore()
  const [loading, setLoading] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [activeSY, setActiveSY] = useState("...")
  const router = useRouter()

  const isJHS = formData.student_category === "JHS Graduate"

  useEffect(() => {
    async function getSY() {
      const { data } = await supabase.from('system_config').select('school_year').single()
      if (data) setActiveSY(data.school_year)
    }
    getSY()
  }, [])

  const handleFinalSubmit = async () => {
    setLoading(true)
    const toastId = toast.loading(formData.id ? "Syncing corrections..." : "Transmitting application...")

    try {
      const isSystemOpen = await getEnrollmentStatus()
      
      if (!isSystemOpen && !formData.id) {
        toast.error("Admissions window is currently closed.", { id: toastId })
        return
      }

      const studentData: any = {
        first_name: formData.first_name,
        middle_name: formData.middle_name,
        last_name: formData.last_name,
        age: parseInt(formData.age || "0"),
        gender: formData.gender,
        civil_status: formData.civil_status,
        birth_date: formData.birth_date,
        religion: formData.religion,
        address: formData.address,
        email: formData.email,
        phone: formData.phone,
        lrn: formData.lrn,
        strand: formData.strand,
        student_category: formData.student_category,
        last_school_attended: formData.last_school_attended,
        school_year: activeSY,
        gwa_grade_10: isJHS ? formData.gwa_grade_10 : null,
        guardian_first_name: formData.guardian_first_name,
        guardian_middle_name: formData.guardian_middle_name,
        guardian_last_name: formData.guardian_last_name,
        guardian_phone: formData.guardian_phone,
        form_138_url: isJHS ? formData.form_138_url : null,
        good_moral_url: isJHS ? formData.good_moral_url : null,
        two_by_two_url: formData.profile_2x2_url || (formData as any).two_by_two_url,
        cor_url: !isJHS ? formData.cor_url : null,
        af5_url: !isJHS ? formData.af5_url : null,
        diploma_url: !isJHS ? formData.diploma_url : null,
        status: 'Pending'
      }

      if (formData.id) {
        studentData.updated_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('students')
        .upsert({
          ...(formData.id ? { id: formData.id } : {}),
          ...studentData
        }, { onConflict: 'lrn' })

      if (error) throw error

      toast.success("Identity Indexed Successfully", { id: toastId })
      setShowCelebration(true)
      
      setTimeout(() => {
        const queryParams = new URLSearchParams({
          name: formData.first_name || "",
          lrn: formData.lrn || "",
          strand: formData.strand || ""
        }).toString()
        
        resetForm()
        router.push(`/enroll/success?${queryParams}`)
      }, 3500)

    } catch (error: any) {
      console.error("Submission Error:", error.message)
      toast.error(`Error: ${error.message}`, { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
          <BadgeCheck size={28} />
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase leading-none">Review Matrix</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
             {formData.id ? "Validating Corrections" : "Final data verification before intake"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <ReviewSection 
          icon={<User className="text-blue-500" />} 
          title="Student Identity" 
          details={[
            { label: "Full Name", value: `${formData.first_name} ${formData.middle_name} ${formData.last_name}` },
            { label: "Personal", value: `${formData.gender} | ${formData.age} yrs | ${formData.civil_status}` },
            { label: "Religion", value: formData.religion || "—" },
            { label: "Birthdate", value: formData.birth_date || "—" }
          ]}
        />

        <ReviewSection 
          icon={<MapPin className="text-red-500" />} 
          title="Home Address" 
          details={[{ label: "Residence", value: formData.address || "—" }]}
        />

        <ReviewSection 
          icon={<Phone className="text-emerald-500" />} 
          title="Contact Hub" 
          details={[
            { label: "Email", value: formData.email || "—" },
            { label: "Phone", value: formData.phone || "—" },
            { label: "Guardian", value: `${formData.guardian_first_name} ${formData.guardian_last_name} (${formData.guardian_phone})` }
          ]}
        />

        <ReviewSection 
          icon={<BookOpen className="text-orange-500" />} 
          title="Academic Placement" 
          details={[
            { label: "Strand", value: `${formData.strand} (S.Y. ${activeSY})` },
            { label: "Category", value: formData.student_category || "—" }
          ]}
        />
      </div>

      <div className="p-6 bg-slate-900 rounded-[32px] text-white flex gap-4 shadow-2xl">
        <ShieldCheck className="text-blue-400 shrink-0" size={24} />
        <div className="space-y-1">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Digital Affirmation</p>
          <p className="text-xs font-medium leading-relaxed opacity-80 italic">
            I certify that all information provided is true and accurate. misrepresentation will result in invalidation.
          </p>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button 
          variant="ghost" 
          onClick={() => setStep(4)} 
          className="h-16 px-10 rounded-[24px] font-black uppercase text-[10px] tracking-widest text-slate-400"
        >
          Modify
        </Button>
        <Button 
          onClick={handleFinalSubmit} 
          disabled={loading}
          className="flex-1 h-16 bg-blue-600 hover:bg-blue-700 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-100 transition-all active:scale-95 flex gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : <><Sparkles size={18}/> {formData.id ? "Update Application" : "Complete Enrollment"}</>}
        </Button>
      </div>

      {/* --- SUCCESS CELEBRATION POPUP --- */}
      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-[48px] border-none shadow-2xl animate-in zoom-in-95 duration-500">
          
          {/* FIX: Accessibility components added here */}
          <DialogHeader className="sr-only">
            <DialogTitle>Enrollment Complete</DialogTitle>
            <DialogDescription>Your application has been received successfully.</DialogDescription>
          </DialogHeader>

          <div className="bg-slate-900 p-10 text-center space-y-6 relative">
            <div className="absolute inset-0 bg-blue-600/10 blur-3xl" />
            <div className="relative z-10">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3">
                <Building2 className="text-white" size={40} />
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                Welcome to <br /> <span className="text-blue-500">ACLC Northbay</span>
              </h2>
              <p className="text-slate-400 font-medium italic mt-4">
                "Our school is a place for innovators, dreamers, and future leaders. Your journey starts now."
              </p>
            </div>
            <div className="relative z-10 flex justify-center gap-2">
               <PartyPopper className="text-amber-400 animate-bounce" />
               <p className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Processing Entry...</p>
               <PartyPopper className="text-amber-400 animate-bounce" style={{animationDelay: '0.2s'}} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReviewSection({ icon, title, details }: { icon: any, title: string, details: { label: string, value: string }[] }) {
  return (
    <Card className="p-6 rounded-[32px] border-slate-100 shadow-none bg-slate-50/50 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">{icon}</div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {details.map((d, i) => (
          <div key={i} className="space-y-1">
            <p className="text-[9px] font-bold text-slate-300 uppercase">{d.label}</p>
            <p className="text-sm font-black text-slate-900 leading-tight">{d.value || "—"}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}