import { memo, useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Copy, Shield, RotateCcw, Activity, Star, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { ThemedCard } from "@/components/ThemedCard"
import { OptimizedImage } from "./OptimizedImage"
import { toast } from "sonner"
import { AnimatedText, AnimatedNumber } from "../../dashboard/components/primitives"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ScheduleModal } from "./ScheduleModal"

interface EnrolledTableProps {
  students: any[]
  isDarkMode: boolean
  onView: (student: any) => void
  onReset: (student: any) => void

  animatingIds?: Set<string>
  totalCount: number
  totalFilteredCount: number
  currentPage: number
  totalPages: number
  setCurrentPage: (page: number) => void
  loading?: boolean
}

// ── Compact Header Pagination ─────────────────────────────────────────────
const HeaderPagination = ({ currentPage, totalPages, setCurrentPage, isDarkMode }: {
  currentPage: number
  totalPages: number
  setCurrentPage: (p: number) => void
  isDarkMode: boolean
}) => {
  const canPrev = currentPage > 1
  const canNext = currentPage < totalPages

  const baseBtn = "flex items-center justify-center w-7 h-7 rounded-lg border transition-all active:scale-90"
  const darkBtn = "border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
  const lightBtn = "border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-900"

  return (
    <div className="flex items-center justify-center gap-2 w-[140px]">
      <button
        onClick={(e) => { e.stopPropagation(); if (canPrev) setCurrentPage(currentPage - 1); }}
        className={`${baseBtn} ${isDarkMode ? darkBtn : lightBtn} ${!canPrev ? 'opacity-20 cursor-not-allowed' : ''}`}
        disabled={!canPrev}
      >
        <ChevronLeft size={14} strokeWidth={2.5} />
      </button>
      
      <div className="flex items-center justify-center gap-1 min-w-[36px]">
        <span className={`text-[11px] font-black tabular-nums ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
          {currentPage}
        </span>
        <span className="text-[10px] font-bold opacity-30 mx-0.5">/</span>
        <span className="text-[10px] font-bold opacity-40">
          {totalPages}
        </span>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); if (canNext) setCurrentPage(currentPage + 1); }}
        className={`${baseBtn} ${isDarkMode ? darkBtn : lightBtn} ${!canNext ? 'opacity-20 cursor-not-allowed' : ''}`}
        disabled={!canNext}
      >
        <ChevronRight size={14} strokeWidth={2.5} />
      </button>
    </div>
  )
}

const handleCopyLRN = (e: React.MouseEvent, lrn: string) => {
  e.stopPropagation()
  navigator.clipboard.writeText(lrn)
  toast.success("LRN Has been Copied", {
    style: { fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }
  })
}

export const EnrolledTable = memo(({ 
  students, isDarkMode, onView, onReset, animatingIds,
  totalCount, totalFilteredCount, currentPage, totalPages, setCurrentPage, loading
}: EnrolledTableProps) => {
  const [scheduleStudent, setScheduleStudent] = useState<any>(null)

  const visibleStudents = useMemo(() => {
    // 5-item pagination is strictly enforced here
    if (students.length > 5 || (students.length === totalFilteredCount && totalFilteredCount > 5)) {
      const startIndex = (currentPage - 1) * 5
      const endIndex = startIndex + 5
      return students.slice(startIndex, endIndex)
    }
    return students
  }, [students, currentPage, totalFilteredCount])

  if (students.length === 0) {
    return (
      <div className="text-center py-20 opacity-50 text-sm font-bold uppercase tracking-widest">
        No enrolled students found matching criteria.
      </div>
    )
  }

  const theme = {
    cardBg: isDarkMode ? 'bg-slate-900/60' : 'bg-white',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSub: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    border: isDarkMode ? 'border-white/10' : 'border-slate-200',
    innerBg: isDarkMode ? 'bg-black/40' : 'bg-slate-50',
    dockBg: isDarkMode ? 'bg-slate-950/80' : 'bg-slate-100/80',
    shadow: isDarkMode ? 'shadow-[0_15px_30px_-10px_rgba(0,0,0,0.6)]' : 'shadow-lg shadow-slate-200/50'
  }

  return (
    <>
      <style jsx global>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={!!scheduleStudent}
        onClose={() => setScheduleStudent(null)}
        student={scheduleStudent}
        isDarkMode={isDarkMode}
      />

      <div className="w-full space-y-6">
        {/* Mobile View */}
        <div className="md:hidden space-y-6">
          {visibleStudents.map((s: any) => {
            const isAnimatingIn = animatingIds?.has(s.id)
            const isMale = s.gender !== 'Female'
            const isLocked = s.is_locked

            return (
              <ThemedCard
                key={s.id}
                className={`rounded-[32px] overflow-hidden border transition-all duration-500 transform-gpu relative isolate bg-clip-padding outline outline-1 outline-transparent w-full ${theme.cardBg} ${theme.border} ${theme.shadow} ${isAnimatingIn ? 'animate-in fade-in zoom-in-95 slide-in-from-right-10 duration-700' : ''}`}
                style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
              >
                {/* Same Mobile Row Content as before, but using visibleStudents */}
                {/* Lock overlay indicator */}
                {isLocked && (
                  <div className="absolute inset-0 pointer-events-none z-10 rounded-[32px]" style={{ background: "rgba(239,68,68,0.04)", border: "1.5px solid rgba(239,68,68,0.15)" }} />
                )}

                {/* Bio-Header */}
                <div className="p-5 flex items-center gap-5 relative">
                  <div className={`absolute left-0 top-6 bottom-6 w-1.5 rounded-r-full ${isLocked ? 'bg-red-500' : isMale ? 'bg-blue-500' : 'bg-pink-500'}`} />

                  <div className="relative shrink-0">
                    <button type="button" onClick={(e) => { e.stopPropagation(); onView(s) }} className={`cursor-pointer relative p-0 bg-transparent border-none ${isLocked ? 'opacity-60 grayscale' : ''}`}>
                      <div className={`w-16 h-16 rounded-2xl p-1 border-2 relative z-10 ${isLocked ? 'border-red-500/30' : isMale ? 'border-blue-500/30' : 'border-pink-500/30'}`}>
                        <OptimizedImage src={s.two_by_two_url || s.profile_2x2_url || s.profile_picture || `https://api.dicebear.com/7.x/initials/svg?seed=${s.last_name}`} className="w-full h-full object-cover rounded-xl" alt="Student" />
                      </div>
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-black text-lg uppercase leading-none tracking-tighter truncate ${theme.textMain} ${isLocked ? 'opacity-60' : ''}`}>
                        <AnimatedText text={`${s.last_name}, ${s.first_name}`} />
                      </h3>
                      {isLocked && (
                        <span className="px-2 py-0.5 rounded-lg bg-red-500/15 text-red-500 text-[8px] font-black uppercase tracking-widest">Deactivated</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`text-[8px] font-black uppercase px-2 py-0 border-none rounded-md ${isMale ? 'bg-blue-500/20 text-blue-500' : 'bg-pink-500/20 text-pink-500'}`}>{s.gender}</Badge>
                      <div className="flex items-center gap-1.5 opacity-60">
                        <span className={`text-[9px] font-mono font-bold tracking-widest ${theme.textSub}`}>LRN:{s.lrn}</span>
                        <button onClick={(e) => handleCopyLRN(e, s.lrn)} className={`p-1 rounded-md transition-all active:scale-90 ${theme.innerBg}`}>
                          <Copy size={10} className={theme.textSub} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Grid */}
                <div className="px-5 pb-3 grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-2xl border flex flex-col items-center gap-1 ${theme.innerBg} ${theme.border}`}>
                    <Activity size={12} className="text-slate-500 opacity-40" />
                    <p className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em]">Category</p>
                    <p className={`text-[10px] font-black uppercase ${theme.textMain}`}>{s.student_category || "Standard"}</p>
                  </div>
                  <div className={`p-3 rounded-2xl border flex flex-col items-center gap-1 ${theme.innerBg} ${theme.border}`}>
                    <Star size={12} className="text-blue-500 opacity-50" />
                    <p className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em]">GWA Index</p>
                    <p className="text-[12px] font-black italic text-blue-500">
                      {s.gwa_grade_10 ? <AnimatedNumber value={parseFloat(s.gwa_grade_10)} /> : "0.00"}
                    </p>
                  </div>
                  <div className={`p-3 rounded-2xl border flex flex-col items-center gap-1 ${theme.innerBg} ${theme.border}`}>
                    <p className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em]">Strand</p>
                    <p className={`text-[10px] font-black uppercase ${s.strand === 'ICT' ? 'text-blue-500' : 'text-orange-500'}`}>{s.strand}</p>
                  </div>
                  <div className={`p-3 rounded-2xl border flex flex-col items-center gap-1 ${theme.innerBg} ${theme.border}`}>
                    <p className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em]">Section</p>
                    <p className={`text-[10px] font-black uppercase truncate max-w-full ${!s.section || s.section === 'Unassigned' ? 'text-red-500' : theme.textMain}`}>
                      {s.section || 'Unassigned'}
                    </p>
                  </div>
                </div>

                {/* Action Dock */}
                <div className={`p-2 flex items-center gap-1.5 border-t ${theme.dockBg} ${theme.border}`}>
                    {s.section && s.section !== 'Unassigned' && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={(e) => { e.stopPropagation(); setScheduleStudent(s); }} 
                        className={`flex-1 h-12 rounded-2xl text-[9px] font-black uppercase tracking-widest text-blue-500 transition-all active:scale-95 ${isDarkMode ? 'hover:bg-blue-600 hover:text-white' : 'hover:bg-blue-500 hover:text-white'}`}
                      >
                        <CalendarDays size={14} className="mr-2" /> Schedule
                      </Button>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={(e) => { e.stopPropagation(); onReset(s); }} 
                      className={`flex-1 h-12 rounded-2xl text-[9px] font-black uppercase tracking-widest text-amber-600 transition-all active:scale-95 ${isDarkMode ? 'hover:bg-amber-600 hover:text-white' : 'hover:bg-amber-500 hover:text-white'}`}
                    >
                      <RotateCcw size={14} className="mr-2" /> Reset
                    </Button>

                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={(e) => { e.stopPropagation(); onView(s); }} 
                      className={`w-12 h-12 p-0 rounded-2xl transition-all active:scale-95 ${isDarkMode ? 'text-slate-400 hover:bg-white hover:text-slate-900' : 'text-slate-500 hover:bg-slate-900 hover:text-white'}`}
                    >
                      <Eye size={18} />
                    </Button>
                </div>
              </ThemedCard>
            )
          })}

          {/* Mobile Bottom Pagination */}
          {totalPages > 1 && (
            <div className="pt-4 flex justify-center">
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
                isDarkMode={isDarkMode}
                compact
              />
            </div>
          )}
        </div>

        {/* Desktop View - Premium SaaS Rows */}
        <div className="hidden md:block overflow-x-hidden pb-4">
          <Table className="border-separate border-spacing-y-4 w-full table-fixed">
            <TableHeader className="bg-transparent">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="pl-12 py-2 font-black uppercase text-[10px] tracking-widest text-slate-500 w-[30%]">Student Identity</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-center text-slate-500 w-[7%]">Gender</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-center text-slate-500 w-[7%]">Strand</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-center text-slate-500 w-[12%]">Section</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-center text-slate-500 w-[12%]">Category</TableHead>
                <TableHead className="text-right pr-12 font-black uppercase text-[10px] tracking-widest text-slate-500 w-[32%]">
                  <div className="flex items-center justify-end gap-3">
                    {totalPages > 1 && (
                      <HeaderPagination 
                        currentPage={currentPage} 
                        totalPages={totalPages} 
                        setCurrentPage={setCurrentPage} 
                        isDarkMode={isDarkMode} 
                      />
                    )}
                    <span>Actions</span>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleStudents.map((s: any) => {
                const isMale = s.gender !== 'Female'
                const isAnimatingIn = animatingIds?.has(s.id)
                const isLocked = s.is_locked

                return (
                  <TableRow
                    key={s.id}
                    className={`group transition-all duration-300 relative isolate border-none ${isAnimatingIn ? 'animate-[slideInRight_0.5s_ease-out_backwards]' : ''}`}
                  >
                    {/* Multi-Cell rounded row implementation */}
                    <TableCell className={`pl-12 py-5 rounded-l-[32px] border-y border-l transition-all duration-300 ${theme.cardBg} ${theme.border} group-hover:bg-blue-500/[0.03] dark:group-hover:bg-blue-400/[0.03]`}>
                       <div className="flex items-center gap-4">
                         <div className="relative">
                           <div className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all duration-500 group-hover:scale-110 group-hover:rotate-2 ${isLocked ? 'border-red-500/30 grayscale' : isMale ? 'border-blue-500/30' : 'border-pink-500/30'}`}>
                             <OptimizedImage src={s.profile_picture || s.two_by_two_url || s.profile_2x2_url} alt="Avatar" className="w-full h-full object-cover" />
                           </div>
                           <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest text-white shadow-md z-10 ${s.student_category?.includes('ALS') ? 'bg-orange-500' : 'bg-blue-500'}`}>
                             {s.student_category?.includes('ALS') ? 'ALS' : 'JHS'}
                           </div>
                         </div>
                         <div>
                            <p onClick={() => onView(s)} className={`font-black text-base uppercase leading-none tracking-tight cursor-pointer transition-colors duration-300 ${theme.textMain} group-hover:text-blue-500`}>
                              <AnimatedText text={`${s.last_name}, ${s.first_name}`} /> <span className="text-[10px] opacity-40 font-black italic">{s.middle_name?.[0]}.</span>
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Shield size={10} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
                              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">LRN:{s.lrn}</p>
                            </div>
                         </div>
                       </div>
                    </TableCell>

                    <TableCell className={`text-center border-y transition-all duration-300 ${theme.cardBg} ${theme.border} group-hover:bg-blue-500/[0.03] dark:group-hover:bg-blue-400/[0.03]`}>
                       <span className={`text-[10px] font-black uppercase ${isMale ? 'text-blue-500' : 'text-pink-500'}`}>{s.gender}</span>
                    </TableCell>

                    <TableCell className={`text-center border-y transition-all duration-300 ${theme.cardBg} ${theme.border} group-hover:bg-blue-500/[0.03] dark:group-hover:bg-blue-400/[0.03]`}>
                       <Badge className={`border-none px-3 py-1 text-[9px] font-black uppercase transition-all duration-300 group-hover:scale-110 ${s.strand === 'ICT' ? (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-50 text-orange-600')}`}>
                         {s.strand}
                       </Badge>
                    </TableCell>

                    <TableCell className={`text-center border-y transition-all duration-300 ${theme.cardBg} ${theme.border} group-hover:bg-blue-500/[0.03] dark:group-hover:bg-blue-400/[0.03]`}>
                       <span className={`text-[10px] font-black uppercase transition-colors duration-300 ${s.section && s.section !== 'Unassigned' ? (s.strand === 'ICT' ? 'text-blue-500' : 'text-orange-500') : 'text-slate-400 italic'}`}>
                        {s.section || "Unassigned"}
                       </span>
                    </TableCell>

                    <TableCell className={`text-center border-y transition-all duration-300 ${theme.cardBg} ${theme.border} group-hover:bg-blue-500/[0.03] dark:group-hover:bg-blue-400/[0.03]`}>
                       <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${s.student_category?.includes('ALS') ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                        {s.student_category || 'Regular'}
                       </span>
                    </TableCell>





                    <TableCell className={`pr-12 text-right rounded-r-[32px] border-y border-r transition-all duration-300 ${theme.cardBg} ${theme.border} group-hover:bg-blue-500/[0.03]`}>
                       <div className="flex items-center justify-end gap-2 whitespace-nowrap shrink-0">
                          {s.section && s.section !== 'Unassigned' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setScheduleStudent(s); }}
                                  className="h-9 px-4 rounded-xl text-blue-500 font-black text-[9px] uppercase tracking-[0.2em] transition-all inline-flex items-center justify-center bg-transparent border-0"
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgb(59 130 246)'
                                    e.currentTarget.style.color = 'white'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent'
                                    e.currentTarget.style.color = 'rgb(59 130 246)'
                                  }}
                                >
                                  <CalendarDays size={14} className="mr-2" /> Schedule
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-blue-900 text-blue-100 border-blue-800"><p>View Subject Schedule</p></TooltipContent>
                            </Tooltip>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button 
                                onClick={(e) => { e.stopPropagation(); onReset(s); }}
                                className="h-9 px-4 rounded-xl text-amber-600 font-black text-[9px] uppercase tracking-[0.2em] transition-all inline-flex items-center justify-center bg-transparent border-0"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'rgb(245 158 11)'
                                  e.currentTarget.style.color = 'white'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent'
                                  e.currentTarget.style.color = 'rgb(217 119 6)'
                                }}
                              >
                                <RotateCcw size={14} className="mr-2" /> Reset
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-amber-900 text-amber-100 border-amber-800"><p>Reset Credentials</p></TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button 
                                onClick={(e) => { e.stopPropagation(); onView(s); }}
                                className="h-9 w-9 p-0 rounded-xl transition-all inline-flex items-center justify-center text-slate-400 bg-transparent border-0"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = isDarkMode ? 'white' : 'rgb(15 23 42)'
                                  e.currentTarget.style.color = isDarkMode ? 'rgb(15 23 42)' : 'white'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent'
                                  e.currentTarget.style.color = 'rgb(148 163 184)'
                                }}
                              >
                                <Eye size={16} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>View Profile</p></TooltipContent>
                          </Tooltip>
                       </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {/* Desktop Bottom Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
                isDarkMode={isDarkMode}
                totalCount={totalCount}
                totalShowing={visibleStudents.length}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
})

// ── Modern 5-window Pagination ─────────────────────────────────────────────
function PaginationBar({
  currentPage, totalPages, setCurrentPage, isDarkMode,
  totalShowing, totalCount, compact = false,
}: {
  currentPage: number
  totalPages: number
  setCurrentPage: (p: number) => void
  isDarkMode: boolean
  totalShowing?: number
  totalCount?: number
  compact?: boolean
}) {
  const canPrev = currentPage > 1
  const canNext = currentPage < totalPages

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p >= currentPage - 2 && p <= currentPage + 2)

  const showFirstPage  = pages[0] > 1
  const showLastPage   = pages[pages.length - 1] < totalPages
  const showStartDots  = pages[0] > 2
  const showEndDots    = pages[pages.length - 1] < totalPages - 1

  const c = isDarkMode
    ? { border: 'rgba(51,65,85,0.7)', text: '#94a3b8', hover: 'rgba(51,65,85,0.45)', activeBg: 'rgba(59,130,246,0.18)', activeBorder: '#3b82f6', activeText: '#93c5fd', dots: '#475569' }
    : { border: '#e2e8f0',            text: '#64748b', hover: '#f1f5f9',              activeBg: '#eff6ff',               activeBorder: '#2563eb',  activeText: '#2563eb',  dots: '#94a3b8' }

  const base: React.CSSProperties = {
    height: 38, minWidth: 38, borderRadius: 12,
    border: `1.5px solid ${c.border}`, background: 'transparent',
    color: c.text, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, transition: 'all 0.14s ease',
    padding: '0 10px', userSelect: 'none' as const,
  }
  const active: React.CSSProperties = {
    ...base, background: c.activeBg, border: `1.5px solid ${c.activeBorder}`,
    color: c.activeText, fontWeight: 900,
  }
  const nav = (enabled: boolean): React.CSSProperties => ({
    ...base,
    gap: 6, padding: '0 15px',
    fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' as const,
    ...(enabled ? {} : { opacity: 0.32, cursor: 'not-allowed' as const }),
  })
  const dot: React.CSSProperties = {
    height: 38, minWidth: 26,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, color: c.dots, fontWeight: 700, userSelect: 'none' as const,
    letterSpacing: 2,
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: compact ? 'center' : 'space-between', gap: 10, width: '100%' }}>
      {!compact && totalShowing !== undefined && (
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: c.text }}>
          Showing {totalShowing} of {totalCount}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button style={nav(canPrev)} disabled={!canPrev} onClick={() => canPrev && setCurrentPage(currentPage - 1)}>
          <ChevronLeft size={14} strokeWidth={2.5} />
          {!compact && <span>Prev</span>}
        </button>

        {showFirstPage && (
          <>
            <button style={base} onClick={() => setCurrentPage(1)}>1</button>
            {showStartDots && <span style={dot}>···</span>}
          </>
        )}

        {pages.map(p => (
          <button key={p} style={p === currentPage ? active : base} onClick={() => setCurrentPage(p)}>{p}</button>
        ))}

        {showLastPage && (
          <>
            {showEndDots && <span style={dot}>···</span>}
            <button style={base} onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
          </>
        )}

        <button style={nav(canNext)} disabled={!canNext} onClick={() => canNext && setCurrentPage(currentPage + 1)}>
          {!compact && <span>Next</span>}
          <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}

EnrolledTable.displayName = "EnrolledTable"

EnrolledTable.displayName = "EnrolledTable"