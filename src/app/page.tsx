"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { 
  ArrowRight, 
  GraduationCap, 
  Search, 
  UserPlus, 
  Activity,
  Cpu,
  BookOpen,
  Calendar,
  ChevronRight,
  Lock,
  Zap
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

export default function HomePage() {
  const [config, setConfig] = useState<any>(null)
  const [stats, setStats] = useState({ total: 0, ict: 0, gas: 0 })

  useEffect(() => {
    async function fetchPublicData() {
      const { data: configData } = await supabase.from('system_config').select('*').single()
      setConfig(configData)

      const [totalRes, ictRes, gasRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'Accepted'),
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'Accepted').eq('strand', 'ICT'),
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'Accepted').eq('strand', 'GAS')
      ])
      
      setStats({ 
        total: totalRes.count || 0, 
        ict: ictRes.count || 0, 
        gas: gasRes.count || 0 
      })
    }
    fetchPublicData()
  }, [])

  // --- 300 IQ DYNAMIC LOGIC ENGINE ---
  const isManual = config?.control_mode === 'manual'
  const isPortalActive = config?.is_portal_active
  
  // Final Boolean to decide if the button is clickable
  const isEnrollmentPossible = isPortalActive 

  // Dynamic Text for the Enrollment Window UI
  const getEnrollmentStatusText = () => {
    if (isManual) {
      return isPortalActive ? "Enrollment is Now Open!" : "Enrollment is Closed!"
    }
    
    // Automatic Mode Logic
    if (isPortalActive && config?.enrollment_start && config?.enrollment_end) {
      const start = new Date(config.enrollment_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      const end = new Date(config.enrollment_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      return `${start} — ${end}`
    }

    return "Enrollment is Closed!"
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-slate-900 font-sans selection:bg-blue-100">
      {/* NAVIGATION BAR */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
              <GraduationCap size={24} />
            </div>
            <span className="font-black text-xl tracking-tighter uppercase">ACLC Northbay</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <Link href="#offerings" className="hover:text-blue-600 transition-colors">Strands</Link>
            <Link href="/status" className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 rounded-full hover:bg-slate-100 transition-all text-slate-900">
              <Search size={14} className="text-blue-600" /> Track LRN
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          
          {/* HERO SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest border-none">
                S.Y. {config?.school_year || "2025-2026"} ADMISSIONS
                </Badge>
                <h1 className="text-7xl md:text-8xl font-black tracking-tighter leading-[0.85] uppercase text-slate-900">
                  Build Your <br />
                  <span className="text-blue-600">Future</span> Now.
                </h1>
                <p className="text-xl text-slate-500 font-medium max-w-lg leading-relaxed italic">
                  Secure your slot at AMA ACLC Northbay. Experience specialized tech-education for the modern world.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                {isEnrollmentPossible ? (
                  <Link href="/enroll">
                    <Button className="h-20 px-10 rounded-[28px] bg-slate-900 hover:bg-blue-600 text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-blue-200 transition-all hover:-translate-y-1">
                      Start Application <ArrowRight className="ml-3" />
                    </Button>
                  </Link>
                ) : (
                  <Button disabled className="h-20 px-10 rounded-[28px] bg-slate-100 text-slate-400 font-black uppercase text-xs tracking-widest cursor-not-allowed flex flex-col items-center justify-center leading-none border border-slate-200">
                    <span>Portal Locked</span>
                    <span className="text-[8px] mt-1 opacity-50 uppercase tracking-tighter">Registration Currently Closed</span>
                  </Button>
                )}
                <Link href="/status">
                  <Button variant="outline" className="h-20 px-10 rounded-[28px] border-slate-200 font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all">
                    Track My LRN
                  </Button>
                </Link>
              </div>

              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-4">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-slate-200 overflow-hidden shadow-sm">
                      <img src={`https://i.pravatar.cc/150?u=${i + 10}`} alt="user" />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span className="text-slate-900 font-black">{stats.total}</span> Confirmed Enrollees
                </p>
              </div>
            </div>

            {/* STATUS CARD */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/10 to-indigo-600/10 blur-3xl rounded-[60px]" />
              <Card className="relative p-10 rounded-[60px] border-none shadow-2xl bg-white space-y-10 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">System Matrix</h3>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${isEnrollmentPossible ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    <div className={`w-2 h-2 rounded-full ${isEnrollmentPossible ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    {isEnrollmentPossible ? 'Portal Live' : 'Portal Offline'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <Metric label="ICT Matrix" value={stats.ict} icon={<Cpu className="text-blue-500"/>} />
                  <Metric label="GAS Matrix" value={stats.gas} icon={<BookOpen className="text-orange-500"/>} />
                </div>

                <div className="space-y-6 pt-6 border-t border-slate-50">
                   <div className="flex items-center gap-4">
                     <div className={`p-4 rounded-2xl ${isEnrollmentPossible ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                       {isManual ? <Zap size={20} /> : <Calendar size={20}/>}
                     </div>
                     <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                         {isManual ? "Direct Matrix Access" : "Enrollment Window"}
                       </p>
                       <p className={`text-sm font-black uppercase tracking-tighter ${isEnrollmentPossible ? 'text-slate-900' : 'text-red-500'}`}>
                         {getEnrollmentStatusText()}
                       </p>
                     </div>
                   </div>
                </div>

                {/* VISUAL DECORATION */}
                <div className="absolute -bottom-10 -right-10 opacity-[0.03] rotate-12">
                   <GraduationCap size={200} />
                </div>
              </Card>
            </div>
          </div>

          {/* STRANDS */}
          <div id="offerings" className="pt-20 space-y-12">
            <div className="text-center space-y-2">
              <Badge variant="outline" className="uppercase font-black text-[9px] tracking-[0.3em] border-slate-200 text-slate-400">Curriculum Matrix</Badge>
              <h2 className="text-4xl font-black uppercase tracking-tighter">Specialized Strands</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <StrandCard 
                title="ICT" 
                fullName="Information & Communication Tech" 
                desc="Programming, Web Dev, and Graphics. Built for the future of tech."
                color="blue"
                icon={<Cpu size={32}/>}
              />
              <StrandCard 
                title="GAS" 
                fullName="General Academic Strand" 
                desc="A diverse pathway preparing you for multiple collegiate success stories."
                color="orange"
                icon={<BookOpen size={32}/>}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-100 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 grayscale opacity-30">
            <GraduationCap size={24} />
            <span className="font-black text-lg tracking-tighter uppercase">ACLC Northbay</span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
            © 2025 Education Management System
          </p>
        </div>
      </footer>
    </div>
  )
}

function Metric({ label, value, icon }: any) {
  return (
    <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100/50 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-4 relative z-10">
        {icon}
        <Activity size={14} className="text-slate-200 group-hover:text-blue-400 transition-colors" />
      </div>
      <p className="text-3xl font-black text-slate-900 leading-none relative z-10">{value}</p>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 relative z-10">{label}</p>
    </div>
  )
}

function StrandCard({ title, fullName, desc, color, icon }: any) {
  const colors: any = {
    blue: "bg-blue-600 text-white shadow-blue-100",
    orange: "bg-orange-600 text-white shadow-orange-100"
  }
  return (
    <div className="group bg-white p-10 rounded-[48px] border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
      <div className={`w-16 h-16 rounded-[24px] ${colors[color]} flex items-center justify-center mb-8 shadow-2xl`}>
        {icon}
      </div>
      <h3 className="text-4xl font-black uppercase tracking-tighter mb-2">{title}</h3>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{fullName}</p>
      <p className="text-slate-500 font-medium leading-relaxed mb-8">{desc}</p>
      <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-900 group-hover:gap-4 transition-all cursor-pointer">
        Explore Pathway <ChevronRight size={14} />
      </div>
    </div>
  )
}