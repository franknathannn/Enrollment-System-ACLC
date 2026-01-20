"use client"

import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { AnalyticPoint, SimulationMode } from "../types"

interface Props {
  data: AnalyticPoint[]
  isDarkMode: boolean
  mode: SimulationMode
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
          
          <Tooltip 
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

          {/* Future/Simulation Line */}
          <Line 
            type="monotone" 
            dataKey="futureTotal" 
            name={mode === 'simulation' ? "Simulated Outcome" : "Possible Projection"}
            stroke={mode === 'simulation' ? "#d946ef" : "#f59e0b"} // Hot Pink for simulation, Amber for normal
            strokeWidth={4} 
            strokeDasharray={mode === 'simulation' ? "0" : "10 6"} // Solid line if simulation, dashed if projection
            dot={{ 
                r: 5, 
                fill: mode === 'simulation' ? "#d946ef" : "#f59e0b", 
                strokeWidth: 2, 
                stroke: isDarkMode ? "#0f172a" : "#ffffff" 
            }}
            activeDot={{ r: 8, strokeWidth: 0 }}
            connectNulls={true}
            animationDuration={1500}
          />

        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}