"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { AnalyticPoint } from "../types"

interface Props {
  data: AnalyticPoint[]
  isDarkMode: boolean
}

export function MarketPotentialChart({ data, isDarkMode }: Props) {
  // Filter out future predictions for the market chart 
  const displayData = data.filter(d => d.type !== 'future')

  return (
    <div className="w-full relative group/chart">
       {/* Background decorative glows */}
       <div className="absolute top-1/4 right-1/4 w-48 h-48 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
       
       <div className="h-[350px] w-full mt-4 relative z-10">
       <ResponsiveContainer width="100%" height="100%">
        <BarChart data={displayData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="barJHS" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>
              <linearGradient id="barALS" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#db2777" />
              </linearGradient>
              <linearGradient id="barOthers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>

            <CartesianGrid 
              strokeDasharray="4 4" 
              vertical={false} 
              stroke={isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} 
            />
            
            <XAxis 
              dataKey="year" 
              fontSize={10} 
              stroke={isDarkMode ? "#475569" : "#94a3b8"} 
              tickLine={false}
              axisLine={false}
              tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}
              dy={15}
            />
            
            <YAxis 
                fontSize={10} 
                stroke={isDarkMode ? "#475569" : "#94a3b8"} 
                tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}k`} 
                tickLine={false}
                axisLine={false}
                tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontWeight: 700 }}
                dx={-15}
            />
            
            <RechartsTooltip 
                cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className={`backdrop-blur-xl border-2 p-3 rounded-2xl shadow-2xl transition-all duration-300 transform scale-105 ${
                        isDarkMode ? 'bg-slate-900/90 border-slate-700 shadow-slate-900' : 'bg-white/90 border-slate-100 shadow-slate-200'
                      }`}>
                        <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          S.Y. {label}
                        </p>
                        <div className="space-y-2">
                          {payload.map((item: any, index: number) => (
                            <div key={index} className="flex items-center justify-between gap-6">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                  {item.name}
                                </span>
                              </div>
                              <span className={`text-xs font-black tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {Number(item.value).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
            />
            
            <Bar 
                dataKey="marketJHS" 
                name="JHS Pool" 
                fill="url(#barJHS)" 
                radius={[4, 4, 0, 0]} 
                stackId="a"
                barSize={36}
            />
            <Bar 
                dataKey="marketALS" 
                name="ALS Pool" 
                fill="url(#barALS)" 
                radius={[4, 4, 0, 0]} 
                stackId="a"
                barSize={36}
            />
            <Bar 
                dataKey="marketTransferees" 
                name="Payee" 
                fill="url(#barOthers)" 
                radius={[4, 4, 0, 0]} 
                stackId="a"
                barSize={36}
            />
        </BarChart>
    </ResponsiveContainer>
    </div>

    {/* Legend - SaaS Style */}
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 px-6 pt-4 pb-2">
      {[
        { name: "JHS Pool", color: "#6366f1" },
        { name: "ALS Pool", color: "#ec4899" },
        { name: "Payee Pool", color: "#10b981" },
      ].map(item => (
        <div key={item.name} className="flex items-center gap-2 group cursor-default">
          <div className="w-2 h-2 rounded-full transition-transform group-hover:scale-125" style={{ backgroundColor: item.color }} />
          <span className={`text-[9px] font-black uppercase tracking-[0.15em] transition-colors ${isDarkMode ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600'}`}>
            {item.name}
          </span>
        </div>
      ))}
    </div>
    </div>
  )
}