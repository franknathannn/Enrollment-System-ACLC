"use client"

import { useState, useEffect } from "react"
import { useEnrollmentStore } from "@/store/useEnrollmentStore"
import { EnrollmentFormData } from "@/lib/validators/enrollment"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Loader2, User, ShieldCheck, BadgeCheck,
  FileText, Sparkles, Building2, PartyPopper,
  ChevronLeft, Search, Maximize2, Orbit, Users,
  GraduationCap, AlertCircle, ArrowRight, Globe, Check
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { getEnrollmentStatus } from "@/lib/actions/settings"
import { verifyTurnstile, checkEnrollmentRateLimit } from "@/lib/actions/turnstile"
import { TurnstileWidget } from "@/components/TurnstileWidget"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useThemeStore } from "@/store/useThemeStore"

export default function Step5Review() {
  const { isDark } = useThemeStore()
  const { formData: rawFormData, setStep, resetForm } = useEnrollmentStore()
  const formData = rawFormData as any
  const [loading, setLoading] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileKey, setTurnstileKey] = useState(0)
  const [activeSY, setActiveSY] = useState("...")
  const router = useRouter()
  const isJHS = formData.student_category === "JHS Graduate"

  useEffect(() => {
    const raf = requestAnimationFrame(() => window.scrollTo(0, 0))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    supabase.from('system_config').select('school_year').single().then(({ data }) => { if (data) setActiveSY(data.school_year) })
  }, [])

  const resetTurnstile = () => {
    setTurnstileToken(null)
    setTurnstileKey(k => k + 1)
  }

  const handleFinalSubmit = async () => {
    if (!turnstileToken) {
      const el = document.getElementById("security_gate_container")
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        toast.error("Security Authentication Required", { description: "Please complete the validation protocol below.", duration: 4000 })
      } else {
        toast.error("Please complete the security check first.")
      }
      return
    }
    setLoading(true)
    const toastId = toast.loading(formData.id ? "Syncing corrections..." : "Submitting application...")
    try {
      const allowed = await checkEnrollmentRateLimit()
      if (!allowed) {
        toast.error("Too many submissions. Please wait a few minutes and try again.", { id: toastId })
        resetTurnstile()
        setLoading(false)
        return
      }

      const isHuman = await verifyTurnstile(turnstileToken)
      if (!isHuman) {
        toast.error("Security check failed. Please complete it again.", { id: toastId })
        resetTurnstile()
        setLoading(false)
        return
      }
      const isSystemOpen = await getEnrollmentStatus()
      if (!isSystemOpen && !formData.id) {
        toast.error("Admissions window is currently closed.", { id: toastId })
        resetTurnstile()
        setLoading(false)
        return
      }

      const { data: existingLrn } = await supabase.from('students').select('id').eq('lrn', formData.lrn).neq('id', formData.id || '00000000-0000-0000-0000-000000000000').maybeSingle()
      if (existingLrn) { toast.error("Validation Error: LRN already exists.", { id: toastId }); resetTurnstile(); setLoading(false); return }

      if (formData.email) {
        const { data: existingEmail } = await supabase.from('students').select('id').ilike('email', formData.email.trim()).neq('id', formData.id || '00000000-0000-0000-0000-000000000000').maybeSingle()
        if (existingEmail) { toast.error("Validation Error: Email already registered.", { id: toastId }); resetTurnstile(); setLoading(false); return }
      }

      let nameQuery = supabase.from('students').select('id').ilike('first_name', formData.first_name.trim()).ilike('last_name', formData.last_name.trim()).neq('id', formData.id || '00000000-0000-0000-0000-000000000000')
      if (formData.middle_name?.trim()) nameQuery = nameQuery.ilike('middle_name', formData.middle_name.trim())
      else nameQuery = nameQuery.or('middle_name.is.null,middle_name.eq.""')
      const { data: existingName } = await nameQuery.maybeSingle()
      if (existingName) { toast.error("Validation Error: Student identity already exists.", { id: toastId }); resetTurnstile(); setLoading(false); return }

      const studentData: any = {
        first_name: formData.first_name, middle_name: formData.middle_name, last_name: formData.last_name,
        age: parseInt(formData.age || "0"), nationality: formData.nationality, gender: formData.gender,
        civil_status: formData.civil_status, birth_date: formData.birth_date, religion: formData.religion,
        address: formData.address, email: formData.email, phone: formData.phone, lrn: formData.lrn,
        strand: formData.strand, student_category: formData.student_category, last_school_attended: formData.last_school_attended,
        school_year: activeSY, gwa_grade_10: isJHS ? formData.gwa_grade_10 : null,
        grade_level: (formData as any).grade_level || "11",
        guardian_first_name: formData.guardian_first_name, guardian_middle_name: formData.guardian_middle_name,
        guardian_last_name: formData.guardian_last_name, guardian_phone: formData.guardian_phone,
        form_138_url: isJHS ? formData.form_138_url : null, good_moral_url: isJHS ? formData.good_moral_url : null,
        two_by_two_url: formData.profile_2x2_url, cor_url: !isJHS ? formData.cor_url : null,
        af5_url: !isJHS ? formData.af5_url : null, diploma_url: !isJHS ? formData.diploma_url : null,
        birth_certificate_url: formData.birth_certificate_url, status: 'Pending', updated_at: new Date().toISOString(),
        school_type: formData.school_type || null, year_completed_jhs: formData.year_completed_jhs || null,
        last_school_address: formData.last_school_address || null, facebook_user: formData.facebook_user || null,
        facebook_link: formData.facebook_link || null, preferred_modality: formData.preferred_modality || null,
        preferred_shift: formData.preferred_shift || null,
      }

      const { data, error } = await supabase.from('students').upsert({ ...(formData.id ? { id: formData.id } : {}), ...studentData }, { onConflict: 'lrn' }).select().single()
      if (error) throw error

      const channel = supabase.channel('admin_applicants_realtime')
      channel.subscribe(status => {
        if (status === 'SUBSCRIBED') {
          channel.send({ type: 'broadcast', event: 'student_update', payload: { timestamp: new Date().toISOString() } })
          setTimeout(() => supabase.removeChannel(channel), 2000)
        }
      })

      setLoading(false)
      toast.success("Application Initialized", { id: toastId, icon: <span className="w-5 h-5 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-white"><img src="/logo-aclc.png" className="w-full h-full object-contain" alt="" /></span> })
      setShowCelebration(true)
      setTimeout(() => { 
        resetForm(); 
        router.push(`/enroll/success?id=${data.id}&lrn=${data.lrn}`); 
      }, 3500)
    } catch (error: any) {
      toast.error(error.message, { id: toastId })
      resetTurnstile()
      setLoading(false)
    }
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
          animation: float 14s ease-in-out infinite;
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
            <BadgeCheck className="text-white w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-blue-600/20 text-blue-400 text-[8px] font-black uppercase tracking-[0.2em] border border-blue-500/20">Step 05</span>
              <div className="h-px w-8 bg-blue-500/20" />
              <Sparkles size={10} className="text-blue-400 animate-pulse" />
            </div>
            <h2 className={cn(
              "text-lg sm:text-2xl md:text-3xl font-black tracking-tighter uppercase italic leading-none",
              isDark ? "text-white" : "text-slate-900"
            )}>Final <span className="text-blue-600">Review</span></h2>
          </div>
        </div>

        {/* AUDIT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            <ReviewSection icon={<User size={16} />} title="Student Identity" isDark={isDark} details={[
              { label: "First Name", value: formData.first_name }, { label: "Middle Name", value: formData.middle_name || "N/A" },
              { label: "Last Name", value: formData.last_name }, { label: "Gender", value: formData.gender },
              { label: "Age", value: formData.age ? `${formData.age} yrs old` : null }, { label: "Birth Date", value: formData.birth_date },
              { label: "Civil Status", value: formData.civil_status }, { label: "Nationality", value: formData.nationality },
              { label: "Religion", value: formData.religion }, { label: "Mobile No.", value: formData.phone },
              { label: "Email Address", value: formData.email, fullWidth: true }, { label: "Home Address", value: formData.address, fullWidth: true },
            ]} />
            <ReviewSection icon={<GraduationCap size={16} />} title="Academic Background" isDark={isDark} details={[
              { label: "LRN", value: formData.lrn, fullWidth: true }, { label: "Student Category", value: formData.student_category },
              { label: "Grade Level", value: formData.grade_level ? `Grade ${formData.grade_level}` : null }, { label: "Strand Preference", value: formData.strand },
              { label: "Previous School Type", value: formData.school_type },
              { label: "School Year", value: activeSY }, { label: "Year Completed JHS", value: formData.year_completed_jhs },
              { label: "Last School Attended", value: formData.last_school_attended, fullWidth: true },
              { label: "School Address", value: formData.last_school_address, fullWidth: true },
              ...(isJHS ? [{ label: "Grade 10 GWA", value: formData.gwa_grade_10 ? `${formData.gwa_grade_10}` : "N/A" }] : []),
              { label: "Preferred Modality", value: formData.preferred_modality },
              ...(formData.preferred_modality ? [{ label: "Preferred Shift", value: formData.preferred_shift }] : []),
              { label: "Facebook Username", value: formData.facebook_user }, { label: "Facebook Link", value: formData.facebook_link, fullWidth: true },
            ]} />
            <ReviewSection icon={<Users size={16} />} title="Guardian Information" isDark={isDark} details={[
              { label: "Guardian First Name", value: formData.guardian_first_name }, { label: "Guardian Middle Name", value: formData.guardian_middle_name || "N/A" },
              { label: "Guardian Last Name", value: formData.guardian_last_name }, { label: "Guardian Contact No.", value: formData.guardian_phone },
            ]} />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <div className="space-y-3">
              <Label className="font-black text-slate-500 text-[10px] uppercase tracking-[0.3em] ml-2">Digital Proofs</Label>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                <DocThumbnail label="2x2 Identification" url={formData.profile_2x2_url ?? null} isDark={isDark} />
                <DocThumbnail label="Birth Certificate" url={formData.birth_certificate_url ?? null} isDark={isDark} />
                {isJHS ? (
                  <>
                    <DocThumbnail label="Grade 10 Report Card" url={formData.form_138_url ?? null} isDark={isDark} />
                    <DocThumbnail label="Good Moral" url={formData.good_moral_url ?? null} isDark={isDark} />
                  </>
                ) : (
                  <>
                    <DocThumbnail label="ALS Certificate" url={formData.cor_url ?? null} isDark={isDark} />
                    <DocThumbnail label="ALS Diploma" url={formData.diploma_url ?? null} isDark={isDark} />
                    <DocThumbnail label="AF5 Form" url={formData.af5_url ?? null} isDark={isDark} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AFFIRMATION */}
        <Card className={cn(
          "p-6 sm:p-10 rounded-[40px] border flex flex-col sm:flex-row items-center gap-6 sm:gap-8 shadow-2xl relative overflow-hidden group",
          isDark ? "bg-blue-600/10 border-white/10 text-white" : "bg-white/95 border-blue-100 text-slate-900"
        )}>
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 transition-transform lg:group-hover:scale-125 duration-1000">
            <ShieldCheck size={160} className="text-blue-500" />
          </div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[28px] bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
            <ShieldCheck className="text-white w-8 h-8 sm:w-10 sm:h-10 drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]" />
          </div>
          <div className="space-y-2 relative z-10 text-center sm:text-left">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em]">Official Affirmation</p>
            <p className="text-sm sm:text-base font-black italic leading-relaxed opacity-90 tracking-tight">
              "I hereby verify that all uploaded assets and identity parameters are authentic. Misrepresentation will trigger immediate invalidation of this application."
            </p>
          </div>
        </Card>

        {/* SECURITY GATE */}
        <div id="security_gate_container" className={cn(
          "p-6 rounded-[32px] border flex flex-col md:flex-row items-center justify-center gap-6 relative overflow-hidden",
          isDark ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-xl"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600")}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-0.5 text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Validation Protocol</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Confirm your identity session</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-2 py-1 transform scale-[0.85] sm:scale-100">
            <TurnstileWidget key={turnstileKey} onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} theme="light" />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 left-0 right-0 pt-8 -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 px-4 sm:px-6 md:px-8 lg:px-12 mt-6 flex flex-col gap-3 bg-transparent">
        <div style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }} className="flex flex-col gap-3">
          <Button onClick={handleFinalSubmit} disabled={loading}
            className={cn(
              "w-full min-h-[52px] md:h-16 rounded-[28px]",
              "bg-blue-600 lg:hover:bg-white lg:hover:text-blue-600 text-white",
              "shadow-[0_20px_50px_rgba(59,130,246,0.3)] lg:hover:shadow-blue-600/20",
              "transition-all duration-500 active:scale-[0.98]",
              "flex items-center justify-center gap-4 group touch-manipulation border-2 border-transparent lg:hover:border-blue-600",
              "disabled:opacity-50 disabled:pointer-events-none"
            )}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span className="font-black uppercase text-[10px] sm:text-xs tracking-[0.4em]">
                Submit Enrollment
              </span>
            )}
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center lg:group-hover:bg-blue-600 shrink-0 transition-all duration-500">
              <ArrowRight size={20} className="lg:group-hover:translate-x-1 transition-transform" />
            </div>
          </Button>
          <button type="button" onClick={() => setStep(4)}
            className="min-h-[44px] w-full rounded-xl t-text-muted font-black uppercase text-[9px] sm:text-[10px] tracking-[0.3em] flex items-center justify-center gap-2 lg:hover:text-blue-400 transition-colors py-3 touch-manipulation active:scale-[0.98]">
            <ChevronLeft className="w-4 h-4 shrink-0" /> Edit Documents
          </button>
        </div>
      </div>

      {/* SUCCESS CELEBRATION */}
      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent className={cn("w-[95vw] max-w-xl p-0 overflow-hidden rounded-[48px] shadow-[0_0_100px_rgba(59,130,246,0.3)] border-none", isDark ? "bg-slate-950" : "bg-white")}>
          <DialogHeader className="sr-only"><DialogTitle>Success</DialogTitle><DialogDescription>Application transmitted.</DialogDescription></DialogHeader>
          <div className="p-8 sm:p-16 text-center space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 via-blue-400 to-red-500" />
            <div className="absolute inset-0 bg-blue-600/5 blur-[120px]" />
            <div className="relative z-10">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-10">
                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse" />
                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 rounded-[40px] flex items-center justify-center shadow-2xl relative z-10 rotate-6 transform scale-110">
                  <Check className="text-white w-12 h-12 sm:w-16 sm:h-16" strokeWidth={4} />
                </div>
              </div>
              <h2 className={cn("text-3xl sm:text-5xl font-black uppercase tracking-tighter leading-none italic mb-4", isDark ? "text-white" : "text-slate-900")}>
                IDENTITY <br /> <span className="text-blue-600">VERIFIED</span>
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm font-black uppercase tracking-[0.2em] italic max-w-[300px] mx-auto leading-relaxed">
                Your credentials have been encrypted and transmitted to the Admissions Vanguard.
              </p>
            </div>
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="flex items-center gap-3 text-blue-500">
                <Orbit className="animate-spin w-5 h-5" style={{ animationDuration: '3s' }} />
                <span className="text-[10px] font-black uppercase tracking-[0.5em]">Establishing Academic Profile</span>
              </div>
              <div className="w-48 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 animate-loading-bar" style={{ width: '40%' }} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReviewSection({ icon, title, details, isDark }: any) {
  return (
    <Card className={cn(
      "p-6 sm:p-8 rounded-[40px] border w-full overflow-hidden transition-all duration-500 group relative",
      isDark ? "border-white/5 bg-white/[0.02] lg:hover:bg-white/[0.04]" : "border-slate-100 bg-white shadow-xl lg:hover:shadow-blue-500/5"
    )}>
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/40 via-blue-500/10 to-transparent" />
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-[18px] bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
          {icon}
        </div>
        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] italic">{title}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
        {details.filter((d: any) => d.value !== null).map((d: any, i: number) => (
          <div key={i} className={cn("space-y-1 group/item transition-all", d.fullWidth ? 'sm:col-span-2' : '')}>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest opacity-60 group-hover/item:text-blue-400 transition-colors">{d.label}</p>
            <p className={cn("text-xs font-black uppercase leading-relaxed break-words tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {d.value || "—"}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}

function DocThumbnail({ label, url, isDark }: { label: string; url: string | null; isDark: boolean }) {
  if (!url) return null
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className={cn(
          "group relative aspect-video rounded-[32px] overflow-hidden border-2 cursor-pointer transition-all duration-500 shadow-xl",
          isDark ? "bg-slate-950 border-white/5 lg:hover:border-blue-500/50" : "bg-white border-slate-100 lg:hover:border-blue-300"
        )}>
          <img src={url} className="w-full h-full object-cover opacity-60 lg:group-hover:opacity-100 transition-all duration-700 lg:group-hover:scale-110" alt={label} loading="lazy" />
          <div className="absolute inset-0 bg-blue-600/20 opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-2xl scale-0 group-hover:scale-100 transition-transform duration-500">
              <Maximize2 className="text-blue-600 w-5 h-5" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
            <p className="text-[8px] font-black text-white uppercase tracking-widest text-center truncate">{label}</p>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className={cn("w-[95vw] max-w-4xl p-0 overflow-hidden rounded-[48px] border-none shadow-[0_0_100px_rgba(59,130,246,0.3)]", isDark ? "bg-slate-950/90 text-white" : "bg-white text-slate-900")}>
        <div className="p-4 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black uppercase tracking-[0.3em] text-blue-500 text-sm italic">{label}</h3>
          </div>
          <div className="relative overflow-hidden rounded-[40px] border-4 border-white/10 shadow-2xl bg-slate-900">
            <img src={url} className="w-full max-h-[70dvh] object-contain" alt="Preview" loading="lazy" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
