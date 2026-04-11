"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Download, QrCode, CalendarDays, CheckCircle2, Clock } from "lucide-react"
import { toPng } from "html-to-image"
import { saveAs } from "file-saver"
import {
  generateStudentAttendanceQr,
  buildStudentAttendanceQrDownloadCanvas,
  type StudentAttendanceQrThemeKey,
} from "@/lib/studentAttendanceQr"

interface ScheduleRow {
  id: string
  section: string
  subject: string
  day: string
  start_time: string
  end_time: string
  room?: string | null
  teacher?: string | null
  school_year: string
}

interface DownloadHubProps {
  studentId: string
  studentName: string
  section: string
  lrn: string
  strand: string
  schedules: ScheduleRow[]
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const SUBJECT_COLORS = [
  { bg: "#eff6ff", text: "#3b82f6", border: "#bfdbfe" },
  { bg: "#f5f3ff", text: "#8b5cf6", border: "#ddd6fe" },
  { bg: "#ecfdf5", text: "#10b981", border: "#a7f3d0" },
  { bg: "#fffbeb", text: "#f59e0b", border: "#fde68a" },
  { bg: "#fef2f2", text: "#ef4444", border: "#fecaca" },
  { bg: "#ecfeff", text: "#06b6d4", border: "#a5f3fc" },
  { bg: "#fdf4ff", text: "#d946ef", border: "#f0abfc" },
  { bg: "#f0fdfa", text: "#14b8a6", border: "#99f6e4" },
  { bg: "#fff7ed", text: "#f97316", border: "#fed7aa" },
  { bg: "#f7fee7", text: "#84cc16", border: "#bef264" },
]

function formatTime(t: string) {
  const [h, m] = t.slice(0, 5).split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const hr = h % 12 || 12
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`
}

export default function DownloadHub({ studentId, studentName, section, lrn, strand, schedules }: DownloadHubProps) {
  const [downloadingQR, setDownloadingQR] = useState(false)
  const [downloadingSchedule, setDownloadingSchedule] = useState(false)
  const [qrLoaded, setQrLoaded] = useState(false)
  const qrPreviewRef = useRef<HTMLDivElement>(null)

  // Load QRCode library
  useEffect(() => {
    if ((window as any).QRCode) { setQrLoaded(true); return }
    const s = document.createElement("script")
    s.src = "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"
    s.onload = () => setQrLoaded(true)
    document.head.appendChild(s)
  }, [])

  // Generate QR preview (light theme)
  useEffect(() => {
    if (!qrLoaded || !qrPreviewRef.current || !studentId) return
    qrPreviewRef.current.innerHTML = ""
    generateStudentAttendanceQr(qrPreviewRef.current, studentId, 200, "light", () => {})
  }, [qrLoaded, studentId])

  // Download the full styled QR card image (same as StudentQRCard's handleDownload)
  const handleDownloadQR = useCallback(async (theme: StudentAttendanceQrThemeKey = "light") => {
    if (!qrLoaded) return
    setDownloadingQR(true)
    try {
      const offDiv = document.createElement("div")
      offDiv.style.cssText = "position:absolute;left:-9999px;top:0;"
      document.body.appendChild(offDiv)

      await new Promise<void>(res => generateStudentAttendanceQr(offDiv, studentId, 340, theme, res))
      const src = offDiv.querySelector("canvas") as HTMLCanvasElement | null
      if (!src) { document.body.removeChild(offDiv); return }

      const out = await buildStudentAttendanceQrDownloadCanvas(theme, src, { studentName, lrn, section })
      document.body.removeChild(offDiv)

      const a = document.createElement("a")
      a.download = `attendance_qr_${lrn}_${theme}.png`
      a.href = out.toDataURL("image/png", 1.0)
      a.click()
    } catch (err) {
      console.error("QR download failed:", err)
    } finally {
      setTimeout(() => setDownloadingQR(false), 800)
    }
  }, [qrLoaded, studentId, studentName, lrn, section])

  // Download schedule as image
  const handleDownloadSchedule = useCallback(async () => {
    if (schedules.length === 0) return
    setDownloadingSchedule(true)
    try {
      const el = document.getElementById("portal-schedule-capture")
      if (!el) throw new Error("Schedule element not found")

      const dataUrl = await toPng(el, { quality: 1, backgroundColor: "#ffffff", pixelRatio: 2 })
      saveAs(dataUrl, `Schedule_${section || "Unassigned"}.png`)
    } catch (err) {
      console.error("Schedule capture failed:", err)
    } finally {
      setTimeout(() => setDownloadingSchedule(false), 800)
    }
  }, [schedules, section])

  // Build schedule data grouped by day
  const byDay: Record<string, ScheduleRow[]> = {}
  for (const day of DAYS) {
    byDay[day] = schedules
      .filter(s => s.day === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  const uniqueSubjects = [...new Set(schedules.map(s => s.subject))]
  const colorMap: Record<string, typeof SUBJECT_COLORS[0]> = {}
  uniqueSubjects.forEach((sub, i) => { colorMap[sub] = SUBJECT_COLORS[i % SUBJECT_COLORS.length] })

  return (
    <div className="space-y-10">

      {/* ─── 1. QR CODE SECTION ─── */}
      <div className="bg-white rounded-[28px] shadow-xl border border-slate-100 overflow-hidden">
        {/* Blue accent bar */}
        <div className="h-1.5" style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)" }} />

        <div className="p-8 flex flex-col items-center space-y-6">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <QrCode size={28} />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-[0.15em]">Attendance QR Code</h2>
            <p className="text-slate-400 font-medium text-xs">Save the full styled card to your device.</p>
          </div>

          {/* QR Preview */}
          <div className="p-6 rounded-[20px] border border-slate-100 bg-slate-50">
            <div ref={qrPreviewRef} className="mx-auto" style={{ width: 200, height: 200 }} />
          </div>

          {/* Download Buttons */}
          <div className="w-full max-w-sm space-y-3">
            <button
              onClick={() => handleDownloadQR("light")}
              disabled={downloadingQR || !qrLoaded}
              className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 text-white shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              style={{ background: downloadingQR ? "#22c55e" : "linear-gradient(135deg,#1d4ed8,#2563eb)", boxShadow: downloadingQR ? "0 10px 25px -5px rgba(34,197,94,0.3)" : "0 10px 25px -5px rgba(29,78,216,0.3)" }}
            >
              {downloadingQR ? <><CheckCircle2 size={16} /> Downloaded!</> : <><Download size={16} /> Download Light Card</>}
            </button>
            <button
              onClick={() => handleDownloadQR("dark")}
              disabled={downloadingQR || !qrLoaded}
              className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 text-white shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              style={{ background: downloadingQR ? "#22c55e" : "linear-gradient(135deg,#0f172a,#1e293b)", boxShadow: downloadingQR ? "0 10px 25px -5px rgba(34,197,94,0.3)" : "0 10px 25px -5px rgba(15,23,42,0.3)" }}
            >
              {downloadingQR ? <><CheckCircle2 size={16} /> Downloaded!</> : <><Download size={16} /> Download Dark Card</>}
            </button>
          </div>
        </div>
      </div>


      {/* ─── 2. SCHEDULE SECTION ─── */}
      {schedules.length > 0 ? (
        <div className="bg-white rounded-[28px] shadow-xl border border-slate-100 overflow-hidden">
          {/* Orange accent bar */}
          <div className="h-1.5" style={{ background: "linear-gradient(135deg,#ea580c,#f97316)" }} />

          <div className="p-8 flex flex-col items-center space-y-6">
            <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
              <CalendarDays size={28} />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-[0.15em]">Official Schedule</h2>
              <p className="text-slate-400 font-medium text-xs">
                {section} · {uniqueSubjects.length} subject{uniqueSubjects.length !== 1 ? "s" : ""} · {DAYS.filter(d => byDay[d].length > 0).length} active day{DAYS.filter(d => byDay[d].length > 0).length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Schedule Preview (capturable) */}
            <div className="w-full overflow-x-auto">
              <div id="portal-schedule-capture" className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ minWidth: 360 }}>
                {/* Section Header */}
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-700">{section}</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {schedules[0]?.school_year || "2025-2026"}
                  </span>
                </div>

                {/* Day rows */}
                {DAYS.filter(d => byDay[d].length > 0).map(day => (
                  <div key={day} className="border-b border-slate-100 last:border-b-0">
                    <div className="flex">
                      <div className="w-20 shrink-0 px-4 py-3 bg-slate-50/50 border-r border-slate-100 flex items-start">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 pt-1">{day.slice(0, 3)}</span>
                      </div>
                      <div className="flex-1 p-3 flex flex-wrap gap-2">
                        {byDay[day].map(s => {
                          const col = colorMap[s.subject]
                          return (
                            <div key={s.id} className="rounded-xl px-3 py-2" style={{ background: col.bg, border: `1px solid ${col.border}` }}>
                              <p className="text-[10px] font-black uppercase" style={{ color: col.text }}>{s.subject}</p>
                              <p className="text-[9px] font-bold text-slate-500 mt-0.5 flex items-center gap-1">
                                <Clock size={8} className="shrink-0" />
                                {formatTime(s.start_time)} – {formatTime(s.end_time)}
                              </p>
                              {s.room && <p className="text-[8px] text-slate-400 mt-0.5">{s.room}</p>}
                              {s.teacher && <p className="text-[8px] text-slate-400">{s.teacher}</p>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Subject legend */}
                <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex flex-wrap gap-1.5 justify-center">
                  {uniqueSubjects.map(sub => {
                    const col = colorMap[sub]
                    return (
                      <span key={sub} className="inline-block rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-wide"
                        style={{ background: col.bg, border: `1px solid ${col.border}`, color: col.text }}>
                        {sub}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownloadSchedule}
              disabled={downloadingSchedule}
              className="w-full max-w-sm py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 text-white shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              style={{ background: downloadingSchedule ? "#22c55e" : "linear-gradient(135deg,#ea580c,#f97316)", boxShadow: downloadingSchedule ? "0 10px 25px -5px rgba(34,197,94,0.3)" : "0 10px 25px -5px rgba(234,88,12,0.3)" }}
            >
              {downloadingSchedule ? <><CheckCircle2 size={16} /> Downloaded!</> : <><Download size={16} /> Download Schedule</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
          <CalendarDays size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 font-black uppercase tracking-[0.15em] text-xs">
            Schedule not yet finalized for {section || "your section"}
          </p>
        </div>
      )}
    </div>
  )
}
