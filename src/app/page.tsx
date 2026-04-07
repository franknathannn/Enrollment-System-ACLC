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
import { ProcessSection } from "@/components/landing/ProcessSection"

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

// ── ANIMATED COUNTER — Optimized with RAF ────────────────────────────────────
function useCountUp(target: number, duration = 1200, trigger = true) {
  const [val, setVal] = useState(0)
  const startTime = useRef<number | null>(null)

  useEffect(() => {
    if (!trigger || target === 0) return

    let rafId: number
    const step = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)
      setVal(Math.floor(progress * target))
      if (progress < 1) { rafId = requestAnimationFrame(step) }
    }
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
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

  const animIct = useCountUp(stats.ictCount, 1200, statsVisible)
  const animGas = useCountUp(stats.gasCount, 1200, statsVisible)
  const animVacancy = useCountUp(stats.totalMax - stats.totalCount, 1400, statsVisible)

  const displayIct = isMobile ? stats.ictCount : animIct
  const displayGas = isMobile ? stats.gasCount : animGas
  const displayVacancy = isMobile ? (stats.totalMax - stats.totalCount) : animVacancy

  useEffect(() => {
    const el = statsRef.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsVisible(true); obs.disconnect() } }, { threshold: 0.15 })
    obs.observe(el); return () => obs.disconnect()
  }, [])

  const d = isDark
  const isManual = config?.control_mode === 'manual'
  const now = new Date()
  const start = config?.enrollment_start ? new Date(config.enrollment_start) : null
  const end = config?.enrollment_end ? new Date(config.enrollment_end) : null
  const isExpired = !isManual && end && now > end
  const isPortalActive = isManual
    ? config?.is_portal_active
    : (start && end && now >= start && now <= end)

  const getStatusText = () => {
    if (isManual) return isPortalActive ? "Enrollment Form Open" : "System Lockdown"
    if (isExpired) return "Portal Expired"
    if (isPortalActive && config?.enrollment_start && config?.enrollment_end) {
      const startFmt = new Date(config.enrollment_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      const endFmt = new Date(config.enrollment_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      return `OPEN FROM ${startFmt.toUpperCase()} UNTIL ${endFmt.toUpperCase()}`
    }
    return "Admissions Offline"
  }

  return (
    <div className={cn("lg:col-span-5 relative stats-group", !isMobile && "float")} ref={statsRef} style={{ translate: "0 0", willChange: "transform" }}>
      {/* Decorative Glows */}
      <div className={cn("absolute -inset-10 rounded-[80px] blur-[100px] transition-opacity duration-1000 pointer-events-none", d ? "bg-blue-600/10 opacity-60" : "bg-blue-600/5 opacity-40")} />

      <TiltCard className={cn(
        "relative rounded-[40px] md:rounded-[56px] border overflow-hidden backdrop-blur-3xl cursor-default stats-card",
        statsVisible ? "opacity-100" : "opacity-0",
        d ? "bg-[#030712]/85 border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
          : "bg-white/90 border-slate-200 shadow-[0_30px_80px_rgba(0,0,0,0.06)]",
      )}>
        {/* Top Accent Bar — Solid ACLC Blue */}
        <div className="h-1.5 w-full bg-blue-600" />

        {/* Centered Logo Background — Full Color */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
          <img
            src="/logo-aclc.png"
            alt="Logo Background"
            className={cn(
              "w-[300px] md:w-[450px] h-auto object-contain transition-all duration-1000",
              "opacity-[0.15] lg:group-hover/stats:scale-110 lg:group-hover/stats:opacity-[0.18]",
              d && "brightness-125"
            )}
          />
        </div>

        <div className="relative z-10 p-7 md:p-10 space-y-8 md:space-y-10 group tech-reticle">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className={cn("text-xs font-black uppercase tracking-[0.3em]", d ? "text-white/40" : "text-slate-400")}>Live Spot</h3>
              <p className={cn("text-lg font-black uppercase tracking-tight", d ? "text-white" : "text-slate-900")}>Strand Distribution</p>
            </div>
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
              d ? "bg-white/5 border border-white/10 group-hover:border-blue-500/50" : "bg-slate-50 border border-slate-200 shadow-sm"
            )}>
              <Activity size={20} className={cn(isPortalActive ? "text-blue-500 lg:animate-pulse" : d ? "text-slate-600" : "text-slate-300")} />
            </div>
          </div>

          {/* Visualization Grid */}
          <div className="grid grid-cols-2 gap-4">
            <VisualMetric label="ICT" current={displayIct} max={stats.ictMax} color="blue" isDark={d} />
            <VisualMetric label="GAS" current={displayGas} max={stats.gasMax} color="red" isDark={d} />
          </div>

          {/* Centerpiece Counter */}
          <div className="relative">
            <div className={cn(
              "relative rounded-[32px] p-8 md:p-10 overflow-hidden border spring-hover-blue",
              d ? "bg-[#020617]/50 border-white/5" : "bg-white/50 border-slate-100"
            )}>
              <div className="absolute top-0 right-0 p-6 pointer-events-none">
                <Orbit size={48} className={cn("opacity-10 lg:animate-spin", d ? "text-white" : "text-blue-600")} style={{ animationDuration: '15s' }} />
              </div>

              <p className={cn("text-[10px] font-black uppercase tracking-[0.5em] mb-2", d ? "text-blue-400" : "text-blue-600")}>Remaining Slots</p>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-5xl md:text-7xl font-black tracking-tighter tabular-nums", d ? "text-white" : "text-slate-900")}>
                  {displayVacancy}
                </span>
                <span className={cn("text-sm font-bold uppercase tracking-widest mb-2", d ? "text-slate-500" : "text-slate-400")}>
                  / {stats.totalMax}
                </span>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <div className={cn("h-1 flex-1 rounded-full", d ? "bg-white/5" : "bg-slate-100 overflow-hidden shadow-inner")}>
                  <div
                    className="h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                    style={{ width: `${(stats.totalCount / stats.totalMax) * 100}%` }}
                  />
                </div>
                <span className={cn("text-[9px] font-black uppercase tracking-widest", d ? "text-slate-500" : "text-slate-400")}>
                  {Math.round((stats.totalCount / stats.totalMax) * 100)}% Full
                </span>
              </div>
            </div>
          </div>

          {/* Footer Status */}
          <div className={cn("flex items-center gap-4 pt-4 border-t", d ? "border-white/5" : "border-slate-100")}>
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
              isPortalActive ? "bg-blue-600/10 text-blue-500 shadow-blue-500/10" : "bg-slate-500/10 text-slate-500"
            )}>
              {isPortalActive ? <CheckCircle2 size={20} className="lg:animate-bounce" /> : <Lock size={20} />}
            </div>
            <div>
              <p className={cn("text-[10px] font-black uppercase tracking-[0.2em]", d ? "text-slate-500" : "text-slate-400")}>Portal Access</p>
              <p className={cn("text-sm font-black uppercase tracking-tight transition-colors duration-300", isPortalActive ? (d ? "text-blue-400" : "text-blue-700") : "text-red-500")}>
                {getStatusText()}
              </p>
            </div>
          </div>
        </div>
      </TiltCard>
    </div>
  )
}


function VisualMetric({ label, current, max, color, isDark }: { label: string, current: number, max: number, color: 'blue' | 'red', isDark: boolean }) {
  const pct = Math.min((current / max) * 100, 100) || 0
  const isRed = color === 'red'
  return (
    <div
      className={cn(
        "p-5 rounded-3xl border",
        color === 'red' ? 'spring-hover-red' : 'spring-hover-blue',
        isDark ? "bg-white/[0.03] border-white/5" : "bg-slate-50 border-slate-200"
      )}
      style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
    >
      <div className="flex justify-between items-end mb-3">
        <span className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-white/40" : "text-slate-500")}>{label}</span>
        <span className={cn("text-lg font-black leading-none", isDark ? "text-white" : "text-slate-900")}>{current}</span>
      </div>
      <div className={cn("h-1.5 w-full rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-slate-200")}>
        <div
          className={cn("h-full transition-all duration-1000 ease-out", isRed ? "bg-red-600" : "bg-blue-600")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={cn("text-[8px] font-bold uppercase tracking-widest mt-2", isDark ? "text-white/20" : "text-slate-400")}>Limit: {max}</p>
    </div>
  )
}


// ── INTERACTIVE LAG-FREE WRAPPERS ───────────────────────────────────────────
function MagneticButton({ children, className, disabled }: any) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouse = (e: React.MouseEvent) => {
    if (disabled || !ref.current) return
    const { clientX, clientY } = e
    const { height, width, left, top } = ref.current.getBoundingClientRect()
    const middleX = clientX - (left + width / 2)
    const middleY = clientY - (top + height / 2)
    setPosition({ x: middleX * 0.12, y: middleY * 0.12 })
  }

  const reset = () => setPosition({ x: 0, y: 0 })

  return (
    <div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      className={className}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: position.x === 0 ? "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)" : "none"
      }}>
      {children}
    </div>
  )
}

function TiltCard({ children, className, disabled }: any) {
  const ref = useRef<HTMLDivElement>(null)
  const [rotation, setRotation] = useState({ x: 0, y: 0 })

  const handleMouse = (e: React.MouseEvent) => {
    if (disabled || !ref.current) return
    const { clientX, clientY } = e
    const { height, width, left, top } = ref.current.getBoundingClientRect()
    const x = (clientX - left) / width - 0.5
    const y = (clientY - top) / height - 0.5
    setRotation({ x: -y * 8, y: x * 8 }) // max 8 degrees tilt
  }

  const reset = () => setRotation({ x: 0, y: 0 })

  return (
    <div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      className={className}
      style={{
        transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
        transition: rotation.x === 0 ? "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)" : "none",
        transformStyle: "preserve-3d"
      }}>
      {children}
    </div>
  )
}

function DecryptText({ text, disabled }: { text: string, disabled?: boolean }) {
  const [display, setDisplay] = useState(text)
  const intervalRef = useRef<any>(null)

  // Need to extract the original string if text changes
  useEffect(() => { setDisplay(text) }, [text])

  const startDecrypt = () => {
    if (disabled) return
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+"
    let iter = 0
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setDisplay(text.split("").map((l, i) => {
        if (i < iter || l === " ") return l
        return chars[Math.floor(Math.random() * chars.length)]
      }).join(""))
      if (iter >= text.length) clearInterval(intervalRef.current)
      iter += 1 / 2
    }, 20)
  }

  const reset = () => {
    clearInterval(intervalRef.current)
    setDisplay(text)
  }

  return (
    <span className="inline-block cursor-default" onMouseEnter={startDecrypt} onMouseLeave={reset}>
      {display}
    </span>
  )
}

// ── TERMINAL TYPING WIDGET ─────────────────────────────────────────────────────
function TerminalWidget({ isDark }: { isDark: boolean }) {
  const [text, setText] = useState("")
  const [phase, setPhase] = useState(0)
  const fullText = "Enrollment System For "
  const fullText2 = "AMA ACLC NORTHBAY."

  useEffect(() => {
    let index = 0;
    const typeInterval = setInterval(() => {
      setText(fullText.slice(0, index))
      index++
      if (index > fullText.length) {
        clearInterval(typeInterval)
        setTimeout(() => setPhase(1), 500)
      }
    }, 40)
    return () => clearInterval(typeInterval)
  }, [])

  useEffect(() => {
    if (phase !== 1) return;
    let index = 0;
    const typeInterval = setInterval(() => {
      setText(fullText + " " + fullText2.slice(0, index))
      index++
      if (index > fullText2.length) clearInterval(typeInterval)
    }, 30)
    return () => clearInterval(typeInterval)
  }, [phase])

  return (
    <div className={cn(
      "hidden xl:flex absolute top-6 left-1/2 -translate-x-1/2 items-center gap-3 px-4 py-2 rounded-xl backdrop-blur-md border",
      isDark ? "bg-black/40 border-white/10" : "bg-white/40 border-slate-200"
    )}>
      <div className="flex gap-1.5 opacity-50">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <div className="w-2 h-2 rounded-full bg-amber-500" />
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      </div>
      <span className={cn("font-mono text-[9px] whitespace-pre uppercase tracking-widest", isDark ? "text-blue-400" : "text-blue-700")}>
        <span className="opacity-50 mr-2">&gt;</span>
        {text}
        <span className="animate-pulse inline-block w-1.5 h-3 ml-1 bg-current align-middle" />
      </span>
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
      const sections = sectionsRes.data || []
      const students = studentsRes.data || []
      const active = students.filter(s => s.status === 'Accepted' || s.status === 'Approved')
      const ictMax = sections.filter(s => s.strand === 'ICT').reduce((sum, s) => sum + (s.capacity || 40), 0)
      const ictCount = active.filter(s => s.strand === 'ICT').length
      const gasMax = sections.filter(s => s.strand === 'GAS').reduce((sum, s) => sum + (s.capacity || 40), 0)
      const gasCount = active.filter(s => s.strand === 'GAS').length
      setStats({ totalCount: ictCount + gasCount, totalMax: ictMax + gasMax, ictCount, ictMax, gasCount, gasMax })
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => {
    fetchDatabaseStats()
    const channel = supabase.channel('matrix-live-home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, fetchDatabaseStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sections' }, fetchDatabaseStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, fetchDatabaseStats)
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
      canvas.width = window.innerWidth
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
      const colorsDark = [[220, 38, 38], [59, 130, 246], [200, 200, 200]]
      const colorsLight = [[220, 38, 38], [37, 99, 235], [50, 50, 50]]
      const colors = dark ? colorsDark : colorsLight
      const n = particles.length

      // --- SaaS Mouse Grid Spotlight ---
      const gridSpacing = 40;
      ctx.beginPath();
      ctx.lineWidth = 1;
      const gridR = dark ? 255 : 0;

      const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 450);
      grad.addColorStop(0, `rgba(${gridR},${gridR},${gridR},0.08)`);
      grad.addColorStop(1, `rgba(${gridR},${gridR},${gridR},0)`);
      ctx.strokeStyle = grad;

      const offsetX = (frameCount * 0.2) % gridSpacing;
      const offsetY = (frameCount * 0.2) % gridSpacing;
      for (let x = offsetX; x < canvas.width; x += gridSpacing) {
        ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
      }
      for (let y = offsetY; y < canvas.height; y += gridSpacing) {
        ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();

      // --- Particles Physics ---
      particles.forEach((p: Particle, i: number) => {
        const pCol = colors[i % 3]

        p.x += p.vx; p.y += p.vy; p.pulse += p.twinkle;

        const dx = mouse.x - p.x; const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          const force = (180 - dist) / 180;
          p.x -= (dx / dist) * force * 1.5;
          p.y -= (dy / dist) * force * 1.5;
        }

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        const mouseGlow = dist < 250 ? (1 - dist / 250) * 0.8 : 0;
        const baseAlpha = dark ? 0.2 : 0.4;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + mouseGlow), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${pCol.join(',')},${baseAlpha + mouseGlow})`; ctx.fill()
      })

      // Network Lines (connect if close to mouse)
      for (let a = 0; a < n - 1; a++) {
        for (let b = a + 1; b < n; b++) {
          const dx = particles[a].x - particles[b].x; const dy = particles[a].y - particles[b].y
          const d2 = dx * dx + dy * dy
          if (d2 < 12000) {
            const mx = mouse.x - particles[a].x; const my = mouse.y - particles[a].y;
            const distToMouse = Math.sqrt(mx * mx + my * my);
            if (distToMouse < 380) {
              const lCol = colors[(a + b) % 3]
              ctx.beginPath(); ctx.lineWidth = dark ? 0.6 : 1.0;
              ctx.strokeStyle = `rgba(${lCol.join(',')},${(1 - Math.sqrt(d2) / 110) * (1 - distToMouse / 380) * 0.85})`
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
          const r = dark ? [255, 255, 255] : [220, 38, 38]
          ctx.beginPath(); ctx.arc(pt.x, pt.y, s.width * ratio * 1.4, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r.join(',')},${ratio * s.opacity * (dark ? 0.85 : 0.65)})`; ctx.fill()
        })
        const headR = dark ? [220, 38, 38] : [37, 99, 235]
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.width * 5)
        grad.addColorStop(0, `rgba(${headR.join(',')},${s.opacity})`); grad.addColorStop(1, `rgba(${headR.join(',')},0)`)
        ctx.beginPath(); ctx.arc(s.x, s.y, s.width * 5, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill()
      })

      raf = requestAnimationFrame(animate)
    }

    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY }
    const onClick = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      particles.forEach(p => {
        const dx = clientX - p.x; const dy = clientY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 400) {
          const force = (400 - dist) / 30; // Powerful burst
          p.vx -= (dx / dist) * force;
          p.vy -= (dy / dist) * force;
        }
      });
    }

    window.addEventListener("mousemove", onMove, { passive: true })
    window.addEventListener("click", onClick, { passive: true })
    window.addEventListener("resize", init, { passive: true })
    init(); animate()
    return () => { cancelAnimationFrame(raf); clearInterval(starSpawner); window.removeEventListener("mousemove", onMove); window.removeEventListener("click", onClick); window.removeEventListener("resize", init) }
  }, [isMobile])

  const isManual = config?.control_mode === 'manual'
  const now = new Date()
  const start = config?.enrollment_start ? new Date(config.enrollment_start) : null
  const end = config?.enrollment_end ? new Date(config.enrollment_end) : null
  const isExpired = !isManual && end && now > end
  const isPortalActive = isManual ? config?.is_portal_active : (start && end && now >= start && now <= end)
  const heroBadge = config?.is_pre_enrollment ? "Pre-Enrollment" : isPortalActive ? "Enrollment Open" : "Enrollment Closed"
  const d = isDark

  return (
    <div className={cn(
      // min-h-[100dvh] = dynamic viewport height → works in Meta Messenger, Safari, etc.
      "min-h-[100dvh] font-sans overflow-x-hidden relative",
      "transition-[background-color] duration-500 ease-in-out",
      d ? "bg-[#030712] text-white" : "bg-[#eef2ff] text-slate-900"
    )}>

      {/* Binary stream effect */}
      <div className={cn("fixed inset-0 pointer-events-none z-0 binary-stream delay-1000", d ? "opacity-20" : "opacity-10")} aria-hidden="true" />

      {/* Spring hover — all transforms + glows live here so there's no conflict with Tailwind v4's individual transform properties */}
      <style>{`
        .spring-hover-blue,
        .spring-hover-red,
        .spring-btn-blue,
        .spring-btn-red {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                      border-color 0.35s ease !important;
        }
        @media (min-width: 1024px) {
          .spring-hover-blue:hover {
            transform: translateY(-8px) scale(1.03) !important;
            box-shadow: 0 12px 30px rgba(59, 130, 246, 0.3) !important;
            border-color: rgba(59, 130, 246, 0.5) !important;
          }
          .spring-hover-red:hover {
            transform: translateY(-8px) scale(1.03) !important;
            box-shadow: 0 12px 30px rgba(220, 38, 38, 0.3) !important;
            border-color: rgba(220, 38, 38, 0.5) !important;
          }
          .spring-btn-blue:hover {
            transform: translateY(-3px) scale(1.04) !important;
            box-shadow: 0 8px 25px rgba(59, 130, 246, 0.35) !important;
            border-color: rgba(59, 130, 246, 0.5) !important;
          }
          .spring-btn-red:hover {
            transform: translateY(-3px) scale(1.04) !important;
            box-shadow: 0 10px 30px rgba(220, 38, 38, 0.4) !important;
          }
          .stats-group:hover .stats-card {
            transform: translateY(-8px) scale(1.01) !important;
            box-shadow: 0 12px 30px rgba(59, 130, 246, 0.2) !important;
            border-color: rgba(59, 130, 246, 0.4) !important;
          }
        }
        .tech-reticle { position: relative; }
        .tech-reticle::before, .tech-reticle::after {
          content: ''; position: absolute; width: 14px; height: 14px; pointer-events: none; opacity: 0.6; z-index: 20; transition: all 0.3s ease;
        }
        .tech-reticle::before {
          top: -1px; left: -1px; border-top: 2px solid rgba(59,130,246,0.8); border-left: 2px solid rgba(59,130,246,0.8); border-top-left-radius: 6px;
        }
        .tech-reticle::after {
          bottom: -1px; right: -1px; border-bottom: 2px solid rgba(59,130,246,0.8); border-right: 2px solid rgba(59,130,246,0.8); border-bottom-right-radius: 6px;
        }
        .stats-group:hover .tech-reticle::before { top: 4px; left: 4px; opacity: 1; }
        .stats-group:hover .tech-reticle::after { bottom: 4px; right: 4px; opacity: 1; }
        
        .binary-stream {
          background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(59, 130, 246, 0.03) 2px, rgba(59, 130, 246, 0.03) 4px);
          background-size: 100% 4px;
        }
        @keyframes cyber-glitch {
          0% { clip-path: inset(10% 0 80% 0); transform: translate(2px, 2px); }
          20% { clip-path: inset(80% 0 0% 0); transform: translate(-2px, -2px); }
          40% { clip-path: inset(40% 0 40% 0); transform: translate(1px, -1px); }
          60% { clip-path: inset(0% 0 100% 0); transform: translate(-1px, 2px); }
          80% { clip-path: inset(50% 0 20% 0); transform: translate(2px, -2px); }
          100% { clip-path: inset(20% 0 60% 0); transform: translate(0); }
        }
        .text-glitch:hover {
          position: relative;
        }
        .text-glitch:hover::before {
          content: attr(data-text); position: absolute; left: -2px; text-shadow: 2px 0 blue; top: 0; 
          animation: cyber-glitch 0.5s calc(var(--i, 0) * 0.2s) infinite alternate-reverse;
          background: inherit; background-clip: text; -webkit-background-clip: text;
        }
      `}</style>

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
        <TerminalWidget isDark={d} />
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-[86px] flex items-center justify-between">
          {/* Logo + Brand */}
          <div className="flex items-center gap-3 md:gap-5 group cursor-pointer" style={{ transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <div className="relative flex items-center justify-center">
              {/* Ambient glow — expands on hover */}
              <div className={cn("absolute inset-0 rounded-full blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-100",
                d ? "bg-blue-500/25 opacity-70" : "bg-blue-400/30 opacity-60")} />
              {/* Spinning ring — appears on hover */}
              <div className={cn(
                "absolute inset-[-6px] rounded-full border-2 border-dashed opacity-0 group-hover:opacity-60 transition-all duration-500 group-hover:rotate-[30deg]",
                d ? "border-blue-400/60" : "border-blue-500/50"
              )} style={{ transition: 'opacity 0.4s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
              <img src="/logo-aclc.png" alt="ACLC" loading="eager"
                className="relative w-11 h-11 md:w-14 md:h-14 object-contain drop-shadow-[0_0_22px_rgba(99,160,255,0.95)] group-hover:scale-[1.15] group-hover:-rotate-6 transition-all duration-500"
                style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className={cn("font-black text-[18px] md:text-[22px] tracking-[-0.04em] uppercase italic transition-colors duration-300",
                  d ? "text-white group-hover:text-blue-300" : "text-slate-900 group-hover:text-blue-700")}>ACLC</span>
                <span className={cn("text-[9px] md:text-[10px] font-black tracking-[0.2em] md:tracking-[0.25em] uppercase transition-colors duration-300",
                  d ? "text-blue-400 group-hover:text-blue-300" : "text-blue-600 group-hover:text-blue-500")}>Northbay</span>
              </div>
              <p className={cn("text-[7px] md:text-[7.5px] font-bold tracking-[0.35em] md:tracking-[0.45em] uppercase mt-0.5 transition-colors duration-300",
                d ? "text-slate-500 group-hover:text-slate-300" : "text-slate-400 group-hover:text-slate-600")}>AMA Education System</p>
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
                  <DecryptText text={config?.school_year || "2025–2026"} />
                </span>
              </div>

              {/* Headline */}
              <div className="space-y-1 group cursor-default">
                <h1
                  className={cn("font-black leading-[0.85] tracking-[-0.045em] uppercase transition-transform duration-500 lg:group-hover:scale-[1.02] origin-left", d ? "text-white" : "text-slate-900")}
                  style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                >
                  <span data-text="Shape" className={cn(
                    "block text-[clamp(3.2rem,10vw,8.8rem)] transition-all duration-300 lg:group-hover:-translate-y-1 text-glitch",
                    d ? "lg:group-hover:text-blue-300" : "lg:group-hover:text-blue-600"
                  )} style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}>Shape</span>
                  <span data-text="Your"
                    className="block text-[clamp(3.2rem,10vw,8.8rem)] text-transparent bg-clip-text shimmer-text text-glitch"
                    style={{
                      backgroundImage: d
                        ? "linear-gradient(90deg,#ffffff,#c2d7fb,#ffffff,#c2d7fb,#ffffff)"
                        : "linear-gradient(90deg,#0a0f1d,#1e3a8a,#0a0f1d,#1e3a8a,#0a0f1d)",
                      "--i": "1"
                    } as any}>
                    Your
                  </span>
                  <span data-text="Future." className={cn(
                    "block text-[clamp(3.2rem,10vw,8.8rem)] transition-all duration-300 lg:group-hover:translate-y-1 text-glitch",
                    d ? "lg:group-hover:text-red-400" : "lg:group-hover:text-red-600"
                  )} style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)', "--i": "2" } as any}>Future.</span>
                </h1>
                <div className={cn(
                  "h-[3px] rounded-full mt-4 md:mt-5 transition-all duration-500 w-20 md:w-28 lg:group-hover:w-48",
                  d ? "bg-gradient-to-r from-red-400 via-blue-400 to-white/80"
                    : "bg-gradient-to-r from-red-600 via-blue-600 to-white"
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
              <div className="flex flex-wrap gap-4 md:gap-6 pt-2">
                {isPortalActive ? (
                  <Link href="/enroll" className="relative group/cta">
                    <MagneticButton>
                      <button
                        style={{ touchAction: "manipulation", transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                        className={cn(
                          "relative h-[60px] md:h-[72px] px-10 md:px-14 rounded-[28px] font-black uppercase text-[11px] tracking-[0.3em] text-white overflow-hidden active:scale-95 shadow-2xl shadow-red-600/20 spring-btn-red",
                          ""
                        )}>
                        <span className="absolute inset-0 bg-red-600 transition-colors duration-300 group-hover/cta:bg-red-700" />
                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/cta:animate-[shimmer_2s_infinite] pointer-events-none" style={{ backgroundSize: '200% 100%' }} />
                        <span className="relative flex items-center gap-4">
                          Begin Enrollment
                          <ArrowRight size={18} className="group-hover/cta:translate-x-2 transition-transform duration-300" />
                        </span>
                      </button>
                    </MagneticButton>
                  </Link>
                ) : (
                  <button
                    disabled
                    className={cn(
                      "h-[60px] md:h-[72px] px-10 md:px-14 rounded-[28px] font-black uppercase text-[11px] tracking-[0.3em] flex items-center gap-3 cursor-not-allowed border",
                      d ? "bg-slate-900/50 text-slate-600 border-white/5"
                        : "bg-slate-100 text-slate-400 border-slate-200"
                    )}>
                    <Lock size={16} /> Portal Locked
                  </button>
                )}
                <Link href="/status" className="group/status">
                  <MagneticButton>
                    <button
                      style={{ touchAction: "manipulation", transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                      className={cn(
                        "h-[60px] md:h-[72px] px-10 md:px-14 rounded-[28px] font-black uppercase text-[11px] tracking-[0.3em] border spring-btn-blue",
                        "active:scale-95",
                        d ? "bg-white/5 border-white/10 text-white lg:hover:bg-white/10 backdrop-blur-3xl"
                          : "bg-white border-slate-200 text-slate-800 lg:hover:bg-slate-50 lg:hover:shadow-2xl shadow-sm"
                      )}>
                      Track My Status
                    </button>
                  </MagneticButton>
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
          <div className="mt-24 md:mt-32 lg:mt-48 space-y-12 md:space-y-16">
            <Reveal>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 group cursor-default">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-500 text-[10px] font-black uppercase tracking-[0.3em]">
                    <Zap size={10} className="group-hover:animate-pulse" /> Specialized Training
                  </div>
                  <h2 className={cn(
                    "text-4xl md:text-6xl font-black uppercase tracking-tighter leading-[0.9] transition-colors duration-300",
                    d ? "text-white group-hover:text-blue-400" : "text-slate-900 group-hover:text-blue-600"
                  )}>
                    Available <br /> <span className="text-blue-600">Strands</span>
                  </h2>
                </div>
                <p className={cn("max-w-xs text-sm font-medium leading-relaxed transition-opacity duration-300", d ? "text-slate-500 group-hover:text-slate-300" : "text-slate-400 group-hover:text-slate-600")}>
                  Industry-mapped curriculum designed to accelerate your career transition from day one.
                </p>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {[
                {
                  strand: "ICT", Icon: Cpu, color: "blue",
                  title: ["Information &", "Communication", "Technology"],
                  sub: "The Digital Vanguard",
                  desc: "Master coding, systems design, and multimedia arts with ACLC's signature computer-integrated methodology.",
                  feats: ["Full Computer Laboratory Access", "Expert IT Industry Faculty", "Digital Certification Paths"],
                  gradient: "from-blue-600 to-blue-900",
                  shadow: "shadow-blue-500/20"
                },
                {
                  strand: "GAS", Icon: BookOpen, color: "red",
                  title: ["General", "Academic", "Strand"],
                  sub: "Strategic Foundations",
                  desc: "A multidisciplinary approach to higher education, empowering students with versatile leadership and research skills.",
                  feats: ["Holistic Academic Training", "College-ready Readiness", "Professional Skills Track"],
                  gradient: "from-red-600 to-red-900",
                  shadow: "shadow-red-600/20"
                },
              ].map(({ strand, Icon, color, title, sub, desc, feats, gradient, shadow }, idx) => (
                <Reveal key={strand} delay={idx * 150}>
                  <TiltCard className={cn(
                    "group tech-reticle relative rounded-[40px] md:rounded-[56px] p-8 md:p-12 border overflow-hidden h-full transition-all duration-500",
                    color === 'red' ? 'spring-hover-red' : 'spring-hover-blue',
                    d ? "bg-[#030712] border-white/[0.12]" : "bg-white border-slate-200 shadow-sm lg:hover:shadow-2xl",
                    "cursor-pointer"
                  )}>
                    {/* Background Decorative Blob */}
                    <div className={cn(
                      "absolute -right-16 -top-16 w-64 h-64 blur-[100px] opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none",
                      strand === 'ICT' ? "bg-blue-600" : "bg-red-600"
                    )} />

                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-10">
                        <div className={cn(
                          "w-16 h-16 rounded-[24px] flex items-center justify-center shadow-lg transition-all duration-500",
                          `bg-gradient-to-br ${gradient} ${shadow} group-hover:scale-110 group-hover:rotate-6`
                        )}>
                          <Icon size={32} className="text-white" />
                        </div>
                        <div className={cn(
                          "px-4 py-2 rounded-2xl border text-[11px] font-black tracking-[0.2em] transform transition-all duration-300",
                          d ? "border-white/10 text-white/40 group-hover:text-white group-hover:border-white/20" : "border-slate-200 text-slate-400 group-hover:text-slate-900 group-hover:border-slate-300"
                        )}>
                          <DecryptText text={`STRAND / ${strand}`} />
                        </div>
                      </div>

                      <div className="space-y-4 flex-1">
                        <h3 className={cn("text-3xl md:text-4xl font-black uppercase tracking-tighter leading-[0.9] transition-colors duration-300", d ? "text-white group-hover:text-blue-400" : "text-slate-900 group-hover:text-blue-600")}>
                          {title.map((l, i) => <span key={i} className="block">{l}</span>)}
                        </h3>
                        <p className={cn("text-[11px] font-black uppercase tracking-[0.4em] transition-colors duration-300", strand === 'ICT' ? "text-blue-500" : "text-red-500")}>
                          {sub}
                        </p>
                        <p className={cn("text-base leading-relaxed font-medium transition-colors duration-300", d ? "text-slate-400 group-hover:text-slate-200" : "text-slate-500 group-hover:text-slate-700")}>
                          {desc}
                        </p>
                      </div>

                      <div className={cn("mt-10 pt-8 border-t space-y-4 transition-colors duration-300", d ? "border-white/5" : "border-slate-100")}>
                        {feats.map((f, i) => (
                          <div key={i} className="flex items-center gap-4 group/item">
                            <div className={cn(
                              "w-2 h-2 rounded-full transition-transform duration-300 group-hover/item:scale-150",
                              strand === 'ICT' ? "bg-blue-500" : "bg-red-500"
                            )} />
                            <span className={cn("text-xs font-bold uppercase tracking-widest transition-colors duration-300", d ? "text-slate-300 group-hover/item:text-white" : "text-slate-700 group-hover/item:text-slate-900")}>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>

          {/* ── ENROLLMENT PROCESS ────────────────────────────────────────── */}
          <ProcessSection isDark={d} />

          {/* ── BENEFITS — Refined with pure colors and performance hovers ── */}
          <div className="mt-24 md:mt-32 lg:mt-48 text-left">
            <Reveal>
              <div className={cn(
                "relative rounded-[48px] md:rounded-[80px] border overflow-hidden group",
                "transition-all duration-700",
                d ? "bg-[#030712] border-white/[0.12] lg:hover:border-blue-500/50" : "bg-white border-slate-200 shadow-2xl hover:shadow-blue-500/10"
              )} style={{ translate: "0 0", willChange: "transform, border-color" }}>
                {/* Decorative Brand Accents */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-600/5 to-transparent pointer-events-none" />
                <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-blue-600/5 to-transparent pointer-events-none" />

                <div className="relative z-10 p-10 md:p-20 space-y-16 md:space-y-24">
                  {/* Section heading */}
                  <div className="max-w-3xl space-y-8">
                    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-lg shadow-blue-600/20">
                      <Sparkles size={12} fill="currentColor" className="group-hover:animate-spin" /> Premium Education
                    </div>
                    <h2 className={cn("text-5xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85]", d ? "text-white" : "text-slate-900")}>
                      Why Choose <br /> <span className="text-blue-600">ACLC?</span>
                    </h2>
                    <p className={cn("text-lg md:text-xl font-medium leading-relaxed max-w-xl transition-colors duration-300", d ? "text-slate-400 group-hover:text-slate-200" : "text-slate-500 group-hover:text-slate-700")}>
                      We remove the barriers to high-quality tech education. No entrance exams, no grade targets — just absolute potential.
                    </p>
                  </div>

                  {/* Benefits grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {[
                      { t: "No Top-Up Fees", d: "Zero hidden costs during enrollment." },
                      { t: "No Entrance Exam", d: "Your ambition is your only requirement." },
                      { t: "Fully Airconditioned", d: "Modern laboratories for deep focus." },
                      { t: "Industry Modules", d: "Curriculum designed by IT experts." },
                      { t: "Voucher Accepted", d: "Zero tuition for public school grads." },
                      { t: "Modern Tech", d: "Latest software and hardware setups." },
                      { t: "Flexible Tracks", d: "Career-ready or college-ready paths." },
                      { t: "Global Network", d: "Part of the AMA Education System." },
                    ].map((b, i) => (
                      <div
                        key={i}
                        className={cn(
                          "group/card p-8 rounded-[32px] border spring-hover-blue",
                          d ? "bg-white/[0.02] border-white/[0.12] lg:hover:bg-blue-600/5"
                            : "bg-slate-50 border-slate-100 lg:hover:bg-white lg:hover:shadow-xl",
                          "cursor-pointer"
                        )}>
                        <div className={cn(
                          "w-10 h-10 rounded-xl mb-6 flex items-center justify-center transition-all duration-300 shadow-sm",
                          d ? "bg-white/5 text-blue-500 group-hover/card:bg-blue-600 group-hover/card:text-white"
                            : "bg-blue-600 text-white shadow-blue-600/20 shadow-lg"
                        )}>
                          <CheckCircle2 size={18} />
                        </div>
                        <h4 className={cn("text-sm font-black uppercase tracking-tight mb-2 transition-colors duration-300", d ? "text-white group-hover/card:text-blue-400" : "text-slate-900 group-hover/card:text-blue-600")}>{b.t}</h4>
                        <p className={cn("text-xs font-medium leading-relaxed transition-colors duration-300", d ? "text-slate-500 group-hover/card:text-slate-300" : "text-slate-400 group-hover/card:text-slate-600")}>{b.d}</p>
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
              <Globe size={14} className={d ? "text-white" : "text-slate-500"} />
              <Activity size={14} className={d ? "text-white" : "text-slate-500"} />
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
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0
  const isBlue = color === "blue"
  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className={cn("p-1 rounded-md",
            isDark
              ? isBlue ? "bg-blue-900/40 text-blue-400" : "bg-red-900/40 text-red-400"
              : isBlue ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"
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
              ? "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-300 lg:shadow-[0_0_14px_rgba(59,130,246,0.7)]"
              : "bg-gradient-to-r from-red-700 via-red-500 to-red-300 lg:shadow-[0_0_14px_rgba(239,68,68,0.7)]"
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
