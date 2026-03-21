"use client"

import { useEffect, useState, useRef, useCallback, startTransition } from "react"
import { supabase } from "@/lib/supabase/client"
import {
  ArrowRight, Activity, Cpu,
  BookOpen, Calendar, Zap,
  ShieldCheck, Target, Users2, Orbit,
  CheckCircle2, MapPin, Facebook, Globe, GraduationCap, Lock,
  Sun, Moon, Sparkles, TrendingUp
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useThemeStore } from "@/store/useThemeStore"

// ── TYPES ────────────────────────────────────────────────────────────────────
interface Particle { x: number; y: number; vx: number; vy: number; size: number; pulse: number; twinkle: number }
interface TailPoint { x: number; y: number }
interface ShootingStar { x: number; y: number; len: number; speed: number; opacity: number; angle: number; width: number; tail: TailPoint[]; dead: boolean }

// ── MOBILE DETECTION ─────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent))
    check()
    window.addEventListener("resize", check, { passive: true })
    return () => window.removeEventListener("resize", check)
  }, [])
  return isMobile
}

// ── ANIMATED COUNTER ─────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200, trigger = true) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!trigger || target === 0) return
    let current = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      current += step
      if (current >= target) { setVal(target); clearInterval(timer) }
      else setVal(Math.floor(current))
    }, 16)
    return () => clearInterval(timer)
  }, [target, trigger, duration])
  return val
}

// ── SCROLL REVEAL ────────────────────────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useScrollReveal()
  return (
    <div ref={ref} className={cn(className, "lg:transition-[opacity,transform] lg:duration-[700ms] lg:ease-out", visible ? "opacity-100 translate-y-0" : "opacity-100 translate-y-0 lg:opacity-0 lg:translate-y-8")} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

// ── STATS CARD ────────────────────────────────────────────────────────────────
function StatsCard({ stats, config, isMobile, isDark }: { stats: any, config: any, isMobile: boolean, isDark: boolean }) {
  const [statsVisible, setStatsVisible] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)

  const animIct     = useCountUp(stats.ictCount,                    1200, statsVisible)
  const animGas     = useCountUp(stats.gasCount,                    1200, statsVisible)
  const animVacancy = useCountUp(stats.totalMax - stats.totalCount, 1400, statsVisible)

  const displayIct     = isMobile ? stats.ictCount               : animIct
  const displayGas     = isMobile ? stats.gasCount               : animGas
  const displayVacancy = isMobile ? (stats.totalMax - stats.totalCount) : animVacancy

  useEffect(() => {
    const el = statsRef.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsVisible(true); obs.disconnect() } }, { threshold: 0.15 })
    obs.observe(el); return () => obs.disconnect()
  }, [])

  const d = isDark
  const isManual      = config?.control_mode === 'manual'
  const now           = new Date()
  const start         = config?.enrollment_start ? new Date(config.enrollment_start) : null
  const end           = config?.enrollment_end   ? new Date(config.enrollment_end)   : null
  const isExpired     = !isManual && end && now > end
  const isPortalActive = isManual
    ? config?.is_portal_active
    : (start && end && now >= start && now <= end)

  const getStatusText = () => {
    if (isManual) return isPortalActive ? "Enrollment Form is Open" : "System Lockdown"
    if (isExpired) return "Portal Expired"
    if (isPortalActive && config?.enrollment_start && config?.enrollment_end) {
      const s = new Date(config.enrollment_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const e = new Date(config.enrollment_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return `${s} — ${e}`
    }
    return "Admissions Offline"
  }

  return (
    <div className={cn("lg:col-span-5 relative", !isMobile && "float")} ref={statsRef}>
      <div className={cn("absolute -inset-8 rounded-[65px] blur-3xl transition-[opacity,background] duration-700", d ? "bg-indigo-600/10" : "bg-indigo-300/20")} />
      <div className={cn("absolute -inset-4 rounded-[60px] blur-2xl transition-[opacity,background] duration-700", d ? "bg-blue-500/6" : "bg-blue-200/20")} />
      <div className={cn(
        "relative rounded-[36px] md:rounded-[48px] border overflow-hidden backdrop-blur-3xl",
        "transition-[background,border-color,box-shadow] duration-500",
        d ? "bg-gradient-to-b from-[#0d1433]/80 to-[#060c20]/90 border-white/10 shadow-[0_40px_100px_rgba(0,0,40,0.6)]"
          : "bg-white/90 border-blue-100 shadow-[0_30px_80px_rgba(99,102,241,0.18)]"
      )}>
        <div className="h-[3px] w-full bg-gradient-to-r from-blue-500 via-violet-500 via-indigo-400 to-cyan-400" />
        <div className="p-6 md:p-8 space-y-6 md:space-y-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className={cn("text-sm font-black uppercase tracking-tight", d ? "text-white" : "text-slate-900")}>Strand Distribution</h3>
              <p className={cn("text-[10px] font-bold uppercase tracking-[0.35em] mt-1", d ? "text-blue-400" : "text-blue-600")}>Real-time Academic Tracker</p>
            </div>
            <div className={cn("p-2.5 rounded-xl", d ? "bg-indigo-900/40" : "bg-blue-50")}>
              <Target size={18} className={cn("lg:animate-pulse", d ? "text-indigo-400" : "text-blue-600")} />
            </div>
          </div>

          {/* Bars */}
          <div className="space-y-6 md:space-y-7">
            <PrettyBar label="ICT Division" icon={<Cpu size={12} />} current={displayIct} max={stats.ictMax} color="blue" isDark={d} />
            <PrettyBar label="GAS Division" icon={<BookOpen size={12} />} current={displayGas} max={stats.gasMax} color="indigo" isDark={d} />
          </div>

          {/* Vacancy counter */}
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl p-6 md:p-7" style={{
            background: d
              ? "linear-gradient(135deg,#1e3a8a 0%,#312e81 50%,#1e1b4b 100%)"
              : "linear-gradient(135deg,#2563eb 0%,#4f46e5 100%)"
          }}>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent_60%)]" />
            <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/4 rounded-full" />
            <p className="relative text-[10px] font-black uppercase tracking-[0.4em] text-white/50 mb-1">Open Slots</p>
            <p className="relative text-[3.5rem] md:text-[4.5rem] font-black leading-none text-white tracking-tight tabular-nums">{displayVacancy}</p>
            <p className="relative text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2">of {stats.totalMax} total seats</p>
            <div className="absolute right-6 bottom-6">
              <Orbit size={38} className="text-white/10 lg:animate-spin" style={{ animationDuration: '14s' }} />
            </div>
          </div>

          {/* Status row */}
          <div className={cn("flex items-center gap-4 pt-4 border-t", d ? "border-white/6" : "border-slate-100")}>
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
              isPortalActive
                ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30"
                : d ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-400"
            )}>
              {isManual
                ? <Zap size={16} className={isPortalActive ? "text-white" : ""} />
                : <Calendar size={16} className={isPortalActive ? "text-white" : ""} />}
            </div>
            <div>
              <p className={cn("text-[10px] font-bold uppercase tracking-widest", d ? "text-slate-500" : "text-slate-400")}>Application Status</p>
              <p className={cn(
                "text-sm font-black uppercase tracking-tight mt-0.5",
                isPortalActive ? d ? "text-white" : "text-slate-900" : "text-red-400"
              )}>
                {getStatusText()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { isDark, toggleTheme } = useThemeStore()
  const isMobile = useIsMobile()
  const [config, setConfig] = useState<any>(null)
  const [stats, setStats] = useState({ totalCount: 0, totalMax: 0, ictCount: 0, ictMax: 0, gasCount: 0, gasMax: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDarkRef = useRef(isDark)
  useEffect(() => { isDarkRef.current = isDark }, [isDark])

  // Wrap in startTransition so React treats the re-render as low-priority,
  // keeping the UI responsive while CSS transitions handle the visual switch.
  const handleToggleTheme = () => startTransition(() => toggleTheme())

  const fetchDatabaseStats = useCallback(async () => {
    try {
      const { data: configData } = await supabase.from('system_config').select('*').single()
      if (configData) setConfig(configData)
      const [sectionsRes, studentsRes] = await Promise.all([
        supabase.from('sections').select('strand, capacity'),
        supabase.from('students').select('status, strand')
      ])
      const sections  = sectionsRes.data || []
      const students  = studentsRes.data || []
      const active    = students.filter(s => s.status === 'Accepted' || s.status === 'Approved')
      const ictMax    = sections.filter(s => s.strand === 'ICT').reduce((sum, s) => sum + (s.capacity || 40), 0)
      const ictCount  = active.filter(s => s.strand === 'ICT').length
      const gasMax    = sections.filter(s => s.strand === 'GAS').reduce((sum, s) => sum + (s.capacity || 40), 0)
      const gasCount  = active.filter(s => s.strand === 'GAS').length
      setStats({ totalCount: ictCount + gasCount, totalMax: ictMax + gasMax, ictCount, ictMax, gasCount, gasMax })
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => {
    fetchDatabaseStats()
    const channel = supabase.channel('matrix-live-home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' },     fetchDatabaseStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sections' },     fetchDatabaseStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config'}, fetchDatabaseStats)
      .subscribe()
    const interval = setInterval(fetchDatabaseStats, 3000)
    return () => { supabase.removeChannel(channel); clearInterval(interval) }
  }, [fetchDatabaseStats])

  // ── CANVAS — desktop only ────────────────────────────────────────────────
  useEffect(() => {
    if (isMobile) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext("2d"); if (!ctx) return

    let particles: Particle[] = []
    let shootingStars: ShootingStar[] = []
    let raf: number
    let frameCount = 0
    const mouse = { x: -9999, y: -9999 }

    const spawnStar = (): ShootingStar => ({
      x: Math.random() * canvas.width * 0.75, y: Math.random() * canvas.height * 0.45,
      len: Math.random() * 140 + 70, speed: Math.random() * 12 + 7, opacity: 1,
      angle: Math.PI / 4 + (Math.random() - 0.5) * 0.35, width: Math.random() * 1.4 + 0.4,
      tail: [], dead: false,
    })

    const init = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      particles = Array.from({ length: 55 }, (): Particle => ({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.3, pulse: Math.random() * Math.PI * 2,
        twinkle: Math.random() * 0.018 + 0.006,
      }))
    }

    const starSpawner = setInterval(() => { if (shootingStars.length < 2) shootingStars.push(spawnStar()) }, 3000)

    const animate = () => {
      frameCount++
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const dark = isDarkRef.current
      const pCol = dark ? [255, 255, 255] : [37, 99, 235]
      const lCol = dark ? [140, 180, 255] : [29, 78, 216]
      const n = particles.length

      particles.forEach((p: Particle) => {
        p.x += p.vx; p.y += p.vy; p.pulse += p.twinkle
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        const alpha = dark
          ? Math.max(0.08, 0.22 + Math.sin(p.pulse) * 0.18)
          : Math.max(0.05, 0.15 + Math.sin(p.pulse) * 0.10)
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${pCol.join(',')},${alpha})`; ctx.fill()

        const mx = mouse.x - p.x; const my = mouse.y - p.y
        const md = Math.sqrt(mx * mx + my * my)
        if (md < 180) {
          ctx.beginPath(); ctx.lineWidth = 0.8
          ctx.strokeStyle = `rgba(${lCol.join(',')},${(1 - md / 180) * 0.7})`
          ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke()
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${lCol.join(',')},${(1 - md / 180) * 0.28})`; ctx.fill()
        }
      })

      if (frameCount % 3 === 0) {
        for (let a = 0; a < n - 1; a++) {
          for (let b = a + 1; b < n; b += 2) {
            const dx = particles[a].x - particles[b].x; const dy = particles[a].y - particles[b].y
            const d2 = dx * dx + dy * dy
            if (d2 < 8100) {
              ctx.beginPath(); ctx.lineWidth = 0.3
              ctx.strokeStyle = `rgba(${lCol.join(',')},${(1 - Math.sqrt(d2) / 90) * 0.18})`
              ctx.moveTo(particles[a].x, particles[a].y); ctx.lineTo(particles[b].x, particles[b].y); ctx.stroke()
            }
          }
        }
      }

      shootingStars = shootingStars.filter(s => !s.dead)
      shootingStars.forEach((s: ShootingStar) => {
        s.tail.push({ x: s.x, y: s.y }); if (s.tail.length > 18) s.tail.shift()
        s.x += Math.cos(s.angle) * s.speed; s.y += Math.sin(s.angle) * s.speed; s.opacity -= 0.024
        if (s.opacity <= 0 || s.x > canvas.width + 80 || s.y > canvas.height + 80) { s.dead = true; return }
        s.tail.forEach((pt: TailPoint, i: number) => {
          const ratio = i / s.tail.length
          const r = dark ? [200, 220, 255] : [99, 140, 255]
          ctx.beginPath(); ctx.arc(pt.x, pt.y, s.width * ratio * 1.4, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r.join(',')},${ratio * s.opacity * (dark ? 0.85 : 0.65)})`; ctx.fill()
        })
        const headR = dark ? [220, 240, 255] : [120, 160, 255]
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.width * 5)
        grad.addColorStop(0, `rgba(${headR.join(',')},${s.opacity})`); grad.addColorStop(1, `rgba(${headR.join(',')},0)`)
        ctx.beginPath(); ctx.arc(s.x, s.y, s.width * 5, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill()
      })

      raf = requestAnimationFrame(animate)
    }

    const onMove  = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY }
    window.addEventListener("mousemove", onMove, { passive: true })
    window.addEventListener("resize", init, { passive: true })
    init(); animate()
    return () => { cancelAnimationFrame(raf); clearInterval(starSpawner); window.removeEventListener("mousemove", onMove); window.removeEventListener("resize", init) }
  }, [isMobile])

  const isManual      = config?.control_mode === 'manual'
  const now           = new Date()
  const start         = config?.enrollment_start ? new Date(config.enrollment_start) : null
  const end           = config?.enrollment_end   ? new Date(config.enrollment_end)   : null
  const isExpired     = !isManual && end && now > end
  const isPortalActive = isManual ? config?.is_portal_active : (start && end && now >= start && now <= end)
  const heroBadge     = config?.is_pre_enrollment ? "Pre-Enrollment" : isPortalActive ? "Enrollment Open" : "Enrollment Closed"
  const d = isDark

  return (
    <div className={cn(
      // min-h-[100dvh] = dynamic viewport height → works in Meta Messenger, Safari, etc.
      "min-h-[100dvh] font-sans overflow-x-hidden relative",
      "transition-[background-color] duration-500 ease-in-out",
      d ? "bg-[#030712] text-white" : "bg-[#eef2ff] text-slate-900"
    )}>

      {/* ── AURORA — CSS only, zero JS ───────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className={cn(
          "absolute top-[-20%] left-[-10%] w-[80vw] h-[70vh] rounded-full blur-[50px] sm:blur-[90px] transform-gpu",
          "transition-[opacity] duration-700 lg:animate-aurora-1",
          d ? "opacity-[0.18] bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-700"
            : "opacity-[0.22] bg-gradient-to-br from-blue-300 via-indigo-300 to-violet-300"
        )} />
        <div className={cn(
          "absolute top-[10%] right-[-15%] w-[60vw] h-[60vh] rounded-full blur-[60px] sm:blur-[110px] transform-gpu",
          "transition-[opacity] duration-700 lg:animate-aurora-2",
          d ? "opacity-[0.13] bg-gradient-to-bl from-cyan-500 via-blue-600 to-indigo-700"
            : "opacity-[0.16] bg-gradient-to-bl from-cyan-200 via-blue-200 to-indigo-200"
        )} />
        <div className={cn(
          "absolute bottom-[5%] left-[20%] w-[50vw] h-[40vh] rounded-full blur-[50px] sm:blur-[100px] transform-gpu",
          "transition-[opacity] duration-700 lg:animate-aurora-3",
          d ? "opacity-[0.1] bg-gradient-to-tr from-violet-600 via-purple-500 to-blue-500"
            : "opacity-[0.14] bg-gradient-to-tr from-violet-200 via-purple-200 to-blue-200"
        )} />
      </div>

      {/* Canvas — desktop only */}
      {!isMobile && (
        <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" style={{ willChange: "transform" }} aria-hidden="true" />
      )}
      {/* Mobile static CSS starfield */}
      {isMobile && (
        <div className={cn("fixed inset-0 pointer-events-none z-0", d ? "mobile-starfield" : "mobile-starfield-light")} aria-hidden="true" />
      )}

      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      {/* safe-top ensures content clears notch in Meta Messenger / iOS */}
      <nav className={cn(
        "fixed top-0 w-full z-50 backdrop-blur-2xl border-b safe-top",
        "transition-[background-color,border-color] duration-500",
        d ? "bg-[#030712]/65 border-white/5" : "bg-white/75 border-blue-200/60"
      )}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-[86px] flex items-center justify-between">
          {/* Logo + Brand */}
          <div className="flex items-center gap-3 md:gap-5 group cursor-pointer">
            <div className="relative flex items-center justify-center">
              <div className={cn("absolute inset-0 rounded-full blur-2xl transition-[opacity] duration-700 group-hover:scale-125",
                d ? "bg-blue-500/35" : "bg-blue-400/45")} />
              <img src="/logo-aclc.png" alt="ACLC" loading="eager"
                className="relative w-11 h-11 md:w-14 md:h-14 object-contain drop-shadow-[0_0_22px_rgba(99,160,255,0.95)] group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className={cn("font-black text-[18px] md:text-[22px] tracking-[-0.04em] uppercase italic", d ? "text-white" : "text-slate-900")}>ACLC</span>
                <span className={cn("text-[9px] md:text-[10px] font-black tracking-[0.2em] md:tracking-[0.25em] uppercase", d ? "text-blue-400" : "text-blue-600")}>Northbay</span>
              </div>
              <p className={cn("text-[7px] md:text-[7.5px] font-bold tracking-[0.35em] md:tracking-[0.45em] uppercase mt-0.5", d ? "text-slate-500" : "text-slate-400")}>AMA Education System</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className={cn(
              "hidden md:flex px-5 py-2 rounded-xl border text-[9px] font-black uppercase tracking-[0.3em]",
              "transition-[background-color,border-color,color] duration-300",
              d ? "bg-blue-950/60 border-blue-500/20 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"
            )}>
              S.Y. {config?.school_year || "2025–2026"}
            </div>
            {/* Theme toggle — min 44px touch target */}
            <button
              onClick={handleToggleTheme}
              aria-label="Toggle theme"
              style={{ touchAction: "manipulation" }}
              className={cn(
                "relative w-11 h-11 rounded-2xl flex items-center justify-center border overflow-hidden",
                "transition-[background-color,border-color] duration-300",
                d ? "bg-slate-800/80 border-white/10 lg:hover:bg-yellow-400/10 lg:hover:border-yellow-400/30"
                  : "bg-white border-slate-200 lg:hover:bg-blue-50 lg:hover:border-blue-300 shadow-sm"
              )}>
              <span className={cn("absolute transition-[opacity,transform] duration-500",
                d ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50")}>
                <Sun size={15} className="text-yellow-300" />
              </span>
              <span className={cn("absolute transition-[opacity,transform] duration-500",
                !d ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50")}>
                <Moon size={15} className="text-blue-600" />
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── MAIN ─────────────────────────────────────────────────────────────── */}
      {/* pt accounts for fixed navbar height (64px mobile / 86px desktop) */}
      <main className="relative z-10 pt-24 md:pt-32 lg:pt-44 pb-16 md:pb-24 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

            {/* ── HERO LEFT ─────────────────────────────────────────────────── */}
            <div className="lg:col-span-7 space-y-8 md:space-y-10">

              {/* Badge row */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.25em]",
                  "transition-[background-color,border-color,color] duration-300",
                  isPortalActive
                    ? d ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-300"
                        : "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : d ? "bg-slate-900/60 border-white/10 text-slate-400"
                        : "bg-slate-100 border-slate-300 text-slate-500"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                    isPortalActive ? "bg-emerald-400 lg:animate-pulse" : "bg-slate-500")} />
                  {heroBadge}
                </div>
                <div className={cn("h-px w-10 md:w-16", d ? "bg-white/10" : "bg-slate-300/60")} />
                <span className={cn("text-[10px] font-bold uppercase tracking-widest", d ? "text-slate-500" : "text-slate-400")}>
                  {config?.school_year || "2025–2026"}
                </span>
              </div>

              {/* Headline */}
              <div className="space-y-1">
                <h1 className={cn("font-black leading-[0.85] tracking-[-0.045em] uppercase", d ? "text-white" : "text-slate-900")}>
                  <span className="block text-[clamp(3.2rem,10vw,8.8rem)]">Shape</span>
                  <span
                    className="block text-[clamp(3.2rem,10vw,8.8rem)] text-transparent bg-clip-text shimmer-text"
                    style={{ backgroundImage: d
                      ? "linear-gradient(90deg,#93c5fd,#a5b4fc,#e0f2fe,#818cf8,#93c5fd)"
                      : "linear-gradient(90deg,#2563eb,#4f46e5,#0ea5e9,#3b82f6,#2563eb)" }}>
                    Your
                  </span>
                  <span className="block text-[clamp(3.2rem,10vw,8.8rem)]">Future.</span>
                </h1>
                <div className={cn(
                  "w-20 md:w-28 h-[3px] rounded-full mt-4 md:mt-5",
                  d ? "bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400"
                    : "bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"
                )} />
              </div>

              {/* Tagline */}
              <p className={cn(
                "text-base md:text-lg font-medium max-w-lg leading-relaxed pl-4 md:pl-5 border-l-2",
                d ? "text-slate-400 border-blue-500/60" : "text-slate-500 border-blue-400/70"
              )}>
                ACLC Northbay — under the AMA Education System — delivers world-class,
                technology-driven Senior High education in the heart of Tondo, Manila.
              </p>

              {/* CTA Buttons — min 44px touch targets */}
              <div className="flex flex-wrap gap-3 md:gap-4 pt-1">
                {isPortalActive ? (
                  <Link href="/enroll">
                    <button
                      style={{ touchAction: "manipulation" }}
                      className="group relative h-[52px] md:h-[60px] px-8 md:px-10 rounded-2xl font-black uppercase text-[11px] tracking-[0.25em] text-white overflow-hidden transition-transform duration-300 lg:hover:-translate-y-1.5 active:scale-95">
                      <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 bg-[length:200%_100%] lg:animate-[shimmer_2s_linear_infinite]" />
                      <span className="absolute inset-0 shadow-[0_8px_40px_rgba(99,130,246,0.5)] lg:group-hover:shadow-[0_14px_55px_rgba(99,130,246,0.7)] transition-shadow duration-300 rounded-2xl" />
                      <span className="relative flex items-center gap-3">
                        Begin Enrollment
                        <ArrowRight size={16} className="lg:group-hover:translate-x-1.5 transition-transform" />
                      </span>
                    </button>
                  </Link>
                ) : (
                  <button
                    disabled
                    className={cn(
                      "h-[52px] md:h-[60px] px-8 md:px-10 rounded-2xl font-black uppercase text-[11px] tracking-[0.25em] flex items-center gap-2 cursor-not-allowed border",
                      d ? "bg-slate-900/50 text-slate-600 border-white/5"
                        : "bg-slate-100 text-slate-400 border-slate-200"
                    )}>
                    <Lock size={14} /> {isExpired ? "Portal Expired" : "Access Locked"}
                  </button>
                )}
                <Link href="/status">
                  <button
                    style={{ touchAction: "manipulation" }}
                    className={cn(
                      "h-[52px] md:h-[60px] px-8 md:px-10 rounded-2xl font-black uppercase text-[11px] tracking-[0.25em] border",
                      "transition-[background-color,border-color,transform] duration-300 lg:hover:-translate-y-1.5 active:scale-95",
                      d ? "bg-white/5 border-white/15 text-white lg:hover:bg-white/10 backdrop-blur-xl"
                        : "bg-white border-slate-200 text-slate-700 lg:hover:bg-blue-50 lg:hover:border-blue-300 shadow-sm"
                    )}>
                    Track My Status
                  </button>
                </Link>
              </div>

              {/* Live counter */}
              <div className="flex items-center gap-3 pt-2">
                <div className={cn(
                  "flex items-center gap-3 px-4 md:px-5 py-3 md:py-3.5 rounded-2xl border transition-[background-color,border-color] duration-300",
                  d ? "bg-white/4 border-white/8 backdrop-blur-md" : "bg-white border-slate-200 shadow-sm"
                )}>
                  <div className="relative">
                    <Users2 size={16} className="text-blue-400" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full lg:animate-pulse" />
                  </div>
                  <span className={cn("text-[11px] font-black uppercase tracking-widest", d ? "text-slate-300" : "text-slate-600")}>
                    <span className={cn("text-base font-black", d ? "text-blue-300" : "text-blue-600")}>{stats.totalCount}</span>{" "}Confirmed
                  </span>
                </div>
                <div className={cn(
                  "flex items-center gap-2 px-3 md:px-4 py-3 md:py-3.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest",
                  d ? "bg-white/4 border-white/8 text-slate-400" : "bg-white border-slate-200 text-slate-500 shadow-sm"
                )}>
                  <TrendingUp size={12} className="text-emerald-400" />Live
                </div>
              </div>
            </div>

            {/* ── STATS CARD ────────────────────────────────────────────────── */}
            <StatsCard stats={stats} config={config} isMobile={isMobile} isDark={d} />
          </div>

          {/* ── STRANDS ───────────────────────────────────────────────────── */}
          <div className="mt-24 md:mt-32 lg:mt-44 space-y-8 md:space-y-10">
            <Reveal>
              <div className="flex items-end gap-4 md:gap-6">
                <div>
                  <p className={cn("text-[10px] font-black uppercase tracking-[0.45em] mb-2", d ? "text-indigo-400" : "text-indigo-600")}>Curriculum Paths</p>
                  <h2 className={cn("text-3xl md:text-5xl font-black uppercase tracking-tight leading-none", d ? "text-white" : "text-slate-900")}>Available Strands</h2>
                </div>
                <div className={cn("h-px flex-1 max-w-xs mb-2 md:mb-3", d ? "bg-white/8" : "bg-slate-200")} />
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              {[
                {
                  strand: "ICT", Icon: Cpu, color: "blue",
                  title: ["Information &", "Communication", "Technology"],
                  sub: "Specialized Tech Curriculum",
                  desc: "Master the digital landscape through computer programming, systems analysis, and visual graphics — built for tomorrow's tech leaders.",
                  feats: ["100% Computerized Modules","Industry-aligned Software Training","Career-ready upon Graduation"],
                },
                {
                  strand: "GAS", Icon: BookOpen, color: "indigo",
                  title: ["General", "Academic", "Strand"],
                  sub: "Versatile Collegiate Prep",
                  desc: "A flexible pathway for students exploring business, education, and management — powered by modern digital research tools.",
                  feats: ["Tech-Humanities Integration","Multi-field Career Pathways","DepEd-aligned Curriculum"],
                },
              ].map(({ strand, Icon, color, title, sub, desc, feats }, idx) => (
                <Reveal key={strand} delay={idx * 120}>
                  <div className={cn(
                    "group relative rounded-[32px] md:rounded-[40px] p-7 md:p-10 border overflow-hidden h-full cursor-default",
                    "transition-[background,border-color,box-shadow] duration-500",
                    color === "blue"
                      ? d ? "bg-gradient-to-br from-[#0d1433]/70 to-[#070b1c]/80 border-blue-900/25 lg:hover:border-blue-400/40 lg:hover:shadow-[0_0_70px_rgba(99,130,246,0.15)]"
                            : "bg-white border-slate-200 lg:hover:border-blue-300 lg:hover:shadow-[0_20px_60px_rgba(59,130,246,0.12)] shadow-sm"
                      : d ? "bg-gradient-to-br from-[#100d33]/70 to-[#070b1c]/80 border-indigo-900/25 lg:hover:border-indigo-400/40 lg:hover:shadow-[0_0_70px_rgba(129,140,248,0.15)]"
                            : "bg-white border-slate-200 lg:hover:border-indigo-300 lg:hover:shadow-[0_20px_60px_rgba(99,102,241,0.12)] shadow-sm"
                  )}>
                    <div className="absolute -right-12 -bottom-12 opacity-[0.04] lg:group-hover:opacity-[0.08] transition-opacity duration-500">
                      <Icon size={200} className={color === "blue" ? "text-blue-400" : "text-indigo-400"} />
                    </div>
                    <div className="relative z-10 space-y-5">
                      <div className="flex items-start justify-between">
                        <div className={cn(
                          "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-lg lg:group-hover:scale-110 lg:group-hover:rotate-3 transition-transform duration-300",
                          color === "blue"
                            ? "bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-500/30"
                            : "bg-gradient-to-br from-indigo-500 to-violet-700 shadow-indigo-500/30"
                        )}>
                          <Icon size={24} className="text-white" />
                        </div>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-[0.25em] px-3 py-1.5 rounded-full border",
                          color === "blue"
                            ? d ? "border-blue-500/20 text-blue-400 bg-blue-900/30" : "border-blue-200 text-blue-600 bg-blue-50"
                            : d ? "border-indigo-500/20 text-indigo-400 bg-indigo-900/30" : "border-indigo-200 text-indigo-600 bg-indigo-50"
                        )}>{strand}</span>
                      </div>
                      <div>
                        <h3 className={cn("text-xl md:text-2xl font-black uppercase tracking-tight leading-tight", d ? "text-white" : "text-slate-900")}>
                          {title.map((l, i) => <span key={i} className="block">{l}</span>)}
                        </h3>
                        <p className={cn(
                          "text-[10px] font-black uppercase tracking-[0.25em] mt-2",
                          color === "blue" ? d ? "text-blue-400" : "text-blue-600"
                                          : d ? "text-indigo-400" : "text-indigo-600"
                        )}>{sub}</p>
                      </div>
                      <p className={cn("text-sm leading-relaxed", d ? "text-slate-400" : "text-slate-500")}>{desc}</p>
                      <div className={cn("pt-4 md:pt-5 border-t space-y-2.5", d ? "border-white/5" : "border-slate-100")}>
                        {feats.map((f, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <CheckCircle2 size={13} className={cn("shrink-0", color === "blue" ? "text-blue-400" : "text-indigo-400")} />
                            <span className={cn("text-[11px] font-bold uppercase tracking-wide", d ? "text-slate-300" : "text-slate-600")}>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* ── BENEFITS ────────────────────────────────────────────────────── */}
          <div className="mt-24 md:mt-32 lg:mt-44">
            <Reveal>
              <div className={cn(
                "relative rounded-[40px] md:rounded-[56px] border overflow-hidden",
                "transition-[background,border-color] duration-500",
                d ? "bg-gradient-to-br from-[#0d1433]/60 to-[#0a0d28]/70 border-indigo-900/20"
                  : "bg-gradient-to-br from-blue-50 to-indigo-50/80 border-blue-200/60"
              )}>
                <div className="relative z-10 p-8 md:p-14 space-y-10 md:space-y-14">
                  {/* Section heading */}
                  <div className="text-center space-y-4">
                    <div
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-[10px] font-black uppercase tracking-[0.3em]"
                      style={{ background: "linear-gradient(90deg,#3b82f6,#6366f1,#8b5cf6)" }}>
                      <Sparkles size={11} />Welcome New Enrollees
                    </div>
                    <h2 className={cn("text-4xl md:text-5xl lg:text-[5.5rem] font-black uppercase tracking-tight leading-none", d ? "text-white" : "text-slate-900")}>
                      Why Choose<br />ACLC?
                    </h2>
                    <p className={cn("text-sm font-medium max-w-md mx-auto", d ? "text-slate-400" : "text-slate-500")}>
                      Open to all Grade 10 Completers and ALS Graduates — no barriers, just opportunity.
                    </p>
                  </div>

                  {/* Benefits grid — 2 cols on mobile, 4 on desktop */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {[
                      "No Top-Up","No Hidden Fees","No Entrance Exam","No Grade Requirements",
                      "No Books to Purchase","Airconditioned Classrooms","Flexible Learning Schedule","DepEd Voucher Accepted",
                    ].map((b, i) => (
                      <div
                        key={i}
                        className={cn(
                          "group flex items-center gap-3 md:gap-4 p-4 md:p-5 rounded-2xl md:rounded-3xl border cursor-default",
                          "transition-[background,border-color,box-shadow,transform] duration-300 lg:hover:-translate-y-1.5",
                          d
                            ? "bg-white/3 border-white/6 lg:hover:bg-gradient-to-br lg:hover:from-blue-600/80 lg:hover:to-indigo-700/80 lg:hover:border-indigo-400/30 lg:hover:shadow-[0_10px_40px_rgba(99,130,246,0.25)]"
                            : "bg-white border-slate-200 lg:hover:bg-gradient-to-br lg:hover:from-blue-600 lg:hover:to-indigo-600 lg:hover:border-blue-500 lg:hover:shadow-[0_10px_40px_rgba(59,130,246,0.2)] shadow-sm"
                        )}>
                        <CheckCircle2 size={16} className={cn("shrink-0 transition-colors duration-300 lg:group-hover:text-white", d ? "text-indigo-400" : "text-blue-500")} />
                        <span className={cn("text-[10px] md:text-[11px] font-black uppercase tracking-wide leading-tight transition-colors duration-300 lg:group-hover:text-white", d ? "text-slate-300" : "text-slate-700")}>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      {/* safe-bottom pads for home-indicator bar on iOS / Meta Messenger */}
      <footer className={cn(
        "mt-24 md:mt-32 lg:mt-44 border-t backdrop-blur-3xl py-12 md:py-20 px-4 md:px-6 safe-bottom",
        "transition-[background-color,border-color] duration-500",
        d ? "bg-[#020510]/90 border-white/5" : "bg-white/80 border-slate-200"
      )}>
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
              {/* Brand */}
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className={cn("absolute inset-0 rounded-full blur-xl", d ? "bg-blue-500/30" : "bg-blue-400/30")} />
                    <img src="/logo-aclc.png" alt="ACLC" loading="lazy" className="relative w-12 h-12 object-contain" />
                  </div>
                  <div>
                    <p className={cn("font-black text-lg uppercase italic tracking-tight", d ? "text-white" : "text-slate-900")}>ACLC Northbay</p>
                    <p className={cn("text-[8px] font-bold uppercase tracking-[0.35em]", d ? "text-slate-500" : "text-slate-400")}>AMA Computer Learning Center</p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-slate-500">Delivering quality, technology-driven Senior High education under the AMA Education System in the heart of Tondo, Manila.</p>
              </div>

              {/* Contact */}
              <div className="space-y-5">
                <p className={cn("text-[10px] font-black uppercase tracking-[0.4em]", d ? "text-indigo-400" : "text-blue-600")}>Contact</p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin size={15} className={cn("shrink-0 mt-0.5", d ? "text-slate-500" : "text-slate-400")} />
                    <p className={cn("text-[11px] font-semibold leading-relaxed", d ? "text-slate-400" : "text-slate-600")}>
                      2nd/3rd Floor MTSC Bldg, Juan Luna cor. Capulong St., Tondo, Manila
                    </p>
                  </div>
                  <a
                    href="https://www.facebook.com/Northbaycampus"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 group"
                    style={{ touchAction: "manipulation" }}>
                    <Facebook size={15} className={cn("transition-colors", d ? "text-slate-500 lg:group-hover:text-blue-400" : "text-slate-400 lg:group-hover:text-blue-600")} />
                    <span className={cn("text-[11px] font-semibold transition-colors", d ? "text-slate-400 lg:group-hover:text-white" : "text-slate-600 lg:group-hover:text-slate-900")}>/Northbaycampus</span>
                  </a>
                </div>
              </div>

              {/* System */}
              <div className="space-y-5">
                <p className={cn("text-[10px] font-black uppercase tracking-[0.4em]", d ? "text-indigo-400" : "text-blue-600")}>System</p>
                <div className={cn(
                  "p-5 rounded-3xl border flex items-center gap-4",
                  "transition-[background-color,border-color] duration-300",
                  d ? "bg-white/3 border-white/6" : "bg-blue-50 border-blue-100"
                )}>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                    <ShieldCheck size={18} className="text-white" />
                  </div>
                  <div>
                    <p className={cn("text-[10px] font-black uppercase tracking-widest", d ? "text-white" : "text-slate-800")}>Secure Registry</p>
                    <p className={cn("text-[9px] font-bold uppercase tracking-wider mt-0.5 italic", d ? "text-slate-500" : "text-slate-400")}>AES-256 Encrypted</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <div className={cn(
            "mt-12 md:mt-16 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4",
            d ? "border-white/5" : "border-slate-200"
          )}>
            <p className={cn("text-[10px] font-bold uppercase tracking-[0.3em]", d ? "text-slate-600" : "text-slate-400")}>
              © 2025 AMA Education System — All rights reserved
            </p>
            <div className={cn("flex items-center gap-3 transition-opacity duration-300", d ? "opacity-25 lg:hover:opacity-60" : "opacity-35 lg:hover:opacity-70")}>
              <GraduationCap size={14} className={d ? "text-white" : "text-slate-500"} />
              <Globe        size={14} className={d ? "text-white" : "text-slate-500"} />
              <Activity     size={14} className={d ? "text-white" : "text-slate-500"} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── CAPACITY BAR ──────────────────────────────────────────────────────────────
function PrettyBar({ label, icon, current, max, color, isDark }: {
  label: string; icon: React.ReactNode; current: number; max: number; color: string; isDark: boolean
}) {
  const pct    = max > 0 ? Math.min((current / max) * 100, 100) : 0
  const isBlue = color === "blue"
  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className={cn("p-1 rounded-md",
            isDark
              ? isBlue ? "bg-blue-900/40 text-blue-400" : "bg-indigo-900/40 text-indigo-400"
              : isBlue ? "bg-blue-50 text-blue-600"      : "bg-indigo-50 text-indigo-600"
          )}>{icon}</span>
          <p className={cn("text-[10px] font-black uppercase tracking-[0.2em]", isDark ? "text-slate-300" : "text-slate-700")}>{label}</p>
        </div>
        <p className={cn("text-[11px] font-black tabular-nums", isDark ? "text-white" : "text-slate-800")}>
          {current} <span className={cn("font-bold", isDark ? "text-slate-500" : "text-slate-400")}>/ {max}</span>
        </p>
      </div>
      <div className={cn("relative h-2 w-full rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-slate-100")}>
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-[2000ms] ease-out",
            isBlue
              ? "bg-gradient-to-r from-blue-700 via-blue-400 to-cyan-300 lg:shadow-[0_0_14px_rgba(59,130,246,0.7)]"
              : "bg-gradient-to-r from-indigo-700 via-violet-400 to-purple-300 lg:shadow-[0_0_14px_rgba(139,92,246,0.7)]"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={cn("text-[10px] font-bold uppercase tracking-widest text-right tabular-nums", isDark ? "text-slate-600" : "text-slate-400")}>
        {Math.round(pct)}% filled
      </p>
    </div>
  )
}
