"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { ArrowLeft, CalendarClock, RefreshCw, AlertCircle, Wand2, Settings2, TrendingUp, TrendingDown, Minus, Target, Users, ChevronRight, BarChart2 } from "lucide-react"
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
import { AnalyticPoint, HistoryRecord } from "./types"

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

// ─── THIS YEAR SPOTLIGHT ──────────────────────────────────────────────────────
function ThisYearSpotlight({
  schoolYear,
  currentCount,
  expectedOutcome,
  lowestPossible,
  highestPossible,
  pendingCount,
  isSimulation,
  isDarkMode,
}: {
  schoolYear: string
  currentCount: number
  expectedOutcome: number
  lowestPossible: number
  highestPossible: number
  pendingCount: number
  isSimulation: boolean
  isDarkMode: boolean
}) {
  // States: exceeded all projections > ahead of realistic > early/on-track > below pace
  const exceededAll   = currentCount >= highestPossible
  const aheadOfTarget = !exceededAll && currentCount >= expectedOutcome
  const isEarly       = !exceededAll && !aheadOfTarget && (highestPossible > 0 ? currentCount / highestPossible < 0.10 : true) && !isSimulation
  const isOnTrack     = !exceededAll && !aheadOfTarget && currentCount >= lowestPossible

  const statusLabel = exceededAll   ? "Exceeded All Projections"
                    : aheadOfTarget ? "Ahead of Realistic Target"
                    : isEarly       ? "Enrollment Open"
                    : isOnTrack     ? "On Track"
                    : "Below Pace"
  const StatusIcon  = exceededAll || aheadOfTarget ? TrendingUp
                    : isEarly     ? CalendarClock
                    : isOnTrack   ? Minus
                    : TrendingDown
  const badgeColor  = exceededAll   ? 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                    : aheadOfTarget ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                    : isEarly       ? 'bg-blue-400/10 text-blue-400 border-blue-400/30'
                    : isOnTrack     ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                    : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
  const statusColor = exceededAll   ? 'text-purple-500'
                    : aheadOfTarget ? 'text-emerald-500'
                    : isEarly       ? 'text-blue-400'
                    : isOnTrack     ? 'text-blue-500'
                    : 'text-amber-500'

  // Progress bar: scale is 0 → optimistic ceiling (highestPossible)
  // This way the bar shows where current count sits within the full prediction range
  const barScale    = highestPossible > 0 ? highestPossible : 1
  const fillPercent = Math.min(100, Math.round((currentCount / barScale) * 100))
  // Marker positions on the same scale
  const declPct     = Math.round((lowestPossible  / barScale) * 100)
  const realPct     = Math.round((expectedOutcome / barScale) * 100)
  // Remaining to hit realistic target (0 if exceeded)
  const remaining   = Math.max(0, expectedOutcome - currentCount)

  return (
    <Card className={`border-2 shadow-lg transition-all duration-300 ${
      exceededAll
        ? isDarkMode ? 'bg-slate-900 border-purple-700/60' : 'bg-white border-purple-300'
        : isDarkMode ? 'bg-slate-900 border-blue-900/60'   : 'bg-white border-blue-200'
    }`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className={`flex items-center gap-2 text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <Target className={`w-5 h-5 ${exceededAll ? 'text-purple-500' : 'text-blue-500'}`} />
            This Year — S.Y. {schoolYear}
          </CardTitle>
          <Badge className={`gap-1.5 font-bold px-3 py-1 border ${badgeColor}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {statusLabel}
          </Badge>
        </div>
        <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
          {isSimulation
            ? "Simulated scenario · adjust via controls →"
            : exceededAll
            ? "Live count has surpassed all projected scenarios — projections now re-anchor from current."
            : isEarly
            ? `Enrollment ongoing — ${currentCount.toLocaleString()} enrolled so far. Scenarios show predicted end-of-year totals.`
            : "Live enrollment progress within predicted range."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* BIG NUMBERS ROW */}
        <div className="grid grid-cols-3 gap-3">
          {/* Enrolled so far */}
          <div className={`rounded-xl p-4 ${
            exceededAll
              ? isDarkMode ? 'bg-purple-950/30 border border-purple-800/50' : 'bg-purple-50 border border-purple-200'
              : isDarkMode ? 'bg-slate-800/60' : 'bg-slate-50'
          }`}>
            <p className={`text-[10px] uppercase font-bold tracking-widest mb-1 ${exceededAll ? 'text-purple-500' : isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {exceededAll ? "🎉 Enrolled" : "Enrolled So Far"}
            </p>
            <p className={`text-3xl font-black ${exceededAll ? 'text-purple-500' : isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {currentCount.toLocaleString()}
            </p>
            {pendingCount > 0 && (
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>+{pendingCount.toLocaleString()} pending</p>
            )}
          </div>

          {/* Realistic target — dimmed if exceeded */}
          <div className={`rounded-xl p-4 border-2 transition-opacity ${
            exceededAll ? 'opacity-50' : ''
          } ${isDarkMode ? 'bg-blue-950/30 border-blue-800/50' : 'bg-blue-50 border-blue-200'}`}>
            <p className={`text-[10px] uppercase font-bold tracking-widest mb-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
              Realistic Target
            </p>
            <p className={`text-3xl font-black ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
              {expectedOutcome.toLocaleString()}
            </p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-blue-400/70' : 'text-blue-500'}`}>
              {exceededAll ? "surpassed ✓" : "midpoint estimate"}
            </p>
          </div>

          {/* Third box: exceeded surplus OR still needed */}
          <div className={`rounded-xl p-4 ${
            exceededAll   ? isDarkMode ? 'bg-purple-950/30' : 'bg-purple-50'
            : aheadOfTarget ? isDarkMode ? 'bg-emerald-950/30' : 'bg-emerald-50'
            : isDarkMode ? 'bg-slate-800/60' : 'bg-slate-50'
          }`}>
            <p className={`text-[10px] uppercase font-bold tracking-widest mb-1 ${
              exceededAll ? 'text-purple-500' : aheadOfTarget ? 'text-emerald-500' : isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {exceededAll ? "Above Ceiling" : aheadOfTarget ? "Exceeded By" : "Still Needed"}
            </p>
            <p className={`text-3xl font-black ${
              exceededAll ? 'text-purple-500' : aheadOfTarget ? 'text-emerald-500' : isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              {exceededAll
                ? `+${(currentCount - highestPossible).toLocaleString()}`
                : aheadOfTarget
                ? `+${(currentCount - expectedOutcome).toLocaleString()}`
                : remaining.toLocaleString()}
            </p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {exceededAll ? "above optimistic" : aheadOfTarget ? "above realistic" : "to hit realistic"}
            </p>
          </div>
        </div>

        {/* PROGRESS BAR — scaled to optimistic ceiling */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
              Progress within projection range
            </span>
            <span className={`font-black text-base ${statusColor}`}>
              {exceededAll ? `${fillPercent}%+ (exceeded ceiling)` : `${fillPercent}%`}
            </span>
          </div>

          {/* Track — ceiling is the optimistic value */}
          <div className={`relative h-5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
            {/* Declining marker line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-rose-400/60 z-10"
              style={{ left: `${declPct}%` }}
            />
            {/* Realistic marker line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-400/80 z-10"
              style={{ left: `${realPct}%` }}
            />
            {/* Fill bar */}
            <div
              className={`absolute top-0 left-0 bottom-0 rounded-full transition-all duration-700 ${
                exceededAll   ? 'bg-gradient-to-r from-purple-600 to-purple-400'
                : aheadOfTarget ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                : isOnTrack   ? 'bg-gradient-to-r from-blue-600 to-blue-400'
                : 'bg-gradient-to-r from-amber-500 to-amber-400'
              }`}
              style={{ width: `${Math.min(fillPercent, 100)}%` }}
            />
          </div>

          {/* 3-point scale labels */}
          <div className="relative h-4">
            <span
              className="absolute text-[10px] text-rose-400 font-semibold -translate-x-1/2"
              style={{ left: `${declPct}%` }}
            >▲ {lowestPossible.toLocaleString()}</span>
            <span
              className="absolute text-[10px] text-blue-500 font-semibold -translate-x-1/2"
              style={{ left: `${realPct}%` }}
            >▲ {expectedOutcome.toLocaleString()}</span>
            <span className="absolute right-0 text-[10px] font-semibold text-emerald-500">
              {highestPossible.toLocaleString()} ▲
            </span>
          </div>
          <div className="flex justify-between text-[9px] uppercase tracking-widest mt-1">
            <span className={isDarkMode ? 'text-slate-600' : 'text-slate-400'}>Declining</span>
            <span className={isDarkMode ? 'text-slate-600' : 'text-slate-400'}>Realistic</span>
            <span className={isDarkMode ? 'text-slate-600' : 'text-slate-400'}>Optimistic ↑</span>
          </div>
        </div>

        {/* SCENARIO STRIP */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Declining",  value: lowestPossible,  color: isDarkMode ? 'text-rose-400 bg-rose-950/30 border-rose-900/40'      : 'text-rose-600 bg-rose-50 border-rose-200' },
            { label: "Realistic",  value: expectedOutcome, color: isDarkMode ? 'text-blue-300 bg-blue-950/30 border-blue-800/40'       : 'text-blue-700 bg-blue-50 border-blue-200',    bold: true },
            { label: "Optimistic", value: highestPossible, color: isDarkMode ? 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40' : 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border p-3 text-center transition-all relative ${s.color} ${
              (s.label === 'Declining'  && currentCount >= lowestPossible)  ||
              (s.label === 'Realistic'  && currentCount >= expectedOutcome) ||
              (s.label === 'Optimistic' && currentCount >= highestPossible)
                ? 'opacity-50' : ''
            }`}>
              <p className="text-[9px] uppercase font-bold tracking-widest opacity-70 mb-1">{s.label}</p>
              <p className={`font-black ${s.bold ? 'text-xl' : 'text-lg'}`}>{s.value.toLocaleString()}</p>
              {/* Check mark if current count has passed this scenario */}
              {((s.label === 'Declining'  && currentCount >= lowestPossible)  ||
                (s.label === 'Realistic'  && currentCount >= expectedOutcome) ||
                (s.label === 'Optimistic' && currentCount >= highestPossible)) && (
                <span className="absolute top-1 right-2 text-xs">✓</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── STATISTICAL INSIGHTS PANEL ───────────────────────────────────────────────
// Shows cycle phase, model diagnostics, and enrollment velocity
function StatInsightsPanel({
  historicalTotals,
  projectionBaseline,
  stdDev,
  holtPrediction,
  meanRevPrediction,
  weightedRegPrediction,
  cyclePhase,
  longRunMean,
  dampening,
  enrollmentFloor,
  enrollmentCeiling,
  isDarkMode,
}: {
  historicalTotals: number[]
  projectionBaseline: number
  stdDev: number
  holtPrediction: number
  meanRevPrediction: number
  weightedRegPrediction: number
  cyclePhase: 'up' | 'down' | 'neutral'
  longRunMean: number
  dampening: number
  enrollmentFloor: number
  enrollmentCeiling: number
  isDarkMode: boolean
}) {
  const confidencePct = Math.round((1 - stdDev / Math.max(projectionBaseline, 1)) * 100)
  const methods = [
    { name: "Holt's Smoothing",      value: holtPrediction,          weight: "40%", desc: "Best for dampening oscillations" },
    { name: "Mean-Reversion + Cycle", value: meanRevPrediction,       weight: "30%", desc: "Detects alternating up/down phase" },
    { name: "Weighted Regression",    value: weightedRegPrediction,   weight: "20%", desc: "Recent years weighted heavier" },
    { name: "Residual-Corrected Reg", value: projectionBaseline,      weight: "10%", desc: "Bias-corrected full regression" },
  ]
  const cycleColor = cyclePhase === 'up' ? 'text-emerald-500' : cyclePhase === 'down' ? 'text-rose-400' : 'text-slate-400'
  const cycleLabel = cyclePhase === 'up' ? '↑ Up-cycle expected' : cyclePhase === 'down' ? '↓ Down-cycle expected' : '→ Neutral'

  return (
    <Card className={`border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-2 h-5 rounded-full bg-gradient-to-b from-violet-500 to-indigo-500" />
          Statistical Engine Diagnostics
        </CardTitle>
        <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
          4-method ensemble · data-driven confidence interval · cycle detection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Cycle + convergence row */}
        <div className="grid grid-cols-4 gap-3">
          <div className={`rounded-xl p-3 ${isDarkMode ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
            <p className={`text-[9px] uppercase font-bold tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Cycle Phase</p>
            <p className={`text-base font-black ${cycleColor}`}>{cycleLabel}</p>
            <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {dampening < 0.6 ? 'Strong dampening' : dampening < 0.85 ? 'Moderate dampening' : 'Weak dampening'}
            </p>
          </div>
          <div className={`rounded-xl p-3 ${isDarkMode ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
            <p className={`text-[9px] uppercase font-bold tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Long-Run Mean</p>
            <p className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{Math.round(longRunMean).toLocaleString()}</p>
            <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Equilibrium estimate</p>
          </div>
          <div className={`rounded-xl p-3 border ${isDarkMode ? 'bg-rose-950/20 border-rose-900/40' : 'bg-rose-50 border-rose-200'}`}>
            <p className={`text-[9px] uppercase font-bold tracking-widest mb-1 text-rose-500`}>Structural Floor</p>
            <p className={`text-base font-black text-rose-500`}>{enrollmentFloor.toLocaleString()}</p>
            <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>85% of worst year</p>
          </div>
          <div className={`rounded-xl p-3 border ${isDarkMode ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50 border-emerald-200'}`}>
            <p className={`text-[9px] uppercase font-bold tracking-widest mb-1 text-emerald-500`}>Growth Ceiling</p>
            <p className={`text-base font-black text-emerald-500`}>{enrollmentCeiling.toLocaleString()}</p>
            <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>120% of best year</p>
          </div>
        </div>

        {/* Method breakdown */}
        <div className="space-y-2">
          <p className={`text-[9px] uppercase font-bold tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Ensemble Methods — Final Blend: <span className={isDarkMode ? 'text-violet-400' : 'text-violet-600'}>{projectionBaseline.toLocaleString()}</span>
          </p>
          {methods.map((m, idx) => {
            const barWidth = projectionBaseline > 0 ? Math.min(100, Math.round((m.value / projectionBaseline) * 100)) : 0
            const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500']
            return (
              <div key={m.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${colors[idx]}`} />
                    <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{m.name}</span>
                    <span className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>({m.weight})</span>
                  </div>
                  <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{m.value.toLocaleString()}</span>
                </div>
                <div className={`h-1.5 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div className={`h-full rounded-full ${colors[idx]} opacity-70`} style={{ width: `${barWidth}%` }} />
                </div>
                <p className={`text-[9px] ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>{m.desc}</p>
              </div>
            )
          })}
        </div>

      </CardContent>
    </Card>
  )
}

export default function PredictiveAnalytics() {
  const router = useRouter()
  const { isDarkMode: themeDarkMode, mounted } = useTheme()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Controls
  const [mode, setMode] = useState<string>('live_enrolled')
  const [activeConfig, setActiveConfig] = useState<any>(null)
  const [simulationValue, setSimulationValue] = useState<number>(0)
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>("")

  // Chart focus: "this_year" shows a zoomed view; "full" shows all years
  const [chartFocus, setChartFocus] = useState<'this_year' | 'full'>('this_year')

  // Market Data Controls
  const [useAIAutofill, setUseAIAutofill] = useState(true)
  const [manualMarketData, setManualMarketData] = useState({
      jhs: 280000,
      als: 9000,
      others: 0
  })

  // Data Stores
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [enrolledCount, setEnrolledCount] = useState<number>(0)
  const [pendingCount, setPendingCount] = useState<number>(0)

  useEffect(() => {
    setIsDarkMode(themeDarkMode)
  }, [themeDarkMode])

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
      predictedOthers: 0
    }
  }, [useAIAutofill, manualMarketData])
  
  const predictMarketDataRef = useRef(predictMarketData)
  useEffect(() => { predictMarketDataRef.current = predictMarketData }, [predictMarketData])

  // --- CORE SYNC ---
  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true)
    
    try {
      const [configRes, historyRes, enrolledRes, pendingRes] = await Promise.all([
        supabase.from('system_config').select('*').single(),
        supabase.from('enrollment_predictions_data').select('*').order('school_year', { ascending: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }).or('status.eq.Approved,status.eq.Accepted'),
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'Pending')
      ])

      const config = configRes.data || { school_year: '2025-2026' }
      setActiveConfig(config)
      
      const liveEnrolled = enrolledRes.count || 0
      setEnrolledCount(liveEnrolled)
      setPendingCount(pendingRes.count || 0)

      let rawHistory = historyRes.data || []
      let sortedHistory = [...rawHistory].sort((a: any, b: any) => parseInt(a.school_year) - parseInt(b.school_year))

      const currentYearStr = config.school_year
      const conflict = sortedHistory.find((h: any) => h.school_year === currentYearStr)
      if (conflict) {
         await supabase.from('enrollment_predictions_data').delete().eq('id', conflict.id)
         sortedHistory = sortedHistory.filter((h: any) => h.id !== conflict.id)
         toast.info(`Restored S.Y. ${currentYearStr}`)
      }

      const currentYearInt = parseInt(currentYearStr.split('-')[0])
      const prevYearInt = currentYearInt - 1
      const prevYearStr = `${prevYearInt}-${prevYearInt + 1}`
      const isPrevMissing = !sortedHistory.find((h: any) => h.school_year === prevYearStr) && prevYearInt >= 2021

      if (isPrevMissing) {
         const { predictedJHS, predictedALS, predictedOthers } = predictMarketDataRef.current(sortedHistory)
         const prevYearTotals = sortedHistory.map((h: { total_enrolled: number }) => h.total_enrolled).filter((t: number) => t != null && t > 0)
         let prevYearExpected = liveEnrolled
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

  useEffect(() => {
    if (enrolledCount > 0 && simulationValue === 0) {
      setSimulationValue(enrolledCount)
    }
  }, [enrolledCount])

  useEffect(() => { fetchData(false) }, [fetchData])

  useEffect(() => {
    if (activeConfig?.school_year && !selectedSchoolYear) {
      setSelectedSchoolYear(activeConfig.school_year)
    }
  }, [activeConfig?.school_year, selectedSchoolYear])

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

  const pivotYearStr = selectedSchoolYear || activeConfig?.school_year || '2025-2026'

  const effectiveLiveCount = useMemo(() => {
    switch (mode) {
      case 'live_enrollees': return pendingCount
      case 'live_full': return enrolledCount + pendingCount
      default: return enrolledCount
    }
  }, [mode, enrolledCount, pendingCount])

  const analyticsData = useMemo<AnalyticPoint[]>(() => {
    const config = activeConfig || { school_year: '2025-2026' }
    const currentYearStr = pivotYearStr
    const currentYearInt = parseInt(currentYearStr.split('-')[0])
    const isViewingActiveYear = currentYearStr === config.school_year

    const pivotTotal = isViewingActiveYear
      ? (mode === 'simulation' ? simulationValue : effectiveLiveCount)
      : (history.find((h) => h.school_year === currentYearStr)?.total_enrolled ?? 0)

    const combinedData: AnalyticPoint[] = []

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

    const n = historicalTotals.length
    if (n === 0) {
        const fallback = Math.max(pivotTotal, 100)
        combinedData.push({ year: currentYearStr, sortYear: currentYearInt, total: fallback,
            historicalTotal: pivotTotal, futureStable: Math.round(fallback*1.15),
            futureDeclining: Math.round(fallback*0.88), futureWavy: fallback,
            marketJHS: 0, marketALS: 0, marketTransferees: 0, gap: [pivotTotal, Math.round(fallback*1.15)], type: 'current' })
        return combinedData
    }

    // ════════════════════════════════════════════════════════════════════════
    // STATISTICAL ENGINE — 4 methods blended by reliability weight
    // ════════════════════════════════════════════════════════════════════════

    // ── METHOD 1: Holt's Double Exponential Smoothing ─────────────────────
    // Best for data with trend + dampening oscillation (exactly your pattern).
    // α controls level smoothing, β controls trend smoothing.
    // For dampening oscillations: α=0.4 (medium responsiveness), β=0.2 (slow trend update)
    const alpha = 0.4, beta = 0.2
    let level = historicalTotals[0]
    let trend = n >= 2 ? historicalTotals[1] - historicalTotals[0] : 0
    for (let i = 1; i < n; i++) {
        const prevLevel = level
        level = alpha * historicalTotals[i] + (1 - alpha) * (level + trend)
        trend = beta * (level - prevLevel) + (1 - beta) * trend
    }
    const holtPrediction = Math.round(level + trend)

    // ── METHOD 2: Weighted Linear Regression (recent years weighted more) ─
    // Assign weights: oldest=1, ..., most recent=n. Solves weighted least squares.
    let wSumX=0, wSumY=0, wSumXY=0, wSumXX=0, wSum=0
    for (let i = 0; i < n; i++) {
        const w = i + 1 // weight increases linearly with recency
        wSumX  += w * i
        wSumY  += w * historicalTotals[i]
        wSumXY += w * i * historicalTotals[i]
        wSumXX += w * i * i
        wSum   += w
    }
    const wDenom = wSum * wSumXX - wSumX * wSumX
    const wM = wDenom !== 0 ? (wSum * wSumXY - wSumX * wSumY) / wDenom : 0
    const wB = (wSumY - wM * wSumX) / wSum
    const weightedRegPrediction = Math.round(wM * n + wB)

    // ── METHOD 3: Mean-Reversion with Cycle Phase Detection ───────────────
    // Your data oscillates: up/down/up/down with shrinking amplitude.
    // We detect: (a) the long-run mean, (b) current phase, (c) dampening rate,
    // then project: next = mean + (last_deviation * dampen_factor * phase_sign)
    const longRunMean = historicalTotals.reduce((s, v) => s + v, 0) / n
    const deviations  = historicalTotals.map(v => v - longRunMean)
    // Dampening ratio: how much each successive absolute deviation shrinks
    let dampenRatios: number[] = []
    for (let i = 1; i < deviations.length; i++) {
        if (Math.abs(deviations[i-1]) > 0)
            dampenRatios.push(Math.abs(deviations[i]) / Math.abs(deviations[i-1]))
    }
    const avgDampen = dampenRatios.length > 0
        ? dampenRatios.reduce((s,v) => s+v, 0) / dampenRatios.length
        : 0.5
    // Last deviation and its direction (sign flips each cycle)
    const lastDev    = deviations[n - 1]
    const cycleSign  = -Math.sign(lastDev) // next year flips direction
    const nextDev    = lastDev * avgDampen * cycleSign
    const meanReversionPrediction = Math.round(longRunMean + nextDev)

    // ── METHOD 4: Residual-corrected Full Regression ──────────────────────
    // Standard regression but with bias correction from recent residuals
    const regFull = calculateRegression(historicalTotals)
    const rawRegPrediction = Math.round(regFull.m * n + regFull.b)
    // Compute residuals on training data to find systematic bias
    const residuals = historicalTotals.map((v, i) => v - (regFull.m * i + regFull.b))
    // Weight recent residuals more for bias estimate
    const recentResiduals = residuals.slice(-3)
    const biasCorrectionWeights = [0.2, 0.3, 0.5]
    const biasCorrection = recentResiduals.reduce((s, r, i) => s + r * biasCorrectionWeights[i], 0)
    const correctedRegPrediction = Math.round(rawRegPrediction + biasCorrection)

    // ── BLEND: weighted ensemble ──────────────────────────────────────────
    // Holt's is most appropriate for oscillating dampening series (highest weight)
    // Mean-reversion captures the cycle phase explicitly
    // Weighted regression captures recent slope
    // Corrected regression is the broadest signal (lowest weight)
    const projectionBaseline = Math.max(50, Math.round(
        holtPrediction           * 0.40 +
        meanReversionPrediction  * 0.30 +
        weightedRegPrediction    * 0.20 +
        correctedRegPrediction   * 0.10
    ))

    // ── DOMAIN-CONSTRAINED CONFIDENCE INTERVAL ────────────────────────────
    // Pure stdDev bands are statistically valid but contextually wrong for
    // enrollment systems. A -1σ drop implies ~35% of students simultaneously
    // leaving, which doesn't happen without a pandemic/school closure.
    //
    // Enrollment has STRUCTURAL FLOORS AND CEILINGS:
    //   - Floor: You can never realistically drop below ~85% of your worst
    //     historical year. Students who enrolled mid-year don't just vanish.
    //     Cohort survival research confirms retention floors of 80-90%.
    //   - Ceiling: Growth is bounded by capacity and market pool size.
    //     Using 120% of your historical best year as a realistic ceiling.
    //
    // We keep stdDev as the PRIMARY spread signal but CLAMP it to these bounds.

    const changes = historicalTotals.slice(1).map((v, i) => v - historicalTotals[i])
    const meanChange = changes.length > 0 ? changes.reduce((s,v) => s+v, 0) / changes.length : 0
    const variance   = changes.length > 0
        ? changes.reduce((s,v) => s + Math.pow(v - meanChange, 2), 0) / changes.length
        : Math.pow(projectionBaseline * 0.10, 2)
    const stdDev = Math.sqrt(variance)

    // Structural floor: 85% of worst historical year (enrollment retention floor)
    const historicalMin = Math.min(...historicalTotals)
    const historicalMax = Math.max(...historicalTotals)
    const enrollmentFloor   = Math.round(historicalMin * 0.85)
    const enrollmentCeiling = Math.round(historicalMax * 1.20)

    // Raw scenarios from stdDev, then clamped to structural bounds
    const scenarioDeclining  = Math.max(enrollmentFloor,   Math.round(projectionBaseline - stdDev * 0.6))
    const scenarioRealistic  = projectionBaseline
    const scenarioOptimistic = Math.min(enrollmentCeiling, Math.round(projectionBaseline + stdDev * 0.8))

    const regDeclining = calculateRegression([...historicalTotals, scenarioDeclining])

    const { predictedJHS, predictedALS, predictedOthers } = predictMarketData(history)

    const exceededProjections = pivotTotal >= scenarioOptimistic
    const chartAnchor = exceededProjections ? pivotTotal : scenarioRealistic

    combinedData.push({
        year: currentYearStr,
        sortYear: currentYearInt,
        total: chartAnchor,
        historicalTotal: pivotTotal,
        futureStable:    exceededProjections ? Math.min(enrollmentCeiling, Math.round(pivotTotal + stdDev * 0.8)) : scenarioOptimistic,
        futureDeclining: exceededProjections ? Math.max(enrollmentFloor,   Math.round(pivotTotal - stdDev * 0.6)) : scenarioDeclining,
        futureWavy:      exceededProjections ? pivotTotal : scenarioRealistic,
        marketJHS: predictedJHS,
        marketALS: predictedALS,
        marketTransferees: predictedOthers,
        gap: !exceededProjections && scenarioOptimistic > pivotTotal
            ? [pivotTotal, scenarioOptimistic]
            : null,
        type: 'current'
    })

    // ── FUTURE PROJECTIONS: each scenario uses Holt-projected trend ───────
    // Optimistic: Holt level + trend growth + stdDev buffer each year
    // Realistic:  Holt level + trend only (dampened toward long-run mean)
    // Declining:  Holt level + trend - stdDev drag each year
    let nextX        = n + 1
    let optTotal     = exceededProjections ? Math.min(enrollmentCeiling, Math.round(pivotTotal + stdDev * 0.8)) : scenarioOptimistic
    let realTotal    = exceededProjections ? pivotTotal : scenarioRealistic
    let declTotal    = exceededProjections ? Math.max(enrollmentFloor, Math.round(pivotTotal - stdDev * 0.6)) : scenarioDeclining
    // Project the Holt trend forward, dampening it each year (realistic: trend fades)
    let projectedTrend = trend
    const trendDampen  = 0.85 // trend decays 15% per year — prevents runaway optimism
    const MIN_FLOOR = enrollmentFloor

    combinedData.sort((a, b) => a.sortYear - b.sortYear)
    for (let year = currentYearInt + 1; year <= 2030; year++) {
        const label = `${year}-${year + 1}`
        projectedTrend *= trendDampen

        optTotal  = Math.min(enrollmentCeiling, Math.max(MIN_FLOOR, Math.round(optTotal  + projectedTrend + stdDev * 0.3)))
        // Realistic: trend only, gradually mean-reverting
        realTotal = Math.max(MIN_FLOOR, Math.round(realTotal + projectedTrend * 0.5))
        // Declining: regression slope - stdDev drag
        const linearDeclining = regDeclining.m * nextX + regDeclining.b
        declTotal = Math.max(MIN_FLOOR, Math.round(linearDeclining - stdDev * 0.1))

        combinedData.push({
            year: label,
            sortYear: year,
            total: declTotal,
            historicalTotal: null,
            futureStable:    optTotal,
            futureDeclining: declTotal,
            futureWavy:      realTotal,
            marketJHS: 0, marketALS: 0, marketTransferees: 0,
            type: 'future'
        })
        nextX++
    }
    return combinedData
  }, [history, effectiveLiveCount, activeConfig, mode, simulationValue, predictMarketData, pivotYearStr, manualMarketData]) 

  // Chart data: when focused on "this_year", trim to last 2 historical + current + next 2
  const chartData = useMemo(() => {
    if (chartFocus === 'full') return analyticsData
    const currentYearInt = parseInt(pivotYearStr.split('-')[0])
    return analyticsData.filter(d => d.sortYear >= currentYearInt - 2 && d.sortYear <= currentYearInt + 2)
  }, [analyticsData, chartFocus, pivotYearStr])

  const metrics = useMemo(() => {
    const historicalPoints = analyticsData.filter(d => d.type === 'historical')
    const currentPoint = analyticsData.find(d => d.type === 'current')
    const lastYear = analyticsData.find(d => d.type === 'historical' && d.sortYear === (currentPoint?.sortYear || 0) - 1)
    const nextPoint = analyticsData.find(d => d.type === 'future')

    const historicalTotals = historicalPoints.map(d => d.total).filter((t): t is number => t != null && t > 0)
    if (historicalTotals.length === 0) {
      const pivot = mode === 'simulation' ? simulationValue : effectiveLiveCount
      const fallbackExpected = Math.max(pivot, 1)
      return {
        growth: lastYear && lastYear.total ? (((fallbackExpected - lastYear.total) / lastYear.total) * 100).toFixed(1) : "0",
        expectedOutcome: fallbackExpected,
        nextTotal: nextPoint?.futureWavy ?? fallbackExpected,
        lowestPossible: currentPoint?.futureDeclining ?? Math.max(0, Math.round(fallbackExpected * 0.8)),
        highestPossible: currentPoint?.futureStable ?? Math.round(fallbackExpected * 1.2),
        hasHistory: false
      }
    }

    // Mirror the same 4-method engine used in analyticsData
    const nM = historicalTotals.length
    // Holt's
    const alphaM = 0.4, betaM = 0.2
    let levelM = historicalTotals[0], trendM = nM >= 2 ? historicalTotals[1] - historicalTotals[0] : 0
    for (let i = 1; i < nM; i++) {
        const prev = levelM
        levelM = alphaM * historicalTotals[i] + (1 - alphaM) * (levelM + trendM)
        trendM = betaM * (levelM - prev) + (1 - betaM) * trendM
    }
    const holtP = Math.round(levelM + trendM)
    // Weighted regression
    let wSX=0,wSY=0,wSXY=0,wSXX=0,wS=0
    for (let i=0;i<nM;i++){const w=i+1;wSX+=w*i;wSY+=w*historicalTotals[i];wSXY+=w*i*historicalTotals[i];wSXX+=w*i*i;wS+=w}
    const wD=wS*wSXX-wSX*wSX; const wMv=wD!==0?(wS*wSXY-wSX*wSY)/wD:0; const wBv=(wSY-wMv*wSX)/wS
    const wRegP = Math.round(wMv*nM+wBv)
    // Mean-reversion
    const meanM = historicalTotals.reduce((s,v)=>s+v,0)/nM
    const devs  = historicalTotals.map(v=>v-meanM)
    const dRatios: number[] = []
    for(let i=1;i<devs.length;i++) if(Math.abs(devs[i-1])>0) dRatios.push(Math.abs(devs[i])/Math.abs(devs[i-1]))
    const avgDamp = dRatios.length>0 ? dRatios.reduce((s,v)=>s+v,0)/dRatios.length : 0.5
    const meanRevP = Math.round(meanM + devs[nM-1]*avgDamp*(-Math.sign(devs[nM-1])))
    // Corrected regression
    const regM = calculateRegression(historicalTotals)
    const resids = historicalTotals.map((v,i)=>v-(regM.m*i+regM.b))
    const rcnt = resids.slice(-3); const rw=[0.2,0.3,0.5]
    const bias = rcnt.reduce((s,r,i)=>s+r*rw[i],0)
    const corrRegP = Math.round(regM.m*nM+regM.b+bias)
    // Blend
    const blendedBaseline = Math.max(50, Math.round(holtP*0.40 + meanRevP*0.30 + wRegP*0.20 + corrRegP*0.10))
    // Confidence interval from stdDev of changes
    const changesM = historicalTotals.slice(1).map((v,i)=>v-historicalTotals[i])
    const meanChM  = changesM.length>0 ? changesM.reduce((s,v)=>s+v,0)/changesM.length : 0
    const varM     = changesM.length>0 ? changesM.reduce((s,v)=>s+Math.pow(v-meanChM,2),0)/changesM.length : Math.pow(blendedBaseline*0.10,2)
    const stdDevM  = Math.sqrt(varM)
    // Domain-aware structural bounds (mirrors analyticsData engine)
    const histMin = Math.min(...historicalTotals)
    const histMax = Math.max(...historicalTotals)
    const floorM   = Math.round(histMin * 0.85)
    const ceilingM = Math.round(histMax * 1.20)

    const expectedOutcome = currentPoint?.futureWavy ?? blendedBaseline
    const lowestPossible  = currentPoint?.futureDeclining ?? Math.max(floorM,   Math.round(expectedOutcome - stdDevM * 0.6))
    const highestPossible = currentPoint?.futureStable    ?? Math.min(ceilingM, Math.round(expectedOutcome + stdDevM * 0.8))
    const nextTotal = nextPoint?.futureWavy ?? Math.round(expectedOutcome * 1.05)
    const growth = lastYear && lastYear.total
      ? (((expectedOutcome - lastYear.total) / lastYear.total) * 100).toFixed(1)
      : "0"

    // Cycle phase for diagnostics panel
    const lastDev    = devs[nM - 1] ?? 0
    const cyclePhase = Math.abs(lastDev) < meanM * 0.02
        ? 'neutral' as const
        : lastDev < 0 ? 'up' as const   // last year was below mean → next likely up
        : 'down' as const               // last year was above mean → next likely down

    return {
      growth, expectedOutcome, nextTotal, lowestPossible, highestPossible, hasHistory: true,
      stdDev: stdDevM,
      holtPrediction: holtP,
      meanRevPrediction: meanRevP,
      weightedRegPrediction: wRegP,
      cyclePhase,
      longRunMean: meanM,
      dampening: avgDamp,
      historicalTotals,
      enrollmentFloor: floorM,
      enrollmentCeiling: ceilingM,
    }
  }, [analyticsData, mode, simulationValue, effectiveLiveCount])

  const effectiveCurrentCount = useMemo(() => {
    if (pivotYearStr === activeConfig?.school_year) {
      return mode === 'simulation' ? simulationValue : effectiveLiveCount
    }
    return history.find((h) => h.school_year === pivotYearStr)?.total_enrolled ?? 0
  }, [pivotYearStr, activeConfig?.school_year, mode, simulationValue, effectiveLiveCount, history])

  const isViewingActiveYear = pivotYearStr === activeConfig?.school_year

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
                    <HistoryEditor historyData={history} isDarkMode={isDarkMode} />
                </div>
            </div>

            <PredictionControlPanel 
                mode={mode} 
                setMode={setMode as any} 
                simulationValue={simulationValue} 
                setSimulationValue={setSimulationValue}
                currentRealValue={effectiveLiveCount}
                isDarkMode={isDarkMode}
            />
        </div>

        {/* ── THIS YEAR SPOTLIGHT (only shown when viewing the active school year) ── */}
        {isViewingActiveYear && (
          <ThisYearSpotlight
            schoolYear={activeConfig.school_year}
            currentCount={effectiveCurrentCount}
            expectedOutcome={metrics.expectedOutcome}
            lowestPossible={metrics.lowestPossible}
            highestPossible={metrics.highestPossible}
            pendingCount={pendingCount}
            isSimulation={mode === 'simulation'}
            isDarkMode={isDarkMode}
          />
        )}

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
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'} cursor-help w-fit`}>
                                <span className="w-2 h-6 rounded-full bg-gradient-to-b from-blue-500 to-purple-500"></span>
                                Enrollment Graph
                            </CardTitle>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Visualizes historical data and future predictions</p></TooltipContent>
                    </Tooltip>
                    <CardDescription className={`mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                       {mode === 'simulation' ? "Simulating future outcomes..." : mode === 'live_enrollees' ? "LIVE (Pending Applicants)" : mode === 'live_full' ? "LIVE (Total Volume)" : "LIVE (Enrolled)"}
                       {chartFocus === 'this_year' && <span className={`ml-2 text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>· Focused: ±2 Years</span>}
                    </CardDescription>
                  </div>

                  {/* Chart focus toggle */}
                  <div className={`flex rounded-lg border overflow-hidden text-xs font-bold ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <button
                      onClick={() => setChartFocus('this_year')}
                      className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
                        chartFocus === 'this_year'
                          ? 'bg-blue-600 text-white'
                          : isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Target className="w-3 h-3" /> This Year
                    </button>
                    <button
                      onClick={() => setChartFocus('full')}
                      className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
                        chartFocus === 'full'
                          ? 'bg-blue-600 text-white'
                          : isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <BarChart2 className="w-3 h-3" /> Full View
                    </button>
                  </div>
                </div>
            </CardHeader>
            <CardContent>
                <EnrollmentTrendChart data={chartData} isDarkMode={isDarkMode} mode={mode as any} />
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

        {/* STATISTICAL ENGINE DIAGNOSTICS */}
        {metrics.hasHistory && (
          <StatInsightsPanel
            historicalTotals={metrics.historicalTotals}
            projectionBaseline={metrics.expectedOutcome}
            stdDev={metrics.stdDev}
            holtPrediction={metrics.holtPrediction}
            meanRevPrediction={metrics.meanRevPrediction}
            weightedRegPrediction={metrics.weightedRegPrediction}
            cyclePhase={metrics.cyclePhase}
            longRunMean={metrics.longRunMean}
            dampening={metrics.dampening}
            enrollmentFloor={metrics.enrollmentFloor}
            enrollmentCeiling={metrics.enrollmentCeiling}
            isDarkMode={isDarkMode}
          />
        )}
    </div>
    </TooltipProvider>
  )
}