"use client"

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { useEnrollmentStore } from "@/store/useEnrollmentStore"
import { useThemeStore } from "@/store/useThemeStore"
import { supabase } from "@/lib/supabase/client"
import { Loader2, Lock, Timer, ArrowLeft, Users, ShieldCheck, Sun, Moon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import Step1Identity  from "@/components/forms/Step1Identity"
import Step2Academic  from "@/components/forms/Step2Academic"
import Step3Family    from "@/components/forms/Step3Family"
import Step4Documents from "@/components/forms/Step4Documents"
import Step5Review    from "@/components/forms/Step5Review"

interface Particle { x: number; y: number; vx: number; vy: number; size: number }

// ── Detect mobile once, outside React — no state, no re-render ───────────────
const IS_MOBILE =
  typeof window !== "undefined" &&
  (window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent))

export default function EnrollmentPage() {
  const { currentStep }         = useEnrollmentStore()
  const { isDark, toggleTheme } = useThemeStore()
  // Keep a ref so the canvas loop reads the latest value without re-subscribing
  const isDarkRef = useRef(isDark)
  useEffect(() => { isDarkRef.current = isDark }, [isDark])

  const [systemStatus, setSystemStatus] = useState<{
    isOpen: boolean
    reason: "date" | "manual" | "capacity" | null
    closingTime: string | null
    openingTime: string | null
    schoolYear: string
    controlMode: string
  } | null>(null)

  const [loading,  setLoading]  = useState(true)
  const [timeLeft, setTimeLeft] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const progressPercentage = (currentStep / 5) * 100

  // ── CANVAS — desktop only, runs once, reads isDark via ref ─────────────────
  useEffect(() => {
    if (IS_MOBILE) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext("2d"); if (!ctx) return

    let particles: Particle[] = []
    const mouse = { x: -1000, y: -1000 }
    let raf: number
    let frameCount = 0

    const init = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      const count = Math.min(55, Math.floor((canvas.width * canvas.height) / 14000))
      particles = Array.from({ length: count }, (): Particle => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 1.8 + 0.5,
      }))
    }

    const animate = () => {
      frameCount++
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const dark = isDarkRef.current
      const pCol = dark ? [255, 255, 255] : [37, 99, 235]
      const lCol = dark ? [99, 160, 255]  : [29, 78, 216]
      const n = particles.length

      particles.forEach((p: Particle) => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${pCol.join(',')},${dark ? 0.55 : 0.35})`; ctx.fill()
        const dx = mouse.x - p.x; const dy = mouse.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 200) {
          ctx.beginPath(); ctx.lineWidth = 1.2
          ctx.strokeStyle = `rgba(${lCol.join(',')},${(1 - dist / 200) * 0.8})`
          ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke()
        }
      })

      if (frameCount % 3 === 0) {
        for (let a = 0; a < n - 1; a++) {
          for (let b = a + 1; b < n; b += 2) {
            const dx = particles[a].x - particles[b].x
            const dy = particles[a].y - particles[b].y
            const d2 = dx * dx + dy * dy
            if (d2 < 8100) {
              ctx.beginPath(); ctx.lineWidth = 0.3
              ctx.strokeStyle = `rgba(${lCol.join(',')},${(1 - Math.sqrt(d2) / 90) * 0.2})`
              ctx.moveTo(particles[a].x, particles[a].y)
              ctx.lineTo(particles[b].x, particles[b].y); ctx.stroke()
            }
          }
        }
      }
      raf = requestAnimationFrame(animate)
    }

    const onMove  = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY }
    const onResize = () => init()
    window.addEventListener("mousemove", onMove,   { passive: true })
    window.addEventListener("resize",   onResize,  { passive: true })
    init(); animate()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("resize",   onResize)
    }
  }, []) // ← empty: never re-runs on theme change; isDark read via ref

  // ── Portal status check — stable callback, no recreation on render ─────────
  const checkStatus = useCallback(async () => {
    try {
      const [configRes, countRes] = await Promise.all([
        supabase.from("system_config").select("*").single(),
        supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "Accepted"),
      ])
      if (configRes.error) throw configRes.error
      const config = configRes.data
      const currentEnrolled = countRes.count || 0
      if (!config) return

      const now   = new Date()
      const start = config.enrollment_start ? new Date(config.enrollment_start) : null
      const end   = config.enrollment_end   ? new Date(config.enrollment_end)   : null
      const isFull = currentEnrolled >= config.capacity

      let portalOpen  = false
      let closeReason: "date" | "manual" | "capacity" | null = null

      if (isFull) {
        closeReason = "capacity"
      } else if (config.control_mode === "manual") {
        portalOpen  = config.is_portal_active
        closeReason = !config.is_portal_active ? "manual" : null
      } else {
        const isWithin = start && end && now >= start && now <= end
        portalOpen  = !!isWithin
        closeReason = !isWithin ? "date" : null
      }

      setSystemStatus({
        isOpen: portalOpen,
        reason: closeReason,
        closingTime:  config.enrollment_end   || null,
        openingTime:  config.enrollment_start || null,
        schoolYear:   config.school_year      || "2025-2026",
        controlMode:  config.control_mode     || "automatic",
      })
    } catch (error) {
      console.error("Portal verification failed:", error)
    } finally {
      setLoading(false)
    }
  }, []) // stable — no deps that change

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 60_000)
    return () => clearInterval(interval)
  }, [checkStatus])

  // ── Countdown timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!systemStatus?.closingTime || !systemStatus.isOpen || systemStatus.controlMode === "manual") {
      setTimeLeft(null); return
    }
    const tick = () => {
      const diff = new Date(systemStatus.closingTime!).getTime() - Date.now()
      if (diff <= 0) {
        setSystemStatus(prev => prev ? { ...prev, isOpen: false, reason: "date" } : null)
        setTimeLeft(null)
        clearInterval(timer)
      } else {
        const h = Math.floor(diff / 3_600_000)
        const m = Math.floor((diff % 3_600_000) / 60_000)
        const s = Math.floor((diff % 60_000) / 1_000)
        setTimeLeft(`${h}h ${m}m ${s}s`)
      }
    }
    tick() // run immediately so there's no 1s blank flash
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [systemStatus?.closingTime, systemStatus?.isOpen, systemStatus?.controlMode])

  const currentStepContent = useMemo(() => {
    switch (currentStep) {
      case 1: return <Step1Identity />
      case 2: return <Step2Academic />
      case 3: return <Step3Family />
      case 4: return <Step4Documents />
      case 5: return <Step5Review />
      default: return <Step1Identity />
    }
  }, [currentStep])

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className={cn(
      "min-h-screen flex flex-col items-center justify-center gap-6",
      isDark ? "bg-[#020617]" : "bg-[#eef2ff]"
    )}>
      <div className="relative flex items-center justify-center">
        <span className="absolute w-20 h-20 rounded-full border-2 border-blue-500/20 animate-ping" />
        <span className="absolute w-14 h-14 rounded-full border-2 border-blue-400/30 animate-ping" style={{ animationDelay: "0.15s" }} />
        <span className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 shadow-lg shadow-blue-500/30 flex items-center justify-center">
          <Loader2 className="animate-spin text-white" size={18} />
        </span>
      </div>
      <p className={cn(
        "font-black text-[10px] uppercase tracking-[0.4em]",
        isDark ? "text-blue-400" : "text-blue-600"
      )}>Loading Application...</p>
    </div>
  )

  // isDark drives a data attribute — the root div itself has NO color transition.
  // Theme colors transition via CSS on individual elements only where needed,
  // so toggling theme never triggers a full-page style recalc cascade.
  return (
    <div
      data-theme={isDark ? "dark" : "light"}
      className={cn(
        "min-h-screen p-6 md:p-12 overflow-x-hidden relative",
        isDark ? "bg-[#020617] text-white" : "bg-[#eef2ff] text-slate-900"
      )}
    >
      <style>{`
        html, body { scrollbar-width: none; -ms-overflow-style: none; }
        html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }

        @keyframes aurora1 {
          0%, 100% { transform: translate(0,0) scale(1); }
          33%       { transform: translate(4%,3%) scale(1.06); }
          66%       { transform: translate(-3%,5%) scale(0.97); }
        }
        @keyframes aurora2 {
          0%, 100% { transform: translate(0,0) scale(1); }
          40%       { transform: translate(-5%,-3%) scale(1.08); }
          70%       { transform: translate(4%,4%) scale(0.95); }
        }
        .animate-aurora-1 { animation: aurora1 18s ease-in-out infinite; }
        .animate-aurora-2 { animation: aurora2 22s ease-in-out infinite; }

        /* GPU shimmer: transform:translateX is compositor-only — no layout/paint on mobile */
        .shimmer-bar { position: relative; overflow: hidden; }
        .shimmer-bar::after {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%);
          transform: translateX(-100%);
          animation: shimmerSlide 2s linear infinite;
          will-change: transform;
        }
        @keyframes shimmerSlide {
          from { transform: translateX(-100%); }
          to   { transform: translateX(300%); }
        }
        /* Kill aurora animation on mobile — blur + animation is expensive on low-end devices */
        @media (max-width: 767px) {
          .animate-aurora-1, .animate-aurora-2 { animation: none !important; }
        }

        /*
         * Theme toggle: instead of transitioning every element via JS class swap,
         * we transition ONLY the specific properties that visually matter.
         * This is handled per-element via Tailwind's transition utilities.
         * The root bg swaps instantly (no duration-500) to avoid the full-page
         * repaint cascade that caused the lag.
         */
      `}</style>

      {/* Canvas — desktop only, never remounts on theme change */}
      {!IS_MOBILE && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none z-0"
          style={{ willChange: "transform" }}
          aria-hidden="true"
        />
      )}

      {/* Ambient glows — CSS-only, theme class drives opacity/color statically */}
      <div className={cn(
        "fixed top-0 right-0 w-[500px] h-[500px] blur-[150px] rounded-full pointer-events-none z-0",
        isDark ? "bg-blue-600/10" : "bg-blue-400/15"
      )} />
      <div className={cn(
        "fixed bottom-0 left-0 w-[500px] h-[500px] blur-[150px] rounded-full pointer-events-none z-0",
        isDark ? "bg-indigo-600/10" : "bg-indigo-300/15"
      )} />

      {/* Aurora bands */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className={cn(
          "absolute top-[-20%] left-[-10%] w-[70vw] h-[60vh] rounded-full blur-[90px] animate-aurora-1",
          isDark
            ? "opacity-[0.12] bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-700"
            : "opacity-[0.15] bg-gradient-to-br from-blue-300 via-indigo-300 to-violet-300"
        )} />
        <div className={cn(
          "absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] rounded-full blur-[110px] animate-aurora-2",
          isDark
            ? "opacity-[0.08] bg-gradient-to-bl from-cyan-500 via-blue-600 to-indigo-700"
            : "opacity-[0.10] bg-gradient-to-bl from-cyan-200 via-blue-200 to-indigo-200"
        )} />
      </div>

      {!systemStatus?.isOpen ? (
        /* ── CLOSED STATE ── */
        <div className="max-w-md mx-auto mt-32 space-y-10 relative z-10 text-center">
          <div className="relative group mx-auto w-24 h-24">
            <div className={cn(
              "absolute inset-0 blur-xl rounded-full animate-pulse",
              isDark ? "bg-blue-600/20" : "bg-blue-400/30"
            )} />
            <div className={cn(
              "relative w-full h-full border rounded-[32px] flex items-center justify-center",
              isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200 shadow-md"
            )}>
              {systemStatus?.reason === "capacity"
                ? <Users size={40} className="text-amber-500" />
                : <Lock  size={40} className="text-blue-500"  />}
            </div>
          </div>
          <h1 className={cn(
            "text-4xl font-black uppercase tracking-tighter italic",
            isDark ? "text-white" : "text-slate-900"
          )}>
            {systemStatus?.reason === "date" ? "Portal is Officially Closed" : "Portal Encrypted"}
          </h1>
          <div className="space-y-4">
            <Button disabled className={cn(
              "w-full h-16 rounded-2xl font-black uppercase tracking-widest border opacity-50 cursor-not-allowed",
              isDark ? "bg-slate-800 text-slate-500 border-white/10" : "bg-slate-100 text-slate-400 border-slate-200"
            )}>
              <Lock className="mr-2" size={18} /> APPLICATION CLOSED
            </Button>
            <Link href="/">
              <Button variant="ghost" className={cn(
                "w-full rounded-xl font-bold uppercase text-xs tracking-widest",
                isDark ? "text-slate-500 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              )}>Return to Hub</Button>
            </Link>
          </div>
        </div>
      ) : (
        /* ── OPEN STATE ── */
        <div className="max-w-2xl mx-auto space-y-8 relative z-10">

          {/* Top nav */}
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" className={cn(
                "rounded-xl font-black uppercase text-[9px] tracking-[0.2em] group",
                isDark ? "text-slate-500 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              )}>
                <ArrowLeft className="mr-2 group-hover:-translate-x-0.5 transition-transform" size={14} /> Go Back
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              {timeLeft && (
                <div className={cn(
                  "border px-5 py-2.5 rounded-full flex items-center gap-3 backdrop-blur-md",
                  isDark ? "bg-slate-900/50 border-white/5" : "bg-white border-slate-200 shadow-sm"
                )}>
                  <Timer size={14} className="text-blue-400 animate-pulse" />
                  <span className={cn("font-mono font-black text-xs", isDark ? "text-blue-400" : "text-blue-600")}>
                    {timeLeft}
                  </span>
                </div>
              )}

              {/* Theme toggle — only this button has a transition, not the whole page */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className={cn(
                  "relative w-10 h-10 rounded-2xl flex items-center justify-center border overflow-hidden",
                  "transition-[background-color,border-color] duration-200",
                  isDark
                    ? "bg-slate-800/80 border-white/10 hover:bg-yellow-400/10 hover:border-yellow-400/30"
                    : "bg-white border-slate-200 hover:bg-blue-50 hover:border-blue-300 shadow-sm"
                )}
              >
                <span className={cn(
                  "absolute transition-[opacity,transform] duration-300",
                  isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
                )}>
                  <Sun size={14} className="text-yellow-300" />
                </span>
                <span className={cn(
                  "absolute transition-[opacity,transform] duration-300",
                  !isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50"
                )}>
                  <Moon size={14} className="text-blue-600" />
                </span>
              </button>
            </div>
          </div>

          {/* Branding */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5 group">
              <div className="relative flex items-center justify-center p-1.5">
                <div className={cn(
                  "absolute inset-0 rounded-full blur-xl animate-pulse",
                  isDark ? "bg-blue-600/30" : "bg-blue-400/30"
                )} />
                <img
                  src="/logo-aclc.png"
                  alt="Logo"
                  loading="eager"
                  className="relative w-14 h-14 object-contain drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                />
              </div>
              <div>
                <span className={cn(
                  "font-black text-xl uppercase italic leading-none tracking-tighter",
                  isDark ? "text-white" : "text-slate-900"
                )}>AMA ACLC Northbay</span>
                <p className={cn(
                  "text-[9px] font-bold uppercase tracking-[0.4em] mt-1.5",
                  isDark ? "text-blue-400" : "text-blue-600"
                )}>Enrollment System</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-black text-[10px] text-white uppercase tracking-widest shadow-lg shadow-blue-500/20">
                Step 0{currentStep}
              </div>
              <span className={cn(
                "text-[8px] font-black uppercase tracking-[0.3em]",
                isDark ? "text-slate-500" : "text-slate-400"
              )}>{progressPercentage}% Complete</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className={cn(
            "w-full h-1.5 rounded-full overflow-hidden border",
            isDark ? "bg-white/5 border-white/5" : "bg-slate-200 border-slate-200"
          )}>
            <div
            className="h-full bg-gradient-to-r from-blue-700 via-blue-400 to-cyan-300 shimmer-bar transition-[width] duration-700 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Form container */}
          <div className={cn(
            "backdrop-blur-3xl p-8 md:p-12 rounded-[56px] border relative overflow-hidden",
            isDark
              ? "bg-gradient-to-b from-[#0d1433]/80 to-slate-950/90 border-white/10 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.9)]"
              : "bg-white/90 border-blue-100 shadow-[0_30px_80px_rgba(99,102,241,0.15)]"
          )}>
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400" />
            <ShieldCheck size={200} className={cn(
              "absolute -bottom-20 -right-20 -rotate-12 pointer-events-none",
              isDark ? "text-white/[0.02]" : "text-blue-500/[0.04]"
            )} />
            <div className="relative z-10">{currentStepContent}</div>
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-4 py-4">
            {[1,2,3,4,5].map(s => (
              <div key={s} className={cn(
                "h-1.5 rounded-full transition-[width,background-color] duration-500",
                s === currentStep
                  ? "w-12 bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_14px_rgba(99,130,246,0.8)]"
                  : s < currentStep
                    ? isDark ? "w-3 bg-blue-900" : "w-3 bg-blue-300"
                    : isDark ? "w-2 bg-white/10" : "w-2 bg-slate-300"
              )} />
            ))}
          </div>

        </div>
      )}
    </div>
  )
}
