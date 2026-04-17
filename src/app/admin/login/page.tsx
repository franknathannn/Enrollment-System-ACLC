"use client"

import { useState, useEffect, memo, useRef, Suspense } from "react"
import { supabase } from "@/lib/supabase/admin-client"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { Lock, Loader2, GraduationCap, ShieldCheck, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { TurnstileWidget } from "@/components/TurnstileWidget"
import { verifyTurnstile, checkAdminEmail } from "@/lib/actions/turnstile"

// --- OPTIMIZED CONSTELLATION ENGINE ---
const LoginConstellation = memo(function LoginConstellation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number }[]>([]);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 });
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const PARTICLE_COUNT = 50;
    const CONNECTION_DISTANCE = 100;
    const MOUSE_DISTANCE = 150;

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.2 + 0.8
      }));
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const isDarkMode = document.documentElement.classList.contains('dark');
      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.fillStyle = isDarkMode ? "rgba(59, 130, 246, 0.35)" : "rgba(148, 163, 184, 0.35)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        const dxMouse = p.x - mouse.x;
        const dyMouse = p.y - mouse.y;
        const distMouseSq = dxMouse * dxMouse + dyMouse * dyMouse;
        const maxDistSq = MOUSE_DISTANCE * MOUSE_DISTANCE;

        if (distMouseSq < maxDistSq) {
          const distMouse = Math.sqrt(distMouseSq);
          ctx.strokeStyle = isDarkMode 
            ? `rgba(59, 130, 246, ${0.35 * (1 - distMouse / MOUSE_DISTANCE)})` 
            : `rgba(37, 99, 235, ${0.25 * (1 - distMouse / MOUSE_DISTANCE)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }

        if (i % 2 === 0) {
          for (let j = i + 1; j < Math.min(i + 5, particles.length); j++) {
            const p2 = particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const distSq = dx * dx + dy * dy;
            const maxConnDistSq = CONNECTION_DISTANCE * CONNECTION_DISTANCE;
            
            if (distSq < maxConnDistSq) {
              ctx.strokeStyle = isDarkMode ? "rgba(59, 130, 246, 0.12)" : "rgba(148, 163, 184, 0.12)";
              ctx.lineWidth = 0.3;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      });
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    init();
    animate();
    
    window.addEventListener("resize", init);
    window.addEventListener("mousemove", handleMouseMove);
    
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener("resize", init);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
});

// SUB-COMPONENT: To handle search parameters safely inside Suspense
function LoginContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [turnstileKey, setTurnstileKey] = useState(0)
  const searchParams = useSearchParams()
  const MAX_ATTEMPTS = 5

  const raw = searchParams.get('redirect') || ''
  const redirectTo = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/admin/dashboard'
  
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.height = '100%'
    document.body.style.height = '100%'
    
    const style = document.createElement('style')
    style.textContent = `
      ::-webkit-scrollbar {
        display: none;
      }
    `
    document.head.appendChild(style)

    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      document.documentElement.style.height = ''
      document.body.style.height = ''
      document.head.removeChild(style)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (failedAttempts >= MAX_ATTEMPTS) return

    const trimmedEmail = email.toLowerCase().trim()

    const authorized = await checkAdminEmail(trimmedEmail)
    if (!authorized) {
      toast.error("This email is not authorized to access the admin panel.", {
        duration: 3000,
        style: { fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }
      })
      return
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.", {
        duration: 3000,
        style: { fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }
      })
      return
    }

    if (!turnstileToken) {
      toast.error("Please complete the security check first.", {
        duration: 3000,
        style: { fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }
      })
      return
    }

    setLoading(true)
    const toastId = toast.loading("Signing in...", {
      style: { fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }
    })

    const isHuman = await verifyTurnstile(turnstileToken)
    if (!isHuman) {
      toast.error("Security check failed. Please refresh and try again.", {
        id: toastId,
        style: { fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }
      })
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      if (error) {
        setFailedAttempts(prev => prev + 1)
        setTurnstileToken(null)
        setTurnstileKey(k => k + 1)
        toast.error("Incorrect email or password.", {
          id: toastId,
          style: { fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }
        })
        setLoading(false)
      } else {
        toast.success("Signed in. Redirecting...", {
          id: toastId,
          duration: 1000,
          style: { fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }
        })
        window.location.href = redirectTo
      }
    } catch (err: any) {
      toast.error("Connection error. Check your network.", {
        id: toastId,
        style: { fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }
      })
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
           <span className="font-black text-2xl tracking-tighter uppercase text-slate-900 dark:text-white leading-none italic">ACLC Northbay</span>
           <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold tracking-[0.4em] text-blue-600 dark:text-blue-400 uppercase">Admin Portal</span>
            <div className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />
           </div>
        </div>
      </div>

      <Card className="max-w-md w-full p-10 rounded-[48px] border border-slate-100 dark:border-white/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-2xl relative z-10 transition-all duration-500 hover:shadow-blue-500/5">
        <div className="space-y-2 mb-10 text-center">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-100 dark:border-white/5 transition-transform hover:rotate-6">
             <Lock className="w-8 h-8 text-slate-900 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Admin Login</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2 group">
            <Label htmlFor="email" className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-4 tracking-widest group-focus-within:text-blue-500 transition-colors">Email</Label>
            <Input 
              id="email"
              type="email" 
              placeholder="registrar@matrix.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 rounded-2xl border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white font-bold focus:border-blue-600 px-6 transition-all focus:scale-[1.02]"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2 group">
            <Label htmlFor="password" className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-4 tracking-widest group-focus-within:text-blue-500 transition-colors">Password</Label>
            <Input 
              id="password"
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 rounded-2xl border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white font-bold focus:border-blue-600 px-6 transition-all focus:scale-[1.02]"
              required
              disabled={loading}
            />
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

          <Button
            type="submit"
            disabled={loading || failedAttempts >= MAX_ATTEMPTS}
            className="w-full h-16 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] gap-3 shadow-2xl transition-all active:scale-95 group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Sign In
                <ShieldCheck size={18} className="group-hover:rotate-12 transition-transform" />
              </>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
          </Button>
        </form>
      </Card>
      
      <div className="mt-12 flex flex-col items-center gap-4 relative z-10">
        <div className="h-px w-20 bg-slate-200 dark:bg-slate-800" />
        <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-[0.5em] font-black italic">
          Registrar • ACLC Northbay
        </p>
      </div>
    </div>
  )
}

// MAIN EXPORT: The page entry point with Suspense boundary
export default function AdminLoginPage() {
  return (
    <Suspense fallback={
        <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
    }>
      <LoginContent />
    </Suspense>
  )
}