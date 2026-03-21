// src/app/admin/applicants/components/ApplicantsFilter.tsx
import { memo, useState, useMemo } from "react"
import { ArrowUpDown, ChevronDown, CheckCircle2, ChevronLeft, ChevronRight, MousePointer2, Layers, Cpu, BookOpen, Clock, UserCheck, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ApplicantsFilterProps {
  isDarkMode: boolean
  filter: "Pending" | "Accepted" | "Rejected"
  setFilter: (filter: "Pending" | "Accepted" | "Rejected") => void
  gradeLevelFilter: "ALL" | "11" | "12"
  setGradeLevelFilter: (filter: "ALL" | "11" | "12") => void
  students: any[]
  filteredStudents?: any[]
  allFilteredStudents?: any[]  // ✅ ADD THIS LINE
  setSelectedIds: (ids: string[]) => void
  sortBy: string
  setSortBy: (sort: string) => void
  sortDropdownOpen: boolean
  setSortDropdownOpen: (open: boolean) => void
  currentPage: number
  totalPages: number
  setCurrentPage: (page: number) => void
}

export const ApplicantsFilter = memo(({ 
  isDarkMode, 
  filter, 
  setFilter,
  gradeLevelFilter,
  setGradeLevelFilter,
  students, 
  filteredStudents = [], 
  allFilteredStudents = [],  // ✅ ADD THIS LINE
  setSelectedIds, 
  sortBy, 
  setSortBy, 
  sortDropdownOpen, 
  setSortDropdownOpen, 
  currentPage, 
  totalPages, 
  setCurrentPage
}: ApplicantsFilterProps) => {
  const [selectionOpen, setSelectionOpen] = useState(false)

  // Students filtered by the current grade level selection — used for status tab counts
  const gradeFilteredStudents = useMemo(() => {
    if (gradeLevelFilter === "ALL") return students
    return students.filter(s => s.grade_level === gradeLevelFilter)
  }, [students, gradeLevelFilter])

  const handleSelection = (type: 'page' | 'all' | 'ict' | 'gas') => {
    let ids: string[] = []
    const gradeTabStudents = gradeFilteredStudents.filter(s => {
      if (filter === 'Accepted') return s.status === 'Accepted' || s.status === 'Approved'
      return s.status === filter
    })
    switch(type) {
      case 'page':
        ids = filteredStudents.map(s => s.id)
        break;
      case 'all':
        ids = allFilteredStudents.map(s => s.id)
        break;
      case 'ict':
        ids = gradeTabStudents.filter(s => s.strand === 'ICT').map(s => s.id)
        break;
      case 'gas':
        ids = gradeTabStudents.filter(s => s.strand === 'GAS').map(s => s.id)
        break;
    }
    setSelectedIds(ids)
    setSelectionOpen(false)
  }

  const TAB_CONFIG = [
    { id: 'Pending' as const,  icon: <Clock size={12} />,     color: 'amber'   },
    { id: 'Accepted' as const, icon: <UserCheck size={12} />, color: 'emerald' },
    { id: 'Rejected' as const, icon: <UserX size={12} />,     color: 'red'     },
  ]

  const tabActiveStyles: Record<string, string> = {
    Pending:  isDarkMode ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-amber-500/10'   : 'bg-amber-50 text-amber-700 border-amber-300 shadow-amber-500/10',
    Accepted: isDarkMode ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-emerald-500/10' : 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-emerald-500/10',
    Rejected: isDarkMode ? 'bg-red-500/15 text-red-300 border-red-500/30 shadow-red-500/10'           : 'bg-red-50 text-red-700 border-red-300 shadow-red-500/10',
  }

  const countDotStyles: Record<string, string> = {
    Pending:  isDarkMode ? 'bg-amber-500/20 text-amber-400'   : 'bg-amber-100 text-amber-600',
    Accepted: isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600',
    Rejected: isDarkMode ? 'bg-red-500/20 text-red-400'       : 'bg-red-100 text-red-600',
  }

  return (
    <div className="flex flex-col gap-3 w-full relative z-30">
      {/* Row 1: Grade filter + status tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">

        {/* Grade level pills */}
        <div className={`flex items-center gap-1 p-1 rounded-2xl border shrink-0 ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          {(["ALL", "11", "12"] as const).map(gl => (
            <button
              key={gl}
              type="button"
              onClick={() => setGradeLevelFilter(gl)}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-200 ${
                gradeLevelFilter === gl
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {gl === "ALL" ? "All" : `G${gl}`}
            </button>
          ))}
        </div>

        {/* Status tabs — color-coded per status */}
        <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/80 border-slate-200 shadow-sm'}`}>
          {TAB_CONFIG.map(({ id, icon }) => {
            const isActive = filter === id
            const count = gradeFilteredStudents.filter(s => s.status === id || (id === 'Accepted' && s.status === 'Approved')).length
            return (
              <button
                key={id}
                type="button"
                onClick={() => { setFilter(id); setSelectedIds([]); }}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 border whitespace-nowrap ${
                  isActive
                    ? `${tabActiveStyles[id]} shadow-lg scale-[1.03]`
                    : `border-transparent ${isDarkMode ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60' : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`
                }`}
              >
                <span className={isActive ? '' : 'opacity-50'}>{icon}</span>
                {id}
                <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black leading-none transition-all ${isActive ? countDotStyles[id] : (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-400')}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Pagination */}
        <div className={`flex items-center gap-1 p-1 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`h-8 w-8 rounded-xl disabled:opacity-25 ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            <ChevronLeft size={15} />
          </Button>
          <span className={`text-[10px] font-black uppercase tracking-widest w-14 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {currentPage}/{Math.max(1, totalPages)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className={`h-8 w-8 rounded-xl disabled:opacity-25 ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            <ChevronRight size={15} />
          </Button>
        </div>

        {/* Selection + Sort dropdowns */}
        <div className="flex gap-2">
          {/* Selection dropdown */}
          <div className="relative">
            <Button
              onClick={() => setSelectionOpen(!selectionOpen)}
              className={`h-10 px-4 rounded-2xl font-black uppercase text-[9px] tracking-widest border transition-all flex items-center gap-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}
            >
              <MousePointer2 size={13} className="text-purple-500" />
              <span className="hidden sm:inline">Select</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${selectionOpen ? 'rotate-180' : ''}`} />
            </Button>
            {selectionOpen && (
              <div className={`absolute top-full left-0 mt-2 w-52 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                <div className="p-1.5 space-y-0.5">
                  <button type="button" onClick={() => handleSelection('page')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors text-left ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    <MousePointer2 size={13} className="text-purple-500" /> Page ({filteredStudents.length})
                  </button>
                  <button type="button" onClick={() => handleSelection('all')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors text-left ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    <Layers size={13} className="text-blue-500" /> All ({allFilteredStudents.length})
                  </button>
                  <button type="button" onClick={() => handleSelection('ict')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors text-left ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    <Cpu size={13} className="text-cyan-500" /> All ICT
                  </button>
                  <button type="button" onClick={() => handleSelection('gas')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors text-left ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    <BookOpen size={13} className="text-orange-500" /> All GAS
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <Button
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              className={`h-10 px-4 rounded-2xl font-black uppercase text-[9px] tracking-widest border transition-all flex items-center gap-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}
            >
              <ArrowUpDown size={13} className="text-blue-500" />
              <span className="hidden sm:inline max-w-[100px] truncate">
                {sortBy === 'alpha' ? 'Surname A–Z' :
                 sortBy === 'date_new' ? 'Latest First' :
                 sortBy === 'date_old' ? 'Oldest First' :
                 sortBy === 'age' ? 'By Age' :
                 sortBy === 'gender' ? 'By Gender' :
                 sortBy === 'strand_ict' ? 'ICT First' :
                 sortBy === 'strand_gas' ? 'GAS First' :
                 sortBy === 'gwa_desc' ? 'GWA High–Low' :
                 sortBy === 'gwa_asc' ? 'GWA Low–High' : 'First Name A–Z'}
              </span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${sortDropdownOpen ? 'rotate-180' : ''} shrink-0`} />
            </Button>
            {sortDropdownOpen && (
              <div className={`absolute top-full right-0 mt-2 w-52 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                <div className="p-1.5 space-y-0.5 max-h-[280px] overflow-y-auto">
                  {[
                    { id: 'alpha',      label: 'Surname A–Z'   },
                    { id: 'date_old',   label: 'Oldest First'  },
                    { id: 'date_new',   label: 'Latest First'  },
                    { id: 'age',        label: 'By Age'        },
                    { id: 'gender',     label: 'By Gender'     },
                    { id: 'strand_ict', label: 'ICT First'     },
                    { id: 'strand_gas', label: 'GAS First'     },
                    { id: 'gwa_desc',   label: 'GWA High–Low'  },
                    { id: 'gwa_asc',    label: 'GWA Low–High'  },
                    { id: 'alpha_first',label: 'First Name A–Z'},
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => { setSortBy(opt.id); setSortDropdownOpen(false); }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors text-left ${sortBy === opt.id ? (isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}`}
                    >
                      {opt.label}
                      {sortBy === opt.id && <CheckCircle2 size={11} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
ApplicantsFilter.displayName = "ApplicantsFilter"