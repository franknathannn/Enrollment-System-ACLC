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
        p-4 sm:p-6 
        rounded-2xl sm:rounded-[32px]
        border transition-all duration-300
        ${theme.surface} ${theme.border} ${theme.shadow} ${theme.hover}
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        touch-manipulation
        safe-area-inset
      `}
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }}
    >
      {/* 🌈 Strand Identity Pulse Bar - Thicker on mobile */}
      <div className={`
        absolute top-0 left-0 h-full transition-all duration-500
        w-1.5 sm:w-2
        ${isICT ? 'bg-blue-500 shadow-[2px_0_15px_rgba(59,130,246,0.5)]' : 'bg-orange-500 shadow-[2px_0_15px_rgba(249,115,22,0.5)]'}
        ${isSelected ? 'w-2 sm:w-3 opacity-100' : 'opacity-50'}
      `} />

      {/* Header Cluster - Mobile Optimized */}
      <div className="flex justify-between items-start mb-5 sm:mb-8 ml-1 sm:ml-2">
        <div className="space-y-2 sm:space-y-3 flex-1 min-w-0">
          {/* Section Name - Responsive sizing */}
          <ThemedText 
            variant="h2" 
            className={`
              text-xl sm:text-2xl 
              font-black uppercase italic tracking-tighter leading-none 
              ${theme.textMain}
              truncate
            `} 
            isDarkMode={isDarkMode}
          >
            {section.section_name}
          </ThemedText>
          
          {/* Badges - Stack on very small screens */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Badge className={`
              ${isICT ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'} 
              border-none rounded-lg font-black 
              text-[9px] sm:text-[8px]
              uppercase tracking-widest 
              px-2 py-0.5
              whitespace-nowrap
            `}>
              {section.strand} NODE
            </Badge>
            <span className={`
              text-[10px] sm:text-[9px] 
              font-bold uppercase tracking-widest 
              opacity-40 ${theme.textSub}
              whitespace-nowrap
            `}>
              SY.{config?.school_year || "2025"}
            </span>
          </div>
        </div>
        
        {/* Activity Icon - Slightly larger on mobile */}
        <Activity 
          size={20} 
          className={`
            ${isICT ? 'text-blue-500/30' : 'text-orange-500/30'} 
            animate-pulse mt-0.5 sm:mt-1.5
            flex-shrink-0 ml-2
          `} 
        />
      </div>

      {/* 📊 Biometric Analytics Block - Mobile Optimized */}
      <div className={`
        p-4 sm:p-5 
        rounded-xl sm:rounded-[24px] 
        border mb-4 sm:mb-6 
        relative overflow-hidden isolate 
        ${theme.inner} ${theme.border}
      `}>
        {/* Header Row */}
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <div className={`
            flex items-center gap-1.5 sm:gap-2 
            font-black text-[10px] sm:text-[9px]
            uppercase tracking-widest 
            ${theme.textSub}
          `}>
            <Layers size={12} className="flex-shrink-0" /> 
            <span className="hidden xs:inline">Matrix Distribution</span>
            <span className="xs:hidden">Distribution</span>
          </div>
          <span className={`
            text-base sm:text-sm 
            font-black tabular-nums 
            ${theme.textMain}
            whitespace-nowrap
          `}>
            {activeStudents.length} <span className="opacity-20 mx-0.5 sm:mx-1">/</span> {capacity}
          </span>
        </div>

        {/* Enhanced Progress Bar - Taller on mobile for easier viewing */}
        <div className={`
          relative w-full rounded-full overflow-hidden 
          shadow-inner border isolate
          h-4 sm:h-3
          ${theme.track} ${theme.border}
        `}>
          {/* Male Segment */}
          <div 
            style={{ width: `${mP}%` }} 
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-700 to-blue-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.4)]"
          />
          
          {/* Female Segment */}
          <div 
            style={{ width: `${fP}%` }} 
            className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-pink-700 to-pink-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(236,72,153,0.4)]"
          />
          
          {/* DYNAMIC EQUILIBRIUM LINE - More visible on mobile */}
          <div 
            style={{ left: getFinishLinePosition() }}
            className={`
              absolute top-0 bottom-0 z-10 -translate-x-1/2 
              transition-all duration-1000 ease-in-out 
              mix-blend-difference opacity-70
              w-[2.5px] sm:w-[2px]
              ${theme.line} 
              shadow-[0_0_10px_white]
            `} 
          />
        </div>

        {/* Capacity Info - Better spacing on mobile */}
        <div className="mt-3 sm:mt-4 flex justify-between items-center gap-2">
          <p className={`
            text-[9px] sm:text-[8px] 
            font-black uppercase tracking-widest 
            ${theme.textSub}
          `}>
            Registry Capacity
          </p>
          <p className={`
            text-[11px] sm:text-[10px] 
            font-black whitespace-nowrap
            ${isFull ? 'text-red-500' : 'text-emerald-500'}
          `}>
            {Math.round(fillPercent)}% OCCUPIED
          </p>
        </div>
      </div>

      {/* Gender Count Grid - Optimized for mobile touch */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* Males Card */}
        <div 
          className={`
            p-3 sm:p-4 
            rounded-xl sm:rounded-2xl 
            text-center border 
            transition-all duration-300 
            active:scale-95 sm:hover:scale-[1.02]
            ${isDarkMode ? 'bg-slate-950/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'}
          `}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <p className="
            text-[9px] sm:text-[8px] 
            font-black text-blue-500 
            uppercase tracking-widest 
            mb-1.5 sm:mb-1.5 
            flex items-center justify-center gap-1
          ">
            <Users size={11} className="flex-shrink-0" /> Males
          </p>
          <ThemedText 
            variant="h3" 
            className={`
              text-2xl sm:text-xl 
              font-black tabular-nums 
              ${theme.textMain}
            `} 
            isDarkMode={isDarkMode}
          >
            {mCount}
          </ThemedText>
        </div>
        
        {/* Females Card */}
        <div 
          className={`
            p-3 sm:p-4 
            rounded-xl sm:rounded-2xl 
            text-center border 
            transition-all duration-300 
            active:scale-95 sm:hover:scale-[1.02]
            ${isDarkMode ? 'bg-slate-950/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'}
          `}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <p className="
            text-[9px] sm:text-[8px] 
            font-black text-pink-500 
            uppercase tracking-widest 
            mb-1.5 sm:mb-1.5 
            flex items-center justify-center gap-1
          ">
            <Users size={11} className="flex-shrink-0" /> Females
          </p>
          <ThemedText 
            variant="h3" 
            className={`
              text-2xl sm:text-xl 
              font-black tabular-nums 
              ${theme.textMain}
            `} 
            isDarkMode={isDarkMode}
          >
            {fCount}
          </ThemedText>
        </div>
      </div>
    </div>
  )
})