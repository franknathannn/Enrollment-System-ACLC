import { memo } from "react"
import { ThemedText } from "@/components/ThemedText"
import { Badge } from "@/components/ui/badge"
import { Layers, Activity, Users } from "lucide-react"

export const SectionCard = memo(function SectionCard({ section, isSelected, isDarkMode, config }: any) {
  // --- LOGIC RETAINED & CALCULATIONS FIXED ---
  const activeStudents = section.students?.filter((s: any) => s.status === 'Accepted' || s.status === 'Approved') || []
  const mCount = activeStudents.filter((s: any) => s.gender === 'Male').length
  const fCount = activeStudents.filter((s: any) => s.gender === 'Female').length
  const capacity = section.capacity || 40
  
  const fillPercent = (activeStudents.length / capacity) * 100
  const mP = Math.min((mCount / capacity) * 100, 100)
  const fP = Math.min((fCount / capacity) * 100, 100)
  const isFull = activeStudents.length >= capacity
  const isICT = section.strand === 'ICT';

  // --- DYNAMIC EQUILIBRIUM LOGIC ---
  const getFinishLinePosition = () => {
    if (mP > 50) return `${mP}%`;       
    if (fP > 50) return `${100 - fP}%`; 
    return '50%';                       
  };

  // 🎨 MOBILE-OPTIMIZED THEME ENGINE
  const theme = {
    surface: isDarkMode ? 'bg-slate-900/70' : 'bg-white',
    border: isDarkMode ? 'border-white/10' : 'border-slate-200',
    inner: isDarkMode ? 'bg-black/40' : 'bg-slate-50',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSub: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    track: isDarkMode ? 'bg-slate-950/50' : 'bg-slate-200', 
    shadow: isDarkMode ? 'shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)]' : 'shadow-lg shadow-slate-200/50',
    line: isDarkMode ? 'bg-white' : 'bg-slate-900',
    hover: isDarkMode ? 'active:bg-slate-800/60' : 'active:bg-slate-100'
  };

  return (
    <div
      className={`
        relative overflow-hidden h-full w-full
        rounded-2xl sm:rounded-[28px]
        border transition-all duration-300
        ${theme.surface} ${theme.border} ${theme.shadow}
        ${isSelected ? `ring-2 ring-offset-1 ${isICT ? 'ring-blue-500/70' : 'ring-orange-500/70'}` : ''}
        touch-manipulation
      `}
      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
    >
      {/* Top accent strip — strand-colored */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] z-10 ${
        isICT ? 'bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400'
              : 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400'
      }`} />

      {/* Ambient strand glow bg */}
      <div className={`absolute inset-0 pointer-events-none ${
        isICT ? 'bg-gradient-to-br from-blue-500/[0.04] via-transparent to-transparent'
              : 'bg-gradient-to-br from-orange-500/[0.04] via-transparent to-transparent'
      }`} />

      {/* ── HERO HEADER ──────────────────────────────────────── */}
      <div className="flex items-start justify-between px-4 pt-6 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Strand pill icon */}
          <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] tracking-widest text-white ${
            isICT ? 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-md shadow-blue-500/30'
                  : 'bg-gradient-to-br from-orange-500 to-orange-700 shadow-md shadow-orange-500/30'
          }`}>
            {isICT ? 'ICT' : 'GAS'}
          </div>
          <div className="min-w-0">
            <p className={`text-3xl font-black uppercase italic tracking-tighter leading-none truncate ${theme.textMain}`}>
              {section.section_name}
            </p>
            <p className={`text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5 opacity-40 ${theme.textSub}`}>
              SY.{config?.school_year || "2025"}
            </p>
          </div>
        </div>

        {/* FULL badge or activity pulse */}
        {isFull ? (
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-white animate-pulse ${
            isICT ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                  : 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]'
          }`}>FULL</span>
        ) : (
          <Activity size={16} className={`${isICT ? 'text-blue-500/25' : 'text-orange-500/25'} animate-pulse shrink-0 mt-1`} />
        )}
      </div>

      {/* ── CAPACITY BLOCK ───────────────────────────────────── */}
      <div className="px-4 pb-3">
        {/* Big fill % + count */}
        <div className="flex items-baseline justify-between mb-2">
          <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub} opacity-50 flex items-center gap-1`}>
            <Layers size={10} /> Capacity
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black tabular-nums leading-none ${isFull ? 'text-red-400' : theme.textMain}`}>
              {Math.round(fillPercent)}<span className={`text-sm font-bold opacity-50`}>%</span>
            </span>
            <span className={`text-[10px] font-black tabular-nums ${theme.textSub} opacity-40`}>
              {activeStudents.length}/{capacity}
            </span>
          </div>
        </div>

        {/* Combined M/F progress bar */}
        <div className={`relative w-full rounded-full overflow-hidden h-3 ${theme.track} border ${theme.border}`}>
          <div style={{ width: `${mP}%` }} className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-700 to-blue-400 transition-all duration-1000 ease-out" />
          <div style={{ width: `${fP}%` }} className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-pink-700 to-pink-400 transition-all duration-1000 ease-out" />
          <div style={{ left: getFinishLinePosition() }} className={`absolute top-0 bottom-0 z-10 -translate-x-1/2 w-[2px] mix-blend-difference opacity-60 ${theme.line}`} />
        </div>
      </div>

      {/* ── GENDER TILES ─────────────────────────────────────── */}
      <div className={`grid grid-cols-2 gap-px border-t ${theme.border} mx-0`}>
        {/* Males */}
        <div className={`flex items-center justify-between px-4 py-3 ${isDarkMode ? 'bg-blue-950/20' : 'bg-blue-50/50'}`}>
          <div>
            <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-0.5 flex items-center gap-1">
              <Users size={9} /> M
            </p>
            <span className={`text-3xl font-black tabular-nums text-blue-400 leading-none ${isDarkMode ? 'drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]' : ''}`}>
              {mCount}
            </span>
          </div>
          {/* Mini M bar */}
          <div className={`w-1.5 h-10 rounded-full overflow-hidden ${isDarkMode ? 'bg-blue-950/60' : 'bg-blue-100'}`}>
            <div className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-full transition-all duration-700" style={{ height: `${mP}%`, marginTop: `${100 - mP}%` }} />
          </div>
        </div>

        {/* Females */}
        <div className={`flex items-center justify-between px-4 py-3 border-l ${theme.border} ${isDarkMode ? 'bg-pink-950/20' : 'bg-pink-50/50'}`}>
          <div>
            <p className="text-[8px] font-black text-pink-500 uppercase tracking-widest mb-0.5 flex items-center gap-1">
              <Users size={9} /> F
            </p>
            <span className={`text-3xl font-black tabular-nums text-pink-400 leading-none ${isDarkMode ? 'drop-shadow-[0_0_10px_rgba(244,114,182,0.5)]' : ''}`}>
              {fCount}
            </span>
          </div>
          {/* Mini F bar */}
          <div className={`w-1.5 h-10 rounded-full overflow-hidden ${isDarkMode ? 'bg-pink-950/60' : 'bg-pink-100'}`}>
            <div className="w-full bg-gradient-to-t from-pink-600 to-pink-400 rounded-full transition-all duration-700" style={{ height: `${fP}%`, marginTop: `${100 - fP}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
})