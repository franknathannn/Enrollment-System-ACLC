// src/app/admin/dashboard/components/sections.tsx

"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { 
  CheckCircle2, Cpu, BookText, Clock, Calendar, Zap, TrendingUp, TrendingDown, 
  Target, Activity, Users, Banknote, Landmark, Timer, Trophy, PieChart as PieIcon, 
  ChevronRight, User, UserCircle2 
} from "lucide-react"
import { ThemedText } from "@/components/ThemedText"
import { themeColors } from "@/lib/themeColors"
import Link from "next/link"
import { AnimatedNumber, MetricCard, StatCard, VelocityChart, StrandPieChart } from "./primitives"

export function OverviewGrid({ stats, isDarkMode }: { stats: any, isDarkMode: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
      <StatCard title="Students Enrolled" value={<AnimatedNumber value={stats.totalAccepted} />} icon={<CheckCircle2 />} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50" trend="Registry Sync" isDarkMode={isDarkMode} />
      <StatCard title="ICT Enrolled" value={<AnimatedNumber value={stats.ictAccepted} />} icon={<Cpu />} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50" trend="Active Matrix" isDarkMode={isDarkMode} />
      <StatCard title="GAS Enrolled" value={<AnimatedNumber value={stats.gasAccepted} />} icon={<BookText />} color="text-orange-600 dark:text-orange-400" bg="bg-orange-50" trend="Active Matrix" isDarkMode={isDarkMode} />
      <StatCard title="Pending Applicants" value={<AnimatedNumber value={stats.pending} />} icon={<Clock />} color="text-amber-600 dark:text-amber-400" bg="bg-amber-50" trend="Live Intake" isDarkMode={isDarkMode} />
    </div>
  )
}

export function CensusGrid({ stats, totalMaleEnrollees, totalFemaleEnrollees, isDarkMode }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
      <MetricCard 
        label="Male Student Enrolled" 
        value={<AnimatedNumber value={stats.males} />}
        colorLight="linear-gradient(135deg, rgb(59, 130, 246), rgb(37, 99, 235))" 
        colorDark="linear-gradient(135deg, rgb(59, 130, 246), rgb(29, 78, 216))"
        icon={<User size={48}/>}
        isDarkMode={isDarkMode}
      />
      <MetricCard 
        label="Female Student Enrolled" 
        value={<AnimatedNumber value={stats.females} />}
        colorLight="linear-gradient(135deg, rgb(236, 72, 153), rgb(219, 39, 119))" 
        colorDark="linear-gradient(135deg, rgb(244, 114, 182), rgb(236, 72, 153))"
        icon={<UserCircle2 size={48}/>}
        isDarkMode={isDarkMode}
      />
      <MetricCard 
        label="Current Male Enrollee" 
        value={<AnimatedNumber value={stats.pendingMales} />}
        colorLight="linear-gradient(135deg, rgba(30, 64, 175, 0.9), rgba(30, 58, 138, 0.9))" 
        colorDark="linear-gradient(135deg, rgba(30, 58, 138, 0.7), rgba(23, 37, 84, 0.7))"
        icon={<User size={48} className="opacity-70"/>}
        isDarkMode={isDarkMode}
      />
      <MetricCard 
        label="Current Female Enrollee" 
        value={<AnimatedNumber value={stats.pendingFemales} />}
        colorLight="linear-gradient(135deg, rgba(190, 24, 93, 0.9), rgba(157, 23, 77, 0.9))" 
        colorDark="linear-gradient(135deg, rgba(157, 23, 77, 0.7), rgba(131, 24, 67, 0.7))"
        icon={<UserCircle2 size={48} className="opacity-70"/>}
        isDarkMode={isDarkMode}
      />
      <MetricCard 
        label="TOTAL MALE ENROLLEE" 
        value={<AnimatedNumber value={totalMaleEnrollees} />}
        colorLight="linear-gradient(135deg, rgb(30, 58, 138), rgb(15, 23, 42))" 
        colorDark="linear-gradient(135deg, rgb(30, 58, 138), rgb(15, 23, 42))"
        icon={<User size={48} className="text-blue-200 opacity-50"/>}
        isDarkMode={isDarkMode}
      />
      <MetricCard 
        label="TOTAL FEMALE ENROLLEE" 
        value={<AnimatedNumber value={totalFemaleEnrollees} />}
        colorLight="linear-gradient(135deg, rgb(131, 24, 67), rgb(80, 7, 36))" 
        colorDark="linear-gradient(135deg, rgb(80, 7, 36), rgb(60, 5, 25))"
        icon={<UserCircle2 size={48} className="text-pink-200 opacity-50"/>}
        isDarkMode={isDarkMode}
      />
    </div>
  )
}

