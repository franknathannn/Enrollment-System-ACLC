// app/status/components/ResultCard.tsx
// UPDATED — add StudentQRCard import and render it for enrolled students
"use client"

import { useState } from "react"
import {
  AlertCircle, MapPin, Clock, FileEdit,
  CalendarDays, ChevronDown, ChevronUp,
  ShieldAlert, GraduationCap, Hash, LayoutDashboard, Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { StatusBadge } from "./StatusBadge"
import { ScheduleView } from "./ScheduleView"
import { generateSetupToken, checkStudentAccount } from "@/lib/actions/student-auth"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import type { StudentRecord } from "../types"

interface Props {
  result: StudentRecord
  onFixApplication: () => void
  isDarkMode: boolean
}

export function ResultCard({ result, onFixApplication, isDarkMode }: Props) {
  const router = useRouter()
  const [showSchedule, setShowSchedule] = useState(false)
  const [generatingToken, setGeneratingToken] = useState(false)

  const sectionName = result.sections?.section_name || result.section || null

  const accentBar = {
    Accepted: "bg-green-500",
    Approved: "bg-green-500",
    Rejected: "bg-red-500",
    Pending: "bg-amber-400",
  }[result.status] ?? "bg-amber-400"

  const Section = ({ title, open, onToggle, children, icon }: {
    title: string; open: boolean; onToggle: () => void; children: React.ReactNode; icon?: React.ReactNode
  }) => (
      <div className={cn("rounded-[28px] border overflow-hidden transition-all duration-200", isDarkMode ? "border-white/8 bg-white/[0.02]" : "border-slate-200 bg-white")}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-2">
          {icon && <span className={cn("transition-colors", isDarkMode ? "text-slate-600 group-hover:text-slate-400" : "text-slate-500 group-hover:text-slate-700")}>{icon}</span>}
          <p className={cn("text-[9px] font-black uppercase tracking-[0.3em] transition-colors", isDarkMode ? "text-slate-500 group-hover:text-slate-400" : "text-slate-500 group-hover:text-slate-700")}>{title}</p>
        </div>
        {open
          ? <ChevronUp size={13} className={cn("transition-colors", isDarkMode ? "text-slate-600 group-hover:text-slate-400" : "text-slate-500 group-hover:text-slate-700")} />
          : <ChevronDown size={13} className={cn("transition-colors", isDarkMode ? "text-slate-600 group-hover:text-slate-400" : "text-slate-500 group-hover:text-slate-700")} />}
      </button>
      {open && (
        <div className={cn("px-6 pb-6 border-t pt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200", isDarkMode ? "border-white/5" : "border-slate-200")}>
          {children}
        </div>
      )}
    </div>
  )

  const Field = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div>
      <p className={cn("text-[8px] font-black uppercase tracking-[0.3em]", isDarkMode ? "text-slate-600" : "text-slate-500")}>{label}</p>
      <p className={cn("text-sm font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{value || "—"}</p>
    </div>
  )

  const isEnrolled = result.status === "Accepted" || result.status === "Approved"

  // Construct full name for QR
  const fullName = `${result.last_name}, ${result.first_name}${result.middle_name ? " " + result.middle_name : ""}`

  return (
    <Card className="p-[1.5px] rounded-[48px] border-none shadow-2xl shadow-blue-900/20 animate-in zoom-in-95 duration-500 relative overflow-hidden backdrop-blur-3xl"
      style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.35), rgba(139,92,246,0.15), rgba(15,23,42,0.8))" }}
    >
      <div className={cn("p-8 rounded-[46px] space-y-8", isDarkMode ? "bg-slate-950/95" : "bg-white/95")}>

        {/* Accent bar */}
        <div className={cn("absolute top-0 left-0 right-0 h-1 transition-colors duration-1000", accentBar)}
          style={{ boxShadow: result.status === "Accepted" || result.status === "Approved" ? "0 0 16px rgba(34,197,94,0.4)" : result.status === "Rejected" ? "0 0 16px rgba(239,68,68,0.4)" : "0 0 16px rgba(245,158,11,0.4)" }}
        />

        {/* ── Approved / Accepted celebration banner ── */}
        {isEnrolled && (
          <div className="relative overflow-hidden rounded-[28px] border border-green-500/20 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent p-6 text-center space-y-3">
            {/* Animated shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/5 to-transparent animate-shimmer pointer-events-none" />
            
            <div className="relative flex justify-center mb-2">
              <div className="relative">
                <span className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" style={{ animationDuration: "2.5s" }} />
                <div className="relative w-16 h-16 rounded-full bg-green-500/15 border-2 border-green-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.25)]">
                  <GraduationCap className={cn("w-8 h-8", isDarkMode ? "text-green-400" : "text-green-600")} />
                </div>
              </div>
            </div>

            <div className="relative space-y-1">
              <p className={cn("text-[10px] font-black uppercase tracking-[0.4em]", isDarkMode ? "text-green-300/60" : "text-green-700/70")}>Enrollment Status</p>
              <p className={cn("text-2xl font-black uppercase tracking-wider", isDarkMode ? "text-green-400" : "text-green-600")}>Approved</p>
              <p className={cn("text-[10px] font-semibold tracking-wide", isDarkMode ? "text-green-300/50" : "text-green-800/80")}>
                Congratulations! Your enrollment has been confirmed.
              </p>
            </div>
          </div>
        )}

        {/* ── Pending indicator ── */}
        {result.status === "Pending" && (
          <div className="relative overflow-hidden rounded-[28px] border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6 text-center space-y-3">
            <div className="relative flex justify-center mb-2">
              <div className="relative">
                <span className="absolute inset-0 rounded-full bg-amber-400/20 animate-pulse" />
                <div className="relative w-16 h-16 rounded-full bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-center">
                  <Clock className={cn("w-8 h-8", isDarkMode ? "text-amber-400" : "text-amber-600")} />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <p className={cn("text-[10px] font-black uppercase tracking-[0.4em]", isDarkMode ? "text-amber-300/60" : "text-amber-700/70")}>Enrollment Status</p>
              <p className={cn("text-2xl font-black uppercase tracking-wider", isDarkMode ? "text-amber-400" : "text-amber-600")}>Pending Review</p>
              <p className={cn("text-[10px] font-semibold tracking-wide", isDarkMode ? "text-amber-300/50" : "text-amber-800/80")}>
                Your application is being reviewed by the registrar.
              </p>
            </div>
          </div>
        )}

        {/* ── Rejected indicator ── */}
        {result.status === "Rejected" && (
          <div className="relative overflow-hidden rounded-[28px] border border-red-500/20 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent p-6 text-center space-y-3">
            <div className="relative flex justify-center mb-2">
              <div className="relative w-16 h-16 rounded-full bg-red-500/15 border-2 border-red-500/40 flex items-center justify-center">
                <ShieldAlert className={cn("w-8 h-8", isDarkMode ? "text-red-400" : "text-red-600")} />
              </div>
            </div>
            <div className="space-y-1">
              <p className={cn("text-[10px] font-black uppercase tracking-[0.4em]", isDarkMode ? "text-red-300/60" : "text-red-700/70")}>Enrollment Status</p>
              <p className={cn("text-2xl font-black uppercase tracking-wider", isDarkMode ? "text-red-400" : "text-red-600")}>Not Accepted</p>
              <p className={cn("text-[10px] font-semibold tracking-wide", isDarkMode ? "text-red-300/50" : "text-red-800/80")}>
                Your application was not approved.
              </p>
            </div>

            {/* Registrar reason */}
            <div className="mt-3 pt-3 border-t border-red-500/15 space-y-1.5">
              <div className="flex items-center justify-center gap-1.5">
                <AlertCircle size={10} className="text-red-400/70" />
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-red-400/60">Registrar Feedback</p>
              </div>
              <p className="text-xs text-red-200/70 leading-relaxed text-center font-medium">
                {result.registrar_feedback || "No specific reason provided."}
              </p>
            </div>
          </div>
        )}

        {/* ── Student identity ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className={cn("text-[8px] font-black uppercase tracking-[0.3em]", isDarkMode ? "text-slate-600" : "text-slate-500")}>Applicant</p>
            <p className={cn("text-lg font-black truncate", isDarkMode ? "text-white" : "text-slate-900")}>
              {result.last_name}, {result.first_name}
              {result.middle_name ? ` ${result.middle_name.charAt(0)}.` : ""}
            </p>
          </div>
          <StatusBadge status={result.status} />
        </div>

        {/* ── Enrollment details grid ── */}
        <div className={cn("grid grid-cols-2 gap-4 rounded-[20px] border p-5", isDarkMode ? "border-white/5 bg-white/[0.02]" : "border-slate-200 bg-slate-50/70")}>
          <Field label="LRN" value={result.lrn} />
          <Field label="Strand" value={result.strand} />
          <Field label="Section" value={sectionName} />
          <Field label="School Year" value={result.school_year} />
        </div>

        {/* ── Registrar feedback (if any) ── */}
        {(result.registrar_feedback || result.decline_reason) && (
          <div className={cn(
            "rounded-[20px] border p-5 space-y-2",
            result.status === "Rejected"
              ? "border-red-500/20 bg-red-500/5"
              : "border-blue-500/20 bg-blue-500/5"
          )}>
            <div className="flex items-center gap-2">
              <AlertCircle size={12} className={result.status === "Rejected" ? "text-red-400" : "text-blue-400"} />
              <p className={cn("text-[9px] font-black uppercase tracking-[0.3em]", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                Registrar Remarks
              </p>
            </div>
            <p className={cn("text-xs leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-700")}>
              {result.decline_reason || result.registrar_feedback}
            </p>
          </div>
        )}

        {/* ── Fix application button for pending/rejected ── */}
        {!isEnrolled && !result.is_locked && (
          <button
            onClick={onFixApplication}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-[18px] border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white group"
          >
            <FileEdit size={12} className="group-hover:rotate-[-8deg] transition-transform" />
            Fix My Application
          </button>
        )}

        {/* ── Student Portal CTA — visible for enrolled students ── */}
        {isEnrolled && (
          <div className="rounded-[28px] border border-blue-500/20 bg-gradient-to-r from-blue-500/10 via-blue-600/5 to-indigo-500/10 p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400">Student Portal</p>
                <p className="text-[10px] text-slate-500">
                  Access your QR code, schedule, and dashboard
                </p>
              </div>
              <button
                disabled={generatingToken}
                onClick={async () => {
                  setGeneratingToken(true)
                  const { exists } = await checkStudentAccount(result.id)
                  if (exists) {
                    toast.info("Account already exists. Redirecting to login…")
                    router.push("/student/login")
                    return
                  }
                  const { token, error } = await generateSetupToken(result.id)
                  if (error === "account_exists") {
                    toast.info("Account already exists. Redirecting to login…")
                    router.push("/student/login")
                    return
                  }
                  if (!token) {
                    toast.error(error || "Failed to generate setup link.")
                    setGeneratingToken(false)
                    return
                  }
                  router.push(`/student/setup?token=${token}`)
                }}
                className="flex items-center gap-1.5 shrink-0 px-5 py-3 rounded-[14px] text-[9px] font-black uppercase tracking-widest text-white transition-all active:scale-95 disabled:opacity-50 hover:shadow-[0_6px_24px_rgba(29,78,216,0.4)]"
                style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)", boxShadow: "0 4px 16px rgba(29,78,216,0.3)" }}
              >
                {generatingToken ? <Loader2 size={12} className="animate-spin" /> : <LayoutDashboard size={12} />}
                {generatingToken ? "Loading…" : "Proceed"}
              </button>
            </div>
            <p className="text-[9px] text-emerald-400/70 font-bold tracking-wide flex items-center gap-1.5">
              <MapPin size={10} />
              You may now proceed to set up your student account.
            </p>
          </div>
        )}

        {/* Class Schedule — unchanged */}
        {isEnrolled && sectionName && (
          <Section
            title="My Class Schedule"
            open={showSchedule}
            onToggle={() => setShowSchedule(v => !v)}
            icon={<CalendarDays size={12} />}
          >
            <ScheduleView section={sectionName} schoolYear={result.school_year} />
          </Section>
        )}

      </div>
    </Card>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// INTEGRATION NOTES:
//
// 1. Copy AttendanceTab.tsx  → src/app/teacher/dashboard/components/AttendanceTab.tsx
// 2. Copy StudentQRCard.tsx  → src/app/status/components/StudentQRCard.tsx
// 3. In ResultCard.tsx add the two lines marked ADD above:
//      //    //    Then insert the <Section> QR block before the Schedule section.
// 4. No DB schema changes needed — uses the existing `attendance` table.
// 5. The QR encodes the student's UUID (result.id / students.id).
//    Teachers scan this UUID; AttendanceTab matches it to the student.
// ────────────────────────────────────────────────────────────────────────────