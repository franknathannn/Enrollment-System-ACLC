// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\enrolled\components\EnrolledTable.tsx

import { memo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Copy, Shield, RotateCcw } from "lucide-react"
import { ThemedCard } from "@/components/ThemedCard"
import { OptimizedImage } from "./OptimizedImage"
import { toast } from "sonner"
import { AnimatedText } from "../../dashboard/components/primitives"

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

  return (
    <>
      <style jsx global>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <ThemedCard 
        className="rounded-[32px] overflow-hidden border shadow-xl transition-colors duration-500"
        style={{ 
          backgroundColor: isDarkMode ? 'rgb(2 6 23)' : '#ffffff', 
          borderColor: isDarkMode ? 'rgb(30 41 59)' : 'rgb(241 245 249)' 
        }}
      >
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
      </ThemedCard>
    </>
  )
})

EnrolledTable.displayName = "EnrolledTable"
