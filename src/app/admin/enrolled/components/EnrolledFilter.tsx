// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\enrolled\components\EnrolledFilter.tsx

import { memo } from "react"
import { ChevronLeft, ChevronRight, Filter, ArrowUpDown, ChevronDown, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EnrolledFilterProps {
  isDarkMode: boolean
  strandFilter: string
  setStrandFilter: (val: string) => void
  categoryFilter: string
  setCategoryFilter: (val: string) => void
  currentPage: number
  totalPages: number
  setCurrentPage: (page: number) => void
  totalCount: number
  sortBy: string
  setSortBy: (sort: string) => void
  sortDropdownOpen: boolean
  setSortDropdownOpen: (open: boolean) => void
  strandDropdownOpen: boolean
  setStrandDropdownOpen: (open: boolean) => void
  categoryDropdownOpen: boolean
  setCategoryDropdownOpen: (open: boolean) => void
}

export const EnrolledFilter = memo(({ 
  isDarkMode, 
  strandFilter, setStrandFilter, 
  categoryFilter, setCategoryFilter,
  currentPage, totalPages, setCurrentPage,
  totalCount,
  sortBy, setSortBy, sortDropdownOpen, setSortDropdownOpen,
  strandDropdownOpen, setStrandDropdownOpen,
  categoryDropdownOpen, setCategoryDropdownOpen
}: EnrolledFilterProps) => {
  
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full relative z-30">
      
      <div className="flex items-center gap-3 flex-wrap">
        <div 
          className="flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors duration-500"
          style={{
            backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.5)' : '#ffffff',
            borderColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#f1f5f9'
          }}
        >
            <Filter size={14} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Filters</span>
        </div>

        {/* Strand Filter */}
        <div className="relative">
          <Button 
            onClick={() => setStrandDropdownOpen(!strandDropdownOpen)}
            className={`h-10 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest border transition-all flex items-center gap-2 shadow-sm ${isDarkMode ? 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <span>{strandFilter === 'ALL' ? 'All Strands' : strandFilter}</span>
            <ChevronDown size={12} className={`transition-transform duration-300 ${strandDropdownOpen ? 'rotate-180' : ''}`} />
          </Button>

          {strandDropdownOpen && (
            <div className={`absolute top-full left-0 mt-2 w-40 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className="p-1.5 space-y-1">
                {['ALL', 'ICT', 'GAS'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setStrandFilter(opt); setStrandDropdownOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors text-left ${strandFilter === opt ? (isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}`}
                  >
                    {opt === 'ALL' ? 'All Strands' : opt}
                    {strandFilter === opt && <CheckCircle2 size={12} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Category Filter */}
        <div className="relative">
          <Button 
            onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
            className={`h-10 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest border transition-all flex items-center gap-2 shadow-sm ${isDarkMode ? 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <span>{categoryFilter === 'ALL' ? 'All Categories' : categoryFilter === 'JHS' ? 'JHS Graduate' : 'ALS Passer'}</span>
            <ChevronDown size={12} className={`transition-transform duration-300 ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
          </Button>

          {categoryDropdownOpen && (
            <div className={`absolute top-full left-0 mt-2 w-48 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className="p-1.5 space-y-1">
                {[
                  { id: 'ALL', label: 'All Categories' },
                  { id: 'JHS', label: 'JHS Graduate' },
                  { id: 'ALS', label: 'ALS Passer' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { setCategoryFilter(opt.id); setCategoryDropdownOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors text-left ${categoryFilter === opt.id ? (isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}`}
                  >
                    {opt.label}
                    {categoryFilter === opt.id && <CheckCircle2 size={12} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className={`h-8 w-[1px] mx-2 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
        
        <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            {totalCount} Records Found
        </span>
      </div>

      <div className="flex items-center gap-3 flex-wrap justify-start md:justify-end w-full md:w-auto">
        {/* Pagination */}
        <div 
          className="flex items-center gap-2 p-1.5 rounded-[20px] border shadow-sm transition-colors duration-500"
          style={{
            backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.5)' : '#ffffff',
            borderColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#f1f5f9'
          }}
        >
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

        {/* Sorting Dropdown */}
        <div className="relative">
          <Button 
            onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
            className={`h-12 px-5 rounded-[20px] font-black uppercase text-[10px] tracking-widest border transition-all flex items-center gap-2 shadow-sm ${isDarkMode ? 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <ArrowUpDown size={14} className="text-blue-500" />
            <span className="hidden sm:inline">
              {sortBy === 'alpha' ? 'Alphabetical (Surname)' : 
              sortBy === 'date_new' ? 'Last To Enroll' : 
              sortBy === 'date_old' ? 'First To Enroll' : 
              sortBy === 'gwa_desc' ? 'GWA Descending' : 
              sortBy === 'gwa_asc' ? 'GWA Ascending' : 'Alphabetical (First Name)'}
            </span>
            <ChevronDown size={14} className={`transition-transform duration-300 ${sortDropdownOpen ? 'rotate-180' : ''}`} />
          </Button>

          {sortDropdownOpen && (
            <div className={`absolute top-full right-0 mt-2 w-56 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className="p-1.5 space-y-1">
                {[
                  { id: 'alpha', label: 'Alphabetical (Surname)' },
                  { id: 'date_old', label: 'First To Enroll' },
                  { id: 'date_new', label: 'Last To Enroll' },
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

EnrolledFilter.displayName = "EnrolledFilter"
