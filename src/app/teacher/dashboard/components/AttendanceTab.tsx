// src/app/teacher/dashboard/components/AttendanceTab.tsx
"use client"

/**
 * REQUIRES: npm install jsqr
 * OR add to <head>: <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"></script>
 * This component dynamically imports jsQR at runtime.
 */

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react"
import {
  QrCode, Camera, CameraOff, CheckCircle2, Clock, MinusCircle,
  Loader2, Wifi, WifiOff, Upload, AlertTriangle, User,
  Search, X, ScanLine, ChevronLeft, ChevronRight,
  CalendarDays, BookOpen, Users, Eye, ShieldCheck, Download, Sun, Moon,
} from "lucide-react"
import { supabase } from "@/lib/supabase/teacher-client"
import {
  STUDENT_ATTENDANCE_QR_THEMES as QR_THEMES,
  type StudentAttendanceQrThemeKey,
  generateStudentAttendanceQr,
  buildStudentAttendanceQrDownloadCanvas,
} from "@/lib/studentAttendanceQr"
import { Switch } from "@/components/ui/switch"
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { TeacherSession, ScheduleRow, Student, fmt, todayName, ALL_DAYS } from "../types"
import { LiveMonitoring } from "./LiveMonitoring"

export type AttStatus = "Present" | "Late" | "Absent" | "Excused"

export interface AttRecord {
  id?: string
  student_id: string
  lrn: string
  student_name: string
  section: string
  strand: string
  subject: string
  date: string
  time: string
  status: AttStatus
  school_year: string
  notes?: string | null
}

interface PendingItem {
  key: string
  record: AttRecord
  action: "insert" | "update"
  ts: number
}

interface Props {
  schedules: ScheduleRow[]
  students: Student[]
  dm: boolean
  session: TeacherSession
  schoolYear: string
}

const LS_KEY = "att_pending_v3"
const getQueue = (): PendingItem[] => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]") } catch { return [] } }
const saveQueue = (q: PendingItem[]) => localStorage.setItem(LS_KEY, JSON.stringify(q))
const upsertQueue = (rec: AttRecord, action: "insert" | "update") => {
  const q = getQueue()
  const key = `${rec.student_id}_${rec.date}_${rec.subject}`
  const idx = q.findIndex(p => p.key === key)
  const entry: PendingItem = { key, record: rec, action, ts: Date.now() }
  if (idx >= 0) q[idx] = entry; else q.push(entry)
  saveQueue(q)
  return key
}
const removeFromQueue = (key: string) => saveQueue(getQueue().filter(p => p.key !== key))

const localDateStr = (d: Date = new Date()) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
const todayStr = () => localDateStr()
const nowTime  = () => new Date().toTimeString().slice(0, 8)
const fmtT = (t: string) => {
  if (!t) return ""
  const [h, m] = t.slice(0, 5).split(":").map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}
const monthName = (m: number) =>
  ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m]

function SourceBadge({ notes, time, size = "sm" }: { notes?: string | null; time?: string; size?: "xs" | "sm" }) {
  const isQR      = notes === "QR_SCAN"
  const isCutting = notes === "CUTTING"
  const px = size === "xs" ? "px-1.5 py-px text-[7px]" : "px-2 py-0.5 text-[8px]"
  if (isQR) return (
    <span className={`inline-flex items-center gap-0.5 font-black rounded-full shrink-0 ${px} bg-blue-500/15 text-blue-400 border border-blue-500/20`}>
      <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h2v2h-2zM18 14h3M14 18h3M18 18h3"/></svg>
      Scanned
    </span>
  )
  if (isCutting) return (
    <span className={`inline-flex items-center gap-0.5 font-black rounded-full shrink-0 ${px} bg-orange-500/15 text-orange-400 border border-orange-500/20`}>
      Cutting
    </span>
  )
  return (
    <span className={`inline-flex items-center gap-0.5 font-black rounded-full shrink-0 ${px} bg-slate-500/15 text-slate-400 border border-slate-500/20`}>
      Manual
    </span>
  )
}

declare global {
  interface Window {
    jsQR?: (
      d: Uint8ClampedArray, w: number, h: number,
      opts?: { inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst" }
    ) => { data: string } | null
  }
}
const loadJsQR = () => new Promise<void>(resolve => {
  if (window.jsQR) { resolve(); return }
  const s = document.createElement("script")
  s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"
  s.onload = () => resolve()
  s.onerror = () => resolve()
  document.head.appendChild(s)
})

declare global { interface Window { QRCode?: new (el: HTMLElement, opts: { text: string; width: number; height: number; colorDark: string; colorLight: string; correctLevel: number }) => void } }

/** Same layout & PNG as status `StudentQRCard` — QR payload is `student.id` (scanner also accepts LRN). */
function QRViewerModal({ student, onClose }: { student: Student; onClose: () => void }) {
  const darkRef  = useRef<HTMLDivElement>(null)
  const lightRef = useRef<HTMLDivElement>(null)
  const [theme, setTheme] = useState<StudentAttendanceQrThemeKey>("dark")
  const [darkOk, setDarkOk] = useState(false)
  const [lightOk, setLightOk] = useState(false)
  const [saving, setSaving] = useState(false)
  const SZ = 176

  const studentFullName = `${student.last_name}, ${student.first_name}`

  useEffect(() => {
    setDarkOk(false)
    setLightOk(false)
    const generate = () => {
      if (darkRef.current)  generateStudentAttendanceQr(darkRef.current,  student.id, SZ, "dark",  () => setDarkOk(true))
      if (lightRef.current) generateStudentAttendanceQr(lightRef.current, student.id, SZ, "light", () => setLightOk(true))
    }
    if (window.QRCode) { generate(); return }
    const s = document.createElement("script")
    s.src = "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"
    s.onload = generate
    document.head.appendChild(s)
  }, [student.id])

  const handleDownload = async (th: StudentAttendanceQrThemeKey) => {
    setSaving(true)
    try {
      const offDiv = document.createElement("div")
      offDiv.style.cssText = "position:absolute;left:-9999px;top:0;"
      document.body.appendChild(offDiv)
      await new Promise<void>(res => generateStudentAttendanceQr(offDiv, student.id, 340, th, res))
      const src = offDiv.querySelector("canvas") as HTMLCanvasElement | null
      if (!src) { document.body.removeChild(offDiv); return }
      const out = await buildStudentAttendanceQrDownloadCanvas(th, src, {
        studentName: studentFullName,
        lrn: student.lrn,
        section: student.section,
      })
      document.body.removeChild(offDiv)
      const a = document.createElement("a")
      a.download = `attendance_qr_${student.lrn}_${th}.png`
      a.href = out.toDataURL("image/png", 1.0)
      a.click()
    } finally {
      setSaving(false)
    }
  }

  const t = QR_THEMES[theme]
  const isOk = theme === "dark" ? darkOk : lightOk

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.93)", backdropFilter: "blur(24px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xs overflow-y-auto thin-scroll"
        style={{
          borderRadius: 32,
          background: t.bg,
          border: `1.5px solid ${t.border}`,
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          maxHeight: "min(640px,90svh)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.08)", color: t.textSec }}
        >
          <X size={13} />
        </button>

        <div
          className="relative overflow-hidden px-5 py-5 flex items-center gap-3"
          style={{ background: `linear-gradient(135deg,${t.strip0},${t.strip1})` }}
        >
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "radial-gradient(circle,#fff 1px,transparent 1px)", backgroundSize: "14px 14px" }}
          />
          <div
            className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-aclc.png" alt="ACLC" className="w-full h-full object-contain p-0.5"
              onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
          </div>
          <div className="relative">
            <p className="text-white text-[12px] font-black uppercase tracking-[0.18em] leading-none">AMA ACLC</p>
            <p className="text-blue-200 text-[8px] font-bold uppercase tracking-[0.2em] mt-0.5 opacity-80 leading-none">Northbay College</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pt-4 pb-2 px-5">
          {(["dark", "light"] as StudentAttendanceQrThemeKey[]).map(th => (
            <button
              key={th}
              type="button"
              onClick={() => setTheme(th)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-wide transition-all flex-1 justify-center"
              style={theme === th
                ? { background: `linear-gradient(135deg,${t.strip0},${t.strip1})`, color: "#fff", boxShadow: "0 4px 16px rgba(29,78,216,0.3)" }
                : { background: "transparent", color: t.textSec, border: `1px solid ${t.border}` }}
            >
              {th === "dark" ? <Moon size={10} /> : <Sun size={10} />} {th}
            </button>
          ))}
        </div>

        <div className="px-4 py-3">
          <div className="rounded-[20px] overflow-hidden transition-all duration-300"
            style={{ background: t.card, border: `1px solid ${t.border}` }}>
            <div className="h-0.5" style={{ background: `linear-gradient(90deg,${t.strip0},${t.strip1})` }} />

            {student.section && (
              <div className="pt-3 flex justify-center">
                <span
                  className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
                  style={{ background: t.badge, color: t.badgeText }}
                >
                  {student.section}
                </span>
              </div>
            )}

            <div className="flex justify-center py-4">
              <div className="relative p-2.5 rounded-[16px]" style={{ background: QR_THEMES[theme].qrLight }}>
                <div ref={darkRef}  style={{ display: theme === "dark"  && darkOk  ? "block" : "none", width: SZ, height: SZ }} />
                <div ref={lightRef} style={{ display: theme === "light" && lightOk ? "block" : "none", width: SZ, height: SZ }} />
                {!isOk && (
                  <div style={{ width: SZ, height: SZ }} className="flex items-center justify-center">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: t.textAccent, borderTopColor: "transparent" }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 pb-4 text-center space-y-0.5">
              <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: t.textPri }}>{studentFullName}</p>
              <p className="text-[9px] font-bold" style={{ color: t.textSec }}>LRN: {student.lrn}</p>
            </div>
          </div>
        </div>

        <div className="px-4 pb-5">
          <button
            type="button"
            disabled={!isOk || saving}
            onClick={() => handleDownload(theme)}
            className="w-full flex items-center justify-center gap-2 rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 text-white touch-manipulation"
            style={{
              background: `linear-gradient(135deg,${t.strip0},${t.strip1})`,
              boxShadow: "0 6px 24px rgba(29,78,216,0.35)",
              minHeight: 48,
              padding: "12px 16px",
            }}
          >
            <Download size={13} />
            {saving ? "Saving…" : `Download ${theme === "dark" ? "Dark" : "Light"}`}
          </button>
        </div>
      </div>
    </div>
  )
}

const ATT_TAB_KEY = "att_active_tab"

