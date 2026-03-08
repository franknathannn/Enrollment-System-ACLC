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
  jhsCount,
  alsCount,
}: {
  schoolYear: string
  currentCount: number
  expectedOutcome: number
  lowestPossible: number
  highestPossible: number
  pendingCount: number
  isSimulation: boolean
  isDarkMode: boolean
  jhsCount: number
  alsCount: number
}) {
  // Milestone states — each threshold passed changes how the card looks
  const passedOptimistic = currentCount >= highestPossible
  const passedRealistic  = !passedOptimistic && currentCount >= expectedOutcome
  const passedDeclining  = !passedRealistic && !passedOptimistic && currentCount >= lowestPossible
  const isEarly = !passedDeclining && !passedRealistic && !passedOptimistic
                  && (highestPossible > 0 ? currentCount / highestPossible < 0.10 : true)
                  && !isSimulation

  const statusLabel = passedOptimistic ? "Exceeded All Projections 🎉"
                    : passedRealistic  ? "Ahead of Realistic Target"
                    : passedDeclining  ? "On Track"
                    : isEarly          ? "Enrollment Open"
                    : "Below Pace"

  const StatusIcon  = passedOptimistic || passedRealistic ? TrendingUp
                    : isEarly ? CalendarClock
                    : passedDeclining ? Minus
                    : TrendingDown

  // Progress bar: scale is 0 → optimistic ceiling
  const barScale    = highestPossible > 0 ? highestPossible : 1
  const fillPercent = Math.min(100, Math.round((currentCount / barScale) * 100))
  const declPct     = Math.round((lowestPossible  / barScale) * 100)
  const realPct     = Math.round((expectedOutcome / barScale) * 100)
  const remaining   = Math.max(0, expectedOutcome - currentCount)

  // Milestone pill colors
  const milestoneColor = passedOptimistic
    ? { border: 'border-purple-500/40', bg: isDarkMode ? 'bg-purple-950/40' : 'bg-purple-50', accent: 'text-purple-500', fill: 'from-purple-600 to-fuchsia-500', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30' }
    : passedRealistic
    ? { border: 'border-emerald-500/40', bg: isDarkMode ? 'bg-emerald-950/30' : 'bg-emerald-50', accent: 'text-emerald-500', fill: 'from-emerald-500 to-teal-500', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' }
    : passedDeclining
    ? { border: 'border-blue-500/40', bg: isDarkMode ? 'bg-blue-950/30' : 'bg-blue-50', accent: 'text-blue-400', fill: 'from-blue-600 to-blue-400', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30' }
    : isEarly
    ? { border: 'border-sky-500/30', bg: isDarkMode ? 'bg-sky-950/20' : 'bg-sky-50', accent: 'text-sky-400', fill: 'from-sky-500 to-blue-500', badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30' }
    : { border: 'border-amber-500/40', bg: isDarkMode ? 'bg-amber-950/20' : 'bg-amber-50', accent: 'text-amber-500', fill: 'from-amber-500 to-orange-400', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }

  return (
    <div className={`relative rounded-2xl border-2 overflow-hidden shadow-lg transition-all duration-500 ${milestoneColor.border} ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
      {/* Subtle animated glow strip at the top */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${milestoneColor.fill} opacity-80`} />

      <div className="p-5 space-y-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Target className={`w-4 h-4 ${milestoneColor.accent}`} />
              <h3 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                S.Y. {schoolYear}
              </h3>
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {isSimulation ? "Simulated scenario — adjust via controls"
               : passedOptimistic ? "Live count has surpassed every projected scenario. Projections re-anchor from here."
               : passedRealistic  ? "Enrollment has cleared the realistic target. Aiming for the optimistic ceiling."
               : passedDeclining  ? "Enrollment is above the baseline floor. Keep the momentum going."
               : isEarly          ? `Enrollment is open — ${currentCount.toLocaleString()} students confirmed so far.`
               : "Enrollment is running below the expected pace."}
            </p>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${milestoneColor.badge}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {statusLabel}
          </span>
        </div>

        {/* Big numbers row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Enrolled so far */}
          <div className={`rounded-xl p-4 ${isDarkMode ? 'bg-slate-800/70' : 'bg-slate-50'} ${passedOptimistic ? 'ring-1 ring-purple-500/40' : ''}`}>
            <p className={`text-[10px] uppercase font-bold tracking-widest mb-1.5 ${milestoneColor.accent}`}>
              {passedOptimistic ? "🎉 Enrolled" : "Enrolled So Far"}
            </p>
            <p className={`text-3xl font-black tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {currentCount.toLocaleString()}
            </p>
            {pendingCount > 0 && (
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                +{pendingCount.toLocaleString()} pending
              </p>
            )}
          </div>

          {/* Realistic target */}
          <div className={`rounded-xl p-4 border-2 transition-all ${
            passedRealistic || passedOptimistic
              ? 'opacity-55 border-dashed ' + (isDarkMode ? 'border-slate-700' : 'border-slate-200')
              : isDarkMode ? 'bg-blue-950/30 border-blue-800/50' : 'bg-blue-50 border-blue-200'
          }`}>
            <p className={`text-[10px] uppercase font-bold tracking-widest mb-1.5 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
              Realistic Target
            </p>
            <p className={`text-3xl font-black tabular-nums ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
              {expectedOutcome.toLocaleString()}
            </p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-blue-400/70' : 'text-blue-500'}`}>
              {passedRealistic || passedOptimistic ? "✓ surpassed" : "midpoint estimate"}
            </p>
          </div>

          {/* Surplus or still needed */}
          <div className={`rounded-xl p-4 ${
            passedOptimistic ? (isDarkMode ? 'bg-purple-950/40' : 'bg-purple-50')
            : passedRealistic ? (isDarkMode ? 'bg-emerald-950/30' : 'bg-emerald-50')
            : isDarkMode ? 'bg-slate-800/70' : 'bg-slate-50'
          }`}>
            <p className={`text-[10px] uppercase font-bold tracking-widest mb-1.5 ${
              passedOptimistic ? 'text-purple-500'
              : passedRealistic ? 'text-emerald-500'
              : isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {passedOptimistic ? "Above Ceiling" : passedRealistic ? "Exceeded By" : "Still Needed"}
            </p>
            <p className={`text-3xl font-black tabular-nums ${
              passedOptimistic ? 'text-purple-500'
              : passedRealistic ? 'text-emerald-500'
              : isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              {passedOptimistic
                ? `+${(currentCount - highestPossible).toLocaleString()}`
                : passedRealistic
                ? `+${(currentCount - expectedOutcome).toLocaleString()}`
                : remaining.toLocaleString()}
            </p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {passedOptimistic ? "above optimistic" : passedRealistic ? "above realistic" : "to hit realistic"}
            </p>
          </div>
        </div>

        {/* JHS / ALS live counts */}
        {(jhsCount > 0 || alsCount > 0) && (
          <div className={`grid grid-cols-2 gap-3 pt-1`}>
            <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <div className={`w-2 h-8 rounded-full bg-gradient-to-b from-sky-500 to-blue-600`} />
              <div>
                <p className={`text-[10px] uppercase font-bold tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>JHS Enrolled</p>
                <p className={`text-xl font-black tabular-nums ${isDarkMode ? 'text-sky-300' : 'text-sky-700'}`}>{jhsCount.toLocaleString()}</p>
              </div>
            </div>
            <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <div className={`w-2 h-8 rounded-full bg-gradient-to-b from-violet-500 to-purple-600`} />
              <div>
                <p className={`text-[10px] uppercase font-bold tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>ALS Enrolled</p>
                <p className={`text-xl font-black tabular-nums ${isDarkMode ? 'text-violet-300' : 'text-violet-700'}`}>{alsCount.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
              Progress within projection range
            </span>
            <span className={`font-black text-sm ${milestoneColor.accent}`}>
              {passedOptimistic ? `${fillPercent}%+ (ceiling cleared)` : `${fillPercent}%`}
            </span>
          </div>

          <div className={`relative h-4 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
            {/* Marker lines */}
            <div className="absolute top-0 bottom-0 w-px bg-rose-400/60 z-10" style={{ left: `${declPct}%` }} />
            <div className="absolute top-0 bottom-0 w-px bg-blue-400/80 z-10" style={{ left: `${realPct}%` }} />
            {/* Fill */}
            <div
              className={`absolute top-0 left-0 bottom-0 rounded-full transition-all duration-700 bg-gradient-to-r ${milestoneColor.fill}`}
              style={{ width: `${Math.min(fillPercent, 100)}%` }}
            />
          </div>

          <div className="relative h-4">
            <span className="absolute text-[10px] text-rose-400 font-semibold -translate-x-1/2" style={{ left: `${declPct}%` }}>
              ▲ {lowestPossible.toLocaleString()}
            </span>
            <span className="absolute text-[10px] text-blue-500 font-semibold -translate-x-1/2" style={{ left: `${realPct}%` }}>
              ▲ {expectedOutcome.toLocaleString()}
            </span>
            <span className="absolute right-0 text-[10px] font-semibold text-emerald-500">
              {highestPossible.toLocaleString()} ▲
            </span>
          </div>
          <div className="flex justify-between text-[9px] uppercase tracking-widest">
            <span className={isDarkMode ? 'text-slate-600' : 'text-slate-400'}>Declining</span>
            <span className={isDarkMode ? 'text-slate-600' : 'text-slate-400'}>Realistic</span>
            <span className={isDarkMode ? 'text-slate-600' : 'text-slate-400'}>Optimistic ↑</span>
          </div>
        </div>

        {/* Scenario milestone strip */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: "Declining", value: lowestPossible,
              passed: passedDeclining || passedRealistic || passedOptimistic,
              color: isDarkMode ? 'text-rose-400 bg-rose-950/30 border-rose-900/40' : 'text-rose-600 bg-rose-50 border-rose-200',
            },
            {
              label: "Realistic", value: expectedOutcome, bold: true,
              passed: passedRealistic || passedOptimistic,
              color: isDarkMode ? 'text-blue-300 bg-blue-950/30 border-blue-800/40' : 'text-blue-700 bg-blue-50 border-blue-200',
            },
            {
              label: "Optimistic", value: highestPossible,
              passed: passedOptimistic,
              color: isDarkMode ? 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40' : 'text-emerald-700 bg-emerald-50 border-emerald-200',
            },
          ].map(s => (
            <div
              key={s.label}
              className={`rounded-xl border p-3 text-center relative transition-all ${s.color} ${s.passed ? 'opacity-50' : ''}`}
            >
              <p className="text-[9px] uppercase font-bold tracking-widest opacity-70 mb-1">{s.label}</p>
              <p className={`font-black ${s.bold ? 'text-xl' : 'text-lg'} tabular-nums`}>{s.value.toLocaleString()}</p>
              {s.passed && <span className="absolute top-1.5 right-2 text-xs">✓</span>}
              {s.passed && (
                <p className="text-[9px] mt-1 opacity-60">Live count is baseline</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
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
    { name: "Weighted Historical Mean",  value: projectionBaseline,    weight: "primary",  desc: "Gives more weight to recent years, anchored by the median to handle unusual spikes" },
    { name: "Mean-Reversion & Cycle",   value: meanRevPrediction,     weight: "wave",     desc: "Detects whether enrollment swung above or below average last year and projects the next flip" },
    { name: "Weighted Regression",      value: weightedRegPrediction, weight: "shape",    desc: "Used to shape the declining scenario's downward slope — recent years count more" },
  ]
  const cycleColor = cyclePhase === 'up' ? 'text-emerald-500' : cyclePhase === 'down' ? 'text-rose-400' : 'text-slate-400'
  const cycleLabel = cyclePhase === 'up' ? '↑ Upturn expected' : cyclePhase === 'down' ? '↓ Dip expected' : '→ Holding steady'

  return (
    <Card className={`border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-2 h-5 rounded-full bg-gradient-to-b from-violet-500 to-indigo-500" />
          How the Prediction Model Works
        </CardTitle>
        <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
          How the model reads your enrollment history and builds each scenario
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Cycle + convergence row */}
        <div className="grid grid-cols-4 gap-3">
          <div className={`rounded-xl p-3 ${isDarkMode ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
            <p className={`text-[9px] uppercase font-bold tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Cycle Phase</p>
            <p className={`text-base font-black ${cycleColor}`}>{cycleLabel}</p>
            <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {dampening < 0.6 ? 'Swings shrinking fast' : dampening < 0.85 ? 'Swings shrinking gradually' : 'Swings barely changing'}
            </p>
          </div>
          <div className={`rounded-xl p-3 ${isDarkMode ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
            <p className={`text-[9px] uppercase font-bold tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Long-Run Mean</p>
            <p className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{Math.round(longRunMean).toLocaleString()}</p>
            <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Where enrollment is settling</p>
          </div>
          <div className={`rounded-xl p-3 border ${isDarkMode ? 'bg-rose-950/20 border-rose-900/40' : 'bg-rose-50 border-rose-200'}`}>
            <p className={`text-[9px] uppercase font-bold tracking-widest mb-1 text-rose-500`}>Structural Floor</p>
            <p className={`text-base font-black text-rose-500`}>{enrollmentFloor.toLocaleString()}</p>
            <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Lowest realistic outcome</p>
          </div>
          <div className={`rounded-xl p-3 border ${isDarkMode ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50 border-emerald-200'}`}>
            <p className={`text-[9px] uppercase font-bold tracking-widest mb-1 text-emerald-500`}>Growth Ceiling</p>
            <p className={`text-base font-black text-emerald-500`}>{enrollmentCeiling.toLocaleString()}</p>
            <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Highest realistic outcome</p>
          </div>
        </div>

        {/* Method breakdown */}
        <div className="space-y-2">
          <p className={`text-[9px] uppercase font-bold tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            How each approach reads the data — final baseline: <span className={isDarkMode ? 'text-violet-400' : 'text-violet-600'}>{projectionBaseline.toLocaleString()}</span>
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

  // Whether the chart shows just this year and neighbors, or the full 2021–2030 range
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
  const [jhsLiveCount, setJhsLiveCount] = useState<number>(0)
  const [alsLiveCount, setAlsLiveCount] = useState<number>(0)

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

  // Market data predictor — uses recent growth rates from past JHS and ALS
  // data to estimate next year's feeder pool size
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

  // Fetches all data from Supabase: system config, history, enrolled count, pending count
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

      // Fetch JHS and ALS counts from students table for the active school year
      // Uses student_category field to distinguish entry types
      const currentSY = config.school_year
      const [jhsRes, alsRes] = await Promise.all([
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('school_year', currentSY)
          .eq('student_category', 'JHS')
          .or('status.eq.Approved,status.eq.Accepted'),
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('school_year', currentSY)
          .eq('student_category', 'ALS')
          .or('status.eq.Approved,status.eq.Accepted'),
      ])
      setJhsLiveCount(jhsRes.count || 0)
      setAlsLiveCount(alsRes.count || 0)

      let rawHistory = historyRes.data || []
      let sortedHistory = [...rawHistory].sort((a: any, b: any) => parseInt(a.school_year) - parseInt(b.school_year))

      // When school year changes (forward or backward), clean up stale records:
      // - If a history record exists for the CURRENT active year, remove it
      //   (it was likely saved from a previous active year run)
      // - This ensures the current year always uses live data, not stale archived data
      const conflict = sortedHistory.find((h: any) => h.school_year === currentSY)
      if (conflict) {
         await supabase.from('enrollment_predictions_data').delete().eq('id', conflict.id)
         sortedHistory = sortedHistory.filter((h: any) => h.id !== conflict.id)
         toast.info(`Restored S.Y. ${currentSY} — live data is now active`)
      }

      const currentYearInt = parseInt(currentSY.split('-')[0])

      // Auto-archive: if the year immediately before the current active year
      // has no history record yet, generate and save one.
      // This handles the "admin moved forward" case gracefully.
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
             toast.success(`Auto-archived S.Y. ${prevYearStr}`)
         }
      }

      // Also clean up any future-year records that are ahead of the active year
      // (happens when admin goes BACK a year — future records become stale)
      const futureConflicts = sortedHistory.filter((h: any) => parseInt(h.school_year.split('-')[0]) > currentYearInt)
      if (futureConflicts.length > 0) {
        for (const fc of futureConflicts) {
          await supabase.from('enrollment_predictions_data').delete().eq('id', fc.id)
        }
        sortedHistory = sortedHistory.filter((h: any) => parseInt(h.school_year.split('-')[0]) <= currentYearInt)
        if (futureConflicts.length > 0) {
          toast.info(`Cleared ${futureConflicts.length} future record(s) — rolled back to S.Y. ${currentSY}`)
        }
      }

      setHistory(sortedHistory)

      if (!isBackground) {
        // When not in background, always snap the selected year to the active config year
        // This ensures that after a school year change, the view updates correctly
        setSelectedSchoolYear(config.school_year)
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

  // Always keep selectedSchoolYear in sync with activeConfig.
  // When admin changes school year forward or backward, the view snaps to the new active year.
  useEffect(() => {
    if (activeConfig?.school_year) {
      setSelectedSchoolYear(activeConfig.school_year)
    }
  }, [activeConfig?.school_year])

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

    // ─────────────────────────────────────────────────────────────────────
    // How the prediction engine works
    //
    // Enrollment data in most schools doesn't grow in a straight line —
    // it goes up one year, down the next, then back up, slowly settling
    // toward a stable average. That alternating pattern is called a
    // damped oscillation, and it's exactly what we see here.
    //
    // Classic tools like linear regression or Holt's smoothing assume the
    // data is always moving in one direction. When applied to oscillating
    // data, they follow the wrong signal and produce numbers that are
    // far too low (sometimes by hundreds of students).
    //
    // This engine is built specifically for oscillating enrollment data:
    //   Baseline   — a weighted average of past years (no trend assumed)
    //   Realistic  — oscillates around the baseline, dampening each year
    //   Declining  — follows the regression slope as a lower-bound shape
    //   Optimistic — baseline + one standard deviation of historical swings
    //   All three  — bounded by a realistic floor and ceiling so they
    //                never suggest numbers that couldn't happen in practice
    // ─────────────────────────────────────────────────────────────────────

    // Step 1 — Establish a baseline
    // Rather than projecting a trend, we ask: "What has the average been?"
    // Recent years are weighted more heavily because they better reflect
    // the school's current situation. We also factor in the last 3 years
    // and the median to smooth out any unusual one-off years.
    const recencyWeights = (() => {
        const raw = historicalTotals.map((_, i) => i + 1)
        const sum = raw.reduce((s, v) => s + v, 0)
        return raw.map(w => w / sum)
    })()
    const weightedMeanVal = historicalTotals.reduce((s, v, i) => s + v * recencyWeights[i], 0)
    const last3 = historicalTotals.slice(-3)
    const last3Mean = last3.reduce((s, v) => s + v, 0) / last3.length
    const sortedH = [...historicalTotals].sort((a, b) => a - b)
    const median = sortedH[Math.floor(n / 2)]
    const longRunMean = historicalTotals.reduce((s, v) => s + v, 0) / n

    // Final baseline: half from recency-weighted history, a third from
    // the last 3 years, and a small anchor from the median year
    const projectionBaseline = Math.max(50, Math.round(
        weightedMeanVal * 0.50 +
        last3Mean       * 0.35 +
        median          * 0.15
    ))

    // Step 2 — Measure the oscillation pattern
    // We look at how far each year's enrollment deviated from the long-run
    // average, then measure how quickly those swings are shrinking. A school
    // with a dampening ratio of ~0.58 means each swing is about 58% of the
    // previous one — the pattern is converging steadily toward the mean.
    const deviations = historicalTotals.map(v => v - longRunMean)
    const dampenRatios: number[] = []
    for (let i = 1; i < deviations.length; i++) {
        if (Math.abs(deviations[i-1]) > 0)
            dampenRatios.push(Math.abs(deviations[i]) / Math.abs(deviations[i-1]))
    }
    const avgDampen = dampenRatios.length > 0
        ? Math.min(0.80, Math.max(0.35, dampenRatios.reduce((s,v) => s+v,0) / dampenRatios.length))
        : 0.55

    // Current phase: if enrollment was above average last year, expect a
    // slight dip next year — and vice versa. This is the oscillation signal.
    const lastDev   = deviations[n - 1]
    const lastChange = n >= 2 ? historicalTotals[n-1] - historicalTotals[n-2] : 0
    const cycleSign  = -Math.sign(lastDev === 0 ? lastChange : lastDev)
    const nextDev    = lastDev * avgDampen * cycleSign
    const meanReversionPrediction = Math.round(longRunMean + nextDev)

    // Step 3 — Set the confidence range
    // We use the standard deviation of year-to-year changes to define how
    // wide the scenario fan should be. A volatile history (big swings) gives
    // a wider fan; a stable history gives a narrower one.
    //
    // We then apply a structural floor and ceiling so the bands never suggest
    // enrollment numbers that simply couldn't happen in a real school context.
    // No model should predict a 35% student drop without a pandemic or closure.
    const changes = historicalTotals.slice(1).map((v, i) => v - historicalTotals[i])
    const meanChange = changes.length > 0 ? changes.reduce((s,v) => s+v,0) / changes.length : 0
    const variance   = changes.length > 0
        ? changes.reduce((s,v) => s + Math.pow(v - meanChange, 2), 0) / changes.length
        : Math.pow(projectionBaseline * 0.10, 2)
    const stdDev = Math.sqrt(variance)

    // Floor = 85% of the worst year ever recorded (retention rarely falls further)
    // Ceiling = 120% of the best year ever recorded (realistic growth upper bound)
    const enrollmentFloor   = Math.round(Math.min(...historicalTotals) * 0.85)
    const enrollmentCeiling = Math.round(Math.max(...historicalTotals) * 1.20)

    const scenarioDeclining  = Math.max(enrollmentFloor,   Math.round(projectionBaseline - stdDev * 0.6))
    const scenarioRealistic  = projectionBaseline
    const scenarioOptimistic = Math.min(enrollmentCeiling, Math.round(projectionBaseline + stdDev * 0.8))

    // Weighted regression is used only to give the declining scenario
    // a realistic downward shape — not to set the baseline itself
    let wSumX=0,wSumY=0,wSumXY=0,wSumXX=0,wSum=0
    for(let i=0;i<n;i++){const w=i+1;wSumX+=w*i;wSumY+=w*historicalTotals[i];wSumXY+=w*i*historicalTotals[i];wSumXX+=w*i*i;wSum+=w}
    const wDen=wSum*wSumXX-wSumX*wSumX
    const wM=wDen!==0?(wSum*wSumXY-wSumX*wSumY)/wDen:0
    const wB=(wSumY-wM*wSumX)/wSum
    const weightedRegPrediction = Math.round(wM*n+wB)
    const regDeclining = { m: wM, b: wB }

    const { predictedJHS, predictedALS, predictedOthers } = predictMarketData(history)

    // ── MILESTONE LOGIC ─────────────────────────────────────────────────
    // When live count surpasses a scenario, that scenario re-anchors to the
    // live count and the ones above it remain as predicted projections.
    //
    //  passedDeclining:  live ≥ declining  → declining re-anchors to live
    //  passedRealistic:  live ≥ realistic  → wavy re-anchors to live
    //  passedOptimistic: live ≥ optimistic → everything re-anchors to live
    //
    // Scenarios that have NOT been passed remain as statistical projections.
    // This means the live count "climbs the ladder" of scenarios as enrollment grows.

    const passedDeclining  = pivotTotal >= scenarioDeclining
    const passedRealistic  = pivotTotal >= scenarioRealistic
    const passedOptimistic = pivotTotal >= scenarioOptimistic

    // Each scenario's "current year anchor" — what the chart shows at this pivot point
    const anchorDeclining  = passedDeclining  ? pivotTotal : scenarioDeclining
    const anchorRealistic  = passedRealistic  ? pivotTotal : scenarioRealistic
    const anchorOptimistic = passedOptimistic ? pivotTotal : scenarioOptimistic

    // What the chart renders for `total` at the current year pivot
    // (the highest milestone passed, or realistic if none passed)
    const chartAnchor = passedOptimistic ? pivotTotal
                      : passedRealistic  ? pivotTotal
                      : passedDeclining  ? pivotTotal
                      : scenarioRealistic

    combinedData.push({
        year: currentYearStr,
        sortYear: currentYearInt,
        total: chartAnchor,
        historicalTotal: pivotTotal,
        futureStable:    anchorOptimistic,
        futureDeclining: anchorDeclining,
        futureWavy:      anchorRealistic,
        marketJHS: predictedJHS,
        marketALS: predictedALS,
        marketTransferees: predictedOthers,
        gap: !passedOptimistic && anchorOptimistic > pivotTotal
            ? [pivotTotal, anchorOptimistic]
            : null,
        type: 'current'
    })

    // Step 4 — Project into the future
    //
    // For each scenario, we check if the live count already passed it.
    // If it has, we project FORWARD from the live count (the new baseline).
    // If it hasn't, we project from the statistical scenario value.
    //
    // This means:
    //  - Pass declining → future declining wave starts from live count
    //  - Pass realistic → future wavy wave starts from live count
    //  - Pass optimistic → all three future lines re-anchor from live count

    const MIN_FLOOR = enrollmentFloor

    // Each scenario seeds its own future from wherever it currently stands
    let wavyVal    = anchorRealistic
    let wavyChange = passedRealistic
      ? -(Math.abs(lastChange) * avgDampen)   // if passed, dampen from live position
      : -(lastChange * avgDampen)              // otherwise normal oscillation seed

    let optTotal  = anchorOptimistic
    let declStart = anchorDeclining
    let nextX     = n + 1

    combinedData.sort((a, b) => a.sortYear - b.sortYear)

    for (let year = currentYearInt + 1; year <= 2030; year++) {
        const label = `${year}-${year + 1}`

        // Realistic: oscillate (or oscillate from live-anchored base if passed)
        wavyVal    = Math.max(MIN_FLOOR, Math.min(enrollmentCeiling, Math.round(wavyVal + wavyChange)))
        wavyChange = -(wavyChange * avgDampen)

        // Optimistic: steady growth each year from its anchor
        optTotal = Math.min(enrollmentCeiling, Math.max(MIN_FLOOR,
            Math.round(optTotal + stdDev * 0.18)
        ))

        // Declining: regression from anchor, or if passed, gentle mean-reversion from live
        let declVal: number
        if (passedDeclining) {
          // Declining was passed — it now follows a gentle upward-adjusted path from live
          declStart = Math.round(declStart + (longRunMean - declStart) * 0.15)
          declVal   = Math.max(MIN_FLOOR, Math.min(wavyVal - 5, declStart))
        } else {
          const linearDecl = regDeclining.m * nextX + regDeclining.b
          declVal = Math.max(MIN_FLOOR, Math.round(linearDecl))
        }

        // Keep the three lines in order so they don't cross on the chart
        const safeDecl = Math.min(declVal, wavyVal - 5)
        const safeOpt  = Math.max(optTotal, wavyVal + 5)

        combinedData.push({
            year: label,
            sortYear: year,
            total: Math.max(MIN_FLOOR, safeDecl),
            historicalTotal: null,
            futureStable:    Math.min(enrollmentCeiling, safeOpt),
            futureDeclining: Math.max(MIN_FLOOR, safeDecl),
            futureWavy:      wavyVal,
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

    // Re-run the same logic here to get the numbers shown in the UI cards.
    // This mirrors the analyticsData engine so everything stays consistent.
    const nM = historicalTotals.length
    const recWM = (() => { const r=historicalTotals.map((_,i)=>i+1); const s=r.reduce((a,v)=>a+v,0); return r.map(w=>w/s) })()
    const wMeanM  = historicalTotals.reduce((s,v,i)=>s+v*recWM[i],0)
    const l3M     = historicalTotals.slice(-3); const last3MeanM = l3M.reduce((s,v)=>s+v,0)/l3M.length
    const sortedM = [...historicalTotals].sort((a,b)=>a-b); const medianM = sortedM[Math.floor(nM/2)]
    const meanM   = historicalTotals.reduce((s,v)=>s+v,0)/nM
    const blendedBaseline = Math.max(50, Math.round(wMeanM*0.50 + last3MeanM*0.35 + medianM*0.15))
    // Cycle detection — same dampening measurement as the chart engine
    const devs  = historicalTotals.map(v=>v-meanM)
    const dRatios: number[] = []
    for(let i=1;i<devs.length;i++) if(Math.abs(devs[i-1])>0) dRatios.push(Math.abs(devs[i])/Math.abs(devs[i-1]))
    const avgDamp = Math.min(0.80, Math.max(0.35, dRatios.length>0 ? dRatios.reduce((s,v)=>s+v,0)/dRatios.length : 0.55))
    const lastDevM = devs[nM-1] ?? 0
    const lastChM  = nM>=2 ? historicalTotals[nM-1]-historicalTotals[nM-2] : 0
    const meanRevP = Math.round(meanM + lastDevM*avgDamp*(-Math.sign(lastDevM===0?lastChM:lastDevM)))
    // Weighted regression — shown in the diagnostics panel for reference
    let wSX=0,wSY=0,wSXY=0,wSXX=0,wS=0
    for(let i=0;i<nM;i++){const w=i+1;wSX+=w*i;wSY+=w*historicalTotals[i];wSXY+=w*i*historicalTotals[i];wSXX+=w*i*i;wS+=w}
    const wD=wS*wSXX-wSX*wSX; const wMv=wD!==0?(wS*wSXY-wSX*wSY)/wD:0; const wBv=(wSY-wMv*wSX)/wS
    const wRegP = Math.round(wMv*nM+wBv)
    // Confidence range and domain bounds — same as the chart engine
    const changesM = historicalTotals.slice(1).map((v,i)=>v-historicalTotals[i])
    const meanChM  = changesM.length>0 ? changesM.reduce((s,v)=>s+v,0)/changesM.length : 0
    const varM     = changesM.length>0 ? changesM.reduce((s,v)=>s+Math.pow(v-meanChM,2),0)/changesM.length : Math.pow(blendedBaseline*0.10,2)
    const stdDevM  = Math.sqrt(varM)
    const floorM   = Math.round(Math.min(...historicalTotals)*0.85)
    const ceilingM = Math.round(Math.max(...historicalTotals)*1.20)

    const expectedOutcome = currentPoint?.futureWavy ?? blendedBaseline
    const lowestPossible  = currentPoint?.futureDeclining ?? Math.max(floorM,   Math.round(expectedOutcome - stdDevM * 0.6))
    const highestPossible = currentPoint?.futureStable    ?? Math.min(ceilingM, Math.round(expectedOutcome + stdDevM * 0.8))
    const nextTotal = nextPoint?.futureWavy ?? Math.round(expectedOutcome * 1.05)
    const growth = lastYear && lastYear.total
      ? (((expectedOutcome - lastYear.total) / lastYear.total) * 100).toFixed(1)
      : "0"

    const cyclePhase = Math.abs(lastDevM) < meanM * 0.02
        ? 'neutral' as const
        : lastDevM < 0 ? 'up' as const
        : 'down' as const

    return {
      growth, expectedOutcome, nextTotal, lowestPossible, highestPossible, hasHistory: true,
      stdDev: stdDevM,
      holtPrediction: blendedBaseline,  // show baseline as primary in diagnostics
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
    <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${isDarkMode ? 'bg-slate-950' : 'bg-gradient-to-br from-slate-50 to-blue-50'}`}>
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-xl">
          <RefreshCw className="animate-spin text-white w-7 h-7" />
        </div>
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 opacity-20 blur-lg" />
      </div>
      <p className={`text-[11px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading Analytics...</p>
    </div>
  )

  return (
    <TooltipProvider delayDuration={100}>
    <div className={`space-y-6 p-4 md:p-8 pb-24 transition-colors animate-in fade-in duration-700 ${isDarkMode ? '' : 'bg-gradient-to-br from-slate-50/50 via-white to-blue-50/30 min-h-screen'}`}>

        {/* ── HEADER ── */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
            <div className="space-y-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" onClick={() => router.back()} className={`pl-0 hover:bg-transparent hover:text-blue-600 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Return to main dashboard</p></TooltipContent>
                </Tooltip>
                
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className={`text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${isDarkMode ? 'from-blue-400 via-violet-400 to-pink-400' : 'from-blue-600 via-violet-600 to-pink-600'}`}>
                    Predictive Analysis
                  </h2>
                  
                  {activeConfig && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-sm py-1.5 px-3 gap-2 font-bold shadow-sm ${isDarkMode ? 'bg-blue-950/40 border-blue-800 text-blue-300' : 'bg-white border-blue-200 text-blue-700 shadow-blue-100'}`}>
                          <CalendarClock className="w-3.5 h-3.5" />
                          S.Y. {activeConfig.school_year}
                      </Badge>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Select value={pivotYearStr} onValueChange={setSelectedSchoolYear}>
                            <SelectTrigger className={`w-[160px] h-9 font-semibold text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'}`}>
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
                      <Badge variant="secondary" className={`gap-1.5 animate-pulse text-xs ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                          <RefreshCw className="w-3 h-3 animate-spin"/> Syncing...
                      </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4">
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Enrollment Analyzing
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

        {/* ── THIS YEAR SPOTLIGHT ── */}
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
            jhsCount={jhsLiveCount}
            alsCount={alsLiveCount}
          />
        )}

        {/* ── INSIGHT METRICS ── */}
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

        {/* ── ENROLLMENT CHART ── */}
        <div className={`rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-md overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            {/* Accent bar */}
            <div className="h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500" />
            <div className="p-6">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                <div>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <h3 className={`flex items-center gap-2 font-black text-lg cursor-help w-fit ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              <span className="w-2 h-5 rounded-full bg-gradient-to-b from-blue-500 to-purple-500" />
                              Enrollment Graph
                          </h3>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Historical data and future scenario projections</p></TooltipContent>
                  </Tooltip>
                  <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                     {mode === 'simulation' ? "Simulating future outcomes" : mode === 'live_enrollees' ? "LIVE · Pending Applicants" : mode === 'live_full' ? "LIVE · Total Volume" : "LIVE · Enrolled Students"}
                     {chartFocus === 'this_year' && <span className={`ml-2 text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>· ±2 Year Focus</span>}
                  </p>
                </div>

                {/* Chart focus toggle */}
                <div className={`flex rounded-xl border overflow-hidden text-xs font-bold shadow-sm ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
                  <button
                    onClick={() => setChartFocus('this_year')}
                    className={`px-3.5 py-2 flex items-center gap-1.5 transition-all ${
                      chartFocus === 'this_year'
                        ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-inner'
                        : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-white'
                    }`}
                  >
                    <Target className="w-3 h-3" /> This Year
                  </button>
                  <button
                    onClick={() => setChartFocus('full')}
                    className={`px-3.5 py-2 flex items-center gap-1.5 transition-all ${
                      chartFocus === 'full'
                        ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-inner'
                        : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-white'
                    }`}
                  >
                    <BarChart2 className="w-3 h-3" /> Full View
                  </button>
                </div>
              </div>
              <EnrollmentTrendChart data={chartData} isDarkMode={isDarkMode} mode={mode as any} />
            </div>
        </div>

        {/* ── BOTTOM GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Market potential */}
            <div className={`rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="p-6">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <h3 className={`flex items-center gap-2 font-black text-base cursor-help w-fit ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            <span className="w-2 h-5 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500" />
                            External Source (NCR)
                        </h3>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Market potential from regional graduate pool</p></TooltipContent>
                </Tooltip>
                <p className={`text-sm mt-1 mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Total Graduates (JHS) vs Passers (ALS) in the Region
                </p>
                <MarketPotentialChart data={analyticsData} isDarkMode={isDarkMode} />
              </div>
            </div>

            {/* Tools */}
            <div className={`rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="h-1 bg-gradient-to-r from-pink-500 to-rose-500" />
              <div className="p-6 space-y-5">
                <div>
                  <h3 className={`flex items-center gap-2 font-black text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      <span className="w-2 h-5 rounded-full bg-gradient-to-b from-pink-500 to-rose-500" />
                      Tools & Configuration
                  </h3>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Configure the prediction model and market data sources
                  </p>
                </div>
                    
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
                                <Label className={`text-[10px] uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Transferees / Others</Label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Input type="number" min="0" value={manualMarketData.others} onChange={(e) => setManualMarketData({...manualMarketData, others: Math.max(0, parseInt(e.target.value) || 0)})} className={`font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`} />
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
                        <AlertCircle className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
                        <div>
                            <h4 className={`font-semibold text-sm ${isDarkMode ? 'text-purple-200' : 'text-purple-900'}`}>Archive Strategy</h4>
                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-purple-300/80' : 'text-purple-700'}`}>
                                {useAIAutofill 
                                    ? "When a school year ends, the system extrapolates market trends and saves a predicted JHS/ALS count automatically."
                                    : "When archiving, the system will use your manual inputs above for the JHS and ALS market record."
                                }
                            </p>
                        </div>
                     </div>
                </div>
              </div>
            </div>
        </div>

        {/* ── STATISTICAL ENGINE PANEL ── */}
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