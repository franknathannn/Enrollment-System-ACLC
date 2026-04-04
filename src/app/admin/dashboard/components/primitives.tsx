// src/app/admin/dashboard/components/primitives.tsx

"use client"

import { memo, useEffect, useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { ThemedText } from "@/components/ThemedText"
import { themeColors } from "@/lib/themeColors"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

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
  }, [value, duration]) // Removed displayValue to prevent infinite loop/jitter

  return (
    <span className={`inline-block transition-all duration-300 ${isAnimating ? 'scale-110 text-purple-600 dark:text-purple-400' : ''}`}>
      {displayValue.toLocaleString()}
    </span>
  )
})
AnimatedNumber.displayName = "AnimatedNumber"

export const AnimatedText = memo(({ text, className }: { text: string | number | null | undefined, className?: string }) => {
  const [isAnimating, setIsAnimating] = useState(false)
  const prevText = useRef(text)

  useEffect(() => {
    if (prevText.current !== text) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 800)
      prevText.current = text
      return () => clearTimeout(timer)
    }
  }, [text])

  return (
    <span className={`transition-all duration-500 inline-block ${isAnimating ? 'text-purple-600 dark:text-purple-400 scale-105 font-black' : ''} ${className || ''}`}>
      {text || "—"}
    </span>
  )
})
AnimatedText.displayName = "AnimatedText"

export const MetricCard = memo(({ label, value, colorLight, colorDark, icon, isDarkMode, textColor = "text-white", tooltip }: any) => {
  const content = (
    <Card
        className={`p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] ${textColor} flex justify-between items-center relative overflow-hidden group hover:-translate-y-1 active:scale-[0.98] transition-all duration-500 border-none cursor-default touch-manipulation shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10`}
        style={{
          background: isDarkMode ? colorDark : colorLight
        }}
      >
        {/* SaaS Decorative Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 blur-[100px] rounded-full group-hover:bg-white/20 transition-all duration-700" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-black/5 blur-[80px] rounded-full group-hover:bg-black/10 transition-all duration-700" />
        
        <div className="relative z-10 flex-1">
          <p className="text-[10px] md:text-[12px] font-black uppercase opacity-70 tracking-[0.25em] mb-3 drop-shadow-sm">{label}</p>
          <h3 className="text-5xl md:text-8xl font-black tracking-tighter leading-none drop-shadow-md">
            {typeof value === 'number' ? <span className="tabular-nums">{value.toLocaleString()}</span> : value}
          </h3>
        </div>
        
        <div className={`w-20 md:w-32 h-20 md:h-32 rounded-[32px] md:rounded-[48px] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 relative z-10 shadow-2xl backdrop-blur-xl border ring-1 ${isDarkMode ? 'bg-white/15 border-white/20 ring-white/10' : 'bg-slate-900/10 border-slate-900/15 ring-slate-900/5'}`}>
          <div className="scale-110 md:scale-150 drop-shadow-lg">
            {icon}
          </div>
        </div>
      </Card>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent className="bg-slate-950 text-white border-slate-800 backdrop-blur-md px-4 py-2 rounded-xl">
          <p className="font-bold text-[10px] uppercase tracking-widest">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return content;
})
MetricCard.displayName = "MetricCard"

export const StatCard = memo(({ title, value, icon, color, bg, trend, isDarkMode, highlightColor, tooltip, href }: any) => {
  const isHighlighted = !isDarkMode && highlightColor;

  // Derive a top-accent color from the `color` prop (e.g. "text-emerald-600 dark:text-emerald-400" → emerald)
  const accentColor = (() => {
    if (!color) return null
    if (color.includes('emerald'))  return 'from-emerald-500 to-emerald-400'
    if (color.includes('indigo'))   return 'from-indigo-500 to-indigo-400'
    if (color.includes('orange'))   return 'from-orange-500 to-orange-400'
    if (color.includes('amber'))    return 'from-amber-500 to-amber-400'
    if (color.includes('blue'))     return 'from-blue-500 to-blue-400'
    if (color.includes('purple'))   return 'from-purple-500 to-purple-400'
    if (color.includes('red'))      return 'from-red-500 to-red-400'
    return 'from-blue-500 to-blue-400'
  })()

  const content = (
    <Card
      className={`rounded-[2.5rem] md:rounded-[3.5rem] flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1.5 active:scale-[0.98] transition-all duration-500 h-full group min-h-[220px] touch-manipulation overflow-hidden border-2`}
      style={{
        backgroundColor: isDarkMode ? themeColors.dark.surface : (isHighlighted ? highlightColor : themeColors.light.surface),
        borderColor: isDarkMode ? themeColors.dark.border : (isHighlighted ? 'transparent' : 'rgba(226, 232, 240, 0.5)')
      }}
    >
      {!isHighlighted && accentColor && (
        <div className={`h-1 w-full bg-gradient-to-r ${accentColor} opacity-50 shrink-0 group-hover:opacity-100 transition-opacity duration-500`} />
      )}
      
      <div className="p-8 md:p-10 flex flex-col justify-between flex-1 relative">
        {/* Subtle Background Pattern */}
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500 pointer-events-none">
          {icon && typeof icon !== 'string' && icon}
        </div>

        <div className="space-y-6 md:space-y-8 relative z-10">
          <div className={`w-14 md:w-20 h-14 md:h-20 rounded-3xl md:rounded-[2rem] flex items-center justify-center text-2xl md:text-4xl ${isDarkMode ? 'bg-slate-800/80' : (isHighlighted ? 'bg-white/20 text-white' : bg)} ${!isHighlighted ? color : ''} transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 shadow-lg border border-white/10`}>
            {icon}
          </div>
          
          <div>
            <div className="flex items-baseline gap-1">
              <ThemedText variant="h2" className="text-4xl md:text-6xl font-black tracking-tighter leading-none tabular-nums" isDarkMode={isDarkMode} style={isHighlighted ? { color: 'white' } : {}}>
                {typeof value === 'number' ? value.toLocaleString() : value ?? 0}
              </ThemedText>
            </div>
            <ThemedText variant="caption" className="mt-3 md:mt-5 text-[10px] md:text-[12px] font-black uppercase tracking-[0.2em] opacity-60" isDarkMode={isDarkMode} style={isHighlighted ? { color: 'rgba(255,255,255,0.8)' } : {}}>{title}</ThemedText>
          </div>
        </div>

        <div className="mt-6 md:mt-10 pt-6 md:pt-8 border-t border-slate-100/50 dark:border-slate-800/50 flex items-center justify-between" style={isHighlighted ? { borderColor: 'rgba(255,255,255,0.2)' } : {}}>
           <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] ${isHighlighted ? 'text-white/80' : isDarkMode ? 'text-slate-500 group-hover:text-blue-400' : 'text-slate-400 group-hover:text-blue-600'} transition-colors duration-300`}>
            {trend}
           </span>
           <div className={`p-2 rounded-xl transition-all duration-300 ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
            <ArrowUpRight size={14} className={`${isHighlighted ? 'text-white' : isDarkMode ? 'text-slate-500 group-hover:text-blue-400' : 'text-slate-400 group-hover:text-blue-600'} transition-colors`} />
           </div>
        </div>
      </div>
    </Card>
  );

  const wrappedContent = href ? (
    <Link href={href} className="block cursor-pointer">
      {content}
    </Link>
  ) : content;

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {wrappedContent}
        </TooltipTrigger>
        <TooltipContent className="bg-slate-950 text-white border-slate-800">
          <p className="font-medium text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return wrappedContent;
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
        <RechartsTooltip 
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
        <RechartsTooltip 
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