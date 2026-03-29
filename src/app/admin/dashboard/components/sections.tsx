// src/app/admin/dashboard/components/sections.tsx

"use client"

import { useState, useEffect, memo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { 
  CheckCircle2, Cpu, BookText, Clock, Calendar, Zap, TrendingUp, TrendingDown, 
  Target, Activity, Users, Banknote, Landmark, Timer, Trophy, PieChart as PieIcon, 
  ChevronRight, User, UserCircle2, Sun, Moon, School, GraduationCap, Medal, Star, Award
} from "lucide-react"
import { ThemedText } from "@/components/ThemedText"
import { themeColors } from "@/lib/themeColors"
import Link from "next/link"
import { AnimatedNumber, MetricCard, StatCard, VelocityChart, StrandPieChart } from "./primitives"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

// Helper component for student avatars in the dashboard
const StudentAvatar = memo(function StudentAvatar({ src, name, size = 32 }: { src?: string | null, name: string, size?: number }) {
  const [error, setError] = useState(false)
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
  
  if (src && !error) {
    return (
      <div className="relative group/avatar overflow-hidden rounded-full ring-2 ring-white dark:ring-slate-800 shadow-lg" style={{ width: size, height: size }}>
        <img 
          src={src} 
          alt={name} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover/avatar:scale-110" 
          onError={() => setError(true)}
          loading="lazy"
        />
      </div>
    )
  }

  const hue = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return (
    <div 
      className="rounded-full flex items-center justify-center font-black text-white shadow-lg ring-2 ring-white dark:ring-slate-800 transition-transform duration-500 hover:scale-110"
      style={{ 
        width: size, 
        height: size, 
        fontSize: size * 0.35,
        backgroundColor: `hsl(${hue}, 65%, 45%)`
      }}
    >
      {initials}
    </div>
  )
})

export const OverviewGrid = memo(function OverviewGrid({ stats, isDarkMode }: { stats: any, isDarkMode: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
      <StatCard title="Students Enrolled" value={<AnimatedNumber value={stats.totalAccepted} />} icon={<CheckCircle2 />} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50" trend="View Enrolled" isDarkMode={isDarkMode} tooltip="Total number of students officially enrolled" />
      <StatCard title="ICT Enrolled" value={<AnimatedNumber value={stats.ictAccepted} />} icon={<Cpu />} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50" trend="View Applicants" isDarkMode={isDarkMode} tooltip="Students enrolled in Information and Communications Technology" />
      <StatCard title="GAS Enrolled" value={<AnimatedNumber value={stats.gasAccepted} />} icon={<BookText />} color="text-orange-600 dark:text-orange-400" bg="bg-orange-50" trend="View Applicants" isDarkMode={isDarkMode} tooltip="Students enrolled in General Academic Strand" />
      <StatCard title="Pending Applicants" value={<AnimatedNumber value={stats.pending} />} icon={<Clock />} color="text-amber-600 dark:text-amber-400" bg="bg-amber-50" trend="View Applicants" isDarkMode={isDarkMode} tooltip="Applications awaiting review or approval" />
      {(stats as any).g11Accepted !== undefined && <StatCard title="Grade 11" value={<AnimatedNumber value={(stats as any).g11Accepted} />} icon={<GraduationCap />} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50" trend="View Enrolled" isDarkMode={isDarkMode} tooltip="Students enrolled in Grade 11" />}
      {(stats as any).g12Accepted !== undefined && <StatCard title="Grade 12" value={<AnimatedNumber value={(stats as any).g12Accepted} />} icon={<GraduationCap />} color="text-purple-600 dark:text-purple-400" bg="bg-purple-50" trend="View Enrolled" isDarkMode={isDarkMode} tooltip="Students enrolled in Grade 12" />}
    </div>
  )
})

export const CensusGrid = memo(function CensusGrid({ stats, totalMaleEnrollees, totalFemaleEnrollees, isDarkMode }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
      <MetricCard 
        label="Male Student Enrolled" 
        value={<AnimatedNumber value={stats.males} />}
        colorLight="linear-gradient(135deg, rgb(59, 130, 246), rgb(37, 99, 235))" 
        colorDark="linear-gradient(135deg, rgb(59, 130, 246), rgb(29, 78, 216))"
        icon={<User size={48}/>}
        isDarkMode={isDarkMode}
        tooltip="Total male students currently enrolled"
      />
      <MetricCard 
        label="Female Student Enrolled" 
        value={<AnimatedNumber value={stats.females} />}
        colorLight="linear-gradient(135deg, rgb(236, 72, 153), rgb(219, 39, 119))" 
        colorDark="linear-gradient(135deg, rgb(244, 114, 182), rgb(236, 72, 153))"
        icon={<UserCircle2 size={48}/>}
        isDarkMode={isDarkMode}
        tooltip="Total female students currently enrolled"
      />
      <MetricCard 
        label="Pending Male" 
        value={<AnimatedNumber value={stats.pendingMales} />}
        colorLight="linear-gradient(135deg, rgb(30, 58, 138), rgb(15, 23, 42))" 
        colorDark="linear-gradient(135deg, rgba(30, 58, 138, 0.7), rgba(23, 37, 84, 0.7))"
        icon={<User size={48} className="opacity-70"/>}
        isDarkMode={isDarkMode}
        tooltip="Male applicants pending approval"
      />
      <MetricCard 
        label="Pending Female" 
        value={<AnimatedNumber value={stats.pendingFemales} />}
        colorLight="linear-gradient(135deg, rgb(131, 24, 67), rgb(80, 7, 36))"  
        colorDark="linear-gradient(135deg, rgba(157, 23, 77, 0.7), rgba(131, 24, 67, 0.7))"
        icon={<UserCircle2 size={48} className="opacity-70"/>}
        isDarkMode={isDarkMode}
        tooltip="Female applicants pending approval"
      />
      <MetricCard 
        label="AM SHIFT (PREFERENCE)" 
        value={<AnimatedNumber value={stats.amShift} />}
        colorLight="linear-gradient(135deg, rgb(245, 158, 11), rgb(217, 119, 6))"  
        colorDark="linear-gradient(135deg, rgba(180, 83, 9, 0.7), rgba(120, 53, 15, 0.7))"
        icon={<Sun size={48} className="text-white"/>}
        isDarkMode={isDarkMode}
        tooltip="Enrolled students that PREFERS AM SHIFT"
      />
      <MetricCard 
        label="PM SHIFT (PREFERENCE)" 
        value={<AnimatedNumber value={stats.pmShift} />}
        colorLight="linear-gradient(135deg, rgb(99, 102, 241), rgb(79, 70, 229))" 
        colorDark="linear-gradient(135deg, rgba(55, 48, 163, 0.7), rgba(49, 46, 129, 0.7))"
        icon={<Moon size={48} className="text-white"/>}
        isDarkMode={isDarkMode}
        tooltip="Enrolled students that PREFERS PM SHIFT"
      />
    </div>
  )
})

export const AlmaMaterSection = memo(function AlmaMaterSection({ almaMaterData, isDarkMode }: { almaMaterData: { name: string, count: number }[], isDarkMode: boolean }) {
  const topSchool = almaMaterData[0]
  const rest = almaMaterData.slice(1)
  const totalContributing = almaMaterData.reduce((acc, s) => acc + s.count, 0)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-full cursor-default">
          <Card
            className="rounded-[32px] md:rounded-[56px] overflow-hidden transition-colors duration-300 border-2"
            style={{
              backgroundColor: isDarkMode ? themeColors.dark.surface : themeColors.light.surface,
              borderColor: isDarkMode ? themeColors.dark.border : themeColors.light.border
            }}
          >
            {/* Header */}
            <div
              className="p-6 md:p-10 border-b-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              style={{
                borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.07)' : '#e2e8f0',
                backgroundColor: isDarkMode ? 'rgba(30,41,59,0.4)' : 'rgba(239,246,255,0.6)'
              }}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 dark:bg-blue-500 rounded-2xl text-white shadow-lg">
                  <School size={20} />
                </div>
                <div>
                  <ThemedText variant="h3" className="text-lg md:text-xl" isDarkMode={isDarkMode}>Alma Mater</ThemedText>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Feeder Schools — Where Students Mostly Came From
                  </p>
                </div>
              </div>
              <Badge className="bg-slate-900 dark:bg-slate-700 text-white border-none font-black text-[9px] uppercase px-4 py-2">
                Top {almaMaterData.length} Schools
              </Badge>
            </div>

            <div className="p-6 md:p-10 space-y-6">

              {/* Crown Card — #1 Alma Mater */}
              {topSchool ? (
                <div
                  className="relative rounded-[2.5rem] p-8 md:p-12 overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 group transition-all duration-500 hover:shadow-2xl hover:-translate-y-1"
                  style={{
                    background: isDarkMode
                      ? 'linear-gradient(135deg, rgba(37,99,235,0.4), rgba(29,78,216,0.25))'
                      : 'linear-gradient(135deg, #2563eb, #1e40af)',
                  }}
                >
                  {/* SaaS Decorative elements */}
                  <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 blur-3xl rounded-full pointer-events-none" />
                  <div className="absolute top-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none">
                    <School size={180} className="text-white translate-x-12 -translate-y-8" />
                  </div>

                  <div className="relative z-10 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/70">
                      Primary Feeder
                    </p>
                    <p className="text-2xl md:text-4xl font-black text-white tracking-tighter leading-tight drop-shadow-md">
                      {topSchool.name}
                    </p>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md">
                      <TrendingUp size={12} className="text-white/80" />
                      <p className="text-[10px] font-black text-white/90 uppercase tracking-widest">
                        {totalContributing > 0
                          ? `${((topSchool.count / totalContributing) * 100).toFixed(1)}% Share`
                          : 'No data'}
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 text-left sm:text-right shrink-0">
                    <p className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none drop-shadow-2xl tabular-nums">
                      <AnimatedNumber value={topSchool.count} />
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mt-2">
                      Total Students
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className={`text-[12px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>
                    No records found
                  </p>
                </div>
              )}

              {/* Ranked list — #2 onwards */}
              {rest.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {rest.map((school, idx) => {
                    const percent = totalContributing > 0
                      ? (school.count / totalContributing) * 100
                      : 0
                    const barWidth = topSchool
                      ? (school.count / topSchool.count) * 100
                      : 0

                    return (
                      <div
                        key={school.name}
                        className="flex items-center gap-5 p-6 rounded-[2rem] border group transition-all duration-300 hover:shadow-lg hover:bg-white dark:hover:bg-slate-800/50"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(30,41,59,0.5)' : 'rgb(248,250,252)',
                          borderColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgb(241,245,249)'
                        }}
                      >
                        {/* Rank Circle */}
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-[11px] font-black shrink-0 shadow-inner transition-colors duration-300 group-hover:bg-blue-600 group-hover:text-white ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}>
                          #{idx + 2}
                        </div>

                        {/* School info */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex justify-between items-end gap-2">
                            <p className={`text-[11px] font-black uppercase tracking-wider truncate flex-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                              {school.name}
                            </p>
                            <span className="text-[14px] font-black text-blue-600 dark:text-blue-400 tabular-nums">
                              <AnimatedNumber value={school.count} />
                            </span>
                          </div>
                          <div
                            className={`h-1.5 rounded-full overflow-hidden shadow-inner ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}
                          >
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000 ease-out"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

            </div>
          </Card>
        </div>
      </TooltipTrigger>
      <TooltipContent className="bg-slate-900 text-white border-slate-800 max-w-xs">
        <p className="font-medium text-xs leading-relaxed">
        Shows the top feeder schools of currently enrolled students. The primary Alma Mater is the school with the most enrollees.
        </p>
      </TooltipContent>
    </Tooltip>
  )
})

export const VelocitySection = memo(function VelocitySection({ trendData, isDarkMode }: any) {
  const [visibleData, setVisibleData] = useState<any[]>([])

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width < 640) {
        setVisibleData(trendData.slice(-5))
      } else if (width < 1024) {
        setVisibleData(trendData.slice(-10))
      } else {
        setVisibleData(trendData)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [trendData])

  return (
    <Card
      className="rounded-[32px] md:rounded-[56px] relative overflow-hidden transition-colors duration-300"
      style={{
        backgroundColor: isDarkMode ? themeColors.dark.surface : themeColors.light.surface,
        borderColor: isDarkMode ? themeColors.dark.border : 'rgba(168, 85, 247, 0.2)'
      }}
    >
      <div className="h-0.5 w-full bg-gradient-to-r from-blue-600 via-violet-500 to-blue-400 opacity-70" />
      <div className="p-6 md:p-10">
       <div className="flex flex-col sm:flex-row justify-between items-start mb-10 gap-4">
          <div>
             <ThemedText variant="h3" className="flex items-center gap-3 md:text-2xl" isDarkMode={isDarkMode}>
               <Calendar className="text-blue-600 dark:text-blue-400" /> Enrollment Velocity
             </ThemedText>
             <ThemedText variant="label" className="mt-1" isDarkMode={isDarkMode}>30-Day Registration Analytics</ThemedText>
          </div>
          <Tooltip>
            <TooltipTrigger>
              <Badge className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-black text-[9px] uppercase px-4 py-2 cursor-help flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
                </span>
                LIVE DATA FEED
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Real-time updates from registrar database</p></TooltipContent>
          </Tooltip>
       </div>
       <VelocityChart data={visibleData} isDarkMode={isDarkMode} />
      </div>
    </Card>
  )
})

export const SpikeAnalyticsSection = memo(function SpikeAnalyticsSection({ spikeAnalysis, stats, system, isDarkMode }: any) {
  return (
    <Card 
      className="p-6 md:p-10 rounded-[32px] md:rounded-[56px] relative overflow-hidden transition-colors duration-300"
      style={{
        backgroundColor: isDarkMode ? themeColors.dark.surface : themeColors.light.surface,
        borderColor: isDarkMode ? themeColors.dark.border : themeColors.light.border
      }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
        <div>
          <ThemedText variant="h3" className="flex items-center gap-3 md:text-2xl" isDarkMode={isDarkMode}>
            <Zap className="text-amber-600 dark:text-amber-400" /> Enrollment Analysis
          </ThemedText>
          <ThemedText variant="label" className="mt-1" isDarkMode={isDarkMode}>Capacity Monitoring Analysis</ThemedText>
        </div>
        <Tooltip>
        <TooltipTrigger>
        <Badge 
          className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase border-none ${
            spikeAnalysis.alertLevel === 'critical' 
              ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400' 
              : spikeAnalysis.alertLevel === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
              : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {spikeAnalysis.alertMessage}
        </Badge>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Current status of campus capacity limits</p></TooltipContent>
        </Tooltip>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div
          className="rounded-[2.5rem] border overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-1 group"
          style={{
            backgroundColor: isDarkMode ? 'rgb(30, 41, 59)' : 'rgb(255, 255, 255)',
            borderColor: isDarkMode ? 'rgb(51, 65, 85)' : 'rgb(241, 245, 249)'
          }}
        >
          <div className={`h-1 w-full ${spikeAnalysis.isGrowth ? 'bg-emerald-500' : 'bg-red-500'} opacity-30 group-hover:opacity-100 transition-opacity duration-500`} />
          <div className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-xl ${spikeAnalysis.isGrowth ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'}`}>
                {spikeAnalysis.isGrowth ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              </div>
              <ThemedText variant="label" className="font-black text-[10px] tracking-widest uppercase opacity-60" isDarkMode={isDarkMode}>Weekly Change</ThemedText>
            </div>
            <div className="flex items-baseline gap-2">
              <ThemedText variant="h2" className="text-3xl md:text-4xl font-black tracking-tighter tabular-nums" isDarkMode={isDarkMode}>
                {spikeAnalysis.isGrowth ? '+' : ''}{spikeAnalysis.weeklyChange}%
              </ThemedText>
            </div>
          </div>
        </div>

        <div
          className="rounded-[2.5rem] border overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-1 group"
          style={{
            backgroundColor: isDarkMode ? 'rgb(30, 41, 59)' : 'rgb(255, 255, 255)',
            borderColor: isDarkMode ? 'rgb(51, 65, 85)' : 'rgb(241, 245, 249)'
          }}
        >
          <div className="h-1 w-full bg-blue-500 opacity-30 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                <Target size={18} />
              </div>
              <ThemedText variant="label" className="font-black text-[10px] tracking-widest uppercase opacity-60" isDarkMode={isDarkMode}>Avg Daily Intake</ThemedText>
            </div>
            <ThemedText variant="h2" className="text-3xl md:text-4xl font-black tracking-tighter tabular-nums" isDarkMode={isDarkMode}>
              {spikeAnalysis.avgDaily}
            </ThemedText>
          </div>
        </div>

        <div
          className="rounded-[2.5rem] border overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-1 group"
          style={{
            backgroundColor: isDarkMode ? 'rgb(30, 41, 59)' : 'rgb(255, 255, 255)',
            borderColor: isDarkMode ? 'rgb(51, 65, 85)' : 'rgb(241, 245, 249)'
          }}
        >
          <div className="h-1 w-full bg-purple-500 opacity-30 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400">
                <Activity size={18} />
              </div>
              <ThemedText variant="label" className="font-black text-[10px] tracking-widest uppercase opacity-60" isDarkMode={isDarkMode}>Peak Day</ThemedText>
            </div>
            <div className="flex items-baseline gap-2">
              <ThemedText variant="h2" className="text-3xl md:text-4xl font-black tracking-tighter tabular-nums" isDarkMode={isDarkMode}>
                <AnimatedNumber value={spikeAnalysis.peakDay.count} />
              </ThemedText>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {spikeAnalysis.peakDay.date}
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-[2.5rem] border overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-1 group"
          style={{
            backgroundColor: isDarkMode ? 'rgb(30, 41, 59)' : 'rgb(255, 255, 255)',
            borderColor: isDarkMode ? 'rgb(51, 65, 85)' : 'rgb(241, 245, 249)'
          }}
        >
          <div className="h-1 w-full bg-orange-500 opacity-30 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400">
                <Users size={18} />
              </div>
              <ThemedText variant="label" className="font-black text-[10px] tracking-widest uppercase opacity-60" isDarkMode={isDarkMode}>Slots Remaining</ThemedText>
            </div>
            <ThemedText variant="h2" className="text-3xl md:text-4xl font-black tracking-tighter tabular-nums" isDarkMode={isDarkMode}>
              <AnimatedNumber value={spikeAnalysis.remainingCapacity} />
            </ThemedText>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <ThemedText variant="label" isDarkMode={isDarkMode}>Capacity Bar</ThemedText>
          <span className={`text-xl font-black ${
            spikeAnalysis.alertLevel === 'critical' 
              ? 'text-red-600 dark:text-red-400' 
              : spikeAnalysis.alertLevel === 'warning'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {spikeAnalysis.capacityProgress}%
          </span>
        </div>
        <div 
          className="h-6 w-full rounded-3xl overflow-hidden p-1.5 shadow-inner"
          style={{ backgroundColor: isDarkMode ? 'rgb(30 41 59)' : 'rgb(226 232 240)' }}
        >
          <div 
            className={`h-full rounded-2xl transition-all duration-1000 ease-out ${
              spikeAnalysis.alertLevel === 'critical' 
                ? 'bg-red-500' 
                : spikeAnalysis.alertLevel === 'warning'
                ? 'bg-amber-500 dark:bg-amber-400'
                : 'bg-emerald-500 dark:bg-emerald-400'
            }`}
            style={{ 
              width: `${spikeAnalysis.capacityProgress}%`,
              boxShadow: spikeAnalysis.alertLevel === 'critical' 
                ? '0 0 20px rgba(239, 68, 68, 0.5)' 
                : spikeAnalysis.alertLevel === 'warning'
                ? '0 0 20px rgba(245, 158, 11, 0.5)'
                : '0 0 20px rgba(34, 197, 94, 0.5)'
            }}
          />
        </div>
        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          <span><AnimatedNumber value={stats.totalAccepted} /> Enrolled</span>
          <span>{system.capacity} Max Capacity</span>
        </div>
      </div>
    </Card>
  )
})

export const RevenueSection = memo(function RevenueSection({ revenueMatrix, prediction, comparison, isDarkMode }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        <Card 
          className="lg:col-span-2 p-8 md:p-14 rounded-[3rem] md:rounded-[4rem] relative overflow-hidden group transition-all duration-500 hover:shadow-2xl"
          style={{
            backgroundColor: isDarkMode ? themeColors.dark.surface : 'rgba(255, 255, 255, 0.8)',
            borderColor: isDarkMode ? themeColors.dark.border : 'rgba(226, 232, 240, 0.5)'
          }}
        >
           {/* Decorative SaaS Background */}
           <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none">
             <Banknote size={240} className="text-emerald-600 dark:text-emerald-400" />
           </div>
           
           <div className="relative z-10 space-y-12">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-8">
                 <div className="space-y-2">
                    <ThemedText variant="h3" className="flex items-center gap-4 text-xl md:text-3xl font-black tracking-tight" isDarkMode={isDarkMode}>
                      <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                        <Landmark size={24} />
                      </div>
                      Graduates Revenue
                    </ThemedText>
                    <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] opacity-50 px-1">Registrar Monitoring (₱{revenueMatrix.voucherLabel.toLocaleString()} / Graduate)</p>
                 </div>
                 <div className="text-left sm:text-right">
                    <Tooltip>
                      <TooltipTrigger>
                        <p className="text-5xl md:text-7xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter cursor-help drop-shadow-sm tabular-nums">₱{revenueMatrix.currentRevenue.toLocaleString()}</p>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-950 text-white border-slate-800 backdrop-blur-md px-4 py-2 rounded-xl">
                        <p className="font-bold text-[10px] uppercase tracking-widest text-emerald-400">Total Active Funding</p>
                      </TooltipContent>
                    </Tooltip>
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-2">
                      <Activity size={12} className="text-emerald-500" />
                      Revenue Progress
                    </span>
                    <span className="hidden sm:inline opacity-60 italic">Target: ₱{(revenueMatrix.totalPotential / 1000000).toFixed(1)}M (Campus Cap)</span>
                 </div>
                 <div className={`h-6 w-full rounded-3xl overflow-hidden p-1.5 shadow-inner border ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'}`} style={{ backgroundColor: isDarkMode ? 'rgb(15 23 42)' : 'rgb(241 245 249)' }}>
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-2xl transition-all duration-1000 ease-out" 
                      style={{ 
                        width: `${revenueMatrix.fundingProgress}%`,
                        boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'
                      }} 
                    />
                 </div>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12 pt-10 border-t ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
                 <div className={`space-y-3 p-6 rounded-[2rem] border group/item hover:bg-white dark:hover:bg-slate-800/50 transition-all ${isDarkMode ? 'bg-slate-800/30 border-slate-800/50' : 'bg-slate-50/50 border-slate-100/50'}`}>
                    <ThemedText variant="label" className="text-[10px] font-black uppercase tracking-widest opacity-50" isDarkMode={isDarkMode}>ICT Revenue contribution</ThemedText>
                    <ThemedText variant="h3" className="text-xl md:text-3xl font-black tabular-nums" isDarkMode={isDarkMode}>₱{(revenueMatrix.qualifiedICT * revenueMatrix.voucherLabel).toLocaleString()}</ThemedText>
                 </div>
                 <div className={`space-y-3 p-6 rounded-[2rem] border group/item hover:bg-white dark:hover:bg-slate-800/50 transition-all sm:text-right ${isDarkMode ? 'bg-slate-800/30 border-slate-800/50' : 'bg-slate-50/50 border-slate-100/50'}`}>
                    <ThemedText variant="label" className="text-[10px] font-black uppercase tracking-widest opacity-50" isDarkMode={isDarkMode}>GAS Revenue contribution</ThemedText>
                    <ThemedText variant="h3" className="text-xl md:text-3xl font-black tabular-nums" isDarkMode={isDarkMode}>₱{(revenueMatrix.qualifiedGAS * revenueMatrix.voucherLabel).toLocaleString()}</ThemedText>
                 </div>
              </div>
           </div>
        </Card>

        <Card 
          className="p-8 md:p-12 rounded-[3rem] md:rounded-[4rem] relative overflow-hidden flex flex-col justify-between min-h-[400px] group transition-all duration-500 hover:shadow-2xl border-none"
          style={{
            background: isDarkMode ? themeColors.dark.surface : 'linear-gradient(135deg, #1e40af, #2563eb)',
            borderColor: isDarkMode ? themeColors.dark.border : 'transparent'
          }}
        >
           {/* Decorative SaaS elements */}
           <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:bg-white/20 transition-all duration-700" />
           <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 blur-[80px] rounded-full -ml-16 -mb-16 group-hover:bg-black/20 transition-all duration-700" />

           <div className="relative z-10 space-y-10">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl backdrop-blur-md border border-white/20 ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-white/20 text-white'}`}>
                  <Timer size={24} />
                </div>
                <h3 className={`text-[11px] md:text-[13px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-blue-300' : 'text-white/90'}`}>
                  Applicants Forecast
                </h3>
              </div>

              <div className="space-y-2">
                 <p className="text-5xl md:text-7xl font-black tracking-tighter leading-none text-white drop-shadow-xl tabular-nums">
                   <AnimatedNumber value={prediction.days} /> 
                 </p>
                 <p className={`text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] px-1 italic ${isDarkMode ? 'text-slate-500' : 'text-blue-100/70'}`}>
                   Days to 100% capacity based on {prediction.speed} intakes/day.
                 </p>
              </div>
           </div>

           <div className={`relative z-10 p-6 md:p-8 rounded-[2.5rem] border backdrop-blur-md shadow-2xl transition-all duration-500 group-hover:scale-[1.02] ${isDarkMode ? 'bg-slate-800/50 border-white/5' : 'bg-white/15 border-white/30'}`}>
              <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-100'}`}>System Insight</p>
              <p className={`text-sm font-bold leading-relaxed tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-white'}`}>
                Registration is performing at <span className="text-lg font-black underline decoration-2 underline-offset-4">{comparison.percent}%</span> efficiency vs {comparison.prevYear || 'baseline'}.
              </p>
           </div>
        </Card>
    </div>
  )
})

export const CapacitySection = memo(function CapacitySection({ capacityPercentage, stats, system, topJHSLeaders, pieData, isDarkMode }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-12">
      <div className="lg:col-span-2 space-y-10">
        <Card 
          className="p-8 md:p-14 rounded-[3rem] md:rounded-[4rem] relative overflow-hidden group transition-all duration-500 hover:shadow-2xl"
          style={{
            backgroundColor: isDarkMode ? themeColors.dark.surface : 'rgb(255, 255, 255)',
            borderColor: isDarkMode ? themeColors.dark.border : 'rgba(226, 232, 240, 0.5)'
          }}
        >
          <div className="relative z-10 space-y-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
              <div className="space-y-3">
                <ThemedText variant="label" className="tracking-[0.4em] font-black text-[10px] md:text-[12px] opacity-50 uppercase" isDarkMode={isDarkMode}>Campus Capacity Status</ThemedText>
                <ThemedText variant="h2" className="text-4xl md:text-6xl font-black tracking-tighter leading-none" isDarkMode={isDarkMode}>
                  Saturation <span className="text-blue-600 dark:text-blue-400 tabular-nums">{capacityPercentage.toFixed(1)}%</span>
                </ThemedText>
              </div>
              <Tooltip>
                <TooltipTrigger>
                  <Badge className={`px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase shadow-xl border-none transition-all hover:scale-105 active:scale-95 cursor-help ${capacityPercentage > 90 ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 dark:bg-blue-500 text-white'}`}>
                    {capacityPercentage > 90 ? 'Critical Alert' : 'Operational Stable'}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-950 text-white border-slate-800"><p>Operational status based on max capacity</p></TooltipContent>
              </Tooltip>
            </div>
            
            <div className="space-y-8">
              <div className={`h-8 w-full rounded-full overflow-hidden p-2 shadow-inner border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-100'}`}>
                <div 
                  className={`h-full transition-all duration-1000 ease-out rounded-full shadow-lg ${capacityPercentage > 90 ? 'bg-red-500' : capacityPercentage > 75 ? 'bg-orange-500' : 'bg-blue-600 dark:bg-blue-500'}`} 
                  style={{ width: `${capacityPercentage}%` }} 
                />
              </div>
              <div className="flex justify-between text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 px-2">
                 <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <AnimatedNumber value={stats.totalAccepted} /> Students Handled
                 </span>
                 <span>Capacity: {system.capacity}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card 
          className="rounded-[3rem] md:rounded-[4rem] overflow-hidden transition-all duration-500 border-2 hover:shadow-2xl"
          style={{
            backgroundColor: isDarkMode ? themeColors.dark.surface : 'rgb(255, 255, 255)',
            borderColor: isDarkMode ? themeColors.dark.border : 'rgba(226, 232, 240, 0.5)'
          }}
        >
           <div
            className={`p-8 md:p-12 border-b-2 flex justify-between items-center ${isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50/30'}`}
            style={{ borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.03)' }}
           >
              <div className="flex items-center gap-5">
                 <div className="p-4 bg-amber-500 dark:bg-amber-600 rounded-[1.5rem] text-white shadow-xl group-hover:rotate-12 transition-transform duration-500">
                   <Trophy size={24} />
                 </div>
                 <div>
                   <ThemedText variant="h3" className="text-xl md:text-2xl font-black tracking-tight" isDarkMode={isDarkMode}>Academic Leaders</ThemedText>
                   <p className={`text-[10px] md:text-[11px] font-bold uppercase tracking-[0.3em] mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>JHS With Highest GWA</p>
                 </div>
              </div>
              <Badge className="bg-slate-950 dark:bg-slate-700 text-white border-none font-black text-[10px] uppercase px-5 py-2.5 rounded-xl">Top 10 Performers</Badge>
           </div>
           
           <div className="overflow-x-auto p-4 md:p-8">
            <Table className="border-separate border-spacing-y-3">
                <TableBody>
                  {topJHSLeaders.map((s: any, idx: number) => (
                      <TableRow key={s.id} className={`transition-all group border-none cursor-default ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                        <TableCell className={`px-6 md:px-8 py-5 md:py-7 rounded-l-[2rem] border-y border-l relative ${isDarkMode ? 'border-slate-800/80' : 'border-slate-50'}`}>
                            <div className={`absolute left-0 top-6 bottom-6 w-1 rounded-full transition-all duration-500 group-hover:h-12 ${s.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'}`} />
                            <div className="flex items-center gap-4 md:gap-6 pl-2">
                              <div className="flex items-center gap-2 w-12 shrink-0">
                                <span className={`text-[11px] font-black tabular-nums ${idx < 3 ? 'text-amber-500' : (idx < 5 ? 'text-blue-500' : 'text-slate-400')}`}>
                                  {idx + 1}
                                </span>
                                {idx < 5 ? (
                                  <Trophy size={14} className={idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-700' : 'text-blue-400'} />
                                ) : (
                                  <Medal size={14} className="text-slate-500 opacity-60" />
                                )}
                              </div>
                              
                              <StudentAvatar src={s.two_by_two_url} name={`${s.first_name} ${s.last_name}`} size={40} />

                              <div className="space-y-1 transition-transform duration-300 group-hover:translate-x-1">
                                  <p className={`text-sm md:text-base font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{s.last_name}, {s.first_name}</p>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest px-2 py-0 opacity-70 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'border-slate-700/50 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                                      {s.strand} • {s.section || 'Unassigned'}
                                    </Badge>
                                  </div>
                              </div>
                            </div>
                        </TableCell>
                        <TableCell className={`text-center py-5 md:py-7 border-y ${isDarkMode ? 'border-slate-800/80' : 'border-slate-50'}`}>
                          <div className={`inline-flex flex-col items-center p-3 rounded-2xl border transition-all duration-300 group-hover:bg-white dark:group-hover:bg-slate-800 group-hover:scale-105 group-hover:shadow-md ${isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-100'}`}>
                            <span className="text-base md:text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums leading-none">
                              {s.gwa_grade_10}
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-50 mt-1">GWA SCORE</span>
                          </div>
                        </TableCell>
                        <TableCell className={`text-right px-6 md:px-10 py-5 md:py-7 rounded-r-[2rem] border-y border-r ${isDarkMode ? 'border-slate-800/80' : 'border-slate-50'}`}>
                          <Link href="/admin/sections">
                            <button className={`p-3 rounded-2xl transition-all duration-300 transform group-hover:translate-x-2 shadow-sm hover:bg-blue-600 hover:text-white ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>
                              <ChevronRight size={20}/>
                            </button>
                          </Link>
                        </TableCell>
                      </TableRow>
                  ))}
                </TableBody>
            </Table>
           </div>
        </Card>
      </div>

      <Card 
        className="rounded-[3rem] md:rounded-[4rem] p-8 md:p-12 relative overflow-hidden flex flex-col justify-between transition-all duration-500 hover:shadow-2xl"
        style={{
          backgroundColor: isDarkMode ? themeColors.dark.surface : 'rgb(255, 255, 255)',
          borderColor: isDarkMode ? themeColors.dark.border : 'rgba(226, 232, 240, 0.5)'
        }}
      >
         <div>
            <div className="flex items-center gap-4 mb-10">
               <div className="p-4 bg-indigo-600 dark:bg-indigo-500 rounded-[1.5rem] text-white shadow-xl">
                 <PieIcon size={24} />
               </div>
               <div>
                 <ThemedText variant="h3" className="text-xl md:text-2xl font-black tracking-tight" isDarkMode={isDarkMode}>Strand Ratio</ThemedText>
                 <ThemedText variant="label" className="mt-1 font-black text-[10px] tracking-[0.2em] opacity-50 uppercase" isDarkMode={isDarkMode}>Share Distribution</ThemedText>
               </div>
            </div>
            <StrandPieChart data={pieData} total={stats.totalAccepted} isDarkMode={isDarkMode} />
         </div>
         <div className="space-y-4 mt-12">
            {pieData.map((item: any) => (
               <div 
                 key={item.name} 
                 className="flex justify-between items-center p-6 rounded-[2rem] border group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-default"
                 style={{
                   backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgb(248, 250, 252)',
                   borderColor: isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgb(241, 245, 249)'
                 }}
               >
                  <div className="flex items-center gap-5">
                     <div className="h-4 w-4 rounded-full shadow-lg border-2 border-white dark:border-slate-800" style={{ backgroundColor: item.color }} />
                     <span className={`text-[11px] font-black uppercase tracking-[0.2em] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                       {item.name}
                     </span>
                  </div>
                  <ThemedText variant="h3" className={`text-xl md:text-2xl font-black tabular-nums group-hover:scale-110 transition-transform ${isDarkMode ? 'text-white' : 'text-slate-900'}`} isDarkMode={isDarkMode}>
                    <AnimatedNumber value={item.value} />
                  </ThemedText>
               </div>
            ))}
         </div>
      </Card>
    </div>
  )
})