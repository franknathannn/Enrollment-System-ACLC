"use client"

import React, { useEffect, useState, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { useTheme } from "@/hooks/useTheme"
import { themeColors } from "@/lib/themeColors"
import { toast } from "sonner"
import { CalendarRange, Loader2, RefreshCw, Clock, Layers, ChevronDown, Search, CalendarDays } from "lucide-react"

import {
  ScheduleRow, SectionRow, StrandFilter, Day,
  DAYS,
  ABS_START, ABS_END, SLOT_MINS,
  toMins, toDisp, toStr, snapSlot, TIME_OPTS,
} from "./components/types"
import { StrandGrid } from "./components/StrandGrid"
import { EditModal  } from "./components/EditModal"
import { validateSlot } from "../sections/components/schedule/autoScheduler"
import { AcademicCalendarManager } from "./components/AcademicCalendarManager"

// ── Beautiful time picker used for From/To controls ──────────────────────────
function PageTimeSelect({
  value, options, isDarkMode, surf, bdr, txt, muted, onChange,
}: {
  value: number; options: { value: string; label: string }[]
  isDarkMode: boolean; surf: string; bdr: string; txt: string; muted: string
  onChange: (m: number) => void
}) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState("")
  const [pos,   setPos]   = useState({ top: 0, left: 0, width: 200 })
  const btnRef = useRef<HTMLButtonElement>(null)

  const filtered  = query.trim() ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase())) : options
  const amOpts    = filtered.filter(o => o.label.includes("AM"))
  const pmOpts    = filtered.filter(o => o.label.includes("PM"))
  const overlayBg = isDarkMode ? "rgba(9,14,26,0.99)"    : "#ffffff"
  const shadow    = isDarkMode
    ? "0 20px 40px -8px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.07)"
    : "0 20px 40px -8px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.04)"
  const rowHov    = isDarkMode ? "rgba(30,41,59,0.9)"    : "#f8fafc"
  const activeRow = isDarkMode ? "rgba(37,99,235,0.18)"  : "#eff6ff"
  const activeTxt = isDarkMode ? "#93c5fd"               : "#1d4ed8"
  const groupLbl  = isDarkMode ? "rgba(100,116,139,0.7)" : "rgba(148,163,184,0.9)"
  const inputBg   = isDarkMode ? "rgba(15,23,42,0.95)"   : "#f8fafc"

  const label = options.find(o => toMins(o.value) === value)?.label ?? toDisp(value)
  const parts = label.match(/^(\d+:\d+)\s*(AM|PM)$/)

  const openDropdown = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 8, left: r.left, width: Math.max(r.width, 200) })
    }
    setOpen(true)
    setQuery("")
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => open ? setOpen(false) : openDropdown()}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "0 12px", height: 36, borderRadius: 14,
          border: `1.5px solid ${open ? "#3b82f6" : bdr}`,
          background: surf, cursor: "pointer", outline: "none",
          boxShadow: open ? "0 0 0 3px rgba(59,130,246,0.15)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      >
        <Clock size={11} style={{ color: open ? "#3b82f6" : muted, flexShrink: 0 }} />
        {parts ? (
          <span style={{ fontSize: 11, fontWeight: 800, color: txt }}>
            {parts[1]}<span style={{ fontSize: 9, fontWeight: 700, color: open ? "#3b82f6" : muted, marginLeft: 2 }}>{parts[2]}</span>
          </span>
        ) : (
          <span style={{ fontSize: 11, fontWeight: 800, color: txt }}>{label}</span>
        )}
        <ChevronDown size={10} style={{ color: muted, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <>
          {/* Backdrop — closes on outside click */}
          <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => { setOpen(false); setQuery("") }} />
          {/* Dropdown — fixed, escapes all overflow containers */}
          <div style={{
            position: "fixed",
            top: pos.top, left: pos.left, width: Math.max(pos.width, 200),
            zIndex: 9999,
            background: overlayBg, border: `1px solid ${bdr}`,
            borderRadius: 18, boxShadow: shadow, overflow: "hidden",
          }}>
            <div style={{ padding: "8px 8px 5px" }}>
              <div style={{ position: "relative" }}>
                <Clock size={11} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: muted }} />
                <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                  placeholder='Search time…'
                  style={{
                    width: "100%", height: 32, borderRadius: 9,
                    border: `1px solid ${bdr}`, background: inputBg,
                    paddingLeft: 27, paddingRight: 8, fontSize: 10,
                    fontWeight: 600, color: txt, outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            <div style={{ maxHeight: 260, overflowY: "auto", paddingBottom: 6, scrollbarWidth: "none" }}>
              {[{ label: "Morning", opts: amOpts }, { label: "Afternoon", opts: pmOpts }].map(group =>
                group.opts.length === 0 ? null : (
                  <div key={group.label}>
                    <div style={{ padding: "5px 12px 2px", fontSize: 7.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: groupLbl }}>
                      {group.label}
                    </div>
                    {group.opts.map(opt => {
                      const m = toMins(opt.value)
                      const active = m === value
                      const p = opt.label.match(/^(\d+:\d+)\s*(AM|PM)$/)
                      return (
                        <button key={opt.value} type="button"
                          onClick={() => { onChange(m); setOpen(false); setQuery("") }}
                          style={{
                            width: "100%", padding: "8px 14px",
                            display: "flex", alignItems: "baseline", justifyContent: "space-between",
                            background: active ? activeRow : "transparent",
                            border: "none", cursor: "pointer", transition: "background 0.1s",
                          }}
                          onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = rowHov }}
                          onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent" }}
                        >
                          <span style={{ fontSize: 15, fontWeight: 700, color: active ? activeTxt : txt }}>{p ? p[1] : opt.label}</span>
                          {p && <span style={{ fontSize: 10, fontWeight: 700, color: active ? activeTxt : muted }}>{p[2]}</span>}
                        </button>
                      )
                    })}
                  </div>
                )
              )}
              {filtered.length === 0 && <div style={{ padding: 12, fontSize: 10, color: muted, textAlign: "center" }}>No results</div>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function SchedulesPage() {
  const { isDarkMode } = useTheme()

  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([])
  const [allSections,  setAllSections]  = useState<SectionRow[]>([])
  const [loading,      setLoading]      = useState(true)
  // Default to today's weekday; Sunday falls back to Monday (no Sunday classes)
  const [day, setDay] = useState<Day>(() => {
    const names = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
    const todayName = names[new Date().getDay()] as Day
    return (DAYS as readonly string[]).includes(todayName) ? todayName as Day : "Monday"
  })
  const [strand,       setStrand]       = useState<StrandFilter>("BOTH")
  const [timeStart,    setTStart]       = useState(ABS_START)
  const [timeEnd,      setTEnd]         = useState(ABS_END)
  const [editRow,      setEditRow]      = useState<ScheduleRow | null>(null)
  const [editStart,    setEditStart]    = useState(0)
  const [editEnd,      setEditEnd]      = useState(0)
  const [saving,       setSaving]       = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  // ── New: page-level tab (timetable vs academic calendar) ──────────────────
  const [pageTab,      setPageTab]      = useState<"timetable" | "calendar">("timetable")
  const [schoolYear,   setSchoolYear]   = useState("2025-2026")

  const ghostRef       = useRef<HTMLDivElement | null>(null)
  const dragRef        = useRef<{
    id: string; dur: number; offsetY: number
    colEl: HTMLElement; origStart: number
  } | null>(null)
  // Pending drag: mouse is held but hasn't moved enough to start drag yet
  const pendingDragRef = useRef<{
    row: ScheduleRow; colEl: HTMLElement
    startX: number; startY: number; offY: number
  } | null>(null)

  const [teachers, setTeachers] = useState<{ id: string; full_name: string }[]>([])

  // ── Fetch all tables in parallel ──────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: secData, error: secErr }, { data: schData, error: schErr }, { data: tchData }, { data: cfgData }] =
        await Promise.all([
          supabase.from("sections").select("*").order("section_name"),
          supabase.from("schedules").select("*").order("start_time"),
          supabase.from("teachers").select("id, full_name").eq("is_active", true).order("full_name"),
          supabase.from("system_config").select("school_year").single(),
        ])
      if (secErr) throw secErr
      if (schErr) throw schErr
      setAllSections((secData ?? []) as SectionRow[])
      setScheduleRows((schData ?? []) as ScheduleRow[])
      setTeachers((tchData ?? []) as { id: string; full_name: string }[])
      if (cfgData?.school_year) setSchoolYear(cfgData.school_year)
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Realtime subscription
  useEffect(() => {
    const uid = Math.random().toString(36).slice(2, 8)
    const ch = supabase.channel(`ms_rt_${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "sections"  }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  // ── Derived data ──────────────────────────────────────────────────────────
  const ictSecs = allSections.filter(s => s.strand === "ICT").map(s => s.section_name).sort()
  const gasSecs = allSections.filter(s => s.strand === "GAS").map(s => s.section_name).sort()

  const inWindow = (r: ScheduleRow) =>
    r.day === day &&
    toMins(r.end_time)   > timeStart &&
    toMins(r.start_time) < timeEnd

  // All rows in window — grid handles per-section isolation
  const visibleDayRows = scheduleRows.filter(r => {
    if (!inWindow(r)) return false
    if (strand === "ICT") return ictSecs.includes(r.section)
    if (strand === "GAS") return gasSecs.includes(r.section)
    return ictSecs.includes(r.section) || gasSecs.includes(r.section)
  })

  const showICT = strand !== "GAS"
  const showGAS = strand !== "ICT"
  const totalSecs   = (showICT ? ictSecs.length : 0) + (showGAS ? gasSecs.length : 0)
  const ictPeriods  = visibleDayRows.filter(r => ictSecs.includes(r.section)).length
  const gasPeriods  = visibleDayRows.filter(r => gasSecs.includes(r.section)).length

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveRow = async (id: string, st: number, en: number, extra?: Partial<ScheduleRow>) => {
    setSaving(true)
    try {
      // Find the row being moved so we can validate the new slot
      const existing = scheduleRows.find(r => r.id === id)
      if (existing) {
        const candidate = {
          ...existing,
          start_time: toStr(st) + ":00",
          end_time:   toStr(en) + ":00",
          ...extra,
        }
        const conflicts = validateSlot(candidate, scheduleRows, id)
        if (conflicts.length > 0) {
          conflicts.forEach(c => toast.error(c.detail, { duration: 5000 }))
          setSaving(false)
          return
        }
      }
      const { error } = await supabase.from("schedules").update({
        start_time: toStr(st) + ":00",
        end_time:   toStr(en) + ":00",
        ...extra,
      }).eq("id", id)
      if (error) throw error
      toast.success("Schedule updated")
      setEditRow(null); load()
    } catch (e: any) { toast.error(e.message || "Update failed") }
    finally { setSaving(false) }
  }

  const deleteRow = async (id: string) => {
    if (!confirm("Delete this period?")) return
    setDeleting(true)
    try {
      const { error } = await supabase.from("schedules").delete().eq("id", id)
      if (error) throw error
      toast.success("Period deleted")
      setEditRow(null); load()
    } catch (e: any) { toast.error(e.message || "Delete failed") }
    finally { setDeleting(false) }
  }

  // ── Drag-to-reschedule ────────────────────────────────────────────────────
  // Drag only activates after cursor moves ≥4px — prevents accidental drags on click.
  const SLOT_H_PX    = 64
  const DRAG_THRESHOLD = 4

  const activateDrag = (row: ScheduleRow, colEl: HTMLElement, startX: number, startY: number, offY: number) => {
    const dur     = toMins(row.end_time) - toMins(row.start_time)
    const colW    = colEl.getBoundingClientRect().width
    const blockH  = (dur / SLOT_MINS) * SLOT_H_PX - 6
    const isLight = !isDarkMode

    dragRef.current = { id: row.id, dur, offsetY: offY, colEl, origStart: toMins(row.start_time) }

    // Ghost
    const ghost = document.createElement("div")
    ghost.style.cssText = `
      position:fixed;pointer-events:none;z-index:9999;
      width:${colW - 8}px;height:${blockH}px;
      background:${isLight ? "rgba(37,99,235,0.92)" : "rgba(59,130,246,0.92)"};
      border-radius:14px;
      display:flex;flex-direction:column;justify-content:center;
      padding:8px 14px;color:white;
      font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;
      box-shadow:0 24px 48px rgba(0,0,0,0.45),0 0 0 2px rgba(255,255,255,0.25);
      backdrop-filter:blur(8px);opacity:0.96;
    `
    ghost.innerHTML = `
      <span style="font-size:10px;font-weight:900;letter-spacing:.08em">${row.subject}</span>
      <span style="font-size:8px;font-weight:600;opacity:0.75;margin-top:3px;letter-spacing:.04em">
        ${toDisp(toMins(row.start_time))} – ${toDisp(toMins(row.end_time))}
      </span>
    `
    document.body.appendChild(ghost)
    ghostRef.current = ghost

    // Drop zone
    const dropZone = document.createElement("div")
    dropZone.style.cssText = `
      position:absolute;pointer-events:none;z-index:8;
      left:4px;right:4px;height:${blockH}px;
      border-radius:14px;
      border:2px dashed ${isLight ? "rgba(37,99,235,0.45)" : "rgba(96,165,250,0.45)"};
      background:${isLight ? "rgba(37,99,235,0.06)" : "rgba(96,165,250,0.08)"};
      transition:top 0.06s cubic-bezier(0.16,1,0.3,1);
      display:flex;align-items:center;justify-content:center;
    `
    const dropLabel = document.createElement("span")
    dropLabel.style.cssText = `font-size:8px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:${isLight ? "rgba(37,99,235,0.55)" : "rgba(96,165,250,0.55)"};`
    dropLabel.textContent = "drop here"
    dropZone.appendChild(dropLabel)
    colEl.appendChild(dropZone)

    const onMove = (ev: MouseEvent) => {
      if (!ghostRef.current) return
      ghostRef.current.style.left = `${ev.clientX - 12}px`
      ghostRef.current.style.top  = `${ev.clientY - offY}px`
      const colRect = colEl.getBoundingClientRect()
      const relY    = ev.clientY - colRect.top - offY
      const snapped = Math.round(relY / SLOT_H_PX) * SLOT_H_PX
      const clamped = Math.max(0, Math.min(snapped, colEl.offsetHeight - blockH))
      dropZone.style.top = `${clamped}px`
      const rawMins = timeStart + Math.round(relY / SLOT_H_PX) * SLOT_MINS
      const newS    = Math.max(ABS_START, Math.min(snapSlot(rawMins), ABS_END - dur))
      const timeEl  = ghostRef.current.querySelector("span:last-child") as HTMLElement | null
      if (timeEl) timeEl.textContent = `${toDisp(newS)} – ${toDisp(newS + dur)}`
    }

    const onUp = (ev: MouseEvent) => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup",   onUp)
      if (ghostRef.current) { document.body.removeChild(ghostRef.current); ghostRef.current = null }
      if (dropZone.parentNode) dropZone.parentNode.removeChild(dropZone)
      if (!dragRef.current) return
      const { id, dur: d, colEl: ce, origStart } = dragRef.current
      const relY = ev.clientY - ce.getBoundingClientRect().top - offY
      const raw  = timeStart + Math.round(relY / SLOT_H_PX) * SLOT_MINS
      const newS = Math.max(ABS_START, Math.min(snapSlot(raw), ABS_END - d))
      if (newS !== origStart) saveRow(id, newS, newS + d)
      dragRef.current = null
    }

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup",   onUp)
  }

  const handleDragStart = (e: React.MouseEvent, row: ScheduleRow, colEl: HTMLElement) => {
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const offY = e.clientY - rect.top

    // Store intent — don't activate yet
    pendingDragRef.current = { row, colEl, startX: e.clientX, startY: e.clientY, offY }

    const onPendingMove = (ev: MouseEvent) => {
      if (!pendingDragRef.current) return
      const { row: r, colEl: ce, startX, startY, offY: oy } = pendingDragRef.current
      const dx = Math.abs(ev.clientX - startX)
      const dy = Math.abs(ev.clientY - startY)
      if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
        // Threshold crossed — start real drag
        document.removeEventListener("mousemove", onPendingMove)
        document.removeEventListener("mouseup",   onPendingCancel)
        pendingDragRef.current = null
        activateDrag(r, ce, startX, startY, oy)
      }
    }

    const onPendingCancel = () => {
      document.removeEventListener("mousemove", onPendingMove)
      document.removeEventListener("mouseup",   onPendingCancel)
      pendingDragRef.current = null
    }

    document.addEventListener("mousemove", onPendingMove)
    document.addEventListener("mouseup",   onPendingCancel)
  }

  const openEdit = (row: ScheduleRow) => {
    setEditRow(row)
    setEditStart(toMins(row.start_time))
    setEditEnd(toMins(row.end_time))
  }

  // ── Theme — mirrors layout.tsx pattern ───────────────────────────────────
  const surf  = isDarkMode ? themeColors.dark.surface      : "#ffffff"
  const bdr   = isDarkMode ? themeColors.dark.border       : "#e2e8f0"
  const txt   = isDarkMode ? themeColors.dark.text.primary : "#0f172a"
  const muted = isDarkMode ? themeColors.dark.text.muted   : "#94a3b8"

  // ── Day button active style ───────────────────────────────────────────────
  const dayActiveBg  = isDarkMode
    ? "linear-gradient(135deg,rgb(29,78,216),rgb(30,58,138))"
    : "#0f172a"
  const dayActiveBox = isDarkMode
    ? "0 8px 20px -4px rgba(37,99,235,0.5)"
    : "0 8px 20px -4px rgba(15,23,42,0.3)"

  // ── Strand button colors ──────────────────────────────────────────────────
  const strandActiveBg = (s: StrandFilter) =>
    s === "ICT" ? "#2563eb" : s === "GAS" ? "#d97706"
    : (isDarkMode ? "linear-gradient(135deg,rgb(29,78,216),rgb(30,58,138))" : "#0f172a")

  const strandActiveBox = (s: StrandFilter) =>
    s === "ICT" ? "0 8px 20px -4px rgba(37,99,235,0.45)"
    : s === "GAS" ? "0 8px 20px -4px rgba(217,119,6,0.45)"
    : (isDarkMode ? "0 8px 20px -4px rgba(37,99,235,0.4)" : "0 8px 20px -4px rgba(15,23,42,0.3)")

  // Pill background helper
  const pill = (color: "slate"|"blue"|"amber"|"violet") => {
    const map = {
      slate:  isDarkMode ? { bg:"rgba(30,41,59,0.7)",   color:"#94a3b8" } : { bg:"#f1f5f9",   color:"#64748b" },
      blue:   isDarkMode ? { bg:"rgba(30,58,138,0.35)", color:"#93c5fd" } : { bg:"#eff6ff",   color:"#2563eb" },
      amber:  isDarkMode ? { bg:"rgba(120,53,15,0.35)", color:"#fcd34d" } : { bg:"#fffbeb",   color:"#d97706" },
      violet: isDarkMode ? { bg:"rgba(76,29,149,0.35)", color:"#c4b5fd" } : { bg:"#f5f3ff",   color:"#7c3aed" },
    }
    return map[color]
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col gap-3 sm:gap-4 w-full min-w-0 px-0"
      style={{ color: txt }}
    >
      {/* Hide all scrollbars site-wide for this page — content still scrollable */}
      <style>{`
        html {
          -webkit-text-size-adjust: 100%;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        body {
          overflow-x: hidden;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        *, *::before, *::after {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        ::-webkit-scrollbar { display: none !important; }
      `}</style>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-[24px] sm:rounded-[32px] border p-4 sm:p-6 flex items-center justify-between gap-3"
        style={{
          backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.85)' : '#ffffff',
          borderColor: bdr,
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400" />
        <div style={{ position: 'absolute', top: -60, right: -60, width: 160, height: 160, borderRadius: '50%', background: isDarkMode ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.04)', filter: 'blur(50px)', pointerEvents: 'none' }} />

        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", boxShadow: "0 8px 20px -4px rgba(59,130,246,0.4)" }}
          >
            <CalendarRange size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}>Timetable</p>
            </div>
            <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tighter leading-none truncate" style={{ color: txt }}>
              School Schedules
            </h1>
            <p className="text-[9px] font-semibold italic mt-0.5 hidden sm:block" style={{ color: muted }}>
              {scheduleRows.length} total periods · drag to move · double-click to edit
            </p>
          </div>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-[8.5px] uppercase tracking-widest border transition-all active:scale-95 disabled:opacity-50 shrink-0 hover:border-blue-500/40"
          style={{ background: isDarkMode ? 'rgba(30,41,59,0.8)' : '#f8fafc', borderColor: bdr, color: muted }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Sync</span>
        </button>
      </div>

      {/* ── PAGE TAB SWITCHER ────────────────────────────────────────────── */}
      <div
        className="flex gap-1 p-1.5 rounded-2xl border w-fit"
        style={{ background: isDarkMode ? 'rgba(15,23,42,0.8)' : '#f8fafc', borderColor: bdr }}
      >
        {([
          { key: "timetable", label: "Timetable",        icon: <CalendarRange size={11} /> },
          { key: "calendar",  label: "Academic Calendar", icon: <CalendarDays  size={11} /> },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setPageTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap"
            style={
              pageTab === t.key
                ? { background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", boxShadow: "0 4px 12px -2px rgba(37,99,235,0.4)" }
                : { color: muted }
            }
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── ACADEMIC CALENDAR ───────────────────────────────────────────── */}
      {pageTab === "calendar" && (
        <AcademicCalendarManager
          isDarkMode={isDarkMode}
          surf={surf}
          bdr={bdr}
          txt={txt}
          muted={muted}
          schoolYear={schoolYear}
        />
      )}

      {pageTab === "timetable" && (
      <React.Fragment>

      {/* ── CONTROLS ────────────────────────────────────────────────────── */}
      {/* Scrolls horizontally on mobile, no wrap — hidden scrollbar */}
      <div
        className="flex gap-2 items-center"
        style={{
          overflowX: "auto",
          overflowY: "visible",
          paddingBottom: 2,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        } as React.CSSProperties}
      >

        {/* Day selector */}
        <div
          className="flex gap-0.5 p-1 rounded-2xl border shrink-0"
          style={{ background: surf, borderColor: bdr }}
        >
          {DAYS.map(d => (
            <button
              key={d}
              onClick={() => setDay(d)}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl font-black text-[8px] sm:text-[9px] uppercase tracking-widest transition-all duration-200 active:scale-95 whitespace-nowrap"
              style={
                day === d
                  ? { background: dayActiveBg, color: "#fff", boxShadow: dayActiveBox }
                  : { color: muted }
              }
            >
              {/* Short on mobile, full on desktop */}
              <span className="sm:hidden">{d.slice(0, 3)}</span>
              <span className="hidden sm:inline">{d}</span>
            </button>
          ))}
        </div>

        {/* Strand filter */}
        <div
          className="flex gap-0.5 p-1 rounded-2xl border shrink-0"
          style={{ background: surf, borderColor: bdr }}
        >
          {(["BOTH", "ICT", "GAS"] as StrandFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStrand(s)}
              className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-black text-[8px] sm:text-[9px] uppercase tracking-widest transition-all duration-200 active:scale-95 whitespace-nowrap"
              style={
                strand === s
                  ? { background: strandActiveBg(s), color: "#fff", boxShadow: strandActiveBox(s) }
                  : { color: muted }
              }
            >
              {s === "BOTH" && <Layers size={10} />}
              {s === "ICT"  && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />}
              {s === "GAS"  && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />}
              {s}
            </button>
          ))}
        </div>

        {/* Time: From */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl border shrink-0"
          style={{ background: surf, borderColor: bdr }}
        >
          <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: muted }}>From</span>
          <PageTimeSelect
            value={timeStart}
            options={TIME_OPTS.filter(o => toMins(o.value) < timeEnd)}
            isDarkMode={isDarkMode} surf={surf} bdr={bdr} txt={txt} muted={muted}
            onChange={m => { if (m < timeEnd) setTStart(m) }}
          />
        </div>

        {/* Time: To */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl border shrink-0"
          style={{ background: surf, borderColor: bdr }}
        >
          <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: muted }}>To</span>
          <PageTimeSelect
            value={timeEnd}
            options={TIME_OPTS.filter(o => toMins(o.value) > timeStart)}
            isDarkMode={isDarkMode} surf={surf} bdr={bdr} txt={txt} muted={muted}
            onChange={m => { if (m > timeStart) setTEnd(m) }}
          />
        </div>
      </div>

      {/* ── STAT PILLS ──────────────────────────────────────────────────── */}
      <div
        className="flex gap-1.5 items-center"
        style={{ overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        <span
          className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider whitespace-nowrap shrink-0"
          style={pill("slate")}
        >
          {totalSecs} sections
        </span>

        {showICT && (
          <span
            className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider whitespace-nowrap shrink-0"
            style={pill("blue")}
          >
            {ictPeriods} ICT period{ictPeriods !== 1 ? "s" : ""}
          </span>
        )}

        {showGAS && (
          <span
            className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider whitespace-nowrap shrink-0"
            style={pill("amber")}
          >
            {gasPeriods} GAS period{gasPeriods !== 1 ? "s" : ""}
          </span>
        )}

        <span
          className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider whitespace-nowrap shrink-0"
          style={pill("violet")}
        >
          {toDisp(timeStart)} – {toDisp(timeEnd)}
        </span>
      </div>

      {/* ── GRID / STATES ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: isDarkMode ? "rgba(37,99,235,0.15)" : "rgba(37,99,235,0.08)" }}
          >
            <Loader2 className="animate-spin text-blue-500" size={28} />
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: muted }}>
            Loading schedules…
          </p>
        </div>
      ) : totalSecs === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-40 gap-4 rounded-3xl border-2 border-dashed"
          style={{ borderColor: bdr }}
        >
          <CalendarRange size={40} style={{ color: muted, opacity: 0.3 }} />
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: muted, opacity: 0.4 }}>
            No sections found in database
          </p>
        </div>
      ) : (
        // Grid wrapper: allow horizontal scroll, hide scrollbar
        <div
          className="w-full"
          style={{
            overflowX: "auto",
            overflowY: "visible",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          } as React.CSSProperties}
        >
          <StrandGrid
            strandFilter={strand}
            ictSections={showICT ? ictSecs : []}
            gasSections={showGAS ? gasSecs : []}
            dayRows={visibleDayRows}
            timeStart={timeStart}
            timeEnd={timeEnd}
            isDarkMode={isDarkMode}
            surf={surf}
            bdr={bdr}
            muted={muted}
            txt={txt}
            ghostRef={ghostRef}
            onBlockDragStart={handleDragStart}
            onEdit={openEdit}
          />
        </div>
      )}

      </React.Fragment>
      )}

      {/* ── EDIT MODAL ──────────────────────────────────────────────────── */}
      {editRow && (
        <EditModal
          row={editRow}
          editStart={editStart}
          editEnd={editEnd}
          day={day}
          saving={saving}
          deleting={deleting}
          isDarkMode={isDarkMode}
          surf={surf}
          bdr={bdr}
          txt={txt}
          muted={muted}
          teachers={teachers}
          onChangeRow={setEditRow}
          onChangeStart={setEditStart}
          onChangeEnd={setEditEnd}
          onSave={() =>
            saveRow(editRow.id, editStart, editEnd, {
              subject: editRow.subject,
              teacher: editRow.teacher,
              room:    editRow.room,
            })
          }
          onDelete={() => deleteRow(editRow.id)}
          onClose={() => setEditRow(null)}
        />
      )}
    </div>
  )
}