"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { validateToken, resetStudentPassword, getStudentSetupData } from "@/lib/actions/student-auth"
import { Loader2, Eye, EyeOff, ShieldCheck, ShieldAlert, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import Link from "next/link"

function ResetContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token") || ""

  const [loading, setLoading]       = useState(true)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [studentName, setStudentName] = useState("")
  const [password, setPassword]     = useState("")
  const [confirm, setConfirm]       = useState("")
  const [showPw, setShowPw]         = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setTokenError("No reset link provided. Please use the link from your email.")
      setLoading(false)
      return
    }

    const verify = async () => {
      const result = await validateToken(token)
      if (!result.valid || result.type !== "reset") {
        setTokenError(result.error || "This reset link is invalid or has expired.")
        setLoading(false)
        return
      }

      // Get student name for display
      const data = await getStudentSetupData(result.studentId!)
      if (data) {
        setStudentName(`${data.first_name} ${data.last_name}`)
      }

      setLoading(false)
    }
    verify()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setFormError("Passwords do not match.")
      return
    }

    setSubmitting(true)
    const result = await resetStudentPassword(token, password)

    if (!result.success) {
      setFormError(result.error || "Failed to reset password.")
      setSubmitting(false)
      return
    }

    toast.success("Password reset successfully! Please sign in with your new password.")
    router.replace("/student/login")
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center gap-4 mt-32">
      <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 animate-pulse">Verifying link…</p>
    </div>
  )

  if (tokenError) return (
    <div className="max-w-md w-full space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">
      <div className="text-center space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-aclc.png" alt="ACLC" className="w-14 h-14 mx-auto object-contain" />
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">Invalid Link</h1>
      </div>
      <Card className="p-[1px] rounded-[40px] border-none" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.3), rgba(15,23,42,0.8))" }}>
        <div className="bg-slate-950/95 p-8 rounded-[39px] space-y-5">
          <div className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-red-500/5 border border-red-500/20">
            <ShieldAlert size={20} className="text-red-400 shrink-0" />
            <p className="text-[11px] font-bold text-red-300 leading-relaxed">{tokenError}</p>
          </div>
          <p className="text-[10px] text-slate-500 text-center leading-relaxed">
            Reset links expire after 1 hour and can only be used once. You can request a new one from the login page.
          </p>
          <Link
            href="/student/login"
            className="flex items-center justify-center h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all w-full"
          >
            Back to Login
          </Link>
        </div>
      </Card>
    </div>
  )

  return (
    <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">

      {/* Header */}
      <div className="text-center space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-aclc.png" alt="ACLC" className="w-14 h-14 mx-auto object-contain" />
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">Reset Password</h1>
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em] mt-1">
            Student Portal · ACLC Northbay
          </p>
        </div>
      </div>

      {/* Student identity */}
      {studentName && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-[24px] border border-white/8 bg-white/[0.02]">
          <div className="w-10 h-10 rounded-full bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <KeyRound size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-black text-white uppercase truncate">{studentName}</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              Create a new password below
            </p>
          </div>
        </div>
      )}

      {/* Card */}
      <Card className="p-[1px] rounded-[40px] border-none"
        style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.3), rgba(15,23,42,0.8))" }}>
        <div className="bg-slate-950/95 p-8 rounded-[39px] space-y-6">

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 group">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 group-focus-within:text-amber-400 transition-colors">
                New Password
              </Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-14 rounded-2xl border-white/8 bg-white/[0.03] text-white font-bold pr-12 px-5 focus:border-amber-500 transition-all"
                  required
                  disabled={submitting}
                  autoComplete="new-password"
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

            <div className="space-y-2 group">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 group-focus-within:text-amber-400 transition-colors">
                Confirm New Password
              </Label>
              <Input
                type="password"
                placeholder="Repeat your new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="h-14 rounded-2xl border-white/8 bg-white/[0.03] text-white font-bold px-5 focus:border-amber-500 transition-all"
                required
                disabled={submitting}
                autoComplete="new-password"
              />
            </div>

            {formError && (
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest px-1">
                {formError}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-[20px] text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-amber-500/20 transition-all active:scale-95 gap-2"
            >
              {submitting
                ? <Loader2 className="animate-spin" size={18} />
                : <><ShieldCheck size={16} /> Reset Password</>
              }
            </Button>
          </form>
        </div>
      </Card>

      <p className="text-center text-[9px] font-bold text-slate-700 uppercase tracking-[0.3em]">
        Remember your password?{" "}
        <Link href="/student/login" className="text-blue-500 hover:text-blue-400 transition-colors">
          Sign In
        </Link>
      </p>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-6 pt-16 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-amber-900/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-900/10 rounded-full blur-[160px] pointer-events-none" />
      <Suspense fallback={
        <div className="flex items-center justify-center gap-4 mt-32">
          <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
        </div>
      }>
        <ResetContent />
      </Suspense>
    </div>
  )
}
