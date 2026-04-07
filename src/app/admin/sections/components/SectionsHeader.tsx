// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\sections\components\SectionsHeader.tsx

import { memo } from "react"
import { ThemedCard } from "@/components/ThemedCard"
import { ThemedText } from "@/components/ThemedText"
import { FilterButton } from "./FilterButton"
import { Button } from "@/components/ui/button"
import { Trash, Plus, Layers, Cpu, BookOpen, Scale, BarChart3, X, GraduationCap, Info, FileDown, ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { DeleteManagementDialog } from "./DeleteManagementDialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { BulkScheduleManagerDialog } from "./schedule/BulkScheduleManagerDialog"

interface SectionsHeaderProps {
  isDarkMode: boolean
  strandFilter: "ALL" | "ICT" | "GAS"
  setStrandFilter: (filter: "ALL" | "ICT" | "GAS") => void
  gradeLevelFilter: "ALL" | "11" | "12"
  setGradeLevelFilter: (filter: "ALL" | "11" | "12") => void
  sectionSelection: Set<string>
  setConfirmDeleteSelect: (open: boolean) => void
  sections: any[]
  handleDeleteSection: (id: string, name: string, strand: "ICT" | "GAS") => void
  handleClearAllStudents: () => void
  initiateAdd: (strand: "ICT" | "GAS") => void
  onBalance: (strand: "ICT" | "GAS" | "ALL") => void
  isProcessing: boolean
  config: any
  allSchedules: any[]
  onExportGlobal: (strand: "GAS" | "ICT" | "BOTH") => void
}


// ── Section Statistics Popover ────────────────────────────────────────────────
function SectionStatsPopover({ sections, isDarkMode }: { sections: any[]; isDarkMode: boolean }) {
  const [open, setOpen] = useState(false)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)

  const updatePos = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPanelPos({ top: rect.bottom + 12, left: rect.left })
    }
  }

  useEffect(() => {
    if (!open) return
    updatePos()
    window.addEventListener("scroll", updatePos, { passive: true, capture: true })
    window.addEventListener("resize", updatePos, { passive: true })
    return () => {
      window.removeEventListener("scroll", updatePos, true)
      window.removeEventListener("resize", updatePos)
    }
  }, [open])

  const stats = (() => {
    const ict11 = sections.filter(s => s.strand === "ICT" && s.grade_level === "11")
    const ict12 = sections.filter(s => s.strand === "ICT" && s.grade_level === "12")
    const gas11 = sections.filter(s => s.strand === "GAS" && s.grade_level === "11")
    const gas12 = sections.filter(s => s.strand === "GAS" && s.grade_level === "12")

    const countStudents = (secs: any[]) =>
      secs.reduce((acc, s) => acc + (s.students?.filter((st: any) => st.status === "Accepted" || st.status === "Approved").length || 0), 0)
    const countCap = (secs: any[]) =>
      secs.reduce((acc, s) => acc + (s.capacity || 40), 0)

    const rows = [
      { label: "ICT — Grade 11", color: "blue", sections: ict11, students: countStudents(ict11), cap: countCap(ict11) },
      { label: "ICT — Grade 12", color: "violet", sections: ict12, students: countStudents(ict12), cap: countCap(ict12) },
      { label: "GAS — Grade 11", color: "orange", sections: gas11, students: countStudents(gas11), cap: countCap(gas11) },
      { label: "GAS — Grade 12", color: "rose", sections: gas12, students: countStudents(gas12), cap: countCap(gas12) },
    ]

    const totalSecs = sections.length
    const totalStudents = rows.reduce((a, r) => a + r.students, 0)
    const totalCap = rows.reduce((a, r) => a + r.cap, 0)

    return { rows, totalSecs, totalStudents, totalCap }
  })()

  const colorMap: Record<string, { bg: string; text: string; bar: string; badge: string }> = {
    blue: { bg: isDarkMode ? "bg-blue-950/40" : "bg-blue-50", text: isDarkMode ? "text-blue-300" : "text-blue-700", bar: "bg-blue-500", badge: isDarkMode ? "bg-blue-900/60 text-blue-300" : "bg-blue-100 text-blue-700" },
    violet: { bg: isDarkMode ? "bg-violet-950/40" : "bg-violet-50", text: isDarkMode ? "text-violet-300" : "text-violet-700", bar: "bg-violet-500", badge: isDarkMode ? "bg-violet-900/60 text-violet-300" : "bg-violet-100 text-violet-700" },
    orange: { bg: isDarkMode ? "bg-orange-950/40" : "bg-orange-50", text: isDarkMode ? "text-orange-300" : "text-orange-700", bar: "bg-orange-500", badge: isDarkMode ? "bg-orange-900/60 text-orange-300" : "bg-orange-100 text-orange-700" },
    rose: { bg: isDarkMode ? "bg-rose-950/40" : "bg-rose-50", text: isDarkMode ? "text-rose-300" : "text-rose-700", bar: "bg-rose-500", badge: isDarkMode ? "bg-rose-900/60 text-rose-300" : "bg-rose-100 text-rose-700" },
  }

  return (
    <div className="relative space-y-2 md:space-y-4 transform-gpu w-full lg:w-auto text-left">
      {/* Title — clicking opens the popover */}
      <button
        ref={triggerRef}
        onClick={() => setOpen(v => !v)}
        className="group text-left flex flex-col gap-1 focus:outline-none"
      >
        <ThemedText
          variant="h1"
          className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic leading-none group-hover:opacity-80 transition-opacity"
          isDarkMode={isDarkMode}
        >
          School Units
        </ThemedText>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <ThemedText variant="body" className="text-[10px] md:text-xs font-bold opacity-60 uppercase tracking-[0.2em]" isDarkMode={isDarkMode}>
            AMA ACLC NORTHBAY SECTIONS
          </ThemedText>
          <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full transition-colors ${open
              ? "bg-blue-600 text-white"
              : isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
            }`}>
            <Info size={9} /> Stats
          </span>
        </div>
      </button>

      {/* Popover Panel — portalled to body to escape all stacking contexts */}
      {open && typeof document !== "undefined" && createPortal(
        <>
          {/* Backdrop */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />

          <div
            style={{
              position: "fixed",
              top: panelPos.top,
              left: Math.max(12, Math.min(panelPos.left, window.innerWidth - Math.min(400, window.innerWidth - 24) - 12)),
              zIndex: 9999,
              width: Math.min(400, window.innerWidth - 24),
            }}
            className={`rounded-[24px] shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"
              }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-5 pt-4 pb-3 border-b ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
              <div className="flex items-center gap-2">
                <BarChart3 size={13} className={isDarkMode ? "text-blue-400" : "text-blue-600"} />
                <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  Section Breakdown
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className={`w-5 h-5 flex items-center justify-center rounded-full transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-500" : "hover:bg-slate-100 text-slate-400"
                  }`}
              >
                <X size={11} />
              </button>
            </div>

            {/* Summary pills — compact row */}
            <div className={`flex gap-2 px-4 py-3 border-b ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
              {[
                { icon: <Layers size={11} />, label: "Sections", value: stats.totalSecs },
                { icon: <GraduationCap size={11} />, label: "Students", value: stats.totalStudents },
                { icon: <BarChart3 size={11} />, label: "Capacity", value: stats.totalCap },
              ].map(pill => (
                <div key={pill.label} className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl ${isDarkMode ? "bg-slate-900" : "bg-slate-50"}`}>
                  <span className={isDarkMode ? "text-slate-400" : "text-slate-400"}>{pill.icon}</span>
                  <div>
                    <p className={`text-base font-black tabular-nums leading-none ${isDarkMode ? "text-white" : "text-slate-900"}`}>{pill.value}</p>
                    <p className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{pill.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Per-group rows — 2-column grid, compact */}
            <div className="px-4 py-3 grid grid-cols-2 gap-2">
              {stats.rows.map(row => {
                const c = colorMap[row.color]
                const pct = row.cap > 0 ? Math.min((row.students / row.cap) * 100, 100) : 0
                return (
                  <div key={row.label} className={`px-3 py-3 rounded-xl ${c.bg}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className={`text-[9px] font-black uppercase tracking-wider leading-snug ${c.text}`}>{row.label}</p>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0 ml-1 ${c.badge}`}>
                        {row.sections.length}s
                      </span>
                    </div>
                    <p className={`text-lg font-black tabular-nums leading-none mb-2 ${c.text}`}>
                      {row.students}<span className="text-xs font-bold opacity-50">/{row.cap}</span>
                    </p>
                    <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDarkMode ? "bg-slate-800" : "bg-white/60"}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${c.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className={`text-[8px] font-bold mt-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                      {pct.toFixed(0)}% filled
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

export const SectionsHeader = memo(({
  isDarkMode, strandFilter, setStrandFilter, gradeLevelFilter, setGradeLevelFilter,
  sectionSelection, setConfirmDeleteSelect,
    sections, handleDeleteSection, handleClearAllStudents, initiateAdd, onBalance, isProcessing,
  config, allSchedules, onExportGlobal
}: SectionsHeaderProps) => {

  const [scheduleManagerOpen, setScheduleManagerOpen] = useState(false)

  // 🧪 PROP-BASED THEME ENGINE (Ignoring Tailwind dark: for state sync)
  const theme = {
    surface: isDarkMode ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.85)',
    border: isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.6)',
    filterBg: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.9)',
    filterBorder: isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 1)'
  };

  return (
    <ThemedCard
      className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 p-6 md:p-10 rounded-[32px] md:rounded-[48px] backdrop-blur-3xl shadow-none border transition-all duration-700 bg-clip-padding outline outline-1 outline-transparent isolate"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border
      }}
    >
      {/* 🏙️ TITLE CLUSTER + STATS POPOVER */}
      <SectionStatsPopover sections={sections} isDarkMode={isDarkMode} />

      {/* 📊 PERSISTENT FILTER DOCK (Fitted & Minimized) */}
      <div className="flex flex-col gap-2 w-full sm:w-auto">
        {/* Strand Filter */}
        <div
          className="flex p-1.5 rounded-[22px] border shadow-inner transition-all duration-500 bg-clip-padding isolate transform-gpu w-full sm:w-auto justify-center sm:justify-start"
          style={{
            backgroundColor: theme.filterBg,
            borderColor: theme.filterBorder
          }}
        >
          <FilterButton
            label="All"
            active={strandFilter === 'ALL'}
            onClick={() => setStrandFilter('ALL')}
            icon={<Layers size={14} />}
            type="ALL"
            isDarkMode={isDarkMode}
          />
          <FilterButton
            label="ICT"
            active={strandFilter === 'ICT'}
            onClick={() => setStrandFilter('ICT')}
            icon={<Cpu size={14} />}
            type="ICT"
            isDarkMode={isDarkMode}
          />
          <FilterButton
            label="GAS"
            active={strandFilter === 'GAS'}
            onClick={() => setStrandFilter('GAS')}
            icon={<BookOpen size={14} />}
            type="GAS"
            isDarkMode={isDarkMode}
          />
        </div>
        {/* Grade Level Filter */}
        <div
          className="flex p-1.5 rounded-[22px] border shadow-inner transition-all duration-500 bg-clip-padding isolate transform-gpu w-full sm:w-auto justify-center sm:justify-start"
          style={{
            backgroundColor: theme.filterBg,
            borderColor: theme.filterBorder
          }}
        >
          {(["ALL", "11", "12"] as const).map((gl) => (
            <button
              key={gl}
              onClick={() => setGradeLevelFilter(gl)}
              className={`px-4 py-2 rounded-[18px] text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${gradeLevelFilter === gl
                  ? "bg-blue-600 text-white shadow-md"
                  : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800"
                }`}
            >
              {gl === "ALL" ? "All Grades" : `Grade ${gl}`}
            </button>
          ))}
        </div>
      </div>

      {/* 🎮 COMMAND ACTIONS */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
        {sectionSelection.size > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setConfirmDeleteSelect(true)}
                variant="destructive"
                className="rounded-[18px] h-11 px-6 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-red-500/20 transition-all transform-gpu animate-in fade-in zoom-in slide-in-from-left-4 duration-500"
              >
                <Trash className="mr-2" size={14} /> Wipe ({sectionSelection.size})
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-red-950 text-red-200 border-red-900"><p>Delete Selected Sections</p></TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <DeleteManagementDialog
              sections={sections}
              onDelete={handleDeleteSection}
              onClearStudents={handleClearAllStudents}
              isDarkMode={isDarkMode}
            />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Manage & Delete Sections</p></TooltipContent>
        </Tooltip>

        <div className="h-8 w-px bg-slate-500/10 mx-1 hidden md:block" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => onBalance(strandFilter)}
              disabled={isProcessing}
              className="rounded-[18px] bg-purple-600 hover:bg-purple-700 h-11 px-4 sm:px-5 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-purple-500/20 transition-all transform-gpu active:scale-90 col-span-2 sm:col-span-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed text-white"
            >
              <Scale className="mr-1.5" size={14} /> Balance {strandFilter}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Auto-distribute Students</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => initiateAdd('ICT')}
              disabled={isProcessing}
              className="rounded-[18px] bg-blue-600 hover:bg-blue-700 h-11 px-5 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-blue-500/20 transition-all transform-gpu active:scale-90 flex-1 sm:flex-none text-white"
            >
              <Plus className="mr-2" size={16} /> Add ICT
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Create New ICT Section</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => initiateAdd('GAS')}
              disabled={isProcessing}
              className="rounded-[18px] bg-orange-600 hover:bg-orange-700 h-11 px-5 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-orange-500/20 transition-all transform-gpu active:scale-90 flex-1 sm:flex-none text-white"
            >
              <Plus className="mr-2" size={16} /> Add GAS
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Create New GAS Section</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setScheduleManagerOpen(true)}
              className="rounded-[18px] bg-indigo-600 hover:bg-indigo-700 h-11 px-4 sm:px-5 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-indigo-500/20 transition-all transform-gpu active:scale-90 col-span-2 sm:col-span-1 sm:flex-none text-white border border-indigo-400/20"
            >
              <Layers className="mr-1.5" size={14} /> Schedule Manager
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Open Bulk Schedule Editor</p></TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  className="rounded-[18px] bg-emerald-600 hover:bg-emerald-700 h-11 px-4 sm:px-5 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-emerald-500/20 transition-all transform-gpu active:scale-90 col-span-2 sm:col-span-1 sm:flex-none text-white"
                >
                  <FileDown className="mr-1.5" size={14} /> Export Masterlist <ChevronDown className="ml-1" size={12} />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Export Full List</p></TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className={`w-52 font-black uppercase tracking-widest text-[9px] ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
            <DropdownMenuItem onClick={() => onExportGlobal("GAS")} className="cursor-pointer py-3 focus:bg-emerald-600 focus:text-white">GAS MASTERLIST</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExportGlobal("ICT")} className="cursor-pointer py-3 focus:bg-emerald-600 focus:text-white">ICT MASTERLIST</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExportGlobal("BOTH")} className="cursor-pointer py-3 focus:bg-emerald-600 focus:text-white">BOTH ICT & GAS MASTERLIST</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <BulkScheduleManagerDialog 
        open={scheduleManagerOpen} 
        onOpenChange={setScheduleManagerOpen} 
        sections={sections} 
        isDarkMode={isDarkMode} 
        config={config} 
        allSchedules={allSchedules} 
      />
    </ThemedCard>
  )
})

SectionsHeader.displayName = "SectionsHeader"