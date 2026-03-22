"use client"

import { useArchive } from "./hooks/useArchive"
import { useTheme } from "@/hooks/useTheme"
import { useState, useEffect, Suspense, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Archive, Search, Download, ChevronLeft, ChevronRight,
  Loader2, Filter, BookOpen, Cpu, GraduationCap,
  X, User, Mail, Phone, MapPin, Calendar, BookMarked,
  FileText, ZoomIn, School, Shield, ArchiveRestore,
  ChevronDown, ChevronUp, ExternalLink, Users, Star,
  Sparkles, Award, Lock, Eye,
} from "lucide-react"
import { themeColors } from "@/lib/themeColors"
import { toast } from "sonner"
import { unarchiveSingleStudent } from "@/lib/actions/gradeOperations"
import { lockGraduatedStudents, unlockGraduatedStudents, getGraduateLockState } from "@/lib/actions/archive"

// ── Document Viewer Modal ──────────────────────────────────────────────────
function DocViewerModal({ url, label, isDarkMode, onClose, allDocs, initialIndex }: {
  url: string; label: string; isDarkMode: boolean
  onClose: () => void; allDocs: { url: string; label: string }[]; initialIndex: number
}) {
  const [idx, setIdx] = useState(initialIndex)
  const current = allDocs[idx] ?? { url, label }
  const isPDF = current.url.toLowerCase().endsWith(".pdf")

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6" style={{ background: "rgba(0,0,0,0.97)" }} onClick={onClose}>
      <div className="relative w-full max-w-4xl flex flex-col gap-3" onClick={e => e.stopPropagation()}>
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-white text-[10px] font-black uppercase tracking-widest truncate max-w-[50%]">{current.label}</p>
          <div className="flex items-center gap-2">
            <a href={current.url} download className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest transition-colors">
              <Download size={12} /> Download
            </a>
            <a href={current.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-[9px] font-black uppercase tracking-widest transition-colors">
              <ExternalLink size={12} /> Open
            </a>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>
        {/* Document */}
        <div className="rounded-2xl overflow-hidden" style={{ maxHeight: "72vh" }}>
          {isPDF
            ? <iframe src={current.url} className="w-full rounded-2xl" style={{ height: "72vh" }} title={current.label} />
            : <img src={current.url} alt={current.label} className="w-full object-contain rounded-2xl" style={{ maxHeight: "72vh" }} />
          }
        </div>
        {/* Nav tabs */}
        {allDocs.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {allDocs.map((d, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors ${i === idx ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"}`}>
                {d.label}
              </button>
            ))}
          </div>
        )}
        {allDocs.length > 1 && <>
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white disabled:opacity-30 transition-colors"><ChevronLeft size={18} /></button>
          <button onClick={() => setIdx(i => Math.min(allDocs.length - 1, i + 1))} disabled={idx === allDocs.length - 1} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white disabled:opacity-30 transition-colors"><ChevronRight size={18} /></button>
        </>}
      </div>
    </div>
  )
}

// ── Inline document card ───────────────────────────────────────────────────
function DocCard({ label, url, onOpen, isDarkMode }: { label: string; url: string | null; onOpen: (url: string, label: string) => void; isDarkMode: boolean }) {
  const tc = isDarkMode ? themeColors.dark : themeColors.light
  if (!url) return (
    <div className="p-3 rounded-2xl border border-dashed flex flex-col items-center justify-center opacity-40 h-28" style={{ backgroundColor: isDarkMode ? "rgba(15,23,42,0.6)" : "#f8fafc", borderColor: tc.border }}>
      <FileText size={18} className="text-slate-400 mb-1" />
      <p className="text-[8px] font-black text-center uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  )
  const isPDF = url.toLowerCase().endsWith(".pdf")
  return (
    <div onClick={() => onOpen(url, label)} className="cursor-pointer group">
      <div className="p-1.5 rounded-2xl border hover:border-blue-400 hover:shadow-xl transition-all relative overflow-hidden" style={{ backgroundColor: isDarkMode ? "rgba(15,23,42,0.6)" : "#fff", borderColor: tc.border }}>
        <div className="h-24 rounded-xl overflow-hidden relative" style={{ backgroundColor: isDarkMode ? "rgba(30,41,59,0.8)" : "#f1f5f9" }}>
          {isPDF
            ? <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/10"><FileText size={24} className="text-red-400" /><p className="text-[8px] font-black uppercase text-red-400 mt-1">PDF</p></div>
            : <img src={url} alt={label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
          }
          <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><ZoomIn className="text-white" size={18} /></div>
        </div>
        <p className="text-[8px] font-black text-center mt-2 uppercase tracking-widest px-1 truncate" style={{ color: tc.text.secondary }}>{label}</p>
      </div>
    </div>
  )
}

// ── Grade level badge ────────────────────────────────────────────────────────
function GradeBadge({ gradeLevel, sectionId, isDarkMode }: { gradeLevel: string; sectionId?: string | null; isDarkMode: boolean }) {
  if (gradeLevel === "12" && !sectionId) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 text-amber-400">
        <Award size={9} /> Graduated
      </span>
    )
  }
  if (gradeLevel === "12") {
    return <Badge className="text-[8px] font-black uppercase border-none bg-purple-500/10 text-purple-400">G12</Badge>
  }
  return <Badge className="text-[8px] font-black uppercase border-none bg-slate-500/10 text-slate-400">G{gradeLevel || "11"}</Badge>
}

