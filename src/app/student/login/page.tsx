"use client"

import { useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { studentSupabase } from "@/lib/supabase/student-client"
import { resolveTrackingPrefix, generateResetToken } from "@/lib/actions/student-auth"
import { Loader2, LogIn, Eye, EyeOff, GraduationCap, ArrowLeft, Mail, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import Link from "next/link"

function LoginContent() {
  const router = useRouter()
  const [trackingId, setTrackingId] = useState("")
  const [password, setPassword]     = useState("")
  const [showPw, setShowPw]         = useState(false)
  const [loading, setLoading]       = useState(false)

  // Forgot password state
  const [showForgot, setShowForgot]       = useState(false)
  const [forgotId, setForgotId]           = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent]       = useState(false)
  const [showNoEmail, setShowNoEmail]     = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const prefix = trackingId.trim().toLowerCase()

    if (!/^[0-9a-f]{8}$/.test(prefix)) {
      toast.error("Username must be 8 hex characters (e.g. cfc8727b)")
      return
    }

    setLoading(true)
    const { email } = await resolveTrackingPrefix(prefix)

    if (!email) {
      toast.error("No enrolled student found with that username.")
      setLoading(false)
      return
    }

    const { error } = await studentSupabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error("Incorrect username or password.")
      setLoading(false)
      return
    }

    const { data: student } = await studentSupabase.from("students").select("status, account_status").eq("id", (await studentSupabase.auth.getUser()).data.user?.id).single()
    if (student?.account_status === "Deactivated") {
      await studentSupabase.auth.signOut()
      toast.error("Deactivated Account, Contact Admin.")
      setLoading(false)
      return
    }

    router.replace("/student/dashboard")
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const prefix = forgotId.trim().toLowerCase()

    if (!/^[0-9a-f]{8}$/.test(prefix)) {
      toast.error("Tracking ID must be 8 hex characters (e.g. cfc8727b)")
      return
    }

    setForgotLoading(true)
    const result = await generateResetToken(prefix)

    if (!result.success) {
      toast.error(result.error || "Something went wrong.")
      setForgotLoading(false)
      return
    }

    setForgotSent(true)
    setForgotLoading(false)
  }

  return (
    <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">

      {/* Header */}
      <div className="text-center space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-aclc.png" alt="ACLC" className="w-14 h-14 mx-auto object-contain" />
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">
            {showForgot ? "Reset Password" : "Student Login"}
          </h1>
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em] mt-1">
            Student Portal · ACLC Northbay
          </p>
        </div>
      </div>

      <Card className="p-[1px] rounded-[40px] border-none"
        style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(15,23,42,0.8))" }}>
        <div className="bg-slate-950/95 p-8 rounded-[39px] space-y-6">

          {!showForgot ? (
            <>
              {/* ── Login Form ── */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <GraduationCap size={16} className="text-blue-400 shrink-0" />
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                  Sign in with your Tracking ID and the password you created
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2 group">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 group-focus-within:text-blue-400 transition-colors">
                    Username (Tracking ID)
                  </Label>
                  <Input
                    placeholder="e.g. cfc8727b"
                    value={trackingId}
                    onChange={e => setTrackingId(e.target.value.toLowerCase())}
                    className="h-14 rounded-2xl border-white/8 bg-white/[0.03] text-white font-black font-mono tracking-[0.15em] px-5 focus:border-blue-500 transition-all"
                    maxLength={8}
                    required
                    disabled={loading}
                    autoComplete="username"
                    spellCheck={false}
                  />
                  <p className="text-[8px] text-slate-700 uppercase tracking-widest ml-1">
                    First 8 characters of your student ID
                  </p>
                </div>

                <div className="space-y-2 group">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 group-focus-within:text-blue-400 transition-colors">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="h-14 rounded-2xl border-white/8 bg-white/[0.03] text-white font-bold pr-12 px-5 focus:border-blue-500 transition-all"
                      required
                      disabled={loading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password Link */}
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setShowNoEmail(false); setForgotSent(false) }}
                  className="block w-full text-center text-[9px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-[0.2em] transition-colors py-1"
                >
                  Forgot Password?
                </button>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-[20px] text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 transition-all active:scale-95 gap-2 mt-2"
                >
                  {loading
                    ? <Loader2 className="animate-spin" size={18} />
                    : <><LogIn size={16} /> Sign In</>
                  }
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* ── Forgot Password Flow ── */}
              {forgotSent ? (
                /* Success state */
                <div className="space-y-5 animate-in fade-in duration-500">
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                      <Mail size={28} className="text-emerald-400" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm font-black text-white uppercase tracking-widest">Email Sent!</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed max-w-[280px]">
                        A password reset link has been sent to your registered email address. 
                        The link will expire in <strong className="text-white">1 hour</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* No access to email fallback */}
                    {!showNoEmail ? (
                      <button
                        onClick={() => setShowNoEmail(true)}
                        className="block w-full text-center text-[9px] font-bold text-amber-500 hover:text-amber-400 uppercase tracking-[0.2em] transition-colors py-1"
                      >
                        No access to email?
                      </button>
                    ) : (
                      <div className="px-4 py-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-start gap-3">
                          <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">No Other Way</p>
                            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                              There are no other ways of recovering your password remotely. 
                              Please <strong className="text-white">physically visit the admin office</strong> to 
                              verify your identity and request a manual password change.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => { setShowForgot(false); setForgotSent(false); setShowNoEmail(false) }}
                      className="w-full flex items-center justify-center gap-2 h-12 rounded-[16px] border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-white/20 transition-all"
                    >
                      <ArrowLeft size={14} /> Back to Sign In
                    </button>
                  </div>
                </div>
              ) : (
                /* Forgot password form */
                <div className="space-y-5 animate-in fade-in duration-500">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <Mail size={16} className="text-blue-400 shrink-0" />
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                      Enter your tracking ID and we&apos;ll send a reset link to your registered email
                    </p>
                  </div>

                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div className="space-y-2 group">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 group-focus-within:text-blue-400 transition-colors">
                        Username (Tracking ID)
                      </Label>
                      <Input
                        placeholder="e.g. cfc8727b"
                        value={forgotId}
                        onChange={e => setForgotId(e.target.value.toLowerCase())}
                        className="h-14 rounded-2xl border-white/8 bg-white/[0.03] text-white font-black font-mono tracking-[0.15em] px-5 focus:border-blue-500 transition-all"
                        maxLength={8}
                        required
                        disabled={forgotLoading}
                        spellCheck={false}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-[20px] text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 transition-all active:scale-95 gap-2"
                    >
                      {forgotLoading
                        ? <Loader2 className="animate-spin" size={18} />
                        : <><Mail size={16} /> Send Reset Link</>
                      }
                    </Button>
                  </form>

                  {/* No access to email fallback */}
                  {!showNoEmail ? (
                    <button
                      onClick={() => setShowNoEmail(true)}
                      className="block w-full text-center text-[9px] font-bold text-amber-500 hover:text-amber-400 uppercase tracking-[0.2em] transition-colors py-1"
                    >
                      No access to email?
                    </button>
                  ) : (
                    <div className="px-4 py-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-start gap-3">
                        <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">No Other Way</p>
                          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                            There are no other ways of recovering your password remotely. 
                            Please <strong className="text-white">physically visit the admin office</strong> to 
                            verify your identity and request a manual password change.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => { setShowForgot(false); setShowNoEmail(false) }}
                    className="w-full flex items-center justify-center gap-2 h-12 rounded-[16px] border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-white/20 transition-all"
                  >
                    <ArrowLeft size={14} /> Back to Sign In
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      <div className="text-center space-y-3">
        <p className="text-[9px] font-bold text-slate-700 uppercase tracking-[0.3em]">
          No account yet?{" "}
          <Link href="/status" className="text-blue-500 hover:text-blue-400 transition-colors">
            Check your application status first
          </Link>
        </p>
        <Link href="/" className="block text-[9px] font-bold text-slate-800 hover:text-slate-600 uppercase tracking-[0.3em] transition-colors">
          Back to Homepage
        </Link>
      </div>
    </div>
  )
}

export default function StudentLoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-6 pt-16 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-900/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-900/10 rounded-full blur-[160px] pointer-events-none" />
      <Suspense fallback={<Loader2 className="animate-spin text-blue-500 w-10 h-10 mt-32" />}>
        <LoginContent />
      </Suspense>
    </div>
  )
}
