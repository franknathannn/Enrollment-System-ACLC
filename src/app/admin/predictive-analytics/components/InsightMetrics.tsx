"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, TrendingUp, Target, Activity } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface Props {
  projectedGrowth: string
  expectedOutcome: number
  currentCount: number
  nextYearTotal: number
  lowestPossible: number
  highestPossible: number
  isSimulation: boolean
  hasHistory: boolean
  isDarkMode: boolean
}

export function InsightMetrics({ projectedGrowth, expectedOutcome, currentCount, nextYearTotal, lowestPossible, highestPossible, isSimulation, hasHistory, isDarkMode }: Props) {
  // Floor: we already have X enrolled, so lowest can't be below that
  const displayLowest = Math.max(lowestPossible, currentCount)
  const displayHighest = Math.max(highestPossible, displayLowest)
  const progressPct = expectedOutcome > 0 ? Math.round((currentCount / expectedOutcome) * 100) : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CARD 1: EXPECTED OUTCOME — from historical backtracking only */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className={`border shadow-sm relative overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100'}`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <CardHeader className="pb-2">
              <CardTitle className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                <Target className="w-3.5 h-3.5" />
                Expected Outcome
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <span className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {expectedOutcome.toLocaleString()}
                </span>
                <span className="text-[10px] font-medium text-slate-500">
                  {hasHistory ? "From historical trend (backtracking)" : "Insufficient history — using current"}
                </span>
                <span className="text-xs text-slate-500">+{projectedGrowth}% vs last year</span>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white border-slate-800 max-w-xs">
          <p>Predicted total enrollment by end of year. Based purely on past years&apos; data — not your current count.</p>
        </TooltipContent>
      </Tooltip>

      {/* CARD 2: CURRENT PROGRESS — live count */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className={`border shadow-sm relative overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-emerald-100'}`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <CardHeader className="pb-2">
              <CardTitle className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                <Activity className="w-3.5 h-3.5" />
                Current Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <span className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {currentCount.toLocaleString()}
                </span>
                <span className="text-[10px] font-medium text-slate-500">
                  enrolled so far
                </span>
                {expectedOutcome > 0 && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {progressPct}% of expected
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white border-slate-800">
          <p>Live enrollment count. This is your actual progress toward the expected outcome.</p>
        </TooltipContent>
      </Tooltip>

      {/* CARD 3: POSSIBLE RANGE — 80% confidence interval */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className={`border shadow-sm relative overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-amber-100'}`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <CardHeader className="pb-2">
              <CardTitle className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                Possible Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className={`text-[10px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Lowest</span>
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span className={`text-xl font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                      {displayLowest.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className={`h-8 w-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`} />
                <div className="flex flex-col items-end">
                  <span className={`text-[10px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Highest</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {highestPossible.toLocaleString()}
                    </span>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white border-slate-800 max-w-xs">
          <p>80% confidence interval around expected outcome. Based on historical variance — not your current count.</p>
        </TooltipContent>
      </Tooltip>

      {/* CARD 4: NEXT YEAR */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className={`border shadow-sm relative overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-purple-100'}`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <CardHeader className="pb-2">
              <CardTitle className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                Next Year Prediction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {nextYearTotal.toLocaleString()}
                </span>
                {isSimulation && <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700">Sim</Badge>}
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white border-slate-800">
          <p>Projected total for next academic year. Extrapolated from expected outcome this year.</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}