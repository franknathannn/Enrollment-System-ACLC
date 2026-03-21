import { memo } from "react"
import { Loader2, ArrowLeft, RefreshCw, Search, FileDown, GraduationCap, Users2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { StudentTable } from "./StudentTable"
import { ScheduleTab } from "./schedule/ScheduleTab"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export const SectionDetailView = memo(function SectionDetailView({
  sectionName,
  currentSection,
  activeStudents,
  capacity,
  fillPercent,
  config,
  isDarkMode,
  onBack,
  onRefresh,
  loading,
  searchTerm,
  setSearchTerm,
  onExport,
  sortedStudents,
  mCount,
  fCount,
  debouncedSearch,
  sections,
  handleReturnToPending,
  handleUnenroll,
  handleSwitch,
  handleOpenFile,
  handleViewProfile,
  exitingRows,
  hiddenRows,
  handleExit,
  animatingIds,
  onToggleLock,
  allSchedules,
}: any) {
  
  const isICT = currentSection?.strand === 'ICT'
  
  const strandGradient = isICT 
    ? 'from-[#020617] via-[#0f172a] to-[#020617]' 
    : 'from-[#1a0b0b] via-[#381102] to-[#1a0b0b]'

  const accentColor = isICT ? 'bg-blue-600' : 'bg-orange-600'

  if (!currentSection) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4 text-slate-400">
      <Loader2 className={`animate-spin w-12 h-12 stroke-[1] ${isDarkMode ? 'text-blue-500' : 'text-blue-600'}`} />
      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.6em] mb-1 opacity-40">System Sync</p>
        <p className="text-[9px] font-bold text-slate-500 italic">ACCESSING MATRIX TERMINAL...</p>
      </div>
    </div>
  )

  const triggerClass = `flex-1 md:flex-none rounded-[16px] md:rounded-full px-2 md:px-12 py-3 md:py-3.5 font-black uppercase text-[9px] md:text-[10px] tracking-wider md:tracking-[0.15em] transition-all duration-300 flex items-center justify-center gap-2 data-[state=active]:text-white data-[state=active]:shadow-lg ${isICT ? 'data-[state=active]:bg-blue-600' : 'data-[state=active]:bg-orange-600'} hover:text-slate-400`
  const dividerClass = `hidden md:block w-[1px] h-6 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`

  return (
    <div className="space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-1000 ease-out pb-20">
      
      {/* 🧭 NAVIGATION & TOOLS BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2 md:px-4">
        
        <div className="flex w-full md:w-auto justify-between items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                onClick={onBack} 
                className={`rounded-full font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-500/10 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}
              >
                <ArrowLeft className="mr-3" size={14} strokeWidth={3}/> Return to Sections
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Go Back</p></TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2 md:hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onRefresh} 
                  className={`h-10 w-10 p-0 rounded-full border bg-transparent backdrop-blur-xl shadow-sm ${isDarkMode ? 'text-slate-400 border-slate-800' : 'text-slate-400 border-slate-200'}`}
                >
                  <RefreshCw className={loading ? "animate-spin" : ""} size={16}/>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Refresh Data</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => onExport(sectionName, sortedStudents)} 
                  className={`rounded-full h-10 w-10 p-0 md:w-auto md:px-8 shadow-2xl flex items-center justify-center ${
                    isDarkMode 
                      ? 'bg-white text-black hover:bg-slate-200' 
                      : 'bg-slate-950 text-white hover:bg-slate-800'
                  }`}
                >
                  <FileDown size={16} className="md:mr-3" /> 
                  <span className="hidden md:inline font-black uppercase text-[9px] tracking-[0.2em]">Masterlist</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Export Student Grading</p></TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        <div className="flex flex-col-reverse md:flex-row items-center gap-4 w-full md:w-auto">
          <div className="hidden md:flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onRefresh} 
                  className={`h-11 w-11 p-0 rounded-full border bg-transparent backdrop-blur-xl shadow-sm transition-all hover:rotate-180 active:scale-90 ${isDarkMode ? 'text-slate-400 border-slate-800' : 'text-slate-400 border-slate-200'}`}
                >
                  <RefreshCw className={loading ? "animate-spin" : ""} size={18}/>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Refresh Data</p></TooltipContent>
            </Tooltip>
          </div>
          
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  placeholder="Search Student ID or Name..." 
                  className={`pl-12 rounded-full h-12 md:h-11 text-xs font-bold border-none shadow-inner transition-all focus-visible:ring-2 focus-visible:ring-slate-400/20 w-full ${
                    isDarkMode ? 'bg-slate-900/50 text-white' : 'bg-white/80 text-slate-900'
                  }`} 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />                
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Search Students</p></TooltipContent>
            </Tooltip>
          </div>
          
          <div className="hidden md:block">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => onExport(sectionName, sortedStudents)} 
                  className={`rounded-full font-black uppercase text-[9px] tracking-[0.2em] h-11 px-8 transition-all active:scale-95 shadow-2xl flex items-center justify-center ${
                    isDarkMode 
                      ? 'bg-white text-black hover:bg-slate-200' 
                      : 'bg-slate-950 text-white hover:bg-slate-800'
                  }`}
                >
                  <FileDown size={14} className="mr-3" /> Get Masterlist
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Export Student Grading</p></TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* 🏙️ SECTION IDENTITY HEADER */}
      <div className={`p-6 md:p-16 rounded-[40px] md:rounded-[60px] text-white relative overflow-hidden transition-all duration-1000 isolate z-10 bg-clip-padding shadow-xl outline outline-1 outline-transparent ${
          isDarkMode ? 'bg-black border border-white/5' : `bg-gradient-to-br ${strandGradient}`
        }`}>
        
        <div className={`absolute -top-24 -left-24 w-[300px] md:w-[500px] h-[300px] md:h-[500px] blur-[100px] md:blur-[140px] opacity-30 rounded-full mix-blend-screen pointer-events-none ${isICT ? 'bg-blue-900' : 'bg-orange-900'}`} />
        <div className={`absolute bottom-0 right-0 w-[200px] md:w-[400px] h-[200px] md:h-[400px] blur-[100px] md:blur-[160px] opacity-10 rounded-full pointer-events-none ${isICT ? 'bg-cyan-500' : 'bg-amber-600'}`} />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16 items-center">
          <div className="space-y-4 md:space-y-8">
            <div className="flex items-center gap-4">
              <Badge className="bg-slate-900/40 backdrop-blur-3xl text-white/80 border border-white/5 px-4 md:px-5 py-2 rounded-full font-black text-[8px] md:text-[9px] uppercase tracking-[0.3em] bg-clip-padding outline outline-1 outline-transparent">
                {currentSection.strand} FACULTY CORE
              </Badge>
            </div>
            
            <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-[-0.07em] uppercase leading-none italic drop-shadow-2xl whitespace-nowrap break-keep transform-gpu">
              {sectionName}
            </h1>
            
            <div className="flex items-center gap-4 md:gap-6 opacity-30">
              <div className="flex items-center gap-2">
                <GraduationCap size={14} className="md:w-4 md:h-4" />
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">{config?.school_year || "S.Y. 2025"}</span>
              </div>
              <div className="w-1 h-1 bg-white rounded-full" />
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Student Record</p>
            </div>
          </div>

          <div className="relative group isolate mt-4 lg:mt-0">
            <div className={`absolute inset-0 blur-3xl opacity-10 transition-opacity group-hover:opacity-20 ${accentColor}`} />
            
            <div className="relative backdrop-blur-[80px] bg-slate-950/50 p-6 md:p-12 rounded-[30px] md:rounded-[50px] border border-white/5 shadow-xl overflow-hidden transform-gpu bg-clip-padding outline outline-1 outline-transparent">
              <div className="flex justify-between items-start mb-6 md:mb-10">
                <div>
                  <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-white/20 mb-2 md:mb-4">Gender Saturation</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl md:text-7xl font-black tracking-tighter tabular-nums">{activeStudents.length}</span>
                    <span className="text-white/20 font-black text-sm md:text-xl tracking-tighter uppercase">/ {capacity}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center border border-white/5 bg-black/20">
                    <Users2 className={isICT ? 'text-blue-400' : 'text-orange-400'} size={20} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 md:space-y-5">
                <div className="flex justify-between items-center text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">
                  <span className="opacity-30">Gender Bar</span>
                  <span className={isICT ? 'text-blue-400' : 'text-orange-400'}>{Math.round(fillPercent)}% Complete</span>
                </div>
                
                <div className="relative h-2 md:h-2.5 w-full bg-black/40 rounded-full overflow-hidden shadow-inner isolate">
                  <div className="absolute left-0 top-0 bottom-0 h-full bg-blue-500 transition-all duration-1000 ease-out" style={{ width: `${(mCount / capacity) * 100}%` }} />
                  <div className="absolute right-0 top-0 bottom-0 h-full bg-pink-500 transition-all duration-1000 ease-out" style={{ width: `${(fCount / capacity) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 TABS */}
      <Tabs defaultValue="all" className="w-full">
        <div className="flex justify-center mb-8 md:mb-16 px-0 md:px-4">
          <TabsList 
            className={`w-full md:w-auto flex p-1 h-auto rounded-[20px] md:rounded-full border backdrop-blur-3xl transition-all duration-500 shadow-xl bg-clip-padding outline outline-1 outline-transparent ${
              isDarkMode ? 'bg-slate-900/60 border-white/5' : 'bg-white/60 border-slate-200'
            }`}
          >                
            {/* Masterlist */}
            <TabsTrigger value="all" className={triggerClass}>
              <span className="md:hidden">Master</span>
              <span className="hidden md:inline">MasterList</span> 
              <span className="text-[9px] md:text-[11px] font-mono opacity-40">[{activeStudents.length}]</span>
            </TabsTrigger>
            
            <div className={dividerClass} />
            
            {/* Males */}
            <TabsTrigger value="males" className={triggerClass}>
              Male <span className="text-[9px] md:text-[11px] font-mono opacity-40">[{mCount}]</span>
            </TabsTrigger>

            <div className={dividerClass} />

            {/* Females */}
            <TabsTrigger value="females" className={triggerClass}>
              Female <span className="text-[9px] md:text-[11px] font-mono opacity-40">[{fCount}]</span>
            </TabsTrigger>

            {/* ── NEW: Schedule tab ── */}
            <div className={dividerClass} />

            <TabsTrigger value="schedule" className={triggerClass}>
              <span className="md:hidden">Sched</span>
              <span className="hidden md:inline">Schedule</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Student tabs content */}
        {['all', 'males', 'females'].map((tab) => (
          <TabsContent 
            key={tab} 
            value={tab} 
            className="outline-none focus:ring-0 focus-visible:ring-0 mt-0 animate-in fade-in zoom-in-95 slide-in-from-bottom-10 duration-700 ease-out flex justify-center w-full"
          >
            <div className="w-full max-w-[100vw] overflow-hidden">
              <StudentTable 
                students={sortedStudents.filter((s: any) => {
                  const match = `${s.first_name} ${s.last_name}`.toLowerCase().includes(debouncedSearch.toLowerCase()) || s.student_id?.toLowerCase().includes(debouncedSearch.toLowerCase())
                  if (tab === 'all') return match
                  return match && s.gender === (tab === 'males' ? 'Male' : 'Female')
                })} 
                onReturn={handleReturnToPending} 
                onUnenroll={handleUnenroll}
                onSwitch={handleSwitch} 
                allSections={sections.filter((s: any) => s.strand === currentSection.strand)}
                onOpenFile={handleOpenFile}
                onViewProfile={handleViewProfile}
                isDarkMode={isDarkMode}
                exitingRows={exitingRows}
                hiddenRows={hiddenRows}
                handleExit={handleExit}
                animatingIds={animatingIds}
                onToggleLock={onToggleLock}
              />
            </div>
          </TabsContent>
        ))}

        {/* ── NEW: Schedule tab content ── */}
        <TabsContent
          value="schedule"
          className="outline-none focus:ring-0 focus-visible:ring-0 mt-0 animate-in fade-in zoom-in-95 slide-in-from-bottom-10 duration-700 ease-out w-full"
        >
          <ScheduleTab
            sectionName={sectionName}
            isICT={isICT}
            isDarkMode={isDarkMode}
            schoolYear={config?.school_year ?? "2025-2026"}
            students={activeStudents}
            allSchedules={allSchedules ?? []}
          />
        </TabsContent>

      </Tabs>
    </div>
  )
})