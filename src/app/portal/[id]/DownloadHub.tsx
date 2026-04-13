"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { Download, QrCode, CalendarDays, CheckCircle2 } from "lucide-react"
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

// Light-mode hex colors (safe for toPng capture)
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

function toMins(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function fmtMins(m: number) {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${h % 12 || 12}:${String(min).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}

export default function DownloadHub({ studentId, studentName, section, lrn, strand, schedules }: DownloadHubProps) {
  const [downloadingQR,       setDownloadingQR]       = useState(false)
  const [downloadingSchedule, setDownloadingSchedule] = useState(false)
  const [qrLoaded,            setQrLoaded]            = useState(false)
  const qrPreviewRef  = useRef<HTMLDivElement>(null)
  const scheduleRef   = useRef<HTMLDivElement>(null)

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

  // Download QR card
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

  // Download schedule grid
  const handleDownloadSchedule = useCallback(async () => {
    if (schedules.length === 0 || !scheduleRef.current) return
    setDownloadingSchedule(true)
    try {
      const dataUrl = await toPng(scheduleRef.current, {
        quality: 1,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      })
      saveAs(dataUrl, `Schedule_${section || "Unassigned"}.png`)
    } catch (err) {
      console.error("Schedule capture failed:", err)
    } finally {
      setTimeout(() => setDownloadingSchedule(false), 800)
    }
  }, [schedules, section])

  // ── Schedule data prep ────────────────────────────────────────────────────
  const { byDay, colorMap, uniqueSubjects, minMins, timeLabels, gridH } = useMemo(() => {
    const byDay: Record<string, ScheduleRow[]> = {}
    for (const d of DAYS) byDay[d] = schedules.filter(s => s.day === d).sort((a, b) => a.start_time.localeCompare(b.start_time))

    const uniqueSubjects = [...new Set(schedules.map(s => s.subject))]
    const colorMap: Record<string, typeof SUBJECT_COLORS[0]> = {}
    uniqueSubjects.forEach((sub, i) => { colorMap[sub] = SUBJECT_COLORS[i % SUBJECT_COLORS.length] })

    if (schedules.length === 0) return { byDay, colorMap, uniqueSubjects, minMins: 420, timeLabels: [] as number[], gridH: 0 }

    let min = 24 * 60, max = 0
    schedules.forEach(s => {
      const st = toMins(s.start_time), en = toMins(s.end_time)
      if (st < min) min = st
      if (en > max) max = en
    })
    const minMins = Math.floor(min / 30) * 30
    const maxMins = Math.ceil(max / 30) * 30
    const timeLabels: number[] = []
    for (let m = minMins; m <= maxMins; m += 30) timeLabels.push(m)

    return { byDay, colorMap, uniqueSubjects, minMins, timeLabels, gridH: (timeLabels.length - 1) * 44 + 20 }
  }, [schedules])

  const borderColor = "rgba(226,232,240,1)"   // slate-200
  const halfBorder  = "rgba(241,245,249,1)"   // slate-100

  return (
    <div className="space-y-10">

      {/* ─── 1. QR CODE SECTION ─── */}
      <div className="max-w-md mx-auto">
      <div className="bg-white rounded-[28px] shadow-xl border border-slate-100 overflow-hidden">
        <div className="h-1.5" style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)" }} />
        <div className="p-8 flex flex-col items-center space-y-6">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <QrCode size={28} />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-[0.15em]">Attendance QR Code</h2>
            <p className="text-slate-400 font-medium text-xs">Save the full styled card to your device.</p>
          </div>
          <div className="p-6 rounded-[20px] border border-slate-100 bg-slate-50">
            <div ref={qrPreviewRef} className="mx-auto" style={{ width: 200, height: 200 }} />
          </div>
          <div className="w-full max-w-sm">
            <button
              onClick={() => handleDownloadQR("light")}
              disabled={downloadingQR || !qrLoaded}
              className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 text-white shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              style={{ background: downloadingQR ? "#22c55e" : "linear-gradient(135deg,#1d4ed8,#2563eb)", boxShadow: downloadingQR ? "0 10px 25px -5px rgba(34,197,94,0.3)" : "0 10px 25px -5px rgba(29,78,216,0.3)" }}
            >
              {downloadingQR ? <><CheckCircle2 size={16} /> Downloaded!</> : <><Download size={16} /> Download QR Card</>}
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* ─── 2. SCHEDULE SECTION ─── */}
      {schedules.length > 0 ? (
        <div className="bg-white rounded-[28px] shadow-xl border border-slate-100 overflow-hidden">
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

            {/* ── Schedule Grid Preview (capturable) ── */}
            <div className="w-full overflow-x-auto">
              <div
                ref={scheduleRef}
                id="portal-schedule-capture"
                style={{
                  background: "#fff",
                  padding: 20,
                  fontFamily: "Inter,'Helvetica Neue',Helvetica,Arial,sans-serif",
                  width: "100%",
                  minWidth: 680,
                  borderRadius: 16,
                  border: `1px solid ${borderColor}`,
                  overflow: "hidden",
                }}
              >
                {/* Section / SY header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
                    <span style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "#1e293b" }}>{section}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>{schedules[0]?.school_year || ""}</span>
                </div>

                {/* Day header row */}
                <div style={{ display: "flex", borderBottom: `1px solid ${borderColor}`, background: "#f8fafc", borderRadius: "8px 8px 0 0", overflow: "hidden" }}>
                  <div style={{ width: 70, minWidth: 70, borderRight: `1px solid ${borderColor}` }} />
                  {DAYS.map((day, i) => (
                    <div key={day} style={{ flex: 1, padding: "10px 6px", textAlign: "center", borderRight: i < DAYS.length - 1 ? `1px solid ${borderColor}` : "none" }}>
                      <p style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: byDay[day].length > 0 ? "#3b82f6" : "#cbd5e1", margin: 0 }}>{day}</p>
                      <p style={{ fontSize: 7.5, fontWeight: 600, color: "#94a3b8", margin: "2px 0 0" }}>{byDay[day].length} period{byDay[day].length !== 1 ? "s" : ""}</p>
                    </div>
                  ))}
                </div>

                {/* Timetable body */}
                <div style={{ display: "flex", position: "relative", height: gridH, border: `1px solid ${borderColor}`, borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>

                  {/* Time axis */}
                  <div style={{ width: 70, minWidth: 70, position: "relative", borderRight: `1px solid ${borderColor}`, background: "#f8fafc" }}>
                    {timeLabels.map((m, i) => {
                      const isHour = m % 60 === 0
                      return (
                        <div key={m} style={{ position: "absolute", top: i * 44, left: 0, right: 0, height: 20, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 10 }}>
                          <span style={{ fontSize: isHour ? 9.5 : 7.5, fontWeight: isHour ? 900 : 600, color: isHour ? "#475569" : "#94a3b8", fontFamily: "monospace" }}>
                            {fmtMins(m)}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Day columns */}
                  {DAYS.map((day, dIdx) => (
                    <div key={day} style={{ flex: 1, position: "relative", overflow: "hidden", borderRight: dIdx < DAYS.length - 1 ? `1px solid ${borderColor}` : "none" }}>

                      {/* Horizontal grid lines */}
                      {timeLabels.slice(0, -1).map((m, i) => {
                        const isHour = m % 60 === 0
                        return (
                          <div key={m} style={{ position: "absolute", top: i * 44 + 10, left: 0, right: 0, height: 44, borderBottom: `1px solid ${isHour ? borderColor : halfBorder}`, pointerEvents: "none" }} />
                        )
                      })}

                      {/* Subject cards */}
                      {byDay[day].map(s => {
                        const col = colorMap[s.subject] ?? SUBJECT_COLORS[0]
                        const startMins = toMins(s.start_time)
                        const endMins   = toMins(s.end_time)
                        const top    = ((startMins - minMins) / 30) * 44
                        const height = ((endMins - startMins) / 30) * 44
                        const compact = height <= 50
                        return (
                          <div key={s.id} style={{
                            position: "absolute",
                            left: 4, right: 4,
                            top: top + 11.5,
                            height: height - 3,
                            borderRadius: 12,
                            background: col.bg,
                            border: `1px solid ${col.border}`,
                            padding: compact ? 6 : 8,
                            overflow: "hidden",
                            zIndex: 10,
                          }}>
                            <p style={{ fontSize: compact ? 8 : 9, fontWeight: 900, textTransform: "uppercase", color: col.text, margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.subject}</p>
                            {!compact && <p style={{ fontSize: 8, color: "#64748b", fontWeight: 600, margin: 0 }}>{formatTime(s.start_time)} – {formatTime(s.end_time)}</p>}
                            {!compact && s.teacher && <p style={{ fontSize: 7.5, color: "#94a3b8", margin: "1px 0 0" }}>{s.teacher}</p>}
                            {!compact && s.room    && <p style={{ fontSize: 7.5, color: "#94a3b8", margin: 0 }}>{s.room}</p>}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>

                {/* Subject legend */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${halfBorder}` }}>
                  {uniqueSubjects.map(sub => {
                    const col = colorMap[sub]
                    return (
                      <span key={sub} style={{ fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 10px", borderRadius: 999, background: col.bg, border: `1px solid ${col.border}`, color: col.text }}>
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
