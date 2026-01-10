// src/app/admin/dashboard/components/primitives.tsx

"use client"

import { memo, useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { ArrowUpRight } from "lucide-react"
import { ThemedText } from "@/components/ThemedText"
import { themeColors } from "@/lib/themeColors"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts"

export const AnimatedNumber = memo(({ value, duration = 800 }: { value: number, duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (displayValue === value) return
    
    setIsAnimating(true)
    const startValue = displayValue
    const diff = value - startValue
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(startValue + (diff * easeProgress))
      
      setDisplayValue(current)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }
    
    requestAnimationFrame(animate)
  }, [value, displayValue, duration])

  return (
    <span className={`inline-block transition-all duration-300 ${isAnimating ? 'scale-110 text-purple-600 dark:text-purple-400' : ''}`}>
      {displayValue.toLocaleString()}
    </span>
  )
})
AnimatedNumber.displayName = "AnimatedNumber"

export const MetricCard = memo(({ label, value, colorLight, colorDark, icon, isDarkMode, textColor = "text-white" }: any) => {
  return (
    <Card 
      className={`p-6 md:p-10 rounded-[32px] md:rounded-[56px] ${textColor} flex justify-between items-center shadow-2xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-500 border-none`}
      style={{
        background: isDarkMode ? colorDark : colorLight
      }}
    >
      <div className="absolute top-0 right-0 w-32 md:w-48 h-32 md:h-48 bg-white/5 blur-[80px] rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
      <div className="relative z-10">
        <p className="text-[9px] md:text-[11px] font-black uppercase opacity-60 tracking-[0.3em] mb-2">{label}</p>
        <h3 className="text-4xl md:text-7xl font-black tracking-tighter leading-none">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h3>
      </div>
      <div className="w-16 md:w-24 h-16 md:h-24 bg-white/10 rounded-[24px] md:rounded-[40px] flex items-center justify-center group-hover:scale-110 transition-transform relative z-10 shadow-lg backdrop-blur-md border border-white/10">{icon}</div>
    </Card>
  )
})
MetricCard.displayName = "MetricCard"

export const StatCard = memo(({ title, value, icon, color, bg, trend, isDarkMode, highlightColor }: any) => {
  const isHighlighted = !isDarkMode && highlightColor;

  return (
    <Card 
      className="p-6 md:p-10 rounded-[32px] md:rounded-[48px] flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 h-full group min-h-[180px]"
      style={{
        backgroundColor: isDarkMode ? themeColors.dark.surface : (isHighlighted ? highlightColor : themeColors.light.surface),
        borderColor: isDarkMode ? themeColors.dark.border : (isHighlighted ? 'transparent' : themeColors.light.border)
      }}
    >
      <div className="space-y-4 md:space-y-6">
        <div className={`w-12 md:w-16 h-12 md:h-16 rounded-2xl md:rounded-3xl flex items-center justify-center text-xl md:text-3xl ${isDarkMode ? 'bg-slate-800' : (isHighlighted ? 'bg-white/20 text-white' : bg)} ${!isHighlighted ? color : ''} transition-transform group-hover:rotate-6 shadow-lg shadow-slate-100 dark:shadow-none`}>{icon}</div>
        <div>
          <ThemedText variant="h2" className="text-3xl md:text-5xl leading-none" isDarkMode={isDarkMode} style={isHighlighted ? { color: 'white' } : {}}>
            {typeof value === 'number' ? value.toLocaleString() : value ?? 0}
          </ThemedText>
          <ThemedText variant="caption" className="mt-2 md:mt-4 text-[10px] md:text-[11px]" isDarkMode={isDarkMode} style={isHighlighted ? { color: 'rgba(255,255,255,0.8)' } : {}}>{title}</ThemedText>
        </div>
      </div>
      <div className="mt-4 md:mt-8 pt-4 md:pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between" style={isHighlighted ? { borderColor: 'rgba(255,255,255,0.2)' } : {}}>
         <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest ${isHighlighted ? 'text-white/80' : 'text-slate-300 dark:text-slate-600'}`}>{trend}</span>
         <ArrowUpRight size={14} className={`${isHighlighted ? 'text-white/80' : 'text-slate-200 dark:text-slate-600'} group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors`} />
      </div>
    </Card>
  )
})
StatCard.displayName = "StatCard"

export const VelocityChart = memo(({ data, isDarkMode }: { data: any[], isDarkMode: boolean }) => (
  <div className="h-[250px] md:h-[350px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={isDarkMode ? "#60a5fa" : "#2563eb"} stopOpacity={0.2}/>
            <stop offset="95%" stopColor={isDarkMode ? "#60a5fa" : "#2563eb"} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#334155" : "#cbd5e1"} />
        <XAxis 
          dataKey="date" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fontWeight: 900, fill: isDarkMode ? '#94a3b8' : '#475569' }} 
          dy={10} 
          interval={0} 
          angle={-45} 
          textAnchor="end" 
          height={60} 
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fontWeight: 900, fill: isDarkMode ? '#94a3b8' : '#475569' }} 
        />
        <Tooltip 
          contentStyle={{ 
            borderRadius: '24px', 
            border: 'none', 
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)', 
            fontWeight: '900', 
            fontSize: '10px',
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            color: isDarkMode ? '#ffffff' : '#0f172a'
          }} 
        />
        <Area 
          type="monotone" 
          dataKey="count" 
          name="Applicants" 
          stroke={isDarkMode ? "#60a5fa" : "#2563eb"} 
          strokeWidth={4} 
          fillOpacity={1} 
          fill="url(#colorIn)" 
          animationDuration={3000} 
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
))
VelocityChart.displayName = "VelocityChart"

export const StrandPieChart = memo(({ data, total, isDarkMode }: { data: any[], total: number, isDarkMode: boolean }) => (
  <div className="h-[250px] md:h-[280px] w-full relative">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={10} dataKey="value" animationDuration={1500}>
          {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />)}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            borderRadius: '24px', 
            border: 'none', 
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)', 
            fontWeight: '900', 
            fontSize: '10px',
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            color: isDarkMode ? '#ffffff' : '#0f172a'
          }} 
        />
      </PieChart>
    </ResponsiveContainer>
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
      <p className={`text-2xl md:text-3xl font-black leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{total}</p>
      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">Active</p>
    </div>
  </div>
))
StrandPieChart.displayName = "StrandPieChart"
