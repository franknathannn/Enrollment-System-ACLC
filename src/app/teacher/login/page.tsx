// app/teacher/login/page.tsx
"use client"

import { useState, useEffect, memo, useRef } from "react"
import { supabase } from "@/lib/supabase/teacher-client"
import { toast } from "sonner"
import { Lock, Loader2, GraduationCap, ShieldCheck, Eye, EyeOff, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { TurnstileWidget } from "@/components/TurnstileWidget"
import { verifyTurnstile } from "@/lib/actions/turnstile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

const LoginConstellation = memo(function LoginConstellation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animRef = useRef<number | null>(null)
  const pRef      = useRef<{ x: number; y: number; vx: number; vy: number; size: number }[]>([])
  const mouseRef  = useRef({ x: -1000, y: -1000 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    const init = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      pRef.current  = Array.from({ length: 50 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.2 + 0.8,
      }))
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const isDark = document.documentElement.classList.contains("dark")
      const particles = pRef.current
      const mouse = mouseRef.current

      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        ctx.fillStyle = isDark ? "rgba(59,130,246,0.35)" : "rgba(148,163,184,0.35)"
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()

        const dxM = p.x - mouse.x, dyM = p.y - mouse.y
        const dSq = dxM * dxM + dyM * dyM
        if (dSq < 150 * 150) {
          const d = Math.sqrt(dSq)
          ctx.strokeStyle = isDark ? `rgba(59,130,246,${0.35*(1-d/150)})` : `rgba(37,99,235,${0.25*(1-d/150)})`
          ctx.lineWidth = 1
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke()
        }

        if (i % 2 === 0) {
          for (let j = i + 1; j < Math.min(i + 5, particles.length); j++) {
            const p2 = particles[j]
            const dx = p.x - p2.x, dy = p.y - p2.y
            if (dx*dx + dy*dy < 100*100) {
              ctx.strokeStyle = isDark ? "rgba(59,130,246,0.12)" : "rgba(148,163,184,0.12)"
              ctx.lineWidth = 0.3
              ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke()
            }
          }
        }
      })
      animRef.current = requestAnimationFrame(animate)
    }

    const onMouseMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY } }
    init(); animate()
    window.addEventListener("resize", init)
    window.addEventListener("mousemove", onMouseMove)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      window.removeEventListener("resize", init)
      window.removeEventListener("mousemove", onMouseMove)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
})

export default function TeacherLoginPage() {
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [turnstileKey, setTurnstileKey] = useState(0)
  const MAX_ATTEMPTS = 5

  useEffect(() => {
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    const style = document.createElement("style")
    style.textContent = "::-webkit-scrollbar{display:none}"
    document.head.appendChild(style)
    return () => {
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""
      document.head.removeChild(style)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (failedAttempts >= MAX_ATTEMPTS) return
    const trimmed = email.toLowerCase().trim()
    if (!trimmed || !password) {
      toast.error("Please enter your email and password.", { style: { fontSize: "11px", fontWeight: "900", textTransform: "uppercase" } })
      return
    }
    if (!turnstileToken) {
      toast.error("Please complete the security check first.", { style: { fontSize: "11px", fontWeight: "900", textTransform: "uppercase" } })
      return
    }
    setLoading(true)
    const toastId = toast.loading("Signing in...", { style: { fontSize: "11px", fontWeight: "900", textTransform: "uppercase" } })
    const isHuman = await verifyTurnstile(turnstileToken)
    if (!isHuman) {
      toast.error("Security check failed. Please refresh and try again.", { id: toastId, style: { fontSize: "11px", fontWeight: "900", textTransform: "uppercase" } })
      setLoading(false)
      return
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password })
      if (error) {
        setFailedAttempts(prev => prev + 1)
        setTurnstileToken(null)
        setTurnstileKey(k => k + 1)
        toast.error("Incorrect email or password.", { id: toastId, style: { fontSize: "11px", fontWeight: "900", textTransform: "uppercase" } })
        setLoading(false)
        return
      }
      toast.success("Signed in. Redirecting...", { id: toastId, duration: 1000, style: { fontSize: "11px", fontWeight: "900", textTransform: "uppercase" } })
      window.location.href = "/teacher/dashboard"
    } catch {
      toast.error("Connection error. Check your network.", { id: toastId, style: { fontSize: "11px", fontWeight: "900", textTransform: "uppercase" } })
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-500">
      {/* Back to Dashboard */}
      <Link
        href="/"
        className="absolute top-5 left-5 z-20 flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all duration-200 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white shadow-sm"
      >
        <ArrowLeft size={12} />
        Back to Dashboard
      </Link>
      {/* --- GLASSMORPHISM LOGO BACKGROUND --- */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <img
          src="/logo-aclc.png"
          alt=""
          aria-hidden="true"
          className="w-[70vmin] h-[70vmin] max-w-[600px] max-h-[600px] object-contain opacity-[0.12] dark:opacity-[0.08] select-none"
          draggable={false}
        />
      </div>
      <div className="absolute inset-0 bg-slate-50/60 dark:bg-slate-950/70 backdrop-blur-[60px] pointer-events-none z-[1]" />
      
      <LoginConstellation />
      
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/50 dark:bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] bg-indigo-100/30 dark:bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex items-center gap-3 mb-10 relative z-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="w-12 h-12 bg-slate-900 dark:bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95">
          <GraduationCap className="w-7 h-7 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-black text-xl md:text-2xl tracking-tighter uppercase text-slate-900 dark:text-white leading-none italic">ACLC Northbay</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold tracking-[0.4em] text-blue-600 dark:text-blue-400 uppercase">Teacher Portal</span>
            <div className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />
          </div>
        </div>
      </div>

      <Card className="max-w-md w-full p-8 md:p-10 rounded-[32px] md:rounded-[48px] border border-slate-100 dark:border-white/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-2xl relative z-10 transition-all duration-500">
        <div className="space-y-2 mb-8 md:mb-10 text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-5 md:mb-6 border border-slate-100 dark:border-white/5 transition-transform hover:rotate-6">
            <Lock className="w-6 h-6 md:w-8 md:h-8 text-slate-900 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Teacher Login</h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium italic">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 md:space-y-6">
          <div className="space-y-2 group">
            <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-4 tracking-widest group-focus-within:text-blue-500 transition-colors">
              Teacher Email
            </Label>
            <Input
              type="email"
              placeholder="teacher@school.edu"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-12 md:h-14 rounded-2xl border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white font-bold focus:border-blue-600 px-5 md:px-6 transition-all focus:scale-[1.02]"
              required disabled={loading}
            />
          </div>
          <div className="space-y-2 group">
            <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-4 tracking-widest group-focus-within:text-blue-500 transition-colors">
              Password
            </Label>
            <div className="relative">
              <Input
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-12 md:h-14 rounded-2xl border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white font-bold focus:border-blue-600 px-5 md:px-6 pr-14 transition-all focus:scale-[1.02]"
                required disabled={loading}
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-3 py-2">
              <TurnstileWidget key={turnstileKey} onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} theme="light" />
            </div>
          </div>
          {failedAttempts > 0 && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
              failedAttempts >= MAX_ATTEMPTS
                ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50'
            }`}>
              <span className="text-base leading-none">⚠</span>
              {failedAttempts >= MAX_ATTEMPTS
                ? 'Too many failed attempts. Please wait before trying again.'
                : `${failedAttempts} of ${MAX_ATTEMPTS} attempts used · ${MAX_ATTEMPTS - failedAttempts} remaining`
              }
            </div>
          )}

          <Button type="submit" disabled={loading || failedAttempts >= MAX_ATTEMPTS}
            className="w-full h-14 md:h-16 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white rounded-[20px] md:rounded-[24px] text-xs font-black uppercase tracking-[0.2em] gap-3 shadow-2xl transition-all active:scale-95 group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><span>Sign In</span><ShieldCheck size={18} className="group-hover:rotate-12 transition-transform" /></>}
          </Button>
        </form>
      </Card>

      <div className="mt-8 md:mt-12 flex flex-col items-center gap-4 relative z-10">
        <div className="h-px w-20 bg-slate-200 dark:bg-slate-800" />
        <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-[0.5em] font-black italic">Faculty • ACLC Northbay</p>
      </div>
    </div>
  )
}