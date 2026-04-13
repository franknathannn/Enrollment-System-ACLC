// app/status/components/StudentQRCard.tsx
"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { QrCode, Download, Shield, Info, X, Eye } from "lucide-react"
import {
  STUDENT_ATTENDANCE_QR_THEMES as THEMES,
  type StudentAttendanceQrThemeKey as ThemeKey,
  generateStudentAttendanceQr,
  buildStudentAttendanceQrDownloadCanvas,
} from "@/lib/studentAttendanceQr"

interface StudentQRCardProps {
  studentId: string
  studentName: string
  lrn: string
  section?: string | null
  dm?: boolean
}

declare global {
  interface Window {
    QRCode?: new (el: HTMLElement, opts: {
      text: string; width: number; height: number
      colorDark: string; colorLight: string; correctLevel: number
    }) => void
  }
}

// ── Preview / Download modal ──────────────────────────────────────────────────
function PreviewModal({
  studentId, studentName, lrn, section, onClose, onDownload,
}: {
  studentId: string; studentName: string; lrn: string; section?: string | null
  onClose: () => void; onDownload: (theme: ThemeKey) => Promise<void>
}) {
  const theme: ThemeKey = "light"
  const lightRef = useRef<HTMLDivElement>(null)
  const [lightOk, setLightOk] = useState(false)
  const [saving, setSaving] = useState(false)
  const SZ = 176

  useEffect(() => {
    if (!window.QRCode) return
    if (lightRef.current) generateStudentAttendanceQr(lightRef.current, studentId, SZ, "light", () => setLightOk(true))
  }, [studentId])

  const t = THEMES[theme]
  const isOk = lightOk

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.93)", backdropFilter: "blur(24px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xs overflow-y-auto thin-scroll"
        style={{ borderRadius: 32, background: t.bg, border: `1.5px solid ${t.border}`, boxShadow: "0 32px 80px rgba(0,0,0,0.6)", maxHeight: "min(640px,90svh)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.08)", color: t.textSec }}>
          <X size={13} />
        </button>

        {/* School header */}
        <div className="relative overflow-hidden px-5 py-5 flex items-center gap-3"
          style={{ background: `linear-gradient(135deg,${t.strip0},${t.strip1})` }}>
          <div className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "radial-gradient(circle,#fff 1px,transparent 1px)", backgroundSize: "14px 14px" }} />
          <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-aclc.png" alt="ACLC" className="w-full h-full object-contain p-0.5"
              onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
          </div>
          <div className="relative">
            <p className="text-white text-[12px] font-black uppercase tracking-[0.18em] leading-none">AMA ACLC</p>
            <p className="text-blue-200 text-[8px] font-bold uppercase tracking-[0.2em] mt-0.5 opacity-80 leading-none">Northbay</p>
          </div>
        </div>


        {/* QR card preview */}
        <div className="px-4 py-3">
          <div className="rounded-[20px] overflow-hidden transition-all duration-300"
            style={{ background: t.card, border: `1px solid ${t.border}` }}>
            <div className="h-0.5" style={{ background: `linear-gradient(90deg,${t.strip0},${t.strip1})` }} />

            {/* Section badge */}
            {section && (
              <div className="pt-3 flex justify-center">
                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
                  style={{ background: t.badge, color: t.badgeText }}>{section}</span>
              </div>
            )}

            {/* QR */}
            <div className="flex justify-center py-4">
              <div className="relative p-2.5 rounded-[16px]" style={{ background: THEMES[theme].qrLight }}>
                <div ref={lightRef} style={{ display: lightOk ? "block" : "none", width: SZ, height: SZ }} />
                {!isOk && (
                  <div style={{ width: SZ, height: SZ }} className="flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: t.textAccent, borderTopColor: "transparent" }} />
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 pb-4 text-center space-y-0.5">
              <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: t.textPri }}>{studentName}</p>
              <p className="text-[9px] font-bold" style={{ color: t.textSec }}>LRN: {lrn}</p>
            </div>
          </div>
        </div>

        {/* Download */}
        <div className="px-4 pb-5">
          <button
            disabled={!isOk || saving}
            onClick={async () => { setSaving(true); await onDownload(theme); setSaving(false) }}
            className="w-full flex items-center justify-center gap-2 rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 text-white touch-manipulation"
            style={{ background: `linear-gradient(135deg,${t.strip0},${t.strip1})`, boxShadow: "0 6px 24px rgba(29,78,216,0.35)", minHeight: 48, padding: "12px 16px" }}>
            <Download size={13} />
            {saving ? "Saving…" : "Download QR Card"}
          </button>
        </div>
      </div>
    </div>
  )
}


