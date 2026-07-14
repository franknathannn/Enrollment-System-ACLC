import { memo, useMemo, useState, useEffect } from "react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Settings2, Trash2, Code, BookOpen, Layers, ShieldAlert, ChevronDown, Info, Save, Lock, Unlock, X, Users, Search, Plus, Download, Cpu, Atom, BarChart3, GraduationCap } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { AssignStudentsDialog } from "./AssignStudentsDialog"

const SectionCapacityEditor = memo(function SectionCapacityEditor({ sec, onUpdateCapacity, isDarkMode }: any) {
  const [isLocked, setIsLocked] = useState(true);
  const [val, setVal] = useState(String(sec.capacity || 40));

  const handleSave = () => {
    if (!val || val.trim() === '') {
      import('sonner').then(m => m.toast.error("Capacity must be a number! Reverting to previous."));
      setVal(String(sec.capacity || 40));
      setIsLocked(true);
      return;
    }
    
    const num = parseInt(val);
    if (isNaN(num) || num <= 0) {
      import('sonner').then(m => m.toast.error("Capacity must be a valid number! Reverting to previous."));
      setVal(String(sec.capacity || 40));
      setIsLocked(true);
      return;
    }

    if (num !== sec.capacity && onUpdateCapacity) {
      onUpdateCapacity(sec.id, num);
    }
    setIsLocked(true);
  };

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} ${!isLocked ? 'ring-2 ring-blue-500/50' : ''} min-w-[140px] justify-center`}>
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-300">CAPACITY:</span>
      <input 
        type="number"
        min={1}
        value={val}
        onChange={(e) => setVal(e.target.value.replace(/[^0-9]/g, ''))}
        disabled={isLocked}
        className="w-10 bg-transparent text-center font-black text-sm text-slate-900 dark:text-white focus:outline-none disabled:opacity-50"
      />
      {isLocked ? (
        <button onClick={() => setIsLocked(false)} className="hover:scale-110 transition-transform ml-1 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md">
          <Lock size={12} className="text-slate-400" />
        </button>
      ) : (
        <>
          <button onClick={handleSave} className="hover:scale-110 transition-transform ml-1 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-blue-500 hover:text-blue-600">
            <Save size={14} />
          </button>
          <button onClick={() => { setIsLocked(true); setVal(String(sec.capacity || 40)); }} className="hover:scale-110 transition-transform p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-red-400">
            <X size={14} />
          </button>
        </>
      )}
    </div>
  )
})

export const DeleteManagementDialog = memo(function DeleteManagementDialog({ 
  sections, 
  onDelete, 
  onClearStudents, 
  isDarkMode,
  onUpdateCapacity,
  onBalance,
  onExportGlobal,
  strandFilter,
  gradeLevelFilter,
  initiateAdd,
  availableStrands,
  isProcessing,
  config,
  isOpen,
  isAddSectionOpen,
  setIsAddSectionOpen
}: any) {

  const [localSearch, setLocalSearch] = useState("")
  const [localGrade, setLocalGrade] = useState("ALL")
  const [addStrand, setAddStrand] = useState(availableStrands?.[0] || 'ICT')
  const [addQuantity, setAddQuantity] = useState("1")
  const [addCapacity, setAddCapacity] = useState("30")
  const [unassignedCount, setUnassignedCount] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Export Modal state
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [exportType, setExportType] = useState('strand')
  const [exportStrand, setExportStrand] = useState('ALL')
  const [exportGrade, setExportGrade] = useState('ALL')
  const [exportSectionId, setExportSectionId] = useState('')

  useEffect(() => {
    const fetchUnassignedCount = async () => {
      const { supabase: client } = await import('@/lib/supabase/client')
      
      const { count } = await client
        .from('students')
        .select('*', { count: 'exact', head: true })
        .is('section_id', null)
        .in('status', ['Accepted', 'Approved'])
        
      setUnassignedCount(count || 0)
    }

    if (dialogOpen) {
      fetchUnassignedCount()
    }
  }, [dialogOpen])

  // Group sections by Strand and Grade
  const groupedSections = useMemo(() => {
    return sections.reduce((acc: any, sec: any) => {
      // Hide sections of strands that are not currently available
      if (availableStrands && !availableStrands.includes(sec.strand)) {
        return acc
      }
      const key = `${sec.strand || "Unassigned"}__${sec.grade_level || "11"}`
      if (!acc[key]) acc[key] = { strand: sec.strand || "Unassigned", grade_level: sec.grade_level || "11", sections: [] }
      acc[key].sections.push(sec)
      return acc
    }, {})
  }, [sections, availableStrands]);

  const stats = useMemo(() => {
    let totalEnrolled = 0;
    let totalM = 0;
    let totalF = 0;
    let totalJHS = 0;
    let totalALS = 0;
    
    sections.forEach((sec: any) => {
      const activeStudents = (sec.students || []).filter((s: any) => s.status === 'Accepted' || s.status === 'Approved');
      totalEnrolled += activeStudents.length;
      activeStudents.forEach((s: any) => {
        if (s.gender === 'Male') totalM++;
        if (s.gender === 'Female') totalF++;
        if (s.student_category === 'ALS Passer') totalALS++;
        else totalJHS++;
      })
    });
    
    return { 
      totalEnrolled, 
      totalSections: sections.length, 
      totalM, 
      totalF, 
      totalJHS, 
      totalALS,
      assigned: totalEnrolled
    }
  }, [sections])

  const theme = {
    surface: isDarkMode ? 'bg-[#0f172a]' : 'bg-[#e2e8f0]',
    header: isDarkMode ? 'bg-[#020617]' : 'bg-[#1e293b]',
    dangerBg: isDarkMode ? 'bg-red-950/20' : 'bg-red-50',
    dangerBorder: isDarkMode ? 'border-red-900/30' : 'border-red-100'
  };

  const handleAddSubmit = () => {
    const qty = parseInt(addQuantity) || 1;
    const cap = parseInt(addCapacity) || 30;
    for (let i = 0; i < qty; i++) {
      initiateAdd?.(addStrand, cap)
    }
    setIsAddSectionOpen(false)
  }

  const handleExportSubmit = async () => {
    if (exportType === 'strand') {
      onExportGlobal?.(exportStrand, exportGrade)
    } else {
      const targetSec = sections.find((s: any) => s.id === exportSectionId);
      if (targetSec) {
        // Find students and export
        const { exportSimpleMasterlist } = await import('../api/exportMasterlist');
        const active = (targetSec.students || []).filter((s: any) => s.status === 'Accepted' || s.status === 'Approved');
        exportSimpleMasterlist(`${targetSec.section_name} MASTERLIST`, active);
      }
    }
    setIsExportOpen(false)
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={`rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest border shadow-sm transition-all group ${isDarkMode ? 'border-blue-900/50 text-blue-400 hover:bg-blue-900/20' : 'border-blue-100 text-blue-500 hover:bg-blue-500 hover:text-white'}`}
        >
          <Settings2 size={16} className="mr-2 group-hover:rotate-90 transition-transform duration-500" />
          Control Center
        </Button>
      </DialogTrigger>

      <DialogContent
        className={`rounded-[32px] md:rounded-[48px] w-[95vw] max-w-7xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl transition-all duration-500 ${theme.surface}`}
      >
        <Tabs defaultValue="sections" className="w-full flex flex-col h-full">
          {/* HEADER */}
          <DialogHeader className={`px-8 py-5 text-white relative overflow-hidden shrink-0 ${theme.header}`}>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-8 bg-blue-500 rounded-full" />
                <div>
                  <DialogTitle className="font-black uppercase tracking-tighter text-2xl italic leading-none">
                    CONTROL CENTER
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">
                    SECTION CONTROLLING CENTER
                  </DialogDescription>
                </div>
              </div>
              
              {/* Floating School Year Config */}
              {config?.school_year && (
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
                  <span className="font-black text-[10px] tracking-widest">S.Y. {config.school_year}</span>
                </div>
              )}

              <TabsList className="bg-white/10 p-1 rounded-full border border-white/20 backdrop-blur-md">
                <TabsTrigger
                  value="sections"
                  className="rounded-full px-6 py-2 font-black uppercase text-[10px] data-[state=active]:bg-white data-[state=active]:text-slate-900 transition-all flex items-center gap-2"
                >
                  <div className="w-3 h-3 rounded-full border-2 border-current flex items-center justify-center">
                    <div className="w-1 h-1 bg-current rounded-full" />
                  </div>
                  Sections
                </TabsTrigger>
                <TabsTrigger
                  value="danger"
                  className="rounded-full px-6 py-2 font-black uppercase text-[10px] data-[state=active]:bg-transparent data-[state=active]:text-white transition-all flex items-center gap-2 opacity-50 data-[state=active]:opacity-100"
                >
                  <Trash2 size={12} /> Student Deletion
                </TabsTrigger>
              </TabsList>
            </div>
          </DialogHeader>

          {/* TAB: SECTION MANAGEMENT */}
          <TabsContent value="sections" className="flex-1 overflow-hidden mt-0 flex p-6 gap-6 bg-slate-100/50 dark:bg-slate-950">
            {/* LEFT PANE: MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
              {/* TOP TOOLBAR */}
              <div className="p-6 pb-2">
                <div className="flex flex-wrap gap-4 items-center mb-6">
                  
                  <Button 
                    onClick={() => setIsExportOpen(true)}
                    className="rounded-2xl bg-slate-600 hover:bg-slate-700 text-white font-black text-[10px] uppercase h-10 px-6 flex items-center gap-2 shadow-sm transition-colors"
                  >
                    EXPORT LIST <Download size={14} className="ml-1 opacity-70" />
                  </Button>

                  <Button
                    onClick={() => onBalance?.(strandFilter)}
                    disabled={isProcessing}
                    className="rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-950 dark:bg-purple-950/20 dark:hover:bg-purple-950/40 dark:border-purple-900/30 dark:text-purple-300 font-black text-[10px] uppercase h-10 px-6 transition-colors shadow-sm"
                  >
                    BALANCE ALL
                  </Button>

                  <Button
                    onClick={() => setIsAddSectionOpen(true)}
                    disabled={isProcessing}
                    className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase h-10 px-6 ml-auto shadow-sm shadow-emerald-600/10"
                  >
                    <Plus size={14} className="mr-2 opacity-50" /> ADD NEW SECTION
                  </Button>
                </div>

                <div className="flex flex-wrap items-end gap-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Filter & Search Strands</label>
                    <div className="relative">
                      <Input 
                        placeholder="STRAND SEARCH"
                        value={localSearch}
                        onChange={e => setLocalSearch(e.target.value)}
                        className="h-10 rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-xs w-64 pl-4 pr-10 shadow-sm"
                      />
                      <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Select Grade</label>
                    <div className="relative">
                      <select 
                        value={localGrade}
                        onChange={e => setLocalGrade(e.target.value)}
                        className="h-10 rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-xs w-48 px-4 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      >
                        <option value="ALL">ALL GRADES</option>
                        <option value="11">GRADE 11</option>
                        <option value="12">GRADE 12</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                    </div>
                  </div>
                </div>
              </div>

              {/* STRANDS & GRADES LIST */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-900">
                <h3 className="text-[11px] font-black uppercase tracking-widest mb-4 text-slate-900 dark:text-slate-100">STRANDS & GRADE LEVELS</h3>
                
                <Accordion type="multiple" defaultValue={Object.keys(groupedSections)} className="space-y-4">
                  {Object.entries(groupedSections).map(([key, group]: any) => {
                    
                    // Client side filter
                    let filteredSections = group.sections;
                    if (localSearch) {
                      const lowerSearch = localSearch.toLowerCase();
                      filteredSections = filteredSections.filter((s: any) => 
                        s.section_name.toLowerCase().includes(lowerSearch) || 
                        (group.strand && group.strand.toLowerCase().includes(lowerSearch))
                      );
                    }
                    if (localGrade !== "ALL" && group.grade_level !== localGrade) {
                      filteredSections = [];
                    }

                    if (filteredSections.length === 0) return null;

                    // Compute breakdown for this group
                    let grpM = 0, grpF = 0, grpJHS = 0, grpALS = 0, grpTot = 0;
                    filteredSections.forEach((s: any) => {
                      const act = (s.students || []).filter((st: any) => st.status === 'Accepted' || st.status === 'Approved');
                      grpTot += act.length;
                      act.forEach((st: any) => {
                        if (st.gender === 'Male') grpM++;
                        if (st.gender === 'Female') grpF++;
                        if (st.student_category === 'ALS Passer') grpALS++;
                        else grpJHS++;
                      })
                    });

                    return (
                    <AccordionItem key={key} value={key} className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2 px-0 mb-2 group-accordion">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const strand = group.strand || '';
                            let Icon = GraduationCap;
                            let colorClasses = 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400';
                            
                            if (strand === 'ICT' || strand === 'TechPro') {
                              Icon = Cpu;
                              colorClasses = 'border-blue-200 dark:border-blue-900 text-blue-500 dark:text-blue-400';
                            } else if (strand === 'STEM') {
                              Icon = Atom;
                              colorClasses = 'border-emerald-200 dark:border-emerald-900 text-emerald-500 dark:text-emerald-400';
                            } else if (strand === 'ABM') {
                              Icon = BarChart3;
                              colorClasses = 'border-yellow-200 dark:border-yellow-900 text-yellow-500 dark:text-yellow-400';
                            } else if (strand === 'HUMSS') {
                              Icon = BookOpen;
                              colorClasses = 'border-amber-200 dark:border-amber-900 text-amber-500 dark:text-amber-400';
                            } else if (strand === 'GAS') {
                              Icon = BookOpen;
                              colorClasses = 'border-orange-200 dark:border-orange-900 text-orange-500 dark:text-orange-400';
                            }
                            
                            return (
                              <div className={`w-8 h-8 rounded-full border ${colorClasses} flex items-center justify-center bg-white dark:bg-slate-800 shrink-0`}>
                                <Icon size={14} />
                              </div>
                            )
                          })()}
                          <div className="text-lg font-black tracking-tighter text-slate-900 dark:text-white">
                            {group.strand} — Grade {group.grade_level} <span className="opacity-40 font-normal">| {filteredSections.length} Active Sections</span>
                          </div>
                          
                          {/* Rich Info Hover */}
                          <div className="ml-2" onClick={e => e.stopPropagation()}>
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <div className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 cursor-help transition-colors">
                                  <Info size={16} className="text-slate-400" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="bg-[#1e293b] border-none text-white p-4 w-64 shadow-2xl rounded-2xl z-50">
                                <p className="font-black text-sm mb-1">Strand breakdown:</p>
                                <p className="text-[10px] font-bold opacity-70 mb-2">Detailed G{group.grade_level} {group.strand} Breakdown:</p>
                                <p className="text-[10px] opacity-90 mb-1">Total students: {grpTot} | Active Sections: {filteredSections.length}</p>
                                <p className="text-[10px] opacity-90 mb-1">Gender: Male ({grpM}, {grpTot > 0 ? ((grpM/grpTot)*100).toFixed(1) : 0}%), Female ({grpF}, {grpTot > 0 ? ((grpF/grpTot)*100).toFixed(1) : 0}%)</p>
                                <p className="text-[10px] opacity-90 mb-4">Origin: JHS ({grpJHS}, {grpTot > 0 ? ((grpJHS/grpTot)*100).toFixed(1) : 0}%), ALS ({grpALS}, {grpTot > 0 ? ((grpALS/grpTot)*100).toFixed(1) : 0}%)</p>
                                
                                <Button 
                                  onClick={() => onExportGlobal?.(group.strand, group.grade_level)}
                                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black text-[9px] uppercase tracking-widest h-8 mb-4 border border-white/10 rounded-xl"
                                >
                                  EXPORT MASTER LIST (G{group.grade_level})
                                </Button>

                                <div className="flex justify-between items-end px-2">
                                  {(() => {
                                    const mPct = grpTot > 0 ? (grpM / grpTot) * 100 : 0
                                    const jPct = grpTot > 0 ? (grpJHS / grpTot) * 100 : 0
                                    return (
                                      <>
                                        <div className="flex flex-col items-center">
                                          <span className="text-[9px] font-black mb-2 opacity-50">Gender:</span>
                                          {grpTot > 0 ? (
                                            <svg width="48" height="48" viewBox="0 0 36 36" className="rotate-[-90deg]">
                                              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ec4899" strokeWidth="4" />
                                              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="4"
                                                      strokeDasharray={`${mPct} ${100 - mPct}`} />
                                            </svg>
                                          ) : (
                                            <div className="w-12 h-12 rounded-full border-[6px] border-slate-700 shadow-inner" />
                                          )}
                                        </div>
                                        <div className="flex flex-col items-center">
                                          <span className="text-[9px] font-black mb-2 opacity-50">Origin:</span>
                                          {grpTot > 0 ? (
                                            <svg width="48" height="48" viewBox="0 0 36 36" className="rotate-[-90deg]">
                                              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#c084fc" strokeWidth="4" />
                                              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="4"
                                                      strokeDasharray={`${jPct} ${100 - jPct}`} />
                                            </svg>
                                          ) : (
                                            <div className="w-12 h-12 rounded-full border-[6px] border-slate-700 shadow-inner" />
                                          )}
                                        </div>
                                      </>
                                    )
                                  })()}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="space-y-4 pb-6 px-1">
                        {filteredSections.map((sec: any) => {
                          const act = (sec.students || []).filter((st: any) => st.status === 'Accepted' || st.status === 'Approved');
                          const secM = act.filter((st: any) => st.gender === 'Male').length;
                          const secF = act.filter((st: any) => st.gender === 'Female').length;
                          const secALS = act.filter((st: any) => st.student_category === 'ALS Passer').length;
                          const secJHS = act.length - secALS;

                          return (
                            <div key={sec.id} className="flex flex-col xl:flex-row xl:items-center justify-between p-4 rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm gap-4 transition-all hover:shadow-md">
                              
                              {/* Left: Name & Badge */}
                              <div className="flex items-center gap-3 min-w-[160px]">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white">{sec.section_name}</span>
                                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest">
                                  G{group.grade_level}
                                </span>
                              </div>

                              {/* Capacity Input component with lock toggle */}
                              <SectionCapacityEditor sec={sec} onUpdateCapacity={onUpdateCapacity} isDarkMode={isDarkMode} />

                              {/* Stats: M/F */}
                              <div className="flex items-center justify-center gap-4 min-w-[100px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-blue-500 font-bold">♂</span>
                                  <span className="font-black text-sm text-slate-900 dark:text-white">{secM}</span>
                                </div>
                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800" />
                                <div className="flex items-center gap-1.5">
                                  <span className="text-pink-500 font-bold">♀</span>
                                  <span className="font-black text-sm text-slate-900 dark:text-white">{secF}</span>
                                </div>
                              </div>

                              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 hidden xl:block" />

                              {/* Stats: JHS/ALS */}
                              <div className="flex items-center justify-center gap-4 min-w-[120px]">
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-[10px] font-black uppercase text-purple-500">JHS:</span>
                                  <span className="font-black text-sm text-slate-900 dark:text-white">{secJHS}</span>
                                </div>
                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800" />
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-[10px] font-black uppercase text-orange-500">ALS:</span>
                                  <span className="font-black text-sm text-slate-900 dark:text-white">{secALS}</span>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center justify-end gap-2 min-w-[50px]">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-9 w-9 text-red-500 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-600 dark:border-red-900 dark:bg-red-950/30 rounded-xl transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                  </DialogTrigger>
                                    <DialogContent className={`rounded-[32px] sm:max-w-[425px] border-none shadow-2xl p-0 overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                                      <div className={`p-8 pb-4 relative overflow-hidden ${isDarkMode ? 'bg-red-950/20' : 'bg-red-50'}`}>
                                        <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full -mr-16 -mt-16 opacity-20 bg-red-500" />
                                        <DialogHeader className="relative z-10">
                                          <DialogTitle className="font-black uppercase tracking-tighter text-3xl italic text-red-600 dark:text-red-500">Delete Section</DialogTitle>
                                          <DialogDescription className="text-sm font-bold text-slate-600 dark:text-slate-400 mt-2">
                                            Are you sure you want to permanently delete section <strong className="text-slate-900 dark:text-white">{sec.section_name}</strong>? This action cannot be undone.
                                          </DialogDescription>
                                        </DialogHeader>
                                      </div>
                                      <div className="p-8 pt-6">
                                        <div className={`p-4 rounded-2xl border border-dashed mb-8 flex items-start gap-3 ${isDarkMode ? 'bg-red-950/20 border-red-900/30' : 'bg-red-50/50 border-red-200'}`}>
                                          <ShieldAlert size={16} className="text-red-500 shrink-0 mt-0.5" />
                                          <p className={`text-[10px] font-medium leading-relaxed italic ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                            <strong>WARNING:</strong> Deleting this section shifts matrix sequence and re-balances students automatically. Proceed with caution.
                                          </p>
                                        </div>
                                        <div className="flex justify-end gap-3">
                                          <DialogClose asChild>
                                            <Button variant="outline" className={`rounded-xl px-6 h-12 font-black uppercase tracking-widest text-[10px] ${isDarkMode ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}>Cancel</Button>
                                          </DialogClose>
                                          <DialogClose asChild>
                                            <Button onClick={() => onDelete(sec.id, sec.section_name, sec.strand, sec.grade_level)} className="rounded-xl px-8 h-12 font-black uppercase tracking-widest text-[10px] bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/20">Delete</Button>
                                          </DialogClose>
                                        </div>
                                      </div>
                                    </DialogContent>
                                </Dialog>
                              </div>

                            </div>
                          )
                        })}
                      </AccordionContent>
                    </AccordionItem>
                  )})}
                </Accordion>
              </div>
            </div>

            {/* RIGHT PANE: SCHOOL-WIDE OVERVIEW */}
            <div className="w-72 shrink-0 flex flex-col gap-4">
              <h3 className="font-black uppercase tracking-widest text-[11px] mb-2 px-2 text-slate-900 dark:text-slate-100">SCHOOL-WIDE OVERVIEW</h3>

              {/* Total Enrolled */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-2 shadow-sm">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                  <Users size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">TOTAL ENROLLED STUDENTS:</span>
                </div>
                <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">{stats.totalEnrolled}</span>
              </div>

              {/* Total Sections */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-2 shadow-sm">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                  <Layers size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">TOTAL SECTIONS:</span>
                </div>
                <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">{stats.totalSections}</span>
              </div>

              {/* Assigned */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-2 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 mb-1">
                  <div className="w-3 h-3 rounded-sm border-2 border-emerald-500 flex items-center justify-center">
                    <div className="w-1 h-1 bg-emerald-500 rounded-sm" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">ASSIGNED STUDENTS:</span>
                </div>
                <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">{stats.assigned}</span>
              </div>

              {/* Unassigned */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-3 shadow-sm">
                <div className="flex items-center gap-2 text-orange-500 mb-1">
                  <div className="w-3 h-3 rounded-full border-2 border-orange-500 flex items-center justify-center text-[8px] font-bold">?</div>
                  <span className="text-[10px] font-black uppercase tracking-widest">UNASSIGNED STUDENTS:</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">
                    {unassignedCount !== null ? unassignedCount : '?'}
                  </span>
                  <AssignStudentsDialog 
                    isDarkMode={isDarkMode} 
                    sections={sections} 
                    onAssigned={() => {
                      setUnassignedCount(prev => prev ? prev - 1 : 0)
                    }} 
                  />
                </div>
              </div>

              {/* Gender Breakdown */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between shadow-sm">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-pink-500 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest">♀ GENDER BREAKDOWN:</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-black text-xs text-slate-900 dark:text-white">M: {stats.totalM}</span>
                    <span className="font-black text-xs text-slate-900 dark:text-white">F: {stats.totalF}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <div className="w-6 h-6 rounded-full border-4 border-blue-500 border-t-blue-100 rotate-45" />
                  <div className="w-6 h-6 rounded-full border-4 border-pink-500 border-r-pink-200 rotate-[120deg]" />
                </div>
              </div>

              {/* Origin Breakdown */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between shadow-sm">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-purple-500 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest">🎓 ORIGIN BREAKDOWN:</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-black text-xs text-slate-900 dark:text-white">JHS: {stats.totalJHS}</span>
                    <span className="font-black text-xs text-slate-900 dark:text-white">ALS: {stats.totalALS}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <div className="w-6 h-6 rounded-full border-4 border-purple-500 border-l-purple-200 rotate-90" />
                  <div className="w-6 h-6 rounded-full border-4 border-emerald-500 border-b-emerald-200 rotate-[220deg]" />
                </div>
              </div>

            </div>
          </TabsContent>

          {/* TAB: DANGER ZONE */}
          <TabsContent value="danger" className="p-8 mt-0 flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
            <div className={`group relative p-8 rounded-[40px] border text-center overflow-hidden transition-all isolate ${theme.dangerBg} ${theme.dangerBorder} max-w-2xl mx-auto mt-10 shadow-sm`}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-red-600/50 blur-sm" />
              <div className="relative z-10 space-y-6">
                <div className="w-20 h-20 bg-red-600 rounded-[28px] flex items-center justify-center mx-auto text-white shadow-[0_10px_40px_rgba(220,38,38,0.3)] group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <ShieldAlert size={38} />
                </div>
                <div className="space-y-3">
                  <h3 className="font-black text-red-600 uppercase tracking-tighter text-2xl leading-none italic">
                    SCHOOL RECORD DELETION
                  </h3>
                  <div className="flex flex-col gap-2">
                    <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-red-500/20 inline-block mx-auto ${isDarkMode ? 'bg-red-950/40 text-red-300' : 'bg-white text-red-500'}`}>
                      Level 5 Security Action
                    </div>
                    <p className={`text-xs font-medium leading-relaxed max-w-[280px] mx-auto mt-2 ${isDarkMode ? 'text-red-200/60' : 'text-red-400'}`}>
                      Warning: This protocol erases the entire student data. Data recovery is <span className="underline font-bold">physically impossible</span> after execution.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={onClearStudents}
                  className="w-full h-16 bg-red-600 hover:bg-red-700 text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  Execute Registry Wipe <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* NEW MODAL: Add New Section */}
      <Dialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
        <DialogContent className={`rounded-[32px] sm:max-w-[425px] ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tighter text-xl italic">Add New Section</DialogTitle>
            <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Customize section creation
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Select Strand</Label>
              <select
                value={addStrand}
                onChange={e => setAddStrand(e.target.value)}
                className={`w-full h-12 rounded-xl px-4 text-sm font-bold border outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
              >
                {availableStrands?.map((s: string) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quantity</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={addQuantity}
                onChange={e => setAddQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                className={`h-12 rounded-xl text-sm font-bold border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Capacity (Per Section)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={addCapacity}
                onChange={e => setAddCapacity(e.target.value.replace(/[^0-9]/g, ''))}
                className={`h-12 rounded-xl text-sm font-bold border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSectionOpen(false)} className="rounded-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest">
              Cancel
            </Button>
            <Button onClick={handleAddSubmit} className="rounded-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest bg-blue-600 hover:bg-blue-700 text-white">
              Create Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW MODAL: Export Customizer */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className={`rounded-[32px] sm:max-w-md ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tighter text-xl italic flex items-center gap-2">
              <Download size={20} className="text-blue-500" /> Export Masterlist
            </DialogTitle>
            <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Customize your export preferences
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Export Type</Label>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setExportType('strand')} 
                  className={`flex-1 rounded-xl h-10 font-black uppercase text-[10px] tracking-widest ${exportType === 'strand' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
                >
                  By Strand/Grade
                </Button>
                <Button 
                  onClick={() => setExportType('section')} 
                  className={`flex-1 rounded-xl h-10 font-black uppercase text-[10px] tracking-widest ${exportType === 'section' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
                >
                  Specific Section
                </Button>
              </div>
            </div>

            {exportType === 'strand' ? (
              <>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Strand</Label>
                  <select
                    value={exportStrand}
                    onChange={e => setExportStrand(e.target.value)}
                    className={`w-full h-12 rounded-xl px-4 text-sm font-bold border outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <option value="ALL">ALL STRANDS</option>
                    {availableStrands?.map((s: string) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Grade Level</Label>
                  <select
                    value={exportGrade}
                    onChange={e => setExportGrade(e.target.value)}
                    className={`w-full h-12 rounded-xl px-4 text-sm font-bold border outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <option value="ALL">ALL GRADES</option>
                    <option value="11">GRADE 11</option>
                    <option value="12">GRADE 12</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Select Section</Label>
                <select
                  value={exportSectionId}
                  onChange={e => setExportSectionId(e.target.value)}
                  className={`w-full h-12 rounded-xl px-4 text-sm font-bold border outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                >
                  <option value="" disabled>Choose a section...</option>
                  {sections.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.section_name} ({s.strand} - G{s.grade_level})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportOpen(false)} className="rounded-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest">
              Cancel
            </Button>
            <Button 
              onClick={handleExportSubmit} 
              disabled={exportType === 'section' && !exportSectionId}
              className="rounded-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest bg-blue-600 hover:bg-blue-700 text-white"
            >
              Export Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
})
