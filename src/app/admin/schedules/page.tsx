"use client"

import React, { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/admin-client"
import { useTheme } from "@/hooks/useTheme"
import { toast } from "sonner"
import { CalendarRange, Loader2, RefreshCw, CalendarDays, MonitorPlay } from "lucide-react"

import { ScheduleRow, SectionRow } from "./components/types"
import { AcademicCalendarManager } from "./components/AcademicCalendarManager"
import { RoomMonitoringTab } from "./components/RoomMonitoringTab"
import { SectionList } from "./components/SectionList"
import { ScheduleTab } from "./components/schedule/ScheduleTab"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function SchedulesPage() {
  const { isDarkMode } = useTheme()

  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([])
  const [allSections,  setAllSections]  = useState<SectionRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [availableStrands, setAvailableStrands] = useState<string[]>([])

  const [pageTab, setPageTab] = useState<"manager" | "timetable" | "calendar" | "rooms">(() => {
    if (typeof window !== "undefined") {
      const s = sessionStorage.getItem("schedules_tab")
      if (s === "manager" || s === "timetable" || s === "calendar" || s === "rooms") return s
    }
    return "manager"
  })
  const [activeSection, setActiveSection] = useState<SectionRow | null>(null)
  const [schoolYear,   setSchoolYear]   = useState("2025-2026")
  
  useEffect(() => { sessionStorage.setItem("schedules_tab", pageTab) }, [pageTab])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: secData, error: secErr }, { data: schData, error: schErr }, { data: tchData }, { data: cfgData }, { data: sData }] =
        await Promise.all([
          supabase.from("sections").select("*, students!section_id(id, status, gender, student_category)").order("section_name"),
          supabase.from("schedules").select("*, rooms(name)").order("start_time"),
          supabase.from("teachers").select("id, full_name").eq("is_active", true).order("full_name"),
          supabase.from("system_config").select("school_year").single(),
          supabase.from("system_settings").select("*").eq("setting_key", "available_strands"),
        ])
      if (secErr) throw secErr
      if (schErr) throw schErr

      let strands = ['ICT', 'GAS']
      if (sData && sData.length > 0 && sData[0].value_text) {
        try {
          strands = JSON.parse(sData[0].value_text)
        } catch(e) {}
      }
      setAvailableStrands(strands)

      const filteredSections = (secData ?? []).filter((s: any) => strands.includes(s.strand))
      setAllSections(filteredSections as SectionRow[])

      const mappedSchedules = (schData ?? []).map((r: any) => ({
        ...r,
        room: r.rooms?.name || r.room,
        teacher: (tchData ?? []).find((t: any) => t.id === r.teacher_id)?.full_name || r.teacher || null
      })).filter((r: any) => {
        const sec = (secData ?? []).find((s: any) => s.section_name === r.section)
        return sec ? strands.includes(sec.strand) : true
      }) as ScheduleRow[]

      setScheduleRows(mappedSchedules)
      if (cfgData?.school_year) setSchoolYear(cfgData.school_year)
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const uid = Math.random().toString(36).slice(2, 8)
    const ch = supabase.channel(`ms_rt_${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "sections"  }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  const bdr   = isDarkMode ? "rgba(51,65,85,0.5)"  : "rgba(226,232,240,0.8)"
  const txt   = isDarkMode ? "#f8fafc" : "#0f172a"
  const muted = isDarkMode ? "#94a3b8" : "#64748b"

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3 sm:gap-4 w-full min-w-0 px-0" style={{ color: txt }}>
      <div
        className="relative overflow-hidden rounded-[20px] sm:rounded-[24px] border p-4 sm:p-6 flex items-center justify-between gap-3"
        style={{
          backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255,255,255,0.85)',
          borderColor: bdr,
          backdropFilter: "blur(16px)",
          animation: "saas-fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", boxShadow: "0 8px 24px -4px rgba(59,130,246,0.45)" }}
          >
            <CalendarRange size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tighter leading-none truncate" style={{ color: txt }}>
              School Schedules
            </h1>
          </div>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-[8.5px] uppercase tracking-widest border transition-all active:scale-95 disabled:opacity-50 shrink-0"
          style={{ background: isDarkMode ? 'rgba(30,41,59,0.6)' : 'rgba(248,250,252,0.8)', borderColor: bdr, color: muted }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Sync</span>
        </button>
      </div>

      <div
        className="flex gap-1 p-1.5 rounded-2xl border w-full overflow-x-auto sm:w-fit"
        style={{ background: isDarkMode ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.8)', borderColor: bdr }}
      >
        {([
          { key: "manager",   label: "Schedule Manager",  icon: <CalendarRange size={11} /> },
          { key: "timetable", label: "Timetable",         icon: <CalendarRange size={11} /> },
          { key: "calendar",  label: "Academic Calendar", icon: <CalendarDays  size={11} /> },
          { key: "rooms",     label: "Room Monitoring",   icon: <MonitorPlay size={11} /> },
        ] as { key: "manager"|"timetable"|"calendar"|"rooms"; label: string; icon: React.ReactNode }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setPageTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap"
            style={
              pageTab === t.key
                ? { background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff" }
                : { color: muted }
            }
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {pageTab === "calendar" && (
        <AcademicCalendarManager
          isDarkMode={isDarkMode}
          surf={isDarkMode ? "#0f172a" : "#ffffff"}
          bdr={bdr} txt={txt} muted={muted}
          schoolYear={schoolYear}
        />
      )}

      {pageTab === "rooms" && (
        <RoomMonitoringTab 
          schedules={scheduleRows}
          isDarkMode={isDarkMode}
          schoolYear={schoolYear}
        />
      )}

      {(pageTab === "manager" || pageTab === "timetable") && (
        <React.Fragment>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <Loader2 className="animate-spin text-blue-500" size={28} />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Loading schedules...</p>
            </div>
          ) : activeSection ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button 
                onClick={() => setActiveSection(null)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:-translate-x-1 ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                ← Back to Sections
              </button>
              <ScheduleTab
                sectionName={activeSection.section_name}
                isICT={activeSection.strand === 'ICT'}
                isDarkMode={isDarkMode}
                schoolYear={schoolYear}
                students={(activeSection as any).students || []}
                allSchedules={scheduleRows}
                readOnly={pageTab === "timetable"}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <SectionList
                sections={allSections}
                onSelectSection={setActiveSection}
                isDarkMode={isDarkMode}
              />
            </div>
          )}
        </React.Fragment>
      )}
    </div>
    </TooltipProvider>
  )
}
