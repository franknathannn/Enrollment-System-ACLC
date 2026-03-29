"use client"

import { useState } from "react"
import { Search, X, CheckCircle2, Clock, MinusCircle, ShieldCheck, User, QrCode } from "lucide-react"
import { Student } from "../types"
import { AttStatus } from "./AttendanceTab"

interface Props {
  students: Student[]
  attendance: Record<string, any>
  dm: boolean
  onUpdateStatus: (studentId: string, status: AttStatus) => Promise<void>
  onMarkAllPresent: () => Promise<void>
  onMarkRemainingAbsent: () => Promise<void>
  setQrViewStudent: (student: Student) => void
}

type FilterType = "ALL" | "Present" | "Late" | "Absent" | "Not Scanned"

export function LiveMonitoringList({ students, attendance, dm, onUpdateStatus, onMarkAllPresent, onMarkRemainingAbsent, setQrViewStudent }: Props) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterType>("ALL")

  const textHead = dm ? "text-white" : "text-slate-900"
  const textSub = dm ? "text-slate-400" : "text-slate-500"
  const bgInput = dm ? "bg-slate-800/50" : "bg-slate-50"
  const borderDiv = dm ? "border-slate-800" : "border-slate-200"

  const filtered = students.filter(s => {
    if (search) {
      const q = search.toLowerCase()
      if (!s.first_name.toLowerCase().includes(q) && !s.last_name.toLowerCase().includes(q) && !s.lrn.includes(q)) return false
    }
    if (filter === "Not Scanned") return !attendance[s.id]
    if (filter !== "ALL") return attendance[s.id]?.status === filter
    return true
  }).sort((a, b) => a.last_name.localeCompare(b.last_name))

  const pCnt = students.filter(s => attendance[s.id]?.status === "Present").length
  const lCnt = students.filter(s => attendance[s.id]?.status === "Late").length
  const aCnt = students.filter(s => attendance[s.id]?.status === "Absent").length
  const nCnt = students.filter(s => !attendance[s.id]).length

  return (
    <div className="flex flex-col h-full bg-inherit text-inherit">
      
      {/* List Header */}
      <div className={`p-4 border-b ${borderDiv}`}>
        <div className="flex items-center justify-between mb-3">
          <p className={`text-[10px] font-black uppercase tracking-widest ${textSub}`}>Attendance List</p>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${dm ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700"}`}>
            {students.length} Total
          </span>
        </div>

        {/* Search */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors focus-within:border-blue-500/50
          ${bgInput} ${dm ? "border-slate-700/50" : "border-slate-300"}`}>
          <Search size={14} className={textSub} />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search student..."
            className={`flex-1 text-[11px] font-bold bg-transparent outline-none ${textHead} placeholder-slate-400/50`} 
          />
          {search && <button onClick={() => setSearch("")}><X size={12} className={textSub} /></button>}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto thin-scroll pb-1 hide-scrollbar">
          {([
            { val: "ALL", label: "All" },
            { val: "Present", label: "Present" },
            { val: "Late", label: "Late" },
            { val: "Absent", label: "Absent" },
            { val: "Not Scanned", label: "Not Scanned" }
          ] as const).map(f => (
            <button
              key={f.val}
              onClick={() => setFilter(f.val)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider shrink-0 transition-colors
                ${filter === f.val 
                  ? f.val === "Present" ? "bg-green-500/20 text-green-500" 
                  : f.val === "Late" ? "bg-amber-500/20 text-amber-500"
                  : f.val === "Absent" ? "bg-red-500/20 text-red-500"
                  : dm ? "bg-slate-700 text-white" : "bg-slate-800 text-white"
                  : dm ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100"}`}
            >
              {f.label} 
              {f.val === "Present" && ` (${pCnt})`}
              {f.val === "Late" && ` (${lCnt})`}
              {f.val === "Absent" && ` (${aCnt})`}
              {f.val === "Not Scanned" && ` (${nCnt})`}
            </button>
          ))}
        </div>
      </div>

      {/* List Body */}
      <div className={`flex-1 overflow-y-auto thin-scroll divide-y ${dm ? "divide-slate-800/50" : "divide-slate-100"}`}>
        {filtered.map(student => {
          const att = attendance[student.id]
          const isPresent = att?.status === "Present"
          const isLate = att?.status === "Late"
          const isAbsent = att?.status === "Absent"
          const isExcused = att?.status === "Excused"

          const statusColor = isPresent ? "text-green-500" : isLate ? "text-amber-500" : isAbsent ? "text-red-500" : isExcused ? "text-blue-500" : textSub

          return (
            <div key={student.id} className={`p-4 flex items-center justify-between gap-3 content-visibility-auto ${dm ? "hover:bg-slate-800/30" : "hover:bg-slate-50"}`}>
              {/* Profile Pic & Info */}
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 border ${dm ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"}`}>
                  {(student.two_by_two_url || student.profile_picture)
                    ? <img src={student.two_by_two_url || student.profile_picture || ""} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><User size={14} className={textSub} /></div>}
                </div>
                
                <div className="flex flex-col overflow-hidden">
                  <p className={`text-[11px] font-black uppercase truncate ${textHead}`}>{student.last_name}, {student.first_name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {att ? (
                      <>
                        {isPresent && <CheckCircle2 size={10} className={statusColor} />}
                        {isLate && <Clock size={10} className={statusColor} />}
                        {isAbsent && <MinusCircle size={10} className={statusColor} />}
                        {isExcused && <ShieldCheck size={10} className={statusColor} />}
                        <span className={`text-[9px] font-bold ${statusColor}`}>{att.status}</span>
                      </>
                    ) : (
                      <span className={`text-[9px] font-bold ${textSub}`}>Not yet Scanned</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1 shrink-0">
                <button title="View QR" onClick={() => setQrViewStudent(student)} className={`p-2 rounded-lg transition-colors ${dm ? "text-slate-600 hover:text-blue-500" : "text-slate-300 hover:text-blue-600"}`}>
                  <QrCode size={13} />
                </button>
                <div className={`w-px h-6 mx-0.5 ${dm ? "bg-slate-800" : "bg-slate-200"}`}></div>
                <button title="Mark Present" onClick={() => onUpdateStatus(student.id, "Present")} className={`p-2 rounded-lg transition-colors ${isPresent ? "bg-green-500/20 text-green-500" : dm ? "text-slate-600 hover:text-green-500" : "text-slate-300 hover:text-green-600"}`}>
                  <CheckCircle2 size={13} />
                </button>
                <button title="Mark Late" onClick={() => onUpdateStatus(student.id, "Late")} className={`p-2 rounded-lg transition-colors ${isLate ? "bg-amber-500/20 text-amber-500" : dm ? "text-slate-600 hover:text-amber-500" : "text-slate-300 hover:text-amber-600"}`}>
                  <Clock size={13} />
                </button>
                <button title="Mark Excused" onClick={() => onUpdateStatus(student.id, "Excused")} className={`p-2 rounded-lg transition-colors ${isExcused ? "bg-blue-500/20 text-blue-500" : dm ? "text-slate-600 hover:text-blue-500" : "text-slate-300 hover:text-blue-600"}`}>
                  <ShieldCheck size={13} />
                </button>
                <button title="Mark Absent" onClick={() => onUpdateStatus(student.id, "Absent")} className={`p-2 rounded-lg transition-colors ${isAbsent ? "bg-red-500/20 text-red-500" : dm ? "text-slate-600 hover:text-red-500" : "text-slate-300 hover:text-red-600"}`}>
                  <MinusCircle size={13} />
                </button>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="p-8 text-center">
            <p className={`text-[10px] font-bold ${textSub}`}>No students found.</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className={`p-3 border-t flex flex-col gap-2 ${borderDiv}`}>
        <div className="flex justify-between items-center px-1 mb-1">
          <p className={`text-[9px] font-bold ${textSub}`}>{Object.keys(attendance).length} / {students.length} Scanned</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onMarkAllPresent}
            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors
              ${dm ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>
            All Present
          </button>
          <button onClick={onMarkRemainingAbsent}
            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors
              ${dm ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-600 hover:bg-red-100"}`}>
            All Absent
          </button>
        </div>
      </div>
    </div>
  )
}