// ── Main Component ────────────────────────────────────────────────────────────
export function StudentQRCard({ studentId, studentName, lrn, section, dm = true }: StudentQRCardProps) {
  const qrRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [qrSize, setQrSize] = useState(220)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 260
      setQrSize(Math.min(280, Math.max(160, Math.floor(w * 0.74))))
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (window.QRCode) { setLoaded(true); return }
    const s = document.createElement("script")
    s.src = "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"
    s.onload = () => setLoaded(true)
    document.head.appendChild(s)
  }, [])

  useEffect(() => {
    if (!loaded || !qrRef.current || !studentId) return
    qrRef.current.innerHTML = ""
    setReady(false)
    generateStudentAttendanceQr(qrRef.current, studentId, qrSize, "light", () => setReady(true))
  }, [loaded, studentId, qrSize, dm])

  const handleDownload = useCallback(async (theme: ThemeKey) => {
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
  }, [studentId, lrn, section, studentName])

  // ── Theme tokens ────────────────────────────────────────────────────────────
  const outerBg     = dm ? "rgba(10,15,30,0.7)"               : "#ffffff"
  const outerBorder = dm ? "1px solid rgba(30,58,110,0.5)"    : "1px solid rgba(30,100,200,0.12)"
  const cardBg      = dm ? "#0a0f1e"                           : "#f8fafc"
  const cardBorder  = dm ? "1px solid #1e3a6e"                : "1px solid #e2e8f0"
  const qrBoxBg     = dm ? "#0a0f1e"                          : "#ffffff"
  const nameTxt     = dm ? "text-slate-100"                   : "text-slate-800"
  const lrnTxt      = dm ? "text-slate-500"                   : "text-slate-500"
  const hintTxt     = dm ? "text-slate-700"                   : "text-slate-400"
  const instrBg     = dm ? "rgba(255,255,255,0.02)"           : "rgba(0,0,0,0.025)"
  const instrBorder = dm ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(0,0,0,0.06)"
  const instrNum    = dm ? "text-slate-600"                   : "text-slate-400"
  const instrTxt    = dm ? "text-slate-500"                   : "text-slate-500"
  const privacyTxt  = dm ? "text-slate-700"                   : "text-slate-400"
  const pillBg      = dm ? "rgba(56,189,248,0.1)"             : "rgba(2,132,199,0.08)"
  const pillBorder  = dm ? "rgba(56,189,248,0.25)"            : "rgba(2,132,199,0.2)"
  const pillColor   = dm ? "#38bdf8"                          : "#0284c7"
  const spinColor   = dm ? "#38bdf8"                          : "#2563eb"
  const previewBg   = dm ? "rgba(56,189,248,0.08)"           : "rgba(2,132,199,0.06)"
  const previewBorder = dm ? "rgba(56,189,248,0.2)"          : "rgba(2,132,199,0.18)"
  const previewColor  = dm ? "#38bdf8"                        : "#0369a1"

  return (
    <>
      <div ref={containerRef} className="w-full overflow-hidden"
        style={{ borderRadius: 28, border: outerBorder, background: outerBg }}>

        {/* Section pill — on top */}
        {section && (
          <div className="px-6 pt-5 pb-0 flex">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest"
              style={{ background: pillBg, border: `1px solid ${pillBorder}`, color: pillColor }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: pillColor }} />
              {section}
            </span>
          </div>
        )}

        {/* Label row */}
        <div className="px-6 pt-3 pb-3 flex items-center gap-2">
          <QrCode size={13} style={{ color: pillColor }} className="shrink-0" />
          <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: pillColor }}>My Attendance QR Code</p>
        </div>

        {/* Main QR card */}
        <div className="px-5 pb-2">
          <div className="relative rounded-[24px] overflow-hidden"
            style={{ background: cardBg, border: cardBorder }}>

            {/* School header — always the same gradient stripe */}
            <div className="relative overflow-hidden px-5 py-4 flex items-center gap-3"
              style={{ background: "linear-gradient(135deg,#1a3a7a 0%,#0c1a3e 100%)" }}>
              <div className="absolute inset-0 opacity-[0.07]"
                style={{ backgroundImage: "radial-gradient(circle,#fff 1px,transparent 1px)", backgroundSize: "14px 14px" }} />
              <div className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.22)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-aclc.png" alt="ACLC" className="w-full h-full object-contain p-0.5"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
              </div>
              <div className="relative flex-1">
                <p className="text-white text-[12px] font-black uppercase tracking-[0.18em] leading-none">AMA ACLC</p>
                <p className="text-blue-300 text-[8px] font-bold uppercase tracking-[0.22em] mt-0.5 opacity-80 leading-none">Northbay</p>
              </div>
              <div className="relative text-right">
                <p className="text-white/25 text-[7px] font-bold uppercase tracking-[0.2em] leading-none">Student</p>
                <p className="text-white/25 text-[7px] font-bold uppercase tracking-[0.2em] mt-0.5 leading-none">Attendance QR</p>
              </div>
            </div>

            {/* QR with corner marks */}
            <div className="flex flex-col items-center py-6 gap-0">
              <div className="relative inline-block">
                <div className="p-3 rounded-[20px]" style={{ background: qrBoxBg }}>
                  {!ready && (
                    <div style={{ width: qrSize, height: qrSize }} className="flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: spinColor, borderTopColor: "transparent" }} />
                    </div>
                  )}
                  <div ref={qrRef} className={ready ? "block" : "hidden"} />
                </div>
                {/* Corner marks */}
                {ready && (["top-0 left-0 border-t-2 border-l-2 rounded-tl-md",
                  "top-0 right-0 border-t-2 border-r-2 rounded-tr-md",
                  "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-md",
                  "bottom-0 right-0 border-b-2 border-r-2 rounded-br-md",
                ] as const).map((cls, i) => (
                  <div key={i} className={`absolute w-5 h-5 ${cls}`}
                    style={{ borderColor: spinColor }} />
                ))}
              </div>
            </div>

            {/* Name / LRN */}
            <div className="px-5 pb-5 text-center space-y-1">
              <p className={`text-[11px] font-black uppercase tracking-wide ${nameTxt}`}>{studentName}</p>
              <p className={`text-[9px] font-bold ${lrnTxt}`}>LRN: {lrn}</p>
              <p className={`text-[8px] uppercase tracking-widest mt-1 ${hintTxt}`}>Scan for attendance · Keep private</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-5 py-4 flex items-center gap-3">
          <button onClick={() => setShowPreview(true)} disabled={!ready}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[14px] text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-40 touch-manipulation"
            style={{ background: previewBg, border: `1px solid ${previewBorder}`, color: previewColor, minHeight: 44 }}>
            <Eye size={12} /> Preview
          </button>
          <button onClick={() => setShowPreview(true)} disabled={!ready}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[14px] text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-40 text-white touch-manipulation"
            style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)", boxShadow: "0 4px 20px rgba(29,78,216,0.3)" }}>
            <Download size={12} /> Download
          </button>
        </div>

        {/* Instructions */}
        <div className="mx-5 mb-4 rounded-[18px] p-4 space-y-2"
          style={{ background: instrBg, border: instrBorder }}>
          <div className="flex items-center gap-2">
            <Info size={10} style={{ color: previewColor }} className="shrink-0" />
            <p className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: previewColor }}>How to Use</p>
          </div>
          <ul className="space-y-1.5">
            {[
              "Download and save this QR code to your phone",
              "Show it to the teacher's scanner at the start of each class",
              "One scan counts as Present for that subject",
              "Teachers may mark you Late or Absent if needed",
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={`text-[8px] font-black mt-0.5 shrink-0 ${instrNum}`}>{i + 1}.</span>
                <span className={`text-[9px] leading-relaxed ${instrTxt}`}>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-5 mb-5 flex items-start gap-2">
          <Shield size={9} className={`shrink-0 mt-0.5 ${privacyTxt}`} />
          <p className={`text-[8px] font-bold uppercase tracking-widest leading-relaxed ${privacyTxt}`}>
            Keep this QR private. It uniquely identifies you in the attendance system.
          </p>
        </div>
      </div>

      {showPreview && (
        <PreviewModal
          studentId={studentId} studentName={studentName} lrn={lrn} section={section}
          onClose={() => setShowPreview(false)}
          onDownload={async (theme) => { await handleDownload(theme); setShowPreview(false) }}
        />
      )}
    </>
  )
}