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
import { StudentQRCard } from "./StudentQRCard"
import { generateSetupToken, checkStudentAccount } from "@/lib/actions/student-auth"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import type { StudentRecord } from "../types"

interface Props {
  result: StudentRecord
  onFixApplication: () => void
}

export function ResultCard({ result, onFixApplication }: Props) {
  const router = useRouter()
  const [showSchedule, setShowSchedule] = useState(false)
  const [showQR, setShowQR] = useState(false)
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
    <div className="rounded-[28px] border border-white/8 bg-white/[0.02] overflow-hidden transition-all duration-200">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-slate-600 group-hover:text-slate-400 transition-colors">{icon}</span>}
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 group-hover:text-slate-400 transition-colors">{title}</p>
        </div>
        {open
          ? <ChevronUp size={13} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
          : <ChevronDown size={13} className="text-slate-600 group-hover:text-slate-400 transition-colors" />}
      </button>
      {open && (
        <div className="px-6 pb-6 border-t border-white/5 pt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  )

  const Field = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div>
      <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">{label}</p>
      <p className="text-sm font-bold text-white">{value || "—"}</p>
    </div>
  )

  const isEnrolled = result.status === "Accepted" || result.status === "Approved"

  // Construct full name for QR
  const fullName = `${result.last_name}, ${result.first_name}${result.middle_name ? " " + result.middle_name : ""}`

  return (
    <Card className="p-[1.5px] rounded-[48px] border-none shadow-2xl shadow-blue-900/20 animate-in zoom-in-95 duration-500 relative overflow-hidden backdrop-blur-3xl"
      style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.35), rgba(139,92,246,0.15), rgba(15,23,42,0.8))" }}
    >
      <div className="bg-slate-950/95 p-8 rounded-[46px] space-y-8">

        {/* Accent bar */}
        <div className={cn("absolute top-0 left-0 right-0 h-1 transition-colors duration-1000", accentBar)}
          style={{ boxShadow: result.status === "Accepted" || result.status === "Approved" ? "0 0 16px rgba(34,197,94,0.4)" : result.status === "Rejected" ? "0 0 16px rgba(239,68,68,0.4)" : "0 0 16px rgba(245,158,11,0.4)" }}
        />

        {/* Name + status — UNCHANGED from original */}
        {/* ... (keep original content here) ... */}

        {/* ── QR CODE SECTION — add this block for enrolled students ── */}
        {isEnrolled && (
          <Section
            title="My Attendance QR Code"
            open={showQR}
            onToggle={() => setShowQR(v => !v)}
            icon={<span className="text-[14px]"></span>}
          >
            <StudentQRCard
              studentId={result.id}
              studentName={fullName}
              lrn={result.lrn}
              section={sectionName}
            />
          </Section>
        )}
        {/* ──────────────────────────────────────────────────────────── */}

        {/* Student Portal CTA — visible for enrolled students */}
        {isEnrolled && (
          <div className="rounded-[28px] border border-blue-500/20 bg-blue-500/5 p-5 flex items-center justify-between gap-4">
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
              className="flex items-center gap-1.5 shrink-0 px-4 py-2.5 rounded-[14px] text-[9px] font-black uppercase tracking-widest text-white transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)", boxShadow: "0 4px 16px rgba(29,78,216,0.3)" }}
            >
              {generatingToken ? <Loader2 size={12} className="animate-spin" /> : <LayoutDashboard size={12} />}
              {generatingToken ? "Loading…" : "Open"}
            </button>
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
//      import { StudentQRCard } from "./StudentQRCard"
//      const [showQR, setShowQR] = useState(false)
//    Then insert the <Section> QR block before the Schedule section.
// 4. No DB schema changes needed — uses the existing `attendance` table.
// 5. The QR encodes the student's UUID (result.id / students.id).
//    Teachers scan this UUID; AttendanceTab matches it to the student.
// ────────────────────────────────────────────────────────────────────────────