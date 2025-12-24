"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { Lock, Loader2, GraduationCap, ShieldCheck, Sparkles } from "lucide-react"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Authorized Registry
  const AUTHORIZED_EMAILS = [
    "adminaclc@edu.ph",
    "admissionoffice@gmail.com",
    "franknathan12@gmail.com"
  ]

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!AUTHORIZED_EMAILS.includes(email.toLowerCase().trim())) {
      toast.error("Unauthorized: Identity not found in Admin Registry.")
      return
    }

    setLoading(true)
    const toastId = toast.loading("Authenticating credentials...")

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        toast.error("Access Denied: Invalid Security Key.", { id: toastId })
        setLoading(false)
      } else {
        toast.success("Identity Confirmed. Accessing Matrix...", { id: toastId })
        router.refresh() // Refresh to update middleware state
        router.push("/admin/applicants") 
      }
    } catch (err) {
      toast.error("Connection Interrupted.", { id: toastId })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle White-Theme Accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[100px]" />
      
      <div className="flex items-center gap-3 mb-10 relative z-10">
        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl">
           <GraduationCap className="w-7 h-7 text-white" />
        </div>
        <div className="flex flex-col">
           <span className="font-black text-2xl tracking-tighter uppercase text-slate-900 leading-none">ACLC Northbay</span>
           <span className="text-[10px] font-bold tracking-[0.4em] text-blue-600 uppercase mt-1">Admin Portal</span>
        </div>
      </div>

      <Card className="max-w-md w-full p-10 rounded-[48px] border border-slate-100 bg-white shadow-2xl shadow-slate-200 relative z-10">
        <div className="space-y-2 mb-10 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-100">
             <Lock className="w-8 h-8 text-slate-900" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">System Entry</h1>
          <p className="text-sm text-slate-500 font-medium italic">Verify Administrator Identity</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Admin Email</Label>
            <Input 
              id="email"
              type="email" 
              placeholder="registrar@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 text-slate-900 font-bold focus:ring-blue-600 px-6 transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Security Key</Label>
            <Input 
              id="password"
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 text-slate-900 font-bold focus:ring-blue-600 px-6 transition-all"
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-16 bg-slate-900 hover:bg-black text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] gap-3 shadow-xl transition-all active:scale-95 group"
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              <>Verify Access <ShieldCheck size={16} /></>
            )}
          </Button>
        </form>
      </Card>
      
      <p className="mt-12 text-slate-400 text-[9px] uppercase tracking-[0.5em] font-black relative z-10">
        Registry Control Unit • Northbay
      </p>
    </div>
  )
}