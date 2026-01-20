"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { ArrowLeft, CalendarClock, RefreshCw, AlertCircle, Wand2, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTheme } from "@/hooks/useTheme"
import { toast } from "sonner"

// Components
import { EnrollmentTrendChart } from "./components/EnrollmentTrendChart"
import { MarketPotentialChart } from "./components/MarketPotentialChart"
import { PredictionControlPanel } from "./components/PredictionControlPanel"
import { InsightMetrics } from "./components/InsightMetrics"
import { HistoryEditor } from "./components/HistoryEditor"
import { AnalyticPoint, SimulationMode } from "./types"

export default function PredictiveAnalytics() {
  const router = useRouter()
  const { isDarkMode: themeDarkMode, mounted } = useTheme()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Controls
  const [mode, setMode] = useState<SimulationMode>('ongoing')
  const [activeConfig, setActiveConfig] = useState<any>(null)
  const [simulationValue, setSimulationValue] = useState<number>(0)

  // Market Data Controls
  const [useAIAutofill, setUseAIAutofill] = useState(true)
  const [manualMarketData, setManualMarketData] = useState({
      jhs: 280000,
      als: 9000,
      others: 0
  })

  // Data Stores
  const [history, setHistory] = useState<any[]>([])
  const [currentStudentsCount, setCurrentStudentsCount] = useState<number>(0)

  // Sync with hook on mount/update
  useEffect(() => {
    setIsDarkMode(themeDarkMode)
  }, [themeDarkMode])

  // Listen for manual layout toggles for live updates (Matches Dashboard/Layout logic)
  useEffect(() => {
    const handleThemeChange = (e: any) => {
      setIsDarkMode(e.detail.mode === 'dark')
    }
    window.addEventListener('theme-change', handleThemeChange)
    return () => window.removeEventListener('theme-change', handleThemeChange)
  }, [])

  // --- AI ENGINE ---
  const predictMarketData = useCallback((historyData: any[]) => {
    if (!useAIAutofill) {
        return {
            predictedJHS: manualMarketData.jhs,
            predictedALS: manualMarketData.als,
            predictedOthers: manualMarketData.others
        }
    }

    // AI Logic
    const jhsData = historyData.map((h: any) => ({ y: parseInt(h.school_year.split('-')[0]), v: h.jhs_graduates_count || 0 })).filter((d: any) => d.v > 0).sort((a: any, b: any) => a.y - b.y)
    const alsData = historyData.map((h: any) => ({ y: parseInt(h.school_year.split('-')[0]), v: h.als_passers_count || 0 })).filter((d: any) => d.v > 0).sort((a: any, b: any) => a.y - b.y)

    const projectNextValue = (data: {y: number, v: number}[]) => {
      if (data.length === 0) return 0;
      if (data.length === 1) return Math.round(data[0].v * 1.02); 
      const recent = data.slice(-3);
      let growthSum = 0, count = 0;
      for (let i = 1; i < recent.length; i++) {
        const prev = recent[i-1].v; const curr = recent[i].v;
        if (prev > 0) { growthSum += (curr - prev) / prev; count++; }
      }
      const avgGrowth = count > 0 ? growthSum / count : 0.02; 
      return Math.round(data[data.length - 1].v * (1 + avgGrowth));
    }

    return {
      predictedJHS: projectNextValue(jhsData),
      predictedALS: projectNextValue(alsData),
      predictedOthers: 0 // Default 0 for AI, user can edit manually later
    }
  }, [useAIAutofill, manualMarketData])
  
  // --- CORE SYNC ---
  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true)
    
    try {
      const [configRes, historyRes, studentsRes] = await Promise.all([
        supabase.from('system_config').select('*').single(),
        supabase.from('enrollment_predictions_data').select('*').order('school_year', { ascending: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }).or('status.eq.Approved,status.eq.Accepted')
      ])

      const config = configRes.data || { school_year: '2025-2026' }
      setActiveConfig(config)
      
      const liveCount = studentsRes.count || 0
      setCurrentStudentsCount(liveCount)
      if (!isBackground && simulationValue === 0) setSimulationValue(liveCount)

      let rawHistory = historyRes.data || []
      let sortedHistory = [...rawHistory].sort((a: any, b: any) => parseInt(a.school_year) - parseInt(b.school_year))

      // LOGIC: RESTORE
      const currentYearStr = config.school_year
      const conflict = sortedHistory.find((h: any) => h.school_year === currentYearStr)
      if (conflict) {
         console.log(`RESTORE: Deleting ${currentYearStr}`)
         await supabase.from('enrollment_predictions_data').delete().eq('id', conflict.id)
         sortedHistory = sortedHistory.filter((h: any) => h.id !== conflict.id)
         toast.info(`Restored S.Y. ${currentYearStr}`)
      }

      // LOGIC: ARCHIVE
      const currentYearInt = parseInt(currentYearStr.split('-')[0])
      const prevYearInt = currentYearInt - 1
      const prevYearStr = `${prevYearInt}-${prevYearInt + 1}`
      const isPrevMissing = !sortedHistory.find((h: any) => h.school_year === prevYearStr) && prevYearInt >= 2021

      if (isPrevMissing) {
         console.log(`ARCHIVE: Saving ${prevYearStr}...`)
         const { predictedJHS, predictedALS, predictedOthers } = predictMarketData(sortedHistory)

         const newRecord = {
            id: crypto.randomUUID(), 
            school_year: prevYearStr,
            total_enrolled: liveCount, 
            jhs_graduates_count: predictedJHS, 
            als_passers_count: predictedALS,   
            others_count: predictedOthers,
            created_at: new Date().toISOString()
         }

         const { data: inserted } = await supabase.from('enrollment_predictions_data').insert(newRecord).select().single()

         if (inserted) {
             sortedHistory = [...sortedHistory, inserted].sort((a: any, b: any) => parseInt(a.school_year) - parseInt(b.school_year))
             toast.success(`Archived S.Y. ${prevYearStr}`)
         }
      }

      setHistory(sortedHistory)

    } catch (error) {
      console.error("Sync error:", error)
      if (!isBackground) toast.error("Failed to sync analytics")
    } finally {
      setLoading(false)
      setIsSyncing(false)
    }
  }, [simulationValue, predictMarketData]) 

  useEffect(() => { fetchData(false) }, [fetchData])

  useEffect(() => {
    const pollingInterval = setInterval(() => fetchData(true), 5000)
    const channel = supabase.channel('analytics-live-v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, () => {
         toast("📅 School Year Changed", { description: "Updating archives and projections..." })
         fetchData(true)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollment_predictions_data' }, () => fetchData(true))
      .subscribe()
    return () => { clearInterval(pollingInterval); supabase.removeChannel(channel) }
  }, [fetchData])

  // ANALYTICS BUILDER
  const analyticsData = useMemo<AnalyticPoint[]>(() => {
    const config = activeConfig || { school_year: '2025-2026' }
    const currentYearStr = config.school_year
    const currentYearInt = parseInt(currentYearStr.split('-')[0])
    
    let pivotTotal = currentStudentsCount
    if (mode === 'simulation') pivotTotal = simulationValue

    const combinedData: AnalyticPoint[] = []

    // 1. History
    history.forEach(h => {
        const hYearInt = parseInt(h.school_year.split('-')[0])
        if (hYearInt >= 2021 && hYearInt < currentYearInt) {
            combinedData.push({
                year: h.school_year,
                sortYear: hYearInt,
                total: h.total_enrolled,
                historicalTotal: h.total_enrolled,
                futureTotal: null,
                marketJHS: h.jhs_graduates_count || 0,
                marketALS: h.als_passers_count || 0,
                marketTransferees: h.others_count || 0, // <--- MAPPED HERE
                type: 'historical'
            })
        }
    })

    // 2. Current Point
    const { predictedJHS, predictedALS, predictedOthers } = predictMarketData(history)
    
    combinedData.push({
        year: currentYearStr,
        sortYear: currentYearInt,
        total: pivotTotal,
        historicalTotal: pivotTotal, 
        futureTotal: pivotTotal, 
        marketJHS: predictedJHS,
        marketALS: predictedALS,
        marketTransferees: predictedOthers, // <--- MAPPED HERE
        type: 'current'
    })

    // 3. Projections
    combinedData.sort((a, b) => a.sortYear - b.sortYear)

    let growthRates: number[] = []
    for (let i = 1; i < combinedData.length; i++) {
        const prev = combinedData[i-1].total; const curr = combinedData[i].total;
        if (prev > 0) growthRates.push((curr - prev) / prev)
    }
    const avgGrowth = growthRates.length > 0 ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length : 0.05 

    let previousTotal = pivotTotal
    for (let year = currentYearInt + 1; year <= 2030; year++) {
       const label = `${year}-${year + 1}`
       const projectedTotal = Math.round(previousTotal * (1 + Math.abs(avgGrowth)))
       combinedData.push({
           year: label,
           sortYear: year,
           total: projectedTotal,
           historicalTotal: null,
           futureTotal: projectedTotal,
           marketJHS: 0, marketALS: 0, marketTransferees: 0,
           type: 'future'
       })
       previousTotal = projectedTotal
    }
    return combinedData
  }, [history, currentStudentsCount, activeConfig, mode, simulationValue, predictMarketData])

  // METRICS
  const metrics = useMemo(() => {
    const current = analyticsData.find(d => d.type === 'current')
    const next = analyticsData.find(d => d.type === 'future')
    const lastYear = analyticsData.find(d => d.sortYear === (current?.sortYear || 0) - 1)
    
    if (!current || !next) return { growth: "0", nextTotal: 0, lowestPossible: 0, highestPossible: 0 }

    let growth = 0
    if (lastYear && lastYear.total > 0) {
      growth = ((current.total - lastYear.total) / lastYear.total) * 100
    }
    
    const totals = analyticsData.filter(d => d.type === 'historical' || d.type === 'current').map(d => d.total)
    let historicalGrowthRates: number[] = []
    for (let i = 1; i < totals.length; i++) {
        if (totals[i-1] > 0) historicalGrowthRates.push((totals[i] - totals[i-1]) / totals[i-1])
    }
    let mean = 0.05, stdDev = 0.02 
    if (historicalGrowthRates.length > 0) {
        mean = historicalGrowthRates.reduce((a, b) => a + b, 0) / historicalGrowthRates.length
        const variance = historicalGrowthRates.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / historicalGrowthRates.length
        stdDev = Math.sqrt(variance)
    }
    const zScore = 1.28; 
    const lowestPossible = Math.round(current.total * (1 + (mean - zScore * stdDev)))
    const highestPossible = Math.round(current.total * (1 + (mean + zScore * stdDev)))

    return { growth: growth.toFixed(1), nextTotal: next.total, lowestPossible, highestPossible }
  }, [analyticsData])

  if (!mounted) return null

  if (loading && !activeConfig) return (
    <div className={`min-h-screen flex flex-col items-center justify-center gap-4 text-slate-400 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
       <RefreshCw className="animate-spin text-blue-600 w-12 h-12" />
       <p className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing Neural Network...</p>
    </div>
  )

  return (
    <div className="space-y-8 p-4 md:p-8 pb-20 transition-colors animate-in fade-in duration-700">
        
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
            <div className="space-y-1">
                <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-blue-600">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Button>
                
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className={`text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${isDarkMode ? 'from-blue-400 via-purple-400 to-pink-400' : 'from-blue-600 via-purple-600 to-pink-600'}`}>Predictive Analysis</h2>
                  
                  {activeConfig && (
                    <Badge variant="outline" className={`text-lg py-1 px-3 gap-2 shadow-sm ${isDarkMode ? 'bg-blue-950/30 border-blue-800 text-blue-300' : 'bg-white border-blue-200 text-blue-700'}`}>
                        <CalendarClock className="w-4 h-4" />
                        S.Y. {activeConfig.school_year}
                    </Badge>
                  )}
                  {isSyncing && (
                      <Badge variant="secondary" className={`gap-1 animate-pulse ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                          <RefreshCw className="w-3 h-3 animate-spin"/> Syncing...
                      </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4">
                    <p className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Enrollment & Market Forecasting
                    </p>
                    {/* HISTORY EDITOR ADDED HERE */}
                    <HistoryEditor historyData={history} isDarkMode={isDarkMode} />
                </div>
            </div>

            <PredictionControlPanel 
                mode={mode} 
                setMode={setMode} 
                simulationValue={simulationValue} 
                setSimulationValue={setSimulationValue}
                currentRealValue={currentStudentsCount}
                isDarkMode={isDarkMode}
            />
        </div>

        {/* METRICS */}
        <InsightMetrics 
            projectedGrowth={metrics.growth}
            nextYearTotal={metrics.nextTotal}
            lowestPossible={metrics.lowestPossible}
            highestPossible={metrics.highestPossible}
            isSimulation={mode === 'simulation'}
            isDarkMode={isDarkMode}
        />

        {/* CHART */}
        <Card className={`border shadow-sm transition-all duration-300 hover:shadow-md ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <span className="w-2 h-6 rounded-full bg-gradient-to-b from-blue-500 to-purple-500"></span>
                    Enrollment Graph
                </CardTitle>
                <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                   {mode === 'simulation' ? "Simulating future outcomes..." : "LIVE"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <EnrollmentTrendChart data={analyticsData} isDarkMode={isDarkMode} mode={mode} />
            </CardContent>
        </Card>

        {/* BOTTOM SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className={`border shadow-sm transition-all duration-300 hover:shadow-md ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <span className="w-2 h-6 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500"></span>
                        External Source (NCR)
                    </CardTitle>
                    <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                        Total Graduates (JHS) vs Passers (ALS) in the Region.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <MarketPotentialChart data={analyticsData} isDarkMode={isDarkMode} />
                </CardContent>
            </Card>

            <Card className={`border shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <span className="w-2 h-6 rounded-full bg-gradient-to-b from-pink-500 to-rose-500"></span>
                        Tools
                    </CardTitle>
                    <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Configure prediction model & market data sources.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    
                    <div className="space-y-4">
                        <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                             <div className="flex items-center gap-3">
                                {useAIAutofill ? <Wand2 className="w-5 h-5 text-purple-500 animate-pulse" /> : <Settings2 className="w-5 h-5 text-slate-500" />}
                                <div>
                                    <h4 className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>AI Market Autofill</h4>
                                    <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {useAIAutofill ? "Automatically predicts market data based on history" : "Using manual overrides"}
                                    </p>
                                </div>
                             </div>
                             <Button size="sm" variant={useAIAutofill ? "default" : "outline"} onClick={() => setUseAIAutofill(!useAIAutofill)} className={useAIAutofill ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-none shadow-md" : `border ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                                {useAIAutofill ? "Active" : "Disabled"}
                             </Button>
                        </div>

                        {!useAIAutofill && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label className={`text-[10px] uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>JHS Graduates</Label>
                                    <Input type="number" min="50000" value={manualMarketData.jhs} onChange={(e) => setManualMarketData({...manualMarketData, jhs: Math.max(0, parseInt(e.target.value) || 0)})} className={`font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`} />
                                </div>
                                <div className="space-y-2">
                                    <Label className={`text-[10px] uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>ALS Passers</Label>
                                    <Input type="number" min="1000" value={manualMarketData.als} onChange={(e) => setManualMarketData({...manualMarketData, als: Math.max(0, parseInt(e.target.value) || 0)})} className={`font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`} />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label className={`text-[10px] uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Payees / Others</Label>
                                    <Input 
                                        type="number" 
                                        min="0"
                                        value={manualMarketData.others} 
                                        onChange={(e) => setManualMarketData({...manualMarketData, others: Math.max(0, parseInt(e.target.value) || 0)})}
                                        className={`font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                    />
                                    <p className="text-[10px] text-slate-400 text-right">Added to total count</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`p-4 rounded-xl border space-y-3 ${isDarkMode ? 'bg-purple-950/30 border-purple-900/50' : 'bg-purple-50 border-purple-100'}`}>
                         <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                            <div>
                                <h4 className={`font-semibold text-sm ${isDarkMode ? 'text-purple-200' : 'text-purple-900'}`}>Archive Strategy</h4>
                                <p className={`text-xs mt-1 ${isDarkMode ? 'text-purple-300/80' : 'text-purple-700'}`}>
                                    {useAIAutofill 
                                        ? "When a school year ends, the system will extrapolate market trends to save a predicted JHS/ALS count."
                                        : "The system will use your MANUAL inputs above when saving the archival record for the current year."
                                    }
                                </p>
                            </div>
                         </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  )
}