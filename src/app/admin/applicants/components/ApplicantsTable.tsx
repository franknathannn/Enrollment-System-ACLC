// src/app/admin/applicants/components/ApplicantsTable.tsx
import { memo, useMemo, useEffect, useLayoutEffect, useRef, useState } from "react"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface ApplicantsTableProps {
  isDarkMode: boolean
  filteredStudents: any[]
  selectedIds: string[]
  toggleSelect: (id: string) => void
  toggleSelectAll: (ids: string[]) => void
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
  animIndex: number
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

const STATUS_STYLES: Record<string, { badge: string; glow: string; bar: string }> = {
  Pending: { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25', glow: 'shadow-amber-500/10', bar: 'bg-amber-400' },
  Accepted: { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', glow: 'shadow-emerald-500/10', bar: 'bg-emerald-400' },
  Approved: { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', glow: 'shadow-emerald-500/10', bar: 'bg-emerald-400' },
  Rejected: { badge: 'bg-red-500/15 text-red-400 border-red-500/25', glow: 'shadow-red-500/10', bar: 'bg-red-400' },
}

const MobileApplicantRow = memo(({
  student, isSelected, isHidden, isExiting, isAnimatingIn, animIndex, isStrandFull, isDarkMode,
  toggleSelect, setOpenStudentDialog, handleExit, handleStatusChange,
  setActiveDeclineStudent, setDeclineModalOpen, setActiveDeleteStudent, setDeleteModalOpen
}: ApplicantRowProps) => {
  if (isHidden) return null
  const isMale = student.gender !== 'Female'
  const statusStyle = STATUS_STYLES[student.status] || STATUS_STYLES.Pending

  const cardBg = isDarkMode ? 'bg-slate-900/70' : 'bg-white'
  const border = isDarkMode ? 'border-white/8' : 'border-slate-200'
  const textMain = isDarkMode ? 'text-white' : 'text-slate-900'
  const textSub = isDarkMode ? 'text-slate-400' : 'text-slate-500'
  const innerBg = isDarkMode ? 'bg-slate-800/60' : 'bg-slate-50'
  const dockBg = isDarkMode ? 'bg-slate-950/70' : 'bg-slate-50/90'

  return (
    <div
      className={`rounded-[28px] overflow-hidden border transition-all duration-300 transform-gpu relative w-full
        ${cardBg} ${border}
        shadow-[0_8px_30px_-8px_rgba(0,0,0,0.15)] ${statusStyle.glow}
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' + (isDarkMode ? ' ring-offset-slate-950' : ' ring-offset-white') : ''}
        ${isExiting ? 'animate-[slideOutRight_0.3s_ease-in-out_forwards]' : ''}
        ${isAnimatingIn ? 'animate-[slideInRight_0.5s_ease-out_backwards]' : ''}
      `}
      onClick={() => setOpenStudentDialog(student.id)}
      style={{
        animationFillMode: isExiting ? 'forwards' : isAnimatingIn ? 'backwards' : 'none',
        animationDelay: isAnimatingIn ? `${animIndex * 45}ms` : undefined,
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >
      {/* Status accent bar at top */}
      <div className={`h-[3px] w-full ${statusStyle.bar} opacity-70`} />

      {/* Header */}
      <div className="p-4 flex items-center gap-3 relative">
        {/* Gender side bar */}
        <div className={`absolute left-0 top-5 bottom-5 w-[3px] rounded-r-full ${isMale ? 'bg-blue-500' : 'bg-pink-400'}`} />

        {/* Avatar */}
        <div className="relative shrink-0 ml-1">
          <div className={`absolute inset-0 rounded-2xl blur-lg opacity-30 ${isMale ? 'bg-blue-500' : 'bg-pink-400'}`} />
          <div className={`w-14 h-14 rounded-2xl border-2 relative z-10 overflow-hidden ${isMale ? 'border-blue-400/40' : 'border-pink-400/40'}`}>
            <OptimizedImage
              src={student.two_by_two_url || student.profile_2x2_url || student.profile_picture || "https://api.dicebear.com/7.x/initials/svg?seed=" + student.last_name}
              alt="Avatar"
              className="w-full h-full object-cover"
              fallback={`https://api.dicebear.com/7.x/initials/svg?seed=${student.last_name}`}
            />
          </div>
          {/* Strand dot badge */}
          <div className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[7px] font-black text-white z-20 ${student.strand === 'ICT' ? 'bg-blue-600' : 'bg-orange-500'}`}>
            {student.strand}
          </div>
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className={`font-black text-base uppercase leading-tight tracking-tight truncate ${textMain}`}>
            <AnimatedText text={`${student.last_name}, ${student.first_name}`} />
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge className={`text-[8px] font-black uppercase px-1.5 py-0 border-none rounded-md shrink-0 ${isMale ? 'bg-blue-500/15 text-blue-400' : 'bg-pink-500/15 text-pink-400'}`}>
              {student.gender}
            </Badge>
            <span className={`text-[9px] font-mono font-bold tracking-wider truncate ${textSub}`}>
              {student.lrn}
            </span>
            <button
              type="button"
              onClick={(e) => handleCopyLRN(e, student.lrn)}
              className={`p-1 rounded-md transition-all active:scale-90 shrink-0 ${innerBg}`}
            >
              <Copy size={9} className={textSub} />
            </button>
          </div>
          {/* Status pill */}
          <div className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${statusStyle.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.bar} ${student.status === 'Pending' ? 'animate-pulse' : ''}`} />
            {student.status === 'Approved' ? 'Accepted' : student.status}
          </div>
        </div>

        {/* Checkbox */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleSelect(student.id); }}
          className="absolute top-3 right-3 p-1.5 touch-manipulation"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {isSelected
            ? <CheckSquare className="text-blue-500" size={20} />
            : <Square className={isDarkMode ? "text-slate-600" : "text-slate-300"} size={20} />
          }
        </button>
      </div>

      {/* Data grid */}
      <div className="px-4 pb-3 grid grid-cols-3 gap-2">
        <div className={`p-2.5 rounded-2xl border flex flex-col items-center gap-0.5 ${innerBg} ${border}`}>
          <Activity size={10} className="text-slate-500 opacity-50 mb-0.5" />
          <p className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em]">Category</p>
          <p className={`text-[9px] font-black uppercase truncate max-w-full ${textMain}`}>{student.student_category || "Standard"}</p>
        </div>
        <div className={`p-2.5 rounded-2xl border flex flex-col items-center gap-0.5 ${innerBg} ${border}`}>
          <Star size={10} className="text-blue-400 opacity-60 mb-0.5" />
          <p className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em]">GWA</p>
          <p className="text-[11px] font-black italic text-blue-400">
            {student.gwa_grade_10 ? <AnimatedNumber value={parseFloat(student.gwa_grade_10)} /> : "—"}
          </p>
        </div>
        <div className={`p-2.5 rounded-2xl border flex flex-col items-center gap-0.5 ${innerBg} ${border}`}>
          <p className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em] mb-0.5">Section</p>
          <p className={`text-[9px] font-black uppercase truncate max-w-full ${!student.section || student.section === 'Unassigned' ? 'text-red-400' : textMain}`}>
            {student.section || '—'}
          </p>
        </div>
      </div>

      {/* Action dock */}
      <div className={`px-3 pb-3 pt-1 flex items-center gap-2 border-t ${dockBg} ${border}`}>
        <Button
          onClick={(e) => { e.stopPropagation(); setOpenStudentDialog(student.id); }}
          variant="ghost"
          size="sm"
          className={`h-10 w-10 p-0 rounded-2xl transition-all active:scale-95 shrink-0 ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-400 hover:bg-slate-200'}`}
        >
          <Eye size={16} />
        </Button>

        {student.status === 'Pending' && (
          <>
            <Button
              onClick={(e) => { e.stopPropagation(); handleExit(student.id, () => handleStatusChange(student.id, `${student.first_name} ${student.last_name}`, 'Accepted')); }}
              variant="ghost"
              size="sm"
              disabled={isStrandFull}
              className={`flex-1 h-10 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 ${isStrandFull ? 'text-slate-400 cursor-not-allowed opacity-50' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
            >
              {isStrandFull ? 'Full' : 'Approve'}
            </Button>
            <Button
              onClick={(e) => { e.stopPropagation(); setActiveDeclineStudent(student); setDeclineModalOpen(true); }}
              variant="ghost"
              size="sm"
              className="flex-1 h-10 rounded-2xl text-red-500 font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Decline
            </Button>
          </>
        )}

        {(student.status === 'Accepted' || student.status === 'Approved' || student.status === 'Rejected') && (
          <Button
            onClick={(e) => { e.stopPropagation(); handleExit(student.id, () => handleStatusChange(student.id, `${student.first_name} ${student.last_name}`, 'Pending')); }}
            variant="ghost"
            size="sm"
            className="flex-1 h-10 rounded-2xl text-amber-500 font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 hover:bg-amber-50 dark:hover:bg-amber-900/20"
          >
            <RotateCcw size={13} className="mr-1.5" /> Reset
          </Button>
        )}

        {(student.status === 'Pending' || student.status === 'Rejected') && (
          <Button
            onClick={(e) => { e.stopPropagation(); setActiveDeleteStudent(student); setDeleteModalOpen(true); }}
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 rounded-2xl text-red-400 transition-all active:scale-95 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
          >
            <Trash2 size={16} />
          </Button>
        )}
      </div>
    </div>
  )
})
MobileApplicantRow.displayName = "MobileApplicantRow"

// Renders name in one line — sized uniformly per page by ApplicantsTable's useLayoutEffect
function ShrinkName({ text, middleInitial, className }: { text: string; middleInitial?: string; className?: string }) {
  return (
    <div data-shrink-name className={className} style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
      {text}
      {middleInitial && <span style={{ fontSize: '0.65em', opacity: 0.4, fontStyle: 'italic', marginLeft: 3 }}>{middleInitial}.</span>}
    </div>
  )
}

const DesktopApplicantRow = memo(({
  student, isSelected, isHidden, isExiting, isAnimatingIn, animIndex, isStrandFull, isDarkMode,
  toggleSelect, setOpenStudentDialog, handleExit, handleStatusChange,
  setActiveDeclineStudent, setDeclineModalOpen, setActiveDeleteStudent, setDeleteModalOpen
}: ApplicantRowProps) => {
  if (isHidden) return null
  const isMale = student.gender !== 'Female'
  const genderColor = isMale ? '#3b82f6' : '#ec4899'

  return (
    <TableRow
      className={`border-b group relative will-change-transform
        ${isExiting ? 'animate-[slideOutRight_0.3s_ease-in-out_forwards] pointer-events-none' : ''}
        ${isAnimatingIn ? 'animate-[slideInRight_0.5s_ease-out_backwards]' : ''}
        ${isSelected ? (isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50/80') : ''}
      `}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(30,41,59,0.5)' : 'rgba(248,250,252,0.8)'
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = ''
      }}
      style={{
        borderTopColor: isDarkMode ? 'rgba(51,65,85,0.4)' : 'rgba(226,232,240,0.8)',
        borderRightColor: isDarkMode ? 'rgba(51,65,85,0.4)' : 'rgba(226,232,240,0.8)',
        borderBottomColor: isDarkMode ? 'rgba(51,65,85,0.4)' : 'rgba(226,232,240,0.8)',
        borderLeftColor: genderColor,
        borderLeftWidth: '3px',
        borderLeftStyle: 'solid',
        animationFillMode: isExiting ? 'forwards' : isAnimatingIn ? 'backwards' : 'none',
        animationDelay: isAnimatingIn ? `${animIndex * 45}ms` : undefined,
        transition: 'background-color 0.15s ease',
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
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden border border-white shadow-lg shrink-0 ring-2 transition-all group-hover/name:scale-105 ${isMale
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
                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[6px] md:text-[7px] font-black uppercase tracking-widest text-white shadow-sm z-10 whitespace-nowrap ${student.student_category?.toLowerCase().includes('als')
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 shadow-orange-500/30'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-blue-500/30'
                  }`}>
                  {student.student_category?.toLowerCase().includes('als') ? 'ALS' : 'JHS'}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="p-0 bg-transparent border-none shadow-none ml-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl text-white min-w-[250px]">
                <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-white/10 shrink-0 bg-slate-800">
                  <OptimizedImage
                    src={student.two_by_two_url || student.profile_2x2_url || student.profile_picture || "https://api.dicebear.com/7.x/initials/svg?seed=" + student.last_name}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-black uppercase text-sm truncate">{student.last_name}, {student.first_name}</p>
                  <p className="text-[10px] font-bold text-blue-400 tracking-widest mb-1">LRN: {student.lrn}</p>
                  <Badge variant="outline" className="text-[8px] border-slate-600 text-slate-300 h-5 px-2">{student.strand} - {student.student_category}</Badge>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
          <div className="min-w-0">
            <ShrinkName
              text={`${student.last_name}, ${student.first_name}`}
              middleInitial={student.middle_name?.[0]}
              className={`font-black text-sm md:text-base uppercase leading-none tracking-tight transition-colors duration-500 ${isDarkMode ? 'text-white group-hover/name:text-blue-400' : 'text-slate-900 group-hover/name:text-blue-600'}`}
            />
            <div className="flex items-center gap-2 mt-2">
              <Shield size={10} className="text-slate-400" />
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">LRN:{student.lrn}</p>
              <button
                onClick={(e) => handleCopyLRN(e, student.lrn)}
                title="Copy LRN"
                className={`p-1 rounded-md transition-all active:scale-90 shadow-sm ${isDarkMode
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
        <span className={`text-[10px] font-black uppercase ${student.section && student.section !== 'Unassigned'
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
          <Tooltip>
            <TooltipTrigger asChild>
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
                <Eye size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>View Profile</p></TooltipContent>
          </Tooltip>

          {student.status === 'Pending' && (
            <>
              <Tooltip><TooltipTrigger asChild>
                <Button onClick={() => handleExit(student.id, () => handleStatusChange(student.id, `${student.first_name} ${student.last_name}`, 'Accepted'))} variant="ghost" disabled={isStrandFull} className={`h-9 px-2 md:px-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-colors shrink-0 whitespace-nowrap ${isStrandFull ? 'text-slate-300 cursor-not-allowed' : 'text-green-600'}`} onMouseEnter={(e) => { if (!isStrandFull) { e.currentTarget.style.backgroundColor = 'rgb(22 163 74)'; e.currentTarget.style.color = 'white'; } }} onMouseLeave={(e) => { if (!isStrandFull) { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'rgb(22 163 74)'; } }}><span className="hidden sm:inline">{isStrandFull ? 'FULL' : 'Approve'}</span><span className="sm:hidden">{isStrandFull ? 'X' : '✓'}</span></Button>
              </TooltipTrigger><TooltipContent className="bg-green-900 text-green-100 border-green-800"><p>Approve Application</p></TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild>
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
              </TooltipTrigger><TooltipContent className="bg-red-900 text-red-100 border-red-800"><p>Decline Application</p></TooltipContent></Tooltip>
            </>
          )}

          {(student.status === 'Accepted' || student.status === 'Approved') && (
            <>
              <Tooltip><TooltipTrigger asChild>
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
                  <RotateCcw size={12} className="mr-1" /> <span className="hidden sm:inline">Reset</span>
                </Button>
              </TooltipTrigger><TooltipContent className="bg-amber-900 text-amber-100 border-amber-800"><p>Reset to Pending</p></TooltipContent></Tooltip>
            </>
          )}

          {student.status === 'Rejected' && (
            <Tooltip><TooltipTrigger asChild>
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
                <RotateCcw size={14} className="mr-1 md:mr-2" /> <span className="hidden sm:inline">Reset</span>
              </Button>
            </TooltipTrigger><TooltipContent className="bg-amber-900 text-amber-100 border-amber-800"><p>Reset to Pending</p></TooltipContent></Tooltip>
          )}

          {(student.status === 'Pending' || student.status === 'Rejected') && (
            <Tooltip><TooltipTrigger asChild>
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
                <Trash2 size={16} />
              </Button>
            </TooltipTrigger><TooltipContent className="bg-red-950 text-red-200 border-red-900"><p>Delete Record</p></TooltipContent></Tooltip>
          )}

        </div>
      </TableCell>
    </TableRow>
  )
})
DesktopApplicantRow.displayName = "DesktopApplicantRow"

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

  // 5-page sliding window centered on currentPage
  const getPages = (): number[] => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    let start = Math.max(1, currentPage - 2)
    let end = start + 4
    if (end > totalPages) { end = totalPages; start = Math.max(1, end - 4) }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  const pages = getPages()
  const showFirstPage = pages[0] > 1
  const showLastPage = pages[pages.length - 1] < totalPages
  const showStartDots = pages[0] > 2
  const showEndDots = pages[pages.length - 1] < totalPages - 1

  const c = isDarkMode
    ? { border: 'rgba(51,65,85,0.7)', text: '#94a3b8', hover: 'rgba(51,65,85,0.45)', activeBg: 'rgba(59,130,246,0.18)', activeBorder: '#3b82f6', activeText: '#93c5fd', dots: '#475569' }
    : { border: '#e2e8f0', text: '#64748b', hover: '#f1f5f9', activeBg: '#eff6ff', activeBorder: '#2563eb', activeText: '#2563eb', dots: '#94a3b8' }

  const sz = compact ? { h: 24, w: 24, r: 7, fs: 9, pad: '0 6px', navPad: '0 7px', navFs: 8, dotW: 16, dotFs: 9, iconSz: 10 } : { h: 36, w: 36, r: 10, fs: 12, pad: '0 10px', navPad: '0 13px', navFs: 11, dotW: 24, dotFs: 13, iconSz: 13 }
  const base: React.CSSProperties = {
    height: sz.h, minWidth: sz.w, borderRadius: sz.r,
    border: `1.5px solid ${c.border}`, background: 'transparent',
    color: c.text, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: sz.fs, fontWeight: 700, transition: 'all 0.14s ease',
    padding: sz.pad, userSelect: 'none' as const,
  }
  const active: React.CSSProperties = {
    ...base, background: c.activeBg, border: `1.5px solid ${c.activeBorder}`,
    color: c.activeText, fontWeight: 900,
  }
  const nav = (enabled: boolean): React.CSSProperties => ({
    ...base,
    gap: compact ? 2 : 5, padding: sz.navPad,
    fontSize: sz.navFs, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' as const,
    ...(enabled ? {} : { opacity: 0.32, cursor: 'not-allowed' as const }),
  })
  const dot: React.CSSProperties = {
    height: sz.h, minWidth: sz.dotW,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: sz.dotFs, color: c.dots, fontWeight: 700, userSelect: 'none' as const,
    letterSpacing: 1,
  }
  const iconSize = sz.iconSz

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: compact ? 'center' : 'space-between', gap: 8, width: '100%' }}>
      {!compact && totalShowing !== undefined && (
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: c.text }}>
          Showing {totalShowing} of {totalCount}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 2 : 3 }}>

        {/* ← Prev */}
        <button
          style={nav(canPrev)}
          disabled={!canPrev}
          onClick={() => canPrev && setCurrentPage(currentPage - 1)}
          onMouseEnter={e => { if (canPrev) (e.currentTarget as HTMLElement).style.background = c.hover }}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <ChevronLeft size={iconSize} strokeWidth={2.5} />
          {!compact && <span>Prev</span>}
        </button>

        {/* First page anchor */}
        {showFirstPage && (
          <>
            <button style={base} onClick={() => setCurrentPage(1)}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = c.hover}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              1
            </button>
            {showStartDots && <span style={dot}>···</span>}
          </>
        )}

        {/* 5-page window */}
        {pages.map(p => (
          <button
            key={p}
            style={p === currentPage ? active : base}
            onClick={() => setCurrentPage(p)}
            onMouseEnter={e => { if (p !== currentPage) (e.currentTarget as HTMLElement).style.background = c.hover }}
            onMouseLeave={e => { if (p !== currentPage) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            {p}
          </button>
        ))}

        {/* Last page anchor */}
        {showLastPage && (
          <>
            {showEndDots && <span style={dot}>···</span>}
            <button style={base} onClick={() => setCurrentPage(totalPages)}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = c.hover}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              {totalPages}
            </button>
          </>
        )}

        {/* Next → */}
        <button
          style={nav(canNext)}
          disabled={!canNext}
          onClick={() => canNext && setCurrentPage(currentPage + 1)}
          onMouseEnter={e => { if (canNext) (e.currentTarget as HTMLElement).style.background = c.hover }}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          {!compact && <span>Next</span>}
          <ChevronRight size={iconSize} strokeWidth={2.5} />
        </button>

      </div>
    </div>
  )
}

export const ApplicantsTable = memo(({
  isDarkMode, filteredStudents, selectedIds, toggleSelect, toggleSelectAll, hiddenRows, exitingRows, animatingIds,
  setOpenStudentDialog, handleExit, handleStatusChange, setActiveDeclineStudent, setDeclineModalOpen, setActiveDeleteStudent, setDeleteModalOpen, strandStats,
  totalFilteredCount, currentPage, totalPages, setCurrentPage
}: ApplicantsTableProps) => {
  const visibleStudents = useMemo(() => {
    if (filteredStudents.length > 5 || (filteredStudents.length === totalFilteredCount && totalFilteredCount > 5)) {
      const startIndex = (currentPage - 1) * 5
      const endIndex = startIndex + 5
      return filteredStudents.slice(startIndex, endIndex)
    }
    return filteredStudents
  }, [filteredStudents, currentPage, totalFilteredCount])

  // Tab-switch / status-transfer entrance animation
  const prevIdsKeyRef = useRef<string>('')
  const [localAnimatingIds, setLocalAnimatingIds] = useState<Set<string>>(new Set())
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const newKey = visibleStudents.map(s => s.id).join(',')
    if (prevIdsKeyRef.current !== '' && prevIdsKeyRef.current !== newKey) {
      const ids = new Set(visibleStudents.map(s => s.id))
      setLocalAnimatingIds(ids)
      if (animTimerRef.current) clearTimeout(animTimerRef.current)
      animTimerRef.current = setTimeout(() => setLocalAnimatingIds(new Set()), 700)
    }
    prevIdsKeyRef.current = newKey
    return () => { if (animTimerRef.current) clearTimeout(animTimerRef.current) }
  }, [visibleStudents])

  const pageIds = useMemo(() => visibleStudents.map(s => s.id), [visibleStudents])
  const isPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id))

  // Normalize name font sizes across the page — all names share the same size.
  // Minimum: 11px. If a name still overflows at 11px, it wraps instead of clipping.
  const MIN_NAME_SIZE = 11
  const desktopTableRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const container = desktopTableRef.current
    if (!container) return
    const els = Array.from(container.querySelectorAll<HTMLElement>('[data-shrink-name]'))
    if (!els.length) return

    // 1. Reset all to natural CSS size and enforce single line
    els.forEach(el => {
      el.style.fontSize = ''
      el.style.whiteSpace = 'nowrap'
    })

    // 2. Find the tightest fit ratio across all names on this page
    let minRatio = 1
    els.forEach(el => {
      if (el.scrollWidth > el.clientWidth) {
        minRatio = Math.min(minRatio, el.clientWidth / el.scrollWidth)
      }
    })

    if (minRatio < 1) {
      const base = parseFloat(getComputedStyle(els[0]).fontSize)
      const shared = base * minRatio

      if (shared >= MIN_NAME_SIZE) {
        // All names fit on one line at this shared size — apply uniformly
        els.forEach(el => { el.style.fontSize = `${shared}px` })
      } else {
        // Shared size would be too small — apply minimum to all,
        // then let any name that still overflows wrap to a new line
        els.forEach(el => { el.style.fontSize = `${MIN_NAME_SIZE}px` })
        els.forEach(el => {
          if (el.scrollWidth > el.clientWidth) {
            el.style.whiteSpace = 'normal'
          }
        })
      }
    }
  }, [visibleStudents])

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
        className="rounded-2xl sm:rounded-3xl md:rounded-[48px] shadow-lg sm:shadow-2xl shadow-slate-200/50 dark:shadow-blue-500/10 overflow-hidden transition-colors duration-500 border w-full relative"
        style={{
          backgroundColor: isDarkMode ? themeColors.dark.surface : '#ffffff',
          borderColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#f1f5f9',
          width: '100%',
          maxWidth: '100%'
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400 z-10" />
        {/* MOBILE CARD VIEW */}
        <div className="md:hidden p-2 sm:p-4 space-y-3 sm:space-y-4">
          {/* Mobile Header */}
          <div className="flex items-center justify-center gap-4 px-2 pb-2">
            <button
              onClick={() => toggleSelectAll(pageIds)}
              className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {isPageSelected
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
          {visibleStudents.length === 0 ? (
            <div className="py-16 sm:py-20 text-center text-slate-400 italic text-sm">
              No applicants match this criteria.
            </div>
          ) : (
            <>
              {visibleStudents.map((student, index) => {
                return (
                  <MobileApplicantRow
                    key={student.id}
                    student={student}
                    isSelected={selectedIds.includes(student.id)}
                    isHidden={hiddenRows.has(student.id)}
                    isExiting={exitingRows[student.id]}
                    isAnimatingIn={animatingIds.has(student.id) || localAnimatingIds.has(student.id)}
                    animIndex={index}
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
            <div className={`pt-3 sm:pt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
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

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block relative" ref={desktopTableRef}>
          <Table className="min-w-full table-fixed">
            <TableHeader>
              <TableRow className={`border-none hover:bg-transparent ${isDarkMode ? 'bg-slate-900/80' : 'bg-slate-50/80'}`}>
                <TableHead className="w-12 min-w-[48px] max-w-[48px] pl-6">
                  <button type="button" onClick={() => toggleSelectAll(pageIds)}>
                    {isPageSelected
                      ? <CheckSquare className="text-blue-500" size={17} />
                      : <Square className={isDarkMode ? "text-slate-600" : "text-slate-300"} size={17} />
                    }
                  </button>
                </TableHead>
                <TableHead className={`w-[280px] min-w-[280px] px-6 py-5 font-black uppercase text-[9px] tracking-[0.25em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Applicant</TableHead>
                <TableHead className={`w-[90px] min-w-[90px] font-black uppercase text-[9px] tracking-[0.25em] text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Gender</TableHead>
                <TableHead className={`w-[110px] min-w-[110px] font-black uppercase text-[9px] tracking-[0.25em] text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Strand</TableHead>
                <TableHead className={`w-[140px] min-w-[140px] font-black uppercase text-[9px] tracking-[0.25em] text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Section</TableHead>
                <TableHead className={`w-[80px] min-w-[80px] font-black uppercase text-[9px] tracking-[0.25em] text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>GWA</TableHead>
                <TableHead className={`w-[280px] min-w-[280px] text-right px-6 font-black uppercase text-[9px] tracking-[0.25em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <div className="flex items-center justify-end gap-3">
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <PaginationBar
                          currentPage={currentPage}
                          totalPages={totalPages}
                          setCurrentPage={setCurrentPage}
                          isDarkMode={isDarkMode}
                          compact
                        />
                      </div>
                    )}
                    <span>Actions</span>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleStudents.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-32 text-center text-slate-400 italic">No applicants match this criteria.</TableCell></TableRow>
              ) : (
                <>
                  {visibleStudents.map((student, index) => {
                    return (
                      <DesktopApplicantRow
                        key={student.id}
                        student={student}
                        isSelected={selectedIds.includes(student.id)}
                        isHidden={hiddenRows.has(student.id)}
                        isExiting={exitingRows[student.id]}
                        isAnimatingIn={animatingIds.has(student.id) || localAnimatingIds.has(student.id)}
                        animIndex={index}
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
            <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
                isDarkMode={isDarkMode}
                totalShowing={visibleStudents.length}
                totalCount={totalFilteredCount}
              />
            </div>
          )}
        </div>
      </ThemedCard>
    </>
  )
})
ApplicantsTable.displayName = "ApplicantsTable"