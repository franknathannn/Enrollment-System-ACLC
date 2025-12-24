"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { getDashboardStats } from "@/lib/actions/dashboard"
import { supabase } from "@/lib/supabase/client"
import { getEnrollmentStatus } from "@/lib/actions/settings"
import { recordYearlySnapshot, getEnrollmentHistory, deleteSnapshot } from "@/lib/actions/history" 
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from "recharts"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { 
  Table, TableBody, TableCell, TableRow, TableHeader, TableHead 
} from "@/components/ui/table"
import { 
  Users, Cpu, BookText, Clock, ArrowUpRight, TrendingUp,
  Loader2, GraduationCap, TrendingDown, Target, User,
  History, CheckCircle2, Trash2, Zap, 
  PieChart as PieIcon, Activity,
  UserCircle2, ChevronRight, Calendar,
  Trophy, Timer, AlertTriangle, FileDown, Banknote, Landmark
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { format, subDays, isSameDay, parseISO } from "date-fns"

export default function AdminDashboard() {
  const [config, setConfig] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([]) 
  const [students, setStudents] = useState<any[]>([]) 
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCapturing, setIsCapturing] = useState(false)
  
  // Verification Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [snapshotToDelete, setSnapshotToDelete] = useState<{id: string, year: string} | null>(null)

  const [stats, setStats] = useState({
    totalAccepted: 0,
    ictAccepted: 0,
    gasAccepted: 0,
    pending: 0,
    males: 0,
    females: 0
  })
  
  const [system, setSystem] = useState({
    currentCount: 0,
    capacity: 1000 
  })

  const loadData = useCallback(async () => {
    try {
      const { data: configData } = await supabase.from('system_config').select('*').single()
      setConfig(configData)

      const [statsData, systemData, historyData, studentsRes, logsRes] = await Promise.all([
        getDashboardStats(),
        getEnrollmentStatus(),
        getEnrollmentHistory(),
        supabase.from('students').select('*').order('created_at', { ascending: false }),
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(6)
      ])
      
      if (historyData) setHistory(historyData)
        if (statsData) {
          setStats({
            totalAccepted: statsData.totalAccepted ?? 0,
            ictAccepted: statsData.ictAccepted ?? 0,
            gasAccepted: statsData.gasAccepted ?? 0,
            pending: statsData.pending ?? 0,
            males: statsData.males ?? 0,
            females: statsData.females ?? 0,
          })
        }
      if (studentsRes.data) setStudents(studentsRes.data)
      if (logsRes.data) setLogs(logsRes.data)

      if (systemData) {
        setSystem({
          currentCount: systemData.currentCount ?? 0,
          capacity: systemData.capacity ?? 1000
        })
      }
    } catch (error) {
      toast.error("Matrix Sync Failure.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const channel = supabase.channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadData])

  // --- GROWTH COMPARISON & BASELINE LOGIC ---
  const comparison = useMemo(() => {
    if (history.length === 0) return { diff: 0, status: 'baseline' };
    const latestSnapshot = history[0]; // Assuming history is sorted by date DESC
    const prevTotal = latestSnapshot.male_total + latestSnapshot.female_total;
    if (prevTotal === 0) return { diff: 0, status: 'baseline' };
    
    const diff = ((stats.totalAccepted - prevTotal) / prevTotal) * 100;
    return {
      percent: Math.abs(diff).toFixed(1),
      status: diff >= 0 ? 'growth' : 'decline',
      prevYear: latestSnapshot.school_year
    };
  }, [history, stats.totalAccepted]);

  // --- REVENUE MATRIX (DATABASE DRIVEN) ---
  const revenueMatrix = useMemo(() => {
    const dynamicVoucher = config?.voucher_value ?? 0;
    const qualifiedStudents = students.filter(s => 
      (s.status === 'Accepted' || s.status === 'Approved') && 
      (s.student_category?.toLowerCase().includes("jhs") || s.student_category === "Standard")
    );
    const qualifiedICT = qualifiedStudents.filter(s => s.strand === 'ICT').length;
    const qualifiedGAS = qualifiedStudents.filter(s => s.strand === 'GAS').length;
    const currentRevenue = qualifiedStudents.length * dynamicVoucher;
    const totalPotential = system.capacity * dynamicVoucher;
    const fundingProgress = totalPotential > 0 ? (currentRevenue / totalPotential) * 100 : 0;
    return { currentRevenue, totalPotential, fundingProgress, qualifiedICT, qualifiedGAS, voucherLabel: dynamicVoucher };
  }, [students, system.capacity, config]);

  const trendData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }).map((_, i) => {
      const date = subDays(new Date(), i);
      return { date: format(date, 'MMM dd'), fullDate: date, count: 0 };
    }).reverse();
    students.forEach(student => {
      const studentDate = parseISO(student.created_at);
      const match = last30Days.find(d => isSameDay(d.fullDate, studentDate));
      if (match) match.count += 1;
    });
    return last30Days;
  }, [students]);

  const prediction = useMemo(() => {
    const totalNewStudents = trendData.reduce((acc, curr) => acc + curr.count, 0);
    const dailyVelocity = totalNewStudents / 30; 
    const remainingSlots = system.capacity - stats.totalAccepted;
    if (dailyVelocity <= 0) return { days: null, speed: 0 };
    const daysRemaining = Math.ceil(remainingSlots / dailyVelocity);
    return { days: daysRemaining > 365 ? '> 1 Year' : daysRemaining, speed: dailyVelocity.toFixed(2) };
  }, [trendData, system.capacity, stats.totalAccepted]);

  const topJHSLeaders = useMemo(() => {
    return students
      .filter(s => s.gwa_grade_10 > 0 && (s.student_category?.toLowerCase().includes("jhs") || s.student_category === "Standard"))
      .sort((a, b) => b.gwa_grade_10 - a.gwa_grade_10)
      .slice(0, 10);
  }, [students]);

  const pieData = useMemo(() => [
    { name: 'ICT Division', value: stats.ictAccepted, color: '#2563eb' },
    { name: 'GAS Division', value: stats.gasAccepted, color: '#f97316' }
  ], [stats.ictAccepted, stats.gasAccepted]);

  const capacityPercentage = useMemo(() => Math.min((stats.totalAccepted / system.capacity) * 100, 100), [stats.totalAccepted, system.capacity]);

  // ACTIONS
  const handleCaptureSnapshot = async () => {
    const activeYear = config?.school_year || ""; 
    if (!activeYear) return toast.error("School Year is UNSET.");
    setIsCapturing(true)
    try {
      const res = await recordYearlySnapshot(activeYear, stats.males, stats.females)
      if (res.success) { loadData(); toast.success(`Matrix Upserted: S.Y. ${activeYear}`); }
    } catch (error: any) { toast.error("Sync Failed.") }
    finally { setIsCapturing(false) }
  }

  const confirmDelete = async () => {
    if (!snapshotToDelete) return;
    try {
      const res = await deleteSnapshot(snapshotToDelete.id)
      if (res.success) {
        setHistory(prev => prev.filter(item => item.id !== snapshotToDelete.id))
        toast.success(`Purged Archive: ${snapshotToDelete.year}`)
      }
    } catch (error) { toast.error("Purge Failed.") }
    finally { setIsDeleteModalOpen(false); setSnapshotToDelete(null); }
  }

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 text-slate-400">
      <Loader2 className="animate-spin text-blue-600 w-12 h-12" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em]">Calibrating Matrix...</p>
    </div>
  )

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20 p-8">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <h1 className="text-6xl font-black tracking-tighter text-slate-900 leading-none uppercase">Overview</h1>
             {comparison.status !== 'baseline' && (
               <Badge className={`px-4 py-1.5 rounded-xl font-black text-[10px] mt-2 ${comparison.status === 'growth' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                 {comparison.status === 'growth' ? <TrendingUp size={12} className="mr-1 inline"/> : <TrendingDown size={12} className="mr-1 inline"/>}
                 {comparison.percent}% VS BASELINE
               </Badge>
             )}
          </div>
          <p className="text-slate-500 font-medium italic">Command Center: S.Y. {config?.school_year || "UNSET"} Cycle.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
            <Button onClick={handleCaptureSnapshot} disabled={isCapturing} variant="outline" className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase border-slate-200 hover:bg-slate-900 hover:text-white transition-all shadow-xl">
              {isCapturing ? <Loader2 className="animate-spin mr-2"/> : <History className="mr-2" size={16} />} Sync Matrix
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase border-slate-200 hover:bg-blue-600 hover:text-white transition-all shadow-xl shadow-blue-100">
                   <Activity className="mr-2" size={16} /> Archives
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl rounded-[48px] p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-10 bg-slate-900 text-white">
                  <DialogTitle className="text-3xl font-black uppercase">Institutional Archives</DialogTitle>
                  <DialogDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Historical Snapshots & Baseline Matrix</DialogDescription>
                </DialogHeader>
                <div className="p-10 bg-white max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-none hover:bg-transparent">
                        <TableHead className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">School Year</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center">Males</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center">Females</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center">Total</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((record, idx) => (
                        <TableRow key={record.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all">
                          <TableCell className="py-6 px-6 font-black text-slate-900 uppercase">
                            {record.school_year} {idx === 0 && <Badge className="ml-2 bg-blue-50 text-blue-600 border-none text-[8px]">BASELINE</Badge>}
                          </TableCell>
                          <TableCell className="text-center font-bold text-blue-600">{record.male_total}</TableCell>
                          <TableCell className="text-center font-bold text-pink-500">{record.female_total}</TableCell>
                          <TableCell className="text-center font-black text-lg">{record.male_total + record.female_total}</TableCell>
                          <TableCell className="text-right px-6">
                            {/* TRASH ICON VISIBLE */}
                            <button onClick={() => { setSnapshotToDelete({id: record.id, year: record.school_year}); setIsDeleteModalOpen(true); }} className="p-3 text-red-400 hover:text-red-700 transition-all">
                              <Trash2 size={18} />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </DialogContent>
            </Dialog>

            <Button onClick={() => window.print()} variant="outline" className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase border-slate-200 hover:bg-blue-600 hover:text-white transition-all shadow-xl">
               <FileDown className="mr-2" size={16} /> Print Report
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <MetricCard label="Male Student Census" value={stats.males} color="bg-blue-600" icon={<User size={48}/>} />
          <MetricCard label="Female Student Census" value={stats.females} color="bg-pink-500" icon={<UserCircle2 size={48}/>} />
      </div>

      <Card className="p-10 rounded-[56px] border-none shadow-2xl shadow-slate-200/50 bg-white relative overflow-hidden">
         <div className="flex justify-between items-start mb-10">
            <div>
               <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3"><Calendar className="text-blue-600" /> Enrollment Velocity</h3>
               <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">30-Day Registration Matrix</p>
            </div>
            <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[9px] uppercase px-4 py-2">LIVE DATA FEED</Badge>
         </div>
         <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={trendData}>
                  <defs>
                     <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                     </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: '900', fontSize: '10px' }} />
                  <Area type="monotone" dataKey="count" name="Applicants" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorIn)" animationDuration={3000} />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 p-12 rounded-[56px] bg-white border-none shadow-2xl shadow-slate-200/50 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity"><Banknote size={120} className="text-emerald-600" /></div>
             <div className="relative z-10 space-y-10">
                <div className="flex justify-between items-start">
                   <div>
                      <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3"><Landmark className="text-emerald-500" /> Revenue Matrix</h3>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Institutional Engine (₱{revenueMatrix.voucherLabel.toLocaleString()} / Stud)</p>
                   </div>
                   <div className="text-right">
                      <p className="text-5xl font-black text-emerald-600 tracking-tighter">₱{revenueMatrix.currentRevenue.toLocaleString()}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">Total Active Funding</p>
                   </div>
                </div>
                <div className="space-y-4">
                   <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <span>Liquidity Progress</span>
                      <span>Target: ₱{(revenueMatrix.totalPotential / 1000000).toFixed(1)}M (Campus Cap)</span>
                   </div>
                   <div className="h-5 w-full bg-slate-50 rounded-2xl overflow-hidden p-1 shadow-inner">
                      <div className="h-full bg-emerald-500 rounded-xl transition-all duration-1000 shadow-[0_0_20px_rgba(16,185,129,0.3)]" style={{ width: `${revenueMatrix.fundingProgress}%` }} />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-10 pt-4 border-t border-slate-50">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ICT Revenue contribution</p>
                      <p className="text-2xl font-black text-slate-900">₱{(revenueMatrix.qualifiedICT * revenueMatrix.voucherLabel).toLocaleString()}</p>
                   </div>
                   <div className="space-y-2 text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GAS Revenue contribution</p>
                      <p className="text-2xl font-black text-slate-900">₱{(revenueMatrix.qualifiedGAS * revenueMatrix.voucherLabel).toLocaleString()}</p>
                   </div>
                </div>
             </div>
          </Card>

          <Card className="p-10 rounded-[56px] bg-slate-900 text-white relative overflow-hidden flex flex-col justify-between">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl rounded-full -mr-10 -mt-10" />
             <div className="relative z-10 space-y-8">
                <h3 className="text-lg font-black uppercase tracking-widest text-blue-400 flex items-center gap-2"><Timer size={20} /> Saturation Forecast</h3>
                <div>
                   <p className="text-7xl font-black tracking-tighter leading-none">{prediction.days || '--'}</p>
                   <p className="text-sm font-black uppercase tracking-widest mt-4 text-slate-400 italic">Estimated Days to 100% based on {prediction.speed} intakes/day.</p>
                </div>
             </div>
             <div className="relative z-10 bg-white/5 p-6 rounded-3xl border border-white/10 mt-6">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-2">Baseline comparison</p>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">System is performing at {comparison.percent}% efficiency vs {comparison.prevYear || 'baseline'}.</p>
             </div>
          </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <Card className="p-12 rounded-[56px] border-none shadow-2xl shadow-slate-200/50 bg-white relative overflow-hidden group">
            <div className="relative z-10 space-y-10">
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Campus Capacity Status</p>
                  <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">Saturation: {capacityPercentage.toFixed(1)}%</h2>
                </div>
                <Badge className={`px-4 py-2 rounded-full font-black text-[10px] uppercase shadow-lg ${capacityPercentage > 90 ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}>{capacityPercentage > 90 ? 'Critical' : 'Operational'}</Badge>
              </div>
              <div className="space-y-6">
                <div className="h-6 w-full bg-slate-100 rounded-3xl overflow-hidden p-1.5 shadow-inner">
                  <div className={`h-full transition-all duration-1000 ease-out rounded-2xl ${capacityPercentage > 90 ? 'bg-red-500' : capacityPercentage > 75 ? 'bg-orange-500' : 'bg-blue-600'}`} style={{ width: `${capacityPercentage}%` }} />
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                   <span>{stats.totalAccepted} Students Handled</span>
                   <span>System Capacity: {system.capacity}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-[56px] border-none shadow-2xl shadow-slate-200/50 bg-white overflow-hidden">
             <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-yellow-500 rounded-2xl text-white shadow-lg"><Trophy size={20} /></div>
                   <div><h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Academic Leaders</h3><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">JHS Excellence Matrix</p></div>
                </div>
                <Badge className="bg-slate-900 text-white border-none font-black text-[9px] uppercase px-4 py-2">Top 10</Badge>
             </div>
             <Table className="border-separate border-spacing-y-4 px-6">
                <TableBody>
                   {topJHSLeaders.map((s, idx) => (
                      <TableRow key={s.id} className="hover:bg-slate-50 transition-all group relative">
                         <TableCell className="px-10 py-6 min-w-[300px] relative">
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${s.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'}`} />
                            <div className="flex items-center gap-5 pl-2">
                               <span className="text-xs font-black text-slate-300 w-6">#{idx + 1}</span>
                               <div>
                                  <p className="font-black text-slate-900 uppercase text-xs">{s.last_name}, {s.first_name}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.strand} Matrix</p>
                               </div>
                            </div>
                         </TableCell>
                         <TableCell className="text-center"><Badge variant="outline" className="border-slate-100 bg-slate-50 text-slate-600 font-black text-[10px] px-5 py-1.5 rounded-full">{s.gwa_grade_10} GWA</Badge></TableCell>
                         <TableCell className="text-right px-10"><Link href="/admin/sections"><button className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><ChevronRight size={18}/></button></Link></TableCell>
                      </TableRow>
                   ))}
                </TableBody>
             </Table>
          </Card>
        </div>

        <Card className="rounded-[56px] border-none shadow-2xl shadow-slate-200/50 bg-white p-10 relative overflow-hidden flex flex-col justify-between">
           <div>
              <div className="flex items-center gap-3 mb-8">
                 <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg"><PieIcon size={20} /></div>
                 <div><h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Strand Ratio</h3><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Composition Share</p></div>
              </div>
              <div className="h-[280px] w-full relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={10} dataKey="value" animationDuration={1500}>
                          {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />)}
                       </Pie>
                       <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px rgba(0,0,0,0.1)', fontWeight: '900', fontSize: '10px' }} />
                    </PieChart>
                 </ResponsiveContainer>
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <p className="text-3xl font-black text-slate-900 leading-none">{stats.totalAccepted}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Active</p>
                 </div>
              </div>
           </div>
           <div className="space-y-4 mt-8 px-2">
              {pieData.map((item) => (
                 <div key={item.name} className="flex justify-between items-center p-5 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-slate-900 hover:text-white transition-all cursor-default">
                    <div className="flex items-center gap-4">
                       <div className="h-3 w-3 rounded-full shadow-lg" style={{ backgroundColor: item.color }} />
                       <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">{item.name}</span>
                    </div>
                    <span className="text-lg font-black text-slate-900 group-hover:text-blue-400">{item.value}</span>
                 </div>
              ))}
           </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <StatCard title="Total Registry" value={stats.totalAccepted} icon={<CheckCircle2 />} color="text-emerald-600" bg="bg-emerald-50" trend="Registry Sync" />
        <StatCard title="ICT Division" value={stats.ictAccepted} icon={<Cpu />} color="text-indigo-600" bg="bg-indigo-50" trend="Active Matrix" />
        <StatCard title="GAS Division" value={stats.gasAccepted} icon={<BookText />} color="text-orange-600" bg="bg-orange-50" trend="Active Matrix" />
        <StatCard title="Review Queue" value={stats.pending} icon={<Clock />} color="text-amber-600" bg="bg-amber-50" trend="Live Intake" />
      </div>

      {/* --- DELETE VERIFICATION MODAL --- */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md rounded-[40px] p-10 border-none shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center animate-bounce">
              <AlertTriangle size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Confirm Purge</h3>
              <p className="text-slate-400 text-sm font-medium">Are you sure you want to permanently delete the archived matrix for <span className="font-black text-slate-900 uppercase">S.Y. {snapshotToDelete?.year}</span>? This action is irreversible.</p>
            </div>
            <div className="flex gap-3 w-full">
              <Button onClick={() => setIsDeleteModalOpen(false)} variant="outline" className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase">Cancel</Button>
              <Button onClick={confirmDelete} className="flex-1 h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase shadow-lg shadow-red-100">Purge Record</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}

function MetricCard({ label, value, color, icon }: any) {
  return (
    <Card className={`p-10 rounded-[56px] ${color} text-white flex justify-between items-center shadow-2xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-500`}>
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 blur-[80px] rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
      <div className="relative z-10">
        <p className="text-[11px] font-black uppercase opacity-60 tracking-[0.3em] mb-2">{label}</p>
        <h3 className="text-7xl font-black tracking-tighter leading-none">{value}</h3>
      </div>
      <div className="w-24 h-24 bg-white/10 rounded-[40px] flex items-center justify-center group-hover:scale-110 transition-transform relative z-10 shadow-lg backdrop-blur-md border border-white/10">{icon}</div>
    </Card>
  )
}

function StatCard({ title, value, icon, color, bg, trend }: any) {
  return (
    <Card className="p-10 rounded-[48px] border-none shadow-sm bg-white flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all h-full group">
      <div className="space-y-6">
        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl ${bg} ${color} transition-transform group-hover:rotate-6 shadow-lg shadow-slate-100`}>{icon}</div>
        <div>
          <p className="text-5xl font-black text-slate-900 tracking-tighter leading-none">{value?.toLocaleString() ?? 0}</p>
          <p className="text-[11px] font-black text-slate-400 uppercase mt-4">{title}</p>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
         <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{trend}</span>
         <ArrowUpRight size={14} className="text-slate-200 group-hover:text-blue-500 transition-colors" />
      </div>
    </Card>
  )
}