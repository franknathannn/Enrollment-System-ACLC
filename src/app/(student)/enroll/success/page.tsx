"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  CheckCircle2, 
  ArrowRight, 
  Home, 
  Search, 
  GraduationCap, 
  Sparkles, 
  Building2, 
  ShieldCheck,
  BadgeCheck,
  Loader2
} from "lucide-react"
import Link from "next/link"
import React from "react"

// 1. CONTENT COMPONENT: Handles the Search Params logic
function SuccessContent() {
  const searchParams = useSearchParams()
  const name = searchParams.get('name') || "Student"
  const lrn = searchParams.get('lrn') || "-----------"
  const strand = searchParams.get('strand') || "Unassigned"

  return (
    <div className="max-w-xl w-full space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 relative z-10 text-center">
      
      {/* Success Icon Matrix */}
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse" />
        <div className="w-24 h-24 bg-white rounded-[40px] shadow-2xl flex items-center justify-center border border-slate-100 relative">
           <CheckCircle2 size={48} className="text-blue-600" />
        </div>
        <div className="absolute -top-2 -right-2 w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
           <Sparkles size={18} />
        </div>
      </div>

      <div className="space-y-3">
        <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">
          Welcome to the <br /> <span className="text-blue-600">Future</span>, {name}!
        </h1>
        <p className="text-slate-500 font-medium italic text-lg leading-relaxed">
          Your application to ACLC Northbay has been successfully transmitted.
        </p>
      </div>

      {/* Digital Dossier Card */}
      <Card className="p-8 rounded-[48px] border-none bg-slate-900 text-white shadow-2xl shadow-blue-200/50 text-left relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <GraduationCap size={120} />
        </div>
        
        <div className="space-y-6 relative z-10">
          <div className="flex justify-between items-start">
             <div>
               <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Application Status</p>
               <div className="flex items-center gap-2 mt-1">
                 <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                 <h3 className="text-xl font-black uppercase">Pending Review</h3>
               </div>
             </div>
             <BadgeCheck size={32} className="text-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-white/10">
             <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tracking LRN</p>
                <p className="text-lg font-mono font-black text-blue-100">{lrn}</p>
             </div>
             <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Strand</p>
                <p className="text-lg font-black text-blue-100">{strand}</p>
             </div>
          </div>
        </div>
      </Card>

      {/* School Showcase Greeting */}
      <div className="space-y-6 bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
         <div className="flex items-center gap-4 justify-center">
            <Building2 className="text-blue-600" size={24} />
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Our School is Beautiful</h3>
         </div>
         <p className="text-sm text-slate-500 font-medium leading-relaxed italic">
           "Beyond the technology and the high-end laboratories, ACLC Northbay is a community built for dreamers. We can't wait to see you walking through our corridors and shaping your digital future with us."
         </p>
         <div className="flex items-center gap-2 justify-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <ShieldCheck size={14} className="text-blue-500" /> Verified Admissions Process
         </div>
      </div>

      {/* Action Matrix */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/" className="flex-1">
          <Button variant="outline" className="w-full h-16 rounded-[24px] font-black uppercase text-[10px] tracking-widest border-slate-200 hover:bg-slate-50">
            <Home className="mr-2" size={16}/> Return Home
          </Button>
        </Link>
        <Link href="/status" className="flex-1">
          <Button className="w-full h-16 rounded-[24px] bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100 group">
            <Search className="mr-2 group-hover:scale-110 transition-transform" size={16}/> Track LRN Status <ArrowRight className="ml-2" size={14} />
          </Button>
        </Link>
      </div>

      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] pt-4">
          AMA ACLC Northbay • Admissions Command Center
      </p>
    </div>
  )
}

// 2. MAIN PAGE: Wraps the content in a Suspense Boundary for the build
export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50 rounded-full blur-[120px] opacity-60" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-50 rounded-full blur-[120px] opacity-60" />

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center gap-4 relative z-10">
          <Loader2 className="animate-spin text-blue-600 w-12 h-12" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verifying Transmission...</p>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  )
}