"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { ArrowLeft, CalendarClock, RefreshCw, AlertCircle, Wand2, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "@/hooks/useTheme"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Components
import { EnrollmentTrendChart } from "./components/EnrollmentTrendChart"
import { MarketPotentialChart } from "./components/MarketPotentialChart"
import { PredictionControlPanel } from "./components/PredictionControlPanel"
import { InsightMetrics } from "./components/InsightMetrics"
import { HistoryEditor } from "./components/HistoryEditor"
import { AnalyticPoint, SimulationMode, HistoryRecord } from "./types"

// Helper: Linear Regression (Least Squares)
const calculateRegression = (values: number[]) => {
  const n = values.length
  if (n < 2) return { m: 0, b: values[0] || 0 }
  
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += values[i]
    sumXY += i * values[i]
    sumXX += i * i
  }
  
  const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const b = (sumY - m * sumX) / n
  
  return { m, b }
}

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
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>("")

  // Market Data Controls
  const [useAIAutofill, setUseAIAutofill] = useState(true)
  const [manualMarketData, setManualMarketData] = useState({
      jhs: 280000,
      als: 9000,
      others: 0
  })

  // Data Stores
  const [history, setHistory] = useState<HistoryRecord[]>([])
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
  
  // Ref to access latest prediction logic inside fetchData without triggering re-fetches
  const predictMarketDataRef = useRef(predictMarketData)
  useEffect(() => { predictMarketDataRef.current = predictMarketData }, [predictMarketData])

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
         const { predictedJHS, predictedALS, predictedOthers } = predictMarketDataRef.current(sortedHistory)
         // Use expected from history for prev year's total (liveCount is for current year)
         const prevYearTotals = sortedHistory.map((h: { total_enrolled: number }) => h.total_enrolled).filter((t: number) => t != null && t > 0)
         let prevYearExpected = liveCount
         if (prevYearTotals.length >= 2) {
           const rates: number[] = []
           for (let i = 1; i < prevYearTotals.length; i++) {
             if (prevYearTotals[i - 1] > 0) rates.push((prevYearTotals[i] - prevYearTotals[i - 1]) / prevYearTotals[i - 1])
           }
           const avgG = rates.length > 0 ? rates.reduce((a: number, b: number) => a + b, 0) / rates.length : 0.05
           prevYearExpected = Math.round(prevYearTotals[prevYearTotals.length - 1] * (1 + avgG))
         }

         const newRecord = {
            id: crypto.randomUUID(), 
            school_year: prevYearStr,
            total_enrolled: prevYearExpected, 
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

      // Sync selected school year when config loads (first time or year change)
      if (!isBackground) {
        setSelectedSchoolYear((prev) => prev || config.school_year)
      }
    } catch (error) {
      console.error("Sync error:", error)
      if (!isBackground) toast.error("Failed to sync analytics")
    } finally {
      setLoading(false)
      setIsSyncing(false)
    }
  }, []) 

  // Initialize simulation value once data is loaded
  useEffect(() => {
    if (currentStudentsCount > 0 && simulationValue === 0) {
      setSimulationValue(currentStudentsCount)
    }
  }, [currentStudentsCount])

  useEffect(() => { fetchData(false) }, [fetchData])

  // Keep selectedSchoolYear in sync when activeConfig loads
  useEffect(() => {
    if (activeConfig?.school_year && !selectedSchoolYear) {
      setSelectedSchoolYear(activeConfig.school_year)
    }
  }, [activeConfig?.school_year, selectedSchoolYear])

  // Available school years: current + all from history, sorted newest first
  const availableSchoolYears = useMemo(() => {
    const current = activeConfig?.school_year
    const fromHistory = (history || []).map((h: { school_year: string }) => h.school_year)
    const unique = Array.from(new Set([current, ...fromHistory].filter(Boolean)))
    return unique.sort((a, b) => parseInt(b) - parseInt(a))
  }, [activeConfig?.school_year, history])

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

  // Pivot year for analytics (filter selection)
  const pivotYearStr = selectedSchoolYear || activeConfig?.school_year || '2025-2026'

  // ANALYTICS BUILDER — Projections from historical backtracking only (never from current count)
  const analyticsData = useMemo<AnalyticPoint[]>(() => {
    const config = activeConfig || { school_year: '2025-2026' }
    const currentYearStr = pivotYearStr
    const currentYearInt = parseInt(currentYearStr.split('-')[0])
    const isViewingActiveYear = currentYearStr === config.school_year

    // For current point: use live count when viewing active year, else get from history
    const pivotTotal = isViewingActiveYear
      ? (mode === 'simulation' ? simulationValue : currentStudentsCount)
      : (history.find((h) => h.school_year === currentYearStr)?.total_enrolled ?? 0)

    const combinedData: AnalyticPoint[] = []

    // 1. History (years before pivot)
    const historicalTotals: number[] = []
    history.forEach(h => {
        const hYearInt = parseInt(h.school_year.split('-')[0])
        if (hYearInt >= 2021 && hYearInt < currentYearInt) {
            historicalTotals.push(h.total_enrolled)
            combinedData.push({
                year: h.school_year,
                sortYear: hYearInt,
                total: h.total_enrolled,
                historicalTotal: h.total_enrolled,
                futureStable: null,
                futureDeclining: null,
                marketJHS: h.jhs_graduates_count || 0,
                marketALS: h.als_passers_count || 0,
                marketTransferees: h.others_count || 0,
                type: 'historical'
            })
        }
    })

    // 2. Regression Models
    // Scenario 1: Stable (History only)
    let regStable = calculateRegression(historicalTotals)
    
    // "Smart Optimism": If long-term trend is negative but recent trend (last 3 years) is positive,
    // use the recent trend for the "Stable/Optimistic" scenario.
    if (regStable.m < 0 && historicalTotals.length >= 3) {
        const recent = historicalTotals.slice(-3)
        const regRecent = calculateRegression(recent)
        if (regRecent.m > 0) {
            const offset = historicalTotals.length - recent.length
            regStable = { m: regRecent.m, b: regRecent.b - (regRecent.m * offset) }
        }
    }

    // Predict Current Year (x = length of history)
    const expectedCurrentYear = Math.max(0, Math.round(regStable.m * historicalTotals.length + regStable.b))

    // LOGIC CHANGE: Projection Baseline
    // Use expected outcome unless current exceeds it.
    const projectionBaseline = isViewingActiveYear 
        ? Math.max(pivotTotal, expectedCurrentYear) 
        : pivotTotal

    // Scenario 2: Real/Declining (History + Baseline)
    const regDeclining = calculateRegression([...historicalTotals, projectionBaseline])

    // 3. Current Point — historicalTotal = actual so far, futureTotal = expected (prediction)
    const { predictedJHS, predictedALS, predictedOthers } = predictMarketData(history)
    const displayExpected = mode === 'simulation' ? pivotTotal : expectedCurrentYear
    combinedData.push({
        year: currentYearStr,
        sortYear: currentYearInt,
        total: pivotTotal,
        historicalTotal: pivotTotal,
        futureStable: projectionBaseline, 
        futureDeclining: projectionBaseline,     
        futureWavy: projectionBaseline,          
        marketJHS: predictedJHS,
        marketALS: predictedALS,
        marketTransferees: predictedOthers,
        gap: projectionBaseline > pivotTotal ? [pivotTotal, projectionBaseline] : null,
        type: 'current'
    })

    // 4. Future Projections
    // x index for next year starts at (history.length + 1)
    let nextX = historicalTotals.length + 1
    let optimisticTotal = projectionBaseline
    
    // Calculate dynamic recovery rate: Mean Change + Standard Deviation
    let recoveryRate = 174 // Fallback default
    let historicalChanges: number[] = []

    if (historicalTotals.length >= 2) {
        const changes = historicalTotals.slice(1).map((val, i) => val - historicalTotals[i])
        const meanChange = changes.reduce((sum, val) => sum + val, 0) / changes.length
        const variance = changes.reduce((sum, val) => sum + Math.pow(val - meanChange, 2), 0) / changes.length
        const stdDev = Math.sqrt(variance)
        recoveryRate = Math.round(meanChange + stdDev)

        // Store raw changes for Wavy cycle
        historicalChanges = [...changes]
        // Rotate changes to start with the MOST RECENT trend (Momentum)
        // This ensures the projection continues the current trajectory first
        historicalChanges.reverse() 
    } else {
        historicalChanges = [50, -20] // Default stable cycle if no history
    }

    let wavyTotal = projectionBaseline
    // Realistic Floor: Adjust to not exceed baseline (prevents jump up if baseline is low)
    const MIN_REALISTIC_ENROLLMENT = Math.min(1000, projectionBaseline) 

    combinedData.sort((a, b) => a.sortYear - b.sortYear)
    for (let year = currentYearInt + 1, i = 0; year <= 2030; year++, i++) {
        const label = `${year}-${year + 1}`
        
        // Scenario 1: Optimistic Solution (Dynamic Recovery Rate)
        optimisticTotal += recoveryRate
        const valOptimistic = Math.max(MIN_REALISTIC_ENROLLMENT, Math.round(optimisticTotal))

        // Scenario 2: Declining (Linear Regression with Drop)
        const valDeclining = Math.max(MIN_REALISTIC_ENROLLMENT, Math.round(regDeclining.m * nextX + regDeclining.b))

        // Scenario 3: Wavy / Realistic (Dampened Historical Cycle)
        // Cycle through past changes, but dampen negative ones to simulate recovery
        let change = historicalChanges.length > 0 ? historicalChanges[i % historicalChanges.length] : 0
        
        // Logic: If change is negative (a drop), dampen it by 40% (multiply by 0.6) 
        // to represent a system that is recovering and more resilient than before.
        if (change < 0) change = Math.round(change * 0.6)
        
        wavyTotal += change
        if (wavyTotal < MIN_REALISTIC_ENROLLMENT) wavyTotal = MIN_REALISTIC_ENROLLMENT
        const valWavy = Math.round(wavyTotal)
        
        combinedData.push({
            year: label,
            sortYear: year,
            total: valDeclining, // Default to declining for metrics continuity
            historicalTotal: null,
            futureStable: valOptimistic,
            futureDeclining: valDeclining,
            futureWavy: valWavy,
            marketJHS: 0, marketALS: 0, marketTransferees: 0,
            type: 'future'
        })
        nextX++
    }
    return combinedData
  }, [history, currentStudentsCount, activeConfig, mode, simulationValue, predictMarketData, pivotYearStr, manualMarketData]) // Added manualMarketData dependency if needed, though predictMarketData handles it

  // METRICS — Pure historical backtracking: predictions from past data ONLY, never from current count
  const metrics = useMemo(() => {
    const historicalPoints = analyticsData.filter(d => d.type === 'historical')
    const currentPoint = analyticsData.find(d => d.type === 'current')
    const lastYear = analyticsData.find(d => d.type === 'historical' && d.sortYear === (currentPoint?.sortYear || 0) - 1)
    const nextPoint = analyticsData.find(d => d.type === 'future')

    const historicalTotals = historicalPoints.map(d => d.total).filter((t): t is number => t != null && t > 0)
    if (historicalTotals.length === 0) {
      // No history: use current as weak prior, range = current ± 20%
      const pivot = mode === 'simulation' ? simulationValue : currentStudentsCount
      const fallbackExpected = Math.max(pivot, 1)
      return {
        growth: lastYear && lastYear.total ? (((fallbackExpected - lastYear.total) / lastYear.total) * 100).toFixed(1) : "0",
        expectedOutcome: fallbackExpected,
        nextTotal: nextPoint?.total ?? fallbackExpected,
        lowestPossible: Math.max(0, Math.round(fallbackExpected * 0.8)),
        highestPossible: Math.round(fallbackExpected * 1.2),
        hasHistory: false
      }
    }

    // METRICS: Use Regression for "Expected" (Stable Scenario)
    let regStable = calculateRegression(historicalTotals)
    // Apply same "Smart Optimism" logic to metrics
    if (regStable.m < 0 && historicalTotals.length >= 3) {
        const recent = historicalTotals.slice(-3)
        const regRecent = calculateRegression(recent)
        if (regRecent.m > 0) {
            const offset = historicalTotals.length - recent.length
            regStable = { m: regRecent.m, b: regRecent.b - (regRecent.m * offset) }
        }
    }
    const calculatedExpected = Math.max(0, Math.round(regStable.m * historicalTotals.length + regStable.b))
    
    const expectedOutcome = calculatedExpected

    // Next Year: Optimistic Recovery (Current + Recovery Rate)
    const currentTotal = mode === 'simulation' ? simulationValue : Math.max(currentStudentsCount, expectedOutcome)
    
    // Calculate recovery rate again for metrics
    let recoveryRate = 174
    if (historicalTotals.length >= 2) {
        const changes = historicalTotals.slice(1).map((val, i) => val - historicalTotals[i])
        const meanChange = changes.reduce((sum, val) => sum + val, 0) / changes.length
        const variance = changes.reduce((sum, val) => sum + Math.pow(val - meanChange, 2), 0) / changes.length
        const stdDev = Math.sqrt(variance)
        recoveryRate = Math.round(meanChange + stdDev)
    }
    
    const nextTotal = Math.max(0, Math.max(currentTotal, 1000) + recoveryRate)

    // Calculate variance for range (using simple std dev of history)
    const mean = historicalTotals.reduce((a,b)=>a+b,0) / historicalTotals.length
    const variance = historicalTotals.reduce((a,b)=>a + Math.pow(b-mean, 2), 0) / historicalTotals.length

    // Possible range: confidence interval around expected
    const stdDev = Math.sqrt(variance)
    const zScore = 1.28 // 80% confidence
    const lowestPossible = Math.max(0, Math.round(expectedOutcome - zScore * stdDev))
    const highestPossible = Math.round(expectedOutcome + zScore * stdDev)

    // Growth % = expected vs last year (not current vs last year)
    const growth = lastYear && lastYear.total
      ? (((expectedOutcome - lastYear.total) / lastYear.total) * 100).toFixed(1)
      : "0"

    return {
      growth,
      expectedOutcome,
      nextTotal, // Use computed value from history, not chart (chart may use wrong baseline)
      lowestPossible,
      highestPossible,
      hasHistory: true
    }
  }, [analyticsData, mode, simulationValue, currentStudentsCount])

  // Effective "current" count for the selected year (live when viewing active, else from history)
  const effectiveCurrentCount = useMemo(() => {
    if (pivotYearStr === activeConfig?.school_year) {
      return mode === 'simulation' ? simulationValue : currentStudentsCount
    }
    return history.find((h) => h.school_year === pivotYearStr)?.total_enrolled ?? 0
  }, [pivotYearStr, activeConfig?.school_year, mode, simulationValue, currentStudentsCount, history])

  if (!mounted) return null

  if (loading && !activeConfig) return (
    <div className={`min-h-screen flex flex-col items-center justify-center gap-4 text-slate-400 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
       <RefreshCw className="animate-spin text-blue-600 w-12 h-12" />
       <p className="text-[10px] font-black uppercase tracking-[0.3em]">Fetching Data...</p>
    </div>
  )

  return (
    <TooltipProvider delayDuration={100}>
    <div className="space-y-8 p-4 md:p-8 pb-20 transition-colors animate-in fade-in duration-700">
        
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
            <div className="space-y-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-blue-600">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Return to main dashboard</p></TooltipContent>
                </Tooltip>
                
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className={`text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${isDarkMode ? 'from-blue-400 via-purple-400 to-pink-400' : 'from-blue-600 via-purple-600 to-pink-600'}`}>Predictive Analysis</h2>
                  
                  {activeConfig && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-lg py-1 px-3 gap-2 shadow-sm ${isDarkMode ? 'bg-blue-950/30 border-blue-800 text-blue-300' : 'bg-white border-blue-200 text-blue-700'}`}>
                          <CalendarClock className="w-4 h-4" />
                          S.Y. {activeConfig.school_year}
                      </Badge>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Select value={pivotYearStr} onValueChange={setSelectedSchoolYear}>
                            <SelectTrigger className={`w-[160px] h-9 font-semibold ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                              <SelectValue placeholder="School Year" />
                            </SelectTrigger>
                            <SelectContent className={isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}>
                              {availableSchoolYears.map((sy) => (
                                <SelectItem key={sy} value={sy} className={isDarkMode ? 'focus:bg-slate-800 text-white' : 'focus:bg-slate-100 text-slate-900'}>
                                  {sy}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-900 text-white border-slate-800">
                          <p>Filter analytics by school year</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
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
            expectedOutcome={metrics.expectedOutcome}
            currentCount={effectiveCurrentCount}
            nextYearTotal={metrics.nextTotal}
            lowestPossible={metrics.lowestPossible}
            highestPossible={metrics.highestPossible}
            isSimulation={mode === 'simulation'}
            hasHistory={metrics.hasHistory}
            isDarkMode={isDarkMode}
        />

        {/* CHART */}
        <Card className={`border shadow-sm transition-all duration-300 hover:shadow-md ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <CardHeader>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'} cursor-help w-fit`}>
                            <span className="w-2 h-6 rounded-full bg-gradient-to-b from-blue-500 to-purple-500"></span>
                            Enrollment Graph
                        </CardTitle>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Visualizes historical data and future predictions</p></TooltipContent>
                </Tooltip>
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
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'} cursor-help w-fit`}>
                                <span className="w-2 h-6 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500"></span>
                                External Source (NCR)
                            </CardTitle>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Market potential based on regional graduates</p></TooltipContent>
                    </Tooltip>
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
                             <Tooltip>
                                <TooltipTrigger asChild>
                                     <Button size="sm" variant={useAIAutofill ? "default" : "outline"} onClick={() => setUseAIAutofill(!useAIAutofill)} className={useAIAutofill ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-none shadow-md" : `border ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                                        {useAIAutofill ? "Active" : "Disabled"}
                                     </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Toggle AI-based automatic data prediction</p></TooltipContent>
                             </Tooltip>
                        </div>

                        {!useAIAutofill && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label className={`text-[10px] uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>JHS Graduates</Label>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Input type="number" min="50000" value={manualMarketData.jhs} onChange={(e) => setManualMarketData({...manualMarketData, jhs: Math.max(0, parseInt(e.target.value) || 0)})} className={`font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`} />
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Manual input for Junior High School graduates</p></TooltipContent>
                                    </Tooltip>
                                </div>
                                <div className="space-y-2">
                                    <Label className={`text-[10px] uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>ALS Passers</Label>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Input type="number" min="1000" value={manualMarketData.als} onChange={(e) => setManualMarketData({...manualMarketData, als: Math.max(0, parseInt(e.target.value) || 0)})} className={`font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`} />
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Manual input for ALS passers</p></TooltipContent>
                                    </Tooltip>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label className={`text-[10px] uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Payees / Others</Label>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Input 
                                                type="number" 
                                                min="0"
                                                value={manualMarketData.others} 
                                                onChange={(e) => setManualMarketData({...manualMarketData, others: Math.max(0, parseInt(e.target.value) || 0)})}
                                                className={`font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Additional enrollees (Transferees, Payees)</p></TooltipContent>
                                    </Tooltip>
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
    </TooltipProvider>
  )
}