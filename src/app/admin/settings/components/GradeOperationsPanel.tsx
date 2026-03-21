"use client"

import { useState } from "react"
import {
  Archive, ArchiveRestore, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Loader2, ArrowRight,
  GraduationCap, BookMarked, ChevronDown, ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  archiveCurrentYear,
  unarchiveCurrentYear,
  increaseGradeLevel,
  decreaseGradeLevel,
} from "@/lib/actions/gradeOperations"

interface Props {
  isDarkMode: boolean
  schoolYear: string
}

type OperationKey = "archive" | "unarchive" | "increase" | "decrease"

interface Operation {
  key: OperationKey
  label: string
  sublabel: string
  icon: React.ReactNode
  color: string        // tailwind bg color for icon box
  btnColor: string     // tailwind bg+hover for trigger button
  confirmTitle: string
  confirmBody: React.ReactNode
}

export function GradeOperationsPanel({ isDarkMode, schoolYear }: Props) {
  const [confirmOp, setConfirmOp] = useState<OperationKey | null>(null)
  const [loading, setLoading] = useState<OperationKey | null>(null)
  const [expanded, setExpanded] = useState(true)

  // Per-operation last result
  const [results, setResults] = useState<Record<string, string>>({})

  const bg = isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-sm"
  const text = isDarkMode ? "text-white" : "text-slate-800"
  const sub = isDarkMode ? "text-slate-400" : "text-slate-500"
  const infoBg = isDarkMode ? "bg-slate-800/50 text-slate-400 border border-slate-700" : "bg-slate-50 text-slate-500 border border-slate-200"

  // Theme-aware emphasis color for dialog body text
  const emphasisClass = isDarkMode ? "font-black text-white" : "font-black text-slate-900"

  const ops: Operation[] = [
    {
      key: "archive",
      label: "Archive Current Year",
      sublabel: "Archive all accepted students in this school year",
      icon: <Archive className="text-white w-5 h-5" />,
      color: "bg-blue-600 shadow-blue-500/20",
      btnColor: "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20",
      confirmTitle: "Archive S.Y. " + (schoolYear || "—"),
      confirmBody: (
        <span>
          All <span className="text-blue-400">Accepted / Approved</span> students in S.Y.{" "}
          <span className={emphasisClass}>{schoolYear}</span> will be marked as archived.
          They will no longer appear in Applicants or Enrolled pages, but will be permanently
          visible in the Archive page.
        </span>
      ),
    },
    {
      key: "unarchive",
      label: "Unarchive Current Year",
      sublabel: "Restore archived students back to active",
      icon: <ArchiveRestore className="text-white w-5 h-5" />,
      color: "bg-emerald-600 shadow-emerald-500/20",
      btnColor: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20",
      confirmTitle: "Unarchive S.Y. " + (schoolYear || "—"),
      confirmBody: (
        <span>
          All archived students in S.Y.{" "}
          <span className={emphasisClass}>{schoolYear}</span> will be restored to active
          status and will reappear in Applicants and Enrolled pages.
        </span>
      ),
    },
    {
      key: "increase",
      label: "Increase Grade Level",
      sublabel: "G11 → G12 · G12 graduates → Archive",
      icon: <TrendingUp className="text-white w-5 h-5" />,
      color: "bg-violet-600 shadow-violet-500/20",
      btnColor: "bg-violet-600 hover:bg-violet-700 shadow-violet-500/20",
      confirmTitle: "Increase Grade Level",
      confirmBody: (
        <span>
          <span className="text-violet-400">Grade 11</span> students will be promoted to{" "}
          <span className={emphasisClass}>Grade 12</span> (sections cleared, ready for reassignment).{" "}
          <span className="text-amber-400">Grade 12</span> students will be permanently archived
          (they have completed SHS). G11 students enrolled 2+ years ago will also be archived as overage.
        </span>
      ),
    },
    {
      key: "decrease",
      label: "Decrease Grade Level",
      sublabel: "G12 → G11 · Sections cleared",
      icon: <TrendingDown className="text-white w-5 h-5" />,
      color: "bg-orange-600 shadow-orange-500/20",
      btnColor: "bg-orange-600 hover:bg-orange-700 shadow-orange-500/20",
      confirmTitle: "Decrease Grade Level",
      confirmBody: (
        <span>
          All active <span className="text-orange-400">Grade 12</span> students will be moved back to{" "}
          <span className={emphasisClass}>Grade 11</span>. Their sections will be cleared
          and they will need to be reassigned to G11 sections.
        </span>
      ),
    },
  ]

  const handleConfirm = async () => {
    if (!confirmOp) return
    setLoading(confirmOp)
    setConfirmOp(null)
    const toastId = toast.loading("Processing...")

    try {
      let msg = ""

      if (confirmOp === "archive") {
        const res = await archiveCurrentYear()
        if (!res.success) throw new Error(res.error)
        msg = `Archived ${res.archived} student(s) from S.Y. ${schoolYear}.`
        setResults((r) => ({ ...r, archive: msg }))

      } else if (confirmOp === "unarchive") {
        const res = await unarchiveCurrentYear()
        if (!res.success) throw new Error(res.error)
        msg = `Unarchived ${res.unarchived} student(s) in S.Y. ${schoolYear}.${res.skippedLocked > 0 ? ` ${res.skippedLocked} locked graduate(s) were skipped.` : ""}`
        setResults((r) => ({ ...r, unarchive: msg }))

      } else if (confirmOp === "increase") {
        const res = await increaseGradeLevel()
        if (!res.success) throw new Error(res.error)
        msg = `${res.promotedToG12} student(s) promoted to G12. ${res.archivedG12} G12 graduate(s) archived. ${res.overAge > 0 ? `${res.overAge} overage student(s) also archived.` : ""}`
        setResults((r) => ({ ...r, increase: msg }))

      } else if (confirmOp === "decrease") {
        const res = await decreaseGradeLevel()
        if (!res.success) throw new Error(res.error)
        msg = `${res.demoted} student(s) moved back to Grade 11.`
        setResults((r) => ({ ...r, decrease: msg }))
      }

      toast.success(msg, { id: toastId, duration: 7000 })
    } catch (err: any) {
      toast.error(err?.message || "Operation failed.", { id: toastId })
    } finally {
      setLoading(null)
    }
  }

  const activeOp = ops.find((o) => o.key === confirmOp)

  return (
    <div className={`rounded-[32px] border p-6 md:p-8 space-y-5 transition-colors duration-500 ${bg}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-700 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
            <GraduationCap className="text-white w-6 h-6" />
          </div>
          <div className="text-left">
            <h3 className={`font-black text-sm uppercase tracking-widest ${text}`}>
              Grade Operations
            </h3>
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5 ${sub}`}>
              Archive · Promote · Demote — S.Y. {schoolYear || "—"}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={18} className={sub} />
        ) : (
          <ChevronDown size={18} className={sub} />
        )}
      </button>

      {expanded && (
        <>
          {/* Info block */}
          <div className={`rounded-2xl p-4 space-y-2 text-[10px] font-bold uppercase tracking-wider leading-relaxed ${infoBg}`}>
            <p className="flex items-start gap-2">
              <ArrowRight size={12} className="text-blue-500 mt-0.5 shrink-0" />
              <span><span className="text-blue-400">Archive</span> — moves accepted students out of Applicants/Enrolled into Archive permanently for this S.Y.</span>
            </p>
            <p className="flex items-start gap-2">
              <ArrowRight size={12} className="text-emerald-500 mt-0.5 shrink-0" />
              <span><span className="text-emerald-400">Unarchive</span> — restores archived students back to active for this S.Y.</span>
            </p>
            <p className="flex items-start gap-2">
              <ArrowRight size={12} className="text-violet-500 mt-0.5 shrink-0" />
              <span><span className="text-violet-400">Increase Grade Level</span> — G11 → G12 (sections cleared). G12 graduates → permanently archived. Overage G11 (2+ years) → archived.</span>
            </p>
            <p className="flex items-start gap-2">
              <ArrowRight size={12} className="text-orange-500 mt-0.5 shrink-0" />
              <span><span className="text-orange-400">Decrease Grade Level</span> — G12 → G11 (sections cleared).</span>
            </p>
          </div>

          {/* Operation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ops.map((op) => (
              <div
                key={op.key}
                className={`rounded-2xl p-4 border space-y-3 ${
                  isDarkMode ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 ${op.color} rounded-xl flex items-center justify-center shadow-lg shrink-0`}>
                    {op.icon}
                  </div>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${text}`}>
                      {op.label}
                    </p>
                    <p className={`text-[9px] font-bold mt-0.5 ${sub}`}>{op.sublabel}</p>
                  </div>
                </div>

                {/* Last result for this op */}
                {results[op.key] && (
                  <div className={`rounded-xl p-2 flex items-start gap-2 ${
                    isDarkMode ? "bg-slate-700/50" : "bg-white border border-slate-200"
                  }`}>
                    <CheckCircle2 size={12} className="text-green-500 shrink-0 mt-0.5" />
                    <p className={`text-[9px] font-bold ${sub}`}>{results[op.key]}</p>
                  </div>
                )}

                <Button
                  onClick={() => setConfirmOp(op.key)}
                  disabled={loading !== null || !schoolYear}
                  className={`w-full h-9 rounded-xl ${op.btnColor} text-white font-black text-[9px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-1.5`}
                >
                  {loading === op.key ? (
                    <><Loader2 size={12} className="animate-spin" /> Processing...</>
                  ) : (
                    <>{op.icon} {op.label}</>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Confirm Dialog */}
      {confirmOp && activeOp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className={`rounded-[32px] p-8 max-w-md w-full mx-4 shadow-2xl border space-y-6 ${
              isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${activeOp.color} rounded-2xl flex items-center justify-center shrink-0 shadow-lg`}>
                {activeOp.icon}
              </div>
              <div>
                <h4 className={`font-black text-sm uppercase tracking-widest ${text}`}>
                  {activeOp.confirmTitle}
                </h4>
                <p className={`text-[10px] mt-0.5 ${sub}`}>This action will affect student records.</p>
              </div>
            </div>

            <div className={`rounded-2xl p-4 text-[11px] font-bold leading-relaxed ${
              isDarkMode ? "bg-slate-800/50 text-slate-300" : "bg-slate-50 text-slate-600"
            }`}>
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <span className="text-amber-500 font-black text-[10px] uppercase tracking-widest">Confirm Action</span>
              </div>
              {activeOp.confirmBody}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setConfirmOp(null)}
                variant="outline"
                className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                className={`flex-1 h-12 rounded-2xl ${activeOp.btnColor} text-white font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2`}
              >
                <BookMarked size={14} />
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}