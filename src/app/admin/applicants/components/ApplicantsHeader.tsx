// src/app/admin/applicants/components/ApplicantsHeader.tsx
import { memo, useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Search, RefreshCw, FileDown, ChevronDown, Users, Clock, CheckCircle2, XCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface ApplicantsHeaderProps {
  isDarkMode: boolean
  loading: boolean
  config: any
  searchTerm: string
  setSearchTerm: (term: string) => void
  fetchStudents: (isBackground?: boolean) => void
  exportToCSV: (type: string) => void
}

export const ApplicantsHeader = memo(({
  isDarkMode, loading, config, searchTerm, setSearchTerm, fetchStudents, exportToCSV,
}: ApplicantsHeaderProps) => {
  const [exportOpen, setExportOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const statPills = [
    { icon: <Users size={11} />, label: "Queue", color: "text-blue-400", bg: isDarkMode ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-200" },
    { icon: <Clock size={11} />, label: "Pending", color: "text-amber-400", bg: isDarkMode ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200" },
    { icon: <CheckCircle2 size={11} />, label: "Accepted", color: "text-emerald-400", bg: isDarkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200" },
    { icon: <XCircle size={11} />, label: "Rejected", color: "text-red-400", bg: isDarkMode ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200" },
  ]

  return (
    <div
      className="w-full rounded-[32px] border backdrop-blur-sm relative z-[40] transition-colors duration-300"
      style={{
        backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.85)' : '#ffffff',
        borderColor: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : '#e2e8f0',
      }}
    >
      {/* Gradient accent top strip */}
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[32px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400" />
      {/* Background glow */}
      <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px] pointer-events-none ${isDarkMode ? 'bg-blue-600/8' : 'bg-blue-400/6'}`} />

      <div className="relative p-5 md:p-8 flex flex-col md:flex-row md:justify-between md:items-center gap-5 md:gap-8">
        {/* LEFT — Title + status pills */}
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
            <p className={`text-[9px] font-black uppercase tracking-[0.4em] ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`}>
              S.Y. {config?.school_year || "—"}
            </p>
          </div>
          <h1
            className={`text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
          >
            Admissions
          </h1>
          <p className={`text-[11px] font-semibold mt-1.5 italic ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Student Enrollment Queue — Active Applications
          </p>

          {/* Status pill strip */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {statPills.map((p) => (
              <span key={p.label} className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${p.color} ${p.bg}`}>
                {p.icon}{p.label}
              </span>
            ))}
          </div>
        </div>

        {/* RIGHT — Search + actions */}
        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto flex-wrap justify-start md:justify-end">

          <div className="flex items-center gap-2 md:gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => fetchStudents(false)}
                  variant="ghost"
                  className={`h-11 w-11 p-0 rounded-2xl shrink-0 transition-all active:scale-95 ${isDarkMode ? 'text-slate-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                >
                  <RefreshCw className={loading ? "animate-spin" : ""} size={17} />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Refresh Data</p></TooltipContent>
            </Tooltip>

            <div className="relative flex-1 min-w-[220px] md:min-w-[280px] group">
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10 transition-colors ${isDarkMode ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-500'}`} />
              <Input
                placeholder="Search name, LRN, tracking ID…"
                className={`h-11 pl-10 w-full rounded-2xl border font-semibold text-sm transition-all duration-200 focus:ring-2 focus:ring-blue-500/25 ${isDarkMode ? 'bg-slate-800/70 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500/60' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white'}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setExportOpen(!exportOpen)}
                    className={`h-11 sm:px-4 px-3 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all active:scale-95 flex items-center gap-2 border ${isDarkMode
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
                        : 'bg-slate-900 text-white hover:bg-slate-800 border-slate-800'
                      }`}
                  >
                    <FileDown size={14} />
                    <span className="hidden sm:inline">Export</span>
                    <ChevronDown size={11} className={`hidden sm:block transition-transform duration-200 ${exportOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Export as Excel</p></TooltipContent>
              </Tooltip>

              {/* Desktop dropdown */}
              {exportOpen && (
                <div className={`hidden sm:block absolute top-full right-0 mt-2 w-44 rounded-2xl shadow-2xl border overflow-hidden z-[9999] animate-in fade-in zoom-in-95 duration-150 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                  <div className="p-1.5 space-y-0.5">
                    {['All', 'Pending', 'Accepted', 'Rejected'].map((type) => (
                      <button
                        key={type}
                        onClick={() => { exportToCSV(type); setExportOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                      >
                        {type} Records
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mobile modal — rendered via portal so it escapes all stacking contexts */}
              {mounted && exportOpen && createPortal(
                <div className="fixed inset-0 z-[9999] sm:hidden flex items-center justify-center p-6">
                  {/* Backdrop */}
                  <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setExportOpen(false)}
                  />
                  {/* Modal card */}
                  <div className={`relative w-full max-w-sm rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden ${isDarkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-100'}`}>
                    {/* Top gradient strip */}
                    <div className="h-[3px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400" />
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-5">
                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-[0.35em] ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`}>Export as Excel</p>
                          <p className={`text-lg font-black mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Select Records</p>
                          <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Choose which records to download</p>
                        </div>
                        <button
                          onClick={() => setExportOpen(false)}
                          className={`p-2 rounded-xl transition-colors shrink-0 ${isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      {/* Options */}
                      <div className="space-y-2">
                        {[
                          { type: 'All',      desc: 'Every applicant on record' },
                          { type: 'Pending',  desc: 'Awaiting review' },
                          { type: 'Accepted', desc: 'Approved applicants' },
                          { type: 'Rejected', desc: 'Declined applicants' },
                        ].map(({ type, desc }) => (
                          <button
                            key={type}
                            onClick={() => { exportToCSV(type); setExportOpen(false); }}
                            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.98] border ${isDarkMode ? 'border-slate-800 hover:border-blue-500/40 hover:bg-blue-500/10 text-slate-300 hover:text-white' : 'border-slate-100 hover:border-blue-200 hover:bg-blue-50 text-slate-700 hover:text-blue-700'}`}
                          >
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider">{type} Records</p>
                              <p className={`text-[9px] mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{desc}</p>
                            </div>
                            <FileDown size={14} className={`shrink-0 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
ApplicantsHeader.displayName = "ApplicantsHeader"