"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { AnalyticPoint } from "../types"

interface Props {
  data: AnalyticPoint[]
  isDarkMode: boolean
}

export function MarketPotentialChart({ data, isDarkMode }: Props) {

  // Filter out future predictions for the market chart 
  const displayData = data.filter(d => d.type !== 'future')

  return (
    <div className="h-[350px] w-full">
       <ResponsiveContainer width="100%" height="100%">
        <BarChart data={displayData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1e293b" : "#e2e8f0"} />
            
            <XAxis 
              dataKey="year" 
              fontSize={10} 
              stroke={isDarkMode ? "#94a3b8" : "#64748b"} 
              tickLine={false}
              axisLine={false}
              tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 500 }}
            />
            
            <YAxis 
                fontSize={10} 
                stroke={isDarkMode ? "#94a3b8" : "#64748b"} 
                tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}k`} 
                tickLine={false}
                axisLine={false}
                tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 500 }}
            />
            
            <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ 
                    backgroundColor: isDarkMode ? "#0f172a" : "#ffffff", 
                    borderColor: isDarkMode ? "#1e293b" : "#e2e8f0",
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    color: isDarkMode ? '#f1f5f9' : '#0f172a'
                }}
                formatter={(value: any) => [
                  Number(value).toLocaleString(), 
                  undefined
                ]}
                labelStyle={{ color: isDarkMode ? "#94a3b8" : "#64748b", marginBottom: '0.5rem', fontWeight: 700 }}
            />
            
            <Legend iconType="circle" />
            
            <Bar 
                dataKey="marketJHS" 
                name="JHS Graduates" 
                fill="#6366f1" 
                radius={[4, 4, 0, 0]} 
                stackId="a"
            />
            <Bar 
                dataKey="marketALS" 
                name="ALS Passers" 
                fill="#ec4899" 
                radius={[4, 4, 0, 0]} 
                stackId="a"
            />
            {/* NEW GREEN BAR FOR TRANSFEREES */}
            <Bar 
                dataKey="marketTransferees" 
                name="Payee" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]} 
                stackId="a"
            />
        </BarChart>
    </ResponsiveContainer>
    </div>
  )
}