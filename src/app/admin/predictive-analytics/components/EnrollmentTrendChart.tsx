"use client"

import { ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts"
import { AnalyticPoint } from "../types"

interface Props {
  data: AnalyticPoint[]
  isDarkMode: boolean
  mode: string
}

const LEGEND_ITEMS = [
  { name: "History", color: "#6366f1", dashArray: "",        gradient: "from-indigo-500 to-violet-600" }, 
  { name: "Optimistic",  color: "#10b981", dashArray: "8 4",     gradient: "from-emerald-400 to-teal-500"   },
  { name: "Realistic",      color: "#3b82f6", dashArray: "2 2",     gradient: "from-blue-400 to-indigo-500"   },
  { name: "Pessimistic", color: "#f43f5e", dashArray: "4 4",     gradient: "from-rose-400 to-pink-600"     },
]

export function EnrollmentTrendChart({ data, isDarkMode, mode }: Props) {
  return (
    <div className="w-full relative group/chart">
      {/* Background decorative glows */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="h-[300px] md:h-[450px] w-full px-2 pt-6 pb-2 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="colorHistory" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="4 4" 
              vertical={false} 
              stroke={isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} 
            />
            
            <XAxis 
              dataKey="year" 
              stroke={isDarkMode ? "#475569" : "#94a3b8"} 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
              dy={15}
              tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}
            />
            <YAxis 
              stroke={isDarkMode ? "#475569" : "#94a3b8"} 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
              dx={-15}
              tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontWeight: 700 }}
            />
            
            <RechartsTooltip 
              cursor={{ 
                stroke: isDarkMode ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)', 
                strokeWidth: 2,
                strokeDasharray: '5 5'
              }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  // Deduplicate by dataKey to prevent "History" showing twice (Line + Area)
                  const seen = new Set();
                  const filteredPayload = payload.filter((item: any) => {
                    if (item.dataKey === 'gap' || seen.has(item.dataKey)) return false;
                    seen.add(item.dataKey);
                    return true;
                  });

                  return (
                    <div className={`backdrop-blur-xl border-2 p-4 rounded-2xl shadow-2xl transition-all duration-300 transform scale-105 ${
                      isDarkMode ? 'bg-slate-900/90 border-indigo-500/20 shadow-indigo-500/10' : 'bg-white/90 border-indigo-100 shadow-indigo-100'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        S.Y. {label}
                      </p>
                      <div className="space-y-2.5">
                        {filteredPayload.map((item: any, index: number) => {
                          const nameMap: any = {
                            historicalTotal: "History",
                            futureStable: "Optimistic",
                            futureWavy: "Realistic",
                            futureDeclining: "Declining"
                          };
                          const colorMap: any = {
                            historicalTotal: "#6366f1",
                            futureStable: "#10b981",
                            futureWavy: "#3b82f6",
                            futureDeclining: "#f43f5e"
                          };
                          const dotColor = colorMap[item.dataKey] || item.color;
                          return (
                            <div key={index} className="flex items-center justify-between gap-8">
                              <div className="flex items-center gap-2.5">
                                <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]" style={{ backgroundColor: dotColor }} />
                                <span className={`text-[11px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                  {nameMap[item.dataKey] || item.name}
                                </span>
                              </div>
                              <span className={`text-sm font-black tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {Number(item.value).toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            
            {/* Historical Area Fill */}
            <Area
              type="monotone"
              dataKey="historicalTotal"
              stroke="none"
              fill="url(#colorHistory)"
              connectNulls={true}
              isAnimationActive={true}
              animationDuration={2000}
              legendType="none"
              tooltipType="none"
            />

            {/* Historical Line */}
            <Line 
              type="monotone" 
              dataKey="historicalTotal" 
              name="History"
              stroke="#6366f1" 
              strokeWidth={4}
              dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: isDarkMode ? "#0f172a" : "#ffffff" }}
              activeDot={{ 
                r: 7, 
                strokeWidth: 4, 
                stroke: isDarkMode ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.1)",
                fill: "#6366f1"
              }}
              connectNulls={true} 
              animationDuration={1500}
            />

            {/* Scenario: Optimistic */}
            <Line 
              type="monotone" 
              dataKey="futureStable" 
              name="Optimistic"
              stroke="#10b981" 
              strokeWidth={3} 
              strokeDasharray="8 4"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: "#10b981" }}
              connectNulls={true}
            />

            {/* Scenario: Pessimistic */}
            <Line 
              type="monotone" 
              dataKey="futureDeclining" 
              name="Pessimistic"
              stroke="#f43f5e" 
              strokeWidth={3} 
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: "#f43f5e" }}
              connectNulls={true}
            />

            {/* Scenario: Realistic */}
            <Line 
              type="natural" 
              dataKey="futureWavy" 
              name="Realistic"
              stroke="#3b82f6" 
              strokeWidth={3} 
              strokeDasharray="2 2"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: "#3b82f6" }}
              connectNulls={true}
            />

            {/* Gap Indicator */}
            <Bar 
              dataKey="gap" 
              fill="transparent" 
              stroke={isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)"} 
              strokeDasharray="3 3" 
              strokeWidth={1.5}
              barSize={2}
              legendType="none"
            />

          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Legend - SaaS Style */}
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 px-6 pt-2 pb-8">
        {LEGEND_ITEMS.map(item => (
          <div key={item.name} className="flex items-center gap-3 group cursor-default">
            <div className={`relative flex items-center justify-center p-1 rounded-lg transition-all duration-300 bg-slate-500/5 group-hover:bg-slate-500/10`}>
              <div 
                className={`w-3 h-3 rounded-full opacity-40 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110 shadow-lg bg-gradient-to-br ${item.gradient}`} 
              />
            </div>
            <span className={`text-[11px] font-black uppercase tracking-widest transition-colors ${isDarkMode ? 'text-slate-500 group-hover:text-slate-200' : 'text-slate-400 group-hover:text-slate-700'}`}>
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}