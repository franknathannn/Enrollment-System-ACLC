"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  CheckCircle2, ArrowRight, Home, Search, GraduationCap,
  Sparkles, Building2, ShieldCheck, BadgeCheck, Loader2, Orbit, Download,
  Sun, Moon
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { toPng } from 'html-to-image'
import { cn } from "@/lib/utils"
import { useThemeStore } from "@/store/useThemeStore"

interface Particle { x: number; y: number; vx: number; vy: number; size: number }

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent))
    check(); window.addEventListener("resize", check, { passive: true }); return () => window.removeEventListener("resize", check)
  }, [])
  return isMobile
}

function SuccessContent() {
  const { isDark, toggleTheme } = useThemeStore()
  const isMobile = useIsMobile()
  const d = isDark

  const searchParams = useSearchParams()
  const fullId = searchParams.get('id') || ""
  const shortId = fullId ? fullId.split('-')[0] : "-----------"

  const [studentData, setStudentData] = useState<{ lastName: string | null; lrn: string }>({ lastName: null, lrn: searchParams.get('lrn') || "-----------" })
  const [isLoading, setIsLoading] = useState(true)

  const heroCanvasRef = useRef<HTMLCanvasElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const isDarkRef = useRef(isDark)
  useEffect(() => { isDarkRef.current = isDark }, [isDark])

  useEffect(() => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!fullId || !uuidRegex.test(fullId)) { setIsLoading(false); return }
    const fetchData = async () => {
      const { data, error } = await supabase.from('students').select('last_name, lrn').eq('id', fullId).maybeSingle()
      if (!error && data) setStudentData({ lastName: data.last_name, lrn: data.lrn || "" })
      setIsLoading(false)
    }
    fetchData()
  }, [fullId])

  // ── Local canvas — desktop only ──────────────────────────────────────────
  useEffect(() => {
    if (isMobile) return
    const canvas = heroCanvasRef.current; if (!canvas) return
    const ctx = canvas.getContext("2d"); if (!ctx) return
    let particles: Particle[] = []; const mouse = { x: -1000, y: -1000 }; let raf: number

    const init = () => {
      canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight
      particles = Array.from({ length: 50 }, (): Particle => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, size: Math.random() * 1.8 + 0.4 }))
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const dark = isDarkRef.current
      const lCol = dark ? [99, 165, 250] : [37, 99, 235]
      particles.forEach((p: Particle) => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1; if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${lCol.join(',')},${dark ? p.size / 3.5 : p.size / 5})`; ctx.fill()
        const dx = mouse.x - p.x; const dy = mouse.y - p.y; const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 160) { ctx.beginPath(); ctx.lineWidth = 0.6; ctx.strokeStyle = `rgba(${lCol.join(',')},${(1 - dist / 160) * 0.7})`; ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke() }
      })
      raf = requestAnimationFrame(animate)
    }

    const onMove = (e: MouseEvent) => { const rect = canvas.getBoundingClientRect(); mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top }
    window.addEventListener("resize", init, { passive: true }); canvas.addEventListener("mousemove", onMove, { passive: true })
    init(); animate()
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", init); canvas.removeEventListener("mousemove", onMove) }
  }, [isMobile])

  const handleDownloadImage = async () => {
    if (!cardRef.current) return
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, backgroundColor: d ? '#020617' : '#eef2ff', pixelRatio: 2 })
      const link = document.createElement('a'); link.download = `Enrollment-Slip-${studentData.lastName || 'Student'}.png`; link.href = dataUrl; link.click()
    } catch (err) { console.error('Failed to generate PNG:', err) }
  }

  return (
    <div className="max-w-2xl w-full space-y-12 relative z-10 text-center p-4">
      {/* Theme toggle */}
      <div className="absolute top-0 right-4">
        <button onClick={toggleTheme} aria-label="Toggle theme"
          className={cn("relative w-10 h-10 rounded-2xl flex items-center justify-center border overflow-hidden transition-[background-color,border-color] duration-300",
            d ? "bg-slate-800/80 border-white/10 hover:bg-yellow-400/10 hover:border-yellow-400/30" : "bg-white border-slate-200 hover:bg-blue-50 hover:border-blue-300 shadow-sm")}>
          <span className={cn("absolute transition-[opacity,transform] duration-500", d ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50")}><Sun size={14} className="text-yellow-300" /></span>
          <span className={cn("absolute transition-[opacity,transform] duration-500", !d ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50")}><Moon size={14} className="text-blue-600" /></span>
        </button>
      </div>

      {/* Canvas — desktop only */}
      {!isMobile && <canvas ref={heroCanvasRef} className="absolute inset-0 pointer-events-none z-0 opacity-50" style={{ willChange: "transform" }} aria-hidden="true" />}

      {/* Success logo replacement */}
      <div className="relative inline-block z-10">
        <div className="absolute inset-0 bg-blue-500/40 blur-[80px] animate-pulse" />
        <div className="absolute inset-[-20px] rounded-full border border-blue-400/20 animate-[ping_3s_linear_infinite] opacity-20" />
        <div className="absolute inset-[-40px] rounded-full border border-blue-400/10 animate-[ping_4s_linear_infinite] opacity-10" />

        <div className={cn("w-32 h-32 md:w-40 md:h-40 rounded-[44px] md:rounded-[56px] flex items-center justify-center border relative overflow-hidden group/logo",
          d ? "bg-slate-900/90 border-blue-500/20 shadow-[0_0_70px_rgba(59,130,246,0.3)]" : "bg-white/90 border-blue-200 shadow-[0_0_70px_rgba(59,130,246,0.2)]")}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover/logo:opacity-100 transition-opacity duration-700" />
          <img
            src="/logo-aclc.png"
            alt="ACLC Logo"
            className="w-20 h-20 md:w-24 md:h-24 object-contain relative z-10 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-transform duration-700 group-hover/logo:scale-110"
            style={{ transform: 'translateZ(0)' }}
          />
          <Orbit size={160} className={cn("absolute animate-spin", d ? "text-blue-800/20" : "text-blue-100/60")} style={{ animationDuration: '15s' }} />
        </div>

        <div className="absolute -top-3 -right-3 w-14 h-14 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-[0_10px_30px_rgba(59,130,246,0.5)] animate-bounce" style={{ animationDuration: '2.5s' }}>
          <Sparkles size={24} className="animate-pulse" />
        </div>
      </div>

      {/* Headline */}
      <div className="space-y-4 relative z-10">
        <p className={cn("text-[10px] font-black uppercase tracking-[0.6em] animate-pulse", d ? "text-blue-500" : "text-blue-600")}>Student Enrolled • Pending</p>
        <h1 className={cn("text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none italic", d ? "text-white" : "text-slate-900")}>
          Welcome to the <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-blue-400 pr-2">Future</span>,{" "}
          {isLoading ? '...' : studentData.lastName ? `${studentData.lastName}` : "Student"}.
        </h1>
        <p className={cn("font-medium italic text-lg leading-relaxed max-w-md mx-auto", d ? "text-slate-500" : "text-slate-500")}>
          Your application has been successfully saved into the ACLC Northbay applicants list.
        </p>
      </div>

      {/* Dossier Card */}
      <Card ref={cardRef} className={cn("p-1 rounded-[56px] border-none shadow-2xl text-left relative overflow-hidden transition-all duration-500 hover:shadow-blue-500/20 group",
        d ? "bg-gradient-to-br from-blue-500/20 to-transparent" : "bg-gradient-to-br from-blue-200/40 to-indigo-100/20")}>
        <div className={cn("rounded-[52px] p-10 relative overflow-hidden transition-all duration-500", d ? "bg-slate-950/95 group-hover:bg-slate-900/95" : "bg-white/95 group-hover:bg-white")}>
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400" />
          <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12 pointer-events-none">
            <GraduationCap size={180} className={d ? "text-blue-400" : "text-blue-600"} />
          </div>
          <div className="space-y-8 relative z-10">
            <div className={cn("flex justify-between items-start border-b pb-8", d ? "border-white/5" : "border-slate-100")}>
              <div>
                <p className={cn("text-[9px] font-black uppercase tracking-[0.4em]", d ? "text-blue-500" : "text-blue-600")}>Student Status</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,1)] animate-pulse" />
                  <h3 className={cn("text-2xl font-black uppercase tracking-tight", d ? "text-white" : "text-slate-900")}>Student Pending</h3>
                </div>
              </div>
              <BadgeCheck size={40} className={d ? "text-blue-400" : "text-blue-500"} />
            </div>
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-1">
                <p className={cn("text-[9px] font-black uppercase tracking-[0.3em]", d ? "text-slate-600" : "text-slate-400")}>Last Name</p>
                <p className={cn("text-xl font-black tracking-tighter italic", d ? "text-white" : "text-slate-900")}>
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : (studentData.lastName || "-----------")}
                </p>
              </div>
              <div className="space-y-1">
                <p className={cn("text-[9px] font-black uppercase tracking-[0.3em]", d ? "text-slate-600" : "text-slate-400")}>Student LRN</p>
                <p className={cn("text-xl font-mono font-black tracking-[0.2em]", d ? "text-blue-100" : "text-blue-700")}>
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : studentData.lrn}
                </p>
              </div>
              <div className="col-span-2 space-y-1">
                <p className={cn("text-[9px] font-black uppercase tracking-[0.3em]", d ? "text-slate-600" : "text-slate-400")}>Tracking ID</p>
                <p className={cn("text-sm md:text-base font-mono font-bold break-all", d ? "text-blue-400" : "text-blue-600")}>{shortId}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Campus info */}
      <div className={cn("relative z-10 p-8 rounded-[48px] border overflow-hidden transition-[background-color,border-color] duration-300",
        d ? "bg-white/5 border-white/5 hover:bg-white/[0.07]" : "bg-white border-slate-200 hover:border-blue-200 shadow-sm")}>
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/50 via-indigo-500/30 to-transparent" />
        <div className="space-y-6 relative z-10">
          <div className="flex items-center gap-4 justify-center">
            <Building2 className={cn("animate-pulse", d ? "text-blue-500" : "text-blue-600")} size={28} />
            <h3 className={cn("text-xl font-black uppercase tracking-[0.2em]", d ? "text-white" : "text-slate-900")}>ACLC NORTHBAY CAMPUS</h3>
          </div>
          <p className={cn("text-base font-medium leading-relaxed italic px-8", d ? "text-blue-100/60" : "text-slate-500")}>"Please wait until we verify your enrollment data."</p>
          <div className="flex flex-col items-center gap-3 justify-center text-[10px] font-black uppercase tracking-[0.3em]">
            <div className={cn("flex items-center gap-2", d ? "text-slate-600" : "text-slate-400")}>
              <ShieldCheck size={16} className="text-blue-500" /> Check after 48 hours.
            </div>
            <p className={cn("animate-pulse", d ? "text-blue-400" : "text-blue-600")}>SCREENSHOT THIS PAGE FOR YOUR TRACKING ID</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-6 pt-4 relative z-10 print:hidden">
        <Link href="/" className="flex-1">
          <Button variant="ghost" className={cn("w-full h-20 rounded-[32px] font-black uppercase text-[11px] tracking-[0.4em] border transition-[color,background-color,border-color]",
            d ? "text-slate-500 hover:text-white hover:bg-white/5 border-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-slate-200")}>
            <Home className="mr-3 opacity-50" size={18} /> Return Home
          </Button>
        </Link>
        <Link href="/status" className="flex-1">
          <button className="group w-full h-20 rounded-[32px] text-white font-black uppercase text-[11px] tracking-[0.4em] transition-[box-shadow,filter] duration-300 active:scale-95 overflow-hidden relative bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_20px_50px_rgba(59,130,246,0.3)] hover:shadow-[0_20px_60px_rgba(99,102,241,0.4)]">
            <span className="flex items-center justify-center gap-3">
              <Search className="group-hover:scale-110 transition-transform" size={18} />Track Status<ArrowRight className="group-hover:translate-x-1.5 transition-transform" size={16} />
            </span>
          </button>
        </Link>
      </div>

      {/* Download */}
      <div className="relative z-10 pt-6 print:hidden">
        <Button onClick={handleDownloadImage} variant="ghost"
          className={cn("gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-[color,background-color]",
            d ? "text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50")}>
          <Download size={16} /> Download Enrollment Slip (PNG)
        </Button>
      </div>

      <p className={cn("text-[9px] font-black uppercase tracking-[0.8em] pt-12 relative z-10", d ? "text-slate-700" : "text-slate-400")}>ACLC NORTHBAY • S.Y. 2025-2026</p>
    </div>
  )
}

export default function SuccessPage() {
  const { isDark } = useThemeStore()
  const isMobile = useIsMobile()
  const d = isDark
  const globalCanvasRef = useRef<HTMLCanvasElement>(null)
  const isDarkRef = useRef(isDark)
  useEffect(() => { isDarkRef.current = isDark }, [isDark])

  useEffect(() => {
    if (isMobile) return
    const canvas = globalCanvasRef.current; if (!canvas) return
    const ctx = canvas.getContext("2d"); if (!ctx) return
    let particles: Particle[] = []; let raf: number

    const init = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight
      particles = Array.from({ length: 70 }, (): Particle => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15, size: Math.random() * 1.6 }))
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const dark = isDarkRef.current
      const pCol = dark ? [255, 255, 255] : [37, 99, 235]
      particles.forEach((p: Particle) => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${pCol.join(',')},${dark ? 0.2 : 0.15})`; ctx.fill()
      })
      raf = requestAnimationFrame(animate)
    }

    window.addEventListener("resize", init, { passive: true }); init(); animate()
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", init) }
  }, [isMobile])

  return (
    <div className={cn("min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden transition-[background-color] duration-500", d ? "bg-slate-950" : "bg-[#eef2ff]")}>
      <style>{`
        html,body{scrollbar-width:none;-ms-overflow-style:none}
        html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}
        @keyframes aurora1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(4%,3%) scale(1.06)}66%{transform:translate(-3%,5%) scale(0.97)}}
        @keyframes aurora2{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(-5%,-3%) scale(1.08)}70%{transform:translate(4%,4%) scale(0.95)}}
        .animate-aurora-1{animation:aurora1 18s ease-in-out infinite}
        .animate-aurora-2{animation:aurora2 22s ease-in-out infinite}
      `}</style>

      {!isMobile && <canvas ref={globalCanvasRef} className="absolute inset-0 pointer-events-none z-0" style={{ willChange: "transform" }} aria-hidden="true" />}

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className={cn("absolute top-[-30%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[160px] pointer-events-none animate-aurora-1", d ? "bg-blue-600/10" : "bg-blue-300/25")} style={{ transform: 'translateZ(0)' }} />
        <div className={cn("absolute bottom-[-30%] left-[-10%] w-[70%] h-[70%] rounded-full blur-[160px] pointer-events-none animate-aurora-2", d ? "bg-indigo-600/10" : "bg-indigo-200/30")} style={{ transform: 'translateZ(0)' }} />
      </div>

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center gap-6 relative z-10">
          <div className="relative flex items-center justify-center">
            <span className="absolute w-20 h-20 rounded-full border-2 border-blue-500/20 animate-ping" />
            <span className="absolute w-14 h-14 rounded-full border-2 border-blue-400/30 animate-ping" style={{ animationDelay: "0.15s" }} />
            <span className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 shadow-lg shadow-blue-500/30 flex items-center justify-center relative z-10">
              <Loader2 className="animate-spin text-white" size={18} />
            </span>
          </div>
          <p className={cn("text-[10px] font-black uppercase tracking-[0.5em]", d ? "text-blue-400" : "text-blue-600")}>Synchronizing...</p>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  )
}
