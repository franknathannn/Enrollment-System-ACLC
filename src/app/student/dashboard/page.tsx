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
    async function load() {
      const { data: { user } } = await studentSupabase.auth.getUser()
      if (!user) { router.replace("/student/login"); return }

      const { data } = await studentSupabase
        .from("students")
        .select("*")
        .eq("id", user.id)
        .single()

      if (!data) { router.replace("/student/login"); return }
      setStudent(data as StudentData)
      setLoading(false)

      if (isWelcome) {
        setShowWelcome(true)
        const url = new URL(window.location.href)
        url.searchParams.delete("welcome")
        window.history.replaceState({}, "", url.toString())
      }
    }
    load()
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
  const pageBg      = dm ? "bg-[#060d1b]"              : "bg-slate-100"
  const sidebarBg   = dm ? "bg-[#07111f]"              : "bg-white"
  const rightBg     = dm ? "bg-[#07111f]"              : "bg-white"
  const mainBg      = dm ? "bg-[#060d1b]"              : "bg-slate-100"
  const divider     = dm ? "border-white/[0.06]"       : "border-slate-200"
  const cardBg      = dm ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200"
  const textPri     = dm ? "text-white"                : "text-slate-900"
  const textSub     = dm ? "text-slate-500"            : "text-slate-500"
  const textMuted   = dm ? "text-slate-700"            : "text-slate-300"
  const navInactive = dm
    ? "text-slate-500 hover:text-white hover:bg-white/[0.06]"
    : "text-slate-400 hover:text-slate-800 hover:bg-slate-100"
  const emptyCard   = dm
    ? "border border-white/[0.06] rounded-[28px] bg-white/[0.02]"
    : "border border-slate-200 rounded-[28px] bg-white"
  const mobileTabActive   = "bg-blue-600 text-white shadow-md shadow-blue-500/25"
  const mobileTabInactive = dm
    ? "border border-white/[0.06] bg-white/[0.02] text-slate-500"
    : "border border-slate-200 bg-white text-slate-400"

  const tabs = [
    { key: "info"          as const, label: "Information", icon: <User size={15} />           },
    { key: "schedule"      as const, label: "Schedule",    icon: <CalendarDays size={15} />   },
    { key: "qr"            as const, label: "My QR Code",  icon: <QrCode size={15} />         },
    { key: "attendance"    as const, label: "Attendance",  icon: <ClipboardList size={15} />  },
    { key: "announcements" as const, label: "News",        icon: <BookOpen size={15} />       },
  ]

  const mobileTabs = [
    { key: "info"          as const, label: "Info",       icon: <User size={12} />          },
    { key: "schedule"      as const, label: "Schedule",   icon: <CalendarDays size={12} />  },
    { key: "qr"            as const, label: "QR",         icon: <QrCode size={12} />        },
    { key: "attendance"    as const, label: "Attendance", icon: <ClipboardList size={12} /> },
    { key: "announcements" as const, label: "News",       icon: <BookOpen size={12} />      },
  ]

  const currentTab = tabs.find(t => t.key === activeTab)!

  // ── Shared tab content ───────────────────────────────────────────────────────
  const TabContent = () => (
    <div className="animate-in fade-in duration-200">
      {activeTab === "info" && (
        <StudentInfoTab student={student} dm={dm} />
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
        <div className={`text-center py-20 ${emptyCard}`}>
          <BookOpen className={`w-8 h-8 mx-auto mb-3 ${textMuted}`} />
          <p className={`text-[11px] font-black uppercase tracking-widest ${textSub}`}>No announcements yet</p>
          <p className={`text-[9px] mt-1 ${textMuted}`}>School announcements will appear here</p>
        </div>
      )}
    </div>
  )

  return (
    <>
      {showWelcome && (
        <WelcomeModal
          studentId={student.id}
          lrn={student.lrn}
          dm={dm}
          onClose={() => setShowWelcome(false)}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (lg+)
      ════════════════════════════════════════════════════════════════════ */}

      {/* ── Left Sidebar ────────────────────────────────────────────────── */}
      <aside className={`hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 z-40 border-r transition-colors duration-300 ${sidebarBg} ${divider}`}>

        {/* School header — always blue */}
        <div className="relative overflow-hidden shrink-0"
          style={{ background: "linear-gradient(160deg,#0d2257 0%,#1a3fa5 55%,#2563eb 100%)" }}>
          {/* Dot matrix */}
          <div className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "radial-gradient(circle,#fff 1px,transparent 1px)", backgroundSize: "14px 14px" }} />
          {/* Bottom shimmer line */}
          <div className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg,transparent,rgba(147,197,253,0.4),transparent)" }} />
          <div className="relative px-5 py-5 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-aclc.png" alt="ACLC" className="w-11 h-11 object-contain shrink-0 drop-shadow-lg" />
            <div>
              <p className="text-white text-[12px] font-black uppercase tracking-[0.2em] leading-none drop-shadow">
                AMA ACLC
              </p>
              <p className="text-blue-200 text-[8px] font-bold uppercase tracking-[0.3em] mt-0.5 opacity-80 leading-none">
                Northbay
              </p>
              <p className="text-blue-300/60 text-[7px] font-semibold uppercase tracking-[0.2em] mt-0.5 leading-none">
                Student Portal
              </p>
            </div>
          </div>
        </div>

        {/* Student identity */}
        <div className={`px-5 py-5 border-b shrink-0 ${divider}`}>
          <div className="flex items-center gap-3.5">
            <StudentAvatar url={student.two_by_two_url} name={student.first_name} size="sm" dm={dm} />
            <div className="min-w-0 flex-1">
              <p className={`text-[13px] font-black uppercase leading-tight truncate ${textPri}`}>
                {student.first_name} {student.last_name}
              </p>
              <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest truncate mt-0.5">
                {student.strand} · {gradeLabel}
              </p>
              <span className={`inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-[3px] rounded-full text-[7px] font-black uppercase tracking-widest border ${
                isEnrolled
                  ? "bg-green-500/10 text-green-500 border-green-500/20"
                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isEnrolled ? "bg-green-500" : "bg-amber-500"}`} />
                {student.status === "Approved" ? "Enrolled" : student.status}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className={`text-[7px] font-black uppercase tracking-[0.4em] px-3 pb-2 ${textMuted}`}>Menu</p>
          {tabs.map(tab => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-4 py-[11px] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 group ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                    : navInactive
                }`}
              >
                <span className={`shrink-0 transition-transform duration-150 ${isActive ? "" : "group-hover:scale-110"}`}>
                  {tab.icon}
                </span>
                <span className="truncate">{tab.label}</span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/50 shrink-0" />}
              </button>
            )
          })}
        </nav>

        {/* Bottom controls */}
        <div className={`px-3 py-4 border-t shrink-0 ${divider}`}>
          <div className="flex gap-2">
            <button
              onClick={toggleTheme}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${
                dm
                  ? "text-slate-500 hover:text-amber-400 hover:bg-amber-500/5 border-white/[0.06] hover:border-amber-500/20"
                  : "text-slate-400 hover:text-blue-600 hover:bg-blue-50 border-slate-200 hover:border-blue-200"
              }`}
            >
              {dm ? <Sun size={13} /> : <Moon size={13} />}
              {dm ? "Light" : "Dark"}
            </button>
            <button
              onClick={handleSignOut}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${
                dm
                  ? "text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 border-white/[0.06] hover:border-rose-500/20"
                  : "text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200 hover:border-rose-200"
              }`}
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Right Panel (xl+) ────────────────────────────────────────────── */}
      <aside className={`hidden xl:flex flex-col fixed inset-y-0 right-0 w-[220px] z-40 border-l transition-colors duration-300 ${rightBg} ${divider}`}>

        {/* Header */}
        <div className={`px-5 py-5 border-b shrink-0 ${divider}`}>
          <p className={`text-[7px] font-black uppercase tracking-[0.4em] ${textMuted}`}>Quick Reference</p>
          <p className={`text-[13px] font-black uppercase mt-0.5 ${textPri}`}>{student.school_year}</p>
          <p className={`text-[9px] font-bold mt-0.5 ${textSub}`}>{gradeLabel} · {student.strand}</p>
        </div>

        {/* Student card */}
        <div className={`mx-4 mt-4 rounded-[20px] border overflow-hidden shrink-0 ${cardBg}`}>
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#1d4ed8,#7c3aed)" }} />
          <div className="p-4 flex flex-col items-center gap-3 text-center">
            <StudentAvatar url={student.two_by_two_url} name={student.first_name} size="lg" dm={dm} />
            <div>
              <p className={`text-[11px] font-black uppercase leading-tight ${textPri}`}>
                {student.first_name}
              </p>
              <p className={`text-[11px] font-black uppercase leading-tight ${textPri}`}>
                {student.last_name}
              </p>
              <p className={`text-[8px] font-bold text-blue-500 uppercase tracking-widest mt-1`}>
                {student.section || "No Section"}
              </p>
            </div>
          </div>
        </div>

        {/* Quick data */}
        <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {[
            { label: "Tracking ID", value: trackingPrefix, mono: true,  copy: true  },
            { label: "LRN",         value: student.lrn,    mono: true,  copy: true  },
            { label: "Section",     value: student.section || "TBA",   mono: false, copy: false },
            { label: "Status",      value: student.status === "Approved" ? "Enrolled" : student.status, mono: false, copy: false },
          ].map(({ label, value, mono, copy }) => (
            <div key={label} className={`rounded-[14px] border px-3.5 py-2.5 transition-colors ${cardBg}`}>
              <p className={`text-[7px] font-black uppercase tracking-[0.3em] mb-0.5 ${textSub}`}>{label}</p>
              <div className="flex items-center justify-between gap-1.5">
                <p className={`text-[11px] font-black truncate ${mono ? "font-mono tracking-widest" : ""} ${textPri}`}>
                  {value || "—"}
                </p>
                {copy && value && (
                  <button
                    onClick={() => copyVal(value, label)}
                    className="shrink-0 text-slate-500 hover:text-blue-500 transition-colors"
                  >
                    {copied === label
                      ? <Check size={11} className="text-green-400" />
                      : <Copy size={11} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom branding */}
        <div className={`px-5 py-4 border-t shrink-0 ${divider}`}>
          <div className={`flex items-center gap-2 opacity-40`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-aclc.png" alt="ACLC" className="w-6 h-6 object-contain" />
            <div>
              <p className={`text-[8px] font-black uppercase tracking-[0.2em] leading-none ${textPri}`}>AMA ACLC</p>
              <p className={`text-[7px] uppercase tracking-[0.2em] leading-none mt-0.5 ${textSub}`}>Northbay</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════════
          MAIN CONTENT AREA
      ════════════════════════════════════════════════════════════════════ */}
      <div className={`lg:pl-64 xl:pr-[220px] min-h-screen transition-colors duration-300 ${mainBg}`}>

        {/* Ambient glow — desktop only */}
        <div className="hidden lg:block fixed top-0 left-64 right-0 xl:right-[220px] h-[1px] z-10 pointer-events-none"
          style={{ background: "linear-gradient(90deg,transparent,rgba(59,130,246,0.15),transparent)" }} />

        <div className="max-w-2xl mx-auto px-4 lg:px-10 py-5 lg:py-8 space-y-5">

          {/* ── Mobile top bar ── */}
          <div className={`lg:hidden flex items-center justify-between sticky top-0 z-30 -mx-4 px-4 py-3 ${
            dm ? "bg-[#060d1b]/95" : "bg-slate-100/95"
          } backdrop-blur-md border-b ${divider}`}>
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-aclc.png" alt="ACLC" className="w-8 h-8 object-contain shrink-0" />
              <div>
                <p className={`text-[10px] font-black uppercase tracking-[0.15em] leading-none ${textPri}`}>ACLC Northbay</p>
                <p className={`text-[7px] font-bold uppercase tracking-[0.2em] mt-0.5 ${textSub}`}>Student Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  dm ? "text-slate-500 hover:text-amber-400" : "text-slate-400 hover:text-blue-600"
                }`}
              >
                {dm ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <button
                onClick={handleSignOut}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  dm ? "text-slate-600 hover:text-slate-300" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <LogOut size={12} /> Sign Out
              </button>
            </div>
          </div>

          {/* ── Mobile student card ── */}
          <div className={`lg:hidden rounded-[28px] border p-5 space-y-4 ${
            dm ? "border-white/[0.06]" : "border-blue-100 bg-blue-50/50"
          }`}
            style={dm ? { background: "linear-gradient(135deg,rgba(29,78,216,0.12),rgba(6,13,27,0.8))" } : undefined}
          >
            <div className="flex items-center gap-3.5">
              <StudentAvatar url={student.two_by_two_url} name={student.first_name} size="sm" dm={dm} />
              <div className="flex-1 min-w-0">
                <p className={`text-base font-black uppercase leading-tight ${textPri}`}>
                  {student.first_name} {student.last_name}
                </p>
                <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">
                  {student.strand} · {isEnrolled ? "Enrolled" : "Accepted"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Username", value: trackingPrefix },
                { label: "LRN",      value: student.lrn },
                { label: "Section",  value: student.section || "TBA" },
              ].map(({ label, value }) => (
                <div key={label} className={`rounded-2xl border p-3 text-center ${
                  dm ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200"
                }`}>
                  <p className={`text-[7px] font-black uppercase tracking-widest ${textSub}`}>{label}</p>
                  <p className={`text-[11px] font-black mt-1 truncate ${textPri}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Mobile tab bar ── */}
          <div className="lg:hidden flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
            {mobileTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.key ? mobileTabActive : mobileTabInactive
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ── Desktop section header ── */}
          <div className={`hidden lg:flex items-center gap-4 pb-2 border-b ${divider}`}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              dm ? "bg-blue-600/15 border border-blue-500/20" : "bg-blue-100 border border-blue-200"
            }`}>
              <span className="text-blue-500">{currentTab.icon}</span>
            </div>
            <div>
              <h1 className={`text-xl font-black uppercase tracking-tight leading-none ${textPri}`}>
                {currentTab.label}
              </h1>
              <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${textSub}`}>
                {student.school_year} · {student.section || "No Section Assigned"}
              </p>
            </div>
          </div>

          {/* ── Tab content ── */}
          <TabContent />

          {/* ── Mobile footer ── */}
          <div className="lg:hidden text-center pb-8">
            <p className={`text-[8px] font-black uppercase tracking-[0.4em] ${textMuted}`}>
              AMA ACLC Northbay · {student.school_year}
            </p>
          </div>

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
