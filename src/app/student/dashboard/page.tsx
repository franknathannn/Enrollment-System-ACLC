"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { studentSupabase } from "@/lib/supabase/student-client"
import {
  Loader2, LogOut, GraduationCap, QrCode, CalendarDays,
  BookOpen, Copy, Check, ClipboardList, Sun, Moon, User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { StudentQRCard } from "@/app/status/components/StudentQRCard"
import { ScheduleView } from "@/app/status/components/ScheduleView"
import { AttendanceCalendar } from "./AttendanceCalendar"
import { StudentInfoTab } from "./StudentInfoTab"
import { useThemeStore } from "@/store/useThemeStore"
import { toast } from "sonner"

interface StudentData {
  id: string
  first_name: string
  last_name: string
  middle_name: string | null
  lrn: string
  section: string | null
  strand: string | null
  school_year: string | null
  status: string
  grade_level?: string | null
  two_by_two_url?: string | null
  // personal
  gender?: string | null
  age?: number | null
  birth_date?: string | null
  civil_status?: string | null
  nationality?: string | null
  religion?: string | null
  // contact
  address?: string | null
  email?: string | null
  phone?: string | null
  contact_no?: string | null
  // guardian
  guardian_name?: string | null
  guardian_first_name?: string | null
  guardian_middle_name?: string | null
  guardian_last_name?: string | null
  guardian_contact?: string | null
  guardian_phone?: string | null
  guardian_email?: string | null
  // academic
  student_category?: string | null
  last_school_attended?: string | null
  last_school_address?: string | null
  school_type?: string | null
  year_completed_jhs?: string | null
  gwa_grade_10?: number | null
  preferred_modality?: string | null
  preferred_shift?: string | null
}

// ── Welcome modal ─────────────────────────────────────────────────────────────
function WelcomeModal({ studentId, lrn, onClose, dm }: {
  studentId: string; lrn: string; onClose: () => void; dm: boolean
}) {
  const trackingPrefix = studentId.split("-")[0]
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(20px)" }}
    >
      <div className={`w-full max-w-sm rounded-[40px] p-8 space-y-6 animate-in zoom-in-95 duration-300 shadow-2xl border ${
        dm ? "bg-slate-950 border-white/10" : "bg-white border-slate-200"
      }`}>
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-green-400" />
          </div>
          <h2 className={`text-xl font-black uppercase tracking-tight ${dm ? "text-white" : "text-slate-900"}`}>
            Welcome!
          </h2>
          <p className={`text-[10px] font-bold uppercase tracking-[0.3em] ${dm ? "text-slate-500" : "text-slate-400"}`}>
            Save your login credentials
          </p>
        </div>

        <div className="space-y-3">
          {[
            { label: "Username (Tracking ID)", value: trackingPrefix },
            { label: "LRN", value: lrn },
          ].map(({ label, value }) => (
            <div key={label} className={`rounded-2xl border p-4 ${dm ? "border-white/8 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
              <p className={`text-[8px] font-black uppercase tracking-[0.3em] mb-1.5 ${dm ? "text-slate-600" : "text-slate-400"}`}>{label}</p>
              <div className="flex items-center justify-between gap-3">
                <p className={`text-base font-black font-mono tracking-widest ${dm ? "text-white" : "text-slate-900"}`}>{value}</p>
                <button onClick={() => copy(value, label)} className="text-slate-400 hover:text-blue-500 transition-colors shrink-0">
                  {copied === label ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-amber-500/5 border border-amber-500/15 p-4">
          <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest leading-relaxed">
            Keep these safe — your username and LRN are required to sign in next time.
          </p>
        </div>

        <Button
          onClick={onClose}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-[18px] text-xs font-black uppercase tracking-[0.2em] transition-all active:scale-95"
        >
          Got it, show my dashboard
        </Button>
      </div>
    </div>
  )
}

// ── Student avatar ─────────────────────────────────────────────────────────────
function StudentAvatar({ url, name, size, dm }: {
  url?: string | null; name: string; size: "sm" | "lg"; dm: boolean
}) {
  const sz = size === "lg" ? "w-20 h-20" : "w-[52px] h-[52px]"
  const iconSz = size === "lg" ? 28 : 20
  const ring = size === "lg"
    ? `ring-[3px] ring-offset-[3px] ${dm ? "ring-blue-500/50 ring-offset-[#07111f]" : "ring-blue-400/60 ring-offset-white"}`
    : `ring-2 ring-offset-2 ${dm ? "ring-blue-500/40 ring-offset-[#07111f]" : "ring-blue-300/50 ring-offset-white"}`

  return (
    <div className={`${sz} rounded-2xl overflow-hidden shrink-0 ${ring}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className={`w-full h-full flex items-center justify-center ${dm ? "bg-blue-600/25" : "bg-blue-100"}`}>
          <GraduationCap size={iconSz} className="text-blue-500" />
        </div>
      )}
    </div>
  )
}

// ── Dashboard content ──────────────────────────────────────────────────────────
function DashboardContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const isWelcome    = searchParams.get("welcome") === "true"

  const { isDark, toggleTheme } = useThemeStore()
  const dm = isDark

  const [student,     setStudent]     = useState<StudentData | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)
  const [activeTab,   setActiveTab]   = useState<"info" | "schedule" | "qr" | "attendance" | "announcements">("info")
  const [copied,      setCopied]      = useState<string | null>(null)

  useEffect(() => {
    let channel: ReturnType<typeof studentSupabase.channel> | null = null

    async function load() {
      const { data: { user } } = await studentSupabase.auth.getUser()
      if (!user) { router.replace("/student/login"); return }

      const { data } = await studentSupabase
        .from("students")
        .select("*")
        .eq("id", user.id)
        .single()

      if (!data) { router.replace("/student/login"); return }

      if (data.account_status === "Deactivated") {
        await studentSupabase.auth.signOut()
        toast.error("Deactivated Account, Contact Admin.")
        router.replace("/student/login")
        return
      }

      setStudent(data as StudentData)
      setLoading(false)

      if (isWelcome) {
        setShowWelcome(true)
        const url = new URL(window.location.href)
        url.searchParams.delete("welcome")
        window.history.replaceState({}, "", url.toString())
      }

      // Realtime: filter to this student's row only so changes reflect instantly
      channel = studentSupabase
        .channel(`student_data_rt_${user.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "students", filter: `id=eq.${user.id}` },
          async (payload) => {
            if (payload.new.account_status === "Deactivated") {
              toast.error("Deactivated Account, Contact Admin.")
              await studentSupabase.auth.signOut()
              router.replace("/student/login")
            } else {
              setStudent(payload.new as StudentData)
            }
          }
        )
        .subscribe()
    }
    load()

    return () => {
      if (channel) studentSupabase.removeChannel(channel)
    }
  }, [router, isWelcome])

  const handleSignOut = async () => {
    await studentSupabase.auth.signOut()
    toast.success("Signed out.")
    router.replace("/student/login")
  }

  const copyVal = (val: string, key: string) => {
    navigator.clipboard.writeText(val).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className={`fixed inset-0 flex flex-col items-center justify-center gap-4 ${dm ? "bg-slate-950" : "bg-slate-50"}`}>
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-aclc.png" alt="ACLC" className="w-12 h-12 object-contain opacity-40" />
        <Loader2 className="animate-spin text-blue-500 w-6 h-6 absolute -bottom-2 -right-2" />
      </div>
      <p className="text-[9px] font-black uppercase tracking-[0.5em] text-blue-500 animate-pulse mt-2">
        Loading dashboard…
      </p>
    </div>
  )

  if (!student) return null

  const fullName       = `${student.last_name}, ${student.first_name}${student.middle_name ? " " + student.middle_name : ""}`
  const trackingPrefix = student.id.split("-")[0]
  const isEnrolled     = student.status === "Approved" || student.status === "Accepted"
  const gradeLabel     = student.grade_level ? `Grade ${student.grade_level}` : "Grade 11"

  // ── Theme tokens ─────────────────────────────────────────────────────────────
  const pageBg      = dm ? "bg-slate-950"              : "bg-slate-50"
  const textPri     = dm ? "text-white"                : "text-slate-900"
  const textSub     = dm ? "text-slate-500"            : "text-slate-500"
  const textMuted   = dm ? "text-slate-700"            : "text-slate-300"
  const emptyCard   = dm
    ? "border border-white/[0.06] rounded-[28px] bg-white/[0.02]"
    : "border border-slate-200 rounded-[28px] bg-white"

  const tabBtn = (active: boolean) =>
    `flex items-center justify-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest py-2.5 rounded-2xl transition-all duration-200 w-full relative
     ${active
       ? "text-white bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/25"
       : (dm ? "text-slate-500 hover:text-slate-200 hover:bg-slate-700/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/60")}`

  // ── Shared tab content ───────────────────────────────────────────────────────
  const TabContent = () => (
    <div className="animate-in fade-in duration-200 pt-2">
      {activeTab === "info" && (
        <StudentInfoTab student={student} dm={dm} onStudentUpdate={(updated) => setStudent(updated as StudentData)} />
      )}

      {activeTab === "schedule" && student.section && student.school_year && (
        <ScheduleView section={student.section} schoolYear={student.school_year} dm={dm} />
      )}
      {activeTab === "schedule" && !student.section && (
        <div className={`text-center py-20 ${emptyCard}`}>
          <CalendarDays className={`w-8 h-8 mx-auto mb-3 ${textMuted}`} />
          <p className={`text-[11px] font-black uppercase tracking-widest ${textSub}`}>No section assigned yet</p>
          <p className={`text-[9px] mt-1 ${textMuted}`}>Check back once your section is set</p>
        </div>
      )}

      {activeTab === "qr" && (
        <StudentQRCard
          studentId={student.id}
          studentName={fullName}
          lrn={student.lrn}
          section={student.section}
          dm={dm}
        />
      )}

      {activeTab === "attendance" && student.school_year && (
        <AttendanceCalendar studentId={student.id} schoolYear={student.school_year} dm={dm} />
      )}

      {activeTab === "announcements" && (
        <StudentAnnouncements studentGrade={student.grade_level || "11"} dm={dm} />
      )}
    </div>
  )

  return (
    <>
      <style jsx global>{`body{overflow-y:auto}::-webkit-scrollbar{display:none}*{-ms-overflow-style:none;scrollbar-width:none}`}</style>

      {showWelcome && (
        <WelcomeModal
          studentId={student.id}
          lrn={student.lrn}
          dm={dm}
          onClose={() => setShowWelcome(false)}
        />
      )}

      <div className={`min-h-screen transition-colors duration-300 ${pageBg}`}>
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-5 md:py-8 space-y-5 pb-24">

          {/* Nav */}
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl border overflow-hidden flex items-center justify-center shrink-0 shadow-sm ${dm ? "bg-slate-800 border-slate-700/80" : "bg-white border-slate-200"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-aclc.png" alt="AMA ACLC" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] bg-gradient-to-r from-blue-500 to-blue-400 bg-clip-text text-transparent">Student Portal</p>
                <p className={`text-[8px] font-bold uppercase tracking-widest ${textSub}`}>AMA ACLC NORTHBAY</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className={`flex items-center gap-1.5 h-9 w-9 md:w-auto md:px-3 justify-center rounded-2xl border transition-all duration-200
                  ${dm ? "bg-slate-800 border-slate-700/80 text-amber-400 hover:bg-slate-700 hover:border-slate-600" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"}`}
              >
                {dm ? <Sun size={13} /> : <Moon size={13} />}
                <span className="hidden md:inline text-[9px] font-black uppercase tracking-widest">{dm ? "Light" : "Dark"}</span>
              </button>

              <button
                onClick={handleSignOut}
                className={`flex items-center gap-1.5 h-9 px-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all duration-200
                  ${dm ? "text-slate-400 border-transparent hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20" : "text-slate-500 border-transparent hover:text-red-600 hover:bg-red-50 hover:border-red-200"}`}
              >
                <LogOut size={11} /><span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          </nav>

          {/* Profile Card */}
          <div className={`rounded-2xl md:rounded-3xl border overflow-hidden ${dm ? "bg-slate-900/60 border-slate-700/50" : "bg-white border-slate-200"}`}>
            <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-violet-500 to-blue-400" />
            <div className="p-5 md:p-7">
              <div className="flex items-start gap-4">
                <StudentAvatar url={student.two_by_two_url} name={student.first_name} size="lg" dm={dm} />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent mb-0.5">Welcome back</p>
                  <h1 className={`text-xl md:text-2xl font-black uppercase tracking-tight leading-tight ${textPri}`}>
                    {student.first_name} {student.last_name}
                  </h1>
                  <p className={`text-xs mt-0.5 ${textSub}`}>{student.strand} · {gradeLabel}</p>
                </div>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
                {[
                  { label: "Tracking ID", value: trackingPrefix, copy: true },
                  { label: "LRN",         value: student.lrn, copy: true },
                  { label: "Section",     value: student.section || "TBA", copy: false },
                  { label: "Status",      value: student.status === "Approved" ? "Enrolled" : student.status, copy: false },
                ].map(({ label, value, copy }) => (
                  <div key={label} className={`rounded-2xl border p-3 md:py-2.5 text-center flex flex-col justify-center relative group ${dm ? "bg-slate-800/50 border-slate-700/60" : "bg-slate-50 border-slate-200"}`}>
                    {copy && (
                       <button onClick={() => copyVal(value, label)} className={`absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${dm ? "hover:bg-slate-700" : "hover:bg-slate-200"}`}>
                         {copied === label ? <Check size={11} className="text-green-500" /> : <Copy size={11} className={textSub} />}
                       </button>
                    )}
                    <p className={`text-[12px] font-black mt-0.5 ${textPri}`}>{value}</p>
                    <p className={`text-[7px] font-black uppercase tracking-widest mt-1 ${textSub}`}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs array for mapping */}
          <div className={`grid gap-1 p-1.5 rounded-[20px] md:rounded-2xl border backdrop-blur-sm w-full ${dm ? "border-slate-700/60 bg-slate-800/50" : "border-slate-200/80 bg-white/70 shadow-sm"}`} style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
            <button className={tabBtn(activeTab === "info")} onClick={() => setActiveTab("info")}>
              <User size={13} /><span className="hidden md:inline">Info</span>
            </button>
            <button className={tabBtn(activeTab === "schedule")} onClick={() => setActiveTab("schedule")}>
              <CalendarDays size={13} /><span className="hidden md:inline">Schedule</span>
            </button>
            <button className={tabBtn(activeTab === "qr")} onClick={() => setActiveTab("qr")}>
              <QrCode size={13} /><span className="hidden md:inline">My QR</span>
            </button>
            <button className={tabBtn(activeTab === "attendance")} onClick={() => setActiveTab("attendance")}>
              <ClipboardList size={13} /><span className="hidden md:inline">Attendance</span>
            </button>
            <button className={tabBtn(activeTab === "announcements")} onClick={() => setActiveTab("announcements")}>
              <BookOpen size={13} /><span className="hidden md:inline">News</span>
            </button>
          </div>

          {/* Tab Content */}
          <TabContent />
        </div>
      </div>
    </>
  )
}

// ── Page shell ─────────────────────────────────────────────────────────────────
export default function StudentDashboardPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}

function StudentAnnouncements({ studentGrade, dm }: { studentGrade: string, dm: boolean }) {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const itemsPerPage = 5
  const totalPages = Math.max(1, Math.ceil(announcements.length / itemsPerPage))
  const currentAnnouncements = announcements.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => {
    const fetchNews = async () => {
      const { data, error } = await studentSupabase
        .from('student_announcements')
        .select('*')
        .in('target_audience', ['ALL', `GRADE ${studentGrade}`])
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (!error && data) {
        setAnnouncements(data)
      }
      setLoading(false)
    }
    fetchNews()

    // Optionally set up realtime channel here later!
  }, [studentGrade])

  const emptyCard = dm
    ? "border border-white/[0.06] rounded-[28px] bg-white/[0.02]"
    : "border border-slate-200 rounded-[28px] bg-white"
  const textPri   = dm ? "text-white" : "text-slate-900"
  const textSub   = dm ? "text-slate-500" : "text-slate-500"

  if (loading) {
    return (
      <div className={`h-64 flex flex-col items-center justify-center text-center fade-in ${emptyCard}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (announcements.length === 0) {
    return (
      <div className={`h-64 flex flex-col items-center justify-center text-center fade-in ${emptyCard}`}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${dm ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <BookOpen className="text-slate-400 w-8 h-8" />
        </div>
        <h3 className={`text-[13px] font-black uppercase tracking-widest ${textPri}`}>No News Available</h3>
        <p className={`text-[11px] font-bold uppercase tracking-widest mt-2 ${textSub}`}>Check back later for school updates.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 fade-in pb-12">
      {currentAnnouncements.map((ann) => (
        <div key={ann.id} className={`p-6 md:p-8 rounded-[32px] border ${
          ann.is_pinned 
            ? (dm ? "bg-blue-900/10 border-blue-900/50" : "bg-blue-50 border-blue-200") 
            : (dm ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200")
        } shadow-sm relative overflow-hidden group`}>
          {ann.is_pinned && <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full shrink-0 ${dm ? "bg-blue-500/20" : "bg-blue-500/10"}`} />}
          
          <div className="relative z-10 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              {ann.is_pinned && (
                <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${dm ? "text-blue-400 bg-blue-900/30" : "text-blue-600 bg-blue-100"}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg> 
                  Pinned
                </span>
              )}
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                {new Date(ann.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h3 className={`text-xl md:text-2xl font-black tracking-tight uppercase mb-3 ${textPri}`}>{ann.title}</h3>
            <p className={`text-sm font-medium whitespace-pre-wrap leading-relaxed ${dm ? "text-slate-400" : "text-slate-600"}`}>{ann.content}</p>
          </div>
        </div>
      ))}
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${textSub}`}>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-xl font-black uppercase tracking-widest text-[9px] border transition-colors disabled:opacity-30 ${dm ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded-xl font-black uppercase tracking-widest text-[9px] border transition-colors disabled:opacity-30 ${dm ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
