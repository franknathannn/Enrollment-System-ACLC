"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { 
 Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea" 
import { 
 Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter
} from "@/components/ui/dialog"
import { 
 Eye, Loader2, Search, User, Phone, GraduationCap, 
 ShieldCheck, Trash2, FileDown, RotateCcw, CheckCircle2, 
 UserCircle2, XCircle, Square, CheckSquare, ListRestart,
 Mail, MapPin, Fingerprint, FileText, CalendarDays, ScrollText,
 AlertTriangle, Trash, X, ZoomIn, Maximize2, ExternalLink, 
 RotateCw, Download, RefreshCw
} from "lucide-react"
import { toast } from "sonner"
import { updateApplicantStatus, deleteApplicant } from "@/lib/actions/applicants"
import { format } from "date-fns"

export default function ApplicantsPage() {
 const [viewerOpen, setViewerOpen] = useState(false)
 const [viewingFile, setViewingFile] = useState<{url: string, label: string} | null>(null)
 const [rotation, setRotation] = useState(0) // Logic for document rotation
 const [students, setStudents] = useState<any[]>([])
 const [config, setConfig] = useState<any>(null)
 const [loading, setLoading] = useState(true)
 const [searchTerm, setSearchTerm] = useState("")
 const [filter, setFilter] = useState<"Pending" | "Accepted" | "Rejected">("Pending")
 const [selectedIds, setSelectedIds] = useState<string[]>([])

 // --- MODAL STATES ---
 const [declineModalOpen, setDeclineModalOpen] = useState(false)
 const [activeDeclineStudent, setActiveDeclineStudent] = useState<any>(null)
 const [declineReason, setDeclineReason] = useState("")

 const [deleteModalOpen, setDeleteModalOpen] = useState(false)
 const [activeDeleteStudent, setActiveDeleteStudent] = useState<any>(null)

 // QUICK-CLICK TEMPLATES
 const QUICK_REASONS = [
  "Blurry 2x2 Photo",
  "Invalid LRN / Not Found",
  "Missing Grade 10 Report Card",
  "Incorrect Strand Selection",
  "Incomplete Guardian Details"
 ];

 const fetchStudents = useCallback(async () => {
  setLoading(true)
  try {
   const [studentsRes, configRes] = await Promise.all([
    supabase.from('students').select('*').order('created_at', { ascending: false }),
    supabase.from('system_config').select('school_year').single()
   ])

   if (studentsRes.error) throw studentsRes.error
   setStudents(studentsRes.data || [])
   if (configRes.data) setConfig(configRes.data)
  } catch (err) {
   toast.error("Failed to load registrar database")
  } finally {
   setLoading(false)
  }
 }, [])

 // LIVE UPDATE LOGIC: Supabase Realtime
 useEffect(() => {
  fetchStudents()

  const channel = supabase
    .channel('students_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
      fetchStudents()
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
 }, [fetchStudents])

 // --- LOGIC: Status Transitions ---
 const handleStatusChange = async (studentId: string, name: string, status: any, feedback?: string) => {
  const toastId = toast.loading(`Processing ${name}...`)
  try {
   const result = await updateApplicantStatus(studentId, status, feedback);
   
   if (result.success) {
    const { data: { user } } = await supabase.auth.getUser();    
    const student = students.find(s => s.id === studentId);

    await supabase.from('activity_logs').insert([{
      admin_id: user?.id,
      admin_name: user?.user_metadata?.full_name || 'Authorized Admin',
      action_type: status.toUpperCase(),
      student_name: name,
      student_id: studentId,
      student_image: student?.two_by_two_url || student?.profile_2x2_url || student?.profile_picture,
      details: feedback ? `Rejected: ${feedback}` : `Manual status transition to ${status}`
    }]);

    toast.success(`${name} updated to ${status}`, { id: toastId })
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: status } : s))
    
    setDeclineModalOpen(false)
    setDeclineReason("")
    setActiveDeclineStudent(null)
   }
  } catch (err: any) {
   toast.error(`Error: ${err.message}`, { id: toastId })
  }
 }

 // --- LOGIC: Delete Student (Spam/Troll Cleanup) ---
 const handleConfirmDelete = async () => {
  if (!activeDeleteStudent) return;
  const studentId = activeDeleteStudent.id;
  const name = `${activeDeleteStudent.first_name} ${activeDeleteStudent.last_name}`;
  const toastId = toast.loading(`Purging ${name} from core...`)
  
  try {
   const result = await deleteApplicant(studentId);
   if (result.success) {
    // Remove from UI state immediately
    setStudents(prev => prev.filter(s => s.id !== studentId));
    
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('activity_logs').insert([{
      admin_id: user?.id,
      admin_name: user?.user_metadata?.full_name || 'Authorized Admin',
      action_type: 'DELETED',
      student_name: name,
      details: `Student record permanently purged from system.`
    }]);

    toast.success(`Record Erased: ${name}`, { id: toastId });
    setDeleteModalOpen(false);
    setActiveDeleteStudent(null);
   }
  } catch (err: any) {
   toast.error("Delete failed. Run SQL Policies.")
  }
 }

 // --- LOGIC: Bulk Operations ---
 const handleBulkAction = async (newStatus: string) => {
  const actionLabel = newStatus === 'Pending' ? "Resetting" : "Updating";
  const toastId = toast.loading(`${actionLabel} ${selectedIds.length} applicants...`)
  
  try {
   const { error } = await supabase.from('students').update({ 
    status: newStatus === 'Accepted' ? 'Approved' : newStatus,
    registrar_feedback: null 
   }).in('id', selectedIds)

   if (error) throw error
   
   const { data: { user } } = await supabase.auth.getUser();
   const selectedStudents = students.filter(s => selectedIds.includes(s.id));
   
   const logEntries = selectedStudents.map(s => ({
    admin_id: user?.id,
    admin_name: user?.user_metadata?.full_name || 'Authorized Admin',
    action_type: newStatus.toUpperCase(),
    student_name: `${s.first_name} ${s.last_name}`,
    student_id: s.id,
    student_image: s.two_by_two_url || s.profile_2x2_url,
    details: `Batch processing update to ${newStatus}`
   }));

   await supabase.from('activity_logs').insert(logEntries);

   setStudents(prev => prev.map(s => selectedIds.includes(s.id) ? { ...s, status: newStatus } : s))
   setSelectedIds([])
   toast.success(`Batch Process Complete: ${newStatus}`, { id: toastId })
  } catch (err: any) {
   toast.error("Bulk action failed", { id: toastId })
  }
 }

 const toggleSelect = (id: string) => {
  setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
 }

 const toggleSelectAll = () => {
  if (selectedIds.length === filteredStudents.length) setSelectedIds([])
  else setSelectedIds(filteredStudents.map(s => s.id))
 }

 const filteredStudents = students.filter(s => {
  const matchesStatus = s.status === filter || (filter === 'Accepted' && s.status === 'Approved');
  const matchesSearch = `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) || s.lrn.includes(searchTerm);
  return matchesStatus && matchesSearch;
 })

 const exportToCSV = () => {
  const headers = ["LRN", "Full Name", "Gender", "Strand", "GWA", "Status", "School Year"]
  const rows = filteredStudents.map(s => [
   s.lrn, `${s.first_name} ${s.last_name}`, s.gender, s.strand, s.gwa_grade_10, s.status, s.school_year
  ])
  const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `ACLC_Applicants_${filter}_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
 }

 if (loading && students.length === 0) return (
  <div className="h-screen flex flex-col items-center justify-center gap-4 text-slate-400">
   <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
   <p className="text-[10px] font-black uppercase tracking-widest text-center">Syncing Admissions Matrix...</p>
  </div>
 )

 return (
  <div className="space-y-8 p-8 animate-in fade-in duration-700 pb-32">
   {/* HEADER SECTION */}
   <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
    <div>
     <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-none uppercase">Admissions</h1>
     <p className="text-slate-500 font-medium italic mt-2 text-sm md:text-base">
      Registrar Verification Queue S.Y. {config?.school_year || "..."}
     </p>
    </div>
    
    <div className="flex items-center gap-3 w-full md:w-auto">
     <Button onClick={fetchStudents} variant="ghost" className="h-12 w-12 p-0 rounded-2xl text-slate-400 hover:text-blue-600 hover:bg-blue-50">
        <RefreshCw className={loading ? "animate-spin" : ""} size={20} />
     </Button>
     <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <Input 
       placeholder="Search LRN or Name..." 
       className="h-12 pl-10 w-full md:w-72 rounded-2xl bg-white shadow-sm border-none font-bold" 
       value={searchTerm}
       onChange={(e) => setSearchTerm(e.target.value)}
      />
     </div>
     <Button onClick={exportToCSV} className="h-12 px-6 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200">
      <FileDown className="mr-2" size={16} /> Export CSV
     </Button>
    </div>
   </div>

   {/* FILTER TABS */}
   <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-[24px] w-fit">
    {["Pending", "Accepted", "Rejected"].map((tab: any) => (
     <button
      key={tab}
      onClick={() => { setFilter(tab); setSelectedIds([]); }}
      className={`px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${
       filter === tab ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'
      }`}
     >
      {tab} ({students.filter(s => s.status === tab || (tab === 'Accepted' && s.status === 'Approved')).length})
     </button>
    ))}
   </div>

   {/* APPLICANT TABLE */}
   <div className="bg-white rounded-[48px] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100">
    <Table>
     <TableHeader className="bg-slate-50/50">
      <TableRow className="border-none">
       <TableHead className="w-12 pl-8">
        <button onClick={toggleSelectAll}>
         {selectedIds.length === filteredStudents.length && filteredStudents.length > 0 
          ? <CheckSquare className="text-blue-600" size={18} /> 
          : <Square className="text-slate-300" size={18} />
         }
        </button>
       </TableHead>
       <TableHead className="px-6 py-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Applicant Identity</TableHead>
       {/* NEW: GENDER CATEGORY */}
       <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center">Gender</TableHead>
       <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center">Strand</TableHead>
       <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center">GWA</TableHead>
       <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest text-slate-400">Actions</TableHead>
      </TableRow>
     </TableHeader>
     <TableBody>
      {filteredStudents.length === 0 ? (
       <TableRow><TableCell colSpan={6} className="py-32 text-center text-slate-400 italic">No applicants match this criteria.</TableCell></TableRow>
      ) : filteredStudents.map((student) => (
       <TableRow key={student.id} className={`transition-all border-b border-slate-50 group ${selectedIds.includes(student.id) ? 'bg-blue-50/30' : 'hover:bg-slate-50/80'}`}>
        <TableCell className="pl-8">
         <button onClick={() => toggleSelect(student.id)}>
          {selectedIds.includes(student.id) ? <CheckSquare className="text-blue-600" size={18} /> : <Square className="text-slate-200" size={18} />}
         </button>
        </TableCell>
        <TableCell className="px-6 py-5">
         <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden border-2 border-white shadow-sm shrink-0">
           <img 
            src={student.two_by_two_url || student.profile_2x2_url || student.profile_picture || "https://api.dicebear.com/7.x/initials/svg?seed=" + student.last_name} 
            alt="Avatar" 
            className="w-full h-full object-cover" 
           />
          </div>
          <div>
           <div className="font-black text-slate-900 uppercase tracking-tighter text-base leading-none">{student.first_name} {student.last_name}</div>
           <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">LRN: {student.lrn}</div>
          </div>
         </div>
        </TableCell>
        {/* GENDER COLUMN */}
        <TableCell className="text-center font-black text-[10px] uppercase text-slate-500">
            <span className={student.gender === 'Female' ? 'text-pink-500' : 'text-blue-500'}>{student.gender}</span>
        </TableCell>
        <TableCell className="text-center">
         <Badge className={`border-none px-3 py-1 text-[9px] font-black uppercase ${student.strand === 'ICT' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
          {student.strand}
         </Badge>
        </TableCell>
        <TableCell className="text-center font-black text-slate-900">{student.gwa_grade_10 || 'N/A'}</TableCell>
        <TableCell className="text-right px-8 space-x-2">
         <div className="flex items-center justify-end gap-2">
          <Dialog>
           <DialogTrigger asChild>
            <button className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center"><Eye size={18}/></button>
           </DialogTrigger>
           <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[48px] p-0 border-none shadow-2xl">
            <DialogHeader className="sr-only">
             <DialogTitle>Profile Detail: {student.first_name} {student.last_name}</DialogTitle>
             <DialogDescription>Verification matrix for applicant {student.lrn}</DialogDescription>
            </DialogHeader>
            <StudentDossier 
                student={student} 
                onOpenFile={(url, label) => {
                    setViewingFile({ url, label });
                    setRotation(0);
                    setViewerOpen(true);
                }}
            />
           </DialogContent>
          </Dialog>

          {student.status !== 'Pending' && (
           <Button onClick={() => handleStatusChange(student.id, `${student.first_name} ${student.last_name}`, 'Pending')} variant="outline" className="h-9 px-4 rounded-xl border-amber-100 bg-amber-50 text-amber-600 font-black text-[9px] uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all">
            <RotateCcw size={14} className="mr-2"/> Reset
           </Button>
          )}

          {student.status === 'Pending' && (
           <>
            <Button onClick={() => handleStatusChange(student.id, `${student.first_name} ${student.last_name}`, 'Accepted')} className="h-9 px-4 rounded-xl bg-green-500 hover:bg-green-600 text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-green-100">
             Approve
            </Button>
            <Button 
             onClick={() => {
              setActiveDeclineStudent(student);
              setDeclineModalOpen(true);
             }} 
             variant="ghost" 
             className="h-9 px-4 rounded-xl text-red-500 hover:bg-red-50 font-black text-[9px] uppercase tracking-widest"
            >
             Decline
            </Button>
           </>
          )}

          <Button 
           onClick={() => {
            setActiveDeleteStudent(student);
            setDeleteModalOpen(true);
           }} 
           variant="ghost" 
           className="h-9 w-9 p-0 rounded-xl text-slate-200 hover:text-red-600 hover:bg-red-50 transition-all flex items-center justify-center"
          >
           <Trash2 size={16}/>
          </Button>
         </div>
        </TableCell>
       </TableRow>
      ))}
     </TableBody>
    </Table>
   </div>

   {/* --- INTEGRATED HIGH-FIDELITY DOCUMENT VIEWER --- */}
   <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
    <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 rounded-[40px] overflow-hidden border-none shadow-2xl bg-slate-950/95 flex flex-col">
     {/* HEADER BAR (Prevents title overlap) */}
     <div className="p-6 bg-slate-900 border-b border-white/5 flex items-center justify-between shrink-0">
      <div>
       <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">Registrar Inspection Matrix</p>
       <DialogTitle className="text-white font-black uppercase text-xl leading-none">
        {viewingFile?.label}
       </DialogTitle>
       <DialogDescription className="hidden">High-resolution document view</DialogDescription>
      </div>
      <div className="flex gap-3">
       {/* ROTATE & DOWNLOAD TOOLS */}
       <Button variant="ghost" size="icon" onClick={() => setRotation(r => (r + 90) % 360)} className="rounded-full bg-white/10 hover:bg-white/20 text-white"><RotateCw size={20}/></Button>
       <Button variant="ghost" size="icon" onClick={() => window.open(viewingFile?.url, '_blank')} className="rounded-full bg-white/10 hover:bg-white/20 text-white"><Download size={20}/></Button>
       <Button variant="ghost" size="icon" onClick={() => setViewerOpen(false)} className="rounded-full bg-red-500 hover:bg-red-600 text-white"><X size={20}/></Button>
      </div>
     </div>

     {/* INSPECTION AREA */}
     <div className="flex-1 w-full flex items-center justify-center p-12 overflow-auto custom-scrollbar">
      {viewingFile?.url.toLowerCase().endsWith('.pdf') ? (
       <iframe src={viewingFile.url} className="w-full h-full rounded-2xl bg-white border-none" title="PDF Viewer" />
      ) : (
       <div className="relative group cursor-zoom-in transition-transform duration-300" style={{ transform: `rotate(${rotation}deg)` }}>
        <img src={viewingFile?.url} alt="Inspection" className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-500" />
       </div>
      )}
     </div>
     
     <div className="p-6 bg-slate-900/50 backdrop-blur-xl border-t border-white/5 flex items-center justify-center shrink-0">
       <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-slate-400 uppercase font-black text-[9px] tracking-widest"><Maximize2 size={12}/> Document Render: Active</div>
        <div className="w-[1px] h-4 bg-white/10" />
        <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest italic text-center">Rotate or Download for secondary inspection tools</p>
       </div>
     </div>
    </DialogContent>
   </Dialog>

   {/* --- MODAL: DECLINE --- */}
   <Dialog open={declineModalOpen} onOpenChange={setDeclineModalOpen}>
    <DialogContent className="rounded-[32px] max-w-md p-0 overflow-hidden border-none shadow-2xl">
     <div className="bg-red-600 p-8 flex items-center gap-4 text-white">
      <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center"><AlertTriangle size={24} /></div>
      <div><DialogTitle className="text-xl font-black uppercase tracking-tight leading-none">Admission Rejection</DialogTitle><DialogDescription className="text-white/60 text-xs mt-1 font-medium italic">Record why this student was declined.</DialogDescription></div>
     </div>
     <div className="p-8 space-y-6 bg-white">
      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
       <div className="h-10 w-10 rounded-xl bg-slate-200 overflow-hidden shrink-0"><img src={activeDeclineStudent?.two_by_two_url || activeDeclineStudent?.profile_2x2_url || activeDeclineStudent?.profile_picture} className="w-full h-full object-cover" /></div>
       <div className="flex flex-col"><span className="text-xs font-black text-slate-900 uppercase leading-none">{activeDeclineStudent?.first_name} {activeDeclineStudent?.last_name}</span><span className="text-[10px] font-bold text-slate-400 mt-1">LRN: {activeDeclineStudent?.lrn}</span></div>
      </div>
      <div className="space-y-4">
       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Quick Reasons</label>
       <div className="flex flex-wrap gap-2">{QUICK_REASONS.map(reason => (<button key={reason} onClick={() => setDeclineReason(reason)} className="px-3 py-1.5 rounded-lg border border-slate-100 bg-slate-50 text-[9px] font-bold uppercase text-slate-500 hover:border-red-200 hover:text-red-600 transition-all">{reason}</button>))}</div>
       <div className="pt-2"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Registrar Feedback</label><Textarea placeholder="Provide specific feedback..." className="min-h-[100px] mt-2 rounded-2xl border-slate-100 bg-slate-50 focus:ring-red-600 font-bold text-sm resize-none" value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} /></div>
      </div>
      <DialogFooter className="flex-col gap-2 sm:flex-col"><Button onClick={() => handleStatusChange(activeDeclineStudent.id, `${activeDeclineStudent.first_name} ${activeDeclineStudent.last_name}`, 'Rejected', declineReason || "Incomplete requirements.")} className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-100">Confirm Rejection</Button><Button variant="ghost" onClick={() => setDeclineModalOpen(false)} className="w-full h-12 rounded-2xl text-slate-400 font-black uppercase text-[10px]">Cancel</Button></DialogFooter>
     </div>
    </DialogContent>
   </Dialog>

   {/* --- MODAL: DELETE --- */}
   <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
    <DialogContent className="rounded-[32px] max-w-md p-0 overflow-hidden border-none shadow-2xl">
     <div className="bg-slate-950 p-8 flex items-center gap-4 text-white border-b border-white/5">
      <div className="h-12 w-12 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/20"><XCircle size={24} /></div>
      <div><DialogTitle className="text-xl font-black uppercase tracking-tight leading-none">Record Deletion</DialogTitle><DialogDescription className="text-slate-500 text-xs mt-1 font-medium italic">This action is irreversible.</DialogDescription></div>
     </div>
     <div className="p-8 space-y-6 bg-white text-center">
      <div className="p-6 bg-red-50 rounded-[32px] border border-red-100">
       <p className="text-sm font-bold text-red-900 leading-relaxed text-center">Are you sure you want to permanently erase <br/><span className="underline decoration-2 underline-offset-4">{activeDeleteStudent?.first_name} {activeDeleteStudent?.last_name}</span>?</p>
       <p className="text-[10px] font-black uppercase text-red-400 mt-2 tracking-widest leading-relaxed">This will purge all documents and database entries.</p>
      </div>
      <DialogFooter className="flex-col gap-2 sm:flex-col"><Button onClick={handleConfirmDelete} className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-red-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl transition-all">Delete Permanently</Button><Button variant="ghost" onClick={() => setDeleteModalOpen(false)} className="w-full h-12 rounded-2xl text-slate-400 font-black uppercase text-[10px]">Cancel</Button></DialogFooter>
     </div>
    </DialogContent>
   </Dialog>

   {/* FLOATING BULK ACTIONS BAR */}
   {selectedIds.length > 0 && (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-500">
     <div className="bg-slate-900 text-white px-8 py-4 rounded-[32px] shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-xl">
      <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Batch Matrix control</span><span className="text-sm font-black tracking-tight">{selectedIds.length} Selected</span></div>
      <div className="h-8 w-[1px] bg-white/10" /><div className="flex items-center gap-2"><Button onClick={() => handleBulkAction('Accepted')} className="bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase h-11 px-6"><CheckCircle2 size={16} className="mr-2"/> Mass Approve</Button><Button onClick={() => handleBulkAction('Pending')} className="bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-[10px] uppercase h-11 px-6"><ListRestart size={16} className="mr-2"/> Reset to Pending</Button><Button onClick={() => handleBulkAction('Rejected')} className="bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase h-11 px-6"><XCircle size={16} className="mr-2"/> Mass Reject</Button><Button onClick={() => setSelectedIds([])} variant="ghost" className="text-slate-400 hover:text-white font-black text-[10px] uppercase">Cancel</Button></div>
     </div>
    </div>
   )}
  </div>
 )
}

function StudentDossier({ student, onOpenFile }: { student: any, onOpenFile: (url: string, label: string) => void }) {
 const isJHS = student.student_category?.toLowerCase().includes("jhs") || student.student_category === "Standard";
 const isALS = student.student_category?.toLowerCase().includes("als");

 return (
  <div className="flex flex-col bg-white">
   <div className="bg-slate-900 p-10 flex flex-col items-center text-center relative overflow-hidden">
    <div className="absolute top-0 right-0 p-8 flex flex-col gap-2 items-end">
     <Badge className="bg-blue-600 text-[10px] font-black px-4 py-2 uppercase tracking-widest border-none">{student.student_category || "Standard"}</Badge>
     <Badge variant="outline" className="text-slate-400 border-slate-700 text-[9px] uppercase font-bold">{student.school_year}</Badge>
    </div>
    <div className="relative z-10 mb-6">
     <div className="w-44 h-44 bg-slate-800 rounded-3xl border-4 border-white/10 overflow-hidden shadow-2xl flex items-center justify-center cursor-zoom-in group" onClick={() => onOpenFile(student.two_by_two_url || student.profile_2x2_url || student.profile_picture, "Applicant 2x2 Image")}>
      {student.two_by_two_url || student.profile_2x2_url || student.profile_picture ? (<img src={student.two_by_two_url || student.profile_2x2_url || student.profile_picture} alt="2x2" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />) : (<div className="flex flex-col items-center text-slate-500"><User size={48} strokeWidth={1} /><p className="text-[8px] font-bold uppercase mt-2">No Photo Provided</p></div>)}
     </div>
    </div>
    <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">{student.first_name} {student.last_name}</h2>
    <p className="text-blue-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3">LRN: {student.lrn}</p>
    <StatusBadge status={student.status} />
   </div>

   <div className="p-10 space-y-12">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 text-sm">
     <div className="space-y-6">
      <h3 className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-3 border-slate-100"><User size={14} className="text-blue-500" /> Personal Identity</h3>
      <div className="grid grid-cols-2 gap-y-6">
       {/* SEPARATED NAMES AS REQUESTED */}
       <InfoBlock label="First Name" value={student.first_name} />
       <InfoBlock label="Middle Name" value={student.middle_name || "N/A"} />
       <InfoBlock label="Last Name" value={student.last_name} />
       <InfoBlock label="Full Name" value={`${student.first_name} ${student.middle_name || ''} ${student.last_name}`} />
       
       <InfoBlock label="Gender" value={student.gender} />
       <InfoBlock label="Age" value={student.age?.toString()} />
       <InfoBlock label="Birth Date" value={student.birth_date} />
       <InfoBlock label="Civil Status" value={student.civil_status} />
       <InfoBlock label="Religion" value={student.religion} />
       <div className="col-span-2"><InfoBlock label="Home Address" value={student.address} icon={<MapPin size={10} />} /></div>
      </div>
     </div>
     <div className="space-y-6">
      <h3 className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-3 border-slate-100"><Mail size={14} className="text-indigo-500" /> Communication</h3>
      <div className="space-y-6"><InfoBlock label="Email Address" value={student.email} icon={<Mail size={10} />} /><InfoBlock label="Student Phone" value={student.phone || student.contact_no} icon={<Phone size={10} />} /><div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Database ID</p><p className="text-[10px] font-bold text-slate-900 truncate">{student.id}</p></div></div>
     </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 text-sm">
     <div className="space-y-6">
      <h3 className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-3 border-slate-100"><ShieldCheck size={14} className="text-emerald-500" /> Guardian Matrix</h3>
      <div className="space-y-4"><InfoBlock label="Full Guardian Name" value={`${student.guardian_first_name || student.guardian_name || ''} ${student.guardian_last_name || ''}`} /><InfoBlock label="Guardian Contact" value={student.guardian_phone || student.guardian_contact} icon={<Phone size={10} />} /></div>
     </div>
     <div className="space-y-6">
      <h3 className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-3 border-slate-100"><GraduationCap size={14} className="text-orange-500" /> Academic Standing</h3>
      <div className="grid grid-cols-2 gap-4"><div className="col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-100"><p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Origin School</p><p className="font-black text-slate-900 uppercase text-xs">{student.last_school_attended || "Not Provided"}</p></div><div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center"><p className="text-[9px] font-bold text-blue-400 uppercase mb-1">GWA Matrix</p><p className="text-2xl font-black text-blue-600">{student.gwa_grade_10 || "0.0"}</p></div><div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center"><p className="text-[9px] font-bold text-orange-400 uppercase mb-1">Target Strand</p><p className="text-2xl font-black text-orange-600">{student.strand}</p></div></div>
     </div>
    </div>

    <div className="space-y-6 pb-8">
     <h3 className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-3 border-slate-100"><ScrollText size={14} className="text-blue-500" /> Registrar Credential Check</h3>
     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {isJHS && (<><CredentialCard label="Form 138" url={student.form_138_url} onOpen={onOpenFile} /><CredentialCard label="Good Moral" url={student.good_moral_url} onOpen={onOpenFile} /></>)}
      {isALS && (<><CredentialCard label="ALS COR Rating" url={student.cor_url} onOpen={onOpenFile} /><CredentialCard label="Diploma" url={student.diploma_url} onOpen={onOpenFile} /><CredentialCard label="AF5 Form" url={student.af5_url} onOpen={onOpenFile} /></>)}
      {!isJHS && !isALS && (<div className="col-span-full p-6 bg-amber-50 border border-amber-100 rounded-3xl text-center"><p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Unknown Category: Manual Verification Required</p></div>)}
     </div>
    </div>
   </div>
  </div>
 )
}

function InfoBlock({ label, value, icon }: { label: string, value: string, icon?: React.ReactNode }) {
 return (<div><p className="text-slate-400 text-[9px] uppercase font-black tracking-[0.2em] mb-1">{label}</p><p className="text-slate-900 font-bold flex items-center gap-2 text-sm">{icon}{value || "NOT PROVIDED"}</p></div>)
}

function CredentialCard({ label, url, onOpen }: { label: string, url: string, onOpen: (url: string, label: string) => void }) {
 if (!url) return (<div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center opacity-50 h-32"><FileText className="text-slate-300 mb-2" size={24} /><p className="text-[8px] font-black text-center uppercase text-slate-400 tracking-widest">{label}</p></div>);
 return (
  <div onClick={() => onOpen(url, label)} className="cursor-pointer group">
   <div className="bg-white p-2 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xl transition-all h-full relative">
    <div className="h-28 rounded-xl overflow-hidden bg-slate-100 relative">
     {url.toLowerCase().endsWith('.pdf') ? (<div className="w-full h-full flex flex-col items-center justify-center bg-slate-200"><FileText size={32} className="text-slate-400" /><p className="text-[8px] font-black uppercase text-slate-500 mt-2">PDF Document</p></div>) : (<img src={url} alt={label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />)}
     <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><ZoomIn className="text-white" size={20} /></div>
    </div>
    <p className="text-[9px] font-black text-center mt-3 uppercase text-slate-900 tracking-widest leading-tight">{label}</p>
   </div>
  </div>
 )
}

function StatusBadge({ status }: { status: string }) {
 const styles: any = { Pending: "bg-amber-100/20 text-amber-500 border-amber-200/30", Accepted: "bg-green-100/20 text-green-500 border-green-200/30", Approved: "bg-green-100/20 text-green-500 border-green-200/30", Rejected: "bg-red-100/20 text-red-500 border-red-200/30" }
 return (<div className={`mt-6 px-6 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.3em] w-fit shadow-sm ${styles[status]}`}>{status === 'Approved' ? 'Accepted' : status}</div>)
}