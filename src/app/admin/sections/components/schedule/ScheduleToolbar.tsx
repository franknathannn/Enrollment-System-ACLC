// sections/components/schedule/ScheduleToolbar.tsx

import { memo } from "react"
import * as XLSX from "xlsx"
import { Upload, Download, FileSpreadsheet, Trash2, RefreshCw, Plus, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatAMPM } from "./autoScheduler"
import type { ScheduleRow } from "./types"

interface ScheduleToolbarProps {
  sectionName:       string
  schedules:         ScheduleRow[]
  isICT:             boolean
  isDarkMode:        boolean
  loading:           boolean
  onAddEntry:        () => void
  onAutoSchedule:    () => void
  onImportClick:     () => void
  onRefresh:         () => void
  onClearAll:        () => void
}

export const ScheduleToolbar = memo(function ScheduleToolbar({
  sectionName, schedules, isICT, isDarkMode, loading,
  onAddEntry, onAutoSchedule, onImportClick, onRefresh, onClearAll,
}: ScheduleToolbarProps) {
  const accent    = isICT ? "text-blue-400"  : "text-orange-400"
  const accentBtn = isICT ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-orange-600 hover:bg-orange-500 text-white"
  const wizardBtn = isICT
    ? "bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white hover:border-blue-500"
    : "bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500 hover:text-white hover:border-orange-500"

  const handleTemplate = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ["SCHEDULE IMPORT TEMPLATE — " + sectionName],
      [],
      ["INSTRUCTIONS:"],
      ["- day: Monday / Tuesday / Wednesday / Thursday / Friday / Saturday"],
      ["- start_time / end_time: HH:MM 24-hour (e.g. 07:30, 13:00)"],
      ["- school_year: YYYY-YYYY (e.g. 2025-2026)"],
      ["- teacher, room, notes are optional"],
      ["- Delete these rows before importing. Keep the header row."],
      [],
      ["section","subject","day","start_time","end_time","school_year","teacher","room","notes"],
      [sectionName,"Oral Communication","Monday","07:30","08:30","2025-2026","J. Cruz","ROOM 201",""],
      [sectionName,"General Mathematics","Monday","08:30","09:30","2025-2026","M. Santos","ROOM 201",""],
    ])
    ws["!cols"] = [{wch:20},{wch:24},{wch:14},{wch:12},{wch:12},{wch:14},{wch:20},{wch:14},{wch:24}]
    XLSX.utils.book_append_sheet(wb, ws, "Template")
    XLSX.writeFile(wb, `schedule_template_${sectionName}.xlsx`)
  }

  const handleExport = () => {
    if (!schedules.length) return
    const rows = schedules.map(s => ({
      section: s.section, subject: s.subject, day: s.day,
      start_time: s.start_time.slice(0,5), end_time: s.end_time.slice(0,5),
      school_year: s.school_year, teacher: s.teacher ?? "", room: s.room ?? "", notes: s.notes ?? "",
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    ws["!cols"] = [{wch:20},{wch:24},{wch:14},{wch:12},{wch:12},{wch:14},{wch:20},{wch:14},{wch:24}]
    XLSX.utils.book_append_sheet(wb, ws, "Schedule")
    XLSX.writeFile(wb, `Schedule_${sectionName}_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const ghostBtn = `h-10 px-4 rounded-2xl border text-[9px] font-black uppercase tracking-widest gap-2 transition-all flex items-center
    ${isDarkMode ? "border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white" : "border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Left: label */}
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isICT ? "bg-blue-500" : "bg-orange-500"}`} />
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${accent}`}>{sectionName}</p>
          <p className={`text-[9px] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
            {schedules.length} period{schedules.length !== 1 ? "s" : ""} configured
          </p>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex flex-wrap items-center gap-2">

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onRefresh}
              className={`h-10 w-10 p-0 rounded-2xl border transition-all
                ${isDarkMode ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-100"}`}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Refresh</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={handleTemplate} className={ghostBtn}>
              <FileSpreadsheet size={13} /> Template
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Download blank XLSX template</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={handleExport} disabled={!schedules.length}
              className={`${ghostBtn} disabled:opacity-30 disabled:cursor-not-allowed`}>
              <Download size={13} /> Export
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Export schedule as XLSX</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onImportClick} className={ghostBtn}>
              <Upload size={13} /> Import
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Import schedule from XLSX</p></TooltipContent>
        </Tooltip>

        {/* Auto-Schedule — secondary accent */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onAutoSchedule}
              className={`h-10 px-5 rounded-2xl font-black uppercase text-[9px] tracking-widest gap-2 transition-all active:scale-95 flex items-center ${wizardBtn}`}>
              <Wand2 size={13} /> Auto-Schedule
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Generate schedule automatically</p></TooltipContent>
        </Tooltip>

        {/* Add Entry — primary */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onAddEntry}
              className={`h-10 px-5 rounded-2xl font-black uppercase text-[9px] tracking-widest gap-2 transition-all active:scale-95 shadow-lg flex items-center ${accentBtn}`}>
              <Plus size={13} /> Add Subject
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Add a single schedule entry</p></TooltipContent>
        </Tooltip>

        {schedules.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onClearAll}
                className="h-10 w-10 p-0 rounded-2xl text-red-400 hover:bg-red-500 hover:text-white transition-all">
                <Trash2 size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-red-950 text-red-200 border-red-900"><p>Clear all entries</p></TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
})