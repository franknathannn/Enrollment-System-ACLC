// src/app/admin/applicants/components/DossierHeader.tsx
import { memo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  User, X, Copy, Check, FileDown, Edit2, Save, Undo2, Camera
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
}

const StatusBadge = memo(function StatusBadge({ status, isDarkMode }: { status: string; isDarkMode: boolean }) {
  const styles: Record<string, string> = {
    Pending:  isDarkMode ? "bg-amber-500/10 text-amber-400 border-amber-500/20"  : "bg-amber-50 text-amber-600 border-amber-200",
    Accepted: isDarkMode ? "bg-green-500/10 text-green-400 border-green-500/20"  : "bg-green-50 text-green-600 border-green-200",
    Approved: isDarkMode ? "bg-green-500/10 text-green-400 border-green-500/20"  : "bg-green-50 text-green-600 border-green-200",
    Rejected: isDarkMode ? "bg-red-500/10 text-red-400 border-red-500/20"        : "bg-red-50 text-red-600 border-red-200",
  }
  return (
    <div className={`px-4 md:px-6 py-2 rounded-full border text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] w-fit shadow-sm transition-all duration-500 ${styles[status] ?? ""}`}>
      {status === "Approved" ? "Accepted" : status}
    </div>
  )
})

export const DossierHeader = memo(function DossierHeader({
  student, formData, isDarkMode, isEditing, isSaving, hasChanges, isValid,
  showEditButton, onClose, onEditToggle, onCancelEdit, onSave, onImageClick, onDownloadForm,
}: DossierHeaderProps) {
  const [copied, setCopied] = useState(false)
  const isALS = student.student_category?.toLowerCase().includes("als")
  const badgeColor = isALS ? "bg-orange-500" : "bg-blue-600"

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
    <div className={`p-6 md:p-12 flex flex-col items-center text-center relative overflow-hidden shrink-0 transition-all duration-500 ${
      isDarkMode
        ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800"
        : "bg-slate-200 border-b border-slate-300"
    }`}>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 dark:opacity-10" />

      {/* Left buttons */}
      <div className="absolute top-4 left-4 z-30 flex gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onClose}
              className={`rounded-full transition-all active:scale-90 ${isDarkMode ? "bg-white/5 hover:bg-white/10 text-white" : "bg-white/20 hover:bg-white/40 text-slate-900"}`}>
              <X size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Close Dossier</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleCopyInfo}
              className={`rounded-full transition-all active:scale-90 ${isDarkMode ? "bg-white/5 hover:bg-white/10 text-white" : "bg-white/20 hover:bg-white/40 text-slate-900"}`}>
              {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Copy Student Info</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onDownloadForm}
              className={`rounded-full transition-all active:scale-90 ${isDarkMode ? "bg-white/5 hover:bg-white/10 text-white" : "bg-white/20 hover:bg-white/40 text-slate-900"}`}>
              <FileDown size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Download Registration Form</p></TooltipContent>
        </Tooltip>
      </div>

      {/* Right edit controls */}
      {showEditButton && <div className="absolute top-4 right-4 z-30 flex gap-2">
        {isEditing ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onCancelEdit} disabled={isSaving}
                  className="rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg bg-red-500 hover:bg-red-600 text-white">
                  <Undo2 size={14} className="mr-2" /> Cancel
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Discard Changes</p></TooltipContent>
            </Tooltip>
            {hasChanges && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={onSave} disabled={isSaving || !isValid}
                    className="rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg bg-green-600 hover:bg-green-700 text-white disabled:bg-slate-400 disabled:cursor-not-allowed">
                    <Save size={14} className="mr-2" /> {isSaving ? "Saving..." : "Save Changes"}
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
                className={`rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg ${isDarkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"}`}>
                <Edit2 size={14} className="mr-2" /> Edit Profile
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Modify Student Data</p></TooltipContent>
          </Tooltip>
        )}
      </div>}

      {/* Category badge */}
      <div className="absolute top-16 right-4 z-20">
        <Badge className={`${badgeColor} backdrop-blur-md text-white text-[9px] md:text-[10px] font-black px-3 md:px-5 py-2 md:py-2.5 uppercase tracking-widest border-none shadow-xl`}>
          {student.student_category || "Regular"}
        </Badge>
      </div>

      {/* Profile image */}
      <div className="relative z-10 mb-4 md:mb-8 scale-90 md:scale-100 mt-8">
        <div
          onClick={onImageClick}
          className={`w-36 h-36 md:w-48 md:h-48 rounded-[40px] md:rounded-[56px] border-[6px] overflow-hidden shadow-2xl flex items-center justify-center cursor-zoom-in group transition-all duration-500 hover:rotate-2 ${
            isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-300 border-white"
          }`}
        >
          {formData.profile_picture || student.profile_picture || student.two_by_two_url || student.profile_2x2_url ? (
            <OptimizedImage
              src={formData.profile_picture || student.profile_picture || student.two_by_two_url || student.profile_2x2_url}
              alt={`${student.last_name}, ${student.first_name}`}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              fallback={`https://api.dicebear.com/7.x/initials/svg?seed=${student.last_name}`}
            />
          ) : (
            <div className={`flex flex-col items-center ${isDarkMode ? "text-slate-600" : "text-slate-500"}`}>
              <User size={64} strokeWidth={1} />
              <p className="text-[10px] font-black uppercase mt-3">Identity Missing</p>
            </div>
          )}
          {isEditing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="text-white" size={32} />
            </div>
          )}
        </div>
      </div>

      <h2 className={`relative z-10 text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none italic transition-colors duration-500 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
        <AnimatedText text={`${formData.first_name} ${formData.last_name}`} />
      </h2>

      <div className="flex flex-col items-center gap-4 mt-4 md:mt-6 relative z-10">
        <p className={`font-bold uppercase tracking-[0.4em] text-[10px] md:text-[11px] px-4 py-1.5 rounded-full border backdrop-blur-sm transition-all duration-500 ${isDarkMode ? "text-slate-300 bg-white/5 border-white/5" : "text-slate-700 bg-black/5 border-black/10"}`}>
          Student LRN ID: {student.lrn}
        </p>
        <StatusBadge status={student.status} isDarkMode={isDarkMode} />
        {student.status === "Rejected" && (
          <div className="mt-4 w-full max-w-md animate-in fade-in slide-in-from-top-2 duration-500">
            <div className={`p-4 rounded-2xl border text-left ${isDarkMode ? "bg-red-950/30 border-red-900/50 text-red-200" : "bg-red-50 border-red-100 text-red-800"}`}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-70">Rejection Notice</p>
              <p className="text-xs font-bold leading-relaxed">{student.registrar_feedback || student.decline_reason || "No specific reason provided."}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
