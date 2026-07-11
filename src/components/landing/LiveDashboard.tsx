"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useInView } from "framer-motion"
import { supabase } from "@/lib/supabase/client"
import { Orbit, CheckCircle2, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

// ── ANIMATED COUNTER ────────────────────────────────────────────────────────
function useCountUp(target: number, initialDuration = 1200, trigger = true) {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    if (!trigger) return
    let startTime: number | null = null
    let animationFrame: number
    const duration = initialDuration

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(easeOutQuart * target))
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(step)
      }
    }
    
    animationFrame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationFrame)
  }, [target, trigger, initialDuration])

  return count
}

// ── VISUAL METRIC COMPONENT ─────────────────────────────────────────────────
function VisualMetric({ label, current, max, color }: { label: string, current: number, max: number, color: 'blue' | 'red' }) {
  const pct = max > 0 ? (current / max) * 100 : 0
  const colorMap = {
    blue: { bar: 'bg-[#003399]', track: 'bg-slate-200' },
    red: { bar: 'bg-red-500', track: 'bg-slate-200' }
  }

  return (
    <div className="bg-white/90 border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="flex justify-between items-end mb-3">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        <span className="text-2xl font-black text-slate-900 tracking-tighter">{current}</span>
      </div>
      <div className={cn("h-2 rounded-full overflow-hidden", colorMap[color].track)}>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
          className={cn("h-full rounded-full", colorMap[color].bar)}
        />
      </div>
      <div className="mt-3 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
        <span>Limit: {max}</span>
        {pct >= 100 && <span className="text-red-500 flex items-center gap-1"><Lock size={10} /> Full</span>}
      </div>
    </div>
  )
}

export function LiveDashboard({ isMobile = false }: { isMobile?: boolean }) {
  const [config, setConfig] = useState<any>(null)
  const [stats, setStats] = useState({ totalCount: 0, totalMax: 0, ictCount: 0, ictMax: 0, gasCount: 0, gasMax: 0 })
  const statsRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(statsRef, { once: true, margin: "-50px" })
  
  useEffect(() => {
    async function fetchData() {
      // Fetch system config
      const { data: c } = await supabase.from('system_config').select('*').order('updated_at', { ascending: false }).limit(1).single()
      if (c) setConfig(c)
      
      const { count: ict } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('strand', 'ICT').or('status.eq.Accepted,status.eq.Approved')
      const { count: gas } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('strand', 'GAS').or('status.eq.Accepted,status.eq.Approved')
      
      setStats(prev => ({
        ...prev,
        totalCount: (ict || 0) + (gas || 0),
        totalMax: c?.capacity || 0,
        ictCount: ict || 0,
        ictMax: Math.floor((c?.capacity || 0) / 2),
        gasCount: gas || 0,
        gasMax: Math.floor((c?.capacity || 0) / 2)
      }))
    }
    fetchData()

    const configChannel = supabase.channel('live_dashboard_config')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, fetchData)
      .subscribe()

    const studentsChannel = supabase.channel('live_dashboard_students')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, fetchData)
      .subscribe()

    return () => {
      supabase.removeChannel(configChannel)
      supabase.removeChannel(studentsChannel)
    }
  }, [])

  const animatedTotal = useCountUp(stats.totalMax - stats.totalCount, 1500, isInView)
  const isFormOpen = config?.is_portal_active

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
  }

  if (!config) return null

  return (
    <div 
      ref={statsRef}
      className={cn(
        "relative rounded-[40px] border p-8 md:p-10 transition-all duration-700 overflow-hidden",
        "bg-white/85 backdrop-blur-xl border-white/40 shadow-2xl",
        isMobile ? "w-full scale-100" : "w-full max-w-lg mx-auto hover:-translate-y-2"
      )}
    >
      {/* Background seal/watermark */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
        <img src="/logo-aclc.png" alt="" className="absolute -right-20 -top-20 w-[600px] h-[600px] object-contain rotate-12 blur-[2px]" />
      </div>

      <div className="relative z-10 flex justify-between items-start mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live View</span>
          </div>
          <h3 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 uppercase">Strand Distribution</h3>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm shrink-0 border border-slate-100">
          <img src="/logo-aclc.png" alt="Logo" className="w-8 h-8 object-contain" />
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-4 mb-6">
        <VisualMetric label="ICT" current={stats.ictCount} max={stats.ictMax} color="blue" />
        <VisualMetric label="GAS" current={stats.gasCount} max={stats.gasMax} color="blue" />
      </div>

      <div className="relative z-10 bg-white/70 backdrop-blur-md rounded-3xl p-6 md:p-8 flex items-center justify-between shadow-inner border border-white/50 mb-6 group">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-2">Remaining Slots</p>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl md:text-7xl font-black tracking-tighter text-slate-900 group-hover:scale-105 origin-left transition-transform duration-500">
              {animatedTotal}
            </span>
            <span className="text-xl font-bold text-slate-400">/ {stats.totalMax}</span>
          </div>
        </div>
        <div className="text-slate-300">
          <Orbit size={48} className="animate-spin-slow" strokeWidth={1} />
        </div>
      </div>

    </div>
  )
}
