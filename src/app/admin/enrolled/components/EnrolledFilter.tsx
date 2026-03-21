// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\enrolled\components\EnrolledFilter.tsx

import { memo } from "react"
import { ChevronLeft, ChevronRight, Filter, ArrowUpDown, ChevronDown, CheckCircle2, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EnrolledFilterProps {
  isDarkMode: boolean
  strandFilter: string
  setStrandFilter: (val: string) => void
  gradeLevelFilter: "ALL" | "11" | "12"
  setGradeLevelFilter: (val: "ALL" | "11" | "12") => void
  categoryFilter: string
  setCategoryFilter: (val: string) => void
  sectionFilter: string
  setSectionFilter: (val: string) => void
  sections: Array<{ id: string; section_name: string; strand: string }>
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
  sectionDropdownOpen: boolean
  setSectionDropdownOpen: (open: boolean) => void
}

export const EnrolledFilter = memo(({ 
  isDarkMode, 
  strandFilter, setStrandFilter,
  gradeLevelFilter, setGradeLevelFilter,
  categoryFilter, setCategoryFilter,
  sectionFilter, setSectionFilter, sections,
  currentPage, totalPages, setCurrentPage,
  totalCount,
  sortBy, setSortBy, sortDropdownOpen, setSortDropdownOpen,
  strandDropdownOpen, setStrandDropdownOpen,
  categoryDropdownOpen, setCategoryDropdownOpen,
  sectionDropdownOpen, setSectionDropdownOpen,
}: EnrolledFilterProps) => {

  // Filter sections shown in dropdown based on strandFilter
  const visibleSections = sections.filter(s =>
    strandFilter === "ALL" || s.strand === strandFilter
  )

  const activeSectionLabel = sectionFilter === "ALL"
    ? "All Sections"
    : sectionFilter

  return (
    <div className="relative overflow-hidden rounded-[28px] border p-4 md:p-6 transition-colors duration-500"
      style={{
        backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.85)' : '#ffffff',
        borderColor: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : '#e2e8f0',
      }}
    >
      {/* Top accent strip */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />
    <div className="flex flex-col gap-3 w-full relative z-30" style={{ maxWidth: '100%' }}>
      {/* Grade Level Filter */}
      <div className="flex items-center gap-2">
        <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Grade:</span>
        <div className={`flex items-center gap-1 p-1 rounded-[16px] border ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
          {(["ALL", "11", "12"] as const).map(gl => (
            <button
              key={gl}
              onClick={() => setGradeLevelFilter(gl)}
              className={`px-3 py-1.5 rounded-[12px] text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
                gradeLevelFilter === gl
                  ? 'bg-blue-600 text-white shadow-md'
                  : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {gl === "ALL" ? "All Grades" : `G${gl}`}
            </button>
          ))}
        </div>
      </div>
    <div className="flex flex-col md:flex-row items-center md:items-center justify-center md:justify-between gap-4 w-full">
      
      <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap w-full md:w-auto">
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
                    onClick={() => { setStrandFilter(opt); setSectionFilter('ALL'); setStrandDropdownOpen(false); }}
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

        {/* Section Filter */}
        <div className="relative">
          <Button 
            onClick={() => setSectionDropdownOpen(!sectionDropdownOpen)}
            className={`h-10 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest border transition-all flex items-center gap-2 shadow-sm ${
              sectionFilter !== 'ALL'
                ? (isDarkMode ? 'bg-blue-900/30 border-blue-700 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600')
                : (isDarkMode ? 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')
            }`}
          >
            <LayoutGrid size={12} className={sectionFilter !== 'ALL' ? (isDarkMode ? 'text-blue-400' : 'text-blue-500') : ''} />
            <span>{activeSectionLabel}</span>
            <ChevronDown size={12} className={`transition-transform duration-300 ${sectionDropdownOpen ? 'rotate-180' : ''}`} />
          </Button>

          {sectionDropdownOpen && (
            <div className={`absolute top-full left-0 mt-2 w-48 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className="p-1.5 space-y-1">
                <button
                  onClick={() => { setSectionFilter('ALL'); setSectionDropdownOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors text-left ${sectionFilter === 'ALL' ? (isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}`}
                >
                  All Sections
                  {sectionFilter === 'ALL' && <CheckCircle2 size={12} />}
                </button>

                {visibleSections.length === 0 && (
                  <p className={`px-4 py-2 text-[9px] ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                    No sections found
                  </p>
                )}

                {/* Group by strand */}
                {['ICT', 'GAS'].map(strand => {
                  const strandSecs = visibleSections.filter(s => s.strand === strand)
                  if (strandSecs.length === 0) return null
                  return (
                    <div key={strand}>
                      <p className={`px-4 pt-2 pb-1 text-[8px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                        {strand}
                      </p>
                      {strandSecs.map(sec => (
                        <button
                          key={sec.id}
                          onClick={() => { setSectionFilter(sec.section_name); setSectionDropdownOpen(false); }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors text-left ${sectionFilter === sec.section_name ? (isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}`}
                        >
                          {sec.section_name}
                          {sectionFilter === sec.section_name && <CheckCircle2 size={12} />}
                        </button>
                      ))}
                    </div>
                  )
                })}
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

      <div className="flex items-center gap-3 flex-wrap justify-center md:justify-end w-full md:w-auto">
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
    </div>
    </div>
  )
})

EnrolledFilter.displayName = "EnrolledFilter"