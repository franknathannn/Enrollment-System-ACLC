"use client"

import { useState, useEffect } from "react"
import { studentSupabase } from "@/lib/supabase/student-client"
import {
  User, Phone, GraduationCap, BookOpen,
  MessageSquare, Send, Loader2, CheckCircle,
  ShieldAlert, Lightbulb, ChevronDown, ChevronUp,
  AlertTriangle, Heart, Shield,
} from "lucide-react"
import { toast } from "sonner"

// ── Types ─────────────────────────────────────────────────────────────────────
export interface StudentFullInfo {
  id: string
  first_name: string
  last_name: string
  middle_name?: string | null
  lrn: string
  section?: string | null
  strand?: string | null
  school_year?: string | null
  status: string
  grade_level?: string | null
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

interface Props {
  student: StudentFullInfo
  dm: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_TRIES = 3

const LETTER_TEMPLATES = [
  {
    label: "Wrong personal info",
    text: "Good day. I am writing to request a correction on my enrollment information. My [field name] was entered incorrectly and needs to be updated to [correct value]. I apologize for any inconvenience and kindly ask for your assistance in rectifying this.",
  },
  {
    label: "Wrong strand / section",
    text: "Good day. I would like to request a correction regarding my assigned strand/section. I believe there may have been an error in the assignment, and I am requesting that it be reviewed and updated accordingly. Thank you for your time and consideration.",
  },
  {
    label: "Missing document / requirement",
    text: "Good day. I am reaching out because I was unable to submit one of my required documents during the enrollment process. I would like to request the opportunity to submit the missing requirement and complete my enrollment. Thank you.",
  },
  {
    label: "Photo / ID issue",
    text: "Good day. I am requesting a correction on my submitted photo. The image I uploaded does not meet the required format. I would like to re-submit a proper 2x2 ID photo. I appreciate your help in processing this update.",
  },
  {
    label: "Other correction",
    text: "Good day. I would like to formally request a review of my enrollment record. I have noticed a discrepancy that needs to be corrected. Please allow me to make the necessary changes to ensure the accuracy of my information. Thank you.",
  },
]

// ── Re-Enrollment Request Form ────────────────────────────────────────────────
function ReEnrollmentForm({ studentId, dm }: { studentId: string; dm: boolean }) {
  const [reason,        setReason]       = useState("")
  const [sending,       setSending]      = useState(false)
  const [submitted,     setSubmitted]    = useState(false)
  const [triesUsed,     setTriesUsed]    = useState<number | null>(null)
  const [hasPending,    setHasPending]   = useState(false)
  const [loadingTries,  setLoadingTries] = useState(true)
  const [showTemplates, setShowTemplates]= useState(false)

  useEffect(() => {
    if (!studentId) return
    Promise.all([
      studentSupabase
        .from("edit_requests")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .in("status", ["Approved", "Rejected"]),
      studentSupabase
        .from("edit_requests")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .eq("status", "Pending"),
    ]).then(([consumedRes, pendingRes]) => {
      setTriesUsed(consumedRes.count ?? 0)
      setHasPending((pendingRes.count ?? 0) > 0)
      setLoadingTries(false)
    })
  }, [studentId])

  const triesRemaining = triesUsed !== null ? MAX_TRIES - triesUsed : null
  const exhausted      = triesRemaining !== null && triesRemaining <= 0

  const handleSubmit = async () => {
    if (!reason.trim()) { toast.error("Please provide a reason for your request."); return }
    if (exhausted)      { toast.error("You have no re-enrollment tries remaining."); return }
    setSending(true)
    try {
      const { error } = await studentSupabase.from("edit_requests").insert([{
        student_id: studentId,
        reason:     reason.trim(),
        status:     "Pending",
      }])
      if (error) {
        if (error.code === "23505") toast.error("You already have a pending edit request.")
        else toast.error(error.message)
        return
      }
      setSubmitted(true)
      setHasPending(true)
      toast.success("Request submitted! An admin will review it shortly.")
    } finally {
      setSending(false)
    }
  }

  // Theme tokens
  const sectionBg     = dm ? "bg-white/[0.02] border-white/8"   : "bg-slate-50 border-slate-200"
  const textPri       = dm ? "text-white"                        : "text-slate-900"
  const textSub       = dm ? "text-slate-500"                    : "text-slate-400"
  const textareaStyle = dm
    ? "bg-white/5 border-white/10 text-white placeholder-slate-700 focus:border-blue-500"
    : "bg-white border-slate-200 text-slate-900 placeholder-slate-300 focus:border-blue-500"
  const templateBtn   = dm
    ? "bg-white/[0.03] border-white/8 hover:bg-white/8 hover:border-blue-500/20"
    : "bg-white border-slate-200 hover:bg-blue-50 hover:border-blue-300"
  const tryDotEmpty   = dm ? "bg-slate-700"  : "bg-slate-200"
  const counterBg     = (r: number) => r === 1
    ? "bg-red-500/10 border-red-500/25 text-red-400"
    : r === 2
      ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
      : dm
        ? "bg-white/5 border-white/10 text-slate-400"
        : "bg-slate-100 border-slate-200 text-slate-500"

  if (loadingTries) return (
    <div className={`p-5 rounded-[24px] border flex items-center gap-3 ${sectionBg}`}>
      <Loader2 size={14} className="animate-spin text-blue-500 shrink-0" />
      <p className={`text-[9px] font-black uppercase tracking-widest ${textSub}`}>Checking eligibility…</p>
    </div>
  )

  if (submitted) return (
    <div className="p-6 rounded-[24px] border border-green-500/20 bg-green-500/5 flex flex-col items-center gap-3 text-center">
      <CheckCircle size={28} className="text-green-400" />
      <div>
        <p className={`text-sm font-black uppercase tracking-tight ${textPri}`}>Request Submitted!</p>
        <p className={`text-[10px] mt-1 leading-relaxed ${textSub}`}>
          An admin will review your request. The result will reflect on your record.
        </p>
      </div>
      {triesRemaining !== null && triesRemaining > 0 && (
        <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">
          {triesRemaining} tr{triesRemaining === 1 ? "y" : "ies"} remaining
        </p>
      )}
    </div>
  )

  if (hasPending) return (
    <div className="p-5 rounded-[24px] border border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
        <AlertTriangle size={16} className="text-amber-400" />
      </div>
      <div>
        <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Request Pending</p>
        <p className={`text-[9px] mt-0.5 leading-relaxed ${textSub}`}>
          You have a request under review. Wait for admin feedback before submitting another.
        </p>
      </div>
    </div>
  )

  if (exhausted) return (
    <div className="p-5 rounded-[24px] border border-red-500/20 bg-red-500/5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
          <ShieldAlert size={16} className="text-red-400" />
        </div>
        <div>
          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">No Tries Remaining</p>
          <p className={`text-[9px] mt-0.5 ${textSub}`}>
            You have used all {MAX_TRIES} re-enrollment tries.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: MAX_TRIES }).map((_, i) => (
          <div key={i} className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-500/20" />
        ))}
        <span className="text-[8px] font-bold text-red-400 ml-1 uppercase tracking-wider">All tries used</span>
      </div>
    </div>
  )

  return (
    <div className={`p-5 rounded-[24px] border space-y-4 ${sectionBg}`}>
      {/* Header + try counter */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageSquare size={13} className="text-blue-400 shrink-0" />
          <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Request Information Edit</p>
        </div>
        {triesRemaining !== null && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[8px] font-black uppercase tracking-wider ${counterBg(triesRemaining)}`}>
            {Array.from({ length: MAX_TRIES }).map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${
                i < (MAX_TRIES - triesRemaining) ? "bg-amber-500" : tryDotEmpty
              }`} />
            ))}
            <span className="ml-1">{triesRemaining} tr{triesRemaining === 1 ? "y" : "ies"} left</span>
          </div>
        )}
      </div>

      <p className={`text-[10px] leading-relaxed ${textSub}`}>
        Describe what needs to be corrected and submit for admin review.{" "}
        <span className={triesRemaining === 1 ? "text-red-400 font-bold" : "text-amber-400 font-semibold"}>
          Each submission consumes one try.
        </span>
      </p>

      {/* Template picker */}
      <div>
        <button
          type="button"
          onClick={() => setShowTemplates(v => !v)}
          className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-amber-400 hover:text-amber-300 transition-colors"
        >
          <Lightbulb size={11} /> Use a template
          {showTemplates ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
        {showTemplates && (
          <div className="mt-2 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
            {LETTER_TEMPLATES.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setReason(t.text); setShowTemplates(false) }}
                className={`w-full text-left px-4 py-3 rounded-[18px] border transition-colors group ${templateBtn}`}
              >
                <p className="text-[9px] font-black uppercase tracking-wider text-blue-400 group-hover:text-blue-500 mb-1">{t.label}</p>
                <p className={`text-[9px] line-clamp-2 leading-relaxed ${textSub}`}>{t.text}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Textarea */}
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="Describe what information needs to be corrected…"
        maxLength={600}
        rows={4}
        className={`w-full rounded-[18px] px-4 py-3 text-sm font-medium outline-none border-2 transition-colors resize-none ${textareaStyle}`}
      />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`text-[9px] ${textSub}`}>{reason.length}/600</span>
        <button
          onClick={handleSubmit}
          disabled={sending || !reason.trim()}
          className="flex items-center gap-2 h-10 px-5 rounded-[14px] text-white text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 shadow-lg shadow-blue-900/30"
          style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)" }}
        >
          {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Submit Request
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function StudentInfoTab({ student, dm }: Props) {
  // Theme tokens
  const textPri   = dm ? "text-white"          : "text-slate-900"
  const textSub   = dm ? "text-slate-500"       : "text-slate-400"
  const textMuted = dm ? "text-slate-700"       : "text-slate-300"
  const sectionBg = dm
    ? "bg-white/[0.02] border-white/8"
    : "bg-slate-50 border-slate-200"
  const fieldBg   = dm
    ? "bg-white/[0.02] border-white/5"
    : "bg-white border-slate-100"
  const labelCls  = dm ? "text-slate-600"       : "text-slate-400"

  // ── Info field ──────────────────────────────────────────────────────────────
  const Field = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className={`rounded-[16px] border px-3.5 py-3 ${fieldBg}`}>
      <p className={`text-[7px] font-black uppercase tracking-[0.3em] mb-1 ${labelCls}`}>{label}</p>
      <p className={`text-sm font-black truncate ${value ? textPri : textMuted}`}>{value || "—"}</p>
    </div>
  )

  // ── Section wrapper ─────────────────────────────────────────────────────────
  const Group = ({ icon, title, children }: {
    icon: React.ReactNode; title: string; children: React.ReactNode
  }) => (
    <div className={`rounded-[24px] border p-5 space-y-3 ${sectionBg}`}>
      <div className="flex items-center gap-2">
        <div className="text-blue-500 shrink-0">{icon}</div>
        <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${textSub}`}>{title}</p>
      </div>
      {children}
    </div>
  )

  const fullName = `${student.last_name}, ${student.first_name}${student.middle_name ? " " + student.middle_name : ""}`
  const birthDateFmt = student.birth_date
    ? new Date(student.birth_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null

  // Guardian name: prefer combined field, fall back to split fields
  const guardianFullName = student.guardian_name
    || ([student.guardian_first_name, student.guardian_middle_name, student.guardian_last_name]
        .filter(Boolean).join(" ") || null)

  const isEnrolled = student.status === "Approved" || student.status === "Accepted"

  return (
    <div className="space-y-4">

      {/* ── Enrollment status badge ── */}
      <div className={`rounded-[20px] border px-5 py-4 flex items-center justify-between gap-3 ${
        isEnrolled ? "border-green-500/20 bg-green-500/5" : "border-amber-500/20 bg-amber-500/5"
      }`}>
        <div>
          <p className={`text-[8px] font-black uppercase tracking-[0.3em] ${textSub}`}>Enrollment Status</p>
          <p className={`text-base font-black uppercase mt-0.5 ${isEnrolled ? "text-green-400" : "text-amber-400"}`}>
            {student.status === "Approved" ? "Enrolled" : student.status}
          </p>
          {student.grade_level && (
            <p className={`text-[9px] font-bold mt-0.5 ${textSub}`}>
              Grade {student.grade_level} · {student.school_year}
            </p>
          )}
        </div>
        <GraduationCap size={22} className={isEnrolled ? "text-green-500" : "text-amber-500"} />
      </div>

      {/* ── Personal Information ── */}
      <Group icon={<User size={14} />} title="Personal Information">
        <Field label="Full Name" value={fullName} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Gender"       value={student.gender} />
          <Field label="Age"          value={student.age} />
          <Field label="Birthdate"    value={birthDateFmt} />
          <Field label="Civil Status" value={student.civil_status} />
          <Field label="Nationality"  value={student.nationality} />
          <Field label="Religion"     value={student.religion} />
        </div>
      </Group>

      {/* ── Contact Information ── */}
      <Group icon={<Phone size={14} />} title="Contact Information">
        <Field label="Address" value={student.address} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Phone No."  value={student.phone} />
          <Field label="Email"      value={student.email} />
        </div>
      </Group>

      {/* ── Guardian Information ── */}
      <Group icon={<Heart size={14} />} title="Guardian / Parent">
        <Field label="Guardian Name" value={guardianFullName} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Contact No." value={student.guardian_phone} />
          <Field label="Email"       value={student.guardian_email} />
        </div>
      </Group>

      {/* ── Academic Information ── */}
      <Group icon={<BookOpen size={14} />} title="Academic Information">
        <div className="grid grid-cols-2 gap-2">
          <Field label="LRN"             value={student.lrn} />
          <Field label="Grade Level"     value={student.grade_level ? `Grade ${student.grade_level}` : null} />
          <Field label="Strand"          value={student.strand} />
          <Field label="Section"         value={student.section || "Unassigned"} />
          <Field label="Student Type"    value={student.student_category} />
          <Field label="School Type"     value={student.school_type} />
          <Field label="Preferred Shift" value={student.preferred_shift} />
          <Field label="Preferred Mode"  value={student.preferred_modality} />
          {(student.gwa_grade_10 != null && student.gwa_grade_10 !== 0) && (
            <Field label="GWA (Grade 10)" value={String(student.gwa_grade_10)} />
          )}
          {student.year_completed_jhs && (
            <Field label="JHS Completed"  value={student.year_completed_jhs} />
          )}
        </div>
        {student.last_school_attended && (
          <Field label="Last School Attended" value={student.last_school_attended} />
        )}
        {student.last_school_address && (
          <Field label="Last School Address"  value={student.last_school_address} />
        )}
      </Group>

      {/* ── Re-Enrollment Request ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Shield size={11} className={textMuted} />
          <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${textSub}`}>Re-Enrollment Request</p>
        </div>
        <ReEnrollmentForm studentId={student.id} dm={dm} />
      </div>

    </div>
  )
}
