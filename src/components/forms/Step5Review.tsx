"use client"

import { useState, useEffect } from "react"
import { useEnrollmentStore } from "@/store/useEnrollmentStore"
import { EnrollmentFormData } from "@/lib/validators/enrollment"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Loader2, User, ShieldCheck, BadgeCheck,
  FileText, Sparkles, Building2, PartyPopper,
  ChevronLeft, Search, Maximize2, Orbit, Users,
  GraduationCap, AlertCircle
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { getEnrollmentStatus } from "@/lib/actions/settings"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useThemeStore } from "@/store/useThemeStore"

export default function Step5Review() {
  const [isMounted, setIsMounted] = useState(false)
  const { isDark } = useThemeStore()
  const { formData: rawFormData, setStep, resetForm } = useEnrollmentStore()
  const formData = rawFormData as any
  const [loading, setLoading] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [activeSY, setActiveSY] = useState("...")
  const router = useRouter()
  const isJHS = formData.student_category === "JHS Graduate"

  useEffect(() => { window.scrollTo(0, 0); setIsMounted(true) }, [])
  useEffect(() => {
    supabase.from('system_config').select('school_year').single().then(({ data }) => { if (data) setActiveSY(data.school_year) })
  }, [])

  const handleFinalSubmit = async () => {
    setLoading(true)
    const toastId = toast.loading(formData.id ? "Syncing corrections..." : "Transmitting application...")
    try {
      const isSystemOpen = await getEnrollmentStatus()
      if (!isSystemOpen && !formData.id) { toast.error("Admissions window is currently closed.", { id: toastId }); return }

      const { data: existingLrn } = await supabase.from('students').select('id').eq('lrn', formData.lrn).neq('id', formData.id || '00000000-0000-0000-0000-000000000000').maybeSingle()
      if (existingLrn) { toast.error("Validation Error: LRN already exists.", { id: toastId }); setLoading(false); return }

      if (formData.email) {
        const { data: existingEmail } = await supabase.from('students').select('id').ilike('email', formData.email.trim()).neq('id', formData.id || '00000000-0000-0000-0000-000000000000').maybeSingle()
        if (existingEmail) { toast.error("Validation Error: Email already registered.", { id: toastId }); setLoading(false); return }
      }

      let nameQuery = supabase.from('students').select('id').ilike('first_name', formData.first_name.trim()).ilike('last_name', formData.last_name.trim()).neq('id', formData.id || '00000000-0000-0000-0000-000000000000')
      if (formData.middle_name?.trim()) nameQuery = nameQuery.ilike('middle_name', formData.middle_name.trim())
      else nameQuery = nameQuery.or('middle_name.is.null,middle_name.eq.""')
      const { data: existingName } = await nameQuery.maybeSingle()
      if (existingName) { toast.error("Validation Error: Student identity already exists.", { id: toastId }); setLoading(false); return }

      const studentData: any = {
        first_name: formData.first_name, middle_name: formData.middle_name, last_name: formData.last_name,
        age: parseInt(formData.age || "0"), nationality: formData.nationality, gender: formData.gender,
        civil_status: formData.civil_status, birth_date: formData.birth_date, religion: formData.religion,
        address: formData.address, email: formData.email, phone: formData.phone, lrn: formData.lrn,
        strand: formData.strand, student_category: formData.student_category, last_school_attended: formData.last_school_attended,
        school_year: activeSY, gwa_grade_10: isJHS ? formData.gwa_grade_10 : null,
        guardian_first_name: formData.guardian_first_name, guardian_middle_name: formData.guardian_middle_name,
        guardian_last_name: formData.guardian_last_name, guardian_phone: formData.guardian_phone,
        form_138_url: isJHS ? formData.form_138_url : null, good_moral_url: isJHS ? formData.good_moral_url : null,
        two_by_two_url: formData.profile_2x2_url, cor_url: !isJHS ? formData.cor_url : null,
        af5_url: !isJHS ? formData.af5_url : null, diploma_url: !isJHS ? formData.diploma_url : null,
        birth_certificate_url: formData.birth_certificate_url, status: 'Pending', updated_at: new Date().toISOString(),
        school_type: formData.school_type || null, year_completed_jhs: formData.year_completed_jhs || null,
        last_school_address: formData.last_school_address || null, facebook_user: formData.facebook_user || null,
        facebook_link: formData.facebook_link || null, preferred_modality: formData.preferred_modality || null,
        preferred_shift: formData.preferred_modality === "Face to Face" ? (formData.preferred_shift || null) : null,
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

      toast.success("Identity Indexed Successfully", { id: toastId })
      setShowCelebration(true)
      setTimeout(() => {
        const queryParams = new URLSearchParams({ lrn: formData.lrn || "", id: data?.id || "" }).toString()
        resetForm(); router.push(`/enroll/success?${queryParams}`)
      }, 3500)
    } catch (error: any) {
      toast.error(`Error: ${error.message}`, { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  if (!isMounted) return null

  return (
    <div className="max-w-6xl mx-auto w-full lg:animate-in lg:fade-in lg:duration-700">
      <div className="space-y-4 sm:space-y-6 pb-[140px] min-[480px]:pb-[160px]">

        {/* HEADER */}
        <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b pb-4 sm:pb-6 relative overflow-hidden group rounded-2xl sm:rounded-[32px] p-4 sm:p-6 transition-colors duration-300", isDark ? "bg-blue-600/5 border-white/5" : "bg-white border-slate-200")}>
          <div className="flex items-center gap-3 sm:gap-5 relative z-10 min-w-0">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-blue-600 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <BadgeCheck size={22} className="sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0">
              <h2 className={cn("text-base sm:text-2xl md:text-3xl font-bold tracking-tighter uppercase italic leading-tight", isDark ? "text-white" : "text-slate-900")}>Review Information</h2>
              <p className="text-blue-400 text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.25em] sm:tracking-[0.4em] mt-0.5 sm:mt-2">Step 05 • Final Verification</p>
            </div>
          </div>
          <div className={cn("px-3 py-1.5 sm:py-2 rounded-full border font-bold text-[8px] sm:text-[9px] uppercase tracking-widest relative z-10 shrink-0 self-start sm:self-auto", isDark ? "bg-white/5 border-white/10 text-white" : "bg-slate-100 border-slate-200 text-slate-700")}>
            S.Y. {activeSY}
          </div>
        </div>

        {/* ALERT */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-300/80 font-medium leading-relaxed">Review all information carefully before submitting. Incorrect data may cause delays.</p>
        </div>

        {/* REVIEW GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            <ReviewSection icon={<User className="text-blue-400" size={16} />} title="Personal Identity" isDark={isDark} details={[
              { label: "First Name", value: formData.first_name }, { label: "Middle Name", value: formData.middle_name || "N/A" },
              { label: "Last Name", value: formData.last_name }, { label: "Gender", value: formData.gender },
              { label: "Age", value: formData.age ? `${formData.age} yrs old` : null }, { label: "Birth Date", value: formData.birth_date },
              { label: "Civil Status", value: formData.civil_status }, { label: "Nationality", value: formData.nationality },
              { label: "Religion", value: formData.religion }, { label: "Mobile No.", value: formData.phone },
              { label: "Email Address", value: formData.email, fullWidth: true }, { label: "Home Address", value: formData.address, fullWidth: true },
            ]} />
            <ReviewSection icon={<GraduationCap className="text-blue-400" size={16} />} title="Academic Background" isDark={isDark} details={[
              { label: "LRN", value: formData.lrn, fullWidth: true }, { label: "Student Category", value: formData.student_category },
              { label: "Strand Preference", value: formData.strand }, { label: "Previous School Type", value: formData.school_type },
              { label: "School Year", value: activeSY }, { label: "Year Completed JHS", value: formData.year_completed_jhs },
              { label: "Last School Attended", value: formData.last_school_attended, fullWidth: true },
              { label: "School Address", value: formData.last_school_address, fullWidth: true },
              ...(isJHS ? [{ label: "Grade 10 GWA", value: formData.gwa_grade_10 ? `${formData.gwa_grade_10}` : "N/A" }] : []),
              { label: "Preferred Modality", value: formData.preferred_modality },
              ...(formData.preferred_modality === "Face to Face" ? [{ label: "Preferred Shift", value: formData.preferred_shift }] : []),
              { label: "Facebook Username", value: formData.facebook_user }, { label: "Facebook Link", value: formData.facebook_link, fullWidth: true },
            ]} />
            <ReviewSection icon={<Users className="text-blue-400" size={16} />} title="Guardian Information" isDark={isDark} details={[
              { label: "Guardian First Name", value: formData.guardian_first_name }, { label: "Guardian Middle Name", value: formData.guardian_middle_name || "N/A" },
              { label: "Guardian Last Name", value: formData.guardian_last_name }, { label: "Guardian Contact No.", value: formData.guardian_phone },
            ]} />
          </div>
          <div className="lg:col-span-1 space-y-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] ml-2">Verification Assets</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-2 gap-3">
              <DocThumbnail label="2x2 ID"     url={formData.profile_2x2_url       ?? null} isDark={isDark} />
              <DocThumbnail label="Birth Cert" url={formData.birth_certificate_url ?? null} isDark={isDark} />
              {isJHS ? (
                <><DocThumbnail label="Form 138"   url={formData.form_138_url   ?? null} isDark={isDark} /><DocThumbnail label="Good Moral" url={formData.good_moral_url ?? null} isDark={isDark} /></>
              ) : (
                <><DocThumbnail label="ALS COR" url={formData.cor_url ?? null} isDark={isDark} /><DocThumbnail label="Diploma" url={formData.diploma_url ?? null} isDark={isDark} /><DocThumbnail label="AF5" url={formData.af5_url ?? null} isDark={isDark} /></>
              )}
            </div>
          </div>
        </div>

        {/* AFFIRMATION */}
        <Card className={cn("p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[32px] border flex flex-col sm:flex-row gap-4 sm:gap-6 shadow-2xl relative overflow-hidden group", isDark ? "bg-blue-600/10 border-blue-500/20 text-white" : "bg-white border-blue-100 text-slate-900")}>
          <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-5 rotate-12 transition-transform lg:group-hover:scale-125 duration-700">
            <ShieldCheck size={80} className="sm:w-[120px] sm:h-[120px] text-blue-400" />
          </div>
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg">
            <ShieldCheck className="text-white w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          <div className="space-y-1 relative z-10 min-w-0">
            <p className="text-[9px] sm:text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em] sm:tracking-[0.4em]">Upon Submission</p>
            <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-90 italic">"I hereby verify that all uploaded assets and data are authentic. Misrepresentation will trigger immediate invalidation."</p>
          </div>
        </Card>
      </div>

      {/* STICKY BOTTOM BAR */}
      <div className="sticky bottom-0 z-20 left-0 right-0 pt-4 -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 px-4 sm:px-6 md:px-8 lg:px-12 mt-6 backdrop-blur-md border-t flex flex-col-reverse sm:flex-row gap-3 sm:gap-5"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))", backgroundColor: isDark ? "rgba(2, 6, 23, 0.95)" : "rgba(255, 255, 255, 0.95)", borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(226,232,240,1)" }}>
        <Button variant="ghost" onClick={() => setStep(4)} className={cn("w-full sm:w-auto min-h-[44px] sm:min-h-[52px] px-6 rounded-2xl sm:rounded-[24px] font-bold uppercase text-[10px] tracking-[0.3em] transition-[color,background-color] touch-manipulation active:scale-[0.98] order-2 sm:order-1", isDark ? "text-slate-500 lg:hover:text-white lg:hover:bg-white/5" : "text-slate-500 lg:hover:text-slate-900 lg:hover:bg-slate-100")}>
          <ChevronLeft className="mr-2 h-4 w-4 shrink-0" /> Edit
        </Button>
        <Button onClick={handleFinalSubmit} disabled={loading}
          className="flex-1 w-full min-h-[48px] sm:min-h-[52px] md:h-14 bg-blue-600 lg:hover:bg-white lg:hover:text-blue-600 text-white rounded-2xl sm:rounded-[28px] shadow-[0_20px_50px_rgba(59,130,246,0.3)] transition-[background-color,color,transform] duration-300 active:scale-[0.98] flex items-center justify-center gap-3 sm:gap-4 group touch-manipulation order-1 sm:order-2">
          {loading ? <Loader2 className="animate-spin w-5 h-5 shrink-0" /> : <><Sparkles size={16} className="sm:w-5 sm:h-5 shrink-0" /><span className="font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.4em]">Submit Application</span></>}
        </Button>
      </div>

      {/* CELEBRATION */}
      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent className={cn("w-[95vw] max-w-md max-h-[90dvh] overflow-auto p-0 overflow-hidden rounded-2xl sm:rounded-[56px] shadow-2xl", isDark ? "bg-slate-950 border-white/10" : "bg-white border-slate-200")}>
          <DialogHeader className="sr-only"><DialogTitle>Success</DialogTitle><DialogDescription>Application transmitted.</DialogDescription></DialogHeader>
          <div className="p-6 sm:p-12 text-center space-y-6 sm:space-y-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-600/10 blur-[100px]" />
            <div className="relative z-10">
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-blue-600 rounded-2xl sm:rounded-[32px] flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-[0_20px_60px_rgba(59,130,246,0.5)] rotate-6">
                <Building2 className="text-white w-8 h-8 sm:w-12 sm:h-12" />
              </div>
              <h2 className={cn("text-2xl sm:text-4xl font-black uppercase tracking-tighter leading-tight italic", isDark ? "text-white" : "text-slate-900")}>
                APPLICATION <br /> <span className="text-blue-500">SUBMITTED</span>
              </h2>
              <p className="text-slate-400 text-[10px] sm:text-xs font-medium italic mt-4 sm:mt-6 leading-relaxed px-2">Your journey at ACLC Northbay has been initialized.</p>
            </div>
            <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-4 text-blue-400 flex-wrap">
              <Orbit className="lg:animate-spin w-4 h-4 sm:w-5 sm:h-5" style={{ animationDuration: '10s' }} />
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.5em]">Establishing ID Profile...</p>
              <Orbit className="lg:animate-spin w-4 h-4 sm:w-5 sm:h-5" style={{ animationDuration: '10s', animationDirection: 'reverse' }} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReviewSection({ icon, title, details, isDark }: any) {
  return (
    <Card className={cn("p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[32px] border w-full overflow-hidden shadow-inner transition-colors duration-300", isDark ? "border-blue-900/40 bg-slate-950/60 lg:hover:bg-white/[0.08]" : "border-slate-200 bg-white lg:hover:bg-slate-50")}>
      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="p-2 sm:p-3 bg-blue-600/20 rounded-xl sm:rounded-2xl border border-blue-500/20 shrink-0">{icon}</div>
        <p className="text-[9px] sm:text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em] sm:tracking-[0.4em] italic truncate">{title}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 sm:gap-x-10 gap-y-3 sm:gap-y-6">
        {details.map((d: any, i: number) => (
          <div key={i} className={`space-y-1 min-w-0 ${d.fullWidth ? 'col-span-2' : ''}`}>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{d.label}</p>
            <p className={cn("text-[10px] sm:text-xs font-bold uppercase leading-relaxed break-words tracking-wider", isDark ? "text-white" : "text-slate-900")}>{d.value || "—"}</p>
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
        <div className={cn("group relative aspect-square min-h-[70px] sm:min-h-[80px] rounded-xl sm:rounded-[28px] overflow-hidden border cursor-pointer transition-[border-color] shadow-inner touch-manipulation", isDark ? "bg-slate-950 border-blue-900/40 lg:hover:border-blue-500/50" : "bg-white border-slate-200 lg:hover:border-blue-300")}>
          <img src={url} className="w-full h-full object-cover opacity-60 lg:group-hover:opacity-100 transition-opacity duration-500" alt={label} loading="lazy" />
          <div className="absolute inset-0 bg-slate-950/60 opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="text-white w-4 h-4" />
          </div>
          <div className="absolute bottom-1.5 sm:bottom-3 left-0 w-full text-center">
            <p className={cn("text-[7px] sm:text-[8px] font-bold uppercase tracking-widest opacity-60", isDark ? "text-white" : "text-slate-900")}>{label}</p>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className={cn("w-[95vw] max-w-4xl max-h-[90dvh] overflow-auto rounded-2xl sm:rounded-[40px] p-4 sm:p-6", isDark ? "bg-slate-950/95 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}>
        <DialogHeader><DialogTitle className={cn("uppercase font-black tracking-widest text-sm sm:text-base", isDark ? "text-white" : "text-slate-900")}>{label}</DialogTitle></DialogHeader>
        <div className={cn("flex items-center justify-center p-3 sm:p-4 rounded-2xl sm:rounded-3xl border shadow-2xl min-h-[200px]", isDark ? "bg-slate-900 border-white/5" : "bg-slate-100 border-slate-200")}>
          <img src={url} className="max-h-[60dvh] sm:max-h-[70vh] object-contain rounded-xl shadow-2xl" alt="Preview" loading="lazy" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
