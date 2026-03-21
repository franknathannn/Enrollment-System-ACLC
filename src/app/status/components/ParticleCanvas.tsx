// app/status/components/ParticleCanvas.tsx
"use client"

import { useRef, useEffect } from "react"

export function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    let particles: { x: number; y: number; sx: number; sy: number; size: number }[] = []
    let raf: number

    const init = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      particles = Array.from({ length: 100 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5,
        sx: (Math.random() - 0.5) * 0.15,
        sy: (Math.random() - 0.5) * 0.15,
      }))
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = "rgba(255,255,255,0.18)"
      particles.forEach(p => {
        p.x += p.sx; p.y += p.sy
        if (p.x < 0) p.x = canvas.width;  if (p.x > canvas.width)  p.x = 0
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
      })
      raf = requestAnimationFrame(animate)
    }

    init(); animate()
    window.addEventListener("resize", init)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", init) }
  }, [])

  return <canvas ref={ref} className="absolute inset-0 pointer-events-none z-0" />
}