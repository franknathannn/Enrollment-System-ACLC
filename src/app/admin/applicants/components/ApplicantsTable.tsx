// src/app/admin/applicants/components/ApplicantsTable.tsx
import { memo } from "react"
import { CheckSquare, Square, Eye, RotateCcw, Trash2, ChevronLeft, ChevronRight, Copy, Shield, Activity, Star } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ThemedCard } from "@/components/ThemedCard"
import { ThemedText } from "@/components/ThemedText"
import { themeColors } from "@/lib/themeColors"
import { AnimatedNumber, AnimatedText } from "../../dashboard/components/primitives"
import { OptimizedImage } from "./OptimizedImage"

interface ApplicantsTableProps {
  isDarkMode: boolean
  filteredStudents: any[]
  selectedIds: string[]
  toggleSelect: (id: string) => void
  toggleSelectAll: () => void
  hiddenRows: Set<string>
  exitingRows: Record<string, boolean>
  animatingIds: Set<string>
  setOpenStudentDialog: (id: string) => void
  handleExit: (id: string, callback: () => void) => void
  handleStatusChange: (id: string, name: string, status: string) => void
  setActiveDeclineStudent: (student: any) => void
  setDeclineModalOpen: (open: boolean) => void
  setActiveDeleteStudent: (student: any) => void
  setDeleteModalOpen: (open: boolean) => void
  strandStats?: Record<string, boolean>
  totalFilteredCount: number
  currentPage: number
  totalPages: number
  setCurrentPage: (page: number) => void
}

interface ApplicantRowProps {
  student: any
  isSelected: boolean
  isHidden: boolean
  isExiting: boolean
  isAnimatingIn: boolean
  isStrandFull: boolean
  isDarkMode: boolean
  toggleSelect: (id: string) => void
  setOpenStudentDialog: (id: string) => void
  handleExit: (id: string, callback: () => void) => void
  handleStatusChange: (id: string, name: string, status: string) => void
  setActiveDeclineStudent: (student: any) => void
  setDeclineModalOpen: (open: boolean) => void
  setActiveDeleteStudent: (student: any) => void
  setDeleteModalOpen: (open: boolean) => void
}

const handleCopyLRN = (e: React.MouseEvent, lrn: string) => {
  e.stopPropagation();
  navigator.clipboard.writeText(lrn);
  toast.success("LRN Has been Copied", {
    style: { fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }
  });
};

const MobileApplicantRow = memo(({ 
  student, isSelected, isHidden, isExiting, isAnimatingIn, isStrandFull, isDarkMode,
  toggleSelect, setOpenStudentDialog, handleExit, handleStatusChange, 
  setActiveDeclineStudent, setDeclineModalOpen, setActiveDeleteStudent, setDeleteModalOpen 
}: ApplicantRowProps) => {
  if (isHidden) return null
  const isMale = student.gender !== 'Female'

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
    <div 
      className={`
        rounded-[32px] overflow-hidden border transition-all duration-500 transform-gpu relative isolate bg-clip-padding outline outline-1 outline-transparent
        ${theme.cardBg} ${theme.border} ${theme.shadow} w-full
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900' : ''}
        ${isExiting ? 'animate-[slideOutRight_0.3s_ease-in-out_forwards]' : ''} 
        ${isAnimatingIn ? 'animate-[slideInRight_0.5s_ease-out_backwards]' : ''}
      `}
      onClick={() => setOpenStudentDialog(student.id)}
      style={{
        animationFillMode: isExiting ? 'forwards' : isAnimatingIn ? 'backwards' : 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* 🌈 Lively Bio-Header */}
      <div className="p-4 sm:p-5 flex items-center gap-3 sm:gap-5 relative">
        {/* Gender Logic Accent Bar */}
        <div className={`absolute left-0 top-6 bottom-6 w-1.5 rounded-r-full shadow-[0_0_15px_rgba(var(--accent),0.5)] ${isMale ? 'bg-blue-500' : 'bg-pink-500'}`} />
        
        {/* Animated Profile Well */}
        <div className="relative shrink-0">
            <div className={`absolute inset-0 blur-xl opacity-20 ${isMale ? 'bg-blue-500' : 'bg-pink-500'}`} />
            <div className={`w-16 h-16 rounded-2xl p-1 border-2 relative z-10 ${isMale ? 'border-blue-500/30' : 'border-pink-500/30'}`}>
                <OptimizedImage 
                  src={student.two_by_two_url || student.profile_2x2_url || student.profile_picture || "https://api.dicebear.com/7.x/initials/svg?seed=" + student.last_name} 
                  alt="Avatar" 
                  className="w-full h-full object-cover rounded-xl"
                  fallback={`https://api.dicebear.com/7.x/initials/svg?seed=${student.last_name}`}
                />
            </div>
        </div>
        
        <div className="flex-1 min-w-0 text-left">
          <h3 className={`font-black text-lg uppercase leading-none tracking-tighter truncate ${theme.textMain}`}>
            <AnimatedText text={`${student.last_name}, ${student.first_name}`} />
          </h3>
          <div className="flex items-center gap-2 mt-2">
              <Badge className={`text-[8px] font-black uppercase px-2 py-0 border-none rounded-md ${isMale ? 'bg-blue-500/20 text-blue-500' : 'bg-pink-500/20 text-pink-500'}`}>
                {student.gender}
              </Badge>
              <div className="flex items-center gap-1.5 opacity-60">
                <span className={`text-[9px] font-mono font-bold tracking-widest ${theme.textSub}`}>LRN:{student.lrn}</span>
                <button 
                    onClick={(e) => handleCopyLRN(e, student.lrn)}
                    className={`p-1 rounded-md transition-all active:scale-90 ${theme.innerBg}`}
                >
                    <Copy size={10} className={theme.textSub} />
                </button>
              </div>
          </div>
        </div>

        {/* Checkbox - Top Right */}
        <button 
          onClick={(e) => { e.stopPropagation(); toggleSelect(student.id); }} 
          className="absolute top-4 right-4 p-1 touch-manipulation"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {isSelected 
            ? <CheckSquare className="text-blue-600" size={22} /> 
            : <Square className="text-slate-300" size={22} />
          }
        </button>
      </div>

      {/* 📊 Hardware Data Grid */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 grid grid-cols-2 gap-2 sm:gap-3">
        <div className={`p-3 rounded-2xl border flex flex-col items-center gap-1 ${theme.innerBg} ${theme.border}`}>
          <Activity size={12} className="text-slate-500 opacity-40" />
          <p className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em]">Category</p>
          <p className={`text-[10px] font-black uppercase truncate max-w-full ${theme.textMain}`}>{student.student_category || "Standard"}</p>
        </div>
        <div className={`p-3 rounded-2xl border flex flex-col items-center gap-1 ${theme.innerBg} ${theme.border}`}>
          <Star size={12} className="text-blue-500 opacity-50" />
          <p className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em]">GWA Index</p>
          <p className={`text-[12px] font-black italic text-blue-500`}>
            {student.gwa_grade_10 ? <AnimatedNumber value={parseFloat(student.gwa_grade_10)} /> : "0.00"}
          </p>
        </div>
        <div className={`p-3 rounded-2xl border flex flex-col items-center gap-1 ${theme.innerBg} ${theme.border}`}>
          <p className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em]">Strand</p>
          <p className={`text-[10px] font-black uppercase ${student.strand === 'ICT' ? 'text-blue-500' : 'text-orange-500'}`}>{student.strand}</p>
        </div>
        <div className={`p-3 rounded-2xl border flex flex-col items-center gap-1 ${theme.innerBg} ${theme.border}`}>
          <p className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em]">Section</p>
          <p className={`text-[10px] font-black uppercase truncate max-w-full ${!student.section || student.section === 'Unassigned' ? 'text-red-500' : theme.textMain}`}>
            {student.section || 'Unassigned'}
          </p>
        </div>
      </div>

      {/* 🎮 Crystalline Action Dock */}
      <div className={`p-2 flex items-center gap-2 border-t ${theme.dockBg} ${theme.border}`}>
        {/* View Button - Always visible */}
        <Button 
          onClick={(e) => { e.stopPropagation(); setOpenStudentDialog(student.id); }} 
          variant="ghost" 
          size="sm" 
          className="
            h-12 w-12 p-0 rounded-2xl transition-all transform-gpu active:scale-95 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800
          "
        >
          <Eye size={18} />
        </Button>

        {/* Pending Status Actions */}
        {student.status === 'Pending' && (
          <>
            <Button 
              onClick={(e) => { 
                e.stopPropagation(); 
                handleExit(student.id, () => handleStatusChange(student.id, `${student.first_name} ${student.last_name}`, 'Accepted')); 
              }} 
              variant="ghost" 
              size="sm" 
              disabled={isStrandFull} 
              className={`
                flex-1 h-12
                rounded-2xl 
                font-black 
                text-[9px] 
                uppercase tracking-widest 
                transition-all transform-gpu active:scale-95
                ${isStrandFull 
                  ? 'text-slate-300 cursor-not-allowed' 
                  : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                }
              `}
            >
              {isStrandFull ? 'FULL' : 'Approve'}
            </Button>
            
            <Button 
              onClick={(e) => { 
                e.stopPropagation(); 
                setActiveDeclineStudent(student); 
                setDeclineModalOpen(true); 
              }} 
              variant="ghost" 
              size="sm" 
              className="
                flex-1 h-12
                rounded-2xl 
                text-red-600 
                font-black 
                text-[9px] 
                uppercase tracking-widest 
                transition-all transform-gpu active:scale-95
                hover:bg-red-50 dark:hover:bg-red-900/20
              "
            >
              Decline
            </Button>
          </>
        )}

        {/* Reset for Accepted/Approved/Rejected */}
        {(student.status === 'Accepted' || student.status === 'Approved' || student.status === 'Rejected') && (
          <Button 
            onClick={(e) => { 
              e.stopPropagation(); 
              handleExit(student.id, () => handleStatusChange(student.id, `${student.first_name} ${student.last_name}`, 'Pending')); 
            }} 
            variant="ghost" 
            size="sm" 
            className="
              flex-1 h-12
              rounded-2xl 
              text-amber-600 
              font-black 
              text-[9px] 
              uppercase tracking-widest 
              transition-all transform-gpu active:scale-95
              hover:bg-amber-50 dark:hover:bg-amber-900/20
            "
          >
            <RotateCcw size={14} className="mr-1.5"/> Reset
          </Button>
        )}

        {/* Delete Button */}
        {(student.status === 'Pending' || student.status === 'Rejected') && (
          <Button 
            onClick={(e) => { 
              e.stopPropagation(); 
              setActiveDeleteStudent(student); 
              setDeleteModalOpen(true); 
            }} 
            variant="ghost" 
            size="sm" 
            className="
              h-12 w-12
              p-0 
              rounded-2xl 
              text-red-400 
              transition-all transform-gpu active:scale-95
              hover:bg-red-50 dark:hover:bg-red-900/20
            "
          >
            <Trash2 size={18}/>
          </Button>
        )}
      </div>
    </div>
  )
})
MobileApplicantRow.displayName = "MobileApplicantRow"

const DesktopApplicantRow = memo(({ 
  student, isSelected, isHidden, isExiting, isAnimatingIn, isStrandFull, isDarkMode,
  toggleSelect, setOpenStudentDialog, handleExit, handleStatusChange, 
  setActiveDeclineStudent, setDeclineModalOpen, setActiveDeleteStudent, setDeleteModalOpen 
}: ApplicantRowProps) => {
  if (isHidden) return null
  const isMale = student.gender !== 'Female'
  const baseBg = isSelected ? (isMale ? 'bg-blue-100/80 dark:bg-blue-900/40' : 'bg-pink-100/80 dark:bg-pink-900/40') : ''
  const genderHoverBg = isMale 
    ? (isSelected ? 'hover:!bg-blue-300 dark:hover:!bg-blue-800' : 'hover:!bg-blue-200 dark:hover:!bg-blue-900/40') 
    : (isSelected ? 'hover:!bg-pink-300 dark:hover:!bg-pink-800' : 'hover:!bg-pink-200 dark:hover:!bg-pink-900/40')

  return (
    <TableRow 
      className={`transition-colors border-b group relative ${baseBg} ${genderHoverBg} hover:shadow-sm will-change-transform ${isExiting ? 'animate-[slideOutRight_0.3s_ease-in-out_forwards] pointer-events-none' : ''} ${isAnimatingIn ? 'animate-[slideInRight_0.5s_ease-out_backwards]' : ''}`}
      onMouseEnter={(e) => {
        if (isSelected) {
          e.currentTarget.style.backgroundColor = isMale ? 'rgb(219 234 254 / 0.8)' : 'rgb(252 231 243 / 0.8)'
        } else {
          e.currentTarget.style.backgroundColor = isMale ? 'rgb(191 219 254 / 0.6)' : 'rgb(251 207 232 / 0.6)'
        }
        e.currentTarget.style.transition = 'background-color 0.2s ease'
      }}
      onMouseLeave={(e) => {
        if (isSelected) {
          e.currentTarget.style.backgroundColor = isMale ? 'rgb(219 234 254 / 0.8)' : 'rgb(252 231 243 / 0.8)'
        } else {
          e.currentTarget.style.backgroundColor = ''
        }
      }}
      style={{
        borderColor: isDarkMode ? 'rgba(77, 87, 100, 0.4)' : 'rgba(231, 229, 229, 0.53)',
        ...(isSelected ? { backgroundColor: isMale ? 'rgb(219 234 254 / 0.8)' : 'rgb(252 231 243 / 0.8)' } : undefined),
        animationFillMode: isExiting ? 'forwards' : isAnimatingIn ? 'backwards' : 'none'
      }}
    >
      <TableCell className="pl-4 md:pl-8">
        <button onClick={() => toggleSelect(student.id)}>
          {isSelected ? <CheckSquare className="text-blue-600" size={18} /> : <Square className="text-slate-200" size={18} />}
        </button>
      </TableCell>
      <TableCell className="px-3 md:px-6 py-5 relative">
        <div 
          onClick={() => setOpenStudentDialog(student.id)} 
          className="flex items-center gap-3 md:gap-4 cursor-pointer hover:opacity-90 transition-opacity group/name"
        >
          <div className="relative">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden border border-white shadow-lg shrink-0 ring-2 transition-all group-hover/name:scale-105 ${
              isMale 
                ? 'ring-blue-400/60 group-hover/name:ring-blue-500' 
                : 'ring-pink-400/40 group-hover/name:ring-pink-500'
            }`}>
              <OptimizedImage 
                src={student.two_by_two_url || student.profile_2x2_url || student.profile_picture || "https://api.dicebear.com/7.x/initials/svg?seed=" + student.last_name} 
                alt="Avatar" 
                className="w-full h-full object-cover"
                fallback={`https://api.dicebear.com/7.x/initials/svg?seed=${student.last_name}`}
              />
            </div>
            <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[6px] md:text-[7px] font-black uppercase tracking-widest text-white shadow-sm z-10 whitespace-nowrap ${
              student.student_category?.toLowerCase().includes('als') 
                ? 'bg-gradient-to-r from-orange-500 to-red-500 shadow-orange-500/30' 
                : 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-blue-500/30'
            }`}>
              {student.student_category?.toLowerCase().includes('als') ? 'ALS' : 'JHS'}
            </div>
          </div>
          <div className="min-w-0">
            <div className={`font-black text-sm md:text-base uppercase leading-none tracking-tight transition-colors duration-500 ${isDarkMode ? 'text-white group-hover/name:text-blue-400' : 'text-slate-900 group-hover/name:text-blue-600'}`}>
              <AnimatedText text={`${student.last_name}, ${student.first_name}`} /> <span className="text-[10px] opacity-40 font-black italic">{student.middle_name?.[0]}.</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
               <Shield size={10} className="text-slate-400" />
               <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">LRN:{student.lrn}</p>
               <button 
                 onClick={(e) => handleCopyLRN(e, student.lrn)}
                 title="Copy LRN"
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
        <span className={student.gender === 'Female' ? 'text-pink-500' : 'text-blue-500'}>{student.gender}</span>
      </TableCell>
      <TableCell className="text-center">
        <Badge className={`border-none px-2 md:px-3 py-1 text-[9px] font-black uppercase ${student.strand === 'ICT' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
          {student.strand}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <span className={`text-[10px] font-black uppercase ${
          student.section && student.section !== 'Unassigned' 
            ? (student.strand === 'ICT' ? 'text-blue-500' : student.strand === 'GAS' ? 'text-orange-500' : (isDarkMode ? 'text-white' : 'text-slate-900')) 
            : 'text-red-500'
        }`}>
          {student.section || 'Unassigned'}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <ThemedText variant="body" className="font-black" isDarkMode={isDarkMode} style={{ color: isDarkMode ? '#ffffff' : 'black' }}>
          {student.gwa_grade_10 ? <AnimatedNumber value={parseFloat(student.gwa_grade_10)} /> : 'N/A'}
        </ThemedText>
      </TableCell>
      <TableCell className="text-right px-4 md:px-8">
        <div className="flex items-center justify-end gap-1.5 md:gap-2 flex-nowrap">
          <Button 
            onClick={() => setOpenStudentDialog(student.id)} 
            variant="ghost"
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
            <Eye size={16}/>
          </Button>

          {student.status === 'Pending' && (
            <>
              <Button onClick={() => handleExit(student.id, () => handleStatusChange(student.id, `${student.first_name} ${student.last_name}`, 'Accepted'))} variant="ghost" disabled={isStrandFull} className={`h-9 px-2 md:px-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-colors shrink-0 whitespace-nowrap ${isStrandFull ? 'text-slate-300 cursor-not-allowed' : 'text-green-600'}`} onMouseEnter={(e) => { if (!isStrandFull) { e.currentTarget.style.backgroundColor = 'rgb(22 163 74)'; e.currentTarget.style.color = 'white'; } }} onMouseLeave={(e) => { if (!isStrandFull) { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'rgb(22 163 74)'; } }}><span className="hidden sm:inline">{isStrandFull ? 'FULL' : 'Approve'}</span><span className="sm:hidden">{isStrandFull ? 'X' : '✓'}</span></Button>
              <Button 
                onClick={() => {
                  setActiveDeclineStudent(student);
                  setDeclineModalOpen(true);
                }} 
                variant="ghost" 
                className="h-9 px-2 md:px-3 rounded-xl text-red-600 font-black text-[9px] uppercase tracking-widest transition-colors shrink-0 whitespace-nowrap"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(220 38 38)'
                  e.currentTarget.style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = ''
                  e.currentTarget.style.color = 'rgb(220 38 38)'
                }}
              >
                <span className="hidden sm:inline">Decline</span><span className="sm:hidden">✗</span>
              </Button>
            </>
          )}

          {(student.status === 'Accepted' || student.status === 'Approved') && (
            <>
              <Button 
                onClick={() => handleExit(student.id, () => handleStatusChange(student.id, `${student.first_name} ${student.last_name}`, 'Pending'))} 
                variant="ghost" 
                className="h-9 px-2 md:px-3 rounded-xl text-amber-600 font-black text-[9px] uppercase tracking-widest transition-colors shrink-0 whitespace-nowrap"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(245 158 11)'
                  e.currentTarget.style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = ''
                  e.currentTarget.style.color = 'rgb(217 119 6)'
                }}
              >
                <RotateCcw size={12} className="mr-1"/> <span className="hidden sm:inline">Reset</span>
              </Button>
            </>
          )}

          {student.status === 'Rejected' && (
            <Button 
              onClick={() => handleExit(student.id, () => handleStatusChange(student.id, `${student.first_name} ${student.last_name}`, 'Pending'))} 
              variant="ghost" 
              className="h-9 px-3 md:px-4 rounded-xl text-amber-600 font-black text-[9px] uppercase tracking-widest transition-colors shrink-0 whitespace-nowrap"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(245 158 11)'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = ''
                e.currentTarget.style.color = 'rgb(217 119 6)'
              }}
            >
              <RotateCcw size={14} className="mr-1 md:mr-2"/> <span className="hidden sm:inline">Reset</span>
            </Button>
          )}

          {(student.status === 'Pending' || student.status === 'Rejected') && (
            <Button 
              onClick={() => {
                setActiveDeleteStudent(student);
                setDeleteModalOpen(true);
              }}
              variant="ghost" 
              className="h-9 px-3 rounded-xl text-red-600 dark:text-red-400 font-black text-[9px] uppercase tracking-widest transition-colors shrink-0 flex items-center justify-center"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(220 38 38)'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = ''
                e.currentTarget.style.color = ''
              }}
            >
              <Trash2 size={16}/>
            </Button>
          )}

        </div>
      </TableCell>
    </TableRow>
  )
})
DesktopApplicantRow.displayName = "DesktopApplicantRow"

export const ApplicantsTable = memo(({
  isDarkMode, filteredStudents, selectedIds, toggleSelect, toggleSelectAll, hiddenRows, exitingRows, animatingIds,
  setOpenStudentDialog, handleExit, handleStatusChange, setActiveDeclineStudent, setDeclineModalOpen, setActiveDeleteStudent, setDeleteModalOpen, strandStats,
  totalFilteredCount, currentPage, totalPages, setCurrentPage
}: ApplicantsTableProps) => {
  return (
    <>
      <style jsx global>{`
        @keyframes slideOutRight {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(40px);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
      
      <ThemedCard 
        className="rounded-2xl sm:rounded-3xl md:rounded-[48px] shadow-lg sm:shadow-2xl shadow-slate-200/50 dark:shadow-blue-500/10 overflow-hidden transition-colors duration-500 border w-full"
        style={{    
          backgroundColor: isDarkMode ? themeColors.dark.surface : '#ffffff',
          borderColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#f1f5f9',
          width: '100%',
          maxWidth: '100%'
        }}
      >
        {/* MOBILE CARD VIEW */}
        <div className="md:hidden p-2 sm:p-4 space-y-3 sm:space-y-4">
          {/* Mobile Header */}
          <div className="flex items-center justify-center gap-4 px-2 pb-2">
            <button 
              onClick={toggleSelectAll} 
              className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {selectedIds.length === totalFilteredCount && totalFilteredCount > 0 
                ? <CheckSquare className="text-blue-600" size={18} /> 
                : <Square className={isDarkMode ? "text-slate-500" : "text-slate-400"} size={18} />
              }
              <span className="hidden xs:inline">Select All</span>
              <span className="xs:hidden">All</span>
            </button>
            <span className="text-[11px] sm:text-[12px] font-bold text-slate-400">
              {totalFilteredCount} Record{totalFilteredCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Mobile Cards */}
          {filteredStudents.length === 0 ? (
            <div className="py-16 sm:py-20 text-center text-slate-400 italic text-sm">
              No applicants match this criteria.
            </div>
          ) : (
            <>
              {filteredStudents.map((student) => {
            return (
              <MobileApplicantRow 
                key={student.id}
                student={student}
                isSelected={selectedIds.includes(student.id)}
                isHidden={hiddenRows.has(student.id)}
                isExiting={exitingRows[student.id]}
                isAnimatingIn={animatingIds.has(student.id)}
                isStrandFull={strandStats?.[student.strand] || false}
                isDarkMode={isDarkMode}
                toggleSelect={toggleSelect}
                setOpenStudentDialog={setOpenStudentDialog}
                handleExit={handleExit}
                handleStatusChange={handleStatusChange}
                setActiveDeclineStudent={setActiveDeclineStudent}
                setDeclineModalOpen={setDeclineModalOpen}
                setActiveDeleteStudent={setActiveDeleteStudent}
                setDeleteModalOpen={setDeleteModalOpen}
              />
            )
              })}
            </>
          )}

          {/* Mobile Pagination */}
          {totalPages > 1 && (
            <div className={`
              flex items-center justify-center gap-3 sm:gap-4 
              pt-3 sm:pt-4 
              border-t 
              ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}
            `}>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} 
                disabled={currentPage === 1} 
                className="h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-xl active:scale-95"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <ChevronLeft size={18} />
              </Button>
              <span className="text-[11px] sm:text-[12px] font-black uppercase tracking-widest text-slate-500 min-w-[100px] text-center">
                Page {currentPage} of {totalPages}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} 
                disabled={currentPage === totalPages} 
                className="h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-xl active:scale-95"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <ChevronRight size={18} />
              </Button>
            </div>
          )}
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block relative">
          <Table className="min-w-full table-fixed">
            <TableHeader className={`${isDarkMode ? 'bg-slate-900' : 'bg-white'} shadow-sm`}>
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="w-12 min-w-[48px] max-w-[48px] pl-4 md:pl-8" style={{ color: 'grey' }}>
                  <button onClick={toggleSelectAll}>
                    {selectedIds.length === totalFilteredCount && totalFilteredCount > 0 
                      ? <CheckSquare className="text-blue-600" size={18} /> 
                      : <Square className={isDarkMode ? "text-slate-500" : "text-slate-400"} size={18} />
                    }
                  </button>
                </TableHead>
                <TableHead className={`w-[280px] min-w-[280px] px-3 md:px-6 py-6 font-black uppercase text-[10px] tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} style={{ color: 'grey' }}>Applicant Identity</TableHead>
                <TableHead className={`w-[100px] min-w-[100px] font-black uppercase text-[10px] tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-center`} style={{ color: 'grey' }}>Gender</TableHead>
                <TableHead className={`w-[120px] min-w-[120px] font-black uppercase text-[10px] tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-center`} style={{ color: 'grey' }}>Strand</TableHead>
                <TableHead className={`w-[140px] min-w-[140px] font-black uppercase text-[10px] tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-center`} style={{ color: 'grey' }}>Section</TableHead>
                <TableHead className={`w-[80px] min-w-[80px] font-black uppercase text-[10px] tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-center`} style={{ color: 'grey' }}>GWA</TableHead>
                <TableHead className={`w-[280px] min-w-[280px] text-right px-4 md:px-8 font-black uppercase text-[10px] tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} style={{ color: 'grey' }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-32 text-center text-slate-400 italic">No applicants match this criteria.</TableCell></TableRow>
              ) : (
                <>
                  {filteredStudents.map((student) => {
                return (
                  <DesktopApplicantRow 
                    key={student.id}
                    student={student}
                    isSelected={selectedIds.includes(student.id)}
                    isHidden={hiddenRows.has(student.id)}
                    isExiting={exitingRows[student.id]}
                    isAnimatingIn={animatingIds.has(student.id)}
                    isStrandFull={strandStats?.[student.strand] || false}
                    isDarkMode={isDarkMode}
                    toggleSelect={toggleSelect}
                    setOpenStudentDialog={setOpenStudentDialog}
                    handleExit={handleExit}
                    handleStatusChange={handleStatusChange}
                    setActiveDeclineStudent={setActiveDeclineStudent}
                    setDeclineModalOpen={setDeclineModalOpen}
                    setActiveDeleteStudent={setActiveDeleteStudent}
                    setDeleteModalOpen={setDeleteModalOpen}
                  />
                )
                  })}
                </>
              )}
            </TableBody>
          </Table>

          {/* Desktop Pagination */}
          {totalPages > 1 && (
            <div className={`flex items-center justify-between px-6 py-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Showing {filteredStudents.length} of {totalFilteredCount}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <ChevronLeft size={14} />
                </Button>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mx-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </ThemedCard>
    </>
  )
})
ApplicantsTable.displayName = "ApplicantsTable"