export function VelocitySection({ trendData, isDarkMode }: any) {
  return (
    <Card 
      className="p-6 md:p-10 rounded-[32px] md:rounded-[56px] shadow-2xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden transition-all duration-500"
      style={{
        backgroundColor: isDarkMode ? themeColors.dark.surface : themeColors.light.surface,
        borderColor: isDarkMode ? themeColors.dark.border : 'rgba(168, 85, 247, 0.2)'
      }}
    >
       <div className="flex flex-col sm:flex-row justify-between items-start mb-10 gap-4">
          <div>
             <ThemedText variant="h3" className="flex items-center gap-3 md:text-2xl" isDarkMode={isDarkMode}>
               <Calendar className="text-blue-600 dark:text-blue-400" /> Enrollment Velocity
             </ThemedText>
             <ThemedText variant="label" className="mt-1" isDarkMode={isDarkMode}>30-Day Registration Analytics</ThemedText>
          </div>
          <Badge className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-none font-black text-[9px] uppercase px-4 py-2">LIVE DATA FEED</Badge>
       </div>
       <VelocityChart data={trendData} isDarkMode={isDarkMode} />
    </Card>
  )
}

export function SpikeAnalyticsSection({ spikeAnalysis, stats, system, isDarkMode }: any) {
  return (
    <Card 
      className="p-6 md:p-10 rounded-[32px] md:rounded-[56px] shadow-2xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden transition-all duration-500"
      style={{
        backgroundColor: isDarkMode ? themeColors.dark.surface : themeColors.light.surface,
        borderColor: isDarkMode ? themeColors.dark.border : themeColors.light.border
      }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
        <div>
          <ThemedText variant="h3" className="flex items-center gap-3 md:text-2xl" isDarkMode={isDarkMode}>
            <Zap className="text-amber-600 dark:text-amber-400" /> Enrollment Spike Analytics
          </ThemedText>
          <ThemedText variant="label" className="mt-1" isDarkMode={isDarkMode}>Capacity Monitoring Analytics</ThemedText>
        </div>
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div 
          className="p-6 rounded-3xl border transition-all duration-300"
          style={{
            backgroundColor: isDarkMode ? 'rgb(30, 41, 59)' : 'rgb(241, 245, 249)',
            borderColor: isDarkMode ? 'rgb(51, 65, 85)' : 'rgb(226, 232, 240)'
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            {spikeAnalysis.isGrowth ? (
              <TrendingUp size={16} className="text-emerald-500 dark:text-emerald-400" />
            ) : (
              <TrendingDown size={16} className="text-red-500 dark:text-red-400" />
            )}
            <ThemedText variant="label" isDarkMode={isDarkMode}>Weekly Trend</ThemedText>
          </div>
          <div className="flex items-baseline gap-2">
            <ThemedText variant="h2" className="text-2xl md:text-3xl" isDarkMode={isDarkMode}>
              {spikeAnalysis.isGrowth ? '+' : ''}{spikeAnalysis.weeklyChange}%
            </ThemedText>
          </div>
        </div>

        <div 
          className="p-6 rounded-3xl border transition-all duration-300"
          style={{
            backgroundColor: isDarkMode ? 'rgb(30, 41, 59)' : 'rgb(241, 245, 249)',
            borderColor: isDarkMode ? 'rgb(51, 65, 85)' : 'rgb(226, 232, 240)'
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-blue-600 dark:text-blue-400" />
            <ThemedText variant="label" isDarkMode={isDarkMode}>Avg Daily Intake</ThemedText>
          </div>
          <ThemedText variant="h2" className="text-2xl md:text-3xl" isDarkMode={isDarkMode}>
            {spikeAnalysis.avgDaily}
          </ThemedText>
        </div>

        <div 
          className="p-6 rounded-3xl border transition-all duration-300"
          style={{
            backgroundColor: isDarkMode ? 'rgb(30, 41, 59)' : 'rgb(241, 245, 249)',
            borderColor: isDarkMode ? 'rgb(51, 65, 85)' : 'rgb(226, 232, 240)'
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-purple-600 dark:text-purple-400" />
            <ThemedText variant="label" isDarkMode={isDarkMode}>Peak Day</ThemedText>
          </div>
          <ThemedText variant="h2" className="text-xl md:text-2xl" isDarkMode={isDarkMode}>
            <AnimatedNumber value={spikeAnalysis.peakDay.count} />
          </ThemedText>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">
            {spikeAnalysis.peakDay.date}
          </p>
        </div>

        <div 
          className="p-6 rounded-3xl border transition-all duration-300"
          style={{
            backgroundColor: isDarkMode ? 'rgb(30, 41, 59)' : 'rgb(241, 245, 249)',
            borderColor: isDarkMode ? 'rgb(51, 65, 85)' : 'rgb(226, 232, 240)'
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-orange-600 dark:text-orange-400" />
            <ThemedText variant="label" isDarkMode={isDarkMode}>Slots Remaining</ThemedText>
          </div>
          <ThemedText variant="h2" className="text-2xl md:text-3xl" isDarkMode={isDarkMode}>
            <AnimatedNumber value={spikeAnalysis.remainingCapacity} />
          </ThemedText>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <ThemedText variant="label" isDarkMode={isDarkMode}>Capacity Utilization</ThemedText>
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
}

export function RevenueSection({ revenueMatrix, prediction, comparison, isDarkMode }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <Card 
          className="lg:col-span-2 p-6 md:p-12 rounded-[32px] md:rounded-[56px] shadow-2xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden group transition-all duration-500"
          style={{
            backgroundColor: isDarkMode ? themeColors.dark.surface : 'rgba(240, 253, 244, 0.5)',
            borderColor: isDarkMode ? themeColors.dark.border : 'rgba(187, 247, 208, 0.5)'
          }}
        >
           <div className="absolute top-0 right-0 p-10 opacity-5 md:opacity-10 group-hover:opacity-20 transition-opacity">
             <Banknote size={120} className="text-emerald-600 dark:text-emerald-400" />
           </div>
           <div className="relative z-10 space-y-10">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                 <div>
                    <ThemedText variant="h3" className="flex items-center gap-3 md:text-2xl" isDarkMode={isDarkMode}>
                      <Landmark className="text-emerald-500 dark:text-emerald-400" /> Revenue Matrix
                    </ThemedText>
                    <ThemedText variant="label" className="mt-1" isDarkMode={isDarkMode}>Registrar Monitoring (₱{revenueMatrix.voucherLabel.toLocaleString()} / Alumni)</ThemedText>
                 </div>
                 <div className="text-left sm:text-right">
                    <p className="text-3xl md:text-5xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">₱{revenueMatrix.currentRevenue.toLocaleString()}</p>
                    <ThemedText variant="label" className="mt-1" isDarkMode={isDarkMode}>Total Active Funding</ThemedText>
                 </div>
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <span>Liquidity Progress</span>
                    <span className="hidden sm:inline">Target: ₱{(revenueMatrix.totalPotential / 1000000).toFixed(1)}M (Campus Cap)</span>
                 </div>
                 <div className="h-5 w-full rounded-2xl overflow-hidden p-1 shadow-inner border border-emerald-100 dark:border-none" style={{ backgroundColor: isDarkMode ? 'rgb(30 41 59)' : 'rgb(226 232 240)' }}>
                    <div 
                      className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-xl transition-all duration-1000" 
                      style={{ 
                        width: `${revenueMatrix.fundingProgress}%`,
                        boxShadow: isDarkMode ? '0 0 20px rgba(52, 211, 153, 0.3)' : '0 0 20px rgba(16, 185, 129, 0.3)'
                      }} 
                    />
                 </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-10 pt-4 border-t border-slate-50 dark:border-slate-800">
                 <div className="space-y-2">
                    <ThemedText variant="label" isDarkMode={isDarkMode}>ICT Revenue contribution</ThemedText>
                    <ThemedText variant="h3" className="md:text-2xl" isDarkMode={isDarkMode}>₱{(revenueMatrix.qualifiedICT * revenueMatrix.voucherLabel).toLocaleString()}</ThemedText>
                 </div>
                 <div className="space-y-2 sm:text-right">
                    <ThemedText variant="label" isDarkMode={isDarkMode}>GAS Revenue contribution</ThemedText>
                    <ThemedText variant="h3" className="md:text-2xl" isDarkMode={isDarkMode}>₱{(revenueMatrix.qualifiedGAS * revenueMatrix.voucherLabel).toLocaleString()}</ThemedText>
                 </div>
              </div>
           </div>
        </Card>

        <Card 
          className="p-6 md:p-10 rounded-[32px] md:rounded-[56px] relative overflow-hidden flex flex-col justify-between min-h-[300px] shadow-2xl shadow-blue-100 dark:shadow-none transition-all duration-500"
          style={{
            background: isDarkMode ? themeColors.dark.surface : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            borderColor: isDarkMode ? themeColors.dark.border : 'transparent'
          }}
        >
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -mr-10 -mt-10" />
           <div className="relative z-10 space-y-8">
              <h3 className={`text-lg font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-blue-300' : 'text-white'}`}>
                <Timer size={20} className={isDarkMode ? "text-blue-400" : "text-white"} /> Saturation Forecast
              </h3>
              <div>
                 <p className={`text-5xl md:text-7xl font-black tracking-tighter leading-none ${isDarkMode ? 'text-white' : 'text-white'}`}>
                   <AnimatedNumber value={prediction.days} /> 
                 </p>
                 <p className={`text-xs md:text-sm font-black uppercase tracking-widest mt-4 italic ${isDarkMode ? 'text-slate-500' : 'text-blue-100'}`}>
                   Days to 100% based on {prediction.speed} intakes/day.
                 </p>
              </div>
           </div>
           <div className={`relative z-10 p-4 md:p-6 rounded-3xl border mt-6 ${isDarkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-white/10 border-white/20'}`}>
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-100'}`}>Baseline comparison</p>
              <p className={`text-xs font-medium leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-white'}`}>System is performing at {comparison.percent}% efficiency vs {comparison.prevYear || 'baseline'}.</p>
           </div>
        </Card>
    </div>
  )
}

export function CapacitySection({ capacityPercentage, stats, system, topJHSLeaders, pieData, isDarkMode }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
      <div className="lg:col-span-2 space-y-10">
        <Card 
          className="p-6 md:p-12 rounded-[32px] md:rounded-[56px] shadow-2xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden group transition-all duration-500"
          style={{
            backgroundColor: isDarkMode ? themeColors.dark.surface : themeColors.light.surface,
            borderColor: isDarkMode ? themeColors.dark.border : themeColors.light.border
          }}
        >
          <div className="relative z-10 space-y-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div className="space-y-2">
                <ThemedText variant="label" className="tracking-[0.4em]" isDarkMode={isDarkMode}>Campus Capacity Status</ThemedText>
                <ThemedText variant="h2" className="text-3xl md:text-5xl leading-none" isDarkMode={isDarkMode}>Saturation: {capacityPercentage.toFixed(1)}%</ThemedText>
              </div>
              <Badge className={`px-4 py-2 rounded-full font-black text-[10px] uppercase shadow-lg border-none ${capacityPercentage > 90 ? 'bg-red-500 text-white' : 'bg-blue-600 dark:bg-blue-500 text-white'}`}>
                {capacityPercentage > 90 ? 'Critical' : 'Operational'}
              </Badge>
            </div>
            <div className="space-y-6">
              <div className="h-6 w-full rounded-3xl overflow-hidden p-1.5 shadow-inner" style={{ backgroundColor: isDarkMode ? 'rgb(30 41 59)' : 'rgb(226 232 240)' }}>
                <div 
                  className={`h-full transition-all duration-1000 ease-out rounded-2xl ${capacityPercentage > 90 ? 'bg-red-500' : capacityPercentage > 75 ? 'bg-orange-500 dark:bg-orange-400' : 'bg-blue-600 dark:bg-blue-500'}`} 
                  style={{ width: `${capacityPercentage}%` }} 
                />
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
                 <span><AnimatedNumber value={stats.totalAccepted} /> Students Handled</span>
                 <span>Capacity: {system.capacity}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card 
          className="rounded-[32px] md:rounded-[56px] shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden transition-all duration-500 border-2"
          style={{
            backgroundColor: isDarkMode ? themeColors.dark.surface : themeColors.light.surface,
            borderColor: isDarkMode ? themeColors.dark.border : themeColors.light.border
          }}
        >
           <div 
            className="p-6 md:p-10 border-b-2 dark:bg-slate-800/30 flex justify-between items-center"
            style={{ 
              borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : '#939393',
              backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.3)' : 'rgba(251, 255, 0, 0.19)'
              }}
           >
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-yellow-500 dark:bg-yellow-600 rounded-2xl text-white shadow-lg">
                   <Trophy size={20} />
                 </div>
                 <div>
                   <ThemedText variant="h3" className="text-lg md:text-xl" isDarkMode={isDarkMode}>Academic Leaders</ThemedText>
                   <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDarkMode ? 'text-slate-400' : 'text-black'}`}>JHS Excellence Board</p>
                 </div>
              </div>
              <Badge className="bg-slate-900 dark:bg-slate-700 text-white border-none font-black text-[9px] uppercase px-4 py-2">Top 10</Badge>
           </div>
           <div className="overflow-x-auto">
            <Table className="border-separate border-spacing-y-4 px-4 md:px-6">
                <TableBody>
                  {topJHSLeaders.map((s: any, idx: number) => (
                      <TableRow key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group relative">
                        <TableCell className="px-4 md:px-10 py-4 md:py-6 min-w-[200px] relative">
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${s.gender === 'Male' ? 'bg-blue-500 dark:bg-blue-400' : 'bg-pink-500 dark:bg-pink-400'}`} />
                            <div className="flex items-center gap-3 md:gap-5 pl-2">
                            <span className="text-xs font-black text-slate-400 dark:text-slate-500 w-auto">
                              #{idx + 1} {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''}
                            </span>
                              <div>
                                  <ThemedText variant="caption" className="text-slate-900 dark:text-white text-xs" isDarkMode={isDarkMode}>{s.last_name}, {s.first_name}</ThemedText>
                                  <ThemedText variant="label" isDarkMode={isDarkMode}>{s.strand} Section </ThemedText>
                              </div>
                            </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[10px] px-3 md:px-5 py-1.5 rounded-full">
                            {s.gwa_grade_10} GWA
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-4 md:px-10">
                          <Link href="/admin/sections">
                            <button className="p-2 text-slate-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              <ChevronRight size={18}/>
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
        className="rounded-[32px] md:rounded-[56px] shadow-2xl shadow-slate-200/50 dark:shadow-none p-6 md:p-10 relative overflow-hidden flex flex-col justify-between transition-all duration-500"
        style={{
          backgroundColor: isDarkMode ? themeColors.dark.surface : themeColors.light.surface,
          borderColor: isDarkMode ? themeColors.dark.border : themeColors.light.border
        }}
      >
         <div>
            <div className="flex items-center gap-3 mb-8">
               <div className="p-2.5 bg-blue-600 dark:bg-blue-500 rounded-2xl text-white shadow-lg">
                 <PieIcon size={20} />
               </div>
               <div>
                 <ThemedText variant="h3" className="text-lg" isDarkMode={isDarkMode}>Strand Ratio</ThemedText>
                 <ThemedText variant="label" className="mt-1" isDarkMode={isDarkMode}>Strand Share</ThemedText>
               </div>
            </div>
            <StrandPieChart data={pieData} total={stats.totalAccepted} isDarkMode={isDarkMode} />
         </div>
         <div className="space-y-4 mt-8 px-2">
            {pieData.map((item: any) => (
               <div 
                 key={item.name} 
                 className="flex justify-between items-center p-4 md:p-5 rounded-3xl border group transition-all cursor-default"
                 style={{
                   backgroundColor: isDarkMode ? 'rgb(30, 41, 59)' : 'rgb(241, 245, 249)',
                   borderColor: isDarkMode ? 'rgb(51, 65, 85)' : 'rgb(226, 232, 240)'
                 }}
               >
                  <div className="flex items-center gap-4">
                     <div className="h-3 w-3 rounded-full shadow-lg" style={{ backgroundColor: item.color }} />
                     <span className={`text-[10px] font-black uppercase tracking-widest group-hover:text-blue-600 dark:group-hover:text-white ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                       {item.name}
                     </span>
                  </div>
                  <ThemedText variant="h3" className={`text-lg group-hover:text-blue-600 dark:group-hover:text-blue-300 ${isDarkMode ? 'text-white' : 'text-slate-900'}`} isDarkMode={isDarkMode}>
                    <AnimatedNumber value={item.value} />
                  </ThemedText>
               </div>
            ))}
         </div>
      </Card>
    </div>
  )
}
