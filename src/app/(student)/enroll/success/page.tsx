"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  CheckCircle2, ArrowRight, Home, Search, GraduationCap, 
  Sparkles, Building2, ShieldCheck, BadgeCheck, Loader2, Orbit, Download 
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
// 1. IMPORT THE NEW LIBRARY
import { toPng } from 'html-to-image'

// --- 1. CONTENT COMPONENT ---
function SuccessContent() {
  const searchParams = useSearchParams()
  const fullId = searchParams.get('id') || ""
  const shortId = fullId ? fullId.split('-')[0] : "-----------"

  const [studentData, setStudentData] = useState<{ lastName: string | null; lrn: string }>({
    lastName: null,
    lrn: searchParams.get('lrn') || "-----------"
  })
  const [isLoading, setIsLoading] = useState(true)
  
  // REFS
  const heroCanvasRef = useRef<HTMLCanvasElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!fullId || !uuidRegex.test(fullId)) {
      setIsLoading(false)
      return
    }

    const fetchStudentData = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('students')
          .select('last_name, lrn')
          .eq('id', fullId)
          .maybeSingle()

        if (error) throw error
        if (data) {
          setStudentData({ lastName: data.last_name, lrn: data.lrn })
        }
      } catch (error) {
        console.error("Error fetching student data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStudentData()
  }, [fullId])

  useEffect(() => {
    const canvas = heroCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    let particles: { x: number; y: number; vx: number; vy: number; size: number }[] = [];
    const mouse = { x: -1000, y: -1000 };

    const init = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      particles = [];
      for (let i = 0; i < 70; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 2 + 0.5
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.fillStyle = `rgba(96, 165, 250, ${p.size / 4})`;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          ctx.beginPath();
          ctx.lineWidth = 0.6;
          ctx.strokeStyle = `rgba(59, 130, 246, ${1 - dist / 180})`;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      });
      requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    window.addEventListener("resize", init);
    canvas.addEventListener("mousemove", handleMouseMove);
    init(); animate();

    return () => {
      window.removeEventListener("resize", init);
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // --- 2. UPDATED DOWNLOAD FUNCTION ---
  // Uses html-to-image which supports modern CSS colors like oklab
  const handleDownloadImage = async () => {
    if (!cardRef.current) return;

    try {
      const dataUrl = await toPng(cardRef.current, { 
        cacheBust: true, 
        backgroundColor: '#020617', // Force dark background (Slate-950)
        pixelRatio: 2 // High resolution
      });
      
      const link = document.createElement('a');
      link.download = `Enrollment-Slip-${studentData.lastName || 'Student'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate PNG:', err);
    }
  };

  return (
    <div className="max-w-2xl w-full space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 relative z-10 text-center p-4">
      
      {/* Local Interactive Nova Overlay */}
      <canvas ref={heroCanvasRef} className="absolute inset-0 pointer-events-none z-0 opacity-60" />

      {/* Success Nova Icon Cluster */}
      <div className="relative inline-block z-10">
        <div className="absolute inset-0 bg-blue-500/30 blur-[60px] animate-pulse" />
        <div className="w-28 h-28 bg-slate-900/90 rounded-[44px] shadow-[0_0_50px_rgba(59,130,246,0.3)] flex items-center justify-center border border-blue-500/20 relative backdrop-blur-2xl">
           <CheckCircle2 size={56} className="text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
           <Orbit size={130} className="absolute text-blue-800/20 animate-spin-slow" />
        </div>
        <div className="absolute -top-2 -right-2 w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl animate-bounce-slow">
           <Sparkles size={22} />
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.6em] animate-pulse">Student Enrolled • Pending</p>
        <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none italic">
          Welcome to the <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-blue-400 pr-2">Future</span>, {isLoading ? '...' : studentData.lastName ? `Student ${studentData.lastName}` : "Student"}.
        </h1>
        <p className="text-slate-500 font-medium italic text-lg leading-relaxed max-w-md mx-auto">
          Your digital application have been successfully saved into the ACLC Northbay applicants list.
        </p>
      </div>

      {/* Cyber Dossier Card - Attached Ref Here */}
      <Card ref={cardRef} className="p-1 rounded-[56px] border-none bg-gradient-to-br from-blue-500/20 to-transparent shadow-2xl text-left relative overflow-hidden group z-10 backdrop-blur-3xl">
        <div className="bg-slate-950/80 rounded-[52px] p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity duration-1000 rotate-12 group-hover:scale-110 transition-transform">
                <GraduationCap size={180} className="text-blue-400" />
            </div>
            
            <div className="space-y-8 relative z-10">
                <div className="flex justify-between items-start border-b border-white/5 pb-8">
                    <div>
                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em]">Student Status</p>
                        <div className="flex items-center gap-4 mt-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] animate-pulse" />
                            <h3 className="text-2xl font-black uppercase text-white tracking-tight">Student Pending</h3>
                        </div>
                    </div>
                    <BadgeCheck size={40} className="text-blue-400" />
                </div>

                <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Last Name</p>
                        <p className="text-xl font-black text-white tracking-tighter italic">{isLoading ? <Loader2 size={16} className="animate-spin" /> : (studentData.lastName || "-----------")}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Student LRN</p>
                        <p className="text-xl font-mono font-black text-blue-100 tracking-[0.2em]">{isLoading ? <Loader2 size={16} className="animate-spin" /> : studentData.lrn}</p>
                    </div>
                    <div className="col-span-2 space-y-1">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Tracking ID</p>
                        <p className="text-sm md:text-base font-mono font-bold text-blue-400 break-all">{shortId}</p>
                    </div>
                </div>
            </div>
        </div>
      </Card>

      {/* Cyber-Etched Ethos Section */}
      <div className="relative z-10 p-8 rounded-[48px] bg-white/5 border border-white/5 backdrop-blur-sm overflow-hidden group hover:bg-white/[0.07] transition-all duration-700">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:30px_30px]" />
          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-4 justify-center">
                <Building2 className="text-blue-500 animate-pulse" size={28} />
                <h3 className="text-xl font-black text-white uppercase tracking-[0.2em]">AMA ACLC NORTHBAY CAMPUS</h3>
            </div>
            <p className="text-base text-blue-100/60 font-medium leading-relaxed italic px-8">
            "Please wait until we verify your enrollment data."
            </p>
            <div className="flex flex-col items-center gap-3 justify-center text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">
                <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-blue-600" /> Check after 48 hours.</div>
                <p className="text-blue-400 animate-pulse">PLEASE SCREENSHOT THIS PAGE FOR YOUR TRACKING ID</p>
            </div>
          </div>
      </div>

      {/* Action Matrix */}
      <div className="flex flex-col sm:flex-row gap-6 pt-4 relative z-10 print:hidden">
        <Link href="/" className="flex-1">
          <Button variant="ghost" className="w-full h-20 rounded-[32px] font-black uppercase text-[11px] tracking-[0.4em] text-slate-500 hover:text-white hover:bg-white/5 border border-white/5 transition-all">
            <Home className="mr-3 opacity-50" size={18}/> Return Home
          </Button>
        </Link>
        <Link href="/status" className="flex-1">
          <Button className="w-full h-20 rounded-[32px] bg-blue-600 hover:bg-white hover:text-blue-600 text-white font-black uppercase text-[11px] tracking-[0.4em] shadow-[0_20px_50px_rgba(59,130,246,0.3)] transition-all active:scale-95 group overflow-hidden border-2 border-transparent hover:border-blue-600">
            <span className="relative z-10 flex items-center justify-center">
               <Search className="mr-3 group-hover:scale-110 transition-transform" size={18}/> Track Status <ArrowRight className="ml-3 group-hover:translate-x-2 transition-transform" size={16} />
            </span>
          </Button>
        </Link>
      </div>

      {/* 5. DOWNLOAD BUTTON */}
      <div className="relative z-10 pt-6 print:hidden">
        <Button 
          onClick={handleDownloadImage} 
          variant="ghost" 
          className="text-slate-500 hover:text-green-400 hover:bg-green-500/10 gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all"
        >
          <Download size={16} /> Download Enrollment Information via PNG
        </Button>
      </div>

      <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.8em] pt-12 relative z-10">
          AMA ACLC Northbay • S.Y. 2025-2026
      </p>
    </div>
  )
}

// --- 2. MAIN PAGE ---
export default function SuccessPage() {
  const globalCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = globalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    let particles: { x: number; y: number; size: number; speedX: number; speedY: number }[] = [];

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [];
      for (let i = 0; i < 120; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.8,
          speedX: (Math.random() - 0.5) * 0.15,
          speedY: (Math.random() - 0.5) * 0.15
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      particles.forEach((p) => {
        p.x += p.speedX; p.y += p.speedY;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      });
      requestAnimationFrame(animate);
    };

    window.addEventListener("resize", init);
    init(); animate();
    return () => { window.removeEventListener("resize", init); };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Global Background Drift */}
      <canvas ref={globalCanvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Institutional Ambient Gradients */}
      <div className="absolute top-[-30%] right-[-10%] w-[70%] h-[70%] bg-blue-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-30%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center gap-6 relative z-10 text-white">
          <div className="relative">
             <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-40 animate-pulse" />
             <Loader2 className="animate-spin text-blue-500 w-16 h-16 relative z-10" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-400 animate-pulse">Synchronizing Matrix Finality...</p>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  )
}