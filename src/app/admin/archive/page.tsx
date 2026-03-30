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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 animate-in zoom-in duration-300" style={{ background: "rgba(0,0,0,0.9)" }} onClick={onClose}>
      <div className="relative w-full max-w-5xl h-full flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 px-2">
          <div className="flex flex-col">
            <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.3em]">Institutional Document</p>
            <p className="text-white text-sm font-black uppercase tracking-widest truncate">{current.label}</p>
          </div>
          <div className="flex items-center gap-2">
            <a href={current.url} download className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
              <Download size={14} /> <span className="hidden sm:inline">Download</span>
            </a>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Document Display */}
        <div className="flex-1 bg-black/40 rounded-[32px] overflow-hidden border border-white/5 relative group">
          {isPDF
            ? <iframe src={current.url} className="w-full h-full border-none" title={current.label} />
            : <div className="w-full h-full flex items-center justify-center p-4">
                <img src={current.url} alt={current.label} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
              </div>
          }
          
          {/* Nav Arrows */}
          {allDocs.length > 1 && <>
            <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} 
              className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white disabled:opacity-0 transition-all">
              <ChevronLeft size={24} />
            </button>
            <button onClick={() => setIdx(i => Math.min(allDocs.length - 1, i + 1))} disabled={idx === allDocs.length - 1} 
              className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white disabled:opacity-0 transition-all">
              <ChevronRight size={24} />
            </button>
          </>}
        </div>

        {/* Thumbnail Bar */}
        {allDocs.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 no-scrollbar justify-center">
            {allDocs.map((d, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${i === idx ? "bg-blue-600 border-blue-400 text-white shadow-lg" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"}`}>
                {d.label}
              </button>
            ))}
          </div>
        )}
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
function GradeBadge({ gradeLevel, sectionId, strand, isDarkMode }: { gradeLevel: string; sectionId?: string | null; strand?: string | null; isDarkMode: boolean }) {
  const isGrad = gradeLevel === "12" && !sectionId
  
  if (isGrad) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-500">
        <Award size={9} /> Graduated
      </span>
    )
  }

  const isICT = strand === "ICT"
  const isGAS = strand === "GAS"

  if (isICT) {
    return <Badge className="text-[8px] font-black uppercase border border-blue-500/30 bg-blue-500/10 text-blue-500">G{gradeLevel || "11"} • ICT</Badge>
  }
  if (isGAS) {
    return <Badge className="text-[8px] font-black uppercase border border-orange-500/30 bg-orange-500/10 text-orange-500">G{gradeLevel || "11"} • GAS</Badge>
  }

  return <Badge className="text-[8px] font-black uppercase border-none bg-slate-500/10 text-slate-400">G{gradeLevel || "11"}</Badge>
}

// ── Archive Dossier Modal ─────────────────────────────────────────────────
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
  const isICT = student.strand === "ICT"
  const isGAS = student.strand === "GAS"
  const isJHS = student.student_category === "JHS Graduate"
  const isALS = student.student_category === "ALS Passer"
  const photo = student.two_by_two_url || null
  const pfpFallback = student.profile_picture || null

  // Brand color logic
  const brandColor = isGraduated ? "amber" : isICT ? "blue" : isGAS ? "orange" : "slate"
  const brandHex = isGraduated ? "#fbbf24" : isICT ? "#3b82f6" : isGAS ? "#f97316" : "#64748b"
  const brandGlow = isGraduated ? "rgba(251,191,36,0.3)" : isICT ? "rgba(59,130,246,0.3)" : isGAS ? "rgba(249,115,22,0.3)" : "rgba(100,116,139,0.3)"

  // G11 section
  const g11SectionName = student.g11_section || (student.grade_level === "11" ? student.section : null)
  const g12SectionName = student.grade_level === "12" ? (student.section || "Unassigned") : null

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

  return (<>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[40px] border border-white/10"
        style={{ backgroundColor: isDarkMode ? "rgb(8,12,24)" : "#f8fafc" }}>

        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* Custom style to hide scrollbar */}
          <style dangerouslySetInnerHTML={{ __html: `.no-scrollbar::-webkit-scrollbar { display: none; }` }} />

          {/* ── HERO HEADER ── */}
          <div className="relative pt-20 pb-10 flex flex-col items-center">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[400px] opacity-10 pointer-events-none blur-[100px]"
              style={{ background: `radial-gradient(circle, ${brandHex}, transparent 70%)` }} />

            {/* Top Close */}
            <button onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5 z-20">
              <X size={20} />
            </button>

            {/* Profile Section - Centered Identity */}
            <div className="relative group perspective-1000 z-10 transition-transform duration-500 hover:scale-105">
              {/* Complex Glow Rings */}
              <div className={`absolute inset-0 rounded-[48px] blur-2xl opacity-40 transition-opacity duration-500 group-hover:opacity-60`}
                style={{ background: brandGlow }} />
              <div className={`absolute -inset-1 rounded-[48px] animate-pulse opacity-20`}
                style={{ backgroundColor: brandHex }} />

              <div
                className="relative w-[180px] h-[220px] rounded-[44px] overflow-hidden border-[3px] shadow-2xl cursor-pointer"
                style={{ borderColor: `${brandHex}aa`, backgroundColor: isDarkMode ? "rgba(30,41,59,0.9)" : "#e2e8f0" }}
                onClick={() => { const url = photo || pfpFallback; if (url) openDoc(url, "2x2 Photo") }}
              >
                {photo || pfpFallback
                  ? <img src={photo || pfpFallback!} alt="2x2 Photo"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  : <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                      <User size={48} className="text-slate-400" />
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Identity Record</p>
                    </div>
                }
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                  <ZoomIn size={32} className="text-white" />
                </div>
              </div>

              {/* Status Indicator */}
              <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-2xl border-2 shadow-xl whitespace-nowrap flex items-center gap-2 z-20
                ${brandColor === 'amber' ? 'bg-amber-500 border-amber-300 text-amber-950' : 
                  brandColor === 'blue' ? 'bg-blue-600 border-blue-400 text-white' : 
                  'bg-orange-500 border-orange-300 text-orange-950'}`}>
                {isGraduated ? <Award size={14} className="fill-current" /> : <Shield size={14} />}
                <span className="text-[10px] font-black uppercase tracking-wider">
                  {isGraduated ? "Graduate ALUMNI" : `${student.strand} Scholar`}
                </span>
              </div>
            </div>

            {/* Name & Primary Info */}
            <div className="mt-10 text-center px-6">
              <div className="flex flex-col items-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 opacity-40" style={{ color: tc.text.primary }}>Institutional Record</p>
                <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter leading-none" style={{ color: tc.text.primary }}>
                  {student.last_name},
                </h2>
                <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter leading-none mt-1" style={{ color: tc.text.primary }}>
                  {student.first_name} {student.middle_name ? `${student.middle_name[0]}.` : ""}
                </h2>
              </div>

              <div className="flex items-center justify-center gap-4 mt-6">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-40" style={{ color: tc.text.primary }}>Identity LRN</span>
                  <span className="font-mono text-xs font-black tracking-widest" style={{ color: brandHex }}>{student.lrn}</span>
                </div>
                <div className="w-[1px] h-8 bg-white/10" />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-40" style={{ color: tc.text.primary }}>School Year</span>
                  <span className="text-xs font-black" style={{ color: tc.text.secondary }}>{student.school_year}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── CONTENT GRID ── */}
          <div className="px-6 sm:px-12 pb-12">
            
            {/* Quick Actions / Status Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
               <div className="p-1 rounded-[30px] border border-white/5" style={{ background: "rgba(255,255,255,0.02)" }}>
                  {!isGraduated ? (
                    <button onClick={handleUnarchive} disabled={unarchiving}
                      className="w-full h-14 rounded-[26px] flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-widest transition-all bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-60 text-white shadow-xl shadow-emerald-500/20">
                      {unarchiving ? <Loader2 size={18} className="animate-spin" /> : <ArchiveRestore size={18} />}
                      {unarchiving ? "Restoring..." : "Restore to Enrollment"}
                    </button>
                  ) : student.graduate_lock ? (
                    <div className="w-full h-14 rounded-[26px] flex items-center justify-center gap-3 border-2 border-amber-500/30 cursor-not-allowed bg-amber-500/5">
                      <Lock size={16} className="text-amber-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Permanently Archived Alumni</span>
                    </div>
                  ) : (
                    <div className="w-full h-14 rounded-[26px] flex items-center justify-center gap-3 border-2 border-amber-500/20 bg-amber-500/5">
                      <Award size={16} className="text-amber-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Official Graduate Status</span>
                    </div>
                  )}
               </div>

               <div className="flex items-center gap-3 p-4 rounded-[30px] border border-white/5 bg-white/5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${brandColor === 'amber' ? 'bg-amber-500/20 text-amber-400' : brandColor === 'blue' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Classification</p>
                    <p className="text-xs font-black uppercase">{isGraduated ? "Alumni / Graduated" : `${student.grade_level || "11"} - ${student.student_category}`}</p>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column (Main Info) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* ── Section History ── */}
                <div className="p-6 rounded-[34px] border border-white/5 bg-white/5 relative overflow-hidden">
                   <div className="flex items-center gap-3 mb-6">
                      <BookOpen size={16} className="text-slate-400" />
                      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Academic Trajectory</h3>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* G11 Panel */}
                      <div className={`p-4 rounded-3xl border transition-all ${g11SectionName ? 'bg-blue-500/5 border-blue-500/20' : 'bg-slate-500/5 border-slate-500/10 opacity-50'}`}>
                        <div className="flex items-center justify-between mb-3">
                           <span className={`text-[10px] font-black px-3 py-1 rounded-full ${g11SectionName ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-500'}`}>G11</span>
                           {g11SectionName && student.grade_level === "11" && <span className="text-[8px] font-black uppercase text-emerald-500 animate-pulse">Active</span>}
                        </div>
                        <p className="text-[8px] font-bold uppercase tracking-widest opacity-40 mb-1">Grade 11 Section</p>
                        <p className="text-sm font-black truncate">{g11SectionName || "NOT RECORDED"}</p>
                      </div>

                      {/* G12 Panel */}
                      <div className={`p-4 rounded-3xl border transition-all ${g12SectionName ? isGraduated ? 'bg-amber-500/5 border-amber-500/20' : 'bg-violet-500/5 border-violet-500/20' : 'bg-slate-500/5 border-slate-500/10 opacity-50'}`}>
                        <div className="flex items-center justify-between mb-3">
                           <span className={`text-[10px] font-black px-3 py-1 rounded-full ${g12SectionName ? isGraduated ? 'bg-amber-500/20 text-amber-500' : 'bg-violet-500/20 text-violet-400' : 'bg-slate-500/20 text-slate-500'}`}>G12</span>
                           {isGraduated && <Award size={12} className="text-amber-500" />}
                           {!isGraduated && g12SectionName && student.grade_level === "12" && <span className="text-[8px] font-black uppercase text-emerald-500 animate-pulse">Active</span>}
                        </div>
                        <p className="text-[8px] font-bold uppercase tracking-widest opacity-40 mb-1">Grade 12 Section</p>
                        <p className="text-sm font-black truncate">{g12SectionName || "NOT RECORDED"}</p>
                      </div>
                   </div>
                </div>

                {/* ── Enrollment Details Grid ── */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Modality", val: student.preferred_modality, icon: <Cpu size={14} /> },
                    { label: "Shift", val: student.preferred_shift, icon: <Calendar size={14} /> },
                    { label: "GWA (G10)", val: student.gwa_grade_10, icon: <Star size={14} /> },
                    { label: "Category", val: student.student_category, icon: <Sparkles size={14} /> },
                    { label: "Gender", val: student.gender, icon: <User size={14} /> },
                    { label: "Civil Status", val: student.civil_status, icon: <Shield size={14} /> },
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-[28px] border border-white/5 bg-white/5">
                      <div className="flex items-center gap-2 mb-2 opacity-40">
                        {item.icon}
                        <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                      </div>
                      <p className="text-[11px] font-black uppercase truncate">{item.val || "—"}</p>
                    </div>
                  ))}
                </div>

                {/* ── Personal Info ── */}
                <div className="p-6 rounded-[34px] border border-white/5 bg-white/5">
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <User size={16} className="text-slate-400" />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Personal Data</h3>
                      </div>
                      <button onClick={() => setInfoOpen(!infoOpen)} className="text-slate-500 hover:text-white transition-colors">
                        {infoOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                   </div>
                   
                   {infoOpen && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {[
                          { label: "Full Address", val: student.address, icon: <MapPin size={14} /> },
                          { label: "Primary Email", val: student.email, icon: <Mail size={14} /> },
                          { label: "Birth Date", val: student.birth_date ? new Date(student.birth_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : null, icon: <Calendar size={14} /> },
                          { label: "Contact No.", val: student.phone || student.contact_no, icon: <Phone size={14} /> },
                          { label: "Religion", val: student.religion, icon: <BookMarked size={14} /> },
                          { label: "Previous School", val: student.last_school_attended, icon: <School size={14} /> },
                        ].map((f, i) => (
                          <div key={i} className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 text-slate-400">
                              {f.icon}
                            </div>
                            <div className="min-w-0">
                               <p className="text-[8px] font-bold uppercase tracking-widest opacity-40 mb-1">{f.label}</p>
                               <p className="text-xs font-bold leading-relaxed break-words">{f.val || "—"}</p>
                            </div>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
              </div>

              {/* Right Column (Sidebar) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* ── Guardian Info ── */}
                <div className="p-6 rounded-[34px] border border-white/5 bg-white/5">
                   <div className="flex items-center gap-3 mb-6">
                      <Users size={16} className="text-slate-400" />
                      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Guardianship</h3>
                   </div>
                   <div className="space-y-4">
                      <div>
                         <p className="text-[8px] font-bold uppercase tracking-widest opacity-40 mb-1">Full Name</p>
                         <p className="text-xs font-black">{[student.guardian_first_name, student.guardian_middle_name, student.guardian_last_name].filter(Boolean).join(" ") || "No Data"}</p>
                      </div>
                      <div>
                         <p className="text-[8px] font-bold uppercase tracking-widest opacity-40 mb-1">Contact Details</p>
                         <p className="text-xs font-black">{student.guardian_phone || student.guardian_contact || "No Phone Registered"}</p>
                      </div>
                   </div>
                </div>

                {/* ── Documentary Vault (Restyled) ── */}
                <div className="p-8 rounded-[44px] bg-slate-200/40 dark:bg-slate-900/40 border border-white/5">
                   <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-slate-300/30 dark:bg-slate-800/50 flex items-center justify-center text-slate-500">
                          <BookOpen size={20} />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500/80">Documentary Vault</h3>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-slate-950 flex items-center justify-center shadow-2xl">
                        <span className="text-xs font-black text-white">{allDocs.length}</span>
                      </div>
                   </div>
                   
                   <div className="space-y-4">
                     {allDocs.length > 0 ? (
                       allDocs.map((doc, idx) => (
                         <div key={idx} onClick={() => openDoc(doc.url, doc.label)}
                          className="flex items-center gap-4 p-5 rounded-[28px] bg-white dark:bg-slate-800/80 border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group shadow-sm hover:shadow-xl active:scale-[0.98]">
                           <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                              <FileText size={22} />
                           </div>
                           <div className="min-w-0 flex-1">
                              <p className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-tight truncate">{doc.label}</p>
                              <p className="text-[9px] font-bold uppercase text-slate-400 mt-0.5 tracking-wider">Verified Credential</p>
                           </div>
                           <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                         </div>
                       ))
                     ) : (
                       <div className="text-center py-10 opacity-30">
                          <BookMarked size={32} className="mx-auto mb-3" />
                          <p className="text-xs font-bold uppercase tracking-[0.2em]">No Verified Vault Data</p>
                       </div>
                     )}
                   </div>
                </div>

                {/* Footer Info (Moved outside) */}
                <div className="text-center mt-6 mb-2 opacity-30">
                   <p className="text-[8px] font-black uppercase tracking-[.4em] text-slate-500">Archived on ACLC Systems</p>
                </div>

              </div>
            </div>
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
                <p className={`text-[9px] font-black uppercase tracking-[0.4em] ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Academic Vault</p>
              </div>
              <h1 className="text-2xl sm:text-5xl font-black tracking-tighter uppercase leading-none" style={{ color: tc.text.primary }}>Student Archive</h1>
              <p className="text-[10px] sm:text-[11px] font-bold italic mt-1" style={{ color: tc.text.muted }}>Institutional History & Graduate Ledger</p>
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
      <div className={`rounded-[28px] sm:rounded-[40px] border overflow-hidden shadow-xl shadow-amber-500/5 ${isDarkMode ? "bg-slate-900/40 backdrop-blur-xl" : "bg-white"}`} style={{ borderColor: tc.border }}>
        
        {/* Top Pagination Switcher */}
        {!loading && students.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-b bg-amber-500/5" style={{ borderColor: tc.border }}>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: tc.text.muted }}>
                Page {page} of {totalPages}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={`h-8 px-3 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 border
                  ${isDarkMode ? "bg-slate-800 border-slate-750 hover:bg-slate-700 text-slate-300" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"}`}
              >Prev</button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={`h-8 px-3 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 border
                  ${isDarkMode ? "bg-slate-800 border-slate-750 hover:bg-slate-700 text-slate-300" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"}`}
              >Next</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 size={22} className="animate-spin text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Records...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-500/10 flex items-center justify-center text-slate-300">
               <Archive size={32} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">No Archived Records Found</p>
              {!selectedYear && <p className="text-[9px] text-slate-500 uppercase tracking-widest">Select a school year above to begin research</p>}
            </div>
          </div>
        ) : (<>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-3 px-6 pb-6">
              <thead>
                <tr>
                  {[
                    { label: "Student Profile", w: "w-[300px]" },
                    { label: "Credentials", w: "w-[150px]" },
                    { label: "Academic Path", w: "w-[150px]" },
                    { label: "Classification", w: "w-[130px]" },
                    { label: "GWA", w: "w-[80px]" },
                    { label: "", w: "text-right" },
                  ].map((h, i) => (
                    <th key={i} className={`px-4 pt-4 pb-2 text-left text-[8px] font-black uppercase tracking-[0.2em] ${h.w}`}
                      style={{ color: tc.text.muted }}>
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
                      className={`group cursor-pointer transition-all duration-300 hover:-translate-y-0.5`}
                      onClick={() => setSelectedStudent(s)}>
                      
                      {/* Name Card */}
                      <td className={`px-4 py-4 rounded-l-3xl border-y border-l transition-colors ${isDarkMode ? "bg-slate-800/20 group-hover:bg-slate-800/40 border-slate-800/50" : "bg-slate-50/30 group-hover:bg-slate-50 border-slate-100"}`}>
                        <div className="flex items-center gap-4">
                          <div className="relative shrink-0">
                            <div className={`w-12 h-12 rounded-2xl overflow-hidden border-2 transition-all duration-500 shadow-lg group-hover:shadow-blue-500/10
                              ${isGrad ? "border-amber-500/40" : isDarkMode ? "border-slate-700/50" : "border-white"}`}
                              style={{ backgroundColor: isDarkMode ? "rgba(15,23,42,0.8)" : "#fff" }}>
                              {pfp
                                ? <img src={pfp} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                : <div className="w-full h-full flex items-center justify-center text-slate-400"><User size={20} /></div>}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-black uppercase leading-tight truncate group-hover:text-amber-500 transition-colors ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                               {s.last_name}, {s.first_name}
                            </p>
                             <div className="flex items-center gap-2 mt-1">
                               <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${s.gender === "Male" ? "bg-blue-500/10 text-blue-400" : "bg-pink-500/10 text-pink-400"}`}>
                                 {s.gender}
                               </span>
                             </div>
                          </div>
                        </div>
                      </td>

                      {/* LRN / ID */}
                      <td className={`px-4 py-4 border-y transition-colors ${isDarkMode ? "bg-slate-800/20 group-hover:bg-slate-800/40 border-slate-800/50" : "bg-slate-50/30 group-hover:bg-slate-50 border-slate-100"}`}>
                        <div className="space-y-1">
                          <p className="font-mono text-[10px] font-bold tracking-widest" style={{ color: tc.text.primary }}>{s.lrn || "—"}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Identity Code</p>
                        </div>
                      </td>

                      {/* Academic Path */}
                      <td className={`px-4 py-4 border-y transition-colors ${isDarkMode ? "bg-slate-800/20 group-hover:bg-slate-800/40 border-slate-800/50" : "bg-slate-50/30 group-hover:bg-slate-50 border-slate-100"}`}>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${s.strand === "ICT" ? "text-blue-400" : "text-orange-400"}`}>{s.strand} Division</span>
                          </div>
                          <GradeBadge gradeLevel={s.grade_level || "11"} sectionId={s.section_id} strand={s.strand} isDarkMode={isDarkMode} />
                        </div>
                      </td>

                      {/* Classification / Section */}
                      <td className={`px-4 py-4 border-y transition-colors ${isDarkMode ? "bg-slate-800/20 group-hover:bg-slate-800/40 border-slate-800/50" : "bg-slate-50/30 group-hover:bg-slate-50 border-slate-100"}`}>
                         <div className="space-y-1">
                            <p className="text-[10px] font-black" style={{ color: isGrad ? tc.text.muted : tc.text.primary }}>
                              {isGrad ? "ALUMNI" : (s.section || "UNASSIGNED")}
                            </p>
                            <p className="text-[8px] font-bold uppercase tracking-widest opacity-40">{s.student_category || "Standard"}</p>
                         </div>
                      </td>

                      {/* GWA Score */}
                      <td className={`px-4 py-4 border-y transition-colors ${isDarkMode ? "bg-slate-800/20 group-hover:bg-slate-800/40 border-slate-800/50" : "bg-slate-50/30 group-hover:bg-slate-50 border-slate-100"}`}>
                         <div className="flex items-baseline gap-1">
                            <span className={`text-sm font-black tabular-nums transition-colors ${s.gwa_grade_10 ? "text-blue-500 group-hover:text-blue-400" : "text-slate-500"}`}>
                               {s.gwa_grade_10 || "0.0"}
                            </span>
                         </div>
                      </td>

                      {/* Action */}
                      <td className={`px-4 py-4 rounded-r-3xl border-y border-r transition-colors ${isDarkMode ? "bg-slate-800/20 group-hover:bg-slate-800/40 border-slate-800/50" : "bg-slate-50/30 group-hover:bg-slate-50 border-slate-100"} text-right`}>
                        <div className="flex items-center justify-end">
                           <div className={`p-2.5 rounded-xl border transition-all duration-300 ${isDarkMode ? "border-slate-700 bg-slate-800/50 text-slate-400 group-hover:text-blue-400 group-hover:border-blue-500/50" : "border-slate-200 bg-white text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 shadow-sm"}`}>
                             <Eye size={16} />
                           </div>
                        </div>
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
                    <div className={`w-12 h-12 rounded-2xl overflow-hidden border ${isDarkMode ? "border-slate-750 bg-slate-800" : "border-slate-200 bg-white shadow-sm"}`}>
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
                    <p className={`text-[12px] font-black uppercase truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>{s.last_name}, {s.first_name}</p>
                    <p className="font-mono text-[9px] mt-0.5" style={{ color: tc.text.muted }}>{s.lrn}</p>
                    <div className="flex gap-1.5 mt-1 flex-wrap items-center">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${s.strand === "ICT" ? "bg-blue-500/10 text-blue-400" : "bg-orange-500/10 text-orange-400"}`}>{s.strand}</span>
                      <GradeBadge gradeLevel={s.grade_level || "11"} sectionId={s.section_id} isDarkMode={isDarkMode} />
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: tc.text.muted }} />
                </div>
              )
            })}
          </div>
        </>)}

        {/* PAGINATION — Bottom */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-5 border-t bg-amber-500/5 shadow-inner" style={{ borderColor: tc.border }}>
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: tc.text.muted }}>
              {total} record{total !== 1 ? "s" : ""} · Database Totals
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black transition-all disabled:opacity-30 border shadow-sm
                  ${isDarkMode ? "bg-slate-800 border-slate-750 hover:bg-slate-700 text-slate-300" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"}`}
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
                    className={`w-10 h-10 rounded-2xl text-[10px] font-black transition-all border shadow-sm
                      ${page === p
                        ? "bg-blue-600 border-blue-500 text-white shadow-blue-500/20"
                        : isDarkMode ? "bg-slate-800 border-slate-750 hover:bg-slate-700 text-slate-400" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-500"
                      }`}
                  >{p}</button>
                ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black transition-all disabled:opacity-30 border shadow-sm
                  ${isDarkMode ? "bg-slate-800 border-slate-750 hover:bg-slate-700 text-slate-300" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"}`}
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