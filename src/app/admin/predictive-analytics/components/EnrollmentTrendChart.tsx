"use client"

import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts"
import { AnalyticPoint } from "../types"

interface Props {
  data: AnalyticPoint[]
  isDarkMode: boolean
  mode: string
}

export function EnrollmentTrendChart({ data, isDarkMode, mode }: Props) {
  return (
    <div className="h-[450px] w-full p-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
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
          
          <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />

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
            name="Optimistic Recovery"
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
            name="Linear Trend (Declining)"
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
            name="Realistic Forecast (Wavy)"
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
  )
}