export function AttendanceTab({ schedules, students, dm, session, schoolYear }: Props) {
  const realDayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]

  const [tab, setTab] = useState<"scanner" | "calendar">(() => {
    try { return (sessionStorage.getItem(ATT_TAB_KEY) as "scanner" | "calendar") || "scanner" } catch { return "scanner" }
  })
  const setTabPersist = (t: "scanner" | "calendar") => {
    try { sessionStorage.setItem(ATT_TAB_KEY, t) } catch {}
    setTab(t)
  }
  /** Date used for scanner attendance rows — set from calendar when opening Scanner, else today. */
  const [scannerAttendanceDate, setScannerAttendanceDate] = useState<string>(() => localDateStr())
  const [beepOn, setBeepOn] = useState(true)
  useEffect(() => {
    try {
      const v = localStorage.getItem("teacher_att_beep")
      if (v !== null) setBeepOn(v === "true")
    } catch { /* ignore */ }
  }, [])
  const setBeepPersist = (on: boolean) => {
    setBeepOn(on)
    try { localStorage.setItem("teacher_att_beep", String(on)) } catch { /* ignore */ }
  }

  const scannerDayName = useMemo(() => {
    const d = new Date(scannerAttendanceDate + "T12:00:00")
    return realDayNames[d.getDay()]
  }, [scannerAttendanceDate])
  const scannerSchedules = useMemo(
    () => schedules.filter(s => s.day === scannerDayName),
    [schedules, scannerDayName]
  )
  const isScannerLive = scannerAttendanceDate === todayStr()

  const scannerDateBanner = useMemo(() => {
    const d = new Date(scannerAttendanceDate + "T12:00:00")
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric" }).toUpperCase()
  }, [scannerAttendanceDate])

  const [period, setPeriod]       = useState<ScheduleRow | null>(null)
  const [scanning, setScanning]   = useState(false)
  const [camErr, setCamErr]       = useState<string | null>(null)
  const [lastScan, setLastScan]   = useState<{ name: string; ok: boolean } | null>(null)
  const [attendance, setAttendance] = useState<Record<string, AttRecord>>({})
  const [attLoading, setAttLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const scannerActionLockRef = useRef<Set<string>>(new Set())
  // Two-layer search: input value updates instantly, debounced value drives the filter
  const [search, setSearch]           = useState("")
  const [searchDebounced, setSearchDebounced] = useState("")
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setSearchWithDebounce = (v: string) => {
    setSearch(v)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => setSearchDebounced(v), 180)
  }
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Present" | "Late" | "Excused" | "Absent" | "Not Scanned">("ALL")
  const [sortMode, setSortMode]           = useState<"alpha" | "scan_time" | "manual" | "late" | "absent">("scan_time")
  // ── FIX: graceMins state + ref so handleScan closure always reads latest value ──
  const [graceMins, setGraceMins] = useState(0)
  const graceMinsRef = useRef(0)
  const [calDayExcuses, setCalDayExcuses] = useState<Array<{student_id:string;subject:string|null;reason:string}>>([])
  const [isOnline, setIsOnline]   = useState(true)
  const [pending, setPending]     = useState<PendingItem[]>(() => getQueue())
  const [syncing, setSyncing]     = useState(false)
  const [jsQRReady, setJsQRReady] = useState(false)
  const [qrViewStudent, setQrViewStudent] = useState<Student | null>(null)
  const [isFrontCamera, setIsFrontCamera] = useState(false)
  const [forcedOpen, setForcedOpen]       = useState(false)
  const [scannerClosed, setScannerClosed] = useState(false)
  const [showLiveMonitoring, setShowLiveMonitoring] = useState(false)

  const [calSection, setCalSection]       = useState<string>("")
  const [calYear, setCalYear]             = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth]           = useState(() => new Date().getMonth())
  const [calDayData, setCalDayData]       = useState<Record<string, { present: number; total: number; excused: number; bySubject: Record<string, { present: number; total: number }> }>>({})
  const [calLoading, setCalLoading]       = useState(false)
  const [selectedDay, setSelectedDay]     = useState<string | null>(null)

  const goToScannerTab = () => {
    setTabPersist("scanner")
    setScannerAttendanceDate(selectedDay ?? localDateStr())
  }
  const [dayRecords, setDayRecords]       = useState<AttRecord[]>([])
  const [dayLoading, setDayLoading]       = useState(false)
  const [dayView, setDayView]             = useState<"by-subject" | "by-student">("by-subject")
  const [calendarEvents, setCalendarEvents] = useState<Array<{
    id: string; title: string; event_date: string; end_date?: string
    event_type: string; school_year: string
  }>>([])

  const videoRef      = useRef<HTMLVideoElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const rafRef        = useRef<number>(0)
  const lockRef       = useRef(false)
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const frameCountRef = useRef(0)
  const scannerListRef = useRef<HTMLDivElement>(null)

  const card  = dm ? "bg-slate-900/60 border-slate-700/50" : "bg-white border-slate-200"
  const card2 = dm ? "bg-slate-800/40 border-slate-700/40" : "bg-slate-50 border-slate-200"
  const sub   = dm ? "text-slate-400" : "text-slate-500"
  const head  = dm ? "text-white" : "text-slate-900"
  const divB  = dm ? "border-slate-700/40" : "border-slate-100"

  const tabBtn = (a: boolean) =>
    `px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
     ${a ? "bg-blue-600 text-white shadow" : dm ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`

  useEffect(() => { loadJsQR().then(() => setJsQRReady(!!window.jsQR)) }, [])

  // ── FIX: Keep graceMinsRef in sync with graceMins state ──
  useEffect(() => { graceMinsRef.current = graceMins }, [graceMins])

  useEffect(() => {
    if (!period) return
    if (!scannerSchedules.some(s => s.id === period.id)) setPeriod(null)
  }, [scannerAttendanceDate, scannerSchedules, period])

  useEffect(() => {
    if (!period || !scanning || !isScannerLive) return
    const check = () => {
      if (forcedOpen) return
      const now  = new Date()
      const [eh, em] = period.end_time.slice(0, 5).split(":").map(Number)
      const endMins  = eh * 60 + em
      const nowMins  = now.getHours() * 60 + now.getMinutes()
      if (nowMins >= endMins) {
        stopCam()
        setScannerClosed(true)
        toast.info(`Scanner closed — ${period.subject} ended at ${fmtT(period.end_time)}`, {
          description: "Tap 'Force Open' to reopen it",
          duration: 5000,
        })
      }
    }
    check()
    const timer = setInterval(check, 30_000)
    return () => clearInterval(timer)
  }, [period, scanning, forcedOpen, isScannerLive]) // eslint-disable-line

  useEffect(() => { setForcedOpen(false); setScannerClosed(false) }, [period])

  useEffect(() => {
    supabase
      .from("school_calendar_events")
      .select("id, title, event_date, end_date, event_type, school_year")
      .then(({ data }) => setCalendarEvents(data || []))
    const ch = supabase.channel("att_cal_events_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "school_calendar_events" },
        () => supabase.from("school_calendar_events").select("id, title, event_date, end_date, event_type, school_year")
          .then(({ data }) => setCalendarEvents(data || [])))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  useEffect(() => {
    let probeTimer: ReturnType<typeof setInterval>
    const probe = async () => {
      try {
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), 4000)
        await fetch("https://www.gstatic.com/generate_204", { method: "HEAD", mode: "no-cors", signal: ctrl.signal })
        clearTimeout(t)
        setIsOnline(true)
      } catch { setIsOnline(false) }
    }
    const onOnline  = () => probe()
    const onOffline = () => setIsOnline(false)
    window.addEventListener("online",  onOnline)
    window.addEventListener("offline", onOffline)
    probe()
    probeTimer = setInterval(probe, 8000)
    return () => { clearInterval(probeTimer); window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline) }
  }, [])

  useEffect(() => { if (isOnline && getQueue().length > 0) syncQueue() }, [isOnline])

  const loadAttendance = useCallback(async (p: ScheduleRow) => {
    const mine = students.filter(s => s.section === p.section)
    if (!mine.length) return
    const dateStr = scannerAttendanceDate
    const { data } = await supabase
      .from("attendance").select("*")
      .in("student_id", mine.map(s => s.id))
      .eq("date", dateStr).eq("subject", p.subject)
    if (data) {
      const scrollPos = scannerListRef.current?.scrollTop ?? 0
      const map: Record<string, AttRecord> = {}
      data.forEach((r: any) => { map[r.student_id] = { ...r, notes: r.notes || "QR_SCAN" } })
      getQueue().filter(q => q.record.subject === p.subject && q.record.date === dateStr)
        .forEach(q => { map[q.record.student_id] = q.record })
      setAttendance(map)
      requestAnimationFrame(() => { if (scannerListRef.current) scannerListRef.current.scrollTop = scrollPos })
    }
  }, [students, scannerAttendanceDate])

  useEffect(() => { if (period) loadAttendance(period) }, [period, loadAttendance])

  useEffect(() => {
    if (!period) return
    const ch = supabase.channel(`att_tab_${period.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, async () => {
        const mine = students.filter(s => s.section === period.section)
        if (!mine.length) return
        const { data } = await supabase
          .from("attendance").select("*")
          .in("student_id", mine.map(s => s.id))
          .eq("date", scannerAttendanceDate).eq("subject", period.subject)
        if (data) {
          const scrollPos = scannerListRef.current?.scrollTop ?? 0
          const map: Record<string, AttRecord> = {}
          data.forEach((r: any) => { map[r.student_id] = { ...r, notes: r.notes || "QR_SCAN" } })
          getQueue().filter(q => q.record.subject === period.subject && q.record.date === scannerAttendanceDate)
            .forEach(q => { map[q.record.student_id] = q.record })
          setAttendance(map)
          requestAnimationFrame(() => { if (scannerListRef.current) scannerListRef.current.scrollTop = scrollPos })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [period, students, scannerAttendanceDate])

  const startCam = async (force = false) => {
    if (force) setForcedOpen(true)
    setScannerClosed(false)
    setCamErr(null); setLastScan(null)

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    try {
      let stream: MediaStream
      const constraintsPresets = [
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } } },
        { video: { facingMode: { ideal: "environment" } } },
        { video: { facingMode: { ideal: "user" } } },
      ]

      for (const constraints of constraintsPresets) {
        try { stream = await navigator.mediaDevices.getUserMedia(constraints); break } catch (e) { console.warn(`Constraint failed`, e) }
      }

      // @ts-ignore
      if (!stream) throw new Error("Could not start camera. No suitable device found.")

      const track = stream.getVideoTracks()[0]
      const settings = track?.getSettings?.()
      setIsFrontCamera(settings?.facingMode === "user")

      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }

      setScanning(true)
      lockRef.current = false
      frameCountRef.current = 0
      tick()
    } catch (e: any) {
      console.error("Camera start-up error:", e)
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setCamErr("Camera permission denied. Please allow camera access in browser settings.")
      } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
        setCamErr("No suitable camera found.")
      } else {
        setCamErr(`Failed to start camera: ${e.message}`)
      }
    }
  }

  const stopCam = () => {
    cancelAnimationFrame(rafRef.current)
    clearTimeout(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    scanCanvasRef.current = null
    frameCountRef.current = 0
    setScanning(false)
    setForcedOpen(false)
  }

  const tick = () => {
    rafRef.current = requestAnimationFrame(() => {
      const v = videoRef.current
      if (!v || v.readyState < 2) { tick(); return }

      if (!lockRef.current && window.jsQR) {
        // Use setTimeout(0) to yield to browser paint/scroll before doing CPU work
        setTimeout(() => {
          if (!videoRef.current || lockRef.current) return
          if (!scanCanvasRef.current) scanCanvasRef.current = document.createElement("canvas")
          const sc = scanCanvasRef.current
          // Smaller decode size = faster, less main-thread time
          const scanW = Math.min(v.videoWidth, 480)
          const scanH = Math.round(v.videoHeight * (scanW / v.videoWidth))
          if (sc.width !== scanW || sc.height !== scanH) { sc.width = scanW; sc.height = scanH }
          const sctx = sc.getContext("2d", { willReadFrequently: true })
          if (sctx) {
            sctx.drawImage(v, 0, 0, scanW, scanH)
            const img = sctx.getImageData(0, 0, scanW, scanH)
            const code = window.jsQR(img.data, scanW, scanH, { inversionAttempts: "dontInvert" })
            if (code?.data) {
              lockRef.current = true
              handleScan(code.data).finally(() => {
                setTimeout(() => { lockRef.current = false }, 2000)
              })
            }
          }
        }, 0)
      }

      // Throttle: only decode ~8fps (every 120ms) to keep main thread free for scrolling
      rafRef.current = setTimeout(tick, 120) as unknown as number
    })
  }

  // Re-attach stream to video element when switching back to scanner tab.
  // When tab was "calendar", the video element was hidden (not unmounted) so
  // the stream is still alive — we just need to re-set srcObject and re-play.
  useEffect(() => {
    if (tab === "scanner" && scanning && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current
        videoRef.current.play().catch(() => {})
      }
    }
  }, [tab, scanning])

  useEffect(() => () => stopCam(), [])

  // ── FIX: handleScan now reads graceMinsRef.current instead of graceMins state ──
  const handleScan = async (raw: string) => {
    if (!period) { toast.warning("Select a period first"); return }
    const scannedLrn = raw.trim()
    const student = students.find(
      s => (s.lrn === scannedLrn || s.id === scannedLrn) && s.section === period.section
    )

    if (!student) {
      const any = students.find(s => s.lrn === scannedLrn || s.id === scannedLrn)
      const msg = any ? `${any.first_name} ${any.last_name} is not in ${period.section}` : "Unknown QR code"
      toast.error(msg)
      setLastScan({ name: any ? `${any.first_name} ${any.last_name}` : "Unknown", ok: false })
      return
    }

    if (attendance[student.id]) {
      const ex = attendance[student.id]
      toast.info(`${student.first_name} already scanned — ${ex.status} at ${fmtT(ex.time)}`)
      setLastScan({ name: `${student.first_name} ${student.last_name}`, ok: false })
      return
    }

    // ── FIX: Use graceMinsRef.current so we always get the latest value ──
    const autoStatus: AttStatus = (() => {
      if (!isScannerLive) return "Present"
      const gm = graceMinsRef.current
      if (!gm) return "Present"
      const now = new Date()
      const [sh, sm] = period.start_time.slice(0, 5).split(":").map(Number)
      const minsLate = (now.getHours() * 60 + now.getMinutes()) - (sh * 60 + sm)
      console.debug(`[AutoLate] graceMins=${gm}, start=${sh}:${sm}, minsLate=${minsLate}, willBeLate=${minsLate >= gm}`)
      return minsLate >= gm ? "Late" : "Present"
    })()

    const rec: AttRecord = {
      student_id: student.id, lrn: student.lrn,
      student_name: `${student.last_name}, ${student.first_name}`,
      section: period.section, strand: student.strand || "",
      subject: period.subject, date: scannerAttendanceDate, time: nowTime(),
      status: autoStatus, school_year: schoolYear,
      notes: "QR_SCAN",
    }

    setAttendance(prev => ({ ...prev, [student.id]: rec }))
    setLastScan({ name: `${student.first_name} ${student.last_name}`, ok: true })
    if (beepOn) {
      try {
        const a = new Audio("/beep.mp3")
        void a.play().catch(() => {})
      } catch { /* ignore */ }
    }

    if (!isOnline) {
      upsertQueue(rec, "insert"); setPending(getQueue())
      toast.warning(`Offline — ${student.first_name} queued`)
      return
    }

    try {
      const { error } = await supabase.from("attendance").insert(rec)
      if (error) throw error
      toast.success(`✅ ${student.first_name} ${student.last_name} — ${autoStatus}`, {
        description: `${fmtT(rec.time)} · ${period.subject}`, duration: 3000
      })
    } catch {
      upsertQueue(rec, "insert"); setPending(getQueue())
      toast.warning("Saved offline")
    }
  }

  const updateStatus = async (studentId: string, newStatus: AttStatus) => {
    if (!period) return
    if (scannerActionLockRef.current.has(studentId)) return
    scannerActionLockRef.current.add(studentId)
    setTimeout(() => scannerActionLockRef.current.delete(studentId), 400)
    setUpdatingId(studentId)
    const student = students.find(s => s.id === studentId)
    if (!student) { setUpdatingId(null); return }
    const existing = attendance[studentId]
    const rec: AttRecord = existing
      ? { ...existing, status: newStatus, notes: "MANUAL" }
      : {
          student_id: studentId, lrn: student.lrn,
          student_name: `${student.last_name}, ${student.first_name}`,
          section: period.section, strand: student.strand || "",
          subject: period.subject, date: scannerAttendanceDate, time: nowTime(),
          status: newStatus, school_year: schoolYear,
          notes: "MANUAL",
        }
    setAttendance(prev => ({ ...prev, [studentId]: rec }))

    if (!isOnline) {
      upsertQueue(rec, existing ? "update" : "insert"); setPending(getQueue())
      toast.warning("Offline — change queued"); setUpdatingId(null); return
    }
    try {
      const scrollPos = scannerListRef.current?.scrollTop ?? 0
      if (existing) {
        await supabase.from("attendance").update({ status: newStatus })
          .eq("student_id", studentId).eq("date", scannerAttendanceDate).eq("subject", period.subject)
      } else {
        const { data } = await supabase.from("attendance").insert(rec).select().single()
        if (data) setAttendance(prev => ({ ...prev, [studentId]: { ...rec, id: data.id } }))
      }
      toast.success(`${student.first_name} marked ${newStatus}`)
      requestAnimationFrame(() => { if (scannerListRef.current) scannerListRef.current.scrollTop = scrollPos })
    } catch {
      upsertQueue(rec, existing ? "update" : "insert"); setPending(getQueue())
      toast.warning("Saved offline")
    } finally { setUpdatingId(null) }
  }

  const [calOverrideId, setCalOverrideId]   = useState<string | null>(null)
  const [calDaySearch,  setCalDaySearch]    = useState("")
  const [calDaySearchDebounced, setCalDaySearchDebounced] = useState("")
  const calDaySearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setCalDaySearchWithDebounce = (v: string) => {
    setCalDaySearch(v)
    if (calDaySearchDebounceRef.current) clearTimeout(calDaySearchDebounceRef.current)
    calDaySearchDebounceRef.current = setTimeout(() => setCalDaySearchDebounced(v), 180)
  }
  const calActionLockRef = useRef<Set<string>>(new Set())
  const dayDetailRef    = useRef<HTMLDivElement>(null)
  const scannerPanelRef = useRef<HTMLDivElement>(null)
  const pendingScrollRef = useRef<number | null>(null)
  const [collapsedSubjs, setCollapsedSubjs] = useState<Set<string>>(new Set())
  const [collapsedStus,  setCollapsedStus]  = useState<Set<string>>(new Set())
  const [calSortMode,    setCalSortMode]    = useState<"alpha" | "status">("alpha")
  const toggleSubj = (key: string) => setCollapsedSubjs(p => { const s = new Set(p); s.has(key) ? s.delete(key) : s.add(key); return s })
  const toggleStu  = (key: string) => setCollapsedStus(p => { const s = new Set(p); s.has(key) ? s.delete(key) : s.add(key); return s })

  const updateCalendarDayStatus = async (
    student: Student,
    subject: string,
    existingRec: AttRecord | undefined,
    newStatus: AttStatus,
    dateStr: string,
  ) => {
    const key = `${student.id}_${subject}`
    if (calActionLockRef.current.has(key)) return
    calActionLockRef.current.add(key)
    setTimeout(() => calActionLockRef.current.delete(key), 400)
    setCalOverrideId(key)
    try {
      const sched = schedules.find(s => s.subject === subject && s.section === student.section)
      const rec: AttRecord = existingRec
        ? { ...existingRec, status: newStatus }
        : {
            student_id: student.id, lrn: student.lrn,
            student_name: `${student.last_name}, ${student.first_name}`,
            section: student.section, strand: student.strand || "",
            subject, date: dateStr,
            time: sched?.start_time?.slice(0, 8) || "00:00:00",
            status: newStatus, school_year: schoolYear,
            notes: "MANUAL",
          }

      pendingScrollRef.current = dayDetailRef.current?.scrollTop ?? 0
      setDayRecords(prev => {
        const idx = prev.findIndex(r => r.student_id === student.id && r.subject === subject)
        if (idx >= 0) { const updated = [...prev]; updated[idx] = { ...updated[idx], status: newStatus }; return updated }
        return [...prev, rec]
      })

      if (existingRec?.id) {
        const { error } = await supabase.from("attendance").update({ status: newStatus }).eq("id", existingRec.id)
        if (error) throw error
      } else {
        const { error, data: inserted } = await supabase.from("attendance").insert(rec).select().single()
        if (error) throw error
        if (inserted) {
          setDayRecords(prev => prev.map(r =>
            r.student_id === student.id && r.subject === subject && !r.id ? { ...r, id: inserted.id } : r
          ))
        }
      }
      toast.success(`${student.first_name} → ${newStatus}`, { duration: 1800 })
    } catch (e: any) {
      setDayRecords(prev => {
        const idx = prev.findIndex(r => r.student_id === student.id && r.subject === subject)
        if (idx >= 0 && existingRec) { const reverted = [...prev]; reverted[idx] = existingRec; return reverted }
        return prev.filter(r => !(r.student_id === student.id && r.subject === subject))
      })
      toast.error(e.message || "Failed to update")
    } finally { setCalOverrideId(null) }
  }

  const syncQueue = async () => {
    const q = getQueue(); if (!q.length) return
    setSyncing(true); let synced = 0
    for (const p of q) {
      try {
        if (p.action === "insert") {
          const { error } = await supabase.from("attendance").insert(p.record)
          if (!error) { removeFromQueue(p.key); synced++ }
        } else {
          const { error } = await supabase.from("attendance").update({ status: p.record.status })
            .eq("student_id", p.record.student_id).eq("date", p.record.date).eq("subject", p.record.subject)
          if (!error) { removeFromQueue(p.key); synced++ }
        }
      } catch {}
    }
    setPending(getQueue()); setSyncing(false)
    if (synced > 0) { toast.success(`Synced ${synced} offline record${synced > 1 ? "s" : ""}`); if (period) loadAttendance(period) }
  }

  // Stable ref so loadCalMonth never re-creates when students array identity changes
  const studentsRef = useRef(students)
  useEffect(() => { studentsRef.current = students }, [students])

  const loadCalMonth = useCallback(async (section: string, year: number, month: number, silent = false) => {
    if (!section) return
    if (!silent) setCalLoading(true)
    try {
      const from = `${year}-${String(month + 1).padStart(2, "0")}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const to = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`
      const sectionStudents = studentsRef.current.filter(s => s.section === section)
      if (!sectionStudents.length) { setCalDayData({}); if (!silent) setCalLoading(false); return }
      const { data } = await supabase
        .from("attendance").select("date, student_id, status, subject")
        .in("student_id", sectionStudents.map(s => s.id))
        .gte("date", from).lte("date", to)
      const map: Record<string, { present: number; total: number; excused: number; bySubject: Record<string, { present: number; total: number }> }> = {}
      if (data) {
        data.forEach((r: any) => {
          if (!map[r.date]) map[r.date] = { present: 0, total: 0, excused: 0, bySubject: {} }
          map[r.date].total++
          if (r.status === "Present" || r.status === "Late") map[r.date].present++
          if (r.status === "Excused") map[r.date].excused++
          if (r.subject) {
            if (!map[r.date].bySubject[r.subject]) map[r.date].bySubject[r.subject] = { present: 0, total: 0 }
            map[r.date].bySubject[r.subject].total++
            if (r.status === "Present" || r.status === "Late") map[r.date].bySubject[r.subject].present++
          }
        })
      }
      setCalDayData(map)
    } finally { if (!silent) setCalLoading(false) }
  }, []) // ← no deps: uses studentsRef so identity never changes

  useEffect(() => { if (calSection) loadCalMonth(calSection, calYear, calMonth) }, [calSection, calYear, calMonth, loadCalMonth])

  useEffect(() => {
    if (!calSection) return
    const ch = supabase
      .channel(`cal_att_rt_${calSection}_${calYear}_${calMonth}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" },
        () => loadCalMonth(calSection, calYear, calMonth, true)) // silent = no spinner
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [calSection, calYear, calMonth, loadCalMonth])

  useEffect(() => {
    if (!calSection) {
      const sections = [...new Set(schedules.map(s => s.section))].filter(Boolean)
      if (sections.length) setCalSection(sections[0])
    }
  }, [schedules, calSection])

  const refreshDayRecordsSilent = useCallback(async (dateStr: string) => {
    const sectionStudents = students.filter(s => s.section === calSection)
    if (!sectionStudents.length) return
    const scrollPos = dayDetailRef.current?.scrollTop ?? 0
    const [{ data: attData }, { data: excData }] = await Promise.all([
      supabase.from("attendance").select("*")
        .in("student_id", sectionStudents.map(s => s.id))
        .eq("date", dateStr).order("subject").order("time"),
      supabase.from("attendance_excuses").select("student_id, subject, reason")
        .in("student_id", sectionStudents.map(s => s.id))
        .eq("attendance_date", dateStr),
    ])
    if (attData) setDayRecords(attData)
    if (excData) setCalDayExcuses(excData)
    Promise.resolve().then(() => { if (dayDetailRef.current) dayDetailRef.current.scrollTop = scrollPos })
    requestAnimationFrame(() => { if (dayDetailRef.current && dayDetailRef.current.scrollTop !== scrollPos) dayDetailRef.current.scrollTop = scrollPos })
  }, [students, calSection])

  const loadDay = useCallback(async (dateStr: string) => {
    setSelectedDay(dateStr)
    const sectionStudents = students.filter(s => s.section === calSection)
    setDayLoading(true)
    try {
      const { data } = await supabase
        .from("attendance").select("*")
        .in("student_id", sectionStudents.map(s => s.id))
        .eq("date", dateStr).order("subject").order("time")
      setDayRecords(data || [])
    } finally { setDayLoading(false) }
  }, [students, calSection])

  useEffect(() => {
    if (!selectedDay || !calSection) return
    const ch = supabase
      .channel(`att_calendar_day_${calSection}_${selectedDay}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" },
        () => { if (!calOverrideId) refreshDayRecordsSilent(selectedDay) })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [selectedDay, calSection, refreshDayRecordsSilent])

  useLayoutEffect(() => {
    if (pendingScrollRef.current !== null && dayDetailRef.current) {
      dayDetailRef.current.scrollTop = pendingScrollRef.current
      pendingScrollRef.current = null
    }
  })

  const sectionStudents = period ? students.filter(s => s.section === period.section) : []
  const filtered = sectionStudents.filter(s => {
    if (searchDebounced) {
      const q = searchDebounced.toLowerCase()
      if (!s.first_name.toLowerCase().includes(q) && !s.last_name.toLowerCase().includes(q) && !s.lrn.includes(q)) return false
    }
    if (statusFilter === "Not Scanned") return !attendance[s.id]
    if (statusFilter !== "ALL") return attendance[s.id]?.status === statusFilter
    return true
  })
  const presentCount  = Object.values(attendance).filter(r => r.status === "Present").length
  const lateCount     = Object.values(attendance).filter(r => r.status === "Late").length
  const absentCount   = Object.values(attendance).filter(r => r.status === "Absent").length
  const excusedCount  = Object.values(attendance).filter(r => r.status === "Excused").length
  const notYetCount   = sectionStudents.length - Object.keys(attendance).length

  useEffect(() => {
    if (!selectedDay || !calSection) { setCalDayExcuses([]); return }
    const stuIds = students.filter(s => s.section === calSection).map(s => s.id)
    if (!stuIds.length) return
    supabase.from("attendance_excuses").select("student_id, subject, reason")
      .in("student_id", stuIds).eq("attendance_date", selectedDay)
      .then(({ data }) => setCalDayExcuses(data || []))
  }, [selectedDay, calSection, students])

  const isPossiblyLate = period && isScannerLive ? (() => {
    const now = new Date()
    const [sh, sm] = period.start_time.slice(0, 5).split(":").map(Number)
    return (now.getHours() * 60 + now.getMinutes()) - (sh * 60 + sm) >= 15
  })() : false

  const daysInMonth    = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay()
  const calSections    = [...new Set(schedules.map(s => s.section))].filter(Boolean)
  const calDayStudents = selectedDay ? students.filter(s => s.section === calSection) : []

  const scheduleByDay = useMemo(() => {
    const map: Record<string, string[]> = {}
    schedules.filter(s => s.section === calSection).forEach(s => {
      if (!map[s.day]) map[s.day] = []
      if (!map[s.day].includes(s.subject)) map[s.day].push(s.subject)
    })
    return map
  }, [schedules, calSection])

  const isCurrentCalMonth = calYear === new Date().getFullYear() && calMonth === new Date().getMonth()

  const getCalendarEventsForDate = useCallback((dateStr: string) => {
    return calendarEvents.filter(e => {
      if (e.end_date) return dateStr >= e.event_date && dateStr <= e.end_date
      return e.event_date === dateStr
    })
  }, [calendarEvents])

  const isHolidayOrSuspension = useCallback((dateStr: string) => {
    return getCalendarEventsForDate(dateStr).some(e => e.event_type === "holiday" || e.event_type === "suspension")
  }, [getCalendarEventsForDate])

  // ── Memoized calendar day detail computations to prevent lag on every render ──
  const calDayMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, AttRecord>> = {}
    const sectionStu = students.filter(s => s.section === calSection)
    sectionStu.forEach(s => { matrix[s.id] = {} })
    dayRecords.forEach(r => {
      if (!matrix[r.student_id]) matrix[r.student_id] = {}
      matrix[r.student_id][r.subject] = r
    })
    return matrix
  }, [dayRecords, students, calSection])

  const calDaySubjects = useMemo(() => {
    if (!selectedDay) return []
    const dow = new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })
    const scheduled = [...new Set(schedules.filter(s => s.section === calSection && s.day === dow).map(s => s.subject))].sort()
    const recorded  = [...new Set(dayRecords.map(r => r.subject))].sort()
    return [...scheduled, ...recorded.filter(s => !scheduled.includes(s))]
  }, [selectedDay, schedules, calSection, dayRecords])

  const calDaySectionStudents = useMemo(() => {
    const raw = students.filter(s => {
      if (s.section !== calSection) return false
      if (!calDaySearchDebounced.trim()) return true
      const q = calDaySearchDebounced.toLowerCase()
      return s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q) || s.lrn.includes(q)
    })
    return [...raw].sort((a, b) => {
      if (calSortMode === "alpha") return a.last_name.localeCompare(b.last_name)
      const timeA = Object.values(calDayMatrix[a.id] || {}).map(r => r.time).sort()[0] || "99:99"
      const timeB = Object.values(calDayMatrix[b.id] || {}).map(r => r.time).sort()[0] || "99:99"
      return timeA.localeCompare(timeB)
    })
  }, [students, calSection, calDaySearchDebounced, calSortMode, calDayMatrix])

  const calDaySummary = useMemo(() => {
    const sectionStu = students.filter(s => s.section === calSection)
    let p = 0, l = 0, e2 = 0, a = 0, ns = 0
    sectionStu.forEach(s => {
      calDaySubjects.forEach(subj => {
        const r = calDayMatrix[s.id]?.[subj]
        if (!r) ns++
        else if (r.status === "Present") p++
        else if (r.status === "Late") l++
        else if (r.status === "Excused") e2++
        else a++
      })
    })
    return { p, l, e2, a, ns }
  }, [calDayMatrix, calDaySubjects, students, calSection])

  return (
    <div className="space-y-4 animate-in fade-in duration-300">

      {(!isOnline || pending.length > 0) && (
        <div className={`rounded-2xl border px-4 py-3 flex items-center justify-between gap-3
          ${!isOnline ? (dm ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200")
                      : (dm ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200")}`}>
          <div className="flex items-center gap-2">
            {!isOnline ? <WifiOff size={14} className="text-amber-500" /> : <Wifi size={14} className="text-blue-500" />}
            <div>
              <p className={`text-[10px] font-black uppercase tracking-wider ${!isOnline ? "text-amber-500" : "text-blue-500"}`}>
                {!isOnline ? "Offline Mode" : "Back Online"}
              </p>
              {pending.length > 0 && <p className={`text-[9px] ${sub}`}>{pending.length} record(s) pending sync</p>}
            </div>
          </div>
          {isOnline && pending.length > 0 && (
            <button onClick={syncQueue} disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider disabled:opacity-60">
              {syncing ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />} Sync
            </button>
          )}
        </div>
      )}

      {/* Re-attach stream to video element when switching back to scanner tab */}
      {/* (video is always mounted via CSS hide so stream survives tab switches)  */}

      <div className={`flex gap-1.5 p-1.5 rounded-2xl border w-fit ${dm ? "bg-slate-800/30 border-slate-700/50" : "bg-slate-100 border-slate-200"}`}>
        <button type="button" className={tabBtn(tab === "scanner")} onClick={goToScannerTab}>
          <QrCode size={10} className="inline mr-1" />Scanner
        </button>
        <button className={tabBtn(tab === "calendar")} onClick={() => setTabPersist("calendar")}>
          <CalendarDays size={10} className="inline mr-1" />Calendar
        </button>
      </div>

      <div style={{ display: tab === "scanner" ? "contents" : "none" }}>
          {!isScannerLive && (
            <div className={`rounded-2xl border px-4 py-3 flex flex-wrap items-center gap-2 ${dm ? "bg-red-500/10 border-red-500/25" : "bg-red-50 border-red-200"}`}>
              <p className={`text-[10px] font-bold ${dm ? "text-slate-300" : "text-slate-700"}`}>
                Recording attendance for a selected calendar date (not live today). Same scanner and roster as that day&apos;s schedule.
              </p>
              <span className="text-[10px] font-black tracking-wide text-red-600 dark:text-red-400">
                ({scannerDateBanner})
              </span>
            </div>
          )}

          <div className={`rounded-2xl md:rounded-3xl border p-5 ${card}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${sub}`}>
                  {isScannerLive ? "Today's Periods" : "Periods for this day"}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <p className={`text-xs font-bold ${head}`}>
                    {scannerDayName}
                    {!isScannerLive && (
                      <span className="ml-2 text-[10px] font-black text-red-600 dark:text-red-400">({scannerDateBanner})</span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar shrink-0">
                <div className="relative group">
                  <input
                    type="date"
                    value={scannerAttendanceDate}
                    onChange={e => {
                      if (e.target.value) setScannerAttendanceDate(e.target.value)
                    }}
                    className={`appearance-none rounded-xl border px-3 pr-8 py-1.5 text-[10px] font-black uppercase tracking-wider outline-none transition-all cursor-pointer shadow-sm
                      focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 group-hover:border-blue-500/50
                      ${dm ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-700"}`}
                  />
                  <div className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors 
                    ${dm ? "text-slate-500 group-hover:text-blue-400" : "text-slate-400 group-hover:text-blue-500"}`}>
                    <CalendarDays size={12} />
                  </div>
                </div>
                {period && (
                  <button onClick={() => setShowLiveMonitoring(true)}
                    className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-sm shrink-0
                      ${dm ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                    <Eye size={12} /> Live Monitor
                  </button>
                )}
                {isPossiblyLate && period && (
                  <div className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[9px] font-black uppercase shrink-0
                    ${dm ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-600"}`}>
                    <AlertTriangle size={10} /> Grace period ended
                  </div>
                )}
              </div>
            </div>

            {scannerSchedules.length === 0 ? (
              <div className="py-8 text-center">
                <BookOpen size={28} className={`mx-auto mb-2 ${dm ? "text-slate-700" : "text-slate-300"}`} />
                <p className={`text-xs ${sub}`}>No classes on {scannerDayName}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {scannerSchedules.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(p => {
                  const active = period?.id === p.id
                  const cnt = students.filter(s => s.section === p.section).length
                  const scanned = active ? Object.keys(attendance).length : 0
                  return (
                    <button key={p.id} onClick={() => setPeriod(active ? null : p)}
                      className={`text-left p-3.5 rounded-2xl border transition-all
                        ${active ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                          : dm ? "bg-slate-800/40 border-slate-700/40 hover:bg-slate-700/40" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}`}>
                      <p className={`text-[10px] font-black uppercase truncate ${active ? "text-white" : head}`}>{p.subject}</p>
                      <p className={`text-[9px] mt-0.5 ${active ? "text-blue-200" : sub}`}>{fmt(p.start_time)} – {fmt(p.end_time)} · {p.section}</p>
                      {active && <p className="text-[9px] text-blue-200 mt-0.5">{scanned}/{cnt} scanned</p>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {period && (
            <div className={`rounded-2xl md:rounded-3xl border overflow-hidden ${card}`}>
              <div className={`px-5 py-4 border-b ${divB} flex items-center justify-between`}>
                <div>
                  <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${sub}`}>QR Scanner</p>
                  <div className="mt-1">
                    <Select value={period.id} onValueChange={val => {
                      const next = scannerSchedules.find(s => s.id === val)
                      if (next) setPeriod(next)
                    }}>
                      <SelectTrigger className={`border-none ring-0 focus:ring-0 shadow-none bg-transparent h-fit py-1 px-0 -ml-1 gap-1 text-[13px] font-black outline-none cursor-pointer transition-opacity text-left w-auto max-w-full [&>span]:line-clamp-none
                        ${head} hover:opacity-80`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={`z-[150] ${dm ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
                        {scannerSchedules.map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-xs font-bold cursor-pointer transition-colors max-w-[300px] sm:max-w-none">
                            {p.subject} ({p.section})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className={`text-[10px] mt-0.5 ${sub}`}>{period.section} · {fmt(period.start_time)}</p>
                  {!isScannerLive && (
                    <p className="text-[10px] font-black text-red-600 dark:text-red-400 mt-1">Selected date · ({scannerDateBanner})</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={scanning ? stopCam : () => startCam(scannerClosed)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all
                      ${scanning
                        ? "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20"
                        : scannerClosed
                          ? "bg-amber-500 text-white hover:bg-amber-600 shadow-md"
                          : "bg-blue-600 text-white hover:bg-blue-700 shadow-md"}`}>
                  {scanning
                    ? <><CameraOff size={11} /> Stop</>
                    : scannerClosed
                      ? <><Camera size={11} /> Force Open</>
                      : <><Camera size={11} /> {jsQRReady ? "Start Scanner" : "Loading..."}</>
                  }
                </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {camErr && (
                  <div className={`rounded-xl border p-3 flex items-center gap-2 ${dm ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200"}`}>
                    <CameraOff size={14} className="text-red-500" />
                    <p className="text-[10px] text-red-500 font-bold">{camErr}</p>
                  </div>
                )}

                {scannerClosed && !scanning && (
                  <div className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${dm ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200"}`}>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-amber-500 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-amber-500">Scanner Auto-Closed</p>
                        <p className={`text-[9px] ${dm ? "text-amber-400/70" : "text-amber-700/70"}`}>
                          {period ? `${period.subject} ended at ${fmtT(period.end_time)}` : "Period ended"}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => startCam(true)}
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-[8px] font-black uppercase tracking-wide hover:bg-amber-600 transition-colors">
                      <Camera size={10} /> Force Open
                    </button>
                  </div>
                )}

                <div className={`relative rounded-2xl overflow-hidden aspect-video flex items-center justify-center ${dm ? "bg-slate-800" : "bg-slate-100"}`}>
                  <video ref={videoRef} className={`w-full h-full object-cover ${scanning ? "opacity-100" : "opacity-0 absolute"}`} muted playsInline
                    style={isFrontCamera ? { transform: "scaleX(-1)" } : undefined} />
                  <canvas ref={canvasRef} className="hidden" />

                  {!scanning && (
                    <div className="flex flex-col items-center gap-3 py-8">
                      <div className={`p-5 rounded-2xl border ${dm ? "bg-slate-700/40 border-slate-600/40" : "bg-white border-slate-200"}`}>
                        <ScanLine size={36} className={dm ? "text-slate-500" : "text-slate-400"} />
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>Camera off</p>
                    </div>
                  )}

                  {scanning && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="relative w-72 h-72">
                        {["top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-xl",
                          "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-xl",
                          "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-xl",
                          "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-xl",
                        ].map((c, i) => <div key={i} className={`absolute w-10 h-10 border-blue-400 ${c}`} />)}
                        <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-400/90"
                          style={{ animation: "scanLine 2s ease-in-out infinite", boxShadow: "0 0 10px 3px rgba(96,165,250,0.7)" }} />
                      </div>
                    </div>
                  )}

                  {lastScan && (
                    <div className={`absolute bottom-3 left-3 right-3 rounded-xl px-3 py-2.5 flex items-center gap-2
                      ${lastScan.ok ? "bg-green-600/90" : "bg-amber-600/90"} backdrop-blur-sm`}>
                      {lastScan.ok ? <CheckCircle2 size={14} className="text-white shrink-0" /> : <AlertTriangle size={14} className="text-white shrink-0" />}
                      <div>
                        <p className="text-[10px] font-black text-white">{lastScan.name}</p>
                        <p className="text-[8px] text-white/70">{lastScan.ok ? "Marked Present" : "Not registered / already scanned"}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`flex items-center justify-between gap-3 px-1 ${dm ? "text-slate-200" : "text-slate-800"}`}>
                  <span className="text-[11px] font-bold">Beep</span>
                  <Switch
                    checked={beepOn}
                    onCheckedChange={setBeepPersist}
                    className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-400"
                  />
                </div>

                {sectionStudents.length > 0 && (
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { label: "Present",  val: presentCount, color: "text-green-500",  bg: dm ? "bg-green-500/10 border-green-500/20" : "bg-green-50 border-green-200" },
                      { label: "Late",     val: lateCount,    color: "text-amber-500",  bg: dm ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200" },
                      { label: "Excused",  val: excusedCount, color: "text-blue-500",   bg: dm ? "bg-blue-500/10 border-blue-500/20"   : "bg-blue-50 border-blue-200"   },
                      { label: "Absent",   val: absentCount,  color: "text-red-500",    bg: dm ? "bg-red-500/10 border-red-500/20"     : "bg-red-50 border-red-200"     },
                      { label: "Pending",  val: notYetCount,  color: sub,               bg: card2 },
                    ].map(s => (
                      <div key={s.label} className={`rounded-xl border p-2.5 text-center ${s.bg}`}>
                        <p className={`text-lg font-black ${s.color}`}>{s.val}</p>
                        <p className={`text-[8px] font-bold uppercase tracking-wider ${s.color === sub ? sub : s.color}`}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {isPossiblyLate && (
                  <div className={`rounded-xl border px-3 py-2 flex items-start gap-2 ${dm ? "bg-amber-500/8 border-amber-500/20" : "bg-amber-50 border-amber-200"}`}>
                    <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className={`text-[9px] font-bold ${dm ? "text-amber-400" : "text-amber-700"}`}>
                      Grace period ended. New scans are marked <strong>Present</strong> — override to <strong>Late</strong> below if needed.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {period && (
            <div className={`rounded-2xl md:rounded-3xl border overflow-hidden ${card}`}>
              <div className={`px-5 py-4 border-b ${divB}`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${sub}`}>Attendance List</p>
                    <p className={`text-xs font-black mt-0.5 ${head}`}>{period.section} · {sectionStudents.length} students</p>
                    {!isScannerLive && (
                      <p className="text-[10px] font-black text-red-600 dark:text-red-400 mt-0.5">({scannerDateBanner})</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {attLoading && <Loader2 size={14} className="animate-spin text-blue-400" />}
                    <button
                      onClick={async () => {
                        const unscanned = sectionStudents.filter(s => !attendance[s.id])
                        if (!unscanned.length) { toast.info("All students already recorded"); return }
                        const now = nowTime()
                        const recs = unscanned.map(s => ({
                          student_id: s.id, lrn: s.lrn,
                          student_name: `${s.last_name}, ${s.first_name}`,
                          section: period.section, strand: s.strand || "",
                          subject: period.subject, date: scannerAttendanceDate, time: now,
                          status: "Present" as AttStatus, school_year: schoolYear,
                          notes: "MANUAL",
                        }))
                        const newMap = { ...attendance }
                        recs.forEach(r => { newMap[r.student_id] = r })
                        setAttendance(newMap)
                        const { error } = await supabase.from("attendance").insert(recs)
                        if (error) { toast.error("Failed: " + error.message); return }
                        toast.success(`${recs.length} student${recs.length !== 1 ? "s" : ""} marked Present`)
                      }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wide border transition-all
                        ${dm ? "bg-green-500/15 border-green-500/20 text-green-400 hover:bg-green-500/25" : "bg-green-50 border-green-200 text-green-600 hover:bg-green-100"}`}>
                      <CheckCircle2 size={10} /> All Present
                    </button>
                  </div>
                </div>
              </div>

              <div className={`px-4 py-3 border-b ${divB}`}>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${dm ? "bg-slate-800/60 border-slate-700/40" : "bg-slate-50 border-slate-200"}`}>
                  <Search size={12} className={sub} />
                  <input value={search} onChange={e => setSearchWithDebounce(e.target.value)} placeholder="Search student..."
                    className={`flex-1 text-[11px] font-bold bg-transparent outline-none ${head}`} />
                  {search && <button onClick={() => { setSearch(""); setSearchDebounced("") }}><X size={12} className={sub} /></button>}
                </div>
              </div>

              <div className={`px-4 py-3 border-b ${divB} space-y-2`}>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {([
                    { val: "ALL",         label: "All"         },
                    { val: "Present",     label: "Present"     },
                    { val: "Late",        label: "Late"        },
                    { val: "Excused",     label: "Excused"     },
                    { val: "Absent",      label: "Absent"      },
                    { val: "Not Scanned", label: "Not Scanned" },
                  ] as { val: typeof statusFilter; label: string }[]).map(f => {
                    const cnt = f.val === "Not Scanned" ? notYetCount
                      : f.val === "Present" ? presentCount
                      : f.val === "Late" ? lateCount
                      : f.val === "Excused" ? excusedCount
                      : f.val === "Absent" ? absentCount : null
                    const activeStyle = f.val === "Present" ? "bg-green-500/20 text-green-500 border border-green-500/30"
                      : f.val === "Late"    ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                      : f.val === "Excused" ? "bg-blue-500/20 text-blue-500 border border-blue-500/30"
                      : f.val === "Absent"  ? "bg-red-500/20 text-red-500 border border-red-500/30"
                      : dm ? "bg-slate-700 text-white border border-slate-600" : "bg-slate-200 text-slate-800 border border-slate-300"
                    return (
                      <button key={f.val} onClick={() => setStatusFilter(f.val)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all whitespace-nowrap shrink-0 flex items-center gap-1
                          ${statusFilter === f.val ? activeStyle : dm ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}>
                        {f.label}
                        {cnt !== null && <span className="tabular-nums opacity-80">{cnt}</span>}
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                  <span className={`text-[8px] font-black uppercase tracking-wider shrink-0 ${sub}`}>Sort:</span>
                  {([
                    { val: "alpha",     label: "A–Z" },
                    { val: "scan_time", label: "Scan Time" },
                    { val: "manual",    label: "Manual" },
                    { val: "late",      label: "Late" },
                    { val: "absent",    label: "Absent" },
                  ] as { val: typeof sortMode; label: string }[]).map(s => (
                    <button key={s.val} onClick={() => setSortMode(s.val)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all whitespace-nowrap shrink-0
                        ${sortMode === s.val ? (dm ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-800") : (dm ? "text-slate-600 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")}`}>
                      {s.label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  {/* ── Auto-Late selector ── */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[8px] font-black uppercase tracking-wide ${sub}`}>Auto-Late after:</span>
                    <Select
                      value={String(graceMins)}
                      onValueChange={v => {
                        const val = Number(v)
                        setGraceMins(val)
                        graceMinsRef.current = val // ── FIX: update ref immediately on change ──
                      }}
                    >
                      <SelectTrigger className={`h-6 w-20 rounded-xl border px-2 text-[9px] font-black uppercase shadow-sm outline-none ring-0 focus:ring-2 focus:ring-blue-500/50
                        ${dm ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={`z-[150] ${dm ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
                        {[0,10,20,30,40,50].map(m => (
                          <SelectItem key={m} value={String(m)} className="text-[9px] font-black uppercase cursor-pointer">
                            {m === 0 ? "Off" : `${m} min`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div
                ref={scannerListRef}
                className={`divide-y overflow-y-auto thin-scroll ${dm ? "divide-slate-700/30" : "divide-slate-100"}`}
                style={{ maxHeight: "min(480px, 60svh)", overflowAnchor: "none" }}
                onWheel={e => {
                  const el = scannerListRef.current
                  if (!el) return
                  const atTop    = el.scrollTop === 0
                  const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1
                  if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) return
                  e.stopPropagation()
                }}
              >
                {(() => {
                  const sorted = [...filtered].sort((a, b) => {
                    if (sortMode === "alpha") return a.last_name.localeCompare(b.last_name)
                    if (sortMode === "scan_time") {
                      const ta = attendance[a.id]?.time || "99:99"
                      const tb = attendance[b.id]?.time || "99:99"
                      return ta.localeCompare(tb)
                    }
                    if (sortMode === "manual") {
                      const isManualA = attendance[a.id] && attendance[a.id].time === "00:00:00" ? 0 : 1
                      const isManualB = attendance[b.id] && attendance[b.id].time === "00:00:00" ? 0 : 1
                      return isManualA - isManualB
                    }
                    if (sortMode === "late") {
                      const isLateA = attendance[a.id]?.status === "Late" ? 0 : 1
                      const isLateB = attendance[b.id]?.status === "Late" ? 0 : 1
                      return isLateA - isLateB
                    }
                    if (sortMode === "absent") {
                      const isAbsentA = (!attendance[a.id] || attendance[a.id].status === "Absent") ? 0 : 1
                      const isAbsentB = (!attendance[b.id] || attendance[b.id].status === "Absent") ? 0 : 1
                      return isAbsentA - isAbsentB
                    }
                    return 0
                  })
                  return sorted
                })().map(student => {
                  const att = attendance[student.id]
                  const isPending = pending.some(p => p.record.student_id === student.id && p.record.subject === period.subject)
                  return (
                    <div key={student.id} className={`flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-3 transition-colors ${dm ? "hover:bg-slate-800/30" : "hover:bg-slate-50"}`}>
                      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden shrink-0 mt-0.5 ${dm ? "bg-slate-700" : "bg-slate-100"}`}>
                        {(student.two_by_two_url || student.profile_picture)
                          ? <img src={student.two_by_two_url || student.profile_picture || ""} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><User size={14} className={sub} /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-[11px] font-black uppercase truncate ${head}`}>{student.last_name}, {student.first_name}</p>
                          {att && <SourceBadge notes={att.notes} time={att.time} size="xs" />}
                          {isPending && <span className="text-[7px] font-black bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded-full shrink-0">Pending</span>}
                        </div>
                        {att ? (
                          <div key={att.status} className="flex items-center gap-1.5 status-pop">
                            {att.status === "Present" && <CheckCircle2 size={11} className="text-green-500 shrink-0" />}
                            {att.status === "Late"    && <Clock size={11} className="text-amber-500 shrink-0" />}
                            {att.status === "Excused" && <ShieldCheck size={11} className="text-blue-500 shrink-0" />}
                            {att.status === "Absent"  && <MinusCircle size={11} className="text-red-500 shrink-0" />}
                            <p className={`text-[9px] font-bold ${att.status === "Present" ? "text-green-500" : att.status === "Late" ? "text-amber-500" : att.status === "Excused" ? "text-blue-500" : "text-red-500"}`}>
                              {att.status}{att.time && att.time !== "00:00:00" ? ` · ${fmtT(att.time)}` : ""}
                            </p>
                          </div>
                        ) : (
                          <p className={`text-[9px] font-bold ${sub}`}>Not yet scanned</p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0" style={{ minWidth: 120 }}>
                        {updatingId === student.id
                          ? <div className="flex-1 flex justify-center"><Loader2 size={14} className="animate-spin text-blue-400" /></div>
                          : <>
                              <button onClick={() => setQrViewStudent(student)}
                                className={`p-2 rounded-lg transition-colors touch-manipulation ${dm ? "text-slate-500 hover:text-blue-400 hover:bg-blue-500/10" : "text-slate-300 hover:text-blue-500 hover:bg-blue-50"}`}
                                title="View QR Code"><Eye size={15} /></button>
                              {([
                                { st: "Present" as AttStatus, icon: <CheckCircle2 size={16} />, active: "bg-green-500/20 text-green-500" },
                                { st: "Late"    as AttStatus, icon: <Clock size={16} />,         active: "bg-amber-500/20 text-amber-500" },
                                { st: "Excused" as AttStatus, icon: <ShieldCheck size={16} />,   active: "bg-blue-500/20 text-blue-500"  },
                                { st: "Absent"  as AttStatus, icon: <MinusCircle size={16} />,   active: "bg-red-500/20 text-red-500"    },
                              ]).map(({ st, icon, active }) => (
                                <button key={st} onClick={() => updateStatus(student.id, st)} title={st}
                                  className={`p-2 rounded-lg transition-colors touch-manipulation
                                    ${att?.status === st ? active : dm ? "text-slate-600 active:text-white" : "text-slate-300 active:text-slate-700"}`}>
                                  {icon}
                                </button>
                              ))}
                            </>
                        }
                      </div>
                    </div>
                  )
                })}
                {filtered.length === 0 && (
                  <div className="py-10 text-center">
                    <Users size={28} className={`mx-auto mb-2 ${dm ? "text-slate-700" : "text-slate-300"}`} />
                    <p className={`text-xs ${sub}`}>No students found</p>
                  </div>
                )}
              </div>

              {period && sectionStudents.length > 0 && (
                <div className={`px-4 py-3 border-t ${divB} flex items-center justify-between gap-3`}>
                  <p className={`text-[9px] ${sub}`}>{Object.keys(attendance).length}/{sectionStudents.length} recorded</p>
                  <button
                    onClick={() => sectionStudents.filter(s => !attendance[s.id]).forEach(s => updateStatus(s.id, "Absent"))}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wide flex items-center gap-1 transition-all
                      ${dm ? "bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20" : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"}`}>
                    <MinusCircle size={10} /> Mark Remaining Absent
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      <div style={{ display: tab === "calendar" ? "contents" : "none" }}>
        <div className={`rounded-2xl md:rounded-3xl border overflow-hidden ${card}`}>
          <div className={`px-5 py-4 border-b ${divB} flex flex-wrap items-center gap-3`}>
            <div className="flex-1 min-w-0">
              <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${sub}`}>Attendance Calendar</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {calSections.map(sec => (
                  <button key={sec} onClick={() => { setCalSection(sec); setSelectedDay(null) }}
                    className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all
                      ${calSection === sec ? "bg-blue-600 text-white" : dm ? "bg-slate-700/50 text-slate-400 hover:text-white" : "bg-slate-100 text-slate-500 hover:text-slate-800"}`}>
                    {sec}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => { const d = new Date(calYear, calMonth - 1); setCalMonth(d.getMonth()); setCalYear(d.getFullYear()); setSelectedDay(null) }}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors ${dm ? "border-slate-700 hover:bg-slate-700" : "border-slate-200 hover:bg-slate-100"}`}>
                <ChevronLeft size={14} className={sub} />
              </button>
              <span className={`text-[11px] font-black min-w-[90px] text-center ${head}`}>
                {monthName(calMonth)} {calYear}
              </span>
              <button onClick={() => { const d = new Date(calYear, calMonth + 1); setCalMonth(d.getMonth()); setCalYear(d.getFullYear()); setSelectedDay(null) }}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors ${dm ? "border-slate-700 hover:bg-slate-700" : "border-slate-200 hover:bg-slate-100"}`}>
                <ChevronRight size={14} className={sub} />
              </button>
            </div>
          </div>

          <div className="p-4">
            {calLoading && (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader2 size={18} className="animate-spin text-blue-400" />
                <span className={`text-xs ${sub}`}>Loading…</span>
              </div>
            )}

            {!calLoading && !calSection && (
              <p className={`text-center py-8 text-xs ${sub}`}>Select a section above</p>
            )}

            {!calLoading && calSection && (
              <>
                <div className="grid grid-cols-7 mb-1">
                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                    <div key={d} className={`text-center text-[11px] font-black uppercase tracking-widest py-1 ${sub}`}>{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-0.5 sm:gap-1 overflow-visible">
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1
                    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                    const data = calDayData[dateStr]
                    const isToday    = dateStr === todayStr()
                    const isFuture   = dateStr > todayStr()
                    const isSelected = dateStr === selectedDay

                    const dayOfWeek = new Date(calYear, calMonth, day).toLocaleDateString("en-US", { weekday: "long" })
                    const dayClasses = scheduleByDay[dayOfWeek] ?? []

                    // Section size for expected headcount
                    const sectionSize = students.filter(s => s.section === calSection).length

                    // Per-subject: denominator is always sectionSize (unscanned = absent)
                    const bySubjectAdjusted: Record<string, { present: number; total: number }> = {}
                    dayClasses.forEach(subj => {
                      const raw = data?.bySubject?.[subj]
                      bySubjectAdjusted[subj] = {
                        present: raw?.present ?? 0,
                        total: sectionSize,
                      }
                    })
                    // Include any extra subjects that were recorded but not in schedule
                    Object.entries(data?.bySubject ?? {}).forEach(([subj, sd]) => {
                      if (!bySubjectAdjusted[subj]) {
                        bySubjectAdjusted[subj] = { present: sd.present, total: Math.max(sd.total, sectionSize) }
                      }
                    })

                    // Overall pct = average across per-subject percentages
                    // This prevents cross-subject double-counting (a student present in 2
                    // subjects was previously counted twice in the numerator).
                    const subjValues = Object.values(bySubjectAdjusted)
                    const pct = subjValues.length > 0
                      ? subjValues.reduce((sum, s) => sum + (s.total > 0 ? s.present / s.total : 0), 0) / subjValues.length
                      : 0

                    const hasData = !!data

                    const dayCalEvents  = getCalendarEventsForDate(dateStr)
                    const isHoliday     = dayCalEvents.some(e => e.event_type === "holiday")
                    const isSuspended   = dayCalEvents.some(e => e.event_type === "suspension")
                    const isSpecial     = isHoliday || isSuspended
                    const calEventLabel = isHoliday ? "HOLIDAY" : isSuspended ? "SUSPENDED" : null
                    const firstEventTitle = dayCalEvents[0]?.title

                    const isOpenable = !isFuture && !isSpecial && dayClasses.length > 0
                    const showClassChips = !hasData && isOpenable && !isSpecial
                    const canClickDay = !isSpecial && (isOpenable || hasData || dateStr === selectedDay)

                    const cellClass = isSpecial
                      ? (dm
                          ? `${isHoliday ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"} cursor-default`
                          : `${isHoliday ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"} cursor-default`)
                      : hasData
                        ? pct >= 0.8
                          ? (dm ? "bg-green-500/20 hover:bg-green-500/30 text-green-400 cursor-pointer" : "bg-green-100 hover:bg-green-200 text-green-700 cursor-pointer")
                          : pct >= 0.5
                            ? (dm ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 cursor-pointer" : "bg-amber-100 hover:bg-amber-200 text-amber-700 cursor-pointer")
                            : (dm ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 cursor-pointer" : "bg-red-100 hover:bg-red-200 text-red-700 cursor-pointer")
                        : isOpenable
                          ? (dm ? "bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 cursor-pointer" : "bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer")
                          : (dm ? "text-slate-700 cursor-default" : "text-slate-300 cursor-default")

                    // Sorted subject entries for dots + tooltip
                    const subjEntries = Object.entries(bySubjectAdjusted).sort(([a], [b]) => a.localeCompare(b))

                    return (
                      <div key={day} className="relative group">
                        <button
                          type="button"
                          onClick={() => {
                            if (!canClickDay) return
                            if (dateStr === selectedDay) {
                              setSelectedDay(null)
                              setDayRecords([])
                              return
                            }
                            loadDay(dateStr)
                          }}
                          disabled={!canClickDay}
                          title={firstEventTitle}
                          className={`relative w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-[9px] font-black overflow-hidden
                            ${isSelected ? "ring-2 ring-blue-500 ring-offset-1 " + (dm ? "ring-offset-slate-900" : "ring-offset-white") : ""}
                            ${isToday ? (dm ? "border-2 border-blue-500/60" : "border-2 border-blue-400") : ""}
                            ${cellClass}`}
                        >
                          <span style={{ fontSize: 15, fontWeight: 900, lineHeight: 1 }}>{day}</span>

                          {isSpecial && (
                            <span className={`text-[5px] font-black leading-tight text-center px-0.5 truncate max-w-full
                              ${isHoliday ? (dm ? "text-red-400" : "text-red-600") : (dm ? "text-orange-400" : "text-orange-600")}`}>
                              {calEventLabel}
                            </span>
                          )}

                          {/* Colored dots — one per subject */}
                          {!isSpecial && hasData && subjEntries.length > 0 && (
                            <div className="flex items-center gap-0.5 flex-wrap justify-center mt-0.5 px-1">
                              {subjEntries.map(([subj, sd]) => {
                                const spct = sd.total > 0 ? sd.present / sd.total : 0
                                const dotColor = spct >= 0.8
                                  ? "bg-green-400"
                                  : spct >= 0.5
                                    ? "bg-amber-400"
                                    : "bg-red-400"
                                return (
                                  <span key={subj} className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                                )
                              })}
                            </div>
                          )}

                          {/* Overall % — tiny, below dots */}
                          {!isSpecial && hasData && (
                            <span className={`text-[7px] font-black tabular-nums leading-none
                              ${pct >= 0.8 ? "text-green-400" : pct >= 0.5 ? "text-amber-400" : "text-red-400"}`}>
                              {Math.round(pct * 100)}%
                            </span>
                          )}

                          {/* No-data chips */}
                          {showClassChips && (
                            <div className="flex items-center gap-0.5 flex-wrap justify-center mt-0.5 px-1">
                              {dayClasses.map(subj => (
                                <span key={subj} className={`w-1.5 h-1.5 rounded-full shrink-0 ${dm ? "bg-slate-600" : "bg-slate-300"}`} />
                              ))}
                            </div>
                          )}
                        </button>

                        {/* Hover tooltip — subject breakdown */}
                        {!isSpecial && hasData && subjEntries.length > 0 && (
                          <div className={`
                            absolute z-50 bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2
                            min-w-[140px] max-w-[200px] w-max
                            rounded-2xl border shadow-xl px-3 py-2.5
                            pointer-events-none select-none
                            opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100
                            transition-all duration-150 origin-bottom
                            ${dm
                              ? "bg-slate-900 border-slate-700/60 shadow-black/60"
                              : "bg-white border-slate-200 shadow-slate-200/80"}
                          `}>
                            {/* Arrow */}
                            <div className={`absolute top-full left-1/2 -translate-x-1/2 w-0 h-0
                              border-l-[5px] border-l-transparent
                              border-r-[5px] border-r-transparent
                              border-t-[5px] ${dm ? "border-t-slate-700/60" : "border-t-slate-200"}`} />

                            <p className={`text-[8px] font-black uppercase tracking-widest mb-1.5 ${dm ? "text-slate-500" : "text-slate-400"}`}>
                              {new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>

                            <div className="flex flex-col gap-1">
                              {subjEntries.map(([subj, sd]) => {
                                const spct = sd.total > 0 ? sd.present / sd.total : 0
                                const dotColor = spct >= 0.8 ? "bg-green-400" : spct >= 0.5 ? "bg-amber-400" : "bg-red-400"
                                const textColor = spct >= 0.8
                                  ? (dm ? "text-green-400" : "text-green-600")
                                  : spct >= 0.5
                                    ? (dm ? "text-amber-400" : "text-amber-600")
                                    : (dm ? "text-red-400" : "text-red-600")
                                return (
                                  <div key={subj} className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                                    <span className={`text-[9px] font-bold flex-1 truncate ${dm ? "text-slate-300" : "text-slate-700"}`}>
                                      {subj}
                                    </span>
                                    <span className={`text-[9px] font-black tabular-nums shrink-0 ${textColor}`}>
                                      {sd.present}/{sd.total}
                                    </span>
                                    <span className={`text-[8px] font-bold tabular-nums shrink-0 ${dm ? "text-slate-500" : "text-slate-400"}`}>
                                      {Math.round(spct * 100)}%
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  {[
                    { color: dm ? "bg-green-500/20" : "bg-green-100",   label: "≥80% present" },
                    { color: dm ? "bg-amber-500/20" : "bg-amber-100",   label: "50–79%" },
                    { color: dm ? "bg-red-500/20"   : "bg-red-100",     label: "<50% / Absent" },
                    { color: dm ? "bg-red-500/20 border border-red-500/40" : "bg-red-100 border border-red-300", label: "Holiday" },
                    { color: dm ? "bg-orange-500/20 border border-orange-500/40" : "bg-orange-100 border border-orange-300", label: "Suspended" },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded ${l.color}`} />
                      <span className={`text-[8px] font-bold ${sub}`}>{l.label}</span>
                    </div>
                  ))}
                  <span className={`text-[8px] ${sub} ml-auto`}>Dots = subjects · hover for breakdown</span>
                </div>
              </>
            )}
          </div>

          {selectedDay && (
            <div
              ref={dayDetailRef}
              className={`border-t ${divB} p-4 space-y-3 overflow-y-auto thin-scroll`}
              style={{ maxHeight: "min(620px, 70svh)", overflowAnchor: "none" }}
              id="cal-day-detail"
              onWheel={e => {
                const el = dayDetailRef.current
                if (!el) return
                const atTop    = el.scrollTop === 0
                const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1
                if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) return
                e.stopPropagation()
              }}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-wider ${head}`}>
                    {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                  {(() => {
                    const { p, l, e2, a, ns } = calDaySummary
                    return (
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {[
                          { label: "Present",     val: p,  cls: "text-green-500 bg-green-500/10" },
                          { label: "Late",        val: l,  cls: "text-amber-500 bg-amber-500/10" },
                          { label: "Excused",     val: e2, cls: "text-blue-500 bg-blue-500/10"  },
                          { label: "Absent",      val: a,  cls: "text-red-500 bg-red-500/10"    },
                          { label: "Not Scanned", val: ns, cls: `${sub} ${dm ? "bg-slate-700/40" : "bg-slate-100"}` },
                        ].map(x => (
                          <span key={x.label} className={`text-[9px] font-black px-2.5 py-1 rounded-full ${x.cls}`}>
                            {x.label}: {x.val}
                          </span>
                        ))}
                      </div>
                    )
                  })()}
                  <p className={`text-[9px] mt-0.5 ${sub}`}>
                    {calSection} · {dayRecords.length} record{dayRecords.length !== 1 ? "s" : ""}
                  </p>
                </div>

              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${dm ? "bg-slate-800/60 border-slate-700/40" : "bg-slate-50 border-slate-200"}`}>
                <Search size={12} className={sub} />
                <input value={calDaySearch} onChange={e => setCalDaySearchWithDebounce(e.target.value)}
                  placeholder="Search student…"
                  className={`flex-1 text-[11px] font-bold bg-transparent outline-none ${head}`} />
                {calDaySearch && <button onClick={() => { setCalDaySearch(""); setCalDaySearchDebounced("") }}><X size={12} className={sub} /></button>}
              </div>

              <div className="flex items-center gap-2 flex-wrap mt-2">
                <div className={`flex gap-1 p-1 rounded-xl border ${dm ? "bg-slate-800/30 border-slate-700/40" : "bg-slate-100 border-slate-200"}`}>
                  <button onClick={() => setCalSortMode("alpha")}
                    className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wide transition-all
                      ${calSortMode === "alpha" ? (dm ? "bg-slate-700 text-white" : "bg-white text-slate-800 shadow-sm") : sub}`}>A–Z</button>
                  <button onClick={() => setCalSortMode("status")}
                    className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wide transition-all
                      ${calSortMode === "status" ? (dm ? "bg-slate-700 text-white" : "bg-white text-slate-800 shadow-sm") : sub}`}>Scan Time</button>
                </div>
                <button
                  onClick={async () => {
                    if (!selectedDay) return
                    const sectionStu = students.filter(s => s.section === calSection)
                    const dayOfWeek2 = new Date((selectedDay!) + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })
                    const subjsOnDay = [...new Set(schedules.filter(s => s.section === calSection && s.day === dayOfWeek2).map(s => s.subject))]
                    const toInsert: AttRecord[] = []
                    sectionStu.forEach(s => {
                      subjsOnDay.forEach(subj => {
                        const existing = dayRecords.find(r => r.student_id === s.id && r.subject === subj)
                        if (!existing) {
                          const sched = schedules.find(sc => sc.subject === subj && sc.section === s.section)
                          toInsert.push({
                            student_id: s.id, lrn: s.lrn,
                            student_name: `${s.last_name}, ${s.first_name}`,
                            section: s.section, strand: s.strand || "",
                            subject: subj, date: selectedDay!,
                            time: sched?.start_time?.slice(0, 8) || "00:00:00",
                            status: "Present" as AttStatus, school_year: schoolYear,
                            notes: "MANUAL",
                          })
                        }
                      })
                    })
                    if (!toInsert.length) { toast.info("All students already recorded"); return }
                    pendingScrollRef.current = dayDetailRef.current?.scrollTop ?? 0
                    setDayRecords(prev => {
                      const updated = [...prev]
                      toInsert.forEach(r => {
                        if (!updated.find(x => x.student_id === r.student_id && x.subject === r.subject)) updated.push(r)
                      })
                      return updated
                    })
                    const { error } = await supabase.from("attendance").insert(toInsert)
                    if (error) {
                      toast.error("Failed: " + error.message)
                      setDayRecords(prev => prev.filter(r => !toInsert.some(x => x.student_id === r.student_id && x.subject === r.subject && !r.id)))
                    } else {
                      toast.success(`${toInsert.length} record${toInsert.length !== 1 ? "s" : ""} marked Present`)
                    }
                  }}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-wide border transition-all touch-manipulation
                    ${dm ? "bg-green-500/15 border-green-500/20 text-green-400 active:bg-green-500/25" : "bg-green-50 border-green-200 text-green-600 active:bg-green-100"}`}>
                  <CheckCircle2 size={10} /> Mark All Present
                </button>
              </div>

              {(() => {
                const evts = getCalendarEventsForDate(selectedDay)
                if (!evts.length) return null
                return (
                  <div className="flex flex-col gap-1 w-full">
                    {evts.map(e => {
                      const isH = e.event_type === "holiday"
                      const isS = e.event_type === "suspension"
                      if (!isH && !isS) return null
                      return (
                        <div key={e.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[9px] font-bold w-full
                          ${isH
                            ? (dm ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-700")
                            : (dm ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : "bg-orange-50 border-orange-200 text-orange-700")}`}>
                          <span className="text-[8px] font-black uppercase tracking-widest">
                            {isH ? "🎌 HOLIDAY" : "⛔ SUSPENDED"}
                          </span>
                          <span className="font-medium">{e.title}</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

                <div className="flex items-center gap-2">
                  <div className={`flex gap-1 p-1 rounded-xl border ${dm ? "bg-slate-800/40 border-slate-700/40" : "bg-slate-100 border-slate-200"}`}>
                    <button onClick={() => setDayView("by-subject")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all
                        ${dayView === "by-subject" ? "bg-blue-600 text-white" : sub}`}>
                      By Subject
                    </button>
                    <button onClick={() => setDayView("by-student")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all
                        ${dayView === "by-student" ? "bg-blue-600 text-white" : sub}`}>
                      By Student
                    </button>
                  </div>
                  <button onClick={() => setSelectedDay(null)} className={sub}><X size={14} /></button>
                </div>
              </div>

              {dayLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 size={14} className="animate-spin text-blue-400" />
                  <span className={`text-xs ${sub}`}>Loading…</span>
                </div>
              ) : (() => {
                // Use memoized values — no recomputation on every render
                const sectionStuForDay = calDaySectionStudents
                const daySubjects      = calDaySubjects
                const matrix           = calDayMatrix

                const statusDot = (r: AttRecord | undefined) => {
                  if (!r) return <span className={`text-[8px] font-black ${sub}`}>—</span>
                  return (
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full
                      ${r.status === "Present" ? "bg-green-500/15 text-green-500"
                      : r.status === "Late"    ? "bg-amber-500/15 text-amber-500"
                      :                          "bg-red-500/15 text-red-500"}`}>
                      {r.status === "Present" ? "P" : r.status === "Late" ? "L" : "A"}
                    </span>
                  )
                }

                if (dayView === "by-subject") {
                  if (daySubjects.length === 0) {
                    return <p className={`text-xs text-center py-6 ${sub}`}>No classes scheduled for this day</p>
                  }
                  return (
                    <div className="space-y-4">
                      {daySubjects.map(subject => {
                        const subSchedule = schedules.find(s => s.subject === subject && s.section === calSection)
                        const presentStudents = sectionStuForDay.filter(s => { const r = matrix[s.id]?.[subject]; return r && r.status === "Present" })
                        const lateStudents    = sectionStuForDay.filter(s => { const r = matrix[s.id]?.[subject]; return r && r.status === "Late" })
                        const absentStudents  = sectionStuForDay.filter(s => { const r = matrix[s.id]?.[subject]; return !r || r.status === "Absent" })
                        const excStudents     = sectionStuForDay.filter(s => { const r = matrix[s.id]?.[subject]; return r && r.status === "Excused" })
                        const absentButPresentElsewhere = absentStudents.filter(s =>
                          daySubjects.some(other => other !== subject && matrix[s.id]?.[other] &&
                            (matrix[s.id][other].status === "Present" || matrix[s.id][other].status === "Late"))
                        )
                        const isSubjCollapsed = collapsedSubjs.has(subject)

                        return (
                          <div key={subject} className={`rounded-2xl border overflow-hidden ${dm ? "border-slate-700/40" : "border-slate-200"}`}>
                            <button onClick={() => toggleSubj(subject)} className={`w-full px-4 py-3 flex items-center justify-between text-left ${dm ? "bg-slate-800/60 hover:bg-slate-800/80" : "bg-slate-50 hover:bg-slate-100"}`}>
                              <div>
                                <p className={`text-[11px] font-black uppercase ${head}`}>{subject}</p>
                                {subSchedule && <p className={`text-[9px] ${sub}`}>{fmt(subSchedule.start_time)} – {fmt(subSchedule.end_time)}</p>}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {presentStudents.length > 0 && <span className="flex items-center gap-1 text-[9px] font-black text-green-500"><CheckCircle2 size={10} /> {presentStudents.length}</span>}
                                {lateStudents.length > 0    && <span className="flex items-center gap-1 text-[9px] font-black text-amber-500"><Clock size={10} /> {lateStudents.length}</span>}
                                {excStudents.length > 0     && <span className="flex items-center gap-1 text-[9px] font-black text-blue-500"><ShieldCheck size={10} /> {excStudents.length}</span>}
                                {absentStudents.length > 0  && <span className="flex items-center gap-1 text-[9px] font-black text-red-500"><MinusCircle size={10} /> {absentStudents.length}</span>}
                                <span className={`text-[9px] font-bold ${sub}`}>{presentStudents.length + lateStudents.length}/{sectionStuForDay.length}</span>
                              </div>
                              <svg className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSubjCollapsed ? "" : "rotate-180"} ${sub}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/></svg>
                            </button>

                            {!isSubjCollapsed && presentStudents.length > 0 && (() => {
                              const catKey = `${subject}_P`
                              const collapsed = collapsedSubjs.has(catKey)
                              return (
                                <div>
                                  <button onClick={() => toggleSubj(catKey)} className={`w-full px-4 py-2 flex items-center justify-between ${dm ? "hover:bg-slate-800/30" : "hover:bg-slate-50"}`}>
                                    <div className="flex items-center gap-1.5">
                                      <CheckCircle2 size={11} className="text-green-500" />
                                      <span className="text-[9px] font-black uppercase tracking-wider text-green-500">Present</span>
                                      <span className={`text-[8px] font-bold ml-1 ${dm ? "text-green-400" : "text-green-700"}`}>{presentStudents.length}</span>
                                    </div>
                                    <svg className={`w-3 h-3 transition-transform ${collapsed ? "" : "rotate-180"} ${sub}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/></svg>
                                  </button>
                                  {!collapsed && (
                                    <div className="px-4 pb-3 flex flex-col gap-1.5">
                                      {presentStudents.map(s => {
                                        const r = matrix[s.id][subject]
                                        const overrideKey = `${s.id}_${subject}`
                                        const isOverriding = calOverrideId === overrideKey
                                        return (
                                          <div key={s.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border ${dm ? "bg-green-500/10 border-green-500/20" : "bg-green-50 border-green-200"}`}>
                                            <div className={`w-6 h-6 rounded-lg overflow-hidden shrink-0 ${dm ? "bg-slate-700" : "bg-slate-200"}`}>
                                              {(s.two_by_two_url || s.profile_picture)
                                                ? <img src={s.two_by_two_url || s.profile_picture || ""} alt="" className="w-full h-full object-cover" />
                                                : <div className="w-full h-full flex items-center justify-center"><User size={9} className={sub} /></div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <span className={`text-[9px] font-black uppercase truncate block ${dm ? "text-green-400" : "text-green-700"}`}>{s.last_name}, {s.first_name.split(" ")[0]}</span>
                                              <SourceBadge notes={r.notes} time={r.time} size="xs" />
                                            </div>
                                            <span className={`text-[8px] ${sub} shrink-0`}>{r.time && r.time !== "00:00:00" ? fmtT(r.time) : ""}</span>
                                            {isOverriding ? <div className="w-[78px] flex justify-center shrink-0"><Loader2 size={12} className="animate-spin text-blue-400" /></div> : (
                                              <div className="flex items-center gap-0.5 shrink-0">
                                                <button onClick={() => setQrViewStudent(s)} title="Show QR"
                                                  className={`p-1 rounded-lg transition-colors ${dm ? "text-slate-500 hover:text-blue-400 hover:bg-blue-500/10" : "text-slate-300 hover:text-blue-500 hover:bg-blue-50"}`}>
                                                  <QrCode size={13} />
                                                </button>
                                                {(["Present","Late","Absent"] as AttStatus[]).map(st => (
                                                  <button key={st} onClick={() => updateCalendarDayStatus(s, subject, r, st, selectedDay!)}
                                                    disabled={r.status === st} title={st}
                                                    className={`p-1 rounded-lg transition-colors ${r.status === st
                                                      ? st === "Present" ? "bg-green-500/20 text-green-500 cursor-default"
                                                        : st === "Late" ? "bg-amber-500/20 text-amber-500 cursor-default"
                                                        : "bg-red-500/20 text-red-500 cursor-default"
                                                      : dm ? "text-slate-600 hover:text-white hover:bg-slate-700" : "text-slate-300 hover:text-slate-700 hover:bg-slate-100"}`}>
                                                    {st === "Present" ? <CheckCircle2 size={13} /> : st === "Late" ? <Clock size={13} /> : <MinusCircle size={13} />}
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            })()}

                            {!isSubjCollapsed && lateStudents.length > 0 && (() => {
                              const catKey = `${subject}_L`
                              const collapsed = collapsedSubjs.has(catKey)
                              return (
                                <div>
                                  <button onClick={() => toggleSubj(catKey)} className={`w-full px-4 py-2 flex items-center justify-between ${dm ? "hover:bg-slate-800/30" : "hover:bg-slate-50"}`}>
                                    <div className="flex items-center gap-1.5">
                                      <Clock size={11} className="text-amber-500" />
                                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-500">Late</span>
                                      <span className={`text-[8px] font-bold ml-1 ${dm ? "text-amber-400" : "text-amber-700"}`}>{lateStudents.length}</span>
                                    </div>
                                    <svg className={`w-3 h-3 transition-transform ${collapsed ? "" : "rotate-180"} ${sub}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/></svg>
                                  </button>
                                  {!collapsed && (
                                    <div className="px-4 pb-3 flex flex-col gap-1.5">
                                      {lateStudents.map(s => {
                                        const r = matrix[s.id][subject]
                                        const overrideKey = `${s.id}_${subject}`
                                        const isOverriding = calOverrideId === overrideKey
                                        return (
                                          <div key={s.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border ${dm ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200"}`}>
                                            <div className={`w-6 h-6 rounded-lg overflow-hidden shrink-0 ${dm ? "bg-slate-700" : "bg-slate-200"}`}>
                                              {(s.two_by_two_url || s.profile_picture)
                                                ? <img src={s.two_by_two_url || s.profile_picture || ""} alt="" className="w-full h-full object-cover" />
                                                : <div className="w-full h-full flex items-center justify-center"><User size={9} className={sub} /></div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <span className={`text-[9px] font-black uppercase truncate block ${dm ? "text-amber-400" : "text-amber-700"}`}>{s.last_name}, {s.first_name.split(" ")[0]}</span>
                                              <SourceBadge notes={r.notes} time={r.time} size="xs" />
                                            </div>
                                            <span className={`text-[8px] ${sub} shrink-0`}>{r.time && r.time !== "00:00:00" ? fmtT(r.time) : ""}</span>
                                            {isOverriding ? <div className="w-[78px] flex justify-center shrink-0"><Loader2 size={12} className="animate-spin text-blue-400" /></div> : (
                                              <div className="flex items-center gap-0.5 shrink-0">
                                                <button onClick={() => setQrViewStudent(s)} title="Show QR"
                                                  className={`p-1 rounded-lg transition-colors ${dm ? "text-slate-500 hover:text-blue-400 hover:bg-blue-500/10" : "text-slate-300 hover:text-blue-500 hover:bg-blue-50"}`}>
                                                  <QrCode size={13} />
                                                </button>
                                                {(["Present","Late","Absent"] as AttStatus[]).map(st => (
                                                  <button key={st} onClick={() => updateCalendarDayStatus(s, subject, r, st, selectedDay!)}
                                                    disabled={r.status === st} title={st}
                                                    className={`p-1 rounded-lg transition-colors ${r.status === st
                                                      ? st === "Present" ? "bg-green-500/20 text-green-500 cursor-default"
                                                        : st === "Late" ? "bg-amber-500/20 text-amber-500 cursor-default"
                                                        : "bg-red-500/20 text-red-500 cursor-default"
                                                      : dm ? "text-slate-600 hover:text-white hover:bg-slate-700" : "text-slate-300 hover:text-slate-700 hover:bg-slate-100"}`}>
                                                    {st === "Present" ? <CheckCircle2 size={13} /> : st === "Late" ? <Clock size={13} /> : <MinusCircle size={13} />}
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            })()}

                            {!isSubjCollapsed && absentStudents.length > 0 && (() => {
                              const catKey = `${subject}_A`
                              const collapsed = collapsedSubjs.has(catKey)
                              return (
                                <div>
                                  <button onClick={() => toggleSubj(catKey)} className={`w-full px-4 py-2 flex items-center justify-between ${dm ? "hover:bg-slate-800/30" : "hover:bg-slate-50"}`}>
                                    <div className="flex items-center gap-1.5">
                                      <MinusCircle size={11} className="text-red-500" />
                                      <span className="text-[9px] font-black uppercase tracking-wider text-red-500">Absent / No Record</span>
                                      <span className={`text-[8px] font-bold ml-1 ${dm ? "text-red-400" : "text-red-700"}`}>{absentStudents.length}</span>
                                    </div>
                                    <svg className={`w-3 h-3 transition-transform ${collapsed ? "" : "rotate-180"} ${sub}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/></svg>
                                  </button>
                                  {!collapsed && (
                                    <div className="px-4 pb-3 flex flex-col gap-1.5">
                                      {absentStudents.map(s => {
                                        const isElsewhere = absentButPresentElsewhere.some(a => a.id === s.id)
                                        const presentIn = daySubjects.filter(other =>
                                          other !== subject && matrix[s.id]?.[other] &&
                                          (matrix[s.id][other].status === "Present" || matrix[s.id][other].status === "Late")
                                        )
                                        const existingRec = matrix[s.id]?.[subject]
                                        const overrideKey = `${s.id}_${subject}`
                                        const isOverriding = calOverrideId === overrideKey
                                        return (
                                          <div key={s.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border
                                            ${isElsewhere
                                              ? (dm ? "bg-orange-500/10 border-orange-500/30" : "bg-orange-50 border-orange-200")
                                              : (dm ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200")}`}>
                                            <div className={`w-6 h-6 rounded-lg overflow-hidden shrink-0 ${dm ? "bg-slate-700" : "bg-slate-200"}`}>
                                              {(s.two_by_two_url || s.profile_picture)
                                                ? <img src={s.two_by_two_url || s.profile_picture || ""} alt="" className="w-full h-full object-cover" />
                                                : <div className="w-full h-full flex items-center justify-center"><User size={9} className={sub} /></div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className={`text-[9px] font-black uppercase truncate ${isElsewhere ? (dm ? "text-orange-400" : "text-orange-700") : (dm ? "text-red-400" : "text-red-600")}`}>
                                                {s.last_name}, {s.first_name.split(" ")[0]}
                                              </p>
                                              <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                                {existingRec
                                                  ? <SourceBadge notes={existingRec.notes} time={existingRec.time} size="xs" />
                                                  : <span className="text-[7px] font-black px-1.5 py-px rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/20">Not yet scanned</span>
                                                }
                                                {isElsewhere && (
                                                  <span className={`text-[7px] font-bold ${dm ? "text-orange-400/70" : "text-orange-600/70"}`}>✓ Present in {presentIn[0]?.split(" ")[0]}</span>
                                                )}
                                              </div>
                                              {(() => {
                                                const excuse = calDayExcuses.find(e => e.student_id === s.id && (e.subject === null || e.subject === subject))
                                                return excuse ? <p className={`text-[8px] italic ${dm ? "text-blue-400" : "text-blue-600"}`}>Excuse: {excuse.reason}</p> : null
                                              })()}
                                            </div>
                                            {isOverriding ? (
                                              <div className="w-[90px] flex justify-center shrink-0"><Loader2 size={13} className="animate-spin text-blue-400" /></div>
                                            ) : (
                                              <div className="flex items-center gap-0.5 shrink-0">
                                                <button onClick={() => setQrViewStudent(s)} title="Show QR"
                                                  className={`p-1.5 rounded-lg transition-colors ${dm ? "text-slate-500 hover:text-blue-400 hover:bg-blue-500/10" : "text-slate-300 hover:text-blue-500 hover:bg-blue-50"}`}>
                                                  <QrCode size={14} />
                                                </button>
                                                {(["Present","Late","Absent"] as AttStatus[]).map(st => {
                                                  const isCurrent = existingRec?.status === st || (!existingRec && st === "Absent")
                                                  return (
                                                    <button key={st}
                                                      onClick={() => updateCalendarDayStatus(s, subject, existingRec, st, selectedDay!)}
                                                      disabled={isCurrent} title={st}
                                                      className={`p-1.5 rounded-lg transition-colors ${isCurrent
                                                        ? st === "Present" ? "bg-green-500/20 text-green-500 cursor-default"
                                                          : st === "Late" ? "bg-amber-500/20 text-amber-500 cursor-default"
                                                          : "bg-red-500/20 text-red-500 cursor-default"
                                                        : dm ? "text-slate-600 hover:text-white hover:bg-slate-700" : "text-slate-300 hover:text-slate-700 hover:bg-slate-100"}`}>
                                                      {st === "Present" ? <CheckCircle2 size={14} /> : st === "Late" ? <Clock size={14} /> : <MinusCircle size={14} />}
                                                    </button>
                                                  )
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                      {absentButPresentElsewhere.length > 0 && (
                                        <p className={`text-[8px] mt-1 ${dm ? "text-orange-400/70" : "text-orange-600/70"}`}>
                                          <span className="font-black">Orange</span> = absent here but present in another subject
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                        )
                      })}
                    </div>
                  )
                }

                return (
                  <div className="space-y-2">
                    {sectionStuForDay.length === 0 && (
                      <p className={`text-xs text-center py-6 ${sub}`}>No students in this section</p>
                    )}
                    {sectionStuForDay.map(student => {
                      const studentRecs = matrix[student.id] || {}
                      const hasAny = Object.keys(studentRecs).length > 0
                      const presentCount2 = Object.values(studentRecs).filter(r => r.status === "Present" || r.status === "Late").length
                      const totalSubjects = daySubjects.length
                      const presentSubjects = daySubjects.filter(s => studentRecs[s] && (studentRecs[s].status === "Present" || studentRecs[s].status === "Late"))
                      const absentSubjects  = daySubjects.filter(s => !studentRecs[s] || studentRecs[s].status === "Absent")
                      const hasInconsistency = presentSubjects.length > 0 && absentSubjects.length > 0
                      const isStuCollapsed = collapsedStus.has(student.id)
                      return (
                        <div key={student.id} className={`rounded-2xl border overflow-hidden transition-all
                          ${hasInconsistency
                            ? (dm ? "border-orange-500/30" : "border-orange-300")
                            : (dm ? "border-slate-700/40" : "border-slate-200")}`}>
                          <button onClick={() => toggleStu(student.id)} className={`w-full px-4 py-3 flex items-center gap-3 text-left
                            ${hasInconsistency
                              ? (dm ? "bg-orange-500/8 hover:bg-orange-500/12" : "bg-orange-50/60 hover:bg-orange-100/60")
                              : (dm ? "bg-slate-800/40 hover:bg-slate-800/60" : "bg-slate-50 hover:bg-slate-100")}`}>
                            <div className={`w-8 h-8 rounded-xl overflow-hidden shrink-0 ${dm ? "bg-slate-700" : "bg-slate-200"}`}>
                              {(student.two_by_two_url || student.profile_picture)
                                ? <img src={student.two_by_two_url || student.profile_picture || ""} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center"><User size={14} className={sub} /></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[11px] font-black uppercase truncate ${head}`}>{student.last_name}, {student.first_name}</p>
                              <p className={`text-[9px] ${sub}`}>{hasAny ? `${presentCount2}/${totalSubjects} subjects present` : "No attendance record"}</p>
                            </div>
                            {hasInconsistency ? (
                              <span className={`text-[8px] font-black px-2 py-1 rounded-full shrink-0 ${dm ? "bg-orange-500/20 text-orange-400" : "bg-orange-100 text-orange-700"}`}>Inconsistent</span>
                            ) : presentCount2 === totalSubjects && totalSubjects > 0 ? (
                              <span className="text-[8px] font-black px-2 py-1 rounded-full bg-green-500/15 text-green-500 shrink-0">Full Day</span>
                            ) : presentCount2 === 0 ? (
                              <span className="text-[8px] font-black px-2 py-1 rounded-full bg-red-500/15 text-red-500 shrink-0">All Absent</span>
                            ) : null}
                            <svg className={`w-3.5 h-3.5 ml-1 shrink-0 transition-transform ${isStuCollapsed ? "" : "rotate-180"} ${sub}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/></svg>
                          </button>

                          {!isStuCollapsed && daySubjects.length > 0 && (
                            <div className="px-4 py-2.5 flex flex-col gap-1.5">
                              {daySubjects.map(subject => {
                                const r = studentRecs[subject]
                                const subSchedule = schedules.find(s => s.subject === subject && s.section === calSection)
                                const overrideKey = `${student.id}_${subject}`
                                const isOverriding = calOverrideId === overrideKey
                                const statusBg = !r || r.status === "Absent"
                                  ? (dm ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200")
                                  : r.status === "Late"
                                    ? (dm ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200")
                                    : (dm ? "bg-green-500/10 border-green-500/20" : "bg-green-50 border-green-200")
                                return (
                                  <div key={subject} className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border ${statusBg}`}>
                                    {!r || r.status === "Absent"
                                      ? <MinusCircle size={11} className="text-red-500 shrink-0" />
                                      : r.status === "Late"
                                        ? <Clock size={11} className="text-amber-500 shrink-0" />
                                        : <CheckCircle2 size={11} className="text-green-500 shrink-0" />}
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-[9px] font-black leading-none truncate ${!r || r.status === "Absent" ? "text-red-500" : r.status === "Late" ? "text-amber-500" : "text-green-500"}`}>
                                        {subject}
                                      </p>
                                      {subSchedule && <p className={`text-[7px] mt-0.5 ${sub}`}>{fmt(subSchedule.start_time)}</p>}
                                      {r && r.status !== "Absent" && r.time && r.time !== "00:00:00" && <p className={`text-[7px] ${sub}`}>in at {fmtT(r.time)}</p>}
                                      <div className="mt-0.5">
                                        {r
                                          ? <SourceBadge notes={r.notes} time={r.time} size="xs" />
                                          : <span className="text-[7px] font-black px-1.5 py-px rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/20">Not yet scanned</span>
                                        }
                                      </div>
                                    </div>
                                    {isOverriding ? (
                                      <div className="w-[70px] flex justify-center shrink-0"><Loader2 size={12} className="animate-spin text-blue-400" /></div>
                                    ) : (
                                      <div className="flex items-center gap-0.5 shrink-0">
                                        <button onClick={() => setQrViewStudent(student)} title="Show QR"
                                          className={`p-1 rounded-lg transition-colors ${dm ? "text-slate-500 hover:text-blue-400 hover:bg-blue-500/10" : "text-slate-300 hover:text-blue-500 hover:bg-blue-50"}`}>
                                          <QrCode size={12} />
                                        </button>
                                        {(["Present","Late","Absent"] as AttStatus[]).map(st => {
                                          const current = !r ? st === "Absent" : r.status === st
                                          return (
                                            <button key={st}
                                              onClick={() => updateCalendarDayStatus(student, subject, r, st, selectedDay!)}
                                              disabled={current} title={st}
                                              className={`p-1 rounded-lg transition-colors ${current
                                                ? st === "Present" ? "bg-green-500/20 text-green-500 cursor-default"
                                                  : st === "Late" ? "bg-amber-500/20 text-amber-500 cursor-default"
                                                  : "bg-red-500/20 text-red-500 cursor-default"
                                                : dm ? "text-slate-600 hover:text-white hover:bg-slate-700" : "text-slate-300 hover:text-slate-700 hover:bg-slate-100"}`}>
                                              {st === "Present" ? <CheckCircle2 size={12} /> : st === "Late" ? <Clock size={12} /> : <MinusCircle size={12} />}
                                            </button>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {!isStuCollapsed && hasInconsistency && (
                            <div className="px-4 pb-3">
                              <p className={`text-[8px] font-bold ${dm ? "text-orange-400" : "text-orange-700"}`}>
                                ⚠ Present in <span className="font-black">{presentSubjects.join(", ")}</span>
                                {" "}— absent in <span className="font-black">{absentSubjects.join(", ")}</span>
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes scanLine {
          0%,100% { transform: translateY(0); opacity:1; }
          50% { transform: translateY(200px); opacity:0.5; }
        }
        @keyframes statusPop {
          0%   { opacity: 0; transform: translateY(-5px) scale(0.95); }
          65%  { opacity: 1; transform: translateY(1px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .status-pop { animation: statusPop 0.28s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      {qrViewStudent && (
        <QRViewerModal student={qrViewStudent} onClose={() => setQrViewStudent(null)} />
      )}

      {showLiveMonitoring && period && (
        <LiveMonitoring
          students={students}
          period={period}
          attendance={attendance}
          dm={dm}
          isOnline={isOnline}
          onClose={() => setShowLiveMonitoring(false)}
          onScan={handleScan}
          onUpdateStatus={updateStatus}
          onMarkAllPresent={async () => {
            const sectionStudents = students.filter(s => s.section === period.section)
            const unscanned = sectionStudents.filter(s => !attendance[s.id])
            if (!unscanned.length) { toast.info("All students already recorded"); return }
            const now = nowTime()
            const recs = unscanned.map(s => ({
              student_id: s.id, lrn: s.lrn,
              student_name: `${s.last_name}, ${s.first_name}`,
              section: period.section, strand: s.strand || "",
              subject: period.subject, date: scannerAttendanceDate, time: now,
              status: "Present" as AttStatus, school_year: schoolYear,
              notes: "MANUAL",
            }))
            const newMap = { ...attendance }
            recs.forEach(r => { newMap[r.student_id] = r })
            setAttendance(newMap)
            const { error } = await supabase.from("attendance").insert(recs)
            if (error) { toast.error("Failed: " + error.message); return }
            toast.success(`${recs.length} student${recs.length !== 1 ? "s" : ""} marked Present`)
          }}
          onMarkRemainingAbsent={async () => {
            const sectionStudents = students.filter(s => s.section === period.section)
            sectionStudents.filter(s => !attendance[s.id]).forEach(s => updateStatus(s.id, "Absent"))
          }}
          isScannerLive={isScannerLive}
          graceMins={graceMins}
          setGraceMins={(val) => {
            setGraceMins(val)
            graceMinsRef.current = val
          }}
          beepOn={beepOn}
          setBeepPersist={setBeepPersist}
          setQrViewStudent={setQrViewStudent}
          schedules={scannerSchedules}
          setPeriod={setPeriod}
        />
      )}
    </div>
  )
}