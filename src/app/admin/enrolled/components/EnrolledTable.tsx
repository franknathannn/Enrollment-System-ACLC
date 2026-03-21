import { memo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Copy, Shield, RotateCcw, Activity, Star, CalendarDays, Power, PowerOff } from "lucide-react"
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
  onToggleStatus: (student: any) => void
  animatingIds?: Set<string>
}

const handleCopyLRN = (e: React.MouseEvent, lrn: string) => {
  e.stopPropagation()
  navigator.clipboard.writeText(lrn)
  toast.success("LRN Has been Copied", {
    style: { fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }
  })
}

export const EnrolledTable = memo(({ students, isDarkMode, onView, onReset, onToggleStatus, animatingIds }: EnrolledTableProps) => {
  const [scheduleStudent, setScheduleStudent] = useState<any>(null)

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

      <ThemedCard
        className="rounded-[32px] overflow-hidden border shadow-xl transition-colors duration-500 w-full"
        style={{
          backgroundColor: isDarkMode ? 'rgb(2 6 23)' : '#ffffff',
          borderColor: isDarkMode ? 'rgb(30 41 59)' : 'rgb(241 245 249)',
          width: '100%', maxWidth: '100%'
        }}
      >
        {/* ── MOBILE VIEW ── */}
        <div className="md:hidden space-y-6 px-3 pb-10 pt-4">
          {students.map((s: any) => {
            const isAnimatingIn = animatingIds?.has(s.id)
            const isMale = s.gender !== 'Female'
            const isLocked = s.is_locked

            return (
              <div
                key={s.id}
                className={`rounded-[32px] overflow-hidden border transition-all duration-500 transform-gpu relative isolate bg-clip-padding outline outline-1 outline-transparent w-full ${theme.cardBg} ${theme.border} ${theme.shadow} ${isAnimatingIn ? 'animate-in fade-in zoom-in-95 slide-in-from-right-10 duration-700' : ''}`}
                style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
              >
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
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onView(s) }} className={`flex-1 h-11 rounded-2xl text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
                    <Eye size={14} className="mr-1.5" /> View
                  </Button>
                  {s.section && s.section !== 'Unassigned' && (
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setScheduleStudent(s) }} className={`flex-1 h-11 rounded-2xl text-[8px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all active:scale-95`}>
                      <CalendarDays size={14} className="mr-1.5" /> Schedule
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onToggleStatus(s) }} className={`flex-1 h-11 rounded-2xl text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 ${isLocked ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}>
                    {isLocked ? <Power size={14} className="mr-1.5" /> : <PowerOff size={14} className="mr-1.5" />}
                    {isLocked ? 'Activate' : 'Deactivate'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onReset(s) }} className="flex-1 h-11 rounded-2xl text-[8px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all active:scale-95">
                    <RotateCcw size={14} className="mr-1.5" /> Reset
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── DESKTOP TABLE ── */}
        <div className="hidden md:block">
          <Table className="border-separate border-spacing-0">
            <TableHeader
              className="transition-colors duration-500"
              style={{ backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgb(248 250 252)' }}
            >
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="pl-8 py-6 font-black uppercase text-[10px] tracking-widest" style={{ color: 'grey' }}>Student Identity</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-center" style={{ color: 'grey' }}>Gender</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-center" style={{ color: 'grey' }}>Strand</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-center" style={{ color: 'grey' }}>Section</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-center" style={{ color: 'grey' }}>Category</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-center" style={{ color: 'grey' }}>Status</TableHead>
                <TableHead className="text-right pr-8 font-black uppercase text-[10px] tracking-widest" style={{ color: 'grey' }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s: any) => {
                const isMale = s.gender !== 'Female'
                const isAnimatingIn = animatingIds?.has(s.id)
                const isLocked = s.is_locked

                return (
                  <TableRow
                    key={s.id}
                    className={`border-b transition-colors group relative ${isAnimatingIn ? 'animate-[slideInRight_0.5s_ease-out_backwards]' : ''} ${isLocked ? 'opacity-60' : ''}`}
                    style={{
                      borderColor: isDarkMode ? 'rgba(77, 87, 100, 0.4)' : 'rgba(231, 229, 229, 0.53)',
                      animationFillMode: isAnimatingIn ? 'backwards' : 'none',
                      backgroundColor: isLocked ? (isDarkMode ? 'rgba(239,68,68,0.04)' : 'rgba(239,68,68,0.02)') : undefined
                    }}
                    onMouseEnter={(e) => {
                      if (!isLocked) e.currentTarget.style.backgroundColor = isDarkMode
                        ? (isMale ? 'rgba(59,130,246,0.15)' : 'rgba(236,72,153,0.15)')
                        : (isMale ? 'rgba(59,130,246,0.08)' : 'rgba(236,72,153,0.08)')
                    }}
                    onMouseLeave={(e) => { if (!isLocked) e.currentTarget.style.backgroundColor = '' }}
                  >
                    {/* Identity */}
                    <TableCell className="pl-8 py-5 relative">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" onClick={() => onView(s)} className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all group-hover:scale-105 cursor-pointer p-0 ${
                                isLocked
                                  ? 'border-red-300/40 grayscale'
                                  : isMale
                                    ? 'border-blue-300/40 group-hover:border-blue-500 group-hover:shadow-[0_0_25px_rgba(59,130,246,0.6)]'
                                    : 'border-pink-300/40 group-hover:border-pink-500 group-hover:shadow-[0_0_25px_rgba(236,72,153,0.6)]'
                              }`}>
                                <OptimizedImage src={s.profile_picture || s.two_by_two_url || s.profile_2x2_url} alt="Avatar" className="w-full h-full object-cover" fallback={`https://api.dicebear.com/7.x/initials/svg?seed=${s.last_name}`} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="p-0 bg-transparent border-none shadow-none ml-4">
                              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl text-white min-w-[250px]">
                                <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-white/10 shrink-0 bg-slate-800">
                                  <OptimizedImage src={s.two_by_two_url || s.profile_2x2_url || s.profile_picture || `https://api.dicebear.com/7.x/initials/svg?seed=${s.last_name}`} alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-black uppercase text-sm truncate">{s.last_name}, {s.first_name}</p>
                                  <p className="text-[10px] font-bold text-blue-400 tracking-widest mb-1">LRN: {s.lrn}</p>
                                  <Badge variant="outline" className="text-[8px] border-slate-600 text-slate-300 h-5 px-2">{s.strand} - {s.student_category || 'Regular'}</Badge>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                          <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest text-white shadow-sm z-10 whitespace-nowrap ${s.student_category?.toLowerCase().includes('als') ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}>
                            {s.student_category?.toLowerCase().includes('als') ? 'ALS' : 'JHS'}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p onClick={() => onView(s)} className={`font-black text-base uppercase leading-none tracking-tight cursor-pointer hover:underline transition-colors duration-500 ${isDarkMode ? 'text-white group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-600'}`}>
                              <AnimatedText text={`${s.last_name}, ${s.first_name}`} /> <span className="text-[10px] opacity-40 font-black italic">{s.middle_name?.[0]}.</span>
                            </p>
                            {isLocked && <span className="px-2 py-0.5 rounded-lg bg-red-500/15 text-red-500 text-[8px] font-black uppercase tracking-widest">Deactivated</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Shield size={10} className="text-slate-400" />
                            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">LRN:{s.lrn}</p>
                            <button onClick={(e) => handleCopyLRN(e, s.lrn)} className={`p-1 rounded-md transition-all active:scale-90 shadow-sm ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900'}`}>
                              <Copy size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Gender */}
                    <TableCell className="text-center font-black text-[10px] uppercase text-slate-500">
                      <span className={s.gender === 'Female' ? 'text-pink-500' : 'text-blue-500'}>{s.gender}</span>
                    </TableCell>

                    {/* Strand */}
                    <TableCell className="text-center">
                      <Badge className={`border-none px-3 py-1 text-[9px] font-black uppercase ${s.strand === 'ICT' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{s.strand}</Badge>
                    </TableCell>

                    {/* Section */}
                    <TableCell className="text-center">
                      <span className={`text-[10px] font-black uppercase ${s.section && s.section !== 'Unassigned' ? (s.strand === 'ICT' ? 'text-blue-500' : 'text-orange-500') : 'text-slate-400 italic'}`}>
                        {s.section || "Unassigned"}
                      </span>
                    </TableCell>

                    {/* Category */}
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${s.student_category?.includes('ALS') ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {s.student_category || 'Regular'}
                      </span>
                    </TableCell>

                    {/* Account Status */}
                    <TableCell className="text-center">
                      <button
                        onClick={() => onToggleStatus(s)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 border ${
                          isLocked
                            ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                      >
                        {isLocked ? <PowerOff size={10} /> : <Power size={10} />}
                        {isLocked ? 'Inactive' : 'Active'}
                      </button>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right pr-8">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={() => onView(s)} className="h-9 px-3 rounded-xl text-slate-500 font-black text-[9px] uppercase tracking-widest transition-colors"
                              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgb(71 85 105)'; e.currentTarget.style.color = 'white' }}
                              onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'rgb(100 116 139)' }}
                            >
                              <Eye size={13} className="mr-1.5" /> View
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>View Profile</p></TooltipContent>
                        </Tooltip>

                        {s.section && s.section !== 'Unassigned' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => setScheduleStudent(s)} className="h-9 px-3 rounded-xl text-blue-500 font-black text-[9px] uppercase tracking-widest transition-colors"
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.15)' }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '' }}
                              >
                                <CalendarDays size={13} className="mr-1.5" /> Schedule
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>View Class Schedule</p></TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={() => onReset(s)} className="h-9 px-3 rounded-xl text-amber-600 font-black text-[9px] uppercase tracking-widest transition-colors"
                              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgb(245 158 11)'; e.currentTarget.style.color = 'white' }}
                              onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'rgb(217 119 6)' }}
                            >
                              <RotateCcw size={12} className="mr-1.5" /> Reset
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-amber-900 text-amber-100 border-amber-800"><p>Reset to Pending</p></TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </ThemedCard>
    </>
  )
})

EnrolledTable.displayName = "EnrolledTable"