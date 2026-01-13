// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\enrolled\components\EnrolledTable.tsx

import { memo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Copy, Shield, RotateCcw, Activity, Star } from "lucide-react"
import { ThemedCard } from "@/components/ThemedCard"
import { OptimizedImage } from "./OptimizedImage"
import { toast } from "sonner"
import { AnimatedText, AnimatedNumber } from "../../dashboard/components/primitives"

interface EnrolledTableProps {
  students: any[]
  isDarkMode: boolean
  onView: (student: any) => void
  onReset: (student: any) => void
  animatingIds?: Set<string>
}

const handleCopyLRN = (e: React.MouseEvent, lrn: string) => {
  e.stopPropagation();
  navigator.clipboard.writeText(lrn);
  toast.success("LRN Has been Copied", {
    style: { fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }
  });
};

export const EnrolledTable = memo(({ students, isDarkMode, onView, onReset, animatingIds }: EnrolledTableProps) => {
  if (students.length === 0) {
    return (
      <div className="text-center py-20 opacity-50 text-sm font-bold uppercase tracking-widest">
        No enrolled students found matching criteria.
      </div>
    )
  }

  // 🧪 PROP-BASED THEME ENGINE (Matches StudentTable)
  const theme = {
    cardBg: isDarkMode ? 'bg-slate-900/60' : 'bg-white',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSub: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    border: isDarkMode ? 'border-white/10' : 'border-slate-200',
    innerBg: isDarkMode ? 'bg-black/40' : 'bg-slate-50',
    dockBg: isDarkMode ? 'bg-slate-950/80' : 'bg-slate-100/80',
    shadow: isDarkMode ? 'shadow-[0_15px_30px_-10px_rgba(0,0,0,0.6)]' : 'shadow-lg shadow-slate-200/50'
  };

  return (
    <>
      <style jsx global>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <ThemedCard 
        className="rounded-[32px] overflow-hidden border shadow-xl transition-colors duration-500 w-full"
        style={{ 
          backgroundColor: isDarkMode ? 'rgb(2 6 23)' : '#ffffff', 
          borderColor: isDarkMode ? 'rgb(30 41 59)' : 'rgb(241 245 249)',
          width: '100%',
          maxWidth: '100%'
        }}
      >
        {/* 📱 MOBILE MODULE VIEW (Sections Style) */}
        <div className="md:hidden space-y-6 px-3 pb-10 pt-4">
          {students.map((s: any) => {
            const isAnimatingIn = animatingIds?.has(s.id)
            const isMale = s.gender !== 'Female'
            
            return (
              <div 
                key={s.id}
                onClick={() => onView(s)}
                className={`
                  rounded-[32px] overflow-hidden border transition-all duration-500 transform-gpu relative isolate bg-clip-padding outline outline-1 outline-transparent w-full
                  ${theme.cardBg} ${theme.border} ${theme.shadow}
                  ${isAnimatingIn ? 'animate-in fade-in zoom-in-95 slide-in-from-right-10 duration-700' : ''}
                `}
                style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
              >
                {/* 🌈 Lively Bio-Header */}
                <div className="p-5 flex items-center gap-5 relative">
                    {/* Gender Logic Accent Bar */}
                    <div className={`absolute left-0 top-6 bottom-6 w-1.5 rounded-r-full shadow-[0_0_15px_rgba(var(--accent),0.5)] ${isMale ? 'bg-blue-500' : 'bg-pink-500'}`} />
                    
                    {/* Animated Profile Well */}
                    <div className="relative shrink-0">
                        <div className={`absolute inset-0 blur-xl opacity-20 ${isMale ? 'bg-blue-500' : 'bg-pink-500'}`} />
                        <div className={`w-16 h-16 rounded-2xl p-1 border-2 relative z-10 ${isMale ? 'border-blue-500/30' : 'border-pink-500/30'}`}>
                            <OptimizedImage 
                                src={s.two_by_two_url || s.profile_2x2_url || s.profile_picture || `https://api.dicebear.com/7.x/initials/svg?seed=${s.last_name}`} 
                                className="w-full h-full object-cover rounded-xl" 
                                alt="Student" 
                            />
                        </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-black text-lg uppercase leading-none tracking-tighter truncate ${theme.textMain}`}>
                        <AnimatedText text={`${s.last_name}, ${s.first_name}`} />
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                         <Badge className={`text-[8px] font-black uppercase px-2 py-0 border-none rounded-md ${isMale ? 'bg-blue-500/20 text-blue-500' : 'bg-pink-500/20 text-pink-500'}`}>
                            {s.gender}
                         </Badge>
                         <div className="flex items-center gap-1.5 opacity-60">
                            <span className={`text-[9px] font-mono font-bold tracking-widest ${theme.textSub}`}>LRN:{s.lrn}</span>
                            <button 
                               onClick={(e) => handleCopyLRN(e, s.lrn)}
                               className={`p-1 rounded-md transition-all active:scale-90 ${theme.innerBg}`}
                            >
                               <Copy size={10} className={theme.textSub} />
                            </button>
                         </div>
                      </div>
                    </div>
                </div>

                {/* 📊 Hardware Data Grid */}
                <div className="px-5 pb-5 grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-2xl border flex flex-col items-center gap-1 ${theme.innerBg} ${theme.border}`}>
                      <Activity size={12} className="text-slate-500 opacity-40" />
                      <p className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em]">Category</p>
                      <p className={`text-[10px] font-black uppercase ${theme.textMain}`}>{s.student_category || "Standard"}</p>
                    </div>
                    <div className={`p-3 rounded-2xl border flex flex-col items-center gap-1 ${theme.innerBg} ${theme.border}`}>
                      <Star size={12} className="text-blue-500 opacity-50" />
                      <p className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em]">GWA Index</p>
                      <p className={`text-[12px] font-black italic text-blue-500`}>
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

                {/* 🎮 Crystalline Action Dock */}
                <div className={`p-2 flex items-center gap-2 border-t ${theme.dockBg} ${theme.border}`}>
                    <Button size="sm" variant="ghost" onClick={(e) => {e.stopPropagation(); onView(s)}} className={`flex-1 h-12 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all transform-gpu active:scale-95 ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
                      <Eye size={16} className="mr-2"/> View Profile
                    </Button>
                    <Button size="sm" variant="ghost" onClick={(e) => {e.stopPropagation(); onReset(s)}} className="flex-1 h-12 rounded-2xl text-[9px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all transform-gpu active:scale-95">
                      <RotateCcw size={16} className="mr-2"/> Reset
                    </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* DESKTOP TABLE VIEW */}
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
                <TableHead className="text-right pr-8 font-black uppercase text-[10px] tracking-widest" style={{ color: 'grey' }}>Actions</TableHead>
             </TableRow>
          </TableHeader>
          <TableBody>
             {students.map((s: any) => {
               const isMale = s.gender !== 'Female'
               const isAnimatingIn = animatingIds?.has(s.id)
               
               return (
                 <TableRow 
                   key={s.id} 
                   className={`border-b transition-colors group relative ${isAnimatingIn ? 'animate-[slideInRight_0.5s_ease-out_backwards]' : ''}`}
                   style={{ 
                     borderColor: isDarkMode ? 'rgba(77, 87, 100, 0.4)' : 'rgba(231, 229, 229, 0.53)',
                     animationFillMode: isAnimatingIn ? 'backwards' : 'none'
                   }}
                   onMouseEnter={(e) => {
                     if (isMale) {
                       e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)'
                     } else {
                       e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(236, 72, 153, 0.15)' : 'rgba(236, 72, 153, 0.08)'
                     }
                   }}
                   onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '' }}
                 >
                    <TableCell className="pl-8 py-6 relative">
                       <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all group-hover:scale-105 ${
                              isMale 
                                ? 'border-blue-300/40 group-hover:border-blue-500 group-hover:shadow-[0_0_25px_rgba(59,130,246,0.6)]' 
                                : 'border-pink-300/40 group-hover:border-pink-500 group-hover:shadow-[0_0_25px_rgba(236,72,153,0.6)]'
                            }`}>
                               <OptimizedImage 
                                  src={s.profile_picture || s.two_by_two_url || s.profile_2x2_url} 
                                  alt="Avatar" 
                                  className="w-full h-full object-cover" 
                                  fallback={`https://api.dicebear.com/7.x/initials/svg?seed=${s.last_name}`}
                               />
                            </div>
                            <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest text-white shadow-sm z-10 whitespace-nowrap ${
                              s.student_category?.toLowerCase().includes('als') 
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 shadow-orange-500/30' 
                                : 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-blue-500/30'
                            }`}>
                              {s.student_category?.toLowerCase().includes('als') ? 'ALS' : 'JHS'}
                            </div>
                          </div>
                          <div>
                             <p 
                                onClick={() => onView(s)}
                                className={`font-black text-base uppercase leading-none tracking-tight cursor-pointer hover:underline transition-colors duration-500 ${isDarkMode ? 'text-white group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-600'}`}
                             >
                               <AnimatedText text={`${s.last_name}, ${s.first_name}`} /> <span className="text-[10px] opacity-40 font-black italic">{s.middle_name?.[0]}.</span>
                             </p>
                             <div className="flex items-center gap-2 mt-1.5">
                                <Shield size={10} className="text-slate-400" />
                                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">LRN:{s.lrn}</p>
                                <button 
                                  onClick={(e) => handleCopyLRN(e, s.lrn)}
                                  className={`p-1 rounded-md transition-all active:scale-90 shadow-sm ${
                                    isDarkMode 
                                    ? 'bg-slate-800 text-slate-400 hover:text-white' 
                                    : 'bg-slate-100 text-slate-500 hover:text-slate-900'
                                  }`}
                                >
                                   <Copy size={10} />
                                </button>
                             </div>
                          </div>
                       </div>
                    </TableCell>
                    <TableCell className="text-center font-black text-[10px] uppercase text-slate-500">
                      <span className={s.gender === 'Female' ? 'text-pink-500' : 'text-blue-500'}>{s.gender}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`border-none px-3 py-1 text-[9px] font-black uppercase ${s.strand === 'ICT' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                        {s.strand}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-[10px] font-black uppercase ${s.section && s.section !== 'Unassigned' ? (s.strand === 'ICT' ? 'text-blue-500' : 'text-orange-500') : 'text-slate-400 italic'}`}>
                        {s.section || "Unassigned"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${s.student_category?.includes('ALS') ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                            {s.student_category || 'Regular'}
                        </span>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                       <div className="flex items-center justify-end gap-1.5">
                         <Button 
                           size="sm" 
                           variant="ghost" 
                           onClick={() => onView(s)}
                           className="h-9 px-3 rounded-xl text-slate-500 font-black text-[9px] uppercase tracking-widest transition-colors shrink-0 flex items-center justify-center"
                           onMouseEnter={(e) => {
                             e.currentTarget.style.backgroundColor = 'rgb(71 85 105)'
                             e.currentTarget.style.color = 'white'
                           }}
                           onMouseLeave={(e) => {
                             e.currentTarget.style.backgroundColor = ''
                             e.currentTarget.style.color = 'rgb(100 116 139)'
                           }}
                         >
                            <Eye size={14} className="mr-2" /> View
                         </Button>
                         <Button 
                           size="sm" 
                           variant="ghost" 
                           onClick={() => onReset(s)}
                           className="h-9 px-3 rounded-xl text-amber-600 font-black text-[9px] uppercase tracking-widest transition-colors shrink-0 flex items-center justify-center"
                           onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(245 158 11)'; e.currentTarget.style.color = 'white'; }}
                           onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'rgb(217 119 6)'; }}
                         >
                           <RotateCcw size={12} className="mr-2" /> Reset
                         </Button>
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
