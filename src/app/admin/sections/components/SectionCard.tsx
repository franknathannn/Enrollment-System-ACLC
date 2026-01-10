// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\sections\components\SectionCard.tsx

import { memo } from "react"
// import { ThemedCard } from "@/components/ThemedCard" // <-- REMOVE THIS (It causes the style conflict)
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

  // 🧪 PROP-BASED THEME ENGINE
  // Since we are using a standard div now, these classes will 100% apply
  const theme = {
    surface: isDarkMode ? 'bg-slate-900/60' : 'bg-white',
    border: isDarkMode ? 'border-white/10' : 'border-slate-200',
    inner: isDarkMode ? 'bg-black/40' : 'bg-slate-50',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSub: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    track: isDarkMode ? 'bg-slate-950/50' : 'bg-slate-200', 
    shadow: isDarkMode ? 'shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)]' : 'shadow-xl shadow-slate-200/60',
    line: isDarkMode ? 'bg-white' : 'bg-slate-900',
    hover: isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50' // Added hover effect
  };

  return (
    // CHANGED: Replaced ThemedCard with a standard div to ensure your theme classes apply
    <div 
      className={`p-6 rounded-[32px] transition-all duration-500 relative overflow-hidden group h-full w-full max-w-full bg-clip-padding border ${
        theme.surface} ${theme.border} ${theme.shadow} ${theme.hover} ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-4 ring-offset-transparent' : ''
      }`}
    >
      {/* 🌈 Strand Identity Pulse Bar */}
      <div className={`absolute top-0 left-0 w-2 h-full transition-all duration-500 ${
        isICT ? 'bg-blue-500 shadow-[4px_0_20px_rgba(59,130,246,0.4)]' : 'bg-orange-500 shadow-[4px_0_20px_rgba(249,115,22,0.4)]'
      } ${isSelected ? 'w-3 opacity-100' : 'opacity-40 group-hover:opacity-100'}`} />

      {/* Header Cluster */}
      <div className="flex justify-between items-start mb-8 ml-2">
        <div className="space-y-3">
          {/* Ensure ThemedText receives the isDarkMode prop explicitly */}
          <ThemedText variant="h2" className={`text-2xl font-black uppercase italic tracking-tighter leading-none ${theme.textMain}`} isDarkMode={isDarkMode}>
            {section.section_name}
          </ThemedText>
          <div className="flex items-center gap-3">
            <Badge className={`${isICT ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'} border-none rounded-lg font-black text-[8px] uppercase tracking-widest px-2 py-0.5`}>
                {section.strand} NODE
            </Badge>
            <span className={`text-[9px] font-bold uppercase tracking-widest opacity-40 ${theme.textSub}`}>
                SY.{config?.school_year || "2025"}
            </span>
          </div>
        </div>
        <Activity size={18} className={`${isICT ? 'text-blue-500/30' : 'text-orange-500/30'} animate-pulse mt-1.5`} />
      </div>

      {/* 📊 Biometric Analytics Block */}
      <div className={`p-5 rounded-[24px] border mb-6 relative overflow-hidden isolate ${theme.inner} ${theme.border}`}>
         <div className="flex justify-between items-center mb-4">
            <div className={`flex items-center gap-2 font-black text-[9px] uppercase tracking-widest ${theme.textSub}`}>
              <Layers size={14} /> Matrix Distribution
            </div>
            <span className={`text-sm font-black tabular-nums ${theme.textMain}`}>
              {activeStudents.length} <span className="opacity-20 mx-1">/</span> {capacity}
            </span>
         </div>

         {/* Pure Solid Bar with Dynamic Equilibrium Marker */}
         <div className={`relative h-3 w-full rounded-full overflow-hidden shadow-inner border isolate ${theme.track} ${theme.border}`}>
            {/* Male Segment */}
            <div 
              style={{ width: `${mP}%` }} 
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-700 to-blue-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.3)]"
            />
            {/* Female Segment */}
            <div 
              style={{ width: `${fP}%` }} 
              className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-pink-700 to-pink-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(236,72,153,0.3)]"
            />
            
            {/* DYNAMIC EQUILIBRIUM LINE */}
            <div 
              style={{ left: getFinishLinePosition() }}
              className={`absolute top-0 bottom-0 w-[2px] z-10 -translate-x-1/2 transition-all duration-1000 ease-in-out mix-blend-difference ${theme.line} opacity-60 shadow-[0_0_8px_white]`} 
            />
         </div>

         <div className="mt-4 flex justify-between items-center">
            <p className={`text-[8px] font-black uppercase tracking-widest ${theme.textSub}`}>Registry Capacity</p>
            <p className={`text-[10px] font-black ${isFull ? 'text-red-500' : 'text-emerald-500'}`}>
                {Math.round(fillPercent)}% OCCUPIED
            </p>
         </div>
      </div>

      {/* Staggered Count Units */}
      <div className="grid grid-cols-2 gap-3">
          <div 
            className={`p-4 rounded-2xl text-center border transition-all duration-300 group-hover:scale-[1.02] ${
                isDarkMode ? 'bg-slate-950/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1">
                <Users size={10} /> Males
            </p>
            <ThemedText variant="h3" className={`text-xl font-black tabular-nums ${theme.textMain}`} isDarkMode={isDarkMode}>
                {mCount}
            </ThemedText>
          </div>
          
          <div 
            className={`p-4 rounded-2xl text-center border transition-all duration-300 group-hover:scale-[1.02] ${
                isDarkMode ? 'bg-slate-950/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <p className="text-[8px] font-black text-pink-500 uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1">
                <Users size={10} /> Females
            </p>
            <ThemedText variant="h3" className={`text-xl font-black tabular-nums ${theme.textMain}`} isDarkMode={isDarkMode}>
                {fCount}
            </ThemedText>
          </div>
      </div>
    </div>
  )
})