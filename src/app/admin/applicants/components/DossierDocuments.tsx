// src/app/admin/applicants/components/DossierDocuments.tsx
import { memo } from "react"
import { FileText, ZoomIn, Camera, ScrollText, Upload, CheckCircle2 } from "lucide-react"
import { SectionTitle } from "./DossierPrimitives"

// ── CredentialCard ────────────────────────────────────────────────────────
const CredentialCard = memo(function CredentialCard({
  label, url, onOpen, isDarkMode, isEditing,
}: {
  label: string
  url: string
  onOpen?: (url: string, label: string) => void
  isDarkMode: boolean
  isEditing?: boolean
}) {
  const isPdf = url?.toLowerCase().endsWith(".pdf")

  if (!url)
    return (
      <div className={`rounded-[22px] border border-dashed flex flex-col items-center justify-center gap-2.5 h-44 md:h-52 transition-all duration-300 group ${
        isDarkMode
          ? "bg-slate-900/50 border-slate-700/60 hover:border-slate-600 hover:bg-slate-900"
          : "bg-slate-50/80 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      } ${isEditing ? "cursor-pointer" : "cursor-default"}`}>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-colors duration-300 ${
          isDarkMode ? "bg-slate-800 border-slate-700 group-hover:border-slate-600" : "bg-white border-slate-200 shadow-sm"
        }`}>
          {isEditing
            ? <Upload size={17} className={isDarkMode ? "text-slate-500 group-hover:text-blue-400" : "text-slate-400 group-hover:text-blue-500"} />
            : <FileText size={17} className="text-slate-400 opacity-50" />
          }
        </div>
        <div className="text-center px-2">
          <p className={`text-[8px] font-black uppercase tracking-widest leading-tight mb-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
            {label}
          </p>
          <p className={`text-[7px] font-bold uppercase tracking-wider ${isEditing ? "text-blue-400" : "text-red-400/60"}`}>
            {isEditing ? "Click to Upload" : "Not Submitted"}
          </p>
        </div>
      </div>
    )

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onOpen?.(url, label) }}
      className="cursor-pointer group relative"
    >
      <div className={`p-2 rounded-[22px] border transition-all duration-300 h-full relative overflow-hidden ${
        isDarkMode
          ? "bg-slate-900 border-slate-800 hover:border-slate-600 hover:shadow-[0_8px_32px_-8px_rgba(59,130,246,0.25)]"
          : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/8"
      }`}>

        {/* Image / PDF preview */}
        <div className={`h-32 md:h-36 rounded-[16px] overflow-hidden relative ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}>
          {isPdf ? (
            <div className={`w-full h-full flex flex-col items-center justify-center gap-2.5 ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                isDarkMode ? "bg-red-500/15 border-red-500/25" : "bg-red-50 border-red-200"
              }`}>
                <FileText size={22} className="text-red-400" />
              </div>
              <p className={`text-[8px] font-black uppercase tracking-widest ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                PDF Document
              </p>
            </div>
          ) : (
            <img
              src={url}
              alt={label}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-slate-900/55 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200 backdrop-blur-[2px]">
            {isEditing
              ? <Camera className="text-white drop-shadow-lg" size={26} />
              : <ZoomIn className="text-white drop-shadow-lg" size={26} />
            }
          </div>

          {/* File-type pill */}
          <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest shadow-sm ${
            isPdf
              ? (isDarkMode ? "bg-red-500/30 text-red-300 border border-red-500/30" : "bg-red-100 text-red-600 border border-red-200")
              : (isDarkMode ? "bg-blue-500/30 text-blue-300 border border-blue-500/30" : "bg-blue-100 text-blue-600 border border-blue-200")
          }`}>
            {isPdf ? "PDF" : "IMG"}
          </div>

          {/* Submitted indicator */}
          <div className="absolute top-2 right-2">
            <CheckCircle2 size={14} className={isDarkMode ? "text-emerald-400 drop-shadow" : "text-emerald-500 drop-shadow"} />
          </div>
        </div>

        {/* Label */}
        <div className="mt-2.5 px-1 pb-0.5">
          <p className={`text-[9px] font-black text-center uppercase tracking-widest leading-tight truncate transition-colors duration-200 ${
            isDarkMode ? "text-slate-300 group-hover:text-white" : "text-slate-600 group-hover:text-slate-900"
          }`}>
            {label}
          </p>
        </div>
      </div>
    </div>
  )
})

// ── DossierDocuments ──────────────────────────────────────────────────────
export const DossierDocuments = memo(function DossierDocuments({
  student, formData, isEditing, isDarkMode, isJHS,
  onOpenFile, onDocClick, getAllDocs,
}: {
  student: any
  formData: any
  isEditing: boolean
  isDarkMode: boolean
  isJHS: boolean
  onOpenFile: (url: string, label: string, allDocs?: { url: string; label: string }[]) => void
  onDocClick: (field: string) => void
  getAllDocs: () => { url: string; label: string }[]
}) {
  const makeOpen = (field: string, label: string) => (url: string) =>
    isEditing ? onDocClick(field) : onOpenFile(url, label, getAllDocs())

  return (
    <div className="space-y-6 pb-12">
      <SectionTitle
        icon={<ScrollText size={15} />}
        title="VI. Student Documents"
        isDarkMode={isDarkMode}
        colorClass={isDarkMode ? "text-slate-400" : "text-slate-500"}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <CredentialCard
          label="Birth Certificate"
          url={formData.birth_certificate_url}
          onOpen={makeOpen("birth_certificate_url", `${student.last_name}_BIRTH_CERT`.toUpperCase())}
          isDarkMode={isDarkMode} isEditing={isEditing}
        />
        {isJHS ? (
          <>
            <CredentialCard
              label="Form 138"
              url={formData.form_138_url}
              onOpen={makeOpen("form_138_url", `${student.last_name}_FORM_138`.toUpperCase())}
              isDarkMode={isDarkMode} isEditing={isEditing}
            />
            <CredentialCard
              label="Good Moral"
              url={formData.good_moral_url}
              onOpen={makeOpen("good_moral_url", `${student.last_name}_GOOD_MORAL`.toUpperCase())}
              isDarkMode={isDarkMode} isEditing={isEditing}
            />
          </>
        ) : (
          <>
            <CredentialCard
              label="ALS Rating"
              url={formData.cor_url}
              onOpen={makeOpen("cor_url", `${student.last_name}_ALS_RATING`.toUpperCase())}
              isDarkMode={isDarkMode} isEditing={isEditing}
            />
            <CredentialCard
              label="Diploma"
              url={formData.diploma_url}
              onOpen={makeOpen("diploma_url", `${student.last_name}_DIPLOMA`.toUpperCase())}
              isDarkMode={isDarkMode} isEditing={isEditing}
            />
            <CredentialCard
              label="AF5 Form"
              url={formData.af5_url}
              onOpen={makeOpen("af5_url", `${student.last_name}_AF5`.toUpperCase())}
              isDarkMode={isDarkMode} isEditing={isEditing}
            />
          </>
        )}
      </div>
      <p className={`text-[8px] font-bold uppercase tracking-[0.3em] text-center mt-4 ${isDarkMode ? "text-slate-700" : "text-slate-300"}`}>
        Educational Verification System — Confidential
      </p>
    </div>
  )
})
