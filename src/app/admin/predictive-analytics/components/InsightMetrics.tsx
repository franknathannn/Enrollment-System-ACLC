"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, TrendingUp, Target, Activity, Zap } from "lucide-react"
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
  lastYearTotal: number
}

export function InsightMetrics({ projectedGrowth, expectedOutcome, currentCount, nextYearTotal, lowestPossible, highestPossible, isSimulation, hasHistory, isDarkMode, lastYearTotal }: Props) {
  // Floor: we already have X enrolled, so lowest can't be below that
  const displayLowest = lowestPossible
  const displayHighest = Math.max(highestPossible, displayLowest)
  const progressPct = expectedOutcome > 0 ? Math.round((currentCount / expectedOutcome) * 100) : 0

  const pctDiff = lastYearTotal > 0 ? ((currentCount - lastYearTotal) / lastYearTotal) * 100 : 0
  const isIncrease = pctDiff >= 0
  const showDiffBadge = lastYearTotal > 0 && (isSimulation || currentCount > lastYearTotal)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* CARD 1: EXPECTED OUTCOME */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="group cursor-help">
            <Card className={`relative h-full border-2 transition-all duration-500 overflow-hidden hover:scale-[1.02] hover:shadow-2xl ${
              isDarkMode 
                ? 'bg-slate-900/50 border-indigo-500/10 hover:border-indigo-500/30 shadow-indigo-500/5' 
                : 'bg-white border-indigo-50 hover:border-indigo-200 shadow-indigo-100/50'
            }`}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500" />
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
              
              <CardHeader className="pb-2">
                <CardTitle className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  <Target className="w-3.5 h-3.5" />
                  Expected Outcome
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-black tracking-tighter tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'} ${isSimulation ? 'opacity-50' : ''}`}>
                      {expectedOutcome.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {isSimulation ? "Baseline Model" : "Statistical Forecast"}
                    </span>
                    {!isSimulation && (
                      <Badge variant="outline" className={`w-fit text-[10px] font-bold px-1.5 py-0 rounded-md border-emerald-500/20 text-emerald-500 ${isDarkMode ? 'bg-emerald-500/5' : 'bg-emerald-50'}`}>
                        <TrendingUp className="w-2.5 h-2.5 mr-1" />
                        {projectedGrowth}% growth
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white border-slate-800 max-w-xs p-3 rounded-xl shadow-2xl">
          <p className="text-xs leading-relaxed font-medium">Predicted total enrollment by end of year based on historical backtracking and weighted regression.</p>
        </TooltipContent>
      </Tooltip>

      {/* CARD 2: CURRENT PROGRESS */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="group cursor-help">
            <Card className={`relative h-full border-2 transition-all duration-500 overflow-hidden hover:scale-[1.02] hover:shadow-2xl ${
              isDarkMode 
                ? 'bg-slate-900/50 border-emerald-500/10 hover:border-emerald-500/30 shadow-emerald-500/5' 
                : 'bg-white border-emerald-50 hover:border-emerald-200 shadow-emerald-100/50'
            }`}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />

              <CardHeader className="pb-2">
                <CardTitle className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <Activity className="w-3.5 h-3.5" />
                  {isSimulation ? "Simulated Value" : "Current Progress"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-black tracking-tighter tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {currentCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Students Enrolled
                      </span>
                      {showDiffBadge && (
                        <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 border-none ${
                          isIncrease 
                            ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') 
                            : (isDarkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600')
                        }`}>
                          {isIncrease ? <TrendingUp className="w-2.5 h-2.5 mr-1" /> : <TrendingDown className="w-2.5 h-2.5 mr-1" />}
                          {Math.abs(pctDiff).toFixed(1)}% {isIncrease ? 'Increased' : 'Decreased'}
                        </Badge>
                      )}
                    </div>
                    {expectedOutcome > 0 && (
                      <div className="flex items-center gap-2">
                        <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000" 
                            style={{ width: `${Math.min(100, progressPct)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-emerald-500">{progressPct}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white border-slate-800 p-3 rounded-xl shadow-2xl">
          <p className="text-xs leading-relaxed font-medium">Real-time count of students who have completed the enrollment process.</p>
        </TooltipContent>
      </Tooltip>

      {/* CARD 3: POSSIBLE RANGE */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="group cursor-help">
            <Card className={`relative h-full border-2 transition-all duration-500 overflow-hidden hover:scale-[1.02] hover:shadow-2xl ${
              isDarkMode 
                ? 'bg-slate-900/50 border-amber-500/10 hover:border-amber-500/30 shadow-amber-500/5' 
                : 'bg-white border-amber-50 hover:border-amber-200 shadow-amber-100/50'
            }`}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-400" />
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />

              <CardHeader className="pb-2">
                <CardTitle className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                  Possible Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex flex-col">
                    <span className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Floor</span>
                    <span className={`text-xl font-black tabular-nums ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                      {displayLowest.toLocaleString()}
                    </span>
                  </div>
                  <div className={`h-8 w-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`} />
                  <div className="flex flex-col items-end">
                    <span className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Ceiling</span>
                    <span className={`text-xl font-black tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {highestPossible.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em] text-center">
                  80% Probability Area
                </div>
              </CardContent>
            </Card>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white border-slate-800 max-w-xs p-3 rounded-xl shadow-2xl">
          <p className="text-xs leading-relaxed font-medium">Projected range based on Pessimistic vs. Optimistic scenarios. This defines the standard deviation of our forecast.</p>
        </TooltipContent>
      </Tooltip>

      {/* CARD 4: NEXT YEAR */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="group cursor-help">
            <Card className={`relative h-full border-2 transition-all duration-500 overflow-hidden hover:scale-[1.02] hover:shadow-2xl ${
              isDarkMode 
                ? 'bg-slate-900/50 border-purple-500/10 hover:border-purple-500/30 shadow-purple-500/5' 
                : 'bg-white border-purple-50 hover:border-purple-200 shadow-purple-100/50'
            }`}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-400" />
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />

              <CardHeader className="pb-2">
                <CardTitle className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  <Zap className="w-3.5 h-3.5" />
                  Next Year Prediction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-black tracking-tighter tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {nextYearTotal.toLocaleString()}
                    </span>
                    {isSimulation && (
                      <Badge variant="secondary" className="text-[10px] font-bold bg-purple-500/10 text-purple-500 border-none">SIM</Badge>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Projected Baseline
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      S.Y. {(parseInt(new Date().getFullYear().toString()) + 1)}-{(parseInt(new Date().getFullYear().toString()) + 2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white border-slate-800 p-3 rounded-xl shadow-2xl">
          <p className="text-xs leading-relaxed font-medium">Estimated enrollment for the next academic cycle based on the current year's expected outcome and market growth trends.</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}