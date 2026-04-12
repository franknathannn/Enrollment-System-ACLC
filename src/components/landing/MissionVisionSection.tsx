"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence, useInView } from "framer-motion"
import { cn } from "@/lib/utils"
import { Eye, Target, ChevronRight } from "lucide-react"

interface MissionVisionProps {
  isDark: boolean
}

const VISION_LINES = [
  "TO BE THE LEADER AND DOMINANT PROVIDER",
  "OF RELEVANT AND GLOBALLY RECOGNIZED INFORMATION",
  "TECHNOLOGY-BASED EDUCATION",
  "AND RELATED SERVICES IN THE GLOBAL MARKET",
  "PREPARING ITS GRADUATES TO BE GLOBALLY COMPETITIVE,",
  "PROFESSIONALLY AND PERSONALLY FULFILLED.",
  "AND LIVE PROSPEROUSLY.",
]

const MISSION_LINES = [
  "TO PROVIDE A HOLISTIC, RELEVANT, QUALITY AND GLOBALLY RECOGNIZED IT-BASED EDUCATION",
  "IN ALL LEVELS AND DISCIPLINES WITH THE OBJECTIVE OF PRODUCING WORLD-CLASS PROFESSIONALS",
  "AND LEADERS RESPONSIVE TO THE NEEDS OF TECHNOLOGY IN THE LOCAL AND INTERNATIONAL COMMUNITY,",
  "COGNIZANT OF THE WELFARE AND BENEFITS OF ITS MEN AND WOMEN THEREBY REALIZING THEIR POTENTIAL",
  "AS PRODUCTIVE MEMBERS OF THE SOCIETY FOR THE HONOR AND GLORY OF GOD ALMIGHTY.",
]

function AnimatedLine({ text, index, isVisible, isDark }: { text: string; index: number; isVisible: boolean; isDark: boolean }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
      animate={isVisible ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 18, filter: "blur(6px)" }}
      transition={{
        type: "spring",
        stiffness: 120,
        damping: 20,
        delay: index * 0.06,
      }}
      className={cn(
        "text-sm md:text-base lg:text-lg font-semibold leading-relaxed tracking-wide text-center transition-colors duration-300",
        isDark ? "text-slate-300" : "text-slate-600"
      )}
    >
      {text}
    </motion.p>
  )
}

export function MissionVisionSection({ isDark }: MissionVisionProps) {
  const d = isDark
  const [activeTab, setActiveTab] = useState<"vision" | "mission">("vision")
  const sectionRef = useRef<HTMLDivElement>(null)

  const isAtTriggerPoint = useInView(sectionRef, { margin: "-20% 0px -20% 0px" })
  const isOnScreen = useInView(sectionRef)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isAtTriggerPoint) setVisible(true)
    else if (!isOnScreen) setVisible(false)
  }, [isAtTriggerPoint, isOnScreen])

  const lines = activeTab === "vision" ? VISION_LINES : MISSION_LINES
  const Icon = activeTab === "vision" ? Eye : Target

  return (
    <section ref={sectionRef} className="relative mt-24 md:mt-32 lg:mt-48">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className="text-center space-y-5 mb-12 md:mb-16"
        >
          <div className={cn(
            "inline-flex items-center gap-2 px-5 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.3em]",
            d ? "border-blue-500/20 bg-blue-500/5 text-blue-400" : "border-slate-200 bg-slate-50 text-slate-500"
          )}>
            <Icon size={11} /> Our Foundation
          </div>
          <h2 className={cn(
            "text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.85]",
            d ? "text-white" : "text-slate-900"
          )}>
            Mission <span className="text-blue-600">&</span> Vision
          </h2>
        </motion.div>

        {/* Tab Switcher */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.05 }}
          className="flex justify-center mb-10 md:mb-14"
        >
          <div className={cn(
            "inline-flex p-1.5 rounded-2xl border",
            d ? "bg-white/5 border-white/10" : "bg-slate-100/80 border-slate-200/80"
          )}>
            {[
              { key: "vision" as const, label: "Vision", icon: Eye },
              { key: "mission" as const, label: "Mission", icon: Target },
            ].map(({ key, label, icon: TabIcon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "relative px-7 md:px-10 py-3 md:py-3.5 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-[0.25em] flex items-center gap-2.5 transition-all duration-300",
                  activeTab === key
                    ? "text-white shadow-lg"
                    : d ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {activeTab === key && (
                  <motion.div
                    layoutId="mv-active-tab"
                    className={cn(
                      "absolute inset-0 rounded-xl shadow-lg",
                      key === "mission"
                        ? "bg-red-600 shadow-red-600/30"
                        : "bg-blue-600 shadow-blue-600/30"
                    )}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2.5">
                  <TabIcon size={13} />
                  {label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content Card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={visible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.1 }}
        >
          <div className={cn(
            "relative rounded-[40px] md:rounded-[56px] border overflow-hidden",
            "transition-all duration-500",
            d
              ? "bg-[#030712]/80 border-white/[0.08] shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
              : "bg-white border-slate-200/80 shadow-[0_4px_60px_rgba(0,0,0,0.04)]"
          )}>
            {/* Decorative Top Bar */}
            <div className={cn(
              "h-1 w-full transition-colors duration-500",
              activeTab === "vision" ? "bg-blue-600" : "bg-red-600"
            )} />

            {/* Background Logo Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
              <img
                src="/logo-aclc.png"
                alt=""
                className={cn(
                  "w-[200px] md:w-[300px] h-auto object-contain transition-all duration-700",
                  "opacity-[0.04]",
                  d && "brightness-150 opacity-[0.06]"
                )}
              />
            </div>

            {/* Content */}
            <div className="relative z-10 p-8 md:p-14 lg:p-20">
              {/* Active Tab Icon & Label */}
              <div className="flex items-center justify-center gap-3 mb-10 md:mb-14">
                <div className={cn(
                  "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500",
                  activeTab === "vision"
                    ? "bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-600/30"
                    : "bg-gradient-to-br from-red-600 to-rose-700 shadow-red-600/30"
                )}>
                  <Icon size={24} className="text-white" />
                </div>
                <div>
                  <p className={cn(
                    "text-[9px] font-black uppercase tracking-[0.5em]",
                    d ? "text-slate-500" : "text-slate-400"
                  )}>
                    {activeTab === "vision" ? "Our Vision" : "Our Mission"}
                  </p>
                  <p className={cn(
                    "text-xl md:text-2xl font-black uppercase tracking-tight",
                    d ? "text-white" : "text-slate-900"
                  )}>
                    {activeTab === "vision" ? "Where We Aspire" : "What We Live By"}
                  </p>
                </div>
              </div>

              {/* Animated Lines */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  className="space-y-3 md:space-y-4 max-w-3xl mx-auto"
                >
                  {lines.map((line, i) => (
                    <AnimatedLine
                      key={`${activeTab}-${i}`}
                      text={line}
                      index={i}
                      isVisible={visible}
                      isDark={d}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* Decorative Bottom Divider */}
              <div className="flex items-center justify-center gap-3 mt-12 md:mt-16">
                <div className={cn("h-px flex-1 max-w-24", d ? "bg-white/5" : "bg-slate-100")} />
                <div className={cn(
                  "w-2 h-2 rounded-full transition-colors duration-500",
                  activeTab === "vision" ? "bg-blue-600" : "bg-red-600"
                )} />
                <div className={cn("h-px flex-1 max-w-24", d ? "bg-white/5" : "bg-slate-100")} />
              </div>

              {/* Tab Hint */}
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setActiveTab(activeTab === "vision" ? "mission" : "vision")}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.25em] transition-all duration-300 border group",
                    d
                      ? "text-slate-500 border-white/5 hover:text-white hover:border-white/15 hover:bg-white/5"
                      : "text-slate-400 border-slate-100 hover:text-slate-700 hover:border-slate-200 hover:bg-slate-50"
                  )}
                >
                  Read Our {activeTab === "vision" ? "Mission" : "Vision"}
                  <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform duration-300" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
