"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { addSection, deleteAndCollapseSection } from "@/lib/actions/sections"
import { updateApplicantStatus, deleteApplicant, updateStudentSection } from "@/lib/actions/applicants"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { 
  Users2, Plus, Trash2, Loader2, Cpu, BookOpen, Layers, 
  ArrowLeft, Search, Eye, RefreshCcw, Check, User, Phone, 
  GraduationCap, ShieldCheck, ChevronDown, ChevronUp, FileDown, 
  MapPin, Mail, FileText, ScrollText, UserCircle2, Settings2, 
  Sparkles, Filter, AlertTriangle, RotateCw, Download, ExternalLink, RefreshCw, X, ZoomIn, Maximize2,
  UserMinus
} from "lucide-react"
import { toast } from "sonner"

export default function SectionsPage() {
  const [sections, setSections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedSectionName, setSelectedSectionName] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [strandFilter, setStrandFilter] = useState<"ALL" | "ICT" | "GAS">("ALL")
  
  const [ictExpanded, setIctExpanded] = useState(true)
  const [gasExpanded, setGasExpanded] = useState(true)

  // --- GLOBAL STATES ---
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewingFile, setViewingFile] = useState<{url: string, label: string} | null>(null)
  const [rotation, setRotation] = useState(0)

  const [unenrollOpen, setUnenrollOpen] = useState(false)
  const [activeUnenrollStudent, setActiveUnenrollStudent] = useState<any>(null)

  // --- PERSISTENCE LOGIC WITH ERROR GUARD ---
  useEffect(() => {
    const saved = localStorage.getItem("registrar_active_matrix")
    if (saved) setSelectedSectionName(saved)
  }, [])

  useEffect(() => {
    if (selectedSectionName) localStorage.setItem("registrar_active_matrix", selectedSectionName)
    else localStorage.removeItem("registrar_active_matrix")
  }, [selectedSectionName])

  const fetchSections = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sections')
        .select(`*, students ( * )`)
        .order('section_name', { ascending: true })

      if (error) throw error
      setSections(data || [])
    } catch (err) {
      toast.error("Registrar Sync Error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { 
    fetchSections() 
    const channel = supabase
      .channel('sections_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        fetchSections()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchSections])

  const ictSections = useMemo(() => sections.filter(s => s.strand === 'ICT'), [sections])
  const gasSections = useMemo(() => sections.filter(s => s.strand === 'GAS'), [sections])

  const calculateStrandLoad = (strandSections: any[]) => {
    const totalCapacity = strandSections.reduce((acc, s) => acc + (s.capacity || 40), 0)
    const totalEnrolled = strandSections.reduce((acc, s) => {
      const active = s.students?.filter((st: any) => st.status === 'Accepted' || st.status === 'Approved').length || 0
      return acc + active
    }, 0)
    return { totalCapacity, totalEnrolled, percent: totalCapacity > 0 ? (totalEnrolled / totalCapacity) * 100 : 0 }
  }

  const ictLoad = useMemo(() => calculateStrandLoad(ictSections), [ictSections])
  const gasLoad = useMemo(() => calculateStrandLoad(gasSections), [gasSections])

  const handleAdd = async (strand: "ICT" | "GAS") => {
    setIsProcessing(true)
    try {
      const result = await addSection(strand)
      toast.success(`Generated ${result.name}`)
      await fetchSections()
    } catch (err: any) { toast.error(err.message) }
    finally { setIsProcessing(false) }
  }

  const handleDeleteSection = async (id: string, name: string, strand: "ICT" | "GAS") => {
    if (!confirm(`WARNING: Deleting ${name} shifts matrix sequence. Proceed?`)) return
    setIsProcessing(true)
    try {
      await deleteAndCollapseSection(id, strand)
      toast.success(`Matrix Sequence Updated.`)
      await fetchSections()
    } catch (err: any) { toast.error(err.message) }
    finally { setIsProcessing(false) }
  }

  const handleClearAllStudents = async () => {
    const confirmName = prompt("Type 'DELETE ALL' to PERMANENTLY wipe the student database.")
    if (confirmName !== "DELETE ALL") return
    setIsProcessing(true)
    try {
      const { error } = await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      toast.success("Student database purged.")
      await fetchSections()
    } catch (err: any) { toast.error(err.message) }
    finally { setIsProcessing(false) }
  }

  const handleReturnToPending = async (id: string, name: string) => {
    try {
      await updateApplicantStatus(id, 'Pending')
      toast.success(`${name} returned to Pending queue.`)
      fetchSections()
    } catch (err) { toast.error("Action failed") }
  }

  const handleConfirmUnenroll = async () => {
    if (!activeUnenrollStudent) return
    const toastId = toast.loading(`Purging ${activeUnenrollStudent.first_name}...`)
    try {
      const result = await deleteApplicant(activeUnenrollStudent.id)
      if (result.success) {
        toast.success(`Record Erased Successfully`, { id: toastId })
        setUnenrollOpen(false)
        setActiveUnenrollStudent(null)
        fetchSections()
      }
    } catch (err) { toast.error("Database purge failed") }
  }

  const handleSwitch = async (id: string, newSectionName: string) => {
    try {
      const targetSec = sections.find(s => s.section_name === newSectionName)
      if (!targetSec) return
      await updateStudentSection(id, targetSec.id)
      toast.success(`Moved to ${newSectionName}`)
      fetchSections()
    } catch (err) { toast.error("Transfer failed") }
  }

  const exportSectionCSV = (sectionName: string, students: any[]) => {
    const headers = ["FULL NAME", "LRN", "GENDER", "STRAND", "EMAIL", "ADDRESS"];
    const rows = students.map(s => [
      `${s.last_name.toUpperCase()}, ${s.first_name.toUpperCase()} ${s.middle_name?.[0] || ''}.`,
      `'${s.lrn}`,
      s.gender,
      s.strand,
      s.email,
      `"${s.address}"`
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Masterlist_${sectionName}.csv`;
    link.click();
  };

  if (loading && sections.length === 0) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 text-slate-400">
      <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
      <p className="text-[10px] font-black uppercase tracking-widest text-center">Syncing Class Matrices...</p>
    </div>
  )

  // --- START OF MAIN UNIFIED RENDER ---
  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      
      {selectedSectionName ? (() => {
        // --- 300 IQ ERROR GUARD ---
        const currentSection = sections.find(s => s.section_name === selectedSectionName)
        if (!currentSection) return (
           <div className="h-96 flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
              <p className="text-[10px] font-black uppercase tracking-widest text-center">Locating Section Matrix...</p>
           </div>
        );

        const activeStudents = currentSection?.students?.filter((s: any) => s.status === 'Accepted' || s.status === 'Approved') || []
        const sortedStudents = [...activeStudents].sort((a, b) => a.last_name.localeCompare(b.last_name))
        const mCount = sortedStudents.filter(s => s.gender === 'Male').length
        const fCount = sortedStudents.filter(s => s.gender === 'Female').length
        const capacity = currentSection.capacity || 40
        const fillPercent = (sortedStudents.length / capacity) * 100

        return (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
              <Button variant="ghost" onClick={() => setSelectedSectionName(null)} className="rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all">
                <ArrowLeft className="mr-2" size={16}/> Back to Registry
              </Button>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <Button onClick={fetchSections} variant="ghost" className="h-12 w-12 p-0 rounded-2xl text-slate-400 hover:text-blue-600 transition-all"><RefreshCw className={loading ? "animate-spin" : ""} size={20}/></Button>
                <div className="relative flex-1 md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input placeholder="Search Class List..." className="pl-10 rounded-2xl border-slate-200 bg-white h-12 font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <Button onClick={() => exportSectionCSV(selectedSectionName, sortedStudents)} className="rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest h-12 px-6 hover:bg-blue-600 shadow-xl transition-all"><FileDown size={14} className="mr-2" /> Export Masterlist</Button>
              </div>
            </div>

            <div className="bg-slate-900 p-12 rounded-[48px] text-white relative overflow-hidden shadow-2xl border border-white/5">
              <div className={`absolute top-0 right-0 w-96 h-96 blur-[100px] opacity-20 rounded-full ${currentSection.strand === 'ICT' ? 'bg-blue-500' : 'bg-orange-500'}`} />
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                 <div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">{selectedSectionName}</h1>
                    <div className="flex items-center gap-4 mt-6">
                       <Badge className="bg-white/10 text-white border-white/10 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest">{currentSection.strand} Matrix Division</Badge>
                       <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic opacity-80">AMA ACLC S.Y. 2025-2026 Admissions</p>
                    </div>
                 </div>
                 <div className="bg-white/5 backdrop-blur-md p-8 rounded-[32px] border border-white/10">
                    <div className="flex justify-between items-end mb-4">
                       <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Classroom Utilization</p><p className="text-3xl font-black mt-1">{sortedStudents.length} <span className="text-slate-500 text-lg">/ {capacity} Seats</span></p></div>
                       <p className="text-xl font-black text-white">{Math.round(fillPercent)}%</p>
                    </div>
                    <Progress value={fillPercent} className="h-3 bg-white/10 [&>div]:bg-blue-500" />
                 </div>
              </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="bg-slate-100 p-1.5 rounded-[24px] mb-8 border border-slate-200/50 w-fit">
                <TabsTrigger value="all" className="rounded-[20px] px-10 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900">All ({sortedStudents.length})</TabsTrigger>
                <TabsTrigger value="males" className="rounded-[20px] px-10 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600">Males ({mCount})</TabsTrigger>
                <TabsTrigger value="females" className="rounded-[20px] px-10 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-pink-600">Females ({fCount})</TabsTrigger>
              </TabsList>
              {['all', 'males', 'females'].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  <StudentTable 
                    students={sortedStudents.filter(s => {
                      const match = `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
                      if (tab === 'all') return match;
                      return match && s.gender === (tab === 'males' ? 'Male' : 'Female');
                    })} 
                    onReturn={handleReturnToPending} 
                    onUnenroll={(s: any) => { setActiveUnenrollStudent(s); setUnenrollOpen(true); }}
                    onSwitch={handleSwitch} 
                    allSections={sections.filter(s => s.strand === currentSection.strand)}
                    onOpenFile={(url: string, label: string) => { setViewingFile({ url, label }); setRotation(0); setViewerOpen(true); }}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )
      })() : (
        /* GRID REGISTRY VIEW BRANCH */
        <>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white/50 p-6 rounded-[40px] border border-slate-100 backdrop-blur-sm shadow-sm">
            <div className="space-y-1"><h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase leading-none">Class Matrix</h1><p className="text-slate-500 font-medium italic text-sm">Managing AMA ACLC Northbay Enrollment Distribution</p></div>
            <div className="flex bg-slate-100 p-1.5 rounded-[22px] border border-slate-200/50">
               <FilterButton label="All" active={strandFilter === 'ALL'} onClick={() => setStrandFilter('ALL')} icon={<Layers size={14}/>} />
               <FilterButton label="ICT" active={strandFilter === 'ICT'} onClick={() => setStrandFilter('ICT')} icon={<Cpu size={14}/>} />
               <FilterButton label="GAS" active={strandFilter === 'GAS'} onClick={() => setStrandFilter('GAS')} icon={<BookOpen size={14}/>} />
            </div>
            <div className="flex flex-wrap gap-3">
              <DeleteManagementDialog sections={sections} onDelete={handleDeleteSection} onClearStudents={handleClearAllStudents} />
              <Button onClick={() => handleAdd('ICT')} disabled={isProcessing} className="rounded-2xl bg-blue-600 hover:bg-blue-700 h-12 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-100 transition-all active:scale-95"><Plus className="mr-2" size={16}/> New ICT Matrix</Button>
              <Button onClick={() => handleAdd('GAS')} disabled={isProcessing} className="rounded-2xl bg-orange-600 hover:bg-orange-700 h-12 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-100 transition-all active:scale-95"><Plus className="mr-2" size={16}/> New GAS Matrix</Button>
            </div>
          </div>
          {['ICT', 'GAS'].map(strand => (strandFilter === 'ALL' || strandFilter === strand) && (
            <SectionGroup key={strand} title={strand === 'ICT' ? "Information Technology" : "General Academics"} icon={strand === 'ICT' ? <Cpu/> : <BookOpen/>} color={strand === 'ICT' ? 'blue' : 'orange'} sections={strand === 'ICT' ? ictSections : gasSections} load={strand === 'ICT' ? ictLoad : gasLoad} onSelect={setSelectedSectionName} onDelete={handleDeleteSection} isExpanded={strand === 'ICT' ? ictExpanded : gasExpanded} onToggle={() => strand === 'ICT' ? setIctExpanded(!ictExpanded) : setGasExpanded(!gasExpanded)} />
          ))}
        </>
      )}

      {/* --- GLOBAL HIGH-FIDELITY DOCUMENT VIEWER --- */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 rounded-[40px] overflow-hidden border-none shadow-2xl bg-slate-950/95 flex flex-col z-[10000]">
          <div className="p-6 bg-slate-900 border-b border-white/5 flex items-center justify-between shrink-0">
            <div><p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">Registrar Inspection Matrix</p><DialogTitle className="text-white font-black uppercase text-xl leading-none">{viewingFile?.label}</DialogTitle></div>
            <div className="flex gap-3">
              <Button variant="ghost" size="icon" onClick={() => setRotation(r => (r + 90) % 360)} className="rounded-full bg-white/10 hover:bg-white/20 text-white"><RotateCw size={20}/></Button>
              <Button variant="ghost" size="icon" onClick={() => window.open(viewingFile?.url, '_blank')} className="rounded-full bg-white/10 hover:bg-white/20 text-white"><Download size={20}/></Button>
              <Button variant="ghost" size="icon" onClick={() => setViewerOpen(false)} className="rounded-full bg-red-500 hover:bg-red-600 text-white"><X size={20}/></Button>
            </div>
          </div>
          <div className="flex-1 w-full h-full flex items-center justify-center p-12 overflow-auto custom-scrollbar bg-grid-white/[0.02]">
            {viewingFile?.url.toLowerCase().endsWith('.pdf') ? (
              <iframe src={viewingFile.url} className="w-full h-full rounded-2xl bg-white border-none" title="PDF Viewer" />
            ) : (
              <div className="relative group cursor-zoom-in transition-transform duration-300" style={{ transform: `rotate(${rotation}deg)` }}>
                <img src={viewingFile?.url} alt="Inspection" className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-500" />
              </div>
            )}
          </div>
          <div className="p-6 bg-slate-900/50 backdrop-blur-xl border-t border-white/5 flex items-center justify-center shrink-0">
             <div className="flex items-center gap-6"><div className="flex items-center gap-2 text-slate-400 uppercase font-black text-[9px] tracking-widest"><Maximize2 size={12}/> High Fidelity Rendering</div><div className="w-[1px] h-4 bg-white/10" /><p className="text-white/40 text-[9px] font-bold uppercase tracking-widest italic text-center">Rotate and Maximize for precise verification</p></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- GLOBAL UNENROLL MODAL --- */}
      <Dialog open={unenrollOpen} onOpenChange={setUnenrollOpen}>
        <DialogContent className="max-w-md rounded-[32px] p-0 overflow-hidden border-none shadow-2xl bg-white z-[10000]">
          <div className="bg-red-600 p-8 text-white flex items-center gap-4">
             <div className="p-3 bg-white/20 rounded-2xl shadow-lg"><AlertTriangle size={32} /></div>
             <div><DialogTitle className="text-xl font-black uppercase leading-tight">Confirm Purge</DialogTitle><p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Permanent Database Deletion</p></div>
          </div>
          <div className="p-8 space-y-6 text-center">
             <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                <p className="text-sm font-bold text-red-900 leading-relaxed">Are you sure you want to permanently erase <br/><span className="text-lg uppercase font-black underline decoration-2">{activeUnenrollStudent?.last_name}, {activeUnenrollStudent?.first_name}</span>?</p>
                <p className="text-[10px] font-black uppercase text-red-400 mt-4 tracking-widest">Student data will be removed from all matrices.</p>
             </div>
             <DialogFooter className="flex-col sm:flex-col gap-2">
                <Button onClick={handleConfirmUnenroll} className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-100 transition-all">Execute Database Purge</Button>
                <Button variant="ghost" onClick={() => setUnenrollOpen(false)} className="w-full h-12 rounded-2xl text-slate-400 font-black uppercase text-[10px]">Cancel</Button>
             </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {isProcessing && <ProcessingOverlay />}
    </div>
  )
}

