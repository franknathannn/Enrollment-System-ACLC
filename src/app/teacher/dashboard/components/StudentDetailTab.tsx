// app/teacher/dashboard/components/StudentDetailTab.tsx
"use client"

import { X, User } from "lucide-react"

import { Student, getStudentPhotoUrl } from "../types"

interface StudentDetailTabProps {
  student: Student | null
  dm: boolean
  onClose: () => void
}

export function StudentDetailTab({ student, dm, onClose }: StudentDetailTabProps) {
  if (!student) return null

  const photoUrl = getStudentPhotoUrl(student)
  const card  = dm ? "bg-slate-900/95 border-slate-700/60" : "bg-white border-slate-200"
  const sub   = dm ? "text-slate-400" : "text-slate-500"
  const head  = dm ? "text-white"     : "text-slate-900"

  const statusColor = student.status === "Enrolled"
    ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/25"
    : student.status === "Pending"
      ? "text-amber-500 bg-amber-500/10 border-amber-500/25"
      : (dm ? "text-slate-400 bg-slate-700/40 border-slate-600/40" : "text-slate-500 bg-slate-100 border-slate-200")

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-sm rounded-3xl border shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-200 ${card}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient header */}
        <div className={`relative px-5 pt-5 pb-8 ${dm ? "bg-gradient-to-b from-slate-800/80 to-transparent" : "bg-gradient-to-b from-blue-50/80 to-transparent"}`}>
          <div className="flex items-center justify-between mb-4">
            <p className={`text-[9px] font-black uppercase tracking-widest ${sub}`}>Student Profile</p>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-colors ${dm ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-200/60 text-slate-500"}`}
            >
              <X size={14} />
            </button>
          </div>

          {/* Photo — centered on header/body boundary */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={`${student.first_name} ${student.last_name}`}
                  className="w-24 h-24 rounded-2xl object-cover ring-4 ring-blue-500/25 shadow-lg"
                  onError={e => { e.currentTarget.style.display = "none" }}
                />
              ) : (
                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center shadow-sm ${dm ? "bg-slate-800 ring-4 ring-slate-700/50" : "bg-slate-200 ring-4 ring-slate-200/50"}`}>
                  <User size={32} className={sub} />
                </div>
              )}
              {/* Status dot */}
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 ${dm ? "border-slate-900" : "border-white"} ${student.status === "Enrolled" ? "bg-emerald-500" : "bg-amber-400"}`} />
            </div>
            <div className="text-center">
              <h2 className={`text-lg font-black ${head}`}>
                {student.last_name}, {student.first_name}
                {student.middle_name ? ` ${student.middle_name[0]}.` : ""}
              </h2>
              <p className={`text-[10px] font-mono mt-0.5 ${sub}`}>LRN: {student.lrn}</p>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className={`px-5 pb-5 pt-1 grid grid-cols-3 gap-2.5`}>
          <div className={`rounded-xl p-3 col-span-1 ${dm ? "bg-slate-800/60" : "bg-slate-50"}`}>
            <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${sub}`}>Gender</p>
            <p className={`text-sm font-black ${student.gender === "Male" ? "text-blue-500" : "text-pink-500"}`}>{student.gender || "—"}</p>
          </div>
          <div className={`rounded-xl p-3 col-span-2 ${dm ? "bg-slate-800/60" : "bg-slate-50"}`}>
            <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${sub}`}>Section</p>
            <p className={`text-sm font-black truncate ${head}`}>{student.section || "—"}</p>
          </div>
          <div className={`rounded-xl p-3 col-span-3 border ${statusColor}`}>
            <p className={`text-[8px] font-black uppercase tracking-widest mb-1 opacity-70`}>Status</p>
            <p className={`text-sm font-black`}>{student.status || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  )
}