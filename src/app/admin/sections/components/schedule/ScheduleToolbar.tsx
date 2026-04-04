// sections/components/schedule/ScheduleToolbar.tsx

import { memo } from "react"
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import { toPng } from "html-to-image"
import { Upload, Download, FileSpreadsheet, Trash2, RefreshCw, Plus, Wand2, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatAMPM } from "./autoScheduler"
import type { ScheduleRow } from "./types"

interface ScheduleToolbarProps {
  sectionName: string
  adviserName?: string
  schedules: ScheduleRow[]
  isICT: boolean
  isDarkMode: boolean
  loading: boolean
  onAddEntry: () => void
  onAutoSchedule: () => void
  onImportClick: () => void
  onRefresh: () => void
  onClearAll: () => void
}

export const ScheduleToolbar = memo(function ScheduleToolbar({
  sectionName, adviserName, schedules, isICT, isDarkMode, loading,
  onAddEntry, onAutoSchedule, onImportClick, onRefresh, onClearAll,
}: ScheduleToolbarProps) {
  const accent = isICT ? "text-blue-400" : "text-orange-400"
  const accentBtn = isICT ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-orange-600 hover:bg-orange-500 text-white"
  const wizardBtn = isICT
    ? "bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white hover:border-blue-500"
    : "bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500 hover:text-white hover:border-orange-500"

  const handleTemplate = async () => {
    const wb = new ExcelJS.Workbook()

    // 1. Guide Sheet
    const guide = wb.addWorksheet("Guide")
    guide.columns = [{ width: 5 }, { width: 80 }]
    guide.addRow([])
    const titleRow = guide.addRow(["", "SCHEDULE IMPORT TEMPLATE GUIDE"])
    titleRow.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } }
    titleRow.height = 30
    titleRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF0F172A" } }
    titleRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' }

    guide.addRow([])
    guide.addRow(["", "Instructions for importing schedules:"])
    const instRow = guide.lastRow
    if (instRow) {
      instRow.font = { bold: true, size: 12 }
    }
    guide.addRow(["", "1. Switch to the 'Schedule Data' tab to insert your records."])
    guide.addRow(["", "2. Do NOT change the header row names (row 1)."])
    guide.addRow(["", "3. Keep time in 24-Hour format (e.g., 07:30, 13:00)."])
    guide.addRow(["", "4. Allowed days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday."])
    guide.addRow(["", "5. teacher, room, and notes are completely optional."])

    // 2. Data Sheet
    const ws = wb.addWorksheet("Schedule Data")
    ws.columns = [
      { header: "section", key: "section", width: 20 },
      { header: "subject", key: "subject", width: 30 },
      { header: "day", key: "day", width: 15 },
      { header: "start_time", key: "start_time", width: 15 },
      { header: "end_time", key: "end_time", width: 15 },
      { header: "school_year", key: "school_year", width: 15 },
      { header: "teacher", key: "teacher", width: 25 },
      { header: "room", key: "room", width: 15 },
      { header: "notes", key: "notes", width: 30 },
    ]

    const headerRow = ws.getRow(1)
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isICT ? "FF2563EB" : "FFD97706" } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })

    ws.addRow({
      section: sectionName, subject: "Oral Communication", day: "Monday",
      start_time: "07:30", end_time: "08:30", school_year: "2025-2026",
      teacher: "J. Cruz", room: "ROOM 201", notes: "Sample only, delete me"
    })

    const buf = await wb.xlsx.writeBuffer()
    saveAs(new Blob([buf]), `Template_${sectionName}.xlsx`)
  }

  const handleExport = async () => {
    if (!schedules.length) return
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet("Schedule Matrix", {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
    })

    // Determine the days to map
    const hasSaturday = schedules.some(s => s.day === "Saturday")
    const DAYS_COLUMNS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    if (hasSaturday) DAYS_COLUMNS.push("Saturday")

    // Calculate global bounds bounds
    let minMins = 24 * 60
    let maxMins = 0
    schedules.forEach(s => {
      const [sh, sm] = s.start_time.split(':').map(Number)
      const [eh, em] = s.end_time.split(':').map(Number)
      const st = sh * 60 + sm
      const et = eh * 60 + em
      if (st < minMins) minMins = st
      if (et > maxMins) maxMins = et
    })

    minMins = Math.floor(minMins / 30) * 30
    maxMins = Math.ceil(maxMins / 30) * 30
    if (maxMins <= minMins) maxMins = minMins + 60

    const totalCols = 2 + DAYS_COLUMNS.length
    ws.columns = [
      { width: 14 }, // A (Start Time)
      { width: 14 }, // B (End Time)
      ...DAYS_COLUMNS.map(() => ({ width: 26 })) // C... (Days)
    ]

    // ── Row 1-6: Top Headers ──
    const drawHeader = (row: number, val: string, size: number, bold: boolean, h: number = 20) => {
      ws.mergeCells(row, 1, row, totalCols)
      const r = ws.getRow(row)
      r.height = h
      const c = r.getCell(1)
      c.value = val
      c.font = { size, bold }
      c.alignment = { horizontal: 'center', vertical: 'middle' }
    }

    drawHeader(1, "AMA Education System", 16, true, 26)
    drawHeader(2, "Ama Computer Learning Center of Northbay", 12, true, 20)

    const sy = schedules[0]?.school_year || "2025-2026"
    drawHeader(3, `School Year ${sy}`, 11, true, 20)

    drawHeader(4, "", 11, false, 15) // Spacer

    drawHeader(5, `SHS GRADE ${sectionName}`, 12, true, 22)
    drawHeader(6, `ADVISER: ${adviserName ? adviserName.toUpperCase() : "UNASSIGNED"}`, 11, true, 20)

    // Header borders
    for (let i = 1; i <= 6; i++) {
      for (let j = 1; j <= totalCols; j++) {
        ws.getCell(i, j).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      }
    }

    // ── Row 7-8: Table Matrix Headers ──
    ws.mergeCells(7, 1, 8, 2)
    const timeH = ws.getCell(7, 1)
    timeH.value = "TIME"
    timeH.font = { bold: true }
    timeH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF5B9BD5" } } // Blue
    timeH.alignment = { horizontal: 'left', vertical: 'top' }

    ws.mergeCells(7, 3, 7, totalCols)
    const daysH = ws.getCell(7, 3)
    daysH.value = "DAYS"
    daysH.font = { bold: true }
    daysH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFFFF00" } } // Yellow
    daysH.alignment = { horizontal: 'center', vertical: 'middle' }

    const r8 = ws.getRow(8)
    DAYS_COLUMNS.forEach((day, i) => {
      const c = r8.getCell(3 + i)
      c.value = day.toUpperCase()
      c.font = { bold: true }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFFFF00" } }
      c.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    for (let i = 7; i <= 8; i++) {
      for (let j = 1; j <= totalCols; j++) {
        ws.getCell(i, j).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      }
    }

    // ── Row 9+: Matrix Generation ──
    const matrixStartRow = 9
    const intervals = (maxMins - minMins) / 30

    const formatTimeSecs = (mins: number) => {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      const ampm = h >= 12 ? 'PM' : 'AM'
      const hour = h % 12 || 12
      return `${hour}:${String(m).padStart(2, '0')}:00 ${ampm}`
    }

    // Draw cells
    for (let i = 0; i < intervals; i++) {
      const rowIndex = matrixStartRow + i
      const r = ws.getRow(rowIndex)
      r.height = 36

      const tStart = r.getCell(1)
      tStart.value = formatTimeSecs(minMins + (i * 30))
      tStart.font = { bold: true, size: 10 }
      tStart.alignment = { vertical: 'bottom', horizontal: 'left' }

      const tEnd = r.getCell(2)
      tEnd.value = formatTimeSecs(minMins + ((i + 1) * 30))
      tEnd.font = { bold: true, size: 10 }
      tEnd.alignment = { vertical: 'bottom', horizontal: 'left' }

      for (let j = 1; j <= totalCols; j++) {
        ws.getCell(rowIndex, j).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      }
    }

    // Overlay Classes
    const occupied = new Set<string>()
    schedules.forEach(s => {
      const dayIdx = DAYS_COLUMNS.indexOf(s.day)
      if (dayIdx === -1) return

      const [sh, sm] = s.start_time.split(':').map(Number)
      const [eh, em] = s.end_time.split(':').map(Number)
      const stTotal = sh * 60 + sm
      const etTotal = eh * 60 + em

      const rowOffStart = Math.floor((stTotal - minMins) / 30)
      let rowOffEnd = Math.ceil((etTotal - minMins) / 30) - 1
      if (rowOffEnd < rowOffStart) rowOffEnd = rowOffStart

      const rowStart = matrixStartRow + rowOffStart
      const rowEnd = matrixStartRow + rowOffEnd
      const col = 3 + dayIdx

      for (let r = rowStart; r <= rowEnd; r++) {
        occupied.add(`${r}-${col}`)
      }

      let text = s.subject
      if (s.teacher) text += `\n-T' ${s.teacher}`
      if (s.room) text += `\n-${s.room}`

      try {
        if (rowStart <= rowEnd && rowStart >= matrixStartRow) {
          if (rowStart !== rowEnd) ws.mergeCells(rowStart, col, rowEnd, col)
          const cell = ws.getCell(rowStart, col)
          cell.value = text
          cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' }
        }
      } catch (e) {
        // Fallback if merge fails (e.g. hard overlap from invalid data)
        const cell = ws.getCell(rowStart, col)
        cell.value = text
        cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' }
      }
    })

    // Merge contiguous empty chunks
    for (let c = 3; c <= totalCols; c++) {
      let emptyStart = -1
      for (let r = matrixStartRow; r < matrixStartRow + intervals; r++) {
        if (!occupied.has(`${r}-${c}`)) {
          if (emptyStart === -1) emptyStart = r
        } else {
          if (emptyStart !== -1) {
            if (r - 1 > emptyStart) {
              ws.mergeCells(emptyStart, c, r - 1, c)
            }
            emptyStart = -1
          }
        }
      }
      if (emptyStart !== -1 && (matrixStartRow + intervals - 1) > emptyStart) {
        ws.mergeCells(emptyStart, c, matrixStartRow + intervals - 1, c)
      }
    }

    const buf = await wb.xlsx.writeBuffer()
    saveAs(new Blob([buf]), `Schedule_${sectionName}.xlsx`)
  }

  const handleImageCapture = async () => {
    const el = document.getElementById("schedule-grid-capture")
    if (!el) return
    try {
      const dataUrl = await toPng(el, { quality: 1, backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', pixelRatio: 2 })
      saveAs(dataUrl, `Schedule_${sectionName}.png`)
    } catch (err) {
      console.error("Capture failed:", err)
    }
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
            <button onClick={handleImageCapture} disabled={!schedules.length}
              className={`${ghostBtn} disabled:opacity-30 disabled:cursor-not-allowed`}>
              <ImageIcon size={13} /> Snippet
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Download grid image snippet</p></TooltipContent>
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

        {schedules.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onClearAll} className={`${ghostBtn} text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300 border-red-200 dark:border-red-900/30`}>
                <Trash2 size={13} /> Clear Schedule
              </button>
            </TooltipTrigger>
            <TooltipContent className="bg-red-950 text-red-200 border-red-900"><p>Completely wipe this schedule</p></TooltipContent>
          </Tooltip>
        )}

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