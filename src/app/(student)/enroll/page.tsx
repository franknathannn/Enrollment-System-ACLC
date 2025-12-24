"use client"

import React, { useEffect, useState, useMemo } from "react"
import { useEnrollmentStore } from "@/store/useEnrollmentStore"
import { supabase } from "@/lib/supabase/client"
import { Loader2, GraduationCap, Lock, Home, Timer, ArrowLeft, Calendar, Users, Activity } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

import Step1Identity from "@/components/forms/Step1Identity"
import Step2Academic from "@/components/forms/Step2Academic"
import Step3Family from "@/components/forms/Step3Family"
import Step4Documents from "@/components/forms/Step4Documents"
import Step5Review from "@/components/forms/Step5Review"

export default function EnrollmentPage() {
  const { currentStep } = useEnrollmentStore() 
  const [systemStatus, setSystemStatus] = useState<{ 
    isOpen: boolean; 
    reason: "date" | "manual" | "capacity" | null;
    closingTime: string | null;
    openingTime: string | null;
    schoolYear: string;
    controlMode: string;
  } | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState<string | null>(null)

  // --- 300 IQ PROGRESS LOGIC ---
  const progressPercentage = (currentStep / 5) * 100

  async function checkStatus() {
    try {
      const [configRes, countRes] = await Promise.all([
        supabase.from('system_config').select('*').single(),
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'Accepted')
      ])

      if (configRes.error) throw configRes.error
      const config = configRes.data
      const currentEnrolled = countRes.count || 0

      if (config) {
        const now = new Date()
        const start = config.enrollment_start ? new Date(config.enrollment_start) : null
        const end = config.enrollment_end ? new Date(config.enrollment_end) : null
        
        const isFull = currentEnrolled >= config.capacity
        let portalOpen = false
        let closeReason: "date" | "manual" | "capacity" | null = null

        if (isFull) {
          portalOpen = false
          closeReason = "capacity"
        } else if (config.control_mode === 'manual') {
          portalOpen = config.is_portal_active
          closeReason = !config.is_portal_active ? "manual" : null
        } else {
          const hasDates = config.enrollment_start && config.enrollment_end
          const isWithinWindow = hasDates && (now >= start! && now <= end!)
          portalOpen = isWithinWindow
          closeReason = !isWithinWindow ? "date" : null
        }

        setSystemStatus({ 
          isOpen: portalOpen, 
          reason: closeReason,
          closingTime: config.enrollment_end,
          openingTime: config.enrollment_start,
          schoolYear: config.school_year || "2025-2026",
          controlMode: config.control_mode || "automatic"
        })
      }
    } catch (error) {
      console.error("Portal verification failed:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 60000) 
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!systemStatus?.closingTime || !systemStatus.isOpen || systemStatus.controlMode === 'manual') {
      setTimeLeft(null); return;
    }
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(systemStatus.closingTime!).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setSystemStatus(prev => prev ? { ...prev, isOpen: false, reason: "date" } : null);
        setTimeLeft(null);
        clearInterval(timer);
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [systemStatus]);

  const currentStepContent = useMemo(() => {
    switch (currentStep) {
      case 1: return <Step1Identity />;
      case 2: return <Step2Academic />;
      case 3: return <Step3Family />;
      case 4: return <Step4Documents />;
      case 5: return <Step5Review />;
      default: return <Step1Identity />;
    }
  }, [currentStep]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
      <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Initialising Admission Matrix...</p>
    </div>
  )

  if (!systemStatus?.isOpen) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
        <div className="max-w-md w-full space-y-8">
          <div className="w-24 h-24 bg-white rounded-[40px] shadow-2xl border border-slate-100 flex items-center justify-center mx-auto text-slate-900">
            {systemStatus?.reason === "capacity" ? <Users size={40} className="text-amber-500" /> : <Lock size={40} />}
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                {systemStatus?.reason === "capacity" ? "Capacity Reached" : "Portal Locked"}
            </h1>
            <p className="text-slate-500 font-medium italic mt-4 px-4 leading-relaxed">
              {systemStatus?.reason === "capacity" 
                ? "We have reached the maximum number of enrollees for this school year. Thank you for your interest."
                : systemStatus?.reason === "manual" 
                ? "Online registration is currently unavailable. Please visit the campus registrar for inquiries."
                : `Enrollment for S.Y. ${systemStatus?.schoolYear} has either not yet begun or has officially concluded.`
              }
            </p>
          </div>
          {systemStatus?.controlMode === 'automatic' && systemStatus.reason === "date" && (
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-5">
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span className="flex items-center gap-2"><Calendar size={12} className="text-blue-500"/> Admissions Opening</span>
                  <span className="text-slate-900">{systemStatus.openingTime ? new Date(systemStatus.openingTime).toLocaleDateString() : "To be Announced"}</span>
               </div>
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span className="flex items-center gap-2"><Lock size={12} className="text-red-500"/> Admissions Closing</span>
                  <span className="text-slate-900">{systemStatus.closingTime ? new Date(systemStatus.closingTime).toLocaleDateString() : "To be Announced"}</span>
               </div>
            </div>
          )}
          <Link href="/" className="block">
            <Button variant="outline" className="w-full h-16 rounded-[24px] font-black uppercase text-[10px] tracking-widest border-slate-200 hover:bg-slate-900 hover:text-white transition-all shadow-sm">
              <Home className="mr-2" size={16}/> Return to Landing Page
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 animate-in fade-in duration-500 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" className="rounded-xl font-bold text-slate-400 hover:text-slate-900">
                <ArrowLeft className="mr-2" size={16}/> Exit Enrollment
              </Button>
            </Link>
            <div className="flex items-center gap-3">
                {timeLeft && systemStatus.controlMode === 'automatic' && (
                    <div className="bg-slate-900 px-5 py-2.5 rounded-full flex items-center gap-3 text-white shadow-xl">
                        <Timer size={14} className="text-blue-400 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Window Closes in:</span>
                        <span className="font-mono font-black text-xs text-blue-400">{timeLeft}</span>
                    </div>
                )}
            </div>
        </div>
        
        <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                  <GraduationCap size={24}/>
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-sm uppercase leading-none text-slate-900">ACLC Northbay</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">S.Y. {systemStatus.schoolYear} Intake</span>
                </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="px-5 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm font-black text-xs text-slate-900 uppercase">
                  Progress <span className="text-blue-600 ml-1">0{currentStep}</span> / 05
              </div>
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mr-1">{progressPercentage}% Complete</span>
            </div>
        </div>

        {/* --- NEW PERCENTAGE PROGRESS BAR --- */}
        <div className="w-full h-3 bg-white rounded-full border border-slate-100 p-0.5 overflow-hidden shadow-sm">
           <div 
             className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-blue-200 flex items-center justify-end px-1"
             style={{ width: `${progressPercentage}%` }}
           >
              <div className="w-1 h-1 bg-white/40 rounded-full animate-pulse" />
           </div>
        </div>

        <div className="bg-white p-8 md:p-12 rounded-[48px] shadow-sm border border-slate-100 animate-in slide-in-from-bottom-4 duration-700 relative overflow-hidden">
          {/* Subtle Activity Decorator */}
          <Activity size={100} className="absolute -top-10 -right-10 text-slate-50 rotate-12 pointer-events-none" />
          
          <div className="relative z-10">
            {currentStepContent}
          </div>
        </div>

        <div className="flex justify-center gap-3 py-4">
            {[1,2,3,4,5].map((s) => (
                <div key={s} className={`h-2 rounded-full transition-all duration-700 ${s === currentStep ? "w-16 bg-blue-600 shadow-md" : s < currentStep ? "w-3 bg-blue-200" : "w-2 bg-slate-200"}`} />
            ))}
        </div>
      </div>
    </div>
  )
}