// ── Archive Dossier Drawer ─────────────────────────────────────────────────
function ArchiveDossier({ student, isDarkMode, onClose, onUnarchive }: {
  student: any; isDarkMode: boolean; onClose: () => void; onUnarchive: (id: string) => void
}) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerDocs, setViewerDocs] = useState<{ url: string; label: string }[]>([])
  const [viewerUrl, setViewerUrl] = useState("")
  const [viewerLabel, setViewerLabel] = useState("")
  const [viewerIndex, setViewerIndex] = useState(0)
  const [unarchiving, setUnarchiving] = useState(false)
  const [infoOpen, setInfoOpen] = useState(true)
  const [guardianOpen, setGuardianOpen] = useState(false)
  const tc = isDarkMode ? themeColors.dark : themeColors.light

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [])

  const isGraduated = student.grade_level === "12" && !student.section_id
  const isJHS = student.student_category === "JHS Graduate"
  const isALS = student.student_category === "ALS Passer"
  const photo = student.two_by_two_url || null
  const pfpFallback = student.profile_picture || null

  // G11 section: use saved g11_section field if student was promoted; else current section
  const g11SectionName = student.g11_section || (student.grade_level === "11" ? student.section : null)
  const g12SectionName = student.grade_level === "12" ? (isGraduated ? (student.section || "Unassigned") : (student.section || "Unassigned")) : null

  const allDocs: { url: string; label: string }[] = []
  if (isJHS) {
    if (student.form_138_url) allDocs.push({ url: student.form_138_url, label: "Form 138" })
    if (student.good_moral_url) allDocs.push({ url: student.good_moral_url, label: "Good Moral" })
    if (student.two_by_two_url) allDocs.push({ url: student.two_by_two_url, label: "2x2 Photo" })
    if (student.birth_certificate_url) allDocs.push({ url: student.birth_certificate_url, label: "Birth Cert" })
  } else if (isALS) {
    if (student.cor_url) allDocs.push({ url: student.cor_url, label: "COR" })
    if (student.af5_url) allDocs.push({ url: student.af5_url, label: "AF5" })
    if (student.diploma_url) allDocs.push({ url: student.diploma_url, label: "Diploma" })
    if (student.two_by_two_url) allDocs.push({ url: student.two_by_two_url, label: "2x2 Photo" })
    if (student.birth_certificate_url) allDocs.push({ url: student.birth_certificate_url, label: "Birth Cert" })
  } else {
    if (student.form_138_url) allDocs.push({ url: student.form_138_url, label: "Form 138" })
    if (student.good_moral_url) allDocs.push({ url: student.good_moral_url, label: "Good Moral" })
    if (student.two_by_two_url) allDocs.push({ url: student.two_by_two_url, label: "2x2 Photo" })
  }

  const openDoc = (url: string, label: string) => {
    const i = allDocs.findIndex(d => d.url === url && d.label === label)
    setViewerUrl(url); setViewerLabel(label); setViewerDocs(allDocs); setViewerIndex(i >= 0 ? i : 0); setViewerOpen(true)
  }

  const handleUnarchive = async () => {
    setUnarchiving(true)
    try {
      const res = await unarchiveSingleStudent(student.id)
      if (res.success) { toast.success(`${student.first_name} ${student.last_name} restored.`); onUnarchive(student.id); onClose() }
      else toast.error(res.error || "Failed to unarchive.")
    } finally { setUnarchiving(false) }
  }

  // Accent colors based on status
  const accentFrom = isGraduated ? "rgba(251,191,36,0.18)" : "rgba(59,130,246,0.14)"
  const accentTo   = isGraduated ? "rgba(245,158,11,0.04)" : "rgba(139,92,246,0.04)"
  const photoBorder = isGraduated ? "rgba(251,191,36,0.55)" : "rgba(99,102,241,0.45)"

  return (<>
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full sm:max-w-[440px] h-full flex flex-col overflow-hidden shadow-2xl"
        style={{ backgroundColor: isDarkMode ? "rgb(6,9,20)" : "#f8fafc" }}>

        <div className="flex-1 overflow-y-auto flex flex-col">

          {/* ── HERO: gradient banner + 2x2 focal point ── */}
          <div className="relative overflow-hidden flex flex-col items-center pb-6"
            style={{ background: `linear-gradient(175deg, ${accentFrom} 0%, ${accentTo} 55%, transparent 100%)` }}>

            {/* Top control bar */}
            <div className="w-full px-5 pt-5 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shadow ${isGraduated ? "bg-gradient-to-br from-amber-400 to-yellow-500" : "bg-blue-600"}`}>
                  {isGraduated ? <Award className="text-white w-3.5 h-3.5" /> : <Archive className="text-white w-3.5 h-3.5" />}
                </div>
                <div>
                  <p className="text-[7.5px] font-black uppercase tracking-[0.22em] leading-none" style={{ color: tc.text.muted }}>
                    {isGraduated ? "Graduated Record" : "Archived Record"}
                  </p>
                  <p className="text-[10px] font-black leading-none mt-0.5" style={{ color: tc.text.secondary }}>{student.school_year}</p>
                </div>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-2xl flex items-center justify-center transition-all hover:scale-105"
                style={{ backgroundColor: isDarkMode ? "rgba(51,65,85,0.55)" : "rgba(0,0,0,0.07)" }}>
                <X size={14} style={{ color: tc.text.muted }} />
              </button>
            </div>

            {/* 2x2 Photo — primary focal point */}
            <div className="mt-4 relative">
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-3xl blur-xl opacity-40"
                style={{ background: isGraduated ? "radial-gradient(circle, rgba(251,191,36,0.7), transparent 70%)" : "radial-gradient(circle, rgba(99,102,241,0.6), transparent 70%)" }} />
              <div
                className="relative w-[120px] h-[150px] rounded-3xl overflow-hidden border-[2.5px] shadow-2xl cursor-pointer group"
                style={{ borderColor: photoBorder, backgroundColor: isDarkMode ? "rgba(30,41,59,0.9)" : "#e2e8f0" }}
                onClick={() => { const url = photo || pfpFallback; if (url) openDoc(url, "2x2 Photo") }}
              >
                {photo || pfpFallback
                  ? <img src={photo || pfpFallback!} alt="2x2 Photo"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  : <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <User size={32} className="text-slate-400" />
                      <p className="text-[7px] font-black uppercase tracking-widest text-slate-500">No Photo</p>
                    </div>
                }
                {/* Hover overlay */}
                {(photo || pfpFallback) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ZoomIn size={22} className="text-white" />
                  </div>
                )}
              </div>

              {/* Graduate star badge */}
              {isGraduated && (
                <div className="absolute -top-2.5 -right-2.5 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg border-2"
                  style={{ borderColor: isDarkMode ? "rgb(6,9,20)" : "#f8fafc" }}>
                  <Star size={14} className="text-white fill-white" />
                </div>
              )}
            </div>

            {/* Identity */}
            <div className="mt-4 text-center px-5">
              <h2 className="text-[19px] font-black uppercase leading-tight" style={{ color: tc.text.primary }}>
                {student.last_name},
              </h2>
              <h2 className="text-[19px] font-black uppercase leading-tight" style={{ color: tc.text.primary }}>
                {student.first_name}{student.middle_name ? ` ${student.middle_name[0]}.` : ""}
              </h2>
              <p className="font-mono text-[9px] font-bold tracking-[0.2em] mt-1.5" style={{ color: tc.text.muted }}>
                LRN: {student.lrn}
              </p>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-1.5 justify-center mt-3 px-5">
              {isGraduated
                ? <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[8px] font-black uppercase bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 text-amber-400 tracking-widest">
                    <Award size={9} /> Graduated
                  </span>
                : <Badge className="text-[8px] font-black uppercase border-none bg-emerald-500/15 text-emerald-500 px-3 py-1">
                    {student.status === "Approved" ? "Accepted" : student.status}
                  </Badge>
              }
              <Badge className={`text-[8px] font-black uppercase border-none px-3 py-1 ${student.gender === "Male" ? "bg-blue-500/10 text-blue-400" : "bg-pink-500/10 text-pink-400"}`}>
                {student.gender}
              </Badge>
              <Badge className="text-[8px] font-black uppercase border-none bg-violet-500/10 text-violet-400 px-3 py-1">
                {student.strand}
              </Badge>
              {isGraduated && student.graduate_lock && (
                <Badge className="text-[8px] font-black uppercase border-none bg-red-500/10 text-red-400 px-3 py-1 flex items-center gap-1">
                  <Lock size={8} /> Locked
                </Badge>
              )}
            </div>
          </div>

          {/* ── Body ── */}
          <div className="px-4 py-4 space-y-3">

            {/* Action button */}
            {!isGraduated ? (
              <button onClick={handleUnarchive} disabled={unarchiving}
                className="w-full h-11 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-60 text-white shadow-lg shadow-emerald-500/20">
                {unarchiving ? <Loader2 size={14} className="animate-spin" /> : <ArchiveRestore size={14} />}
                {unarchiving ? "Restoring..." : "Restore to Active Enrollment"}
              </button>
            ) : student.graduate_lock ? (
              <div className="w-full h-11 rounded-2xl flex items-center justify-center gap-2 border border-amber-500/30 cursor-not-allowed"
                style={{ background: "rgba(251,191,36,0.05)" }}>
                <Lock size={12} className="text-amber-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Locked Graduate — Cannot Restore</span>
              </div>
            ) : (
              <div className="w-full h-11 rounded-2xl flex items-center justify-center gap-2 border border-amber-500/25"
                style={{ background: "rgba(251,191,36,0.04)" }}>
                <Sparkles size={12} className="text-amber-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Completed Senior High School</span>
              </div>
            )}

            {/* ── Section History ── */}
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: tc.border }}>
              <div className="px-4 py-3 flex items-center gap-2 border-b"
                style={{ backgroundColor: isDarkMode ? "rgba(30,41,59,0.5)" : "#ffffff", borderColor: tc.border }}>
                <BookOpen size={11} style={{ color: tc.text.muted }} />
                <p className="text-[8.5px] font-black uppercase tracking-widest" style={{ color: tc.text.muted }}>Section History</p>
              </div>
              <div className="px-4 py-1" style={{ backgroundColor: isDarkMode ? "rgba(15,23,42,0.4)" : "#fafafa" }}>

                {/* G11 row */}
                <div className="flex items-center gap-3 py-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[8px] font-black border ${
                    g11SectionName
                      ? isDarkMode ? "bg-blue-500/15 text-blue-300 border-blue-500/25" : "bg-blue-50 text-blue-600 border-blue-200"
                      : isDarkMode ? "bg-slate-800/50 text-slate-600 border-slate-700/30" : "bg-slate-50 text-slate-300 border-slate-200"
                  }`}>G11</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[7.5px] font-bold uppercase tracking-widest" style={{ color: tc.text.muted }}>Grade 11 Section</p>
                    <p className="text-[13px] font-black mt-0.5 truncate" style={{ color: g11SectionName ? tc.text.primary : tc.text.muted }}>
                      {g11SectionName || "—"}
                    </p>
                  </div>
                  {g11SectionName && student.grade_level === "11" && (
                    <span className="shrink-0 text-[7px] font-black px-2 py-1 rounded-full bg-blue-500/15 text-blue-400 tracking-widest">Current</span>
                  )}
                  {g11SectionName && student.grade_level === "12" && (
                    <span className="shrink-0 text-[7px] font-black px-2 py-1 rounded-full bg-slate-500/10 text-slate-400 tracking-widest">Prev.</span>
                  )}
                </div>

                <div className="flex items-center pl-4 py-0.5">
                  <div className="w-[1px] h-5 rounded-full" style={{ backgroundColor: tc.border, marginLeft: "14px" }} />
                </div>

                {/* G12 row */}
                <div className="flex items-center gap-3 py-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[8px] font-black border ${
                    g12SectionName
                      ? isGraduated
                        ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/25"
                        : isDarkMode ? "bg-violet-500/15 text-violet-300 border-violet-500/25" : "bg-violet-50 text-violet-600 border-violet-200"
                      : isDarkMode ? "bg-slate-800/50 text-slate-600 border-slate-700/30" : "bg-slate-50 text-slate-300 border-slate-200"
                  }`}>G12</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[7.5px] font-bold uppercase tracking-widest" style={{ color: tc.text.muted }}>Grade 12 Section</p>
                    <p className="text-[13px] font-black mt-0.5 truncate" style={{ color: g12SectionName ? tc.text.primary : tc.text.muted }}>
                      {g12SectionName || "—"}
                    </p>
                  </div>
                  {isGraduated && (
                    <span className="shrink-0 text-[7px] font-black px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 tracking-widest">Grad</span>
                  )}
                  {!isGraduated && g12SectionName && (
                    <span className="shrink-0 text-[7px] font-black px-2 py-1 rounded-full bg-violet-500/15 text-violet-400 tracking-widest">Current</span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Enrollment Details ── */}
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: tc.border }}>
              <div className="px-4 py-3 flex items-center gap-2 border-b"
                style={{ backgroundColor: isDarkMode ? "rgba(30,41,59,0.5)" : "#ffffff", borderColor: tc.border }}>
                <GraduationCap size={11} style={{ color: tc.text.muted }} />
                <p className="text-[8.5px] font-black uppercase tracking-widest" style={{ color: tc.text.muted }}>Enrollment Details</p>
              </div>
              <div className="px-4 py-4 grid grid-cols-2 gap-x-4 gap-y-3.5"
                style={{ backgroundColor: isDarkMode ? "rgba(15,23,42,0.4)" : "#fafafa" }}>
                {[
                  { label: "School Year", val: student.school_year },
                  { label: "Grade Level", val: isGraduated ? "Graduated (G12)" : `Grade ${student.grade_level || "11"}` },
                  { label: "Category",    val: student.student_category || "—" },
                  { label: "GWA (G10)",   val: student.gwa_grade_10 ? String(student.gwa_grade_10) : "—" },
                  { label: "Shift",       val: student.preferred_shift || "—" },
                  { label: "Modality",    val: student.preferred_modality || "—" },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <p className="text-[7.5px] font-bold uppercase tracking-widest" style={{ color: tc.text.muted }}>{label}</p>
                    <p className="text-[12px] font-black mt-0.5" style={{ color: tc.text.primary }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Personal Info (collapsible) ── */}
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: tc.border }}>
              <button onClick={() => setInfoOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 transition-colors"
                style={{ backgroundColor: isDarkMode ? "rgba(30,41,59,0.5)" : "#ffffff" }}>
                <div className="flex items-center gap-2">
                  <User size={11} style={{ color: tc.text.muted }} />
                  <p className="text-[8.5px] font-black uppercase tracking-widest" style={{ color: tc.text.muted }}>Personal Info</p>
                </div>
                {infoOpen ? <ChevronUp size={13} style={{ color: tc.text.muted }} /> : <ChevronDown size={13} style={{ color: tc.text.muted }} />}
              </button>
              {infoOpen && (
                <div className="px-4 pb-4 pt-3 space-y-3"
                  style={{ backgroundColor: isDarkMode ? "rgba(15,23,42,0.4)" : "#fafafa" }}>
                  {[
                    { icon: <Calendar size={11} />, label: "Birth Date", val: student.birth_date ? new Date(student.birth_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : null },
                    { icon: <Shield size={11} />,   label: "Civil Status", val: student.civil_status },
                    { icon: <BookMarked size={11} />, label: "Religion", val: student.religion },
                    { icon: <MapPin size={11} />,   label: "Address", val: student.address },
                    { icon: <Mail size={11} />,     label: "Email", val: student.email },
                    { icon: <Phone size={11} />,    label: "Phone", val: student.phone || student.contact_no },
                    { icon: <School size={11} />,   label: "Last School Attended", val: student.last_school_attended },
                  ].filter(f => f.val).map(({ icon, label, val }) => (
                    <div key={label} className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0" style={{ color: tc.text.muted }}>{icon}</span>
                      <div>
                        <p className="text-[7.5px] font-bold uppercase tracking-widest" style={{ color: tc.text.muted }}>{label}</p>
                        <p className="text-[12px] font-bold mt-0.5 break-words leading-snug" style={{ color: tc.text.secondary }}>{val}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Guardian Info (collapsible) ── */}
            {(student.guardian_first_name || student.guardian_last_name || student.guardian_phone) && (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: tc.border }}>
                <button onClick={() => setGuardianOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 transition-colors"
                  style={{ backgroundColor: isDarkMode ? "rgba(30,41,59,0.5)" : "#ffffff" }}>
                  <div className="flex items-center gap-2">
                    <Users size={11} style={{ color: tc.text.muted }} />
                    <p className="text-[8.5px] font-black uppercase tracking-widest" style={{ color: tc.text.muted }}>Guardian / Parent</p>
                  </div>
                  {guardianOpen ? <ChevronUp size={13} style={{ color: tc.text.muted }} /> : <ChevronDown size={13} style={{ color: tc.text.muted }} />}
                </button>
                {guardianOpen && (
                  <div className="px-4 pb-4 pt-3 space-y-3"
                    style={{ backgroundColor: isDarkMode ? "rgba(15,23,42,0.4)" : "#fafafa" }}>
                    {[
                      { label: "Full Name", val: [student.guardian_first_name, student.guardian_middle_name, student.guardian_last_name].filter(Boolean).join(" ") },
                      { label: "Phone / Contact", val: student.guardian_phone || student.guardian_contact },
                    ].filter(f => f.val).map(({ label, val }) => (
                      <div key={label}>
                        <p className="text-[7.5px] font-bold uppercase tracking-widest" style={{ color: tc.text.muted }}>{label}</p>
                        <p className="text-[12px] font-black mt-0.5" style={{ color: tc.text.primary }}>{val}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Documents ── */}
            {allDocs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 px-0.5">
                  <FileText size={11} style={{ color: tc.text.muted }} />
                  <p className="text-[8.5px] font-black uppercase tracking-widest" style={{ color: tc.text.muted }}>
                    Documents ({allDocs.length})
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {allDocs.map(doc => <DocCard key={doc.label} label={doc.label} url={doc.url} onOpen={openDoc} isDarkMode={isDarkMode} />)}
                </div>
              </div>
            )}

            <div className="h-6" />
          </div>
        </div>
      </div>
    </div>
    {viewerOpen && <DocViewerModal url={viewerUrl} label={viewerLabel} isDarkMode={isDarkMode} onClose={() => setViewerOpen(false)} allDocs={viewerDocs} initialIndex={viewerIndex} />}
  </>)
}

// ── Confirmation Modal ─────────────────────────────────────────────────────
function ConfirmModal({ isDarkMode, title, description, confirmLabel, confirmClass, onConfirm, onCancel }: {
  isDarkMode: boolean
  title: string
  description: string
  confirmLabel: string
  confirmClass: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const tc = isDarkMode ? themeColors.dark : themeColors.light
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
      onClick={onCancel}>
      <div className="w-full max-w-sm rounded-3xl border overflow-hidden shadow-2xl"
        style={{ backgroundColor: isDarkMode ? "rgb(10,15,28)" : "#fff", borderColor: tc.border }}
        onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4">
          <p className="text-sm font-black uppercase tracking-tight" style={{ color: tc.text.primary }}>{title}</p>
          <p className="text-[11px] mt-2 leading-relaxed" style={{ color: tc.text.secondary }}>{description}</p>
        </div>
        <div className="px-6 pb-6 flex gap-2 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors"
            style={{ borderColor: tc.border, color: tc.text.muted, backgroundColor: "transparent" }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all ${confirmClass}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main archive content ───────────────────────────────────────────────────
function ArchiveContent() {
  const { isDarkMode } = useTheme()
  const searchParams = useSearchParams()

  const { years, selectedYear, setSelectedYear, students, total, loading, yearsLoading, exporting, search, setSearch, strand, setStrand, gradeLevel, setGradeLevel, page, setPage, totalPages, handleExportCSV, selectedStudent, setSelectedStudent, fetchStudents } = useArchive()

  // No separate realtime channel needed — useArchive now handles it directly
  // via the browser Supabase client, same pattern as enrolled/applicants

  useEffect(() => {
    const yearParam = searchParams.get("year")
    if (yearParam && years.length > 0 && years.includes(yearParam)) setSelectedYear(yearParam)
  }, [searchParams, years, setSelectedYear])

  const handleUnarchive = useCallback((_id: string) => setSelectedStudent(null), [setSelectedStudent])

  const tc = isDarkMode ? themeColors.dark : themeColors.light
  const [locking, setLocking] = useState(false)
  const [lockState, setLockState] = useState<"lock" | "unlock" | null>(null)
  const [confirmModal, setConfirmModal] = useState<"lock" | "unlock" | null>(null)

  const refreshLockState = useCallback(async () => {
    const { unlockedCount, totalGraduated } = await getGraduateLockState()
    if (totalGraduated === 0) setLockState(null)
    else if (unlockedCount > 0) setLockState("lock")
    else setLockState("unlock")
  }, [])

  useEffect(() => { refreshLockState() }, [refreshLockState, selectedYear])

  const handleLockGraduated = async () => {
    setConfirmModal(null)
    setLocking(true)
    try {
      const res = await lockGraduatedStudents()
      if (res.success) {
        if (res.locked === 0) toast.info("No unlocked graduated students found.")
        else toast.success(`${res.locked} graduated student${res.locked !== 1 ? "s" : ""} locked permanently.`)
        // fetchStudents is called automatically by realtime; refreshLockState handles button state
        await refreshLockState()
      } else {
        toast.error(res.error || "Lock failed.")
      }
    } finally { setLocking(false) }
  }

  const handleUnlockGraduated = async () => {
    setConfirmModal(null)
    setLocking(true)
    try {
      const res = await unlockGraduatedStudents()
      if (res.success) {
        if (res.unlocked === 0) toast.info("No locked graduated students found.")
        else toast.success(`${res.unlocked} graduated student${res.unlocked !== 1 ? "s" : ""} unlocked.`)
        await refreshLockState()
      } else {
        toast.error(res.error || "Unlock failed.")
      }
    } finally { setLocking(false) }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* HEADER */}
      <div className="relative overflow-hidden p-6 sm:p-10 rounded-[28px] sm:rounded-[40px] border space-y-4" style={{ backgroundColor: tc.surface, borderColor: tc.border }}>
        {/* Top accent strip */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-400" />
        {/* Ambient glow */}
        <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-[60px] pointer-events-none ${isDarkMode ? 'bg-amber-500/6' : 'bg-amber-400/5'}`} />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
              <Archive className="text-white w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${isDarkMode ? 'bg-amber-400' : 'bg-amber-500'}`} />
                <p className={`text-[9px] font-black uppercase tracking-[0.4em] ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Records Vault</p>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase" style={{ color: tc.text.primary }}>Student Archive</h1>
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: tc.text.muted }}>Archives of Current Students &amp; Graduated Students</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {lockState === "unlock" ? (
              <Button onClick={() => setConfirmModal("unlock")} disabled={locking || !selectedYear}
                className="h-11 px-4 rounded-2xl bg-slate-600 hover:bg-slate-500 text-white font-black uppercase text-[9px] tracking-widest shadow-lg flex items-center gap-2 transition-all">
                {locking ? <Loader2 size={13} className="animate-spin" /> : <Award size={13} />}
                Unlock Graduated
              </Button>
            ) : lockState === "lock" ? (
              <Button onClick={() => setConfirmModal("lock")} disabled={locking || !selectedYear}
                className="h-11 px-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black uppercase text-[9px] tracking-widest shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all">
                {locking ? <Loader2 size={13} className="animate-spin" /> : <Award size={13} />}
                Lock Graduated
              </Button>
            ) : null}
            <Button onClick={handleExportCSV} disabled={exporting || !selectedYear} className="h-11 px-5 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-green-500/20 flex items-center gap-2">
              {exporting ? <><Loader2 size={15} className="animate-spin" /> Exporting...</> : <><Download size={15} /> Export CSV</>}
            </Button>
          </div>
        </div>

        {/* YEAR SELECTOR */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: tc.text.muted }}>School Year:</span>
          {yearsLoading ? <Loader2 size={14} className="animate-spin text-blue-500" />
            : years.length === 0 ? <span className="text-[10px] text-slate-400">No archived records found</span>
            : years.map(y => (
              <button key={y} onClick={() => setSelectedYear(y)} className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${selectedYear === y ? "bg-blue-600 text-white shadow-md" : isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800"}`}>
                S.Y. {y}
              </button>
            ))
          }
        </div>
      </div>

      {/* FILTERS */}
      <div className="p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center flex-wrap" style={{ backgroundColor: tc.surface, borderColor: tc.border }}>
        <div className="flex items-center gap-2 shrink-0" style={{ color: tc.text.muted }}>
          <Filter size={13} />
          <span className="text-[9px] font-black uppercase tracking-widest">Filters</span>
        </div>
        <div className="relative flex-1 min-w-[180px] w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or LRN..." className="pl-9 h-9 rounded-xl text-xs" style={{ backgroundColor: isDarkMode ? "rgba(15,23,42,0.6)" : "#f8fafc", borderColor: tc.border, color: tc.text.primary }} />
        </div>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <div className={`flex items-center gap-0.5 p-1 rounded-[14px] border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-sm"}`}>
            {["ALL", "ICT", "GAS"].map(s => (
              <button key={s} onClick={() => setStrand(s)} className={`px-2.5 py-1 rounded-[10px] text-[9px] font-black uppercase tracking-widest transition-all ${strand === s ? (s === "ICT" ? "bg-blue-600 text-white" : s === "GAS" ? "bg-orange-600 text-white" : "bg-slate-700 text-white") : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800"}`}>{s === "ALL" ? "All" : s}</button>
            ))}
          </div>
          <div className={`flex items-center gap-0.5 p-1 rounded-[14px] border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-sm"}`}>
            {[
              { val: "ALL", label: "All" },
              { val: "11", label: "G11" },
              { val: "12", label: "G12" },
              { val: "GRADUATED", label: "Graduated" },
            ].map(g => (
              <button key={g.val} onClick={() => setGradeLevel(g.val)} className={`px-2.5 py-1 rounded-[10px] text-[9px] font-black uppercase tracking-widest transition-all ${gradeLevel === g.val ? (g.val === "GRADUATED" ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-sm" : "bg-blue-600 text-white shadow-sm") : isDarkMode ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}>{g.label}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto shrink-0">
          <Users size={13} style={{ color: tc.text.muted }} />
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: tc.text.muted }}>{total.toLocaleString()} Records</span>
        </div>
      </div>

      {/* TABLE */}
      <div className="rounded-[24px] sm:rounded-[32px] border overflow-hidden" style={{ backgroundColor: tc.surface, borderColor: tc.border }}>
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 size={22} className="animate-spin text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Records...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Archive size={40} className="text-slate-300" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No Archived Records Found</p>
            {!selectedYear && <p className="text-[9px] text-slate-500 uppercase tracking-widest">Select a school year above</p>}
          </div>
        ) : (<>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ backgroundColor: isDarkMode ? "rgba(15,23,42,0.7)" : "#f1f5f9" }}>
                  {[
                    { label: "Student", w: "w-[280px]" },
                    { label: "LRN", w: "w-[130px]" },
                    { label: "Strand / Grade", w: "w-[130px]" },
                    { label: "Section", w: "w-[110px]" },
                    { label: "Category", w: "w-[120px]" },
                    { label: "Status", w: "w-[100px]" },
                    { label: "GWA", w: "w-[70px]" },
                    { label: "", w: "w-[60px]" },
                  ].map((h, i) => (
                    <th key={i} className={`px-4 py-3.5 text-left text-[8px] font-black uppercase tracking-[0.18em] ${h.w}`}
                      style={{ color: tc.text.muted, borderBottom: `2px solid ${tc.border}` }}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const isGrad = s.grade_level === "12" && !s.section_id
                  const pfp = s.two_by_two_url || s.profile_picture
                  return (
                    <tr key={s.id}
                      className="group cursor-pointer transition-all duration-150"
                      style={{ borderBottom: `1px solid ${tc.border}` }}
                      onClick={() => setSelectedStudent(s)}>

                      {/* Student — photo + name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {/* Photo */}
                          <div className="relative shrink-0">
                            <div className={`w-11 h-11 rounded-2xl overflow-hidden border-2 transition-transform group-hover:scale-105
                              ${isGrad ? "border-amber-500/40" : isDarkMode ? "border-slate-700" : "border-slate-200"}`}
                              style={{ backgroundColor: isDarkMode ? "rgba(30,41,59,0.8)" : "#e2e8f0" }}>
                              {pfp
                                ? <img src={pfp} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center">
                                    <User size={16} className="text-slate-400" />
                                  </div>
                              }
                            </div>
                            {isGrad && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-sm">
                                <Star size={8} className="text-white fill-white" />
                              </div>
                            )}
                          </div>
                          {/* Name + gender */}
                          <div className="min-w-0">
                            <p className="text-[12px] font-black uppercase leading-tight truncate group-hover:text-blue-500 transition-colors"
                              style={{ color: tc.text.primary }}>
                              {s.last_name}, {s.first_name}{s.middle_name ? ` ${s.middle_name[0]}.` : ""}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full
                                ${s.gender === "Male" ? "bg-blue-500/10 text-blue-400" : "bg-pink-500/10 text-pink-400"}`}>
                                {s.gender}
                              </span>
                              {s.school_year && (
                                <span className="text-[8px] font-bold" style={{ color: tc.text.muted }}>S.Y. {s.school_year}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* LRN */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] font-bold tracking-widest" style={{ color: tc.text.muted }}>{s.lrn || "—"}</span>
                      </td>

                      {/* Strand / Grade */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            {s.strand === "ICT"
                              ? <Cpu size={11} className="text-blue-400 shrink-0" />
                              : <BookOpen size={11} className="text-orange-400 shrink-0" />}
                            <span className={`text-[10px] font-black ${s.strand === "ICT" ? "text-blue-400" : "text-orange-400"}`}>{s.strand}</span>
                          </div>
                          <GradeBadge gradeLevel={s.grade_level || "11"} sectionId={s.section_id} isDarkMode={isDarkMode} />
                        </div>
                      </td>

                      {/* Section */}
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold" style={{ color: isGrad ? tc.text.muted : tc.text.secondary }}>
                          {isGrad ? "—" : (s.section || "Unassigned")}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className="text-[9px] font-bold" style={{ color: tc.text.muted }}>{s.student_category || "—"}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {isGrad ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30 text-amber-400">
                            <Award size={8} /> Graduated
                          </span>
                        ) : s.graduate_lock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase bg-slate-500/10 border border-slate-500/20 text-slate-400">
                            <Lock size={8} /> Locked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            Archived
                          </span>
                        )}
                      </td>

                      {/* GWA */}
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-black tabular-nums ${s.gwa_grade_10 ? "text-blue-400" : ""}`}
                          style={{ color: s.gwa_grade_10 ? undefined : tc.text.muted }}>
                          {s.gwa_grade_10 || "—"}
                        </span>
                      </td>

                      {/* View button */}
                      <td className="px-4 py-3">
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedStudent(s) }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100 bg-blue-600 text-white hover:bg-blue-500">
                          <Eye size={10} /> View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y" style={{ borderColor: tc.border }}>
            {students.map(s => {
              const isGrad = s.grade_level === "12" && !s.section_id
              const pfp = s.two_by_two_url || s.profile_picture
              return (
                <div key={s.id} className="px-4 py-3.5 flex items-center gap-3 cursor-pointer active:bg-blue-500/5" onClick={() => setSelectedStudent(s)}>
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border" style={{ backgroundColor: isDarkMode ? "rgba(30,41,59,0.8)" : "#e2e8f0", borderColor: tc.border }}>
                      {pfp
                        ? <img src={pfp} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><User size={18} className="text-slate-400" /></div>}
                    </div>
                    {isGrad && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-sm">
                        <Star size={9} className="text-white fill-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-black uppercase truncate" style={{ color: tc.text.primary }}>{s.last_name}, {s.first_name}</p>
                    <p className="font-mono text-[9px] mt-0.5" style={{ color: tc.text.muted }}>{s.lrn}</p>
                    <div className="flex gap-1.5 mt-1 flex-wrap items-center">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${s.strand === "ICT" ? "bg-blue-500/10 text-blue-400" : "bg-orange-500/10 text-orange-400"}`}>{s.strand}</span>
                      <GradeBadge gradeLevel={s.grade_level || "11"} sectionId={s.section_id} isDarkMode={isDarkMode} />
                      {!isGrad && <span className="text-[8px] font-bold" style={{ color: tc.text.muted }}>{s.section || "Unassigned"}</span>}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: tc.text.muted }} />
                </div>
              )
            })}
          </div>
        </>)}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t" style={{ borderColor: tc.border }}>
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: tc.text.muted }}>
              {total} record{total !== 1 ? "s" : ""} · Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all disabled:opacity-30
                  ${isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}
              >‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | string)[]>((acc, p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…")
                  acc.push(p); return acc
                }, [])
                .map((p, i) => typeof p === "string" ? (
                  <span key={`e${i}`} className="text-[10px] px-1" style={{ color: tc.text.muted }}>…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p as number)}
                    className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all
                      ${page === p
                        ? "bg-blue-600 text-white shadow-md"
                        : isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-400" : "bg-slate-100 hover:bg-slate-200 text-slate-500"
                      }`}
                  >{p}</button>
                ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all disabled:opacity-30
                  ${isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}
              >›</button>
            </div>
          </div>
        )}
      </div>

      {/* CONFIRM MODALS */}
      {confirmModal === "lock" && (
        <ConfirmModal
          isDarkMode={isDarkMode}
          title="Lock All Graduated Students?"
          description="This will permanently seal all graduated students. They cannot be unarchived, demoted, or restored by any admin action while locked. You can unlock them later if needed."
          confirmLabel="Lock Graduated"
          confirmClass="bg-amber-600 hover:bg-amber-500"
          onConfirm={handleLockGraduated}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {confirmModal === "unlock" && (
        <ConfirmModal
          isDarkMode={isDarkMode}
          title="Unlock All Graduated Students?"
          description="This will allow graduated students to be unarchived or demoted again. Only do this if you need to make corrections to graduated records."
          confirmLabel="Unlock Graduated"
          confirmClass="bg-slate-600 hover:bg-slate-500"
          onConfirm={handleUnlockGraduated}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* DOSSIER */}
      {selectedStudent && <ArchiveDossier student={selectedStudent} isDarkMode={isDarkMode} onClose={() => setSelectedStudent(null)} onUnarchive={handleUnarchive} />}
    </div>
  )
}

export default function ArchivePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 gap-3"><Loader2 size={24} className="animate-spin text-blue-500" /><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Archive...</span></div>}>
      <ArchiveContent />
    </Suspense>
  )
}