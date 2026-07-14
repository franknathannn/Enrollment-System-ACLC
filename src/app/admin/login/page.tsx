"use client"

import { useState, useEffect, memo, useRef, Suspense } from "react"
import { supabase } from "@/lib/supabase/admin-client"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, GraduationCap, ShieldCheck, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { TurnstileWidget } from "@/components/TurnstileWidget"
import { verifyTurnstile, checkAdminEmail } from "@/lib/actions/turnstile"
import { useThemeStore } from "@/store/useThemeStore"

import { LoginConstellation } from "@/components/LoginConstellation"

// SUB-COMPONENT: To handle search parameters safely inside Suspense
function LoginContent() {
  const { isDark: isDarkMode } = useThemeStore()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [turnstileKey, setTurnstileKey] = useState(0)
  const searchParams = useSearchParams()
  const MAX_ATTEMPTS = 5

  const panelClass = isDarkMode ? "bg-slate-950/95" : "bg-white"
  const headingClass = isDarkMode ? "text-white" : "text-slate-900"
  const mutedClass = isDarkMode ? "text-slate-500" : "text-slate-600"
  const inputClass = isDarkMode
    ? "border-white/8 bg-white/[0.03] text-white"
    : "border-slate-300 bg-slate-50 text-slate-900"

  const raw = searchParams.get('redirect') || ''
  const redirectTo = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/admin/dashboard'

  useEffect(() => {
    let isMounted = true

    const normalizeAuthState = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (!isMounted) return

      if (error && (error as { code?: string }).code === 'refresh_token_not_found') {
        await supabase.auth.signOut({ scope: 'local' })
        return
      }

      if (data.user) {
        router.replace(redirectTo)
      }
    }

    normalizeAuthState()
    return () => { isMounted = false }
  }, [redirectTo, router])

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

    // Safety net: if login takes longer than 15s, unblock the UI
    const loginTimeout = setTimeout(() => {
      setLoading(false)
      toast.error("Login is taking too long. Please check your connection and try again.", {
        id: toastId,
        style: { fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }
      })
    }, 15000)

    const isHuman = await verifyTurnstile(turnstileToken)
    if (!isHuman) {
      clearTimeout(loginTimeout)
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

      clearTimeout(loginTimeout)

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
        // Fallback: clear loading if navigation takes too long (e.g. cold start)
        setTimeout(() => setLoading(false), 5000)
        window.location.href = redirectTo
      }
    } catch (err: any) {
      clearTimeout(loginTimeout)
      toast.error("Connection error. Check your network.", {
        id: toastId,
        style: { fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }
      })
      setLoading(false)
    }
  }

  return (
    <div className={cn("min-h-screen w-full flex flex-col items-center justify-center p-6 py-12 relative overflow-hidden transition-colors duration-500", isDarkMode ? "bg-slate-950" : "bg-slate-50")}>
      {/* Back to Dashboard */}
      <Link
        href="/"
        className={cn("absolute top-5 left-5 z-20 flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all duration-200 bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm", isDarkMode ? "text-slate-400" : "text-slate-600", isDarkMode ? "border-slate-700" : "border-slate-200", isDarkMode ? "bg-slate-900/80" : "", isDarkMode ? "hover:bg-slate-800" : "", isDarkMode ? "hover:text-white" : "hover:text-slate-800")}
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
          className={cn("w-[70vmin] h-[70vmin] max-w-[600px] max-h-[600px] object-contain select-none", isDarkMode ? "opacity-[0.08]" : "opacity-[0.12]")}
          draggable={false}
        />
      </div>
      <div className={cn("absolute inset-0 backdrop-blur-[60px] pointer-events-none z-[1]", isDarkMode ? "bg-slate-950/70" : "bg-slate-50/60")} />

      <LoginConstellation />

      <div className={cn("absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] pointer-events-none", isDarkMode ? "bg-blue-900/10" : "bg-blue-100/50")} />
      <div className={cn("absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] rounded-full blur-[100px] pointer-events-none", isDarkMode ? "bg-indigo-900/10" : "bg-indigo-100/30")} />



      <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <img src="/logo-aclc.png" alt="ACLC" className="w-14 h-14 mx-auto object-contain" />
          <div>
            <h1 className={cn("text-2xl font-black uppercase tracking-tight", headingClass)}>
              Admin Login
            </h1>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em] mt-1">
              Admin Portal · ACLC Northbay
            </p>
          </div>
        </div>

        <Card className="p-[1px] rounded-[40px] border-none"
          style={{ background: isDarkMode ? "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(15,23,42,0.8))" : "linear-gradient(135deg, rgba(59,130,246,0.22), rgba(148,163,184,0.35))" }}>
          <div className={cn("p-8 rounded-[39px] space-y-6", panelClass)}>
            
            <div className={cn("flex items-center gap-3 px-4 py-3 rounded-2xl border", isDarkMode ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200")}>
              <img
                src="/logo-aclc.png"
                alt="ACLC Logo"
                className="w-4 h-4 object-contain shrink-0"
                draggable={false}
              />
              <p className={cn("text-[9px] font-bold uppercase tracking-widest leading-relaxed", mutedClass)}>
                Sign in with your administrator email and password
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2 group">
                <Label htmlFor="email" className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 group-focus-within:text-blue-400 transition-colors">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="registrar@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn("h-14 rounded-2xl font-bold px-5 focus:border-blue-500 transition-all", inputClass)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2 group">
                <Label htmlFor="password" className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 group-focus-within:text-blue-400 transition-colors">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn("h-14 rounded-2xl font-bold px-5 focus:border-blue-500 transition-all", inputClass)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="flex justify-center my-4">
                <div className={cn("rounded-2xl border shadow-sm px-3 py-2", isDarkMode ? "bg-slate-900/50 border-white/10" : "bg-white border-slate-100")}>
                  <TurnstileWidget key={`${turnstileKey}-${isDarkMode ? 'dark' : 'light'}`} onVerify={setTurnstileToken} onExpire={() => { setTurnstileToken(null); setTurnstileKey(k => k + 1) }} theme={isDarkMode ? "dark" : "light"} />
                </div>
              </div>

              {failedAttempts > 0 && (
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest ${failedAttempts >= MAX_ATTEMPTS
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50'
                  }`}>
                  <span className="text-base leading-none">⚠</span>
                  {failedAttempts >= MAX_ATTEMPTS
                    ? 'Too many failed attempts. Please wait.'
                    : `${failedAttempts} of ${MAX_ATTEMPTS} attempts used`
                  }
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || failedAttempts >= MAX_ATTEMPTS}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-[20px] text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 transition-all active:scale-95 gap-2 mt-2"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <ShieldCheck size={16} /> Sign In
                  </>
                )}
              </Button>
            </form>
          </div>
        </Card>
        
        {/* Footer */}
        <div className="mt-8 flex flex-col items-center gap-4 z-10 w-full relative">
          <div className={cn("h-px w-20", isDarkMode ? "bg-slate-800" : "bg-slate-200")} />
          <p className={cn("text-[9px] uppercase tracking-[0.5em] font-black italic", isDarkMode ? "text-slate-500" : "text-slate-400")}>
            Registrar • ACLC Northbay
          </p>
        </div>
      </div>
    </div>
  )
}

// MAIN EXPORT: The page entry point with Suspense boundary
export default function AdminLoginPage() {
  const { isDark: isDarkMode } = useThemeStore()
  return (
    <Suspense fallback={
      <div className={cn("h-screen w-full flex items-center justify-center", isDarkMode ? "bg-slate-950" : "bg-slate-50")}>
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}