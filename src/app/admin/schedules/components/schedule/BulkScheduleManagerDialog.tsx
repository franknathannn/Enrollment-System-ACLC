import { memo, useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Filter, Trash2, ChevronDown, ChevronRight, CheckSquare, Square, Layers, BookOpen, Cpu, GraduationCap, X } from "lucide-react"
import { supabase } from "@/lib/supabase/admin-client"
import { toast } from "sonner"
import { ScheduleTab } from "./ScheduleTab"

interface BulkScheduleManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sections: any[]
  isDarkMode: boolean
  config: any
  allSchedules: any[] // we just pass empty array if not fully fetched, let ScheduleTab fetch its own
}

type WipeAction = "ALL" | "TEACHERS" | "ROOMS" | "SUBJECTS"

export const BulkScheduleManagerDialog = memo(function BulkScheduleManagerDialog({
  open, onOpenChange, sections, isDarkMode, config, allSchedules
}: BulkScheduleManagerDialogProps) {
  const [strandFilter, setStrandFilter] = useState<"ALL" | "ICT" | "GAS">("ALL")
  const [gradeFilter, setGradeFilter] = useState<"ALL" | "11" | "12">("ALL")
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const filteredSections = useMemo(() => {
    return sections.filter(s => {
      const matchStrand = strandFilter === "ALL" || s.strand === strandFilter
      const matchGrade = gradeFilter === "ALL" || s.grade_level === gradeFilter
      return matchStrand && matchGrade
    }).sort((a, b) => (a?.section_name || "").localeCompare(b?.section_name || ""))
  }, [sections, strandFilter, gradeFilter])

  const handleToggleSelect = (sectionName: string) => {
    setSelection(prev => {
      const next = new Set(prev)
      if (next.has(sectionName)) next.delete(sectionName)
      else next.add(sectionName)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selection.size === filteredSections.length) {
      setSelection(new Set())
    } else {
      setSelection(new Set(filteredSections.map(s => s.section_name)))
    }
  }

  const handleWipe = async (action: WipeAction) => {
    if (selection.size === 0) {
      toast.error("Please select at least one section.")
      return
    }

    let message = ""
    switch (action) {
      case "ALL": message = "Delete ENTIRE schedules for selected sections?" ; break;
      case "TEACHERS": message = "Remove TEACHERS from schedules for selected sections?" ; break;
      case "ROOMS": message = "Remove ROOMS from schedules for selected sections?" ; break;
      case "SUBJECTS": message = "Wipe SUBJECT NAMES from schedules for selected sections?" ; break;
    }

    if (!confirm(message + "\nThis action cannot be undone.")) return

    setIsProcessing(true)
    const toastId = toast.loading(`Processing bulk clear...`)
    
    try {
      const sectionNames = Array.from(selection)
      
      let error = null;
      if (action === "ALL") {
        const { error: err } = await supabase.from("schedules").delete().in("section", sectionNames)
        error = err
      } else if (action === "TEACHERS") {
        const { error: err } = await supabase.from("schedules").update({ teacher: null, teacher_id: null }).in("section", sectionNames)
        error = err
      } else if (action === "ROOMS") {
        const { error: err } = await supabase.from("schedules").update({ room: null }).in("section", sectionNames)
        error = err
      } else if (action === "SUBJECTS") {
        const { error: err } = await supabase.from("schedules").update({ subject: "TBA" }).in("section", sectionNames)
        error = err
      }

      if (error) throw error

      toast.success("Bulk action completed.", { id: toastId })
    } catch (err: any) {
      toast.error(err.message || "Failed to complete bulk action", { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  const theme = {
    bg: isDarkMode ? "bg-slate-950" : "bg-white",
    surface: isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200",
    text: isDarkMode ? "text-slate-200" : "text-slate-800",
    muted: isDarkMode ? "text-slate-500" : "text-slate-500",
    accent: isDarkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-600 hover:bg-blue-700",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`w-[98vw] md:w-[95vw] lg:w-[90vw] max-w-[1400px] h-[95vh] max-h-[95vh] flex flex-col p-0 border-none rounded-[32px] md:rounded-[48px] shadow-2xl overflow-hidden [&>button]:hidden ${theme.bg}`}>
        
        {/* Header */}
        <div className={`p-6 ${theme.surface} flex items-center justify-between`}>
          <div>
            <DialogTitle className={`text-xl font-black uppercase tracking-widest flex items-center gap-2 ${theme.text}`}>
              <Layers className="text-blue-500"/> Schedule Manager
            </DialogTitle>
            <DialogDescription className={`text-[10px] uppercase tracking-widest font-bold mt-1 ${theme.muted}`}>
              Mass action and inline editing for all sections
            </DialogDescription>
          </div>
          <button 
            onClick={() => onOpenChange(false)}
            className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-colors bg-white/5 hover:bg-red-500 hover:text-white ${theme.muted}`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          
          {/* Sidebar / Filters */}
          <div className={`w-full md:w-[320px] p-6 lg:p-8 flex flex-col gap-8 ${theme.surface} overflow-y-auto`}>
            
            <div className="space-y-4">
              <label className={`text-[11px] font-black uppercase tracking-[0.2em] ${theme.muted}`}>Filter by Strand</label>
              <div className="grid grid-cols-3 gap-3">
                {(["ALL", "ICT", "GAS"] as const).map(s => (
                  <button 
                    key={s} 
                    onClick={() => setStrandFilter(s)}
                    className={`py-3 rounded-[16px] text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                      strandFilter === s 
                        ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/25" 
                        : isDarkMode 
                          ? "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300" 
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 shadow-sm"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className={`text-[11px] font-black uppercase tracking-[0.2em] ${theme.muted}`}>Filter by Grade</label>
              <div className="grid grid-cols-3 gap-3">
                {(["ALL", "11", "12"] as const).map(g => (
                  <button 
                    key={g} 
                    onClick={() => setGradeFilter(g)}
                    className={`py-3 rounded-[16px] text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                      gradeFilter === g 
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/25" 
                        : isDarkMode 
                          ? "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300" 
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 shadow-sm"
                    }`}
                  >
                    {g === "ALL" ? "ALL" : `G${g}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-8 mt-auto space-y-4">
              <label className={`text-[11px] font-black uppercase tracking-[0.2em] ${theme.muted}`}>Bulk Destructive Actions</label>
              <div className="space-y-3">
                <Button 
                    variant="ghost" 
                    className={`w-full justify-start text-[10px] uppercase font-black tracking-widest rounded-[16px] hover:scale-[1.02] transition-all h-12 px-5 shadow-sm border ${
                      isDarkMode
                        ? 'bg-red-950/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 border-red-900/50'
                        : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-100 hover:border-red-200'
                    }`}
                    disabled={selection.size === 0 || isProcessing}
                >
                    <Trash2 className="mr-3" size={16}/> Wipe Entire Schedule
                </Button>
                
                <Button 
                    variant="ghost" 
                    className={`w-full justify-start text-[10px] uppercase font-black tracking-widest rounded-[16px] hover:scale-[1.02] transition-all h-12 px-5 shadow-sm border ${
                      isDarkMode 
                        ? 'bg-orange-950/20 text-orange-400 hover:bg-orange-900/40 hover:text-orange-300 border-orange-900/30 hover:border-orange-800/50' 
                        : 'bg-orange-50/50 text-orange-600 hover:bg-orange-100/80 hover:border-orange-300 border-orange-200'
                    }`}
                    onClick={() => handleWipe("TEACHERS")}
                    disabled={selection.size === 0 || isProcessing}
                >
                    <Trash2 className="mr-3 opacity-60" size={14}/> Clear Teachers
                </Button>
                
                <Button 
                    variant="ghost" 
                    className={`w-full justify-start text-[10px] uppercase font-black tracking-widest rounded-[16px] hover:scale-[1.02] transition-all h-12 px-5 shadow-sm border ${
                      isDarkMode 
                        ? 'bg-indigo-950/20 text-indigo-400 hover:bg-indigo-900/40 hover:text-indigo-300 border-indigo-900/30 hover:border-indigo-800/50' 
                        : 'bg-indigo-50/50 text-indigo-600 hover:bg-indigo-100/80 hover:border-indigo-300 border-indigo-200'
                    }`}
                    onClick={() => handleWipe("ROOMS")}
                    disabled={selection.size === 0 || isProcessing}
                >
                    <Trash2 className="mr-3 opacity-60" size={14}/> Clear Rooms
                </Button>
              </div>
            </div>

          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-h-0 bg-transparent">
            {/* List Header */}
            <div className={`p-4 md:p-6 pb-4 flex items-center justify-between ${isDarkMode ? 'bg-slate-900/50' : 'bg-transparent'}`}>
                <div className="flex items-center gap-3">
                  <button onClick={handleSelectAll} className={`p-1 rounded-md transition-colors ${
                    isDarkMode 
                      ? 'text-slate-500 hover:text-blue-400 hover:bg-blue-900/30' 
                      : 'text-slate-500 hover:text-blue-500 hover:bg-blue-50'
                  }`}>
                     {selection.size === filteredSections.length && filteredSections.length > 0 ? <CheckSquare size={18} className="text-blue-500" /> : <Square size={18} />}
                  </button>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${theme.muted}`}>
                    {selection.size} of {filteredSections.length} Selected
                  </span>
                </div>
            </div>

            <div className="flex-1 p-4 md:p-6 overflow-y-auto">
                <div className="space-y-4">
                  {filteredSections.length === 0 ? (
                      <div className="py-20 text-center">
                          <Filter size={32} className={`mx-auto mb-4 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`}/>
                          <p className={`text-xs font-bold uppercase tracking-widest ${theme.muted}`}>No sections found for this filter</p>
                      </div>
                  ) : filteredSections.map((s) => {
                      const isSelected = selection.has(s.section_name)
                      const isExpanded = expandedSection === s.section_name

                      return (
                          <div key={s.id} className={`rounded-[24px] border border-transparent overflow-hidden transition-all duration-500 hover:-translate-y-0.5 ${
                            isSelected 
                              ? (isDarkMode ? 'border-blue-500 bg-slate-900 ring-2 ring-blue-500/20' : 'border-blue-400 bg-white ring-4 ring-blue-500/10 shadow-[0_8px_30px_rgb(59,130,246,0.12)]')
                              : (isDarkMode ? 'bg-slate-900/40 hover:bg-slate-900/80 shadow-md border-slate-800/30' : 'bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.08)]')
                          }`}>
                              
                              <div className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isSelected ? (isDarkMode ? 'bg-blue-950/20' : 'bg-blue-50/50') : ''}`} onClick={() => setExpandedSection(isExpanded ? null : s.section_name)}>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleToggleSelect(s.section_name); }}
                                  className="p-2 rounded-lg text-slate-400 hover:text-blue-500 flex-shrink-0"
                                >
                                  {isSelected ? <CheckSquare size={20} className="text-blue-500" /> : <Square size={20} />}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                          s.strand === 'ICT' 
                                            ? (isDarkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600') 
                                            : (isDarkMode ? 'bg-orange-900/40 text-orange-400' : 'bg-orange-50 text-orange-600')
                                        }`}>
                                            {s.strand === 'ICT' ? <Cpu size={14} /> : <BookOpen size={14} />}
                                        </div>
                                        <Badge variant="outline" className={`text-[9px] font-black border-none uppercase px-2 py-0.5 rounded-md ${
                                          s.strand === 'ICT' 
                                            ? (isDarkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50/50 text-blue-700') 
                                            : (isDarkMode ? 'bg-orange-900/20 text-orange-400' : 'bg-orange-50/50 text-orange-700')
                                        }`}>
                                            {s.strand} {s.grade_level}
                                        </Badge>
                                        <h4 className={`text-sm md:text-base font-black truncate tracking-wide ${theme.text}`}>{s.section_name}</h4>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${
                                    (s.students ? s.students.filter((st: any) => st.status === "Approved" || st.status === "Accepted").length : 0) > 0 
                                      ? (isDarkMode ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600')
                                      : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500')
                                  }`}>
                                      {s.students ? s.students.filter((st: any) => st.status === "Approved" || st.status === "Accepted").length : 0} Enrolled
                                  </div>
                                  <div className="text-slate-400">
                                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                  </div>
                                </div>
                              </div>

                              {isExpanded && (
                                  <div className={`p-4 pt-0 border-t ${isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-slate-50'}`}>
                                      <div className="mt-4">
                                        <ScheduleTab 
                                            sectionName={s.section_name}
                                            isICT={s.strand === 'ICT'}
                                            isDarkMode={isDarkMode}
                                            schoolYear={config?.school_year || "2024-2025"}
                                            students={s.students || []}
                                            allSchedules={allSchedules}
                                        />
                                      </div>
                                  </div>
                              )}
                              
                          </div>
                      )
                  })}
                </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
