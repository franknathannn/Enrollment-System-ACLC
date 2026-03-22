"use client"

import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts"
import { AnalyticPoint } from "../types"

interface Props {
  data: AnalyticPoint[]
  isDarkMode: boolean
  mode: string
}

const LEGEND_ITEMS = [
  { name: "Enrolled History",   color: "#0ea5e9", dashArray: ""       },
  { name: "If Enrollment Grows",  color: "#10b981", dashArray: "10 6"   },
  { name: "If Enrollment Slows",  color: "#ef4444", dashArray: "5 5"    },
  { name: "Most Likely",          color: "#8b5cf6", dashArray: "3 3"    },
]

export function EnrollmentTrendChart({ data, isDarkMode, mode }: Props) {
  return (
    <div className="w-full">
    <div className="h-[260px] md:h-[420px] w-full px-2 pt-4 pb-1">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1e293b" : "#e2e8f0"} />
          
          <XAxis 
            dataKey="year" 
            stroke={isDarkMode ? "#94a3b8" : "#64748b"} 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            dy={10}
            tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 500 }}
          />
          <YAxis 
            stroke={isDarkMode ? "#94a3b8" : "#64748b"} 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            dx={-10}
            tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 500 }}
          />
          
          <RechartsTooltip 
            contentStyle={{ 
              backgroundColor: isDarkMode ? "#0f172a" : "#ffffff", 
              borderColor: isDarkMode ? "#1e293b" : "#e2e8f0",
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              color: isDarkMode ? '#f1f5f9' : '#0f172a'
            }}
            itemStyle={{ fontSize: '13px', fontWeight: 600 }}
            labelStyle={{ color: isDarkMode ? "#94a3b8" : "#64748b", fontWeight: 700 }}
          />
          
          {/* Historical Line */}
          <Line 
            type="monotone" 
            dataKey="historicalTotal" 
            name="Enrolled History"
            stroke="#0ea5e9" 
            strokeWidth={4}
            dot={{ r: 5, fill: "#0ea5e9", strokeWidth: 2, stroke: isDarkMode ? "#0f172a" : "#ffffff" }}
            activeDot={{ r: 8, strokeWidth: 0 }}
            connectNulls={true} 
            animationDuration={1500}
          />

          {/* Scenario 1: Stable/Optimistic (If drop is not final) */}
          <Line 
            type="monotone" 
            dataKey="futureStable" 
            name="If Enrollment Grows"
            stroke="#10b981" // Emerald Green
            strokeWidth={4} 
            strokeDasharray="10 6"
            dot={{ 
                r: 5, 
                fill: "#10b981", 
                strokeWidth: 2, 
                stroke: isDarkMode ? "#0f172a" : "#ffffff" 
            }}
            activeDot={{ r: 8, strokeWidth: 0 }}
            connectNulls={true}
            animationDuration={1500}
          />

          {/* Scenario 2: Declining/Real (If drop is real) */}
          <Line 
            type="monotone" 
            dataKey="futureDeclining" 
            name="If Enrollment Slows"
            stroke="#ef4444" // Red
            strokeWidth={4} 
            strokeDasharray="5 5"
            dot={{ 
                r: 5, 
                fill: "#ef4444", 
                strokeWidth: 2, 
                stroke: isDarkMode ? "#0f172a" : "#ffffff" 
            }}
            activeDot={{ r: 8, strokeWidth: 0 }}
            connectNulls={true}
            animationDuration={1500}
          />

          {/* Scenario 3: Wavy/Oscillating */}
          <Line 
            type="natural" 
            dataKey="futureWavy" 
            name="Most Likely"
            stroke="#8b5cf6" // Violet
            strokeWidth={4} 
            strokeDasharray="3 3"
            dot={{ 
                r: 4, 
                fill: "#8b5cf6", 
                strokeWidth: 2, 
                stroke: isDarkMode ? "#0f172a" : "#ffffff" 
            }}
            activeDot={{ r: 8, strokeWidth: 0 }}
            connectNulls={true}
            animationDuration={1500}
          />

          {/* Gap Line (Visual dashed line for current year gap) */}
          <Bar 
            dataKey="gap" 
            fill="transparent" 
            stroke={isDarkMode ? "#94a3b8" : "#64748b"} 
            strokeDasharray="3 3" 
            strokeWidth={2}
            barSize={1}
            legendType="none"
            isAnimationActive={false}
          />

        </ComposedChart>
      </ResponsiveContainer>
    </div>

    {/* Custom legend — rendered outside the chart so it never overlaps */}
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-4 pb-4">
      {LEGEND_ITEMS.map(item => (
        <div key={item.name} className="flex items-center gap-1.5">
          <svg width="20" height="4" className="shrink-0">
            {item.dashArray
              ? <line x1="0" y1="2" x2="20" y2="2" stroke={item.color} strokeWidth="2.5" strokeDasharray={item.dashArray} />
              : <line x1="0" y1="2" x2="20" y2="2" stroke={item.color} strokeWidth="2.5" />
            }
          </svg>
          <span style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: '10px', fontWeight: 600 }}>
            {item.name}
          </span>
        </div>
      ))}
    </div>
    </div>
  )
}