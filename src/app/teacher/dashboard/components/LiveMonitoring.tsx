"use client"

import { useState, useEffect } from "react"
import { X, LayoutDashboard, Globe, ExternalLink, Wifi } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Student, ScheduleRow } from "../types"
import { AttRecord, AttStatus } from "./AttendanceTab"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LiveMonitoringList } from "./LiveMonitoringList"
import { LiveMonitoringScanner } from "./LiveMonitoringScanner"
import { LiveMonitoringHistory } from "./LiveMonitoringHistory"

interface Props {
  students: Student[]
  period: ScheduleRow
  attendance: Record<string, any> // any for AttRecord right now
  dm: boolean
  isOnline: boolean
  onClose: () => void
  onScan: (raw: string) => Promise<void>
  onUpdateStatus: (studentId: string, status: AttStatus) => Promise<void>
  onMarkAllPresent: () => Promise<void>
  onMarkRemainingAbsent: () => Promise<void>
  isScannerLive: boolean
  graceMins: number
  beepOn: boolean
  setGraceMins: (mins: number) => void
  setBeepPersist: (on: boolean) => void
  setQrViewStudent: (student: Student) => void
  schedules: ScheduleRow[]
  setPeriod: (p: ScheduleRow) => void
}

export function LiveMonitoring({
  students,
  period,
  attendance,
  dm,
  onClose,
  onScan,
  onUpdateStatus,
  onMarkAllPresent,
  onMarkRemainingAbsent,
  isScannerLive,
  graceMins,
  beepOn,
  setGraceMins,
  setBeepPersist,
  setQrViewStudent,
  schedules,
  setPeriod
}: Props) {
  // We use full screen fixed overlay, taking highest z-index
  
  // To handle rendering animation
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  const bg = dm ? "bg-slate-950" : "bg-slate-50"
  const textHead = dm ? "text-white" : "text-slate-900"
  const sectionStudents = students.filter(s => s.section === period.section)

  const pCnt = sectionStudents.filter(s => attendance[s.id]?.status === "Present").length
  const lCnt = sectionStudents.filter(s => attendance[s.id]?.status === "Late").length
  const eCnt = sectionStudents.filter(s => attendance[s.id]?.status === "Excused").length
  const aCnt = sectionStudents.filter(s => attendance[s.id]?.status === "Absent").length
  const nCnt = sectionStudents.filter(s => !attendance[s.id]).length

  return (
    <div className={`fixed inset-0 z-[100] hidden md:flex flex-col transform transition-all duration-500 ease-out select-none
       ${bg} ${mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
      
      {/* Header */}
      <div className={`h-16 border-b shrink-0 flex items-center justify-between px-6 
        ${dm ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-slate-200"} backdrop-blur-md`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${dm ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-200"}`}>
            <LayoutDashboard size={18} className="text-blue-500" />
          </div>
          <div>
            <h1 className={`text-sm font-black uppercase tracking-widest ${textHead}`}>Live Monitoring</h1>
            <Select value={period.id} onValueChange={val => {
              const next = schedules.find(s => s.id === val)
              if (next) setPeriod(next)
            }}>
              <SelectTrigger className={`border-none ring-0 focus:ring-0 shadow-none bg-transparent h-fit py-1 px-0 -ml-1 gap-1 text-[10px] font-bold outline-none cursor-pointer transition-opacity text-left w-auto max-w-full [&>span]:line-clamp-none
                ${dm ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-black"}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={`z-[150] ${dm ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
                {schedules.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs font-bold cursor-pointer transition-colors whitespace-nowrap">
                    {p.subject} · {p.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <button 
          onClick={onClose}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95
            ${dm ? "bg-slate-800 text-slate-300 hover:bg-red-500/10 hover:text-red-400" : "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600"}`}>
          <X size={14} /> Close Monitor
        </button>
      </div>

      {/* Analytics & Settings Row */}
      <div className={`shrink-0 flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b ${dm ? "border-slate-800 bg-slate-900/40" : "border-slate-200 bg-white"}`}>
        {/* Stat Blocks */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {[
            { label: "Present", val: pCnt, c: "text-emerald-500", bg: dm ? "bg-[#06261A] border-[#0A3D2A]" : "bg-emerald-50 border-emerald-200" },
            { label: "Late", val: lCnt, c: "text-amber-500", bg: dm ? "bg-[#291A05] border-[#442C0A]" : "bg-amber-50 border-amber-200" },
            { label: "Excused", val: eCnt, c: "text-blue-500", bg: dm ? "bg-[#091C3F] border-[#122A59]" : "bg-blue-50 border-blue-200" },
            { label: "Absent", val: aCnt, c: "text-red-500", bg: dm ? "bg-[#2D0B12] border-[#4A1620]" : "bg-red-50 border-red-200" },
            { label: "Pending", val: nCnt, c: "text-slate-300", bg: dm ? "bg-[#101520] border-[#1D2536]" : "bg-slate-100 border-slate-200" },
          ].map(s => (
            <div key={s.label} className={`px-8 py-3 rounded-[12px] border-[1.5px] flex flex-col items-center justify-center min-w-[120px] transition-transform hover:scale-[1.02] ${s.bg}`}>
              <span className={`text-[2rem] leading-none font-black ${s.c}`}>{s.val}</span>
              <span className={`text-[10px] font-black uppercase tracking-widest mt-2 ${s.c}`}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Settings */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${dm ? "text-slate-400" : "text-slate-500"}`}>Beep</span>
            <Switch checked={beepOn} onCheckedChange={setBeepPersist} className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${dm ? "text-slate-400" : "text-slate-500"}`}>Auto-Late:</span>
            <Select value={String(graceMins)} onValueChange={v => setGraceMins(Number(v))}>
              <SelectTrigger className={`h-7 w-24 rounded-xl border px-3 text-[10px] font-black uppercase shadow-sm outline-none ring-0 focus:ring-2 focus:ring-blue-500/50
                ${dm ? "bg-slate-800/80 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={`z-[150] ${dm ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
                {[0,10,20,30,40,50].map(m => (
                  <SelectItem key={m} value={String(m)} className="text-[10px] font-black uppercase cursor-pointer">
                    {m === 0 ? "Off" : `${m} min`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Layout — 3 columns for in-person, 2 columns for online */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left Column: Attendance List */}
        <div className={`${period.is_online ? "w-[40%]" : "w-[28%]"} min-w-[320px] max-w-[480px] flex flex-col rounded-3xl border overflow-hidden
          ${dm ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"}`}>
          <LiveMonitoringList
            students={sectionStudents}
            attendance={attendance}
            dm={dm}
            onUpdateStatus={onUpdateStatus}
            onMarkAllPresent={onMarkAllPresent}
            onMarkRemainingAbsent={onMarkRemainingAbsent}
            setQrViewStudent={setQrViewStudent}
          />
        </div>

        {/* Middle Column: Scanner (in-person) OR Online Class Guidance */}
        <div className={`flex-1 flex flex-col rounded-3xl border overflow-hidden
          ${dm ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"}`}>
          {period.is_online ? (
            /* ── Online Class Guidance Panel ── */
            <div className="flex flex-col h-full items-center justify-center gap-6 p-8 text-center">
              <div className={`p-5 rounded-3xl border ${dm ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-200"}`}>
                <Globe size={40} className="text-blue-400" />
              </div>
              <div>
                <p className={`text-sm font-black uppercase tracking-widest mb-1 ${dm ? "text-white" : "text-slate-900"}`}>
                  Online Class
                </p>
                <p className={`text-xs font-bold max-w-xs ${dm ? "text-slate-400" : "text-slate-500"}`}>
                  This is a virtual class. QR scanning is not available. Mark attendance manually using the student list.
                </p>
              </div>
              {period.gclass_link && (
                <a
                  href={period.gclass_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/25">
                  <ExternalLink size={13} /> Open Google Classroom
                </a>
              )}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-wider
                ${dm ? "bg-slate-800/60 border-slate-700 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-500"}`}>
                <Wifi size={11} /> Virtual — Manual Attendance Only
              </div>
            </div>
          ) : (
            <LiveMonitoringScanner
              dm={dm}
              onScan={onScan}
              isScannerLive={isScannerLive}
              period={period}
            />
          )}
        </div>

        {/* Right Column: Scan History */}
        <div className={`w-[25%] min-w-[280px] max-w-[350px] flex flex-col rounded-3xl border overflow-hidden
          ${dm ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"}`}>
          <LiveMonitoringHistory
            students={sectionStudents}
            attendance={attendance}
            dm={dm}
          />
        </div>
      </div>
    </div>
  )
}
