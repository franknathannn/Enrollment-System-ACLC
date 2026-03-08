// src/app/admin/applicants/components/DossierDocuments.tsx
import { memo } from "react"
import { FileText, ZoomIn, Camera, ScrollText } from "lucide-react"
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
  if (!url)
    return (
      <div className={`p-4 md:p-6 rounded-[24px] border border-dashed opacity-40 flex flex-col items-center justify-center text-slate-400 h-32 md:h-40 transition-colors duration-500 ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
        <FileText size={20} className="mb-2 opacity-50" />
        <p className="text-[8px] font-black uppercase tracking-widest text-center leading-none">{label}</p>
      </div>
    )

  return (
    <div onClick={(e) => { e.stopPropagation(); onOpen?.(url, label) }} className="cursor-pointer group relative">
      <div className={`p-2 rounded-[24px] border hover:border-blue-400 hover:shadow-2xl transition-all h-full relative overflow-hidden duration-500 ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
        <div className={`h-28 md:h-32 rounded-[18px] overflow-hidden relative transition-colors duration-500 ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}>
          {url.toLowerCase().endsWith(".pdf") ? (
            <div className={`w-full h-full flex flex-col items-center justify-center ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`}>
              <FileText size={32} className="text-slate-400" />
              <p className="text-[8px] font-black uppercase text-slate-500 mt-2">PDF Document</p>
            </div>
          ) : (
            <img src={url} alt={label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
          )}
          <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
            <ZoomIn className="text-white drop-shadow-md" size={24} />
          </div>
          {isEditing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <Camera className="text-white" size={32} />
            </div>
          )}
        </div>
        <p className={`text-[10px] font-black text-center mt-3 uppercase tracking-widest leading-tight px-1 truncate transition-colors duration-500 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
          {label}
        </p>
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
    <div className="space-y-8 pb-12">
      <SectionTitle
        icon={<ScrollText size={16} />}
        title="VI. Student Documents"
        isDarkMode={isDarkMode}
        colorClass={isDarkMode ? "text-slate-400" : "text-slate-500"}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
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
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 text-center italic mt-6 opacity-60">
        Educational Verification System.
      </p>
    </div>
  )
})
