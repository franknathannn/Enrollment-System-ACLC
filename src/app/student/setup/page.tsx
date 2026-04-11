"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { studentSupabase } from "@/lib/supabase/student-client"
import { createStudentAccount, getStudentSetupData } from "@/lib/actions/student-auth"
import { Loader2, Eye, EyeOff, ShieldCheck, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import Link from "next/link"

function SetupContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const studentId = searchParams.get("id") || ""

  const [student, setStudent] = useState<{
    id: string; first_name: string; last_name: string; lrn: string
  } | null>(null)
  const [loading, setLoading]     = useState(true)
  const [password, setPassword]   = useState("")
  const [confirm, setConfirm]     = useState("")
  const [showPw, setShowPw]       = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // First segment of the UUID is the tracking prefix shown as username
  const trackingPrefix = studentId ? studentId.split("-")[0] : ""

  useEffect(() => {
    if (!studentId) { router.replace("/status"); return }

    getStudentSetupData(studentId).then(data => {
      if (
        !data ||
        (data.status !== "Accepted" && data.status !== "Approved") ||
        data.is_archived
      ) {
        router.replace("/status")
        return
      }
      setStudent(data)
      setLoading(false)
    })
  }, [studentId, router])

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
    const result = await createStudentAccount(studentId, password)

    if (result.error === "account_exists") {
      toast.error("Account already exists. Redirecting to login…")
      setTimeout(() => router.replace("/student/login"), 1500)
      return
    }

    if (result.error) {
      setFormError(result.error)
      setSubmitting(false)
      return
    }

    // Sign in immediately after creation
    const { error: signInError } = await studentSupabase.auth.signInWithPassword({
      email: `${studentId}@student.portal`,
      password,
    })

    if (signInError) {
      toast.error("Account created. Please sign in.")
      router.replace("/student/login")
      return
    }

    router.replace("/student/dashboard?welcome=true")
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center gap-4 mt-32">
      <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 animate-pulse">Verifying…</p>
    </div>
  )

  if (!student) return null

  return (
    <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">

      {/* Header */}
      <div className="text-center space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-aclc.png" alt="ACLC" className="w-14 h-14 mx-auto object-contain" />
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">Create Your Account</h1>
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em] mt-1">
            Student Portal · ACLC Northbay
          </p>
        </div>
      </div>

      {/* Student identity chip */}
      <div className="flex items-center gap-3 px-5 py-4 rounded-[24px] border border-white/8 bg-white/[0.02]">
        <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
          <GraduationCap size={18} className="text-blue-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-white uppercase truncate">
            {student.first_name} {student.last_name}
          </p>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            LRN: {student.lrn}
          </p>
        </div>
      </div>

      {/* Card */}
      <Card className="p-[1px] rounded-[40px] border-none"
        style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(15,23,42,0.8))" }}>
        <div className="bg-slate-950/95 p-8 rounded-[39px] space-y-6">

          {/* Username (read-only) */}
          <div className="space-y-1.5">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">
              Your Username
            </p>
            <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/8">
              <span className="text-xl font-black text-white font-mono tracking-[0.15em]">
                {trackingPrefix}
              </span>
              <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">
                Auto-assigned
              </span>
            </div>
            <p className="text-[8px] text-slate-700 uppercase tracking-widest ml-1">
              First 8 characters of your student ID
            </p>
          </div>

          {/* Password form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 group">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 group-focus-within:text-blue-400 transition-colors">
                Password
              </Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-14 rounded-2xl border-white/8 bg-white/[0.03] text-white font-bold pr-12 px-5 focus:border-blue-500 transition-all"
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
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 group-focus-within:text-blue-400 transition-colors">
                Confirm Password
              </Label>
              <Input
                type="password"
                placeholder="Repeat your password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="h-14 rounded-2xl border-white/8 bg-white/[0.03] text-white font-bold px-5 focus:border-blue-500 transition-all"
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
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-[20px] text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 transition-all active:scale-95 gap-2"
            >
              {submitting
                ? <Loader2 className="animate-spin" size={18} />
                : <><ShieldCheck size={16} /> Create Account</>
              }
            </Button>
          </form>
        </div>
      </Card>

      <p className="text-center text-[9px] font-bold text-slate-700 uppercase tracking-[0.3em]">
        Already have an account?{" "}
        <Link href="/student/login" className="text-blue-500 hover:text-blue-400 transition-colors">
          Sign In
        </Link>
      </p>
    </div>
  )
}

export default function StudentSetupPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-6 pt-16 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-900/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-900/10 rounded-full blur-[160px] pointer-events-none" />
      <Suspense fallback={
        <div className="flex items-center justify-center gap-4 mt-32">
          <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
        </div>
      }>
        <SetupContent />
      </Suspense>
    </div>
  )
}
