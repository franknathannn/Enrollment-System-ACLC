"use client"

import { useMemo, useState } from "react"
import { History, User, CheckCircle2 } from "lucide-react"
import { Student } from "../types"

interface Props {
  students: Student[]
  attendance: Record<string, any>
  dm: boolean
}

export function LiveMonitoringHistory({ students, attendance, dm }: Props) {
  const textHead = dm ? "text-white" : "text-slate-900"
  const textSub = dm ? "text-slate-400" : "text-slate-500"
  const inputBg = dm ? "bg-slate-800" : "bg-slate-100"
  const borderDiv = dm ? "border-slate-800" : "border-slate-200"

  const [historyFilter, setHistoryFilter] = useState<"ALL" | "QR_SCAN" | "MANUAL">("ALL")

  // Derive scan history from attendance
  // Treat null/missing notes as "QR_SCAN" (legacy records before tagging was added)
  const scanHistory = useMemo(() => {
    const history = []
    for (const [studentId, record] of Object.entries(attendance)) {
      const tag = record.notes === "MANUAL" ? "MANUAL" : "QR_SCAN"
      if (historyFilter !== "ALL" && tag !== historyFilter) continue
      
      const student = students.find(s => s.id === studentId)
      if (student) {
        history.push({ student, record, tag })
      }
    }
    // Sort descending by time
    return history.sort((a, b) => b.record.time.localeCompare(a.record.time))
  }, [attendance, students, historyFilter])

  // Format 2024-03-24 to "Mar 24, 2024"
  const fmtDate = (d: string) => {
    if (!d) return ""
    const date = new Date(d)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const fmtDay = (d: string) => {
    if (!d) return ""
    const date = new Date(d)
    return date.toLocaleDateString("en-US", { weekday: "long" })
  }

  // Format HH:MM:SS to HH:MM AM/PM
  const fmtTime = (t: string) => {
    if (!t) return ""
    const [h, m] = t.split(":")
    const parsedH = parseInt(h, 10)
    return `${parsedH % 12 || 12}:${m} ${parsedH >= 12 ? "PM" : "AM"}`
  }

  return (
    <div className="flex flex-col h-full bg-inherit text-inherit">
      {/* Header */}
      <div className={`p-4 border-b ${borderDiv} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <History size={16} className={dm ? "text-blue-400" : "text-blue-500"} />
          <p className={`text-[10px] font-black uppercase tracking-widest ${textHead}`}>Scan History</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${dm ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
            {scanHistory.length} Records
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className={`flex items-center gap-1.5 p-3 border-b ${borderDiv} overflow-x-auto hide-scrollbar shrink-0`}>
        {([
          { val: "ALL", label: "All" },
          { val: "QR_SCAN", label: "Scanned" },
          { val: "MANUAL", label: "Manual" }
        ] as const).map(f => (
          <button
            key={f.val}
            onClick={() => setHistoryFilter(f.val)}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider shrink-0 transition-colors
              ${historyFilter === f.val 
                ? dm ? "bg-slate-700 text-white" : "bg-slate-800 text-white"
                : dm ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className={`flex-1 overflow-y-auto thin-scroll p-4 space-y-3`}>
        {scanHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
            <History size={32} className={textSub} />
            <p className={`text-[10px] font-bold uppercase tracking-widest ${textSub}`}>No Scans Yet</p>
            <p className={`text-[8px] text-center px-4 ${textSub}`}>Wait for students to scan their QR code to see them appear here.</p>
          </div>
        ) : (
          scanHistory.map((item, i) => (
            <div 
              key={`${item.student.id}-${item.record.time}`}
              className={`relative flex items-center gap-3 p-3 rounded-2xl border transition-all hover:-translate-y-0.5 content-visibility-auto
                ${i === 0 ? (dm ? "bg-blue-900/20 border-blue-500/30 shadow-[0_4px_20px_rgba(59,130,246,0.1)]" : "bg-blue-50 border-blue-200 shadow-sm") 
                          : (dm ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200")}`}
            >
              {i === 0 && (
                <div className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full shadow-md z-10">
                  New
                </div>
              )}

              <div className={`w-10 h-10 rounded-full border overflow-hidden shrink-0 ${borderDiv}`}>
                {(item.student.two_by_two_url || item.student.profile_picture)
                  ? <img src={item.student.two_by_two_url || item.student.profile_picture || ""} alt="" className="w-full h-full object-cover" />
                  : <div className={`w-full h-full flex items-center justify-center ${inputBg}`}><User size={16} className={textSub} /></div>}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-black uppercase truncate ${textHead}`}>
                  {item.student.last_name}, {item.student.first_name}
                </p>
                <p className={`text-[9px] font-bold mt-0.5 ${textSub}`}>LRN: {item.student.lrn}</p>

                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  <span className={`text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-md ${dm ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                    {fmtDate(item.record.date)}
                  </span>
                  <span className={`text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-md ${dm ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                    {fmtDay(item.record.date)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0 gap-1">
                <div className="flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-green-500" />
                  <p className="text-[10px] font-black text-green-500">
                    {fmtTime(item.record.time)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
                    item.tag === "QR_SCAN" 
                      ? (dm ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-600")
                      : (dm ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-600")
                  }`}>
                    {item.tag === "QR_SCAN" ? "Scanned" : "Manual"}
                  </span>
                  <p className={`text-[8px] font-bold ${
                    item.record.status === "Late" ? "text-amber-500" :
                    item.record.status === "Absent" ? "text-red-500" :
                    item.record.status === "Excused" ? "text-blue-500" :
                    "text-green-500"
                  }`}>
                    {item.record.status}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
