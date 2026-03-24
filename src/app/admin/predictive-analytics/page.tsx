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
import { computeEnsemble, EnsembleResult } from "@/lib/utils/ensemble"


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

// ─── LOV-CV (PYTHON ENGINE) PANEL ──────────────────────────────────────────────
function LovCvPythonEnginePanel({
  result, isDarkMode, currentCount, pendingCount,
}: {
  result: EnsembleResult | null
  isDarkMode: boolean
  currentCount: number
  pendingCount: number
}) {
  if (!result) return (
    <div className={`rounded-2xl border p-8 flex items-center justify-center gap-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
      <AlertCircle className="w-4 h-4 text-slate-400" />
      <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No historical data available for ensemble prediction.</span>
    </div>
  )

  const models   = Object.values(result.models) as any[]
  const bestMape = result.accuracy.best_mape
  const accuracy = bestMape < 5  ? { label: 'Very Accurate', color: 'text-emerald-500' }
                 : bestMape < 10 ? { label: 'Accurate',      color: 'text-blue-500'    }
                 : bestMape < 20 ? { label: 'Moderate',      color: 'text-amber-500'   }
                 :                 { label: 'Low Confidence', color: 'text-red-500'    }

  return (
    <div className={`relative rounded-3xl border overflow-hidden shadow-2xl transition-all duration-500 ${isDarkMode ? 'bg-slate-900/50 border-emerald-500/20 backdrop-blur-xl' : 'bg-white border-emerald-100 shadow-emerald-100/20'}`}>
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 opacity-90" />

      <div className="p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <Wand2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-emerald-400' : 'text-slate-600'}`}>
                LOV-CV (PYTHON ENGINE)
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all ${isDarkMode ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
              {result.n_records} records · {result.target_year}
            </span>
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all ${isDarkMode ? 'bg-blue-950/30 border-blue-800/30 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
              Works on Vercel
            </span>
          </div>
        </div>

        {/* Enrolled so far */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`rounded-2xl p-6 col-span-1 border transition-all ${isDarkMode ? 'bg-slate-800/40 border-slate-700/50 hover:border-emerald-500/30' : 'bg-slate-50 border-slate-100 hover:border-emerald-200'}`}>
            <p className={`text-[10px] uppercase font-black tracking-[0.2em] mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Enrolled So Far</p>
            <p className={`text-4xl font-black tabular-nums tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{currentCount.toLocaleString()}</p>
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>+{pendingCount.toLocaleString()} pending</p>
              </div>
            )}
          </div>
          <div className={`rounded-2xl p-6 col-span-2 border transition-all ${isDarkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-100'}`}>
            {(() => {
              const barScale   = result.optimistic > 0 ? result.optimistic : 1
              const fillPct    = Math.min(100, Math.round((currentCount / barScale) * 100))
              const declPct    = Math.round((result.declining  / barScale) * 100)
              const realPct    = Math.round((result.realistic  / barScale) * 100)
              const remaining  = Math.max(0, result.realistic - currentCount)
              const passed     = currentCount >= result.realistic
              return (
                <div className="h-full flex flex-col justify-center">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <p className={`text-[10px] uppercase font-black tracking-[0.2em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Progress within projection range</p>
                    </div>
                    <p className={`text-2xl font-black tabular-nums tracking-tighter ${passed ? 'text-emerald-500' : isDarkMode ? 'text-white' : 'text-slate-900'}`}>{fillPct}%</p>
                  </div>
                  <div className={`relative h-4 rounded-full overflow-hidden p-0.5 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-200'}`}>
                    <div className="absolute top-0 bottom-0 w-0.5 bg-rose-500/50 z-10" style={{ left: `${declPct}%` }} />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500/60 z-10"  style={{ left: `${realPct}%` }} />
                    <div className={`absolute top-0 left-0 bottom-0 rounded-full transition-all duration-1000 ease-out ${passed ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'}`} style={{ width: `${Math.min(fillPct, 100)}%` }} />
                  </div>
                  <div className="relative h-5 mt-2">
                    <span className="absolute text-[10px] text-rose-500 font-black -translate-x-1/2" style={{ left: `${declPct}%` }}>▲ {result.declining.toLocaleString()}</span>
                    <span className="absolute text-[10px] font-black -translate-x-1/2" style={{ left: `${realPct}%`, color: isDarkMode ? '#60a5fa' : '#2563eb' }}>▲ {result.realistic.toLocaleString()}</span>
                    <span className="absolute right-0 text-[10px] text-emerald-500 font-black">{result.optimistic.toLocaleString()} ▲</span>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Big numbers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`rounded-2xl p-6 border transition-all ${isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-100 shadow-sm'}`}>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] mb-2.5 text-emerald-500">Expected Enrollment</p>
            <p className={`text-4xl font-black tabular-nums tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {result.ensemble.toLocaleString()}
            </p>
            <p className={`text-[10px] font-bold mt-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>S.Y. {result.target_year}</p>
          </div>
          <div className={`rounded-2xl p-6 border transition-all ${isDarkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-100'}`}>
            <p className={`text-[10px] uppercase font-black tracking-[0.2em] mb-2.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Likely Range</p>
            <p className={`text-xl font-black tabular-nums tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              {result.ci_lo.toLocaleString()} – {result.ci_hi.toLocaleString()}
            </p>
            <p className={`text-[10px] font-bold mt-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>where enrollment will likely land</p>
          </div>
          <div className={`rounded-2xl p-6 border transition-all ${isDarkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-100'}`}>
            <p className={`text-[10px] uppercase font-black tracking-[0.2em] mb-2.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Prediction Quality</p>
            <p className={`text-3xl font-black tracking-tight ${accuracy.color}`}>{accuracy.label}</p>
            <p className={`text-[10px] font-bold mt-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>avg. miss: ~{result.accuracy.avg_mae} students</p>
          </div>
        </div>

        {/* Scenarios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'If enrollment slows', value: result.declining,  color: isDarkMode ? 'text-rose-400 bg-rose-500/5 border-rose-500/20' : 'text-rose-600 bg-rose-50 border-rose-100' },
            { label: 'Most likely',  value: result.realistic,  color: isDarkMode ? 'text-blue-300 bg-blue-500/5 border-blue-500/20' : 'text-blue-700 bg-blue-50 border-blue-100', bold: true },
            { label: 'If enrollment grows',  value: result.optimistic, color: isDarkMode ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border-emerald-100' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-5 text-center transition-all hover:scale-[1.02] cursor-default ${s.color}`}>
              <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-80 mb-2">{s.label}</p>
              <p className={`font-black tabular-nums tracking-tight ${s.bold ? 'text-3xl' : 'text-2xl'}`}>{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Model breakdown */}
        <div className={`rounded-2xl border overflow-hidden transition-all ${isDarkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-slate-50/30 shadow-sm'}`}>
          <div className={`px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] border-b ${isDarkMode ? 'bg-slate-800/50 text-slate-400 border-slate-700/50' : 'bg-slate-100/50 text-slate-500 border-slate-100'}`}>
            How the prediction was made — 4 methods combined
          </div>
          <div className="divide-y divide-slate-800/20 dark:divide-slate-800/50">
            {models.map((m: any, i: number) => {
              const explanations = [
                "Projects a steady path by fitting a line to all historical data points. It provides a baseline for long-term growth patterns.",
                "Weighs recent data points more heavily to capture current momentum. It is more sensitive to recent shifts in enrollment trends.",
                "Fits a quadratic curve to capture non-linear patterns like rapid growth or slowing trends. It helps identify acceleration or deceleration in the data.",
                "Uses exponential smoothing to prioritize the most recent level while reducing historical noise. It 'carries forward' the current state into the next period."
              ];
              return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div className={`flex items-center justify-between px-6 py-4 hover:bg-slate-500/5 transition-colors cursor-help`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-indigo-500' : i === 2 ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                        <span className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{m.label}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className={`text-sm font-black tabular-nums tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{Math.round(m.pred).toLocaleString()}</p>
                          <p className={`text-[9px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>PREDICTED</p>
                        </div>
                        <div className="text-right min-w-[60px]">
                          <p className={`text-sm font-black tabular-nums ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{m.weight}%</p>
                          <p className={`text-[9px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>influence</p>
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-slate-900 text-white border-slate-800 max-w-xs p-3 rounded-xl shadow-2xl">
                    <p className="text-xs leading-relaxed font-medium">{explanations[i]}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        <div className={`flex items-center gap-2 p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
          <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
          <p className={`text-[10px] font-medium leading-relaxed ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
            Based on {result.n_records} years of past enrollment data · More historical data improves accuracy · Final numbers may vary as enrollment is ongoing
          </p>
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
    <div className={`relative rounded-3xl border overflow-hidden shadow-xl transition-all duration-500 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-slate-100/50'}`}>
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-400 opacity-90" />
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-2xl ${isDarkMode ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
            <Settings2 className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-violet-400' : 'text-slate-600'}`}>
              How the Prediction Model Works
            </h3>
            <p className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>How the model reads your enrollment history and builds each scenario</p>
          </div>
        </div>

        {/* Cycle + convergence row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`rounded-2xl p-4 border transition-all ${isDarkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
            <p className={`text-[9px] uppercase font-black tracking-[0.2em] mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Cycle Phase</p>
            <p className={`text-base font-black ${cycleColor}`}>{cycleLabel}</p>
          </div>
          <div className={`rounded-2xl p-4 border transition-all ${isDarkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
            <p className={`text-[9px] uppercase font-black tracking-[0.2em] mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Long-Run Mean</p>
            <p className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{Math.round(longRunMean).toLocaleString()}</p>
          </div>
          <div className={`rounded-2xl p-4 border transition-all ${isDarkMode ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50 border-rose-100 shadow-sm'}`}>
            <p className={`text-[9px] uppercase font-black tracking-[0.2em] mb-2 text-rose-500`}>Structural Floor</p>
            <p className={`text-base font-black text-rose-500`}>{enrollmentFloor.toLocaleString()}</p>
          </div>
          <div className={`rounded-2xl p-4 border transition-all ${isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100 shadow-sm'}`}>
            <p className={`text-[9px] uppercase font-black tracking-[0.2em] mb-2 text-emerald-500`}>Growth Ceiling</p>
            <p className={`text-base font-black text-emerald-500`}>{enrollmentCeiling.toLocaleString()}</p>
          </div>
        </div>

        {/* Method breakdown */}
        <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/30 border-slate-100'}`}>
          <div className={`px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] border-b ${isDarkMode ? 'bg-slate-800/50 text-slate-500 border-slate-700/50' : 'bg-slate-100/50 text-slate-400 border-slate-100'}`}>
            How each approach reads the data — final baseline: <span className={isDarkMode ? 'text-violet-400' : 'text-violet-600'}>{projectionBaseline.toLocaleString()}</span>
          </div>
          <div className="p-5 space-y-5">
            {methods.map((m, idx) => {
              const barWidth = projectionBaseline > 0 ? Math.min(100, Math.round((m.value / projectionBaseline) * 100)) : 0
              const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500']
              return (
                <div key={m.name} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${colors[idx]}`} />
                      <span className={`text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{m.name}</span>
                    </div>
                    <span className={`text-xs font-black tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{m.value.toLocaleString()}</span>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-slate-200'}`}>
                    <div className={`h-full rounded-full ${colors[idx]} opacity-70 transition-all duration-1000`} style={{ width: `${barWidth}%` }} />
                  </div>
                  <p className={`text-[10px] font-bold mt-2 leading-relaxed ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>{m.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// SHARED PREDICTION ENGINE — called by both analyticsData and metrics useMemos
// so both always produce identical numbers with zero duplication risk.
// ─────────────────────────────────────────────────────────────────────────────
function computeScenarios(historicalTotals: number[]) {
  const n = historicalTotals.length
  if (n === 0) return null

  // ── Step 1: Weighted baseline (recency-biased average) ───────────────────
  const recencyWeights = (() => {
    const raw = historicalTotals.map((_, i) => i + 1)
    const sum = raw.reduce((s, v) => s + v, 0)
    return raw.map(w => w / sum)
  })()
  const weightedMeanVal  = historicalTotals.reduce((s, v, i) => s + v * recencyWeights[i], 0)
  const last3            = historicalTotals.slice(-3)
  const last3Mean        = last3.reduce((s, v) => s + v, 0) / last3.length
  const sortedH          = [...historicalTotals].sort((a, b) => a - b)
  const median           = sortedH[Math.floor(n / 2)]
  const longRunMean      = historicalTotals.reduce((s, v) => s + v, 0) / n

  let projectionBaseline = Math.max(50, Math.round(
    weightedMeanVal * 0.50 +
    last3Mean       * 0.35 +
    median          * 0.15
  ))

  // ── Step 2: Trend momentum correction ────────────────────────────────────
  // If the last 2-3 years ALL moved in the same direction, the recency-weighted
  // average still gets dragged toward older opposing values. Blend in half of
  // the recent momentum to correct for this bias.
  const last3Changes = historicalTotals
    .slice(Math.max(1, n - 3))
    .map((v, i, arr) => i === 0 ? v - historicalTotals[Math.max(0, n - 3) + i - 1] : v - arr[i - 1])
    .filter((_, i, arr) => i > 0 || n - 3 >= 1) // ensure we have real pairs
  // Simpler: compute from raw indices
  const trendChanges: number[] = []
  for (let i = Math.max(1, n - 3); i < n; i++) {
    trendChanges.push(historicalTotals[i] - historicalTotals[i - 1])
  }
  const isConsistentlyGrowing   = trendChanges.length >= 2 && trendChanges.every(c => c > 0)
  const isConsistentlyDeclining = trendChanges.length >= 2 && trendChanges.every(c => c < 0)
  if (trendChanges.length >= 2) {
    const avgRecent = trendChanges.reduce((s, v) => s + v, 0) / trendChanges.length
    if (isConsistentlyGrowing)   projectionBaseline += Math.round(avgRecent * 0.50)
    if (isConsistentlyDeclining) projectionBaseline += Math.round(avgRecent * 0.40)
  }

  // ── Step 3: Oscillation cycle detection ──────────────────────────────────
  const deviations  = historicalTotals.map(v => v - longRunMean)
  const dampenRatios: number[] = []
  for (let i = 1; i < deviations.length; i++) {
    if (Math.abs(deviations[i - 1]) > 0)
      dampenRatios.push(Math.abs(deviations[i]) / Math.abs(deviations[i - 1]))
  }
  const avgDampen = dampenRatios.length > 0
    ? Math.min(0.80, Math.max(0.35, dampenRatios.reduce((s, v) => s + v, 0) / dampenRatios.length))
    : 0.55
  const lastDev    = deviations[n - 1]
  const lastChange = n >= 2 ? historicalTotals[n - 1] - historicalTotals[n - 2] : 0
  const cycleSign  = -Math.sign(lastDev === 0 ? lastChange : lastDev)
  const nextDev    = lastDev * avgDampen * cycleSign
  const meanReversionPrediction = Math.round(longRunMean + nextDev)
  const cyclePhase = Math.abs(lastDev) < longRunMean * 0.02
    ? 'neutral' as const
    : lastDev < 0 ? 'up' as const : 'down' as const

  // ── Step 4: Confidence range ──────────────────────────────────────────────
  const changes    = historicalTotals.slice(1).map((v, i) => v - historicalTotals[i])
  const meanChange = changes.length > 0 ? changes.reduce((s, v) => s + v, 0) / changes.length : 0
  const variance   = changes.length >= 2
    ? changes.reduce((s, v) => s + Math.pow(v - meanChange, 2), 0) / changes.length
    : Math.pow(projectionBaseline * 0.10, 2)
  // BUG FIX: enforce a minimum spread of 6% of baseline so scenarios never
  // all collapse to the same number when there are fewer than 2 change values.
  const stdDev = Math.max(Math.sqrt(variance), projectionBaseline * 0.06)

  const enrollmentFloor   = Math.round(Math.min(...historicalTotals) * 0.85)
  const enrollmentCeiling = Math.round(Math.max(...historicalTotals) * 1.20)

  const scenarioDeclining  = Math.max(enrollmentFloor,   Math.round(projectionBaseline - stdDev * 0.6))
  const scenarioOptimistic = Math.min(enrollmentCeiling, Math.round(projectionBaseline + stdDev * 0.8))

  // Weighted regression (used only to shape the declining future line slope)
  let wSumX=0,wSumY=0,wSumXY=0,wSumXX=0,wSum=0
  for (let i=0;i<n;i++){const w=i+1;wSumX+=w*i;wSumY+=w*historicalTotals[i];wSumXY+=w*i*historicalTotals[i];wSumXX+=w*i*i;wSum+=w}
  const wDen=wSum*wSumXX-wSumX*wSumX
  const wM=wDen!==0?(wSum*wSumXY-wSumX*wSumY)/wDen:0
  const wB=(wSumY-wM*wSumX)/wSum
  const weightedRegPrediction = Math.round(wM * n + wB)

  return {
    projectionBaseline,       // the realistic mid-point (50/35/15 blend + momentum)
    longRunMean,
    avgDampen,
    lastDev,
    lastChange,
    cycleSign,
    nextDev,
    meanReversionPrediction,
    cyclePhase,
    stdDev,
    enrollmentFloor,
    enrollmentCeiling,
    scenarioDeclining,
    scenarioRealistic:  projectionBaseline,
    scenarioOptimistic,
    weightedRegPrediction,
    regSlope: wM,
    regIntercept: wB,
    n,
    historicalTotals,
  }
}

export default function PredictiveAnalytics() {
  const router = useRouter()
  const { isDarkMode, mounted } = useTheme()
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
  const fetchingRef = useRef(false)

  // LOV-CV engine toggle
  const [predEngine, setPredEngine] = useState<'js' | 'ensemble'>('js')

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
    if (isBackground && fetchingRef.current) return
    fetchingRef.current = true
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

      const rawHistory = historyRes.data || []
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

         // Always use the real enrolled count — students are still in the DB at this point
         // with Accepted/Approved status, so liveEnrolled is the actual figure for the
         // previous year. Growth-rate projections belong in future forecasts, not archives.
         const newRecord = {
            id: crypto.randomUUID(),
            school_year: prevYearStr,
            total_enrolled: liveEnrolled,
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
      fetchingRef.current = false
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
    const pollingInterval = setInterval(() => fetchData(true), 15000)
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

  // Ensemble result — predicts the current active SY (same scope as Standard)
  const ensembleResult = useMemo(() => {
    if (history.length === 0) return null
    const totals     = history.map((h: any) => h.total_enrolled)
    const targetYear = activeConfig?.school_year || '2025-2026'
    return computeEnsemble(totals, targetYear)
  }, [history, activeConfig?.school_year])


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

    // ── Call the shared prediction engine ──────────────────────────────────
    const sc = computeScenarios(historicalTotals)
    if (!sc) {
        const fallback = Math.max(pivotTotal, 100)
        combinedData.push({ year: currentYearStr, sortYear: currentYearInt, total: fallback,
            historicalTotal: pivotTotal, futureStable: Math.round(fallback*1.15),
            futureDeclining: Math.round(fallback*0.88), futureWavy: fallback,
            marketJHS: 0, marketALS: 0, marketTransferees: 0, gap: [pivotTotal, Math.round(fallback*1.15)], type: 'current' })
        return combinedData
    }
    const {
        projectionBaseline, longRunMean, avgDampen, lastDev, lastChange,
        cycleSign, nextDev, stdDev, enrollmentFloor, enrollmentCeiling,
        scenarioDeclining, scenarioRealistic, scenarioOptimistic,
        regSlope, regIntercept,
    } = sc

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
        gap: passedOptimistic
            ? [scenarioOptimistic, pivotTotal] as [number, number]
            : passedRealistic
            ? [scenarioRealistic, pivotTotal] as [number, number]
            : passedDeclining
            ? [scenarioDeclining, pivotTotal] as [number, number]
            : anchorOptimistic > pivotTotal
            ? [pivotTotal, anchorOptimistic] as [number, number]
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
          const linearDecl = regSlope * nextX + regIntercept
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

    // ── Use the shared engine — same result as analyticsData, zero duplication ─
    const scM = computeScenarios(historicalTotals)
    const blendedBaseline   = scM?.projectionBaseline ?? Math.max(...historicalTotals)
    const meanRevP          = scM?.meanReversionPrediction ?? blendedBaseline
    const wRegP             = scM?.weightedRegPrediction   ?? blendedBaseline
    const avgDampM          = scM?.avgDampen     ?? 0.55
    const lastDevM          = scM?.lastDev       ?? 0
    const cyclePhaseM       = scM?.cyclePhase    ?? ('neutral' as const)
    const longRunMeanM      = scM?.longRunMean   ?? blendedBaseline
    const stdDevM           = scM?.stdDev        ?? blendedBaseline * 0.10
    const floorM            = scM?.enrollmentFloor   ?? Math.round(Math.min(...historicalTotals) * 0.85)
    const ceilingM          = scM?.enrollmentCeiling ?? Math.round(Math.max(...historicalTotals) * 1.20)

        const expectedOutcome = currentPoint?.futureWavy ?? blendedBaseline
    const lowestPossible  = currentPoint?.futureDeclining ?? Math.max(floorM,   Math.round(expectedOutcome - stdDevM * 0.6))
    const highestPossible = currentPoint?.futureStable    ?? Math.min(ceilingM, Math.round(expectedOutcome + stdDevM * 0.8))
    const nextTotal = nextPoint?.futureWavy ?? Math.round(expectedOutcome * 1.05)
    const growth = lastYear && lastYear.total
      ? (((expectedOutcome - lastYear.total) / lastYear.total) * 100).toFixed(1)
      : "0"

    return {
      growth, expectedOutcome, nextTotal, lowestPossible, highestPossible, hasHistory: true,
      stdDev: stdDevM,
      holtPrediction: blendedBaseline,
      meanRevPrediction: meanRevP,
      weightedRegPrediction: wRegP,
      cyclePhase: cyclePhaseM,
      longRunMean: longRunMeanM,
      dampening: avgDampM,
      historicalTotals,
      enrollmentFloor: floorM,
      enrollmentCeiling: ceilingM,
    }
  }, [analyticsData, mode, simulationValue, effectiveLiveCount])

  // Ensemble-driven metrics — declared after analyticsData & chartData are initialized
  const ensembleMetrics = useMemo(() => {
    if (!ensembleResult) return null
    const totals = history.map((h: any) => h.total_enrolled)
    const [startYear] = (activeConfig?.school_year || '2025-2026').split('-').map(Number)
    const nextYearStr = `${startYear + 1}-${startYear + 2}`
    // If live/simulated count already exceeds the prediction, use it as the basis for next year
    const currentLive    = mode === 'simulation' ? simulationValue : effectiveLiveCount
    const currentBasis   = Math.max(ensembleResult.realistic, currentLive)
    const nextResult  = computeEnsemble([...totals, currentBasis], nextYearStr)
    const lastYearPt  = analyticsData.find(d => d.type === 'historical' && d.sortYear === startYear - 1)
    const growth = lastYearPt?.total
      ? (((ensembleResult.ensemble - lastYearPt.total) / lastYearPt.total) * 100).toFixed(1)
      : '0'
    return {
      growth,
      expectedOutcome: ensembleResult.realistic,
      nextTotal:       nextResult?.realistic ?? ensembleResult.realistic,
      lowestPossible:  ensembleResult.declining,
      highestPossible: ensembleResult.optimistic,
      hasHistory:      true,
    }
  }, [ensembleResult, history, activeConfig?.school_year, analyticsData, mode, simulationValue, effectiveLiveCount])

  // Chart data with ensemble scenarios injected for the current-year node
  // and the first future node (so the graph matches the InsightMetrics next-year card)
  const ensembleChartData = useMemo(() => {
    if (!ensembleResult || !ensembleMetrics) return null
    let firstFutureSeen = false
    return chartData.map(point => {
      // ── current year: re-anchor scenarios to live count when passed ──
      if (point.type === 'current') {
        const liveCount        = point.historicalTotal ?? 0
        const passedEnsOpt     = liveCount >= ensembleResult.optimistic
        const passedEnsReal    = liveCount >= ensembleResult.realistic
        const passedEnsDecl    = liveCount >= ensembleResult.declining
        const anchorEnsOpt     = passedEnsOpt  ? liveCount : ensembleResult.optimistic
        const anchorEnsReal    = passedEnsReal ? liveCount : ensembleResult.realistic
        const anchorEnsDecl    = passedEnsDecl ? liveCount : ensembleResult.declining
        const ensGap: [number, number] | null =
          passedEnsOpt  ? [ensembleResult.optimistic, liveCount]
          : passedEnsReal ? [ensembleResult.realistic,  liveCount]
          : passedEnsDecl ? [ensembleResult.declining,  liveCount]
          : anchorEnsOpt > liveCount ? [liveCount, anchorEnsOpt]
          : null
        return { ...point, futureStable: anchorEnsOpt, futureDeclining: anchorEnsDecl, futureWavy: anchorEnsReal, gap: ensGap }
      }
      // ── first future year: sync "Most Likely" with ensemble's next-year prediction ──
      if (point.type === 'future' && !firstFutureSeen) {
        firstFutureSeen = true
        return { ...point, futureWavy: ensembleMetrics.nextTotal }
      }
      return point
    })
  }, [ensembleResult, ensembleMetrics, chartData])

  const effectiveCurrentCount = useMemo(() => {
    if (pivotYearStr === activeConfig?.school_year) {
      return mode === 'simulation' ? simulationValue : effectiveLiveCount
    }
    return history.find((h) => h.school_year === pivotYearStr)?.total_enrolled ?? 0
  }, [pivotYearStr, activeConfig?.school_year, mode, simulationValue, effectiveLiveCount, history])

  const isViewingActiveYear = pivotYearStr === activeConfig?.school_year

  if (!mounted) return null

  if (loading && !activeConfig) return (
    <div className={`min-h-screen flex flex-col items-center justify-center gap-6 ${isDarkMode ? 'bg-slate-950' : 'bg-gradient-to-br from-slate-50 to-blue-50'}`}>
      <div className="relative flex items-center justify-center">
        <span className="absolute w-24 h-24 rounded-full border-2 border-blue-500/15 animate-ping" />
        <span className="absolute w-16 h-16 rounded-full border-2 border-purple-400/20 animate-ping" style={{ animationDelay: "0.2s" }} />
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-xl shadow-blue-500/30 z-10">
          <RefreshCw className="animate-spin text-white w-6 h-6" />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 opacity-30 blur-xl -z-10 scale-150" />
        </div>
      </div>
      <p className={`text-[11px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>Loading Analytics...</p>
    </div>
  )

  return (
    <TooltipProvider delayDuration={100}>
    {/* Thin themed scrollbar — adapts to dark/light mode */}
    <style>{`
      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-track { background: ${isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,0.6)'}; border-radius: 99px; }
      ::-webkit-scrollbar-thumb { background: ${isDarkMode ? 'rgba(100,116,139,0.7)' : 'rgba(148,163,184,0.8)'}; border-radius: 99px; }
      ::-webkit-scrollbar-thumb:hover { background: ${isDarkMode ? 'rgba(148,163,184,0.9)' : 'rgba(100,116,139,0.9)'}; }
      * { scrollbar-width: thin; scrollbar-color: ${isDarkMode ? 'rgba(100,116,139,0.7) rgba(51,65,85,0.3)' : 'rgba(148,163,184,0.8) rgba(226,232,240,0.6)'}; }
    `}</style>
    <div className={`space-y-6 p-4 md:p-8 pb-24 transition-colors animate-in fade-in duration-700 ${isDarkMode ? '' : 'bg-gradient-to-br from-slate-50/50 via-white to-blue-50/30 min-h-screen'}`}>

        {/* ── HEADER ── */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
            <div className="space-y-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" onClick={() => router.back()} className={`pl-0 hover:bg-transparent hover:text-blue-600 text-sm group ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-0.5 transition-transform duration-200" /> Back to Dashboard
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

                <div className="flex items-center gap-4 flex-wrap">
                    <HistoryEditor historyData={history} isDarkMode={isDarkMode} />
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border shadow-sm transition-all ${isDarkMode ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                      <Wand2 className="w-3.5 h-3.5 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest">LOV-CV (PYTHON ENGINE)</span>
                    </div>
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

        {/* ── LOV-CV ENGINE PANEL ── */}
        <LovCvPythonEnginePanel result={ensembleResult} isDarkMode={isDarkMode} currentCount={effectiveCurrentCount} pendingCount={pendingCount} />

        {/* ── INSIGHT METRICS ── */}
        <InsightMetrics
            projectedGrowth={ensembleMetrics ? ensembleMetrics.growth : "0"}
            expectedOutcome={ensembleMetrics ? ensembleMetrics.expectedOutcome : 0}
            currentCount={effectiveCurrentCount}
            nextYearTotal={ensembleMetrics ? ensembleMetrics.nextTotal : 0}
            lowestPossible={ensembleMetrics ? ensembleMetrics.lowestPossible : 0}
            highestPossible={ensembleMetrics ? ensembleMetrics.highestPossible : 0}
            isSimulation={mode === 'simulation'}
            hasHistory={ensembleMetrics ? ensembleMetrics.hasHistory : false}
            isDarkMode={isDarkMode}
        />

        {/* ── ENROLLMENT CHART ── */}
        <div className={`rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-md overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
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
                      <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Historical and projected scenarios</p></TooltipContent>
                  </Tooltip>
                  <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                     {mode === 'simulation' ? "Simulation Mode" : "Live Enrollment Data"}
                  </p>
                </div>

                <div className={`flex rounded-xl border overflow-hidden text-xs font-bold shadow-sm ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
                  <button
                    onClick={() => setChartFocus('this_year')}
                    className={`px-3.5 py-2 flex items-center gap-1.5 transition-all ${
                      chartFocus === 'this_year'
                        ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-inner'
                        : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-white'
                    }`}
                  >
                    <Target className="w-3 h-3" /> Focus View
                  </button>
                  <button
                    onClick={() => setChartFocus('full')}
                    className={`px-3.5 py-2 flex items-center gap-1.5 transition-all ${
                      chartFocus === 'full'
                        ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-inner'
                        : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-white'
                    }`}
                  >
                    <BarChart2 className="w-3 h-3" /> Full History
                  </button>
                </div>
              </div>
              <EnrollmentTrendChart data={ensembleChartData || []} isDarkMode={isDarkMode} mode={mode as any} />
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

    </div>
    </TooltipProvider>
  )
}