"use client"

import React, { useRef } from "react"
import { motion, useScroll, useTransform, MotionValue, useSpring } from "framer-motion"
import { User, GraduationCap, Users, FileText, CheckCircle2 } from "lucide-react"
import { ScrollSVG } from "@/components/shared/ScrollSVG"
import { cn } from "@/lib/utils"

const steps = [
  {
    title: "Identity Verification",
    description: "Start by providing your basic personal details and contact information. We verify your identity to ensure a secure and personalized enrollment experience.",
    icon: User,
  },
  {
    title: "Academic Profiling",
    description: "Select your desired strand (ICT or GAS) and provide details about your previous schooling. This helps us place you in the right section and prepare your academic records.",
    icon: GraduationCap,
  },
  {
    title: "Family Information",
    description: "Provide details about your parents or guardians. This information is crucial for emergency contacts and student support services.",
    icon: Users,
  },
  {
    title: "Document Upload",
    description: "Securely upload digital copies of your academic requirements like Form 137, Good Moral Certificate, and PSA Birth Certificate.",
    icon: FileText,
  },
  {
    title: "Review & Submit",
    description: "Double-check all your provided information. Once submitted, our admissions team will review your application and update your status in real-time.",
    icon: CheckCircle2,
  },
]

export function ProcessSection({ isDark }: { isDark: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.2", "end 0.8"]
  })

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  // SVG paths for the connecting line - one continuous path
  const paths = [
    { d: "M 50 0 V 1000", range: [0, 1] as [number, number] },
  ]

  return (
    <section ref={containerRef} className="relative mt-24 md:mt-32 lg:mt-48 pb-24">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-left mb-16 md:mb-24 space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-500 text-[10px] font-black uppercase tracking-[0.3em]"
          >
            Digital Workflow
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className={cn(
              "text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.85]",
              isDark ? "text-white" : "text-slate-900"
            )}
          >
            How it <span className="text-blue-600">Works</span>
          </motion.h2>
        </div>

        <div className="relative">
          {/* Vertical Line - Desktop Only */}
          <div className="hidden lg:block absolute left-[39px] top-0 bottom-0 w-px bg-slate-200 dark:bg-white/5">
             <ScrollSVG 
                paths={paths}
                viewBox="0 0 100 1000"
                width={2}
                height="100%"
                defaultStrokeWidth={20}
                defaultStrokeColor="#2563eb"
                className="h-full"
             />
          </div>

          <div className="space-y-12 md:space-y-32">
            {steps.map((step, idx) => (
              <StepItem 
                key={idx} 
                index={idx} 
                step={step} 
                isDark={isDark} 
                progress={smoothProgress} 
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function StepItem({ index, step, isDark, progress }: { index: number, step: any, isDark: boolean, progress: MotionValue<number> }) {
  const Icon = step.icon
  
  // Calculate active range for this specific step
  const stepCount = steps.length
  const start = index / stepCount
  const end = (index + 1) / stepCount
  
  const opacity = useTransform(progress, [start - 0.1, start, end, end + 0.1], [0.3, 1, 1, 0.3])
  const scale = useTransform(progress, [start - 0.1, start, end, end + 0.1], [0.9, 1.05, 1.05, 0.9])
  const glowOpacity = useTransform(progress, [start - 0.05, start, end, end + 0.05], [0, 1, 1, 0])

  return (
    <div className="group relative grid grid-cols-1 lg:grid-cols-[80px_1fr] gap-8 md:gap-16 items-start">
      {/* Icon Column */}
      <div className="relative flex justify-center lg:pt-2">
        {/* Mobile vertical line */}
        <div className="lg:hidden absolute left-[39px] top-0 bottom-0 w-px bg-slate-200 dark:bg-white/5 -z-10" />
        
        <motion.div 
          style={{ scale }}
          className={cn(
            "relative w-20 h-20 rounded-3xl flex items-center justify-center border transition-all duration-500 z-10",
            isDark 
              ? "bg-[#030712] border-white/10 text-blue-400 group-hover:border-blue-500/50" 
              : "bg-white border-slate-200 text-blue-600 shadow-xl group-hover:border-blue-400"
          )}
        >
          <motion.div 
            style={{ opacity: glowOpacity }}
            className="absolute inset-0 rounded-3xl bg-blue-600/20 blur-xl -z-10" 
          />
          <Icon size={32} strokeWidth={2.5} />
          
          {/* Step Number Badge */}
          <div className={cn(
            "absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border",
            isDark ? "bg-blue-600 border-white/20 text-white" : "bg-blue-600 border-white text-white shadow-lg"
          )}>
            {index + 1}
          </div>
        </motion.div>
      </div>

      {/* Content Column */}
      <motion.div 
        style={{ opacity }}
        className={cn(
          "p-8 md:p-12 rounded-[48px] border transition-all duration-500",
          isDark 
            ? "bg-[#030712] border-white/5 lg:group-hover:bg-white/[0.02] lg:group-hover:border-white/10" 
            : "bg-white border-slate-100 shadow-sm lg:group-hover:shadow-2xl lg:group-hover:border-blue-100"
        )}
      >
        <div className="flex items-center gap-4 mb-6">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em]">Section {index + 1}</span>
          <div className={cn("h-px flex-1", isDark ? "bg-white/5" : "bg-slate-100")} />
        </div>
        
        <h3 className={cn(
          "text-3xl md:text-5xl font-black uppercase tracking-tighter mb-6",
          isDark ? "text-white" : "text-slate-900"
        )}>
          {step.title}
        </h3>
        
        <p className={cn(
          "text-lg md:text-xl font-medium leading-relaxed max-w-2xl",
          isDark ? "text-slate-400" : "text-slate-500"
        )}>
          {step.description}
        </p>
        
        <div className="mt-10 flex gap-3">
           <div className={cn("h-1 w-12 rounded-full", isDark ? "bg-blue-600/30" : "bg-blue-100")}>
              <motion.div 
                style={{ scaleX: useTransform(progress, [start, end], [0, 1]) }}
                className="h-full w-full bg-blue-600 rounded-full origin-left"
              />
           </div>
        </div>
      </motion.div>
    </div>
  )
}
