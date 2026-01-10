"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { recordYearlySnapshot, deleteSnapshot } from "@/lib/actions/history" 
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, Loader2, TrendingDown, History, FileDown, Users
} from "lucide-react"
import { toast } from "sonner"
import { format, subDays, isSameDay, parseISO } from "date-fns"
import { ThemedText } from "@/components/ThemedText"
import { useTheme } from "@/hooks/useTheme"
import { useRouter } from "next/navigation"
import { AnimatedNumber, MetricCard } from "./components/primitives"
import { OverviewGrid, CensusGrid, VelocitySection, SpikeAnalyticsSection, RevenueSection, CapacitySection } from "./components/sections"
import { ArchivesManager } from "./components/ArchivesManager"

export default function AdminDashboard() {
  const { isDarkMode: themeDarkMode, mounted } = useTheme()
  const [isDarkMode, setIsDarkMode] = useState(themeDarkMode)
  const router = useRouter()
  const [config, setConfig] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([]) 
  const [students, setStudents] = useState<any[]>([]) 
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCapturing, setIsCapturing] = useState(false)

  const [stats, setStats] = useState({
    totalAccepted: 0,
    ictAccepted: 0,
    gasAccepted: 0,
    pending: 0,
    ictDeclined: 0,
    gasDeclined: 0,
    declinedTotal: 0,
    males: 0,
    females: 0,
    pendingMales: 0,
    pendingFemales: 0
  })
  
  const [system, setSystem] = useState({
    currentCount: 0,
    capacity: 1000 
  })

  // Sync with hook on mount/update
  useEffect(() => {
    setIsDarkMode(themeDarkMode)
  }, [themeDarkMode])

  // Listen for manual layout toggles for live updates
  useEffect(() => {
    const handleThemeChange = (e: any) => {
      setIsDarkMode(e.detail.mode === 'dark')
    }
    window.addEventListener('theme-change', handleThemeChange)
    return () => window.removeEventListener('theme-change', handleThemeChange)
  }, [])

  // OPTIMIZED: Separated background updates from initial load
  const fetchStudents = useCallback(async (isBackground = false) => {
    try {
      const [studentsRes, configRes, sectionsRes, historyRes] = await Promise.all([
        supabase.from('students').select('id,first_name,last_name,gender,strand,status,student_category,gwa_grade_10,created_at').order('created_at', { ascending: false }),
        supabase.from('system_config').select('*').single(),
        supabase.from('sections').select('capacity'),
        supabase.from('enrollment_history').select('*').order('school_year', { ascending: false })
      ])

      if (studentsRes.error) throw studentsRes.error
      
      const allStudents = studentsRes.data || []
      
      // Update students state
      setStudents(allStudents)
      
      // Calculate stats
      const approved = allStudents.filter((s: any) => s.status === 'Approved' || s.status === 'Accepted')
      const pendingList = allStudents.filter((s: any) => s.status === 'Pending')
      const rejectedList = allStudents.filter((s: any) => s.status === 'Rejected' || s.status === 'Declined')

      setStats({
        totalAccepted: approved.length,
        ictAccepted: approved.filter((s: any) => s.strand === 'ICT').length,
        gasAccepted: approved.filter((s: any) => s.strand === 'GAS').length,
        pending: pendingList.length,
        ictDeclined: rejectedList.filter((s: any) => s.strand === 'ICT').length,
        gasDeclined: rejectedList.filter((s: any) => s.strand === 'GAS').length,
        declinedTotal: rejectedList.length,
        males: approved.filter((s: any) => s.gender === 'Male').length,
        females: approved.filter((s: any) => s.gender === 'Female').length,
        pendingMales: pendingList.filter((s: any) => s.gender === 'Male').length,
        pendingFemales: pendingList.filter((s: any) => s.gender === 'Female').length
      })

      if (configRes.data) setConfig(configRes.data)
      if (historyRes.data) setHistory(historyRes.data)
      
      if (sectionsRes.data) {
        const totalCapacity = sectionsRes.data.reduce((acc: number, s: any) => acc + (s.capacity || 40), 0) || 1000
        setSystem({
          currentCount: approved.length,
          capacity: totalCapacity
        })
      }

      if (!isBackground) {
        console.log("✅ Dashboard data loaded:", allStudents.length, "students")
      } else {
        console.log("🔄 Live update: Dashboard refreshed with", allStudents.length, "students")
      }
      
    } catch (error) {
      console.error("Dashboard sync error:", error)
      if (!isBackground) {
        toast.error("Failed to sync dashboard data")
      }
    }
  }, [])

  // Initial load
  useEffect(() => {
    const initDashboard = async () => {
      setLoading(true)
      await fetchStudents(false)
      setLoading(false)
    }
    
    initDashboard()
  }, [fetchStudents])

  // HYBRID APPROACH: Realtime + Polling Fallback
  useEffect(() => {
    console.log("🎯 Setting up live update system...")
    
    // POLLING FALLBACK - Checks every 3 seconds
    const pollingInterval = setInterval(() => {
      console.log("🔄 Polling for updates...")
      fetchStudents(true)
    }, 3000)

    // REALTIME SUBSCRIPTION - Primary method
    const channel = supabase
      .channel('dashboard_live_updates', {
        config: {
          broadcast: { self: true },
          presence: { key: 'dashboard' }
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'students' 
      }, (payload) => {
        console.log('⚡ REALTIME EVENT:', payload.eventType, payload)
        fetchStudents(true)
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'sections' 
      }, (payload) => {
        console.log('⚡ Sections updated:', payload)
        fetchStudents(true)
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'system_config' 
      }, (payload) => {
        console.log('⚡ Config updated:', payload)
        fetchStudents(true)
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'enrollment_history' 
      }, (payload) => {
        console.log('⚡ History updated:', payload)
        fetchStudents(true)
      })
      .on('broadcast', { event: 'student_update' }, (payload) => {
        console.log('📡 Broadcast received:', payload)
        fetchStudents(true)
      })
      .subscribe((status) => {
        console.log("📊 Subscription status:", status)
        if (status === 'SUBSCRIBED') {
          console.log("✅ Realtime subscription ACTIVE")
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Subscription error - polling will handle updates')
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Subscription timeout - polling will handle updates')
        }
      })

    return () => {
      console.log("🔌 Cleaning up live update system")
      clearInterval(pollingInterval)
      supabase.removeChannel(channel)
    }
  }, [fetchStudents])

  const comparison = useMemo(() => {
    if (history.length === 0) return { diff: 0, status: 'baseline', percent: '0', prevYear: '' };
    
    let baselineSnapshot = history[0];
    // If the latest snapshot is the current year, compare against the previous year instead
    if (config?.school_year && baselineSnapshot.school_year === config.school_year) {
      if (history.length > 1) {
        baselineSnapshot = history[1];
      } else {
        return { diff: 0, status: 'baseline', percent: '0', prevYear: baselineSnapshot.school_year };
      }
    }

    const prevTotal = baselineSnapshot.male_total + baselineSnapshot.female_total;
    if (prevTotal === 0) return { diff: 0, status: 'baseline', percent: '0', prevYear: baselineSnapshot.school_year };
    const diff = ((stats.totalAccepted - prevTotal) / prevTotal) * 100;
    return {
      percent: Math.abs(diff).toFixed(1),
      status: diff >= 0 ? 'growth' : 'decline',
      prevYear: baselineSnapshot.school_year,
      diff
    };
  }, [history, stats.totalAccepted, config?.school_year]);

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
  }, [students, system.capacity, config?.voucher_value]);

  const trendData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
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
    
    if (dailyVelocity <= 0 || remainingSlots <= 0) {
      return { days: 0, speed: dailyVelocity.toFixed(2) };
    }
    
    const daysRemaining = Math.ceil(remainingSlots / dailyVelocity);
    return { 
      days: daysRemaining, 
      speed: dailyVelocity.toFixed(2) 
    };
  }, [trendData, system.capacity, stats.totalAccepted]);

  // Enrollment Spike Analysis
  const spikeAnalysis = useMemo(() => {
    const last7Days = trendData.slice(-7);
    const prev7Days = trendData.slice(-14, -7);
    
    const last7Total = last7Days.reduce((acc, curr) => acc + curr.count, 0);
    const prev7Total = prev7Days.reduce((acc, curr) => acc + curr.count, 0);
    
    const weeklyChange = prev7Total > 0 ? ((last7Total - prev7Total) / prev7Total) * 100 : 0;
    const peakDay = [...trendData].sort((a, b) => b.count - a.count)[0];
    const avgDaily = trendData.reduce((acc, curr) => acc + curr.count, 0) / 30;
    
    const remainingCapacity = system.capacity - stats.totalAccepted;
    const capacityProgress = (stats.totalAccepted / system.capacity) * 100;
    
    // Determine alert level
    let alertLevel: 'safe' | 'warning' | 'critical' = 'safe';
    let alertMessage = 'Capacity levels optimal';
    
    if (capacityProgress >= 95) {
      alertLevel = 'critical';
      alertMessage = 'Critical: Near maximum capacity';
    } else if (capacityProgress >= 85) {
      alertLevel = 'warning';
      alertMessage = 'Warning: Approaching capacity limit';
    }
    
    return {
      weeklyChange: weeklyChange.toFixed(1),
      isGrowth: weeklyChange > 0,
      peakDay,
      avgDaily: avgDaily.toFixed(1),
      remainingCapacity,
      capacityProgress: capacityProgress.toFixed(1),
      alertLevel,
      alertMessage
    };
  }, [trendData, system.capacity, stats.totalAccepted]);

  const topJHSLeaders = useMemo(() => {
    return students
      .filter(s => s.gwa_grade_10 > 0 && (s.student_category?.toLowerCase().includes("jhs") || s.student_category === "Standard"))
      .sort((a, b) => b.gwa_grade_10 - a.gwa_grade_10)
      .slice(0, 10);
  }, [students]);

  const pieData = useMemo(() => [
    { name: 'ICT Division', value: stats.ictAccepted, color: isDarkMode ? '#60a5fa' : '#2563eb' },
    { name: 'GAS Division', value: stats.gasAccepted, color: isDarkMode ? '#fb923c' : '#f97316' }
  ], [stats.ictAccepted, stats.gasAccepted, isDarkMode]);

  const capacityPercentage = useMemo(() => Math.min((stats.totalAccepted / system.capacity) * 100, 100), [stats.totalAccepted, system.capacity]);

  // Calculated Totals for Archive and Display
  const totalMaleEnrollees = stats.males + stats.pendingMales;
  const totalFemaleEnrollees = stats.females + stats.pendingFemales;
  const grandTotalEnrollees = totalMaleEnrollees + totalFemaleEnrollees;

  const handleCaptureSnapshot = async () => {
    const activeYear = config?.school_year || ""; 
    if (!activeYear) return toast.error("School Year is UNSET.");
    setIsCapturing(true)
    try {
      // Uses TOTAL (Accepted + Pending) for the archive as requested
      const res = await recordYearlySnapshot(activeYear, totalMaleEnrollees, totalFemaleEnrollees)
      if (res.success) { 
        await fetchStudents(true)
        toast.success(`Matrix Upserted: S.Y. ${activeYear}`)
      }
    } catch (error: any) { 
      toast.error("Sync Failed.") 
    } finally { 
      setIsCapturing(false) 
    }
  }

  const handleDeleteSnapshot = async (id: string) => {
    const res = await deleteSnapshot(id)
    if (res.success) {
      setHistory(prev => prev.filter(item => item.id !== id))
    } else {
      throw new Error("Failed to delete")
    }
  }

  if (!mounted || loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 text-slate-400">
      <Loader2 className="animate-spin text-blue-600 w-12 h-12" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em]">Calibrating Matrix...</p>
    </div>
  )

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-700 pb-20 p-4 md:p-8 transition-colors duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <ThemedText variant="h1" isDarkMode={isDarkMode}>Overview</ThemedText>
               {comparison.status !== 'baseline' && (
                 <Badge className={`px-4 py-1.5 rounded-xl font-black text-[10px] border-none ${comparison.status === 'growth' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400'}`}>
                   {comparison.status === 'growth' ? <TrendingUp size={12} className="mr-1 inline"/> : <TrendingDown size={12} className="mr-1 inline"/>}
                   {comparison.percent}% VS Year {comparison.prevYear}
                 </Badge>
               )}
          </div>
          <ThemedText variant="body" muted className="italic text-sm md:text-base" isDarkMode={isDarkMode}>
            Command Center: S.Y. {config?.school_year || "UNSET"}.
          </ThemedText>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <Button onClick={handleCaptureSnapshot} disabled={isCapturing} variant="outline" className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border py-2 flex-1 md:flex-none h-14 px-6 md:px-8 rounded-2xl font-black text-[10px] uppercase transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 bg-white text-black border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:text-white dark:border-slate-800 dark:hover:bg-slate-900">
              {isCapturing ? <Loader2 className="animate-spin"/> : <History />} Record Year
            </Button>

            <ArchivesManager history={history} onDelete={handleDeleteSnapshot} />

            <Button onClick={() => window.print()} variant="outline" className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border py-2 flex-1 md:flex-none h-14 px-6 md:px-8 rounded-2xl font-black text-[10px] uppercase transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 bg-white text-black border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:text-white dark:border-slate-800 dark:hover:bg-slate-900">
               <FileDown /> Print Report
            </Button>
        </div>
      </div>

      <OverviewGrid stats={stats} isDarkMode={isDarkMode} />

      <CensusGrid stats={stats} totalMaleEnrollees={totalMaleEnrollees} totalFemaleEnrollees={totalFemaleEnrollees} isDarkMode={isDarkMode} />

      <div className="w-full">
        <MetricCard 
            label="TOTAL ENROLLEE (MALE + FEMALE)" 
            value={<AnimatedNumber value={grandTotalEnrollees} />}
            colorLight="#ffffff" 
            colorDark="#0f172a"
            textColor={isDarkMode ? "text-white" : "text-slate-900"}
            icon={<Users size={64} className={isDarkMode ? "text-slate-700" : "text-slate-200"} />}
            isDarkMode={isDarkMode}
          />
      </div>

      <VelocitySection trendData={trendData} isDarkMode={isDarkMode} />

      <SpikeAnalyticsSection spikeAnalysis={spikeAnalysis} stats={stats} system={system} isDarkMode={isDarkMode} />

      <RevenueSection revenueMatrix={revenueMatrix} prediction={prediction} comparison={comparison} isDarkMode={isDarkMode} />

      <CapacitySection capacityPercentage={capacityPercentage} stats={stats} system={system} topJHSLeaders={topJHSLeaders} pieData={pieData} isDarkMode={isDarkMode} />
    </div>
  )
}