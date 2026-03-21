// sections/components/schedule/ScheduleImport.tsx
// Two import modes:
//   ENTRY_DATA — subject config (subject, room, duration, shift, repetition)
//                → routed through auto-scheduler in ScheduleTab
//   DIRECT     — full schedule rows (section, subject, day, start_time, end_time, school_year…)
//                → inserted straight into DB

import { memo, useCallback, useRef, useState } from "react"
import * as XLSX from "xlsx"
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, X, ChevronDown, ChevronUp, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DAYS, isValidDay, isValidSchoolYear } from "./types"
import type { ScheduleImportRow } from "./types"

interface ScheduleImportProps {
  sectionName:       string
  defaultSchoolYear: string
  isICT:             boolean
  isDarkMode:        boolean
  onConfirm:         (rows: ScheduleImportRow[]) => Promise<void>
  onCancel:          () => void
}

// ── Time helpers ───────────────────────────────────────────────────────────────

/** Accepts: Excel decimal · "7:30 AM" · "12:00 PM" · "07:30" → "07:30" (24-hr) */
function normalizeTime(val: any): string {
  if (val === null || val === undefined || val === "") return ""

  if (typeof val === "number" && val >= 0 && val < 1) {
    const totalMins = Math.round(val * 24 * 60)
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  }

  const s = String(val).trim()

  // "7:30 AM" / "12:00 PM"
  const match12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (match12) {
    let h = parseInt(match12[1], 10)
    const m = parseInt(match12[2], 10)
    const period = match12[3].toUpperCase()
    if (period === "AM" && h === 12) h = 0
    if (period === "PM" && h !== 12) h += 12
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  }

  // "07:30" / "7:30" → pad
  const match24 = s.match(/^(\d{1,2}):(\d{2})$/)
  if (match24) return `${String(parseInt(match24[1], 10)).padStart(2, "0")}:${match24[2]}`

  return s
}

function isValidTime(t: string): boolean {
  return /^\d{2}:\d{2}$/.test(t.trim())
}

// ── ENTRY_DATA row type ────────────────────────────────────────────────────────
export interface EntryDataRow {
  _entryData:      true
  subject:         string
  room:            string
  duration:        number
  preferred_shift: "AM" | "PM"
  repetition:      "ONCE" | "TWICE" | "THRICE"
  teacher?:        string
  notes?:          string
  section:         string
  school_year:     string
  _rowIndex:       number
  _errors:         string[]
}

// ── Direct row validation ──────────────────────────────────────────────────────
function validateDirectRow(
  raw: Record<string, any>,
  sectionName: string,
  defaultSY: string,
  idx: number
): ScheduleImportRow {
  const errors: string[] = []
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k]
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim()
    }
    return ""
  }

  const section     = get("section")     || sectionName
  const subject     = get("subject")
  const day         = get("day")
  const start_time  = normalizeTime(raw["start_time"] ?? "")
  const end_time    = normalizeTime(raw["end_time"]   ?? "")
  const school_year = get("school_year") || defaultSY
  const teacher     = get("teacher")     || undefined
  const room        = get("room")        || undefined
  const notes       = get("notes")       || undefined

  if (!subject)                        errors.push("Subject is required")
  if (!isValidDay(day))                errors.push(`Day "${day}" is invalid`)
  if (!isValidTime(start_time))        errors.push(`Start time "${start_time}" is invalid`)
  if (!isValidTime(end_time))          errors.push(`End time "${end_time}" is invalid`)
  if (!isValidSchoolYear(school_year)) errors.push(`School year "${school_year}" must be YYYY-YYYY`)

  return { section, subject, day, start_time, end_time, school_year, teacher, room, notes, _errors: errors, _rowIndex: idx }
}

// ── Component ──────────────────────────────────────────────────────────────────
export const ScheduleImport = memo(function ScheduleImport({
  sectionName, defaultSchoolYear, isICT, isDarkMode, onConfirm, onCancel,
}: ScheduleImportProps) {

  const inputRef                          = useRef<HTMLInputElement>(null)
  const [dragging,   setDragging]         = useState(false)
  const [rows,       setRows]             = useState<(ScheduleImportRow | EntryDataRow)[]>([])
  const [mode,       setMode]             = useState<"direct" | "entry">("direct")
  const [fileName,   setFileName]         = useState("")
  const [saving,     setSaving]           = useState(false)
  const [showErrors, setShowErrors]       = useState(true)

  const accentBtn = isICT
    ? "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500"
    : "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500"

  const parseFile = useCallback((file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array" })

        // Prefer ENTRY_DATA sheet if present
        const sheetName = wb.SheetNames.includes("ENTRY_DATA") ? "ENTRY_DATA" : wb.SheetNames[0]
        const ws        = wb.Sheets[sheetName]
        const raw: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 })

        // Find the header row (scan up to row 15)
        let headerIdx    = -1
        let detectedMode: "entry" | "direct" = "direct"

        for (let i = 0; i < Math.min(raw.length, 15); i++) {
          const cells = ((raw[i] as any[]) ?? []).map(c =>
            String(c ?? "").toLowerCase().trim()
          )
          const hasSubject = cells.includes("subject")
          const hasShift   = cells.includes("shift")
          const hasDay     = cells.includes("day")
          const hasStart   = cells.includes("start_time")

          if (hasSubject && hasShift) {
            // ENTRY_DATA format
            headerIdx    = i
            detectedMode = "entry"
            break
          }
          if (hasSubject && hasDay && hasStart) {
            // Direct schedule format
            headerIdx    = i
            detectedMode = "direct"
            break
          }
        }

        if (headerIdx === -1) {
          alert(
            "Could not find the header row in this file.\n\n" +
            "ENTRY_DATA format needs:  subject · room · duration · shift · repetition\n" +
            "Direct format needs:  section · subject · day · start_time · end_time · school_year"
          )
          return
        }

        setMode(detectedMode)
        const headers  = ((raw[headerIdx] as any[]) ?? []).map(c => String(c ?? "").toLowerCase().trim())
        const dataRows = raw.slice(headerIdx + 1)
        const parsed: any[] = []
        let di = 0

        for (const row of dataRows) {
          const cells = (row as any[]) ?? []
          // Skip blank rows
          if (cells.every(c => c === null || c === undefined || String(c).trim() === "")) continue
          // Skip hint rows
          const first = String(cells[0] ?? "").trim()
          if (first.startsWith("←") || first.toUpperCase() === "REQUIRED" || first.toUpperCase() === "OPTIONAL") continue

          const obj: Record<string, any> = {}
          headers.forEach((h, i) => { obj[h] = cells[i] ?? "" })

          if (detectedMode === "entry") {
            const subj    = String(obj["subject"]    ?? "").trim()
            if (!subj) continue  // skip blank subject rows silently
            const room    = String(obj["room"]       ?? "").trim()
            const dur     = parseInt(String(obj["duration"] ?? "60"), 10)
            const shift   = String(obj["shift"]      ?? "AM").trim().toUpperCase()
            const rep     = String(obj["repetition"] ?? "ONCE").trim().toUpperCase()
            const teacher = String(obj["teacher"]    ?? "").trim() || undefined
            const notes   = String(obj["notes"]      ?? "").trim() || undefined
            const errs: string[] = []
            if (!["AM", "PM"].includes(shift))                           errs.push(`Shift "${shift}" must be AM or PM`)
            if (!["ONCE","TWICE","THRICE"].includes(rep))                errs.push(`Repetition "${rep}" must be ONCE, TWICE, or THRICE`)

            parsed.push({
              _entryData:      true,
              subject:         subj,
              room:            room,
              duration:        isNaN(dur) ? 60 : dur,
              preferred_shift: shift === "PM" ? "PM" : "AM",
              repetition:      (["ONCE","TWICE","THRICE"].includes(rep) ? rep : "ONCE") as "ONCE"|"TWICE"|"THRICE",
              teacher,
              notes,
              section:         sectionName,
              school_year:     defaultSchoolYear,
              _rowIndex:       di + 1,
              _errors:         errs,
            } satisfies EntryDataRow)
          } else {
            parsed.push(validateDirectRow(obj, sectionName, defaultSchoolYear, di + 1))
          }
          di++
        }

        setRows(parsed)
      } catch (err) {
        console.error(err)
        alert("Failed to parse file. Make sure it is a valid .xlsx file.")
      }
    }
    reader.readAsArrayBuffer(file)
  }, [sectionName, defaultSchoolYear])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }, [parseFile])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
    e.target.value = ""
  }

  const validRows   = rows.filter(r => !r._errors?.length)
  const invalidRows = rows.filter(r =>  r._errors?.length)

  const handleConfirm = async () => {
    if (!validRows.length) return
    setSaving(true)
    try { await onConfirm(validRows as any) }
    finally { setSaving(false) }
  }

  const th = {
    bg:     isDarkMode ? "bg-slate-900/60"      : "bg-white",
    border: isDarkMode ? "border-slate-800"     : "border-slate-200",
    text:   isDarkMode ? "text-white"           : "text-slate-900",
    sub:    isDarkMode ? "text-slate-400"       : "text-slate-500",
    row:    isDarkMode ? "hover:bg-slate-800/40": "hover:bg-slate-50",
    hdr:    isDarkMode ? "bg-slate-800/60"      : "bg-slate-50",
  }

  return (
    <div className="space-y-5">

      {/* Drop zone */}
      {rows.length === 0 && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl
            border-2 border-dashed py-14 cursor-pointer transition-all
            ${dragging
              ? isICT ? "border-blue-500 bg-blue-500/10" : "border-amber-500 bg-amber-500/10"
              : isDarkMode ? "border-slate-700 hover:border-slate-500" : "border-slate-300 hover:border-slate-400"
            }`}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChange} />
          <div className={`p-4 rounded-xl ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}>
            <FileSpreadsheet size={28} className={isICT ? "text-blue-400" : "text-amber-500"} />
          </div>
          <div className="text-center space-y-1">
            <p className={`text-sm font-semibold ${th.text}`}>Drop your XLSX file here</p>
            <p className={`text-xs ${th.sub}`}>
              or click to browse · supports ENTRY_DATA and direct schedule formats
            </p>
          </div>
          <Upload size={14} className={`absolute bottom-4 right-4 opacity-20 ${th.sub}`} />
        </div>
      )}

      {/* File info bar */}
      {rows.length > 0 && (
        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${th.bg} ${th.border}`}>
          <div className="flex items-center gap-3">
            {mode === "entry"
              ? <Wand2 size={16} className={isICT ? "text-blue-400" : "text-amber-500"} />
              : <FileSpreadsheet size={16} className={isICT ? "text-blue-400" : "text-amber-500"} />
            }
            <div>
              <p className={`text-sm font-semibold ${th.text}`}>{fileName}</p>
              <p className={`text-xs ${th.sub}`}>
                {mode === "entry"
                  ? "ENTRY_DATA — will auto-generate timetable"
                  : "Direct import — rows go straight to schedule"
                }
                {" · "}{rows.length} rows · {validRows.length} valid
                {invalidRows.length > 0 && ` · ${invalidRows.length} errors`}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setRows([]); setFileName("") }}
            className={`p-1.5 rounded-lg transition-colors
              ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Errors */}
      {invalidRows.length > 0 && (
        <div className={`rounded-xl border overflow-hidden
          ${isDarkMode ? "border-red-800/50 bg-red-950/30" : "border-red-200 bg-red-50"}`}>
          <button
            onClick={() => setShowErrors(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} className="text-red-500" />
              <span className={`text-sm font-medium ${isDarkMode ? "text-red-400" : "text-red-600"}`}>
                {invalidRows.length} row{invalidRows.length !== 1 ? "s" : ""} with errors (will be skipped)
              </span>
            </div>
            {showErrors
              ? <ChevronUp size={13} className="text-red-400" />
              : <ChevronDown size={13} className="text-red-400" />}
          </button>
          {showErrors && (
            <div className={`px-4 pb-3 pt-2 space-y-1.5 border-t
              ${isDarkMode ? "border-red-800/40" : "border-red-200"}`}>
              {invalidRows.map(r => (
                <p key={r._rowIndex} className={`text-xs ${isDarkMode ? "text-red-400" : "text-red-600"}`}>
                  <span className="font-semibold">Row {r._rowIndex}:</span>{" "}
                  {(r as any).subject || "(blank)"} — {r._errors?.join("; ")}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview table */}
      {validRows.length > 0 && (
        <div className={`rounded-xl border overflow-hidden ${th.bg} ${th.border}`}>
          <div className={`flex items-center gap-2 px-4 py-3 border-b ${th.hdr} ${th.border}`}>
            <CheckCircle2 size={13} className="text-emerald-500" />
            <span className={`text-xs font-medium ${th.sub}`}>
              {validRows.length} row{validRows.length !== 1 ? "s" : ""} ready to{" "}
              {mode === "entry" ? "generate schedule from" : "import"}
            </span>
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={`border-b ${th.border} ${th.hdr}`}>
                  {(mode === "entry"
                    ? ["Subject","Room","Duration","Shift","Repetition","Teacher"]
                    : ["Subject","Day","Start","End","School Year","Teacher","Room"]
                  ).map(h => (
                    <th key={h} className={`px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide ${th.sub}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${th.border}`}>
                {validRows.map((r: any, i) => (
                  <tr key={i} className={`transition-colors ${th.row}`}>
                    {mode === "entry" ? <>
                      <td className={`px-4 py-2.5 font-medium ${th.text}`}>{r.subject}</td>
                      <td className={`px-4 py-2.5 ${th.sub}`}>{r.room || "—"}</td>
                      <td className={`px-4 py-2.5 ${th.sub}`}>{r.duration} min</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-semibold ${r.preferred_shift === "AM" ? "text-sky-500" : "text-amber-500"}`}>
                          {r.preferred_shift}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 ${th.sub}`}>{r.repetition}</td>
                      <td className={`px-4 py-2.5 ${th.sub}`}>{r.teacher || "—"}</td>
                    </> : <>
                      <td className={`px-4 py-2.5 font-medium ${th.text}`}>{r.subject}</td>
                      <td className={`px-4 py-2.5 ${th.sub}`}>{r.day}</td>
                      <td className={`px-4 py-2.5 font-mono ${th.sub}`}>{r.start_time}</td>
                      <td className={`px-4 py-2.5 font-mono ${th.sub}`}>{r.end_time}</td>
                      <td className={`px-4 py-2.5 ${th.sub}`}>{r.school_year}</td>
                      <td className={`px-4 py-2.5 ${th.sub}`}>{r.teacher || "—"}</td>
                      <td className={`px-4 py-2.5 ${th.sub}`}>{r.room || "—"}</td>
                    </>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer actions */}
      {rows.length > 0 && (
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}
            className={`text-xs font-medium h-9 px-4 rounded-lg ${th.sub}`}>
            Cancel
          </Button>
          <button
            disabled={!validRows.length || saving}
            onClick={handleConfirm}
            className={`h-9 px-5 rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95
              disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 ${accentBtn}`}>
            {mode === "entry" && <Wand2 size={13} />}
            {saving
              ? "Processing…"
              : mode === "entry"
                ? `Generate from ${validRows.length} Subject${validRows.length !== 1 ? "s" : ""}`
                : `Import ${validRows.length} Row${validRows.length !== 1 ? "s" : ""}`
            }
          </button>
        </div>
      )}
    </div>
  )
})