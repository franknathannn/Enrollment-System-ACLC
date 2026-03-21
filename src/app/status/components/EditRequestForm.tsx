// app/status/components/EditRequestForm.tsx
"use client"

import { useState, useEffect } from "react"
import {
  MessageSquare, Send, Loader2, CheckCircle,
  ShieldAlert, Lightbulb, ChevronDown, ChevronUp,
  AlertTriangle,
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"

const MAX_TRIES = 3

// ── Letter templates the student can choose from ───────────────────────────
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

interface Props {
  studentId: string
  studentLrn: string
}

export function EditRequestForm({ studentId, studentLrn }: Props) {
  const [reason,       setReason]       = useState("")
  const [sending,      setSending]      = useState(false)
  const [submitted,    setSubmitted]    = useState(false)
  const [triesUsed,    setTriesUsed]    = useState<number | null>(null)
  const [hasPending,   setHasPending]   = useState(false)
  const [loadingTries, setLoadingTries] = useState(true)
  const [showTemplates,setShowTemplates]= useState(false)

  // ── Fetch try count on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!studentId) return
    Promise.all([
      // Tries consumed = reviewed requests (Approved + Rejected)
      supabase
        .from("edit_requests")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .in("status", ["Approved", "Rejected"]),
      // Already has a pending request?
      supabase
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
      const { error } = await supabase.from("edit_requests").insert([{
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

  // Loading
  if (loadingTries) return (
    <div className="p-6 bg-white/[0.03] rounded-[32px] border border-white/8 flex items-center justify-center gap-3">
      <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
        <Loader2 size={13} className="animate-spin text-blue-400" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Checking eligibility…</p>
    </div>
  )

  // Already submitted this session
  if (submitted) return (
    <div className="p-8 bg-green-900/10 rounded-[32px] border border-green-500/20 flex flex-col items-center gap-4 text-center">
      <CheckCircle size={32} className="text-green-400" />
      <div>
        <p className="text-sm font-black text-white uppercase tracking-tighter">Request Submitted!</p>
        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
          An admin will review your request. You'll see the result on this page automatically.
        </p>
      </div>
      {triesRemaining !== null && triesRemaining > 0 && (
        <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">
          {triesRemaining} tr{triesRemaining === 1 ? "y" : "ies"} remaining after this
        </p>
      )}
    </div>
  )

  // Already has a pending request
  if (hasPending) return (
    <div className="p-6 bg-amber-900/10 rounded-[32px] border border-amber-500/20 flex items-center gap-4">
      <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center shrink-0">
        <AlertTriangle size={18} className="text-amber-400" />
      </div>
      <div>
        <p className="text-[11px] font-black text-amber-400 uppercase tracking-widest">Request Pending</p>
        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
          You already have a pending request under review. Please wait for admin feedback before submitting another.
        </p>
      </div>
    </div>
  )

  // All tries exhausted
  if (exhausted) return (
    <div className="p-6 bg-red-900/10 rounded-[32px] border border-red-500/20 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-red-500/15 flex items-center justify-center shrink-0">
          <ShieldAlert size={18} className="text-red-400" />
        </div>
        <div>
          <p className="text-[11px] font-black text-red-400 uppercase tracking-widest">No Tries Remaining</p>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
            You have used all {MAX_TRIES} re-enrollment tries. No further requests can be submitted.
          </p>
        </div>
      </div>
      {/* Try dots */}
      <div className="flex items-center gap-1.5 pl-13">
        {Array.from({ length: MAX_TRIES }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-500/20" />
        ))}
        <span className="text-[9px] font-bold text-red-400 ml-2 uppercase tracking-wider">All tries used</span>
      </div>
    </div>
  )

  // Normal form
  return (
    <div className="p-6 bg-white/[0.03] rounded-[32px] border border-white/8 space-y-4">

      {/* Header row with try counter */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <MessageSquare size={12} className="text-blue-400" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Request Information Edit</p>
        </div>

        {/* Try counter */}
        {triesRemaining !== null && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-[8px] font-black uppercase tracking-wider ${
            triesRemaining === 1
              ? "bg-red-500/10 border-red-500/25 text-red-400"
              : triesRemaining === 2
                ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                : "bg-slate-800 border-slate-700 text-slate-400"
          }`}>
            {/* Dots */}
            {Array.from({ length: MAX_TRIES }).map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${
                i < (MAX_TRIES - triesRemaining)
                  ? "bg-amber-500 ring-2 ring-amber-500/20"
                  : "bg-slate-700"
              }`} />
            ))}
            <span className="ml-1">
              {triesRemaining} tr{triesRemaining === 1 ? "y" : "ies"} left
            </span>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        If you need to update your enrollment information, describe what needs to change and submit a request for admin review.{" "}
        <span className={triesRemaining === 1 ? "text-red-400 font-bold" : "text-amber-400 font-semibold"}>
          Each submission (approved or rejected) consumes one try.
        </span>
      </p>

      {/* ── Letter template picker ── */}
      <div>
        <button
          type="button"
          onClick={() => setShowTemplates(v => !v)}
          className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-amber-400 hover:text-amber-300 transition-colors"
        >
          <Lightbulb size={11} />
          Use a letter template
          {showTemplates ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>

        {showTemplates && (
          <div className="mt-2 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
            {LETTER_TEMPLATES.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setReason(t.text); setShowTemplates(false) }}
                className="w-full text-left px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/8 hover:bg-white/8 hover:border-blue-500/20 transition-colors group"
              >
                <p className="text-[9px] font-black uppercase tracking-wider text-blue-400 group-hover:text-blue-300 mb-1">
                  {t.label}
                </p>
                <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed">{t.text}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Textarea */}
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="Describe what information needs to be corrected or updated…"
        maxLength={600}
        rows={5}
        className="w-full bg-white/5 border-2 border-white/8 rounded-2xl px-5 py-3 text-sm text-white placeholder-slate-700 font-medium outline-none focus:border-blue-500 transition-colors resize-none"
      />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-slate-700">{reason.length}/600</span>
          {triesRemaining === 1 && (
            <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">⚠ Last try</span>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={sending || !reason.trim()}
          className="flex items-center gap-2 h-10 px-6 rounded-2xl text-white text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 shadow-lg shadow-blue-900/30"
          style={{ background: "linear-gradient(135deg, #1d4ed8, #2563eb)" }}
        >
          {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Submit Request
        </button>
      </div>
    </div>
  )
}