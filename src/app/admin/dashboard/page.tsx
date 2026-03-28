"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import { deleteSnapshot } from "@/lib/actions/history"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, Loader2, TrendingDown, FileDown, Users, LineChart
} from "lucide-react"
import { toast } from "sonner"
import { format, subDays, isSameDay, parseISO } from "date-fns"
import { ThemedText } from "@/components/ThemedText"
import { useTheme } from "@/hooks/useTheme"
import { useRouter } from "next/navigation"
import { AnimatedNumber, MetricCard } from "./components/primitives"
import { OverviewGrid, CensusGrid, VelocitySection, SpikeAnalyticsSection, RevenueSection, CapacitySection, AlmaMaterSection } from "./components/sections"
import { ArchivesManager } from "./components/ArchivesManager"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function AdminDashboard() {
  const { isDarkMode, mounted } = useTheme()
  const router = useRouter()
  const [config, setConfig] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([]) 
  const [students, setStudents] = useState<any[]>([]) 
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)

  const [system, setSystem] = useState({
    currentCount: 0,
    capacity: 1000
  })

  // Grade 12 toggle — persisted to localStorage, defaults to OFF (G11 only)
  const [includeG12, setIncludeG12] = useState(false)
  useEffect(() => {
    const stored = localStorage.getItem("dashboard_include_g12")
    if (stored !== null) setIncludeG12(stored === "true")
  }, [])
  const toggleIncludeG12 = () => {
    setIncludeG12(prev => {
      const next = !prev
      localStorage.setItem("dashboard_include_g12", String(next))
      return next
    })
  }


  // OPTIMIZED: Separated background updates from initial load
  const fetchStudents = useCallback(async (isBackground = false) => {
    // Prevent concurrent background fetches — realtime + polling can fire simultaneously
    if (isBackground && fetchingRef.current) return
    fetchingRef.current = true
    try {
      const [studentsRes, configRes, sectionsRes, historyRes] = await Promise.all([
        supabase.from('students').select('id,first_name,last_name,gender,strand,section,status,student_category,gwa_grade_10,two_by_two_url,created_at,preferred_shift,last_school_attended,grade_level,is_archived').order('created_at', { ascending: false }),
        supabase.from('system_config').select('*').maybeSingle(),
        supabase.from('sections').select('capacity'),
        supabase.from('enrollment_history').select('*').order('school_year', { ascending: false })
      ])

      if (studentsRes.error) {
        console.error("Students fetch error:", studentsRes.error)
        throw studentsRes.error
      }
      if (configRes.error) {
         console.error("Config fetch error:", configRes.error)
      }
      
      const allStudents = studentsRes.data || []
      
      // Update students state — stats computed reactively in useMemo below
      setStudents(allStudents)

      if (configRes.data) setConfig(configRes.data)
      if (historyRes.data) setHistory(historyRes.data)
      
      if (sectionsRes.data) {
        const totalCapacity = sectionsRes.data.reduce((acc: number, s: any) => acc + (s.capacity || 40), 0) || 1000
        setSystem(prev => ({ ...prev, capacity: totalCapacity }))
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
    } finally {
      fetchingRef.current = false
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
    
    // POLLING FALLBACK - Checks every 15 seconds (realtime handles live events)
    const pollingInterval = setInterval(() => {
      console.log("🔄 Polling for updates...")
      fetchStudents(true)
    }, 15000)

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

  // ── Reactive stats — recomputes whenever students load OR includeG12 changes ──
  const stats = useMemo(() => {
    // Filter by grade level based on toggle.
    // Graduated students have grade_level='12' AND section_id=null AND is_archived=true
    // We exclude those specifically. Regular archived students (e.g. end-of-year archive) 
    // should still be counted if they're in the current school year — the original dashboard
    // counted everyone, so we preserve that for G11, and add G12 only when toggled.
    const base = students.filter((s: any) => {
      // Exclude graduated records (archived G12 with no section)
      if (s.is_archived && s.grade_level === "12") return false
      if (includeG12) return true  // show all non-graduated students
      // G11-only mode: exclude explicit G12 students
      return s.grade_level !== "12"
    })
    const approved    = base.filter((s: any) => s.status === 'Approved' || s.status === 'Accepted')
    const pendingList = base.filter((s: any) => s.status === 'Pending')
    const rejectedList = base.filter((s: any) => s.status === 'Rejected' || s.status === 'Declined')
    return {
      totalAccepted:  approved.length,
      ictAccepted:    approved.filter((s: any) => s.strand === 'ICT').length,
      gasAccepted:    approved.filter((s: any) => s.strand === 'GAS').length,
      pending:        pendingList.length,
      ictDeclined:    rejectedList.filter((s: any) => s.strand === 'ICT').length,
      gasDeclined:    rejectedList.filter((s: any) => s.strand === 'GAS').length,
      declinedTotal:  rejectedList.length,
      males:          approved.filter((s: any) => s.gender === 'Male').length,
      females:        approved.filter((s: any) => s.gender === 'Female').length,
      pendingMales:   pendingList.filter((s: any) => s.gender === 'Male').length,
      pendingFemales: pendingList.filter((s: any) => s.gender === 'Female').length,
      amShift:        approved.filter((s: any) => s.preferred_shift === 'AM').length,
      pmShift:        approved.filter((s: any) => s.preferred_shift === 'PM').length,
      // Grade level breakdown (enrolled/accepted only)
      g11Count: approved.filter((s: any) => s.grade_level !== '12').length,
      g12Count: approved.filter((s: any) => s.grade_level === '12').length,
    }
  }, [students, includeG12])

  // ── Grade breakdown cards — ALWAYS shows absolute counts, ignores includeG12 toggle ──
  const gradeBreakdown = useMemo(() => {
    const enrolled = students.filter((s: any) =>
      !s.is_archived &&
      (s.status === "Accepted" || s.status === "Approved")
    )
    return {
      g11: enrolled.filter((s: any) => s.grade_level !== "12").length,
      g12: enrolled.filter((s: any) => s.grade_level === "12").length,
    }
  }, [students]) // Note: NO includeG12 dependency — always absolute

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

  // Alma Mater: feeder school frequency from accepted/approved students
  const almaMaterData = useMemo(() => {
    const schoolCounts: Record<string, number> = {};

    students
      .filter(s => s.status === 'Approved' || s.status === 'Accepted')
      .forEach(s => {
        const school = s.last_school_attended?.trim().toUpperCase();
        if (school) {
          schoolCounts[school] = (schoolCounts[school] || 0) + 1;
        }
      });

    return Object.entries(schoolCounts)
      .map(([name, count]) => ({ name, count }))
      // Sort by count DESC, then alphabetically ASC on ties
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
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
  // const grandTotalEnrollees = totalMaleEnrollees + totalFemaleEnrollees;
  const totalEnrollees = stats.males + stats.females;

  const handleDeleteSnapshot = async (id: string) => {
    const res = await deleteSnapshot(id)
    if (res.success) {
      setHistory(prev => prev.filter(item => item.id !== id))
    } else {
      throw new Error("Failed to delete")
    }
  }

  if (!mounted || loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 text-slate-400">
      <div className="relative flex items-center justify-center">
        <span className="absolute w-24 h-24 rounded-full border-2 border-blue-500/15 animate-ping" />
        <span className="absolute w-16 h-16 rounded-full border-2 border-blue-400/25 animate-ping" style={{ animationDelay: "0.15s" }} />
        <span className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 shadow-xl shadow-blue-500/30 flex items-center justify-center">
          <Loader2 className="animate-spin text-white" size={22} />
        </span>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em]">Fetching Data...</p>
    </div>
  )

  return (
    <TooltipProvider delayDuration={100}>
    {/* Thin themed scrollbar — adapts to dark/light mode */}
    <style>{`
      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-track { background: rgba(226,232,240,0.6); border-radius: 99px; }
      ::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.8); border-radius: 99px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(100,116,139,0.9); }
      * { scrollbar-width: thin; scrollbar-color: rgba(148,163,184,0.8) rgba(226,232,240,0.6); }
      .dark ::-webkit-scrollbar-track { background: rgba(51,65,85,0.3); }
      .dark ::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.7); }
      .dark ::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.9); }
      .dark * { scrollbar-color: rgba(100,116,139,0.7) rgba(51,65,85,0.3); }
    `}</style>
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
            {/* G12 Include Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleIncludeG12}
                  className={`flex items-center gap-2 h-14 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1
                    ${includeG12
                      ? "bg-violet-600 hover:bg-violet-500 text-white border-violet-700 shadow-violet-500/20"
                      : isDarkMode
                        ? "bg-slate-950 hover:bg-slate-900 text-slate-300 border-slate-800"
                        : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                >
                  <Users size={14} />
                  <span>
                    {includeG12 ? "G11 + G12" : "G11 Only"}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${includeG12 ? "bg-violet-300" : isDarkMode ? "bg-slate-600" : "bg-slate-300"}`} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white border-slate-800">
                <p>{includeG12 ? "Currently showing G11 + G12 students. Click to show G11 only." : "Currently showing G11 students only. Click to include G12."}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => router.push('/admin/predictive-analytics')} variant="outline" className={`inline-flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border py-2 flex-1 md:flex-none h-14 px-6 md:px-8 rounded-2xl font-black text-[10px] uppercase transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 ${isDarkMode ? 'bg-slate-950 text-white border-slate-800 hover:bg-slate-900' : 'bg-white text-black border-slate-200 hover:bg-slate-50'}`}>
                  <LineChart /> Predictive Analysis
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>View future enrollment projections</p></TooltipContent>
            </Tooltip>

            <ArchivesManager history={history} onDelete={handleDeleteSnapshot} isDarkMode={isDarkMode} />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => window.print()} variant="outline" className={`inline-flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border py-2 flex-1 md:flex-none h-14 px-6 md:px-8 rounded-2xl font-black text-[10px] uppercase transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 ${isDarkMode ? 'bg-slate-950 text-white border-slate-800 hover:bg-slate-900' : 'bg-white text-black border-slate-200 hover:bg-slate-50'}`}>
                  <FileDown /> Print Report
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Generate hard copy of this report</p></TooltipContent>
            </Tooltip>
        </div>
      </div>
      
      <OverviewGrid stats={stats} isDarkMode={isDarkMode} />

      {/* G11 / G12 Enrollment Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-10">
        {[
          { label: "Grade 11 Enrolled", value: gradeBreakdown.g11, color: isDarkMode ? "text-blue-400" : "text-blue-600", bg: isDarkMode ? "bg-blue-500/5 border-blue-500/10" : "bg-blue-50/50 border-blue-100", dot: "bg-blue-500", glow: "shadow-blue-500/20" },
          { label: "Grade 12 Enrolled", value: gradeBreakdown.g12, color: isDarkMode ? "text-violet-400" : "text-violet-600", bg: isDarkMode ? "bg-violet-500/5 border-violet-500/10" : "bg-violet-50/50 border-violet-100", dot: "bg-violet-500", glow: "shadow-violet-500/20" },
        ].map(card => (
          <div key={card.label} className={`rounded-[2.5rem] border p-8 md:p-10 flex items-center gap-6 ${card.bg} relative overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-1`}>
            <div className={`h-1.5 absolute top-0 left-0 right-0 ${card.dot} opacity-40 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shrink-0 ${isDarkMode ? "bg-slate-800" : "bg-white"} shadow-xl border border-white/10 group-hover:scale-110 transition-transform duration-500`}>
              <span className={`w-4 h-4 rounded-full ${card.dot} ${card.glow} shadow-lg animate-pulse`} />
            </div>
            <div>
              <p className={`text-4xl md:text-6xl font-black tabular-nums tracking-tighter ${card.color}`}>
                <AnimatedNumber value={card.value} />
              </p>
              <p className={`text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] mt-1 ${card.color} opacity-60`}>{card.label}</p>
            </div>
            {/* Subtle Decorative SaaS Glow */}
            <div className={`absolute -right-8 -bottom-8 w-32 h-32 ${card.dot} opacity-[0.03] blur-3xl rounded-full`} />
          </div>
        ))}
      </div>

      <CensusGrid stats={stats} totalMaleEnrollees={totalMaleEnrollees} totalFemaleEnrollees={totalFemaleEnrollees} isDarkMode={isDarkMode} />

      <div className="w-full">
        <MetricCard 
            label="TOTAL ENROLLEE (MALE + FEMALE)" 
            value={<AnimatedNumber value={totalEnrollees} />}
            colorLight="#ffffff" 
            colorDark="#0f172a"
            textColor={isDarkMode ? "text-white" : "text-slate-900"}
            icon={<Users size={64} className={isDarkMode ? "text-slate-700" : "text-slate-200"} />}
            isDarkMode={isDarkMode}
            tooltip="Total count of all students (Male + Female) currently in the system"
          />
      </div>

      {/* ALMA MATER SECTION — below Total Enrollee */}
      <AlmaMaterSection almaMaterData={almaMaterData} isDarkMode={isDarkMode} />

      <VelocitySection trendData={trendData} isDarkMode={isDarkMode} />

      <SpikeAnalyticsSection spikeAnalysis={spikeAnalysis} stats={stats} system={system} isDarkMode={isDarkMode} />

      <RevenueSection revenueMatrix={revenueMatrix} prediction={prediction} comparison={comparison} isDarkMode={isDarkMode} />

      <CapacitySection capacityPercentage={capacityPercentage} stats={stats} system={system} topJHSLeaders={topJHSLeaders} pieData={pieData} isDarkMode={isDarkMode} />
    </div>
    </TooltipProvider>
  )
}