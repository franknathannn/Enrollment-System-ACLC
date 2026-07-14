// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\sections\components\SectionGroup.tsx

import { memo, useMemo, useState, useEffect, useRef } from "react"
import { ChevronDown, ChevronUp, CheckSquare, Square, Cpu, BookOpen, Atom, BarChart3 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from "@/components/ui/table"
import { SectionCard } from "./SectionCard"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const SectionRow = memo(({ sec, idx, onSelect, onToggleSelect, isSelected, isDarkMode, config }: any) => {
  const activeStudents = useMemo(() => sec.students?.filter((s: any) => s.status === 'Accepted' || s.status === 'Approved') || [], [sec.students])
  const mCount = activeStudents.filter((s: any) => s.gender === 'Male').length
  const fCount = activeStudents.filter((s: any) => s.gender === 'Female').length
  const jhsCount = activeStudents.filter((s: any) => s.student_category?.toLowerCase().includes('jhs') || s.student_category === 'Standard').length
  const alsCount = activeStudents.filter((s: any) => s.student_category?.toLowerCase().includes('als')).length

  const capacity = sec.capacity || 40
  const fillPercent = capacity > 0 ? Math.min((activeStudents.length / capacity) * 100, 100) : 0
  const mP = capacity > 0 ? Math.min((mCount / capacity) * 100, 100) : 0
  const fP = capacity > 0 ? Math.min((fCount / capacity) * 100, 100) : 0

  const strand = sec.strand || 'GAS'
  const isICT = strand === 'ICT'
  const isFull = fillPercent >= 100

  const strandThemeMap: Record<string, {
    rowActiveBg: string;
    hoverBg: string;
    leftBarBg: string;
    leftBarShadow: string;
    checkColor: string;
    icon: React.ReactNode;
    badgeClass: string;
    fullShadow: string;
    fullGlowBg: string;
    fullProgressGlow: string;
  }> = {
    'ICT': {
      rowActiveBg: isDarkMode ? 'from-blue-900/40 to-slate-900' : 'from-blue-50 to-white',
      hoverBg: isDarkMode ? 'rgba(30, 58, 138, 0.4)' : 'rgba(239, 246, 255, 1)',
      leftBarBg: 'bg-blue-500',
      leftBarShadow: 'shadow-[0_0_15px_rgba(59,130,246,0.8)]',
      checkColor: 'text-blue-600',
      icon: <Cpu size={16} className="text-blue-500/50" />,
      badgeClass: 'from-blue-500 to-blue-600 shadow-blue-500/20',
      fullShadow: 'shadow-[0_0_15px_rgba(59,130,246,0.15)] dark:shadow-[0_0_15px_rgba(59,130,246,0.3)]',
      fullGlowBg: 'bg-blue-500/10',
      fullProgressGlow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]'
    },
    'TechPro': {
      rowActiveBg: isDarkMode ? 'from-blue-900/40 to-slate-900' : 'from-blue-50 to-white',
      hoverBg: isDarkMode ? 'rgba(30, 58, 138, 0.4)' : 'rgba(239, 246, 255, 1)',
      leftBarBg: 'bg-blue-500',
      leftBarShadow: 'shadow-[0_0_15px_rgba(59,130,246,0.8)]',
      checkColor: 'text-blue-600',
      icon: <Cpu size={16} className="text-blue-500/50" />,
      badgeClass: 'from-blue-500 to-blue-600 shadow-blue-500/20',
      fullShadow: 'shadow-[0_0_15px_rgba(59,130,246,0.15)] dark:shadow-[0_0_15px_rgba(59,130,246,0.3)]',
      fullGlowBg: 'bg-blue-500/10',
      fullProgressGlow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]'
    },
    'STEM': {
      rowActiveBg: isDarkMode ? 'from-emerald-900/40 to-slate-900' : 'from-emerald-50 to-white',
      hoverBg: isDarkMode ? 'rgba(6, 78, 59, 0.4)' : 'rgba(236, 253, 245, 1)',
      leftBarBg: 'bg-emerald-500',
      leftBarShadow: 'shadow-[0_0_15px_rgba(16,185,129,0.8)]',
      checkColor: 'text-emerald-600',
      icon: <Atom size={16} className="text-emerald-500/50" />,
      badgeClass: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20',
      fullShadow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)] dark:shadow-[0_0_15px_rgba(16,185,129,0.3)]',
      fullGlowBg: 'bg-emerald-500/10',
      fullProgressGlow: 'shadow-[0_0_20px_rgba(16,185,129,0.4)]'
    },
    'ABM': {
      rowActiveBg: isDarkMode ? 'from-yellow-900/40 to-slate-900' : 'from-yellow-50 to-white',
      hoverBg: isDarkMode ? 'rgba(120, 53, 15, 0.4)' : 'rgba(254, 252, 232, 1)',
      leftBarBg: 'bg-yellow-500',
      leftBarShadow: 'shadow-[0_0_15px_rgba(234,179,8,0.8)]',
      checkColor: 'text-yellow-600',
      icon: <BarChart3 size={16} className="text-yellow-500/50" />,
      badgeClass: 'from-yellow-500 to-yellow-600 shadow-yellow-500/20',
      fullShadow: 'shadow-[0_0_15px_rgba(234,179,8,0.15)] dark:shadow-[0_0_15px_rgba(234,179,8,0.3)]',
      fullGlowBg: 'bg-yellow-500/10',
      fullProgressGlow: 'shadow-[0_0_20px_rgba(234,179,8,0.4)]'
    },
    'HUMSS': {
      rowActiveBg: isDarkMode ? 'from-amber-900/40 to-slate-900' : 'from-amber-50 to-white',
      hoverBg: isDarkMode ? 'rgba(120, 53, 15, 0.4)' : 'rgba(254, 243, 199, 1)',
      leftBarBg: 'bg-amber-500',
      leftBarShadow: 'shadow-[0_0_15px_rgba(245,158,11,0.8)]',
      checkColor: 'text-amber-600',
      icon: <BookOpen size={16} className="text-amber-500/50" />,
      badgeClass: 'from-amber-500 to-amber-600 shadow-amber-500/20',
      fullShadow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)] dark:shadow-[0_0_15px_rgba(245,158,11,0.3)]',
      fullGlowBg: 'bg-amber-500/10',
      fullProgressGlow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)]'
    },
    'GAS': {
      rowActiveBg: isDarkMode ? 'from-orange-900/40 to-slate-900' : 'from-orange-50 to-white',
      hoverBg: isDarkMode ? 'rgba(124, 45, 18, 0.4)' : 'rgba(255, 247, 237, 1)',
      leftBarBg: 'bg-orange-500',
      leftBarShadow: 'shadow-[0_0_15px_rgba(249,115,22,0.8)]',
      checkColor: 'text-orange-600',
      icon: <BookOpen size={16} className="text-orange-500/50" />,
      badgeClass: 'from-orange-500 to-orange-600 shadow-orange-500/20',
      fullShadow: 'shadow-[0_0_15px_rgba(249,115,22,0.15)] dark:shadow-[0_0_15px_rgba(249,115,22,0.3)]',
      fullGlowBg: 'bg-orange-500/10',
      fullProgressGlow: 'shadow-[0_0_20px_rgba(249,115,22,0.4)]'
    }
  }

  const rowTheme = strandThemeMap[strand] || strandThemeMap['GAS']

  // Animation State
  const [animM, setAnimM] = useState(false)
  const [animF, setAnimF] = useState(false)
  const [animTotal, setAnimTotal] = useState(false)

  const prevM = useRef(mCount)
  const prevF = useRef(fCount)
  const prevTotal = useRef(activeStudents.length)

  useEffect(() => {
    if (mCount !== prevM.current) {
      setAnimM(true)
      const t = setTimeout(() => setAnimM(false), 600)
      prevM.current = mCount
      return () => clearTimeout(t)
    }
  }, [mCount])

  useEffect(() => {
    if (fCount !== prevF.current) {
      setAnimF(true)
      const t = setTimeout(() => setAnimF(false), 600)
      prevF.current = fCount
      return () => clearTimeout(t)
    }
  }, [fCount])

  useEffect(() => {
    if (activeStudents.length !== prevTotal.current) {
      setAnimTotal(true)
      const t = setTimeout(() => setAnimTotal(false), 600)
      prevTotal.current = activeStudents.length
      return () => clearTimeout(t)
    }
  }, [activeStudents.length])

  // Dynamic Equilibrium Logic
  let linePosition = '50%';
  if (mP > 50) {
    linePosition = `${mP}%`;
  } else if (fP > 50) {
    linePosition = `${100 - fP}%`;
  }

  return (
    <TableRow
      onClick={() => onSelect(sec.section_name)}
      className={`cursor-pointer transition-all duration-300 relative group overflow-hidden animate-in slide-in-from-right-4 fade-in fill-mode-backwards hover:shadow-xl hover:scale-[1.005] rounded-xl ${isSelected
          ? `bg-gradient-to-r ${rowTheme.rowActiveBg}`
          : (isDarkMode ? 'bg-gradient-to-r from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900' : 'bg-gradient-to-r from-white to-slate-50 hover:from-slate-50 hover:to-white')
        }`}
      style={{ animationDelay: `${idx * 50}ms`, boxShadow: isSelected ? undefined : (isDarkMode ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(148, 163, 184, 0.1)') }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = rowTheme.hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = ''
        }
      }}
    >
      <TableCell className="pl-8 py-4 relative">
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 ${isSelected ? `opacity-100 ${rowTheme.leftBarShadow}` : 'opacity-30 group-hover:opacity-100 shadow-none'} ${rowTheme.leftBarBg}`} />
        <div className="flex items-center gap-3">
          <button onClick={(e) => { e.stopPropagation(); onToggleSelect(sec.id); }}>
            {isSelected ? (
              <CheckSquare size={18} className={rowTheme.checkColor} />
            ) : (
              <Square size={18} className="text-slate-300" />
            )}
          </button>
          {rowTheme.icon}
        </div>
      </TableCell>
      <TableCell className="py-4">
        <div>
          <p className={`font-black uppercase text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{sec.section_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`bg-gradient-to-r ${rowTheme.badgeClass} text-white border-none text-[8px] font-black uppercase px-2 py-0.5 shadow-md`}>
              {strand} Strand
            </Badge>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">S.Y. {config?.school_year || "UNSET"}</span>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4 w-[30%]">
        <div className={`p-4 rounded-2xl border relative overflow-hidden group/progress transition-all duration-500 
          ${animTotal ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-blue-500 scale-[1.02]' : ''}
          ${isFull ? rowTheme.fullShadow : ''} 
          ${isDarkMode ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50/80 border-slate-200'}`}>

          {/* Blur/Glow Effect */}
          <div className={`absolute inset-0 opacity-0 group-hover/progress:opacity-100 transition-opacity duration-500 
            ${isFull ? rowTheme.fullGlowBg : 'bg-slate-500/5'}`} />

          <div className="flex justify-between items-end mb-2 relative z-10">
            <span className={`text-[10px] font-black uppercase transition-all duration-300 ${animM ? 'text-blue-400 scale-110' : 'text-blue-500'}`}>{Math.round(mP)}% Male</span>
            <span className={`text-[10px] font-black uppercase transition-all duration-300 ${animTotal ? 'text-purple-400 scale-110' : 'text-purple-500'}`}>{Math.round(fillPercent)}% Total</span>
            <span className={`text-[10px] font-black uppercase transition-all duration-300 ${animF ? 'text-pink-400 scale-110' : 'text-pink-500'}`}>{Math.round(fP)}% Female</span>
          </div>

          <div className={`relative h-3 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-inner isolate transition-all duration-500 ease-in-out
              ${isFull ? rowTheme.fullProgressGlow : 'shadow-none'}`}>
            <div
              style={{ width: `${mP}%` }}
              className={`absolute left-0 top-0 bottom-0 h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(59,130,246,0.8)] ${animM ? 'brightness-150' : ''}`}
            />
            <div
              style={{ width: `${fP}%` }}
              className={`absolute right-0 top-0 bottom-0 h-full bg-gradient-to-l from-pink-600 to-pink-400 transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(236,72,153,0.8)] ${animF ? 'brightness-150' : ''}`}
            />
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-white dark:bg-slate-500 z-20 transition-all duration-1000 ease-in-out shadow-sm dark:shadow-slate-500"
              style={{ left: linePosition }}
            />
          </div>

          <div className="flex justify-between mt-2 relative z-10">
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full bg-blue-500 transition-all duration-300 ${animM ? 'scale-150 shadow-[0_0_10px_blue]' : ''}`} />
              <span className={`text-[8px] font-bold uppercase transition-all duration-300 ${animM ? 'text-blue-400' : 'text-slate-400'}`}>{mCount} Male</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-[8px] font-bold uppercase transition-all duration-300 ${animF ? 'text-pink-400' : 'text-slate-400'}`}>{fCount} Female</span>
              <div className={`w-1.5 h-1.5 rounded-full bg-pink-500 transition-all duration-300 ${animF ? 'scale-150 shadow-[0_0_10px_pink]' : ''}`} />
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-center">
            <span className={`text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${animTotal ? 'text-white scale-110' : (isDarkMode ? 'text-slate-400' : 'text-slate-500')}`}>
              {activeStudents.length} / {capacity} Students
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4 text-center">
        <div className={`inline-flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 group-hover:scale-110 ${animM ? 'bg-blue-600 scale-125 shadow-lg shadow-blue-500/50' : (isDarkMode ? 'bg-slate-800 group-hover:bg-slate-700' : 'bg-slate-50 group-hover:bg-white group-hover:shadow-md')}`}>
          <span className={`text-[10px] font-black ${animM ? 'text-white' : 'text-blue-500'}`}>M</span>
          <span className={`text-sm font-black ${animM ? 'text-white' : (isDarkMode ? 'text-white' : 'text-slate-900')}`}>{mCount}</span>
        </div>
      </TableCell>
      <TableCell className="py-4 text-center">
        <div className={`inline-flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 group-hover:scale-110 ${animF ? 'bg-pink-600 scale-125 shadow-lg shadow-pink-500/50' : (isDarkMode ? 'bg-slate-800 group-hover:bg-slate-700' : 'bg-slate-50 group-hover:bg-white group-hover:shadow-md')}`}>
          <span className={`text-[10px] font-black ${animF ? 'text-white' : 'text-pink-500'}`}>F</span>
          <span className={`text-sm font-black ${animF ? 'text-white' : (isDarkMode ? 'text-white' : 'text-slate-900')}`}>{fCount}</span>
        </div>
      </TableCell>
      <TableCell className="py-4 text-center">
        <div className={`inline-flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-slate-800 group-hover:bg-slate-700' : 'bg-slate-50 group-hover:bg-white group-hover:shadow-md'}`}>
          <span className="text-[8px] font-black text-purple-500 uppercase">JHS</span>
          <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{jhsCount}</span>
        </div>
      </TableCell>
      <TableCell className="py-4 text-center">
        <div className={`inline-flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-slate-800 group-hover:bg-slate-700' : 'bg-slate-50 group-hover:bg-white group-hover:shadow-md'}`}>
          <span className="text-[8px] font-black text-orange-500 uppercase">ALS</span>
          <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{alsCount}</span>
        </div>
      </TableCell>
      <TableCell className="py-4 pr-8 text-right">
        <Badge className={`${fillPercent >= 100 ? 'bg-green-500 shadow-green-500/30' : 'bg-red-500 shadow-red-500/30'} text-white border-none font-black text-[9px] uppercase px-3 py-1 shadow-lg`}>
          {fillPercent >= 100 ? 'FULL' : 'AVAILABLE'}
        </Badge>
      </TableCell>
    </TableRow>
  )
})

export const SectionGroup = memo(function SectionGroup({
  title,
  mobileTitle,
  icon,
  color,
  sections,
  load,
  onSelect,
  onDelete,
  isExpanded,
  onToggle,
  selection,
  onToggleSelect,
  onSelectAll,
  isDarkMode,
  config
}: any) {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
    orange: "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/30 dark:text-orange-400",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-500",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400"
  }

  const badgeColorMap: any = {
    blue: "bg-blue-600",
    orange: "bg-orange-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-700",
    yellow: "bg-yellow-500"
  }
  
  const gradientMap: any = {
    blue: "bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400",
    orange: "bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400",
    emerald: "bg-gradient-to-r from-emerald-500 via-green-400 to-teal-400",
    amber: "bg-gradient-to-r from-amber-700 via-orange-600 to-amber-500",
    yellow: "bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-400"
  }
  
  const textIconColorMap: any = {
    blue: "text-blue-400",
    orange: "text-orange-400",
    emerald: "text-emerald-400",
    amber: "text-amber-500",
    yellow: "text-yellow-500"
  }
  
  const progressBgMap: any = {
    blue: "[&>div]:bg-blue-500",
    orange: "[&>div]:bg-orange-500",
    emerald: "[&>div]:bg-emerald-500",
    amber: "[&>div]:bg-amber-600",
    yellow: "[&>div]:bg-yellow-500"
  }

  const allIds = useMemo(() => sections.map((s: any) => s.id), [sections])
  const isAllSelected = sections.length > 0 && sections.every((s: any) => selection.has(s.id))

  // Deduplicate sections to prevent "same key" errors
  const uniqueSections = useMemo(() => {
    const seen = new Set();
    return sections.filter((s: any) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [sections]);

  // Calculate totals for tooltip
  const totalMales = useMemo(() => sections.reduce((acc: number, sec: any) => acc + (sec.students?.filter((s: any) => s.gender === 'Male' && (s.status === 'Accepted' || s.status === 'Approved')).length || 0), 0), [sections])
  const totalFemales = useMemo(() => sections.reduce((acc: number, sec: any) => acc + (sec.students?.filter((s: any) => s.gender === 'Female' && (s.status === 'Accepted' || s.status === 'Approved')).length || 0), 0), [sections])

  return (
    <section className="space-y-6 overflow-hidden w-full">
      <div
        onClick={onToggle}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 group cursor-pointer border-b pb-8 hover:border-slate-300 transition-colors"
        style={{ borderColor: isDarkMode ? 'rgb(30 41 59)' : '#e2e8f0' }}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className={`p-4 rounded-2xl transition-transform group-hover:rotate-12 duration-500 flex-shrink-0 ${colorMap[color]}`}>
            {icon}
          </div>
          <h2
            className="text-lg md:text-2xl tracking-widest uppercase truncate flex-shrink min-w-0 font-black"
            style={{ color: isDarkMode ? '#ffffff' : '#000000' }}
          >
            <span className="hidden md:inline">{title}</span>
            <span className="inline md:hidden">{mobileTitle || title}</span>
          </h2>
          <Badge className={`${badgeColorMap[color] || 'bg-slate-600'} text-white rounded-full px-4 py-1.5 font-black text-[10px] whitespace-nowrap flex-shrink-0`}>
            {uniqueSections.length}
          </Badge>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`relative overflow-hidden flex items-center gap-3 sm:gap-6 p-3 md:p-5 rounded-[24px] md:rounded-[32px] w-full md:w-auto flex-shrink-0 cursor-help border transition-colors duration-300 ${isDarkMode
                  ? 'bg-slate-800/80 border-white/10 shadow-lg shadow-black/30'
                  : 'bg-white border-slate-200 shadow-xl shadow-slate-100/50'
                }`}
            >
              {/* Top accent strip on capacity widget */}
              <div className={`absolute top-0 left-0 right-0 h-[3px] ${gradientMap[color] || gradientMap['blue']}`} />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex justify-between gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <span>Strand Capacity</span>
                  <span className={textIconColorMap[color] || 'text-slate-400'}>({Math.round(load.percent)}%)</span>
                </div>
                <Progress
                  value={load.percent}
                  className={`h-2 [&>div]:transition-all [&>div]:duration-1000 ${progressBgMap[color] || '[&>div]:bg-slate-500'
                    } bg-slate-200 dark:bg-slate-800`}
                />
              </div>
              <div className="text-right border-l pl-3 sm:pl-6 shrink-0" style={{ borderColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,1)' }}>
                <p className={`text-sm font-black whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {load.totalEnrolled}/{load.totalCapacity}
                </p>
                <p className="text-[8px] font-bold text-slate-400 uppercase">Load</p>
              </div>
              <div className={`transition-colors shrink-0 ${isDarkMode ? 'text-slate-400 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-900'}`}>
                {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800">
            <div className="flex flex-col gap-1">
              <p className="font-bold text-xs uppercase tracking-wider">Demographics</p>
              <div className="flex gap-4 text-[10px]">
                <span className="text-blue-400">Male: {totalMales}</span>
                <span className="text-pink-400">Female: {totalFemales}</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className={`transition-all duration-300 ease-out ${isExpanded ? "opacity-100 max-h-[5000px] visible translate-y-0" : "opacity-0 max-h-0 invisible -translate-y-4 overflow-hidden"
        }`}>
        {uniqueSections.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-[40px] text-slate-300 font-bold uppercase text-xs tracking-widest">
            No Active Sections Found
          </div>
        ) : (
          <>
            {/* MOBILE: Cards */}
            <div className="md:hidden grid grid-cols-1 gap-4 px-4 max-h-[60vh] overflow-y-auto pb-4">
              {uniqueSections.map((sec: any, index: number) => (
                <div
                  key={sec.id}
                  className="relative group animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-700 fill-mode-backwards"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute top-4 right-6 z-20">
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleSelect(sec.id); }}
                      className="text-slate-400 hover:text-blue-600 transition-colors p-2 -m-2"
                    >
                      {selection.has(sec.id) ? (
                        <CheckSquare size={14} className="text-blue-600 fill-blue-50" />
                      ) : (
                        <Square size={14} />
                      )}
                    </button>
                  </div>
                  <div onClick={() => onSelect(sec.section_name)} className="cursor-pointer h-full w-full">
                    <SectionCard
                      section={sec}
                      isSelected={selection.has(sec.id)}
                      isDarkMode={isDarkMode}
                      config={config}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP: Table */}
            <div className={`hidden md:block animate-in fade-in slide-in-from-bottom-4 duration-700 relative rounded-[28px] border max-h-[60vh] overflow-y-auto [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:backdrop-blur-md [&_thead]:bg-inherit ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <div className={`absolute top-0 left-0 right-0 h-[3px] z-20 ${gradientMap[color] || gradientMap['blue']}`} />
              <Table className="border-separate border-spacing-y-3 px-4 pt-2">
                <TableHeader>
                  <TableRow className={`border-none hover:bg-transparent ${isDarkMode ? 'border-b border-slate-800 bg-slate-900/90' : 'border-b border-slate-100 bg-white/90'}`}>
                    <TableHead className="w-16 pl-6 pt-5 pb-3">
                      <button onClick={(e) => { e.stopPropagation(); onSelectAll(allIds); }} className="hover:scale-110 transition-transform">
                        {isAllSelected ? (
                          <CheckSquare size={16} className={textIconColorMap[color] || "text-slate-500"} />
                        ) : (
                          <Square size={16} className={isDarkMode ? "text-slate-600" : "text-slate-300"} />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className={`font-black uppercase text-[9px] tracking-[0.15em] pt-5 pb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Section</TableHead>
                    <TableHead className={`font-black uppercase text-[9px] tracking-[0.15em] pt-5 pb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Capacity</TableHead>
                    <TableHead className={`font-black uppercase text-[9px] tracking-[0.15em] text-center pt-5 pb-3 text-blue-500/70`}>M</TableHead>
                    <TableHead className={`font-black uppercase text-[9px] tracking-[0.15em] text-center pt-5 pb-3 text-pink-500/70`}>F</TableHead>
                    <TableHead className={`font-black uppercase text-[9px] tracking-[0.15em] text-center pt-5 pb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>JHS</TableHead>
                    <TableHead className={`font-black uppercase text-[9px] tracking-[0.15em] text-center pt-5 pb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ALS</TableHead>
                    <TableHead className={`font-black uppercase text-[9px] tracking-[0.15em] text-right pr-8 pt-5 pb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uniqueSections.map((sec: any, idx: number) => (
                    <SectionRow
                      key={sec.id}
                      sec={sec}
                      idx={idx}
                      onSelect={onSelect}
                      onToggleSelect={onToggleSelect}
                      isSelected={selection.has(sec.id)}
                      isDarkMode={isDarkMode}
                      config={config}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </section>
  )
})