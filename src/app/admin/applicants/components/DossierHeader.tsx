// src/app/admin/applicants/components/DossierHeader.tsx
import { memo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  User, X, Copy, Check, FileDown, Edit2, Save, Undo2, Camera, BookOpen, Cpu
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { OptimizedImage } from "./OptimizedImage"
import { AnimatedText } from "../../dashboard/components/primitives"
import { toast } from "sonner"

interface DossierHeaderProps {
  student: any
  formData: any
  isDarkMode: boolean
  isEditing: boolean
  isSaving: boolean
  hasChanges: boolean
  isValid: boolean
  showEditButton: boolean
  onClose?: () => void
  onEditToggle: () => void
  onCancelEdit: () => void
  onSave: () => void
  onImageClick: () => void
  onDownloadForm: () => void
  onStatusChange?: (id: string, status: string) => void
  onDecline?: (student: any) => void
}

const STATUS_CFG: Record<string, { dark: string; light: string; dot: string; bar: string; glow: string }> = {
  Pending:  { dark: "bg-amber-500/10 text-amber-400 border-amber-500/25",   light: "bg-amber-50 text-amber-600 border-amber-200",   dot: "bg-amber-400",   bar: "from-amber-500/70 via-amber-400/20 to-transparent",   glow: "bg-amber-400"   },
  Accepted: { dark: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25", light: "bg-emerald-50 text-emerald-600 border-emerald-200", dot: "bg-emerald-400", bar: "from-emerald-500/70 via-emerald-400/20 to-transparent", glow: "bg-emerald-400" },
  Approved: { dark: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25", light: "bg-emerald-50 text-emerald-600 border-emerald-200", dot: "bg-emerald-400", bar: "from-emerald-500/70 via-emerald-400/20 to-transparent", glow: "bg-emerald-400" },
  Rejected: { dark: "bg-red-500/10 text-red-400 border-red-500/25",         light: "bg-red-50 text-red-600 border-red-200",         dot: "bg-red-400",     bar: "from-red-500/70 via-red-400/20 to-transparent",     glow: "bg-red-400"     },
}

const StatusBadge = memo(function StatusBadge({ status, isDarkMode }: { status: string; isDarkMode: boolean }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.Pending
  return (
    <div className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-full border text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] w-fit shadow-sm transition-all duration-300 ${isDarkMode ? cfg.dark : cfg.light}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot} ${status === "Pending" ? "animate-pulse" : ""}`} />
      {status === "Approved" ? "Accepted" : status}
    </div>
  )
})

export const DossierHeader = memo(function DossierHeader({
  student, formData, isDarkMode, isEditing, isSaving, hasChanges, isValid,
  showEditButton, onClose, onEditToggle, onCancelEdit, onSave, onImageClick, onDownloadForm,
  onStatusChange, onDecline
}: DossierHeaderProps) {
  const [copied, setCopied] = useState(false)
  const isALS      = student.student_category?.toLowerCase().includes("als")
  const isMale     = student.gender !== "Female"
  const genderColor = isMale ? "#3b82f6" : "#ec4899"
  const strandColor = student.strand === "ICT" ? "#3b82f6" : "#f97316"
  const statusCfg   = STATUS_CFG[student.status] ?? STATUS_CFG.Pending

  const handleCopyInfo = async () => {
    const text = `
STUDENT RECORD:
Name: ${student.last_name}, ${student.first_name}${student.middle_name ? `, ${student.middle_name[0]}.` : ""}
LRN: ${student.lrn}
Age: ${student.age || ""}
Gender: ${student.gender}
Section: ${student.section || ""}
Email: ${student.email}
Phone: ${student.phone || student.contact_no}
Strand: ${student.strand}
Address: ${student.address}
    `.trim()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success("Student Information Copied", {
        style: { fontSize: "10px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.1em" },
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy information")
    }
  }

  return (
    <>
      <style>{`
        .dossier-btn-accept {
          background: ${isDarkMode ? 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.2) 100%)' : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'};
          border: 1px solid ${isDarkMode ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.2)'};
          color: ${isDarkMode ? '#34d399' : '#059669'};
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .dossier-btn-accept:hover { 
          border-color: rgba(16,185,129,0.6);
          background: ${isDarkMode ? 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.3) 100%)' : 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'};
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(16,185,129,0.3);
        }

        .dossier-btn-reject {
          background: ${isDarkMode ? 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(220,38,38,0.2) 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'};
          border: 1px solid ${isDarkMode ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)'};
          color: ${isDarkMode ? '#f87171' : '#dc2626'};
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .dossier-btn-reject:hover { 
          border-color: rgba(239,68,68,0.6);
          background: ${isDarkMode ? 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(220,38,38,0.3) 100%)' : 'linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%)'};
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(239,68,68,0.3);
        }

        .dossier-btn-pending {
          background: ${isDarkMode ? 'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(234,88,12,0.2) 100%)' : 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)'};
          border: 1px solid ${isDarkMode ? 'rgba(249,115,22,0.3)' : 'rgba(249,115,22,0.2)'};
          color: ${isDarkMode ? '#fdba74' : '#ea580c'};
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .dossier-btn-pending:hover { 
          border-color: rgba(249,115,22,0.6);
          background: ${isDarkMode ? 'linear-gradient(135deg, rgba(249,115,22,0.2) 0%, rgba(234,88,12,0.3) 100%)' : 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)'};
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(249,115,22,0.3);
        }
      `}</style>
      <div className={`relative overflow-hidden shrink-0 transition-all duration-500 ${
      isDarkMode
        ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/80"
        : "bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border-b border-slate-200"
    }`}>
      {/* Status accent bar at very top */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${statusCfg.bar}`} />

      {/* CSS dot-grid texture — no external URL */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, ${isDarkMode ? "rgba(148,163,184,0.07)" : "rgba(100,116,139,0.10)"} 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Subtle status glow behind content */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-72 h-40 blur-[70px] pointer-events-none opacity-20 ${statusCfg.glow}`}
      />

      <div className="p-6 md:p-12 flex flex-col items-center text-center relative z-10">

        {/* Left action buttons */}
        <div className="absolute top-0 left-0 z-30 flex gap-1.5 p-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onClose}
                className={`h-9 w-9 rounded-2xl transition-all active:scale-90 ${isDarkMode ? "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white" : "bg-black/5 hover:bg-black/10 text-slate-700"}`}>
                <X size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Close Dossier</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleCopyInfo}
                className={`h-9 w-9 rounded-2xl transition-all active:scale-90 ${isDarkMode ? "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white" : "bg-black/5 hover:bg-black/10 text-slate-700"}`}>
                {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Copy Student Info</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onDownloadForm}
                className={`h-9 w-9 rounded-2xl transition-all active:scale-90 ${isDarkMode ? "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white" : "bg-black/5 hover:bg-black/10 text-slate-700"}`}>
                <FileDown size={15} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Download Registration Form</p></TooltipContent>
          </Tooltip>
        </div>

        {/* Right edit controls */}
        {showEditButton && (
          <div className="absolute top-0 right-0 z-30 flex gap-1.5 p-4">
            {isEditing ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={onCancelEdit} disabled={isSaving}
                      className="h-9 rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-lg bg-red-500 hover:bg-red-600 text-white px-4">
                      <Undo2 size={13} className="mr-1.5" /> Cancel
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Discard Changes</p></TooltipContent>
                </Tooltip>
                {hasChanges && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={onSave} disabled={isSaving || !isValid}
                        className="h-9 rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-400 disabled:cursor-not-allowed px-4">
                        <Save size={13} className="mr-1.5" /> {isSaving ? "Saving…" : "Save"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Save Profile Updates</p></TooltipContent>
                  </Tooltip>
                )}
              </>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={onEditToggle}
                    className={`h-9 rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-lg px-4 ${isDarkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"}`}>
                    <Edit2 size={13} className="mr-1.5" /> Edit Profile
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Modify Student Data</p></TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {/* Category badge — top right below controls */}
        <div className="absolute top-14 right-4 z-20">
          <Badge className={`${isALS ? "bg-orange-500 shadow-orange-500/30" : "bg-blue-600 shadow-blue-500/30"} backdrop-blur-md text-white text-[8px] md:text-[9px] font-black px-3 py-1.5 uppercase tracking-widest border-none shadow-lg`}>
            {student.student_category || "Regular"}
          </Badge>
        </div>

        {/* Profile image with gender-based ring + glow */}
        <div className="relative z-10 mt-10 mb-4 md:mb-6">
          {/* Outer glow ring */}
          <div
            className="absolute inset-[-6px] rounded-[48px] md:rounded-[64px] blur-xl opacity-25 pointer-events-none"
            style={{ backgroundColor: genderColor }}
          />
          <div
            onClick={onImageClick}
            className="relative w-36 h-36 md:w-44 md:h-44 rounded-[40px] md:rounded-[52px] overflow-hidden shadow-2xl flex items-center justify-center cursor-zoom-in group transition-all duration-300 hover:scale-[1.03]"
            style={{
              border: `4px solid ${genderColor}50`,
              boxShadow: `0 20px 50px -10px ${genderColor}40, 0 0 0 6px ${genderColor}12`,
            }}
          >
            {formData.profile_picture || student.profile_picture || student.two_by_two_url || student.profile_2x2_url ? (
              <OptimizedImage
                src={formData.profile_picture || student.profile_picture || student.two_by_two_url || student.profile_2x2_url}
                alt={`${student.last_name}, ${student.first_name}`}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                fallback={`https://api.dicebear.com/7.x/initials/svg?seed=${student.last_name}`}
              />
            ) : (
              <div className={`flex flex-col items-center gap-2 ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
                <User size={56} strokeWidth={1} />
                <p className="text-[9px] font-black uppercase tracking-widest">No Photo</p>
              </div>
            )}
            {isEditing && (
              <div className="absolute inset-0 bg-black/55 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Camera className="text-white drop-shadow-lg" size={28} />
              </div>
            )}
          </div>

          {/* Gender + strand dot badges */}
          <div
            className="absolute -bottom-2 -left-2 w-8 h-8 rounded-xl border-2 flex items-center justify-center shadow-lg"
            style={{
              backgroundColor: isDarkMode ? genderColor + "45" : genderColor + "20",
              borderColor: isDarkMode ? genderColor + "CC" : genderColor + "55",
            }}
          >
            <span className="text-[8px] font-black" style={{ color: genderColor }}>
              {isMale ? "M" : "F"}
            </span>
          </div>
          <div
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl border-2 flex items-center justify-center shadow-lg"
            style={{
              backgroundColor: isDarkMode ? strandColor + "45" : strandColor + "20",
              borderColor: isDarkMode ? strandColor + "CC" : strandColor + "55",
            }}
          >
            {student.strand === "ICT"
              ? <Cpu size={13} style={{ color: strandColor }} />
              : <BookOpen size={13} style={{ color: strandColor }} />
            }
          </div>
        </div>

        {/* Name */}
        <h2 className={`relative z-10 text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none italic transition-colors duration-300 mt-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          <AnimatedText text={`${formData.first_name} ${formData.last_name}`} />
        </h2>

        {/* LRN pill */}
        <p className={`mt-3 font-bold uppercase tracking-[0.35em] text-[10px] px-4 py-1.5 rounded-full border transition-all duration-300 ${isDarkMode ? "text-slate-400 bg-white/5 border-white/8" : "text-slate-500 bg-black/5 border-black/8"}`}>
          LRN · {student.lrn}
        </p>

        {/* Status badge */}
        <div className="mt-3">
          <StatusBadge status={student.status} isDarkMode={isDarkMode} />
        </div>

        {/* Quick-info strip: Grade · Strand · Section · GWA */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
          <span className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-colors duration-300 ${isDarkMode ? "bg-slate-800/80 border-slate-700/80 text-slate-400" : "bg-white border-slate-200 text-slate-500 shadow-sm"}`}>
            Grade {student.grade_level || "11"}
          </span>
          <span
            className="px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border"
            style={{ backgroundColor: strandColor + "18", borderColor: strandColor + "45", color: strandColor }}
          >
            {student.strand}
          </span>
          {student.section && student.section !== "Unassigned" && (
            <span className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-colors duration-300 ${isDarkMode ? "bg-purple-500/12 border-purple-500/30 text-purple-400" : "bg-purple-50 border-purple-200 text-purple-600"}`}>
              {student.section}
            </span>
          )}
          {student.gwa_grade_10 && (
            <span className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-colors duration-300 ${isDarkMode ? "bg-blue-500/12 border-blue-500/30 text-blue-400" : "bg-blue-50 border-blue-200 text-blue-600"}`}>
              GWA {student.gwa_grade_10}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {student.status === 'Pending' && onStatusChange && onDecline && (
            <>
              <button 
                onClick={() => onStatusChange(student.id, 'Approved')} 
                className="dossier-btn-accept inline-flex items-center justify-center h-11 rounded-full font-black uppercase text-[10px] md:text-xs tracking-widest px-8 shadow-xl"
              >
                <Check size={14} strokeWidth={3} className="mr-2" /> Accept
              </button>
              <button 
                onClick={() => onDecline(student)} 
                className="dossier-btn-reject inline-flex items-center justify-center h-11 rounded-full font-black uppercase text-[10px] md:text-xs tracking-widest px-8 shadow-xl"
              >
                <X size={14} strokeWidth={3} className="mr-2" /> Reject
              </button>
            </>
          )}
          {(student.status === 'Approved' || student.status === 'Accepted' || student.status === 'Rejected') && onStatusChange && (
            <button 
              onClick={() => onStatusChange(student.id, 'Pending')} 
              className="dossier-btn-pending inline-flex items-center justify-center h-11 rounded-full font-black uppercase text-[10px] md:text-xs tracking-widest px-8 shadow-xl"
            >
              <Undo2 size={14} strokeWidth={3} className="mr-2" /> Return to Pending
            </button>
          )}
        </div>

        {/* Rejection notice */}
        {student.status === "Rejected" && (
          <div className="mt-5 w-full max-w-md animate-in fade-in slide-in-from-top-2 duration-500">
            <div className={`p-4 rounded-2xl border text-left ${isDarkMode ? "bg-red-950/30 border-red-900/50 text-red-200" : "bg-red-50 border-red-100 text-red-800"}`}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-1.5 opacity-60">Rejection Notice</p>
              <p className="text-xs font-semibold leading-relaxed">{student.registrar_feedback || student.decline_reason || "No specific reason provided."}</p>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
})
