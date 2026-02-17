// src/app/admin/applicants/components/ApplicantsFilter.tsx
import { memo, useState, useMemo } from "react"
import { ArrowUpDown, ChevronDown, CheckCircle2, ChevronLeft, ChevronRight, MousePointer2, Layers, Cpu, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ApplicantsFilterProps {
  isDarkMode: boolean
  filter: "Pending" | "Accepted" | "Rejected"
  setFilter: (filter: "Pending" | "Accepted" | "Rejected") => void
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

  const currentTabStudents = useMemo(() => {
    return students.filter(s => {
       if (filter === 'Accepted') return s.status === 'Accepted' || s.status === 'Approved';
       return s.status === filter;
    })
  }, [students, filter])

  const handleSelection = (type: 'page' | 'all' | 'ict' | 'gas') => {
    let ids: string[] = []
    switch(type) {
      case 'page':
        ids = filteredStudents.map(s => s.id)  // ✅ Now selects only current page
        break;
      case 'all':
        ids = allFilteredStudents.map(s => s.id)  // ✅ Updated to use allFilteredStudents
        break;
      case 'ict':
        ids = currentTabStudents.filter(s => s.strand === 'ICT').map(s => s.id)
        break;
      case 'gas':
        ids = currentTabStudents.filter(s => s.strand === 'GAS').map(s => s.id)
        break;
    }
    setSelectedIds(ids)
    setSelectionOpen(false)
  }

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full relative z-30" style={{ maxWidth: '100%' }}>
      <div className={`flex items-center gap-1 p-1.5 rounded-[20px] w-fit max-w-full mx-auto md:mx-0 overflow-x-auto transition-all duration-500 border ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
        {(["Pending", "Accepted", "Rejected"] as const).map((tab) => {
          const isActive = filter === tab
          return (
            <button
              key={tab}
              onClick={() => { setFilter(tab); setSelectedIds([]); }}
              className={`relative px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ease-out whitespace-nowrap flex items-center gap-2 ${
                isActive 
                  ? 'bg-white text-blue-600 shadow-md shadow-blue-500/10 border border-slate-100 dark:bg-slate-800 dark:text-blue-400 dark:border-slate-700 scale-105'
                  : (isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700')
              }`}
            >
              {tab}
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] leading-none transition-all duration-500 ${isActive ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 scale-110' : (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400')}`}>
                {students.filter(s => s.status === tab || (tab === 'Accepted' && s.status === 'Approved')).length}
              </span>
            </button>
          )
        })}
      </div>

      {/* PAGINATION CONTROLS */}
      <div className={`flex items-center justify-center gap-2 p-1.5 rounded-[20px] border shadow-sm transition-colors duration-500 w-fit mx-auto md:mx-0 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100'}`}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 dark:text-slate-400"
        >
          <ChevronLeft size={16} />
        </Button>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 w-16 text-center">
          Page {currentPage} / {Math.max(1, totalPages)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 dark:text-slate-400"
        >
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* SORTING DROPDOWN */}
      <div className="relative w-full md:w-auto flex justify-center md:block">
        <div className="flex gap-2">
        <div className="relative">
        <Button 
          onClick={() => setSelectionOpen(!selectionOpen)}
          className={`h-12 px-5 rounded-[20px] font-black uppercase text-[10px] tracking-widest border transition-all flex items-center gap-2 shadow-lg ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <MousePointer2 size={14} className="text-purple-500" />
          <span className="hidden sm:inline">Selection</span>
          <ChevronDown size={14} className={`transition-transform duration-300 ${selectionOpen ? 'rotate-180' : ''}`} />
        </Button>

        {selectionOpen && (
          <div className={`absolute top-full left-0 mt-2 w-56 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className="p-1.5 space-y-1">
               <button onClick={() => handleSelection('page')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors text-left ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                  <MousePointer2 size={14} className="text-purple-500" /> Select Page ({filteredStudents.length})
               </button>
               <button onClick={() => handleSelection('all')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors text-left ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                  <Layers size={14} className="text-blue-500" /> Select All ({allFilteredStudents.length})
               </button>
               <button onClick={() => handleSelection('ict')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors text-left ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                  <Cpu size={14} className="text-cyan-500" /> Select All ICT
               </button>
               <button onClick={() => handleSelection('gas')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors text-left ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                  <BookOpen size={14} className="text-orange-500" /> Select All GAS
               </button>
            </div>
          </div>
        )}
        </div>

        <Button 
          onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
          className={`h-12 px-5 rounded-[20px] font-black uppercase text-[10px] tracking-widest border transition-all flex items-center gap-2 shadow-lg ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <ArrowUpDown size={14} className="text-blue-500" />
          <span className="hidden sm:inline">
            {sortBy === 'alpha' ? 'Alphabetical (Surname)' : 
             sortBy === 'date_new' ? 'Last To Enroll' : 
             sortBy === 'date_old' ? 'First To Enroll' : 
             sortBy === 'age' ? 'Age Based' : 
             sortBy === 'gender' ? 'Gender-Based' : 
             sortBy === 'strand_ict' ? 'ICT Priority' : 
             sortBy === 'strand_gas' ? 'GAS Priority' : 
             sortBy === 'gwa_desc' ? 'GWA Descending' : 
             sortBy === 'gwa_asc' ? 'GWA Ascending' : 'Alphabetical (First Name)'}
          </span>
          <ChevronDown size={14} className={`transition-transform duration-300 ${sortDropdownOpen ? 'rotate-180' : ''}`} />
        </Button>

        {sortDropdownOpen && (
          <div className={`absolute top-full left-0 md:left-auto md:right-0 mt-2 w-56 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className="p-1.5 space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
              {[
                { id: 'alpha', label: 'Alphabetical (Surname)' },
                { id: 'date_old', label: 'First To Enroll' },
                { id: 'date_new', label: 'Last To Enroll' },
                { id: 'age', label: 'Age Based' },
                { id: 'gender', label: 'Gender-Based' },
                { id: 'strand_ict', label: 'ICT Strand / GAS' },
                { id: 'strand_gas', label: 'GAS Strand / ICT' },
                { id: 'gwa_desc', label: 'GWA Descending' },
                { id: 'gwa_asc', label: 'GWA Ascending' },
                { id: 'alpha_first', label: 'Alphabetical (First Name)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { setSortBy(opt.id); setSortDropdownOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors text-left ${sortBy === opt.id ? (isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}`}
                >
                  {opt.label}
                  {sortBy === opt.id && <CheckCircle2 size={12} />}
                </button>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
})
ApplicantsFilter.displayName = "ApplicantsFilter"