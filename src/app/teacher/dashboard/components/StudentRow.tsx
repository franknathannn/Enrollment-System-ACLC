// app/teacher/dashboard/components/StudentRow.tsx
"use client"

import { useState, useRef } from "react"
import { StudentAvatar } from "./Avatar"
import { Student, getStudentPhotoUrl } from "../types"

interface StudentRowProps {
  student: Student
  dm: boolean
  onClick: (student: Student) => void
}

export function StudentRow({ student, dm, onClick }: StudentRowProps) {
  const [hovered, setHovered]   = useState(false)
  const [imgError, setImgError] = useState(false)

  const sub2     = dm ? "text-slate-400" : "text-slate-500"
  const photoUrl = getStudentPhotoUrl(student)
  const fullName = `${student.first_name} ${student.last_name}`
  const initials = fullName.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
  const hue      = fullName.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360

  return (
    <div
      className={`relative flex items-center gap-3 px-4 md:px-5 py-2.5 transition-all duration-150 cursor-pointer select-none
        ${dm ? "hover:bg-slate-700/30" : "hover:bg-slate-50/80"}`}
      onClick={() => onClick(student)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <StudentAvatar student={student} size={30} />

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-black truncate ${dm ? "text-slate-200" : "text-slate-800"}`}>
          {student.last_name}, {student.first_name}
          {student.middle_name ? ` ${student.middle_name[0]}.` : ""}
        </p>
        <p className={`text-[9px] font-mono ${sub2}`}>{student.lrn}</p>
      </div>

      <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0
        ${student.gender === "Male"
          ? (dm ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-blue-50 border-blue-100 text-blue-600")
          : (dm ? "bg-pink-500/10 border-pink-500/20 text-pink-400" : "bg-pink-50 border-pink-100 text-pink-600")
        }`}>
        {student.gender === "Male" ? "M" : "F"}
      </span>

      {/* ── Hover photo card — appears to the LEFT of the row ── */}
      {hovered && (
        <div
          className={`
            absolute right-full top-1/2 -translate-y-1/2 mr-3 z-[9999]
            flex flex-col items-center gap-2 p-3 rounded-2xl shadow-2xl border
            pointer-events-none
            ${dm ? "bg-slate-800 border-slate-600" : "bg-white border-slate-200"}
          `}
          style={{ minWidth: 96 }}
        >
          {/* Photo or colour-coded initials fallback */}
          {photoUrl && !imgError ? (
            <img
              src={photoUrl}
              alt={fullName}
              className="w-20 h-20 rounded-xl object-cover object-top"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-xl flex items-center justify-center font-black text-white text-2xl select-none"
              style={{ background: `hsl(${hue},65%,45%)` }}
            >
              {initials}
            </div>
          )}
          <div className="text-center w-20">
            <p className={`text-[9px] font-black truncate ${dm ? "text-slate-200" : "text-slate-800"}`}>
              {student.first_name}
            </p>
            <p className={`text-[8px] truncate ${sub2}`}>{student.last_name}</p>
          </div>
        </div>
      )}
    </div>
  )
}