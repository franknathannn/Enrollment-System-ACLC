// app/status/components/VerifyForm.tsx
"use client"

import { useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Fingerprint, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  lrn: string
  lastName: string
  trackingId: string
  loading: boolean
  onLrnChange: (v: string) => void
  onLastNameChange: (v: string) => void
  onTrackingIdChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export function VerifyForm({
  lrn, lastName, trackingId, loading,
  onLrnChange, onLastNameChange, onTrackingIdChange, onSubmit,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isLrnComplete = lrn.length === 12

  // Particle animation inside the form card
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    let particles: { x: number; y: number; vx: number; vy: number; size: number }[] = []
    let raf: number
    const init = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      particles = Array.from({ length: 40 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2,
      }))
    }
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = "rgba(59,130,246,0.35)"
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
      })
      raf = requestAnimationFrame(animate)
    }
    init(); animate()
    return () => cancelAnimationFrame(raf)
  }, [])

  const baseInput = "h-16 rounded-[28px] border-2 border-white/5 bg-white/5 text-white text-base font-mono font-bold tracking-[0.2em] focus:border-blue-500 focus:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all outline-none"

  return (
    <form onSubmit={onSubmit} className="space-y-4 relative z-10">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-30 rounded-3xl" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LRN */}
        <div className="relative group">
          <Fingerprint
            className={cn(
              "absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors z-10",
              isLrnComplete ? "text-blue-400" : "text-slate-700"
            )}
          />
          <Input
            placeholder="12-DIGIT LRN"
            value={lrn}
            onChange={e => onLrnChange(e.target.value.replace(/\D/g, ""))}
            maxLength={12}
            className={cn(baseInput, "pl-14")}
          />
        </div>

        {/* Surname */}
        <Input
          placeholder="SURNAME (LAST NAME)"
          value={lastName}
          onChange={e => onLastNameChange(e.target.value)}
          className={cn(baseInput, "px-8 uppercase")}
        />
      </div>

      {/* Tracking ID (first segment of UUID only) */}
      <div className="space-y-1">
        <Input
          placeholder="TRACKING ID (FIRST PART)"
          value={trackingId}
          onChange={e => onTrackingIdChange(e.target.value.toLowerCase())}
          className={cn(baseInput, "px-8")}
        />
        <p className="text-[9px] text-slate-700 font-bold uppercase tracking-widest px-4">
          First segment of your UUID — e.g. "a1b2c3d4" from a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        </p>
      </div>

      <Button
        disabled={!isLrnComplete || !lastName || !trackingId || loading}
        className="w-full h-16 rounded-[28px] text-white font-black uppercase text-sm tracking-[0.4em] shadow-[0_15px_40px_rgba(59,130,246,0.35)] transition-all active:scale-95 flex items-center justify-center gap-3 group border-none disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #1d4ed8, #2563eb, #3b82f6)" }}
      >
        {loading
          ? <Loader2 className="animate-spin" size={20} />
          : <> Verify Identity <Search size={16} className="group-hover:scale-110 group-hover:rotate-6 transition-transform" /></>
        }
      </Button>
    </form>
  )
}