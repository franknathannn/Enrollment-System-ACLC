"use client"

import { UserCog, User, GraduationCap, Heart, Phone } from "lucide-react"

interface Props {
  allowStudentEdit: boolean
  isDarkMode: boolean
  updating: boolean
  onToggle: (value: boolean) => void
}

const EDIT_CATEGORIES = [
  {
    icon: User,
    title: "Personal Identity",
    color: "blue",
    fields: "Name, Gender, Birthdate, Age, Civil Status, Nationality, Religion, Address, Email",
  },
  {
    icon: GraduationCap,
    title: "Academic Background",
    color: "indigo",
    fields: "LRN, Student Category, School Type, Last School Attended, School Address, GWA, Year Completed JHS, Facebook, Preferred Shift & Modality",
  },
  {
    icon: Heart,
    title: "Guardian / Family",
    color: "rose",
    fields: "Guardian Name (First, Middle, Last), Guardian Phone, Guardian Email",
  },
  {
    icon: Phone,
    title: "Contact Information",
    color: "emerald",
    fields: "Phone Number, Email Address, Home Address",
  },
]

const colorMap: Record<string, { iconBg: string; iconBgOff: string; dot: string }> = {
  blue:    { iconBg: "bg-blue-500/10 text-blue-400",    iconBgOff: "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500", dot: "bg-blue-500" },
  indigo:  { iconBg: "bg-indigo-500/10 text-indigo-400",  iconBgOff: "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500", dot: "bg-indigo-500" },
  rose:    { iconBg: "bg-rose-500/10 text-rose-400",      iconBgOff: "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500", dot: "bg-rose-500" },
  emerald: { iconBg: "bg-emerald-500/10 text-emerald-400",iconBgOff: "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500", dot: "bg-emerald-500" },
}

export function StudentEditControl({ allowStudentEdit, isDarkMode, updating, onToggle }: Props) {
  const d = isDarkMode

  return (
    <div className={`rounded-[32px] border transition-all duration-500 overflow-hidden ${
      d ? "bg-slate-900 border-slate-700/60" : "bg-white border-slate-200"
    }`}>
      {/* Header toggle */}
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl transition-colors duration-300 ${
              allowStudentEdit
                ? "bg-blue-500/10"
                : d ? "bg-slate-800" : "bg-slate-100"
            }`}>
              <UserCog size={20} className={allowStudentEdit ? "text-blue-400" : "text-slate-400"} />
            </div>
            <div>
              <p className={`text-xs font-black uppercase tracking-[0.2em] ${d ? "text-white" : "text-slate-900"}`}>
                Allow Students to Edit Information
              </p>
              <p className={`text-[9px] mt-0.5 ${d ? "text-slate-500" : "text-slate-400"}`}>
                {allowStudentEdit
                  ? "Students can edit their personal, academic, and guardian details from their dashboard"
                  : "Student information is read-only — only admins can modify records"}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={updating}
            onClick={() => onToggle(!allowStudentEdit)}
            role="switch"
            aria-checked={allowStudentEdit}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 flex-shrink-0 disabled:opacity-50
              ${allowStudentEdit ? "bg-blue-500" : d ? "bg-slate-600" : "bg-slate-300"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
              ${allowStudentEdit ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      </div>

      {/* Category breakdown — only visible when enabled */}
      {allowStudentEdit && (
        <div className={`border-t px-6 pb-6 pt-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
          d ? "border-slate-700/40" : "border-slate-100"
        }`}>
          <p className={`text-[8px] font-black uppercase tracking-[0.35em] mb-4 ${d ? "text-slate-600" : "text-slate-400"}`}>
            Editable Categories
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EDIT_CATEGORIES.map(({ icon: Icon, title, color, fields }) => {
              const c = colorMap[color]
              return (
                <div
                  key={title}
                  className={`rounded-2xl border p-4 transition-colors duration-300 ${
                    d ? "bg-white/[0.02] border-white/8" : "bg-slate-50/80 border-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.iconBg}`}>
                      <Icon size={14} />
                    </div>
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${d ? "text-white" : "text-slate-800"}`}>
                      {title}
                    </p>
                  </div>
                  <p className={`text-[9px] leading-relaxed font-medium ${d ? "text-slate-500" : "text-slate-400"}`}>
                    {fields}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Warning */}
          <div className={`mt-4 flex items-start gap-3 px-4 py-3 rounded-xl border ${
            d ? "bg-amber-500/5 border-amber-500/15" : "bg-amber-50 border-amber-200"
          }`}>
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
            <p className={`text-[9px] leading-relaxed font-semibold ${d ? "text-amber-400/80" : "text-amber-600"}`}>
              Students cannot modify: Status, Section, Grade Level, School Year, Documents, or OED Credentials.
              Those remain admin-only.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