function FilterButton({ label, active, onClick, icon }: any) {
    return (<button onClick={onClick} className={`flex items-center gap-2 px-6 py-2.5 rounded-[18px] font-black uppercase text-[10px] tracking-widest transition-all duration-300 ${active ? 'bg-white text-slate-900 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}>{icon} {label}</button>)
}

function StudentTable({ students, onReturn, onUnenroll, onSwitch, allSections, onOpenFile }: any) {
  return (
    <div className="bg-white rounded-[48px] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50 overflow-x-auto">
      <Table className="border-separate border-spacing-y-6 px-6">
        <TableHeader className="bg-slate-50/50">
           <TableRow className="border-none hover:bg-transparent">
              <TableHead className="px-10 py-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Full Matrix Identity</TableHead>
              <TableHead className="px-6 py-6 font-black uppercase text-[10px] tracking-widest text-slate-400 text-center">Gender</TableHead>
              <TableHead className="px-6 py-6 font-black uppercase text-[10px] tracking-widest text-slate-400 text-center">Identity</TableHead>
              <TableHead className="text-right px-10 font-black uppercase text-[10px] tracking-widest text-slate-400">Actions</TableHead>
           </TableRow>
        </TableHeader>
        <TableBody>
          {students.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center py-32 text-slate-300 italic font-medium">No records found for this segment.</TableCell></TableRow>
          ) : (
            students.map((s: any) => (
              <TableRow key={s.id} className="hover:bg-slate-50/50 border-b border-slate-50 group transition-all relative">
                <TableCell className="px-10 py-6 min-w-[350px] relative">
                  {/* GENDER RIBBON INDICATOR */}
                  <div className={`absolute left-0 top-0 bottom-0 w-2 ${s.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'}`} />
                  <div className="flex items-center gap-5 pl-2">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden border-2 border-white shadow-md shrink-0 transition-transform group-hover:scale-105 duration-300">
                       <img src={s.two_by_two_url || s.profile_2x2_url || s.profile_picture || `https://api.dicebear.com/7.x/initials/svg?seed=${s.last_name}`} alt="2x2" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="font-black text-slate-900 text-lg uppercase leading-none tracking-tighter">{s.last_name}, {s.first_name} {s.middle_name?.[0]}.</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">LRN: {s.lrn}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center font-black text-[10px] uppercase">
                   <span className={s.gender === 'Female' ? 'text-pink-500' : 'text-blue-500'}>{s.gender}</span>
                </TableCell>
                <TableCell className="text-center">
                   <Badge variant="outline" className="border-slate-200 text-slate-400 text-[8px] font-black uppercase px-3 py-1">{s.student_category || "Regular"}</Badge>
                </TableCell>
                <TableCell className="text-right px-10 space-x-2 whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    {/* RETURN (ORANGE) */}
                    <Button onClick={() => onReturn(s.id, s.first_name)} variant="outline" className="h-10 px-4 rounded-xl border-orange-100 bg-orange-50 text-orange-600 font-black text-[9px] uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all shadow-sm">
                      Return
                    </Button>
                    {/* SWITCH (BLUE) */}
                    <SwitchDialog student={s} allSections={allSections} onSwitch={onSwitch} />
                    <Dialog>
                      <DialogTrigger asChild><Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm"><Eye size={16}/></Button></DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[48px] p-0 border-none shadow-2xl">
                        <DialogHeader className="sr-only"><DialogTitle>Identity Profile</DialogTitle></DialogHeader>
                        <StudentDossier student={s} onOpenFile={onOpenFile} />
                      </DialogContent>
                    </Dialog>
                    {/* PURGE (RED) */}
                    <Button onClick={() => onUnenroll(s)} variant="outline" className="h-10 w-10 p-0 rounded-xl border-red-100 bg-red-50 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-sm">
                      <UserMinus size={16}/>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function SectionGroup({ title, icon, color, sections, load, onSelect, onDelete, isExpanded, onToggle }: any) {
  const colorMap: any = { blue: "bg-blue-50 text-blue-600 border-blue-100", orange: "bg-orange-50 text-orange-600 border-orange-100" }
  return (
    <section className="space-y-6">
      <div onClick={onToggle} className="flex flex-col md:flex-row md:items-center justify-between gap-6 group cursor-pointer border-b border-slate-100 pb-8 hover:border-slate-300 transition-all"><div className="flex items-center gap-4"><div className={`p-4 rounded-2xl transition-all group-hover:rotate-12 duration-500 ${colorMap[color]}`}>{icon}</div><h2 className="text-2xl font-black uppercase tracking-widest text-slate-800">{title}</h2><Badge className={`${color === 'blue' ? 'bg-blue-600' : 'bg-orange-600'} text-white rounded-full px-4 py-1.5 font-black text-[10px]`}>{sections.length}</Badge></div><div className="flex items-center gap-6 bg-white p-5 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-100/50 min-w-[350px]"><div className="flex-1 space-y-2"><div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400"><span>Strand Saturation</span><span>{Math.round(load.percent)}%</span></div><Progress value={load.percent} className={`h-2 bg-slate-100 [&>div]:transition-all [&>div]:duration-1000 ${color === 'blue' ? '[&>div]:bg-blue-600' : '[&>div]:bg-orange-600'}`} /></div><div className="text-right border-l pl-6 border-slate-100"><p className="text-sm font-black text-slate-900">{load.totalEnrolled}/{load.totalCapacity}</p><p className="text-[8px] font-bold text-slate-400 uppercase">Load Index</p></div><div className="text-slate-300 group-hover:text-slate-900 transition-colors">{isExpanded ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}</div></div></div>
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-300 ease-out ${isExpanded ? "opacity-100 max-h-[5000px] visible translate-y-0" : "opacity-0 max-h-0 invisible -translate-y-4 overflow-hidden"}`}>
        {sections.length === 0 ? (<div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-[40px] text-slate-300 font-bold uppercase text-xs tracking-widest">No Active Matrices Found</div>) : (sections.map((sec: any) => (<div key={sec.id} onClick={() => onSelect(sec.section_name)} className="cursor-pointer group"><SectionCard section={sec} onDelete={onDelete} /></div>)))}
      </div>
    </section>
  )
}

function SectionCard({ section, onDelete }: any) {
  const activeStudents = section.students?.filter((s: any) => s.status === 'Accepted' || s.status === 'Approved') || []
  const mCount = activeStudents.filter((s: any) => s.gender === 'Male').length
  const fCount = activeStudents.filter((s: any) => s.gender === 'Female').length
  const capacity = section.capacity || 40
  const mP = Math.min((mCount / capacity) * 100, 100)
  const fP = Math.min((fCount / capacity) * 100, 100)
  return (
    <Card className="p-10 rounded-[48px] border-none shadow-sm bg-white hover:shadow-2xl hover:-translate-y-2 transition-all relative overflow-hidden group"><div className={`absolute top-0 left-0 w-2.5 h-full ${section.strand === 'ICT' ? 'bg-blue-500' : 'bg-orange-500'}`} /><div className="flex justify-between items-start mb-8"><div><h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">{section.section_name}</h3><Badge variant="outline" className="mt-4 rounded-full font-black text-[10px] border-slate-100 text-slate-400 px-4 py-1 uppercase tracking-widest">S.Y. 2025-26</Badge></div></div><div className="space-y-5 mb-10"><div className="flex justify-between items-end"><div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest"><Layers size={16} /> Matrix Distribution</div><span className="text-base font-black text-slate-900">{activeStudents.length} <span className="text-slate-200">/ {capacity}</span></span></div><div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner relative"><div className="h-full bg-blue-500 transition-all duration-1000 ease-out border-r border-white/20" style={{ width: `${mP}%` }} /><div className="h-full bg-pink-500 transition-all duration-1000 ease-out delay-100" style={{ width: `${fP}%` }} /></div></div><div className="grid grid-cols-2 gap-4"><div className="bg-slate-50 p-5 rounded-3xl text-center border border-slate-100 transition-all group-hover:bg-blue-50/50 group-hover:border-blue-200"><p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1.5">Males</p><p className="text-2xl font-black text-slate-900">{mCount}</p></div><div className="bg-slate-50 p-5 rounded-3xl text-center border border-slate-100 transition-all group-hover:bg-pink-50/50 group-hover:border-pink-200"><p className="text-[8px] font-black text-pink-500 uppercase tracking-widest mb-1.5">Females</p><p className="text-2xl font-black text-slate-900">{fCount}</p></div></div></Card>
  )
}

function SwitchDialog({ student, allSections, onSwitch }: any) {
  return (
    <Dialog><DialogTrigger asChild><Button variant="outline" className="h-10 px-4 rounded-xl border-blue-100 bg-blue-50 text-blue-600 font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm group"><RefreshCcw size={12} className="mr-2 group-hover:rotate-180 transition-transform duration-500" />Switch</Button></DialogTrigger><DialogContent className="rounded-[48px] max-w-md p-0 overflow-hidden border-none shadow-2xl bg-white"><DialogHeader className="p-8 bg-slate-900 text-white relative"><div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -mr-10 -mt-10" /><div className="flex items-center gap-4 mb-6 relative z-10"><div className="p-3 bg-blue-600 rounded-2xl border border-white/10 shadow-xl"><Sparkles className="text-white" size={24} /></div><div><DialogTitle className="font-black uppercase tracking-tighter text-2xl leading-none">Matrix Transfer</DialogTitle><DialogDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-3">Transferring: <span className="text-white block font-black text-sm mt-1">{student.first_name} {student.last_name}</span></DialogDescription></div></div></DialogHeader><div className="p-6 bg-white space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">{allSections.map((sec: any) => (<button key={sec.id} onClick={() => onSwitch(student.id, sec.section_name)} className={`w-full group flex items-center justify-between p-5 rounded-3xl border-2 transition-all hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 ${student.section_id === sec.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100'}`}><div className="flex flex-col items-start"><span className="font-black text-slate-900 uppercase text-xs tracking-tight group-hover:text-blue-600">{sec.section_name}</span><span className="text-[8px] font-bold text-slate-400 uppercase mt-1">Division: {sec.strand}</span></div><div className={`p-2 rounded-full ${student.section_id === sec.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity'}`}><Check size={14} /></div></button>))}</div></DialogContent></Dialog>
  )
}

function StudentDossier({ student, onOpenFile }: { student: any, onOpenFile: (url: string, label: string) => void }) {
  const isJHS = student.student_category?.toLowerCase().includes("jhs") || student.student_category === "Standard" || student.student_category === "JHS Graduate";
  return (
    <div className="flex flex-col bg-white">
      <div className="bg-slate-900 p-12 flex flex-col items-center text-center relative overflow-hidden"><div className="absolute top-0 right-0 p-10"><Badge className="bg-blue-600 text-[10px] font-black px-5 py-2.5 uppercase tracking-widest border-none shadow-xl shadow-blue-500/20">{student.student_category || "Regular"}</Badge></div><div className="relative z-10 mb-8 scale-110"><div className="w-44 h-44 bg-slate-800 rounded-[40px] border-4 border-white/10 overflow-hidden shadow-2xl flex items-center justify-center cursor-zoom-in group" onClick={(e) => { e.stopPropagation(); onOpenFile(student.two_by_two_url || student.profile_2x2_url || student.profile_picture, "Identity Matrix 2x2"); }} > {student.two_by_two_url || student.profile_2x2_url || student.profile_picture ? (<img src={student.two_by_two_url || student.profile_2x2_url || student.profile_picture} alt="2x2" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />) : (<div className="flex flex-col items-center text-slate-500"><User size={56} strokeWidth={1} /><p className="text-[10px] font-black uppercase mt-3">Identity Missing</p></div>)} </div></div><h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">{student.first_name} {student.last_name}</h2><p className="text-blue-400 font-bold uppercase tracking-[0.4em] text-[11px] mt-4 opacity-80">Registry ID: {student.lrn}</p><StatusBadge status={student.status} /></div>
      <div className="p-12 space-y-16 text-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-8"><h3 className="flex items-center gap-3 font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-4 border-slate-100"><User size={16} className="text-blue-500" /> Personal Identity</h3><div className="grid grid-cols-2 gap-y-8"><InfoBlock label="First Name" value={student.first_name} /><InfoBlock label="Middle Initial" value={student.middle_name?.[0] ? `${student.middle_name[0]}.` : "N/A"} /><InfoBlock label="Last Name" value={student.last_name} /><InfoBlock label="Full Legal Name" value={`${student.first_name} ${student.middle_name || ''} ${student.last_name}`} /><InfoBlock label="Gender" value={student.gender} /><InfoBlock label="Age" value={student.age?.toString()} /><InfoBlock label="Birth Date" value={student.birth_date} /><InfoBlock label="Civil Status" value={student.civil_status} /><div className="col-span-2"><InfoBlock label="Full Address" value={student.address} icon={<MapPin size={12} />} /></div></div></div>
          <div className="space-y-8"><h3 className="flex items-center gap-3 font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-4 border-slate-100"><Mail size={16} className="text-indigo-500" /> Communication Matrix</h3><div className="space-y-8"><InfoBlock label="Email Address" value={student.email} icon={<Mail size={12} />} /><InfoBlock label="Primary Phone" value={student.phone || student.contact_no} icon={<Phone size={12} />} /><div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Database ID</p><p className="text-[10px] font-bold text-slate-900 truncate">{student.id}</p></div></div></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
           <div className="space-y-8"><h3 className="flex items-center gap-3 font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-4 border-slate-100"><ShieldCheck size={16} className="text-emerald-500" /> Guardian Matrix</h3><div className="space-y-6"><InfoBlock label="Guardian Full Name" value={`${student.guardian_first_name || student.guardian_name || ''} ${student.guardian_last_name || ''}`} /><InfoBlock label="Guardian Contact" value={student.guardian_phone || student.guardian_contact} icon={<Phone size={12} />} /></div></div>
          <div className="space-y-8"><h3 className="flex items-center gap-3 font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-4 border-slate-100"><GraduationCap size={16} className="text-orange-500" /> Academic Matrix</h3><div className="grid grid-cols-2 gap-6"><div className="col-span-2 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Origin Institution</p><p className="font-black text-slate-900 uppercase text-sm truncate">{student.last_school_attended || "Not Disclosed"}</p></div><div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 text-center"><p className="text-[10px] font-bold text-blue-400 uppercase mb-2">GWA Index</p><p className="text-3xl font-black text-blue-600">{student.gwa_grade_10 || "0.00"}</p></div><div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100 text-center"><p className="text-[10px] font-bold text-orange-400 uppercase mb-2">Target Strand</p><p className="text-2xl font-black text-orange-600">{student.strand}</p></div></div></div>
        </div>
        <div className="space-y-8 pb-12">
          <h3 className="flex items-center gap-3 font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-4 border-slate-100"><ScrollText size={16} className="text-blue-500" /> Registrar Credential Vault</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {isJHS ? (<><CredentialCard label="Form 138" url={student.form_138_url} onOpen={onOpenFile} /><CredentialCard label="Good Moral" url={student.good_moral_url} onOpen={onOpenFile} /></>) : (<><CredentialCard label="ALS COR Rating" url={student.cor_url} onOpen={onOpenFile} /><CredentialCard label="Diploma" url={student.diploma_url} onOpen={onOpenFile} /><CredentialCard label="AF5 Form" url={student.af5_url} onOpen={onOpenFile} /></>)}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoBlock({ label, value, icon }: { label: string, value: string, icon?: React.ReactNode }) {
  return (<div><p className="text-slate-400 text-[10px] uppercase font-black tracking-[0.2em] mb-1">{label}</p><p className="text-slate-900 font-bold flex items-center gap-2.5 text-base">{icon}{value || "—"}</p></div>)
}

function CredentialCard({ label, url, onOpen }: { label: string, url: string, onOpen?: (url: string, label: string) => void }) {
  if (!url) return (<div className="bg-slate-50 p-6 rounded-[32px] border border-dashed border-slate-200 opacity-50 flex flex-col items-center justify-center text-slate-400 h-40"><FileText size={24} className="mb-3" /><p className="text-[9px] font-black uppercase tracking-widest text-center">{label}</p></div>);
  return (
    <div onClick={(e) => { e.stopPropagation(); onOpen && onOpen(url, label); }} className="cursor-pointer group">
      <div className="bg-white p-2.5 rounded-[32px] border border-slate-200 hover:border-blue-400 hover:shadow-2xl transition-all h-full relative">
        <div className="h-32 rounded-3xl overflow-hidden bg-slate-100 relative">{url.toLowerCase().endsWith('.pdf') ? (<div className="w-full h-full flex flex-col items-center justify-center bg-slate-200"><FileText size={32} className="text-slate-400" /><p className="text-[8px] font-black uppercase text-slate-500 mt-2">PDF Document</p></div>) : (<img src={url} alt={label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />)}<div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><ZoomIn className="text-white" size={24} /></div></div>
        <p className="text-[10px] font-black text-center mt-4 uppercase text-slate-900 tracking-widest leading-tight">{label}</p>
      </div>
    </div>
  )
}

function ProcessingOverlay() {
  return (<div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[10000] flex items-center justify-center"><div className="bg-slate-900 text-white p-10 rounded-[48px] flex items-center gap-6 shadow-2xl animate-in zoom-in-95 duration-300"><Loader2 className="animate-spin text-blue-400 w-8 h-8" /><span className="font-black uppercase text-sm tracking-[0.2em]">Updating Matrix Data...</span></div></div>)
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = { Pending: "bg-amber-100/20 text-amber-500 border-amber-200/30", Accepted: "bg-green-100/20 text-green-500 border-green-200/30", Approved: "bg-green-100/20 text-green-500 border-green-200/30", Rejected: "bg-red-100/20 text-red-500 border-red-200/30" }
  return (<div className={`mt-6 px-6 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.3em] w-fit shadow-sm ${styles[status]}`}>{status === 'Approved' ? 'Accepted' : status}</div>)
}

function DeleteManagementDialog({ sections, onDelete, onClearStudents }: any) {
  return (
    <Dialog><DialogTrigger asChild><Button variant="outline" className="rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest border-red-100 text-red-500 hover:bg-red-500 hover:text-white shadow-sm transition-all"><Settings2 size={16} className="mr-2" /> Matrix Controls</Button></DialogTrigger><DialogContent className="rounded-[48px] max-w-xl p-0 overflow-hidden border-none shadow-2xl bg-white"><Tabs defaultValue="sections"><DialogHeader className="p-8 bg-slate-900 text-white relative"><div className="flex items-center justify-between relative z-10"><div><DialogTitle className="font-black uppercase tracking-tighter text-2xl">Control Center</DialogTitle><DialogDescription className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Manage matrices and student records</DialogDescription></div><TabsList className="bg-white/10 p-1 rounded-2xl border border-white/5"><TabsTrigger value="sections" className="rounded-xl px-4 py-2 font-black uppercase text-[9px] data-[state=active]:bg-white data-[state=active]:text-slate-900">Sections</TabsTrigger><TabsTrigger value="danger" className="rounded-xl px-4 py-2 font-black uppercase text-[9px] data-[state=active]:bg-red-600 data-[state=active]:text-white">Registry</TabsTrigger></TabsList></div></DialogHeader>
          <TabsContent value="sections" className="p-8 mt-0"><div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">{sections.map((sec: any) => (<div key={sec.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-white hover:border-slate-200 transition-all"><div><p className="font-black text-slate-900 uppercase tracking-tight">{sec.section_name}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{sec.strand} Matrix Division</p></div><Button onClick={() => onDelete(sec.id, sec.section_name, sec.strand)} size="sm" className="bg-white hover:bg-red-600 text-red-500 hover:text-white rounded-2xl h-10 w-10 p-0 shadow-sm border border-red-100 transition-all"><Trash2 size={16} /></Button></div>))}</div></TabsContent>
          <TabsContent value="danger" className="p-8 mt-0"><div className="bg-red-50 p-8 rounded-[32px] border border-red-100 space-y-6 text-center"><div className="w-16 h-16 bg-red-600 rounded-3xl flex items-center justify-center mx-auto text-white shadow-xl rotate-3"><AlertTriangle size={32} /></div><div className="space-y-2"><h3 className="font-black text-red-600 uppercase tracking-tighter text-xl leading-none">Wipe Student Registry</h3><p className="text-red-400 text-xs font-medium italic leading-relaxed">This action is non-reversible. Every student record, including verified and pending applications, will be permanently erased from the matrix database.</p></div><Button onClick={onClearStudents} className="w-full h-14 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-200 transition-all">Execute Registry Wipe</Button></div></TabsContent>
        </Tabs></DialogContent>
    </Dialog>
  )
}