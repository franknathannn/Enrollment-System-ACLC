"use client"

import React from "react"
import { CheckCircle2, AlertTriangle, Clock, User, History } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ScanEvent {
  id: string
  studentName: string
  timestamp: string
  status: "success" | "warning" | "error"
  message: string
  lrn?: string
  profilePicture?: string
}

interface AttendanceScanHistoryProps {
  history: ScanEvent[]
  isDarkMode: boolean
}

const fmtT = (t: string) => {
  if (!t) return ""
  // If it's already a formatted time string like "HH:mm:ss"
  if (t.includes(":")) {
    const [h, m] = t.split(":").map(Number)
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
  }
  return t
}

export function AttendanceScanHistory({ history, isDarkMode }: AttendanceScanHistoryProps) {
  const sub = isDarkMode ? "text-slate-400" : "text-slate-500"
  const head = isDarkMode ? "text-white" : "text-slate-900"
  const divB = isDarkMode ? "border-slate-800" : "border-slate-100"

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={cn("p-4 border-b shrink-0", divB)}>
        <p className={cn("text-[10px] font-black uppercase tracking-widest", sub)}>Recent Activity</p>
        <p className={cn("text-xs font-black mt-1", head)}>Scan History</p>
      </div>

      <div className="flex-1 overflow-y-auto thin-scroll p-4 space-y-3">
        {history.length === 0 ? (
          <div className="py-20 text-center px-4">
            <History size={32} className={cn("mx-auto mb-3 opacity-20", head)} />
            <p className={cn("text-xs font-bold", sub)}>No scans yet</p>
            <p className={cn("text-[10px] mt-1", sub)}>Waiting for activity...</p>
          </div>
        ) : (
          history.map((event, idx) => (
            <div 
              key={event.id + idx} 
              className={cn(
                "p-3 rounded-2xl border transition-all animate-in slide-in-from-right-4 duration-300",
                event.status === "success" 
                  ? (isDarkMode ? "bg-green-500/5 border-green-500/20" : "bg-green-50 border-green-100")
                  : event.status === "warning"
                    ? (isDarkMode ? "bg-amber-500/5 border-amber-500/20" : "bg-amber-50 border-amber-100")
                    : (isDarkMode ? "bg-red-500/5 border-red-500/20" : "bg-red-50 border-red-100")
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("w-8 h-8 rounded-lg overflow-hidden shrink-0", isDarkMode ? "bg-slate-800" : "bg-white shadow-sm")}>
                  {event.profilePicture 
                    ? <img src={event.profilePicture} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><User size={14} className={sub} /></div>}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("text-[10px] font-black uppercase truncate", head)}>{event.studentName}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <Clock size={10} className={sub} />
                      <p className={cn("text-[9px] font-bold tabular-nums", sub)}>{fmtT(event.timestamp)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 mt-1">
                    {event.status === "success" && <CheckCircle2 size={11} className="text-green-500" />}
                    {event.status === "warning" && <AlertTriangle size={11} className="text-amber-500" />}
                    {event.status === "error" && <AlertTriangle size={11} className="text-red-500" />}
                    <p className={cn("text-[9px] font-bold leading-tight", 
                      event.status === "success" ? "text-green-600 dark:text-green-400" :
                      event.status === "warning" ? "text-amber-600 dark:text-amber-400" :
                      "text-red-600 dark:text-red-400"
                    )}>
                      {event.message}
                    </p>
                  </div>
                  
                  {event.lrn && (
                    <p className={cn("text-[8px] font-black uppercase tracking-wider mt-1 opacity-60", sub)}>
                      LRN: {event.lrn}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {history.length > 0 && (
        <div className={cn("p-4 border-t", divB)}>
          <p className={cn("text-[9px] font-bold text-center", sub)}>
            Showing last {history.length} scans
          </p>
        </div>
      )}
    </div>
  )
}
