// src/app/admin/applicants/components/AcceptConfirmModal.tsx
"use client"

import { memo, useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Check, X, AlertTriangle, FileText,
  ShieldCheck, GraduationCap, ZoomIn, Download, Loader2
} from "lucide-react"
import { OptimizedImage } from "./OptimizedImage"

interface AcceptConfirmModalProps {
  student: any
  isOpen: boolean
  isDarkMode: boolean
  onClose: () => void
  onConfirm: (category: string, checks: Record<string, boolean>, isPayee: boolean) => void
}

const VOUCHER_STATUSES = [
  "Category A,B,C - 100% Voucher",
  "Category D,E - 80% Voucher",
]

function getGroupedCategory(category: string | null) {
  const cat = (category || "").toLowerCase()
  if (cat.includes("esc") || cat.includes("private") || cat.includes("category d") || cat.includes("category e") || cat.includes("d, e") || cat.includes("80%")) {
    return "Category D,E - 80% Voucher"
  }
  return "Category A,B,C - 100% Voucher"
}

// ── Inline Document Viewer (adapted from archive) ────────────────────
function DocViewer({ docs, initialIndex, onClose }: {
  docs: { url: string; label: string }[]
  initialIndex: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(initialIndex)
  const current = docs[idx] ?? docs[0]
  const isPDF = current?.url?.toLowerCase().endsWith(".pdf")
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    try {
      setDownloading(true)
      const res = await fetch(current.url)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = objectUrl
      const ext = current.url.split('.').pop()?.split('?')[0] || "png"
      a.download = `${current.label.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)
    } catch {
      window.open(current.url, "_blank")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-3 animate-in zoom-in duration-300" style={{ background: "rgba(0,0,0,0.92)" }} onClick={onClose}>
      <div className="relative w-full max-w-5xl h-full flex flex-col gap-2 sm:gap-4" onClick={e => e.stopPropagation()}>
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 px-1 sm:px-2">
          <div className="flex flex-col min-w-0">
            <p className="text-white/40 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em]">Document Verification</p>
            <p className="text-white text-xs sm:text-sm font-black uppercase tracking-widest truncate">{current.label}</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button onClick={handleDownload} disabled={downloading} className="h-8 sm:h-10 px-2.5 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 disabled:opacity-50">
              {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              <span className="hidden sm:inline">{downloading ? "..." : "Download"}</span>
            </button>
            <button onClick={onClose} className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Document Display */}
        <div className="flex-1 bg-black/40 rounded-2xl sm:rounded-[32px] overflow-hidden border border-white/5 relative">
          {isPDF
            ? <iframe src={current.url} className="w-full h-full border-none" title={current.label} />
            : <div className="w-full h-full flex items-center justify-center p-2 sm:p-4">
                <img src={current.url} alt={current.label} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
              </div>
          }

          {/* Nav Arrows */}
          {docs.length > 1 && <>
            <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white disabled:opacity-0 transition-all">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => setIdx(i => Math.min(docs.length - 1, i + 1))} disabled={idx === docs.length - 1}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white disabled:opacity-0 transition-all">
              <ChevronRight size={20} />
            </button>
          </>}
        </div>

        {/* Thumbnail bar */}
        {docs.length > 1 && (
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 sm:py-2 px-1 justify-center">
            {docs.map((d, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${i === idx ? "bg-blue-600 border-blue-400 text-white shadow-lg" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"}`}>
                {d.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export const AcceptConfirmModal = memo(function AcceptConfirmModal({
  student,
  isOpen,
  isDarkMode,
  onClose,
  onConfirm,
}: AcceptConfirmModalProps) {
  const [voucherStatus, setVoucherStatus] = useState((student as any)?.voucher_status || student?.student_category || "CATEGORY A - JHS Graduate")
  const [payeeOverride, setPayeeOverride] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [checks, setChecks] = useState({
    lrn_verified: false,
    voucher_cert: false,
    shs_vms: false,
  })
  const [viewingDocIndex, setViewingDocIndex] = useState<number | null>(null)

  // Reset state when student changes
  useEffect(() => {
    if (student) {
      const initialStatus = (student as any)?.voucher_status || student?.student_category
      setVoucherStatus(initialStatus === "Category D,E - 80% Voucher" || initialStatus === "Category A,B,C - 100% Voucher" ? initialStatus : getGroupedCategory(initialStatus))
      setChecks({ lrn_verified: false, voucher_cert: false, shs_vms: false })
      setStatusOpen(false)
      setViewingDocIndex(null)
      setPayeeOverride((student as any)?.is_payee || false)
    }
  }, [student?.id])

  const isPayee = payeeOverride
  const allChecked = checks.lrn_verified && (isPayee || (checks.voucher_cert && checks.shs_vms))

  const toggleCheck = (key: keyof typeof checks) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Gather document thumbnails
  const documents = useMemo(() => {
    if (!student) return []
    const docs: { url: string; label: string }[] = []
    const isJHS = student.student_category?.toLowerCase().includes("jhs") ||
                  student.student_category === "Standard" ||
                  student.student_category === "JHS Graduate"

    if (student.birth_certificate_url) docs.push({ url: student.birth_certificate_url, label: "Birth Cert" })
    if (isJHS) {
      if (student.form_138_url) docs.push({ url: student.form_138_url, label: "Form 138" })
      if (student.good_moral_url) docs.push({ url: student.good_moral_url, label: "Good Moral" })
    } else {
      if (student.cor_url) docs.push({ url: student.cor_url, label: "ALS Rating" })
      if (student.diploma_url) docs.push({ url: student.diploma_url, label: "Diploma" })
      if (student.af5_url) docs.push({ url: student.af5_url, label: "AF5" })
    }

    if (student.voucher_cert_url) {
      docs.push({ url: student.voucher_cert_url, label: "Voucher Cert" })
    }

    return docs
  }, [student])

  const profileUrl = student?.two_by_two_url || student?.profile_2x2_url || student?.profile_picture
  const studentName = student ? `${student.last_name}, ${student.first_name?.charAt(0)}.` : ""
  const initials = student ? `${(student.first_name || "")[0] || ""}${(student.last_name || "")[0] || ""}`.toUpperCase() : ""

  if (!isOpen || !student) return null

  return (
    <>
      {/* Document Viewer overlay */}
      {viewingDocIndex !== null && documents.length > 0 && (
        <DocViewer
          docs={documents}
          initialIndex={viewingDocIndex}
          onClose={() => setViewingDocIndex(null)}
        />
      )}

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
        <div
          className={`pointer-events-auto w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 overflow-hidden max-h-[92vh] sm:max-h-[85vh] flex flex-col ${
            isDarkMode
              ? "bg-slate-900 border-slate-700/60"
              : "bg-white border-slate-200"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle for mobile */}
          <div className="sm:hidden flex justify-center pt-2 pb-1">
            <div className={`w-10 h-1 rounded-full ${isDarkMode ? "bg-slate-700" : "bg-slate-300"}`} />
          </div>

          {/* Header with student info */}
          <div className={`px-4 sm:px-6 pt-3 sm:pt-6 pb-3 sm:pb-4 shrink-0 ${isDarkMode ? "bg-slate-800/50" : "bg-slate-50"}`}>
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Profile picture */}
              <div className="relative shrink-0">
                {profileUrl ? (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/10">
                    <OptimizedImage
                      src={profileUrl}
                      alt={studentName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-base sm:text-lg font-black ring-2 ring-emerald-500/40 shadow-lg ${
                    isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-600"
                  }`}>
                    {initials}
                  </div>
                )}
                {/* OVAP badge */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <GraduationCap size={10} className="text-white" strokeWidth={3} />
                </div>
              </div>

              {/* Name & LRN */}
              <div className="min-w-0 flex-1">
                <h3 className={`text-sm sm:text-base font-black truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  {studentName}
                </h3>
                <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  LRN: {student.lrn || "Not provided"}
                </p>
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-200 text-slate-400"
                }`}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body — scrollable */}
          <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0">

            {/* Document thumbnails */}
            {documents.length > 0 && (
              <div>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-2 sm:mb-2.5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                  <FileText size={10} className="inline mr-1.5 -mt-0.5" />
                  Submitted Documents — tap to verify
                </p>
                <div className="flex gap-2 flex-wrap">
                  {documents.map((doc, i) => (
                    <div
                      key={doc.label}
                      onClick={() => setViewingDocIndex(i)}
                      className={`group relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer hover:scale-105 active:scale-95 hover:shadow-lg ${
                        isDarkMode ? "border-slate-700 hover:border-emerald-500/50" : "border-slate-200 hover:border-emerald-400"
                      }`}
                    >
                      {doc.url.toLowerCase().endsWith(".pdf") ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/10">
                          <FileText size={16} className="text-red-400" />
                          <p className="text-[6px] font-black uppercase text-red-400 mt-0.5">PDF</p>
                        </div>
                      ) : (
                        <OptimizedImage
                          src={doc.url}
                          alt={doc.label}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className={`absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity`}>
                        <ZoomIn className="text-white" size={14} />
                      </div>
                      <div className={`absolute inset-x-0 bottom-0 py-0.5 text-center text-[6px] sm:text-[7px] font-black uppercase tracking-wider ${
                        isDarkMode ? "bg-slate-900/80 text-slate-300" : "bg-white/80 text-slate-700"
                      }`}>
                        {doc.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payee Override Toggle */}
            <div className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl border border-dashed transition-all ${
              payeeOverride
                ? isDarkMode ? "bg-amber-950/20 border-amber-500/30" : "bg-amber-50 border-amber-300"
                : isDarkMode ? "border-slate-800" : "border-slate-200"
            }`}>
              <div className="space-y-0.5">
                <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? "text-slate-355" : "text-slate-855"}`}>
                  PAYEE only. No Voucher.
                </p>
                <p className="text-[8px] sm:text-[9px] text-slate-500">Forces student to pay full tuition fee (removes voucher discount)</p>
              </div>
              <input 
                type="checkbox" 
                checked={payeeOverride} 
                onChange={(e) => {
                  setPayeeOverride(e.target.checked)
                }}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 bg-transparent cursor-pointer"
              />
            </div>

            {/* Voucher Category selector */}
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                Voucher Category
              </p>
              <div className="relative">
                <Button
                  onClick={() => setStatusOpen(!statusOpen)}
                  className={`w-full justify-between h-10 sm:h-11 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-wider px-3 sm:px-4 border transition-all ${
                    isDarkMode
                      ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-750 hover:border-emerald-500/30"
                      : "bg-white border-slate-200 text-slate-900 hover:bg-slate-50 hover:border-emerald-400"
                  }`}
                  variant="ghost"
                >
                  {voucherStatus}
                  <ChevronDown size={14} className={`transition-transform duration-300 ${statusOpen ? "rotate-180" : ""}`} />
                </Button>
                {statusOpen && (
                  <div className={`absolute top-full left-0 w-full mt-2 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ${
                    isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                  }`}>
                    <div className="p-1.5 space-y-0.5">
                      {VOUCHER_STATUSES.map((vs) => (
                        <button
                          key={vs}
                          onClick={() => { setVoucherStatus(vs); setStatusOpen(false) }}
                          className={`w-full flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors text-left ${
                            voucherStatus === vs
                              ? isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                              : isDarkMode ? "text-slate-400 hover:bg-slate-700 hover:text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          {vs} {voucherStatus === vs && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Verification Checklist */}
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-2 sm:mb-3 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                <ShieldCheck size={10} className="inline mr-1.5 -mt-0.5" />
                Verification Checklist
              </p>
              <div className="space-y-1.5 sm:space-y-2">
                {[
                  { key: "lrn_verified" as const, label: "LRN matches Grade 10 report card", required: true },
                  { key: "voucher_cert" as const, label: isPayee ? "No voucher certificate required (Payee)" : "Voucher certificate verified", required: !isPayee },
                  { key: "shs_vms" as const, label: isPayee ? "No SHS VMS registration required (Payee)" : "Registered in SHS VMS", required: !isPayee },
                ].map(({ key, label, required }) => {
                  const isChecked = checks[key] || !required
                  const isDisabled = !required
                  return (
                    <button
                      key={key}
                      onClick={() => { if (!isDisabled) toggleCheck(key) }}
                      className={`w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border transition-all text-left group ${
                        isChecked
                          ? isDarkMode
                            ? "bg-emerald-900/20 border-emerald-500/30 text-emerald-300"
                            : "bg-emerald-50 border-emerald-300 text-emerald-700"
                          : isDarkMode
                            ? "bg-slate-800/50 border-slate-700/60 text-slate-400 hover:border-slate-600"
                            : "bg-white border-slate-200 text-slate-555 hover:border-slate-300"
                      } ${isDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                        isChecked
                          ? "bg-emerald-500 border-emerald-500"
                          : isDarkMode
                            ? "border-slate-600 group-hover:border-slate-500"
                            : "border-slate-300 group-hover:border-slate-400"
                      }`}>
                        <Check size={12} className={isChecked ? "text-white" : "text-transparent"} strokeWidth={3} />
                      </div>
                      <span className={`text-[9px] sm:text-[10px] font-bold tracking-widest uppercase`}>
                        {label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Warning */}
            {!allChecked && (
              <div className={`flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border animate-in fade-in duration-200 ${
                isDarkMode
                  ? "bg-amber-900/15 border-amber-500/25 text-amber-400"
                  : "bg-amber-50 border-amber-200 text-amber-700"
              }`}>
                <AlertTriangle size={13} className="shrink-0" />
                <p className="text-[9px] sm:text-[10px] font-bold">Revenue won&apos;t count until all items are checked</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3 border-t shrink-0 ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
            <Button
              onClick={onClose}
              variant="ghost"
              className={`flex-1 h-11 sm:h-12 rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all ${
                isDarkMode
                  ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                let dbCategory = voucherStatus
                if (voucherStatus.includes("Category A,B,C")) dbCategory = "CATEGORY A, B, C"
                if (voucherStatus.includes("Category D,E")) dbCategory = "CATEGORY D, E"
                onConfirm(dbCategory, checks, payeeOverride)
              }}
              className={`flex-1 h-11 sm:h-12 rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest shadow-xl transition-all ${
                allChecked
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/25"
                  : "bg-gradient-to-r from-emerald-500/60 to-emerald-600/60 text-white/80 shadow-emerald-500/10"
              }`}
            >
              <CheckCircle2 size={13} className="mr-1.5" />
              Confirm & Accept
            </Button>
          </div>
        </div>
      </div>
    </>
  )
})
