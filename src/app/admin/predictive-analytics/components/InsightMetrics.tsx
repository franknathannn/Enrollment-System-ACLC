"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, TrendingUp } from "lucide-react"

interface Props {
  projectedGrowth: string
  nextYearTotal: number
  lowestPossible: number
  highestPossible: number
  isSimulation: boolean
  isDarkMode: boolean
}

export function InsightMetrics({ projectedGrowth, nextYearTotal, lowestPossible, highestPossible, isSimulation, isDarkMode }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* CARD 1: GROWTH RATE */}
      <Card className={`border shadow-sm relative overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100'}`}>
        <div className={`absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none`} />
        <CardHeader className="pb-2">
          <CardTitle className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
             {isSimulation ? "Future Growth" : "Current Growth"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-black tracking-tighter ${isSimulation ? (isDarkMode ? "text-purple-400" : "text-purple-600") : (isDarkMode ? "text-white" : "text-slate-900")}`}>
              {projectedGrowth}%
            </span>
            <span className="text-xs font-medium text-slate-500">vs Last Year</span>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2: NEXT YEAR TOTAL */}
      <Card className={`border shadow-sm relative overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-purple-100'}`}>
        <div className={`absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none`} />
        <CardHeader className="pb-2">
          <CardTitle className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
             {isSimulation ? "Next Year Prediction" : "Next Year Prediction"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {nextYearTotal.toLocaleString()}
            </span>
            {isSimulation && <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700">Modified</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* CARD 3: PREDICTION INTERVALS (LOW/HIGH) */}
      <Card className={`border shadow-sm relative overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-emerald-100'}`}>
        <div className={`absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none`} />
        <CardHeader className="pb-2">
          <CardTitle className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Expectation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            
            {/* Lowest Possible */}
            <div className="flex flex-col">
                <span className={`text-[10px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Lowest</span>
                <div className="flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span className={`text-xl font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                        {lowestPossible.toLocaleString()}
                    </span>
                </div>
            </div>

            <div className={`h-8 w-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`} />

            {/* Highest Possible */}
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
    </div>
  )
}