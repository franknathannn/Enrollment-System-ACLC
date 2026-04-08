"use client"

import React, { useRef, useState, useEffect } from "react"
import { motion, useScroll, useTransform, useInView, useMotionValueEvent } from "framer-motion"
import { cn } from "@/lib/utils"

interface AboutSectionProps {
  isDark: boolean
}

// Single-transform scroll reveal — 1 motion value per block instead of 1 per word.
// useMotionValueEvent writes directly to DOM refs so there are zero React re-renders on scroll.
const ScrollRevealedText = ({ text, progress, range, isDark }: { text: string; progress: any; range: [number, number]; isDark: boolean }) => {
  const words = text.split(" ")
  const spanRefs = useRef<(HTMLSpanElement | null)[]>([])
  const lastLit = useRef(-1)

  // One transform maps [rangeStart, rangeEnd] → [0, wordCount]
  const litProgress = useTransform(progress, range, [0, words.length])

  // Precomputed outside the callback — stable between frames, only changes when isDark changes
  const dimRGB = isDark ? [60,  60,  60 ] : [200, 200, 200]
  const brtRGB = isDark ? [255, 255, 255] : [15,  23,  42 ]

  useMotionValueEvent(litProgress, "change", (lit) => {
    // Skip frames where scroll progress hasn't moved enough to visually change any word.
    // 0.05 is sub-perceptible — saves ~3–6 redundant style writes per gesture.
    if (Math.abs(lit - lastLit.current) < 0.05) return
    lastLit.current = lit

    const [dimR, dimG, dimB] = dimRGB
    const [brtR, brtG, brtB] = brtRGB

    spanRefs.current.forEach((span, i) => {
      if (!span) return
      const t = Math.max(0, Math.min(1, lit - i))
      span.style.color = `rgb(${Math.round(dimR + (brtR - dimR) * t)},${Math.round(dimG + (brtG - dimG) * t)},${Math.round(dimB + (brtB - dimB) * t)})`
    })
  })

  const dimColor = isDark ? "rgb(60,60,60)" : "rgb(200,200,200)"

  return (
    <>
      {words.map((word, i) => (
        <span
          key={i}
          ref={el => { spanRefs.current[i] = el }}
          className="inline-block mr-[0.25em] whitespace-nowrap"
          style={{ color: dimColor }}
        >
          {word}
        </span>
      ))}
    </>
  )
}

export function AboutSection({ isDark }: AboutSectionProps) {
  const d = isDark
  const textContainerRef = useRef<HTMLDivElement>(null)
  
  // Hysteresis logic for the image entry:
  // 1. Entry triggers when in the center 50% of the screen (clears 25% from bottom or top)
  // 2. Element stays visible as long as ANY part is on screen
  const imageRef = useRef(null)
  const isAtTriggerPoint = useInView(imageRef, { margin: "-25% 0px -25% 0px" })
  const isOnScreen = useInView(imageRef)
  const [imageVisible, setImageVisible] = useState(false)

  useEffect(() => {
    if (isAtTriggerPoint) setImageVisible(true)
    else if (!isOnScreen) setImageVisible(false)
  }, [isAtTriggerPoint, isOnScreen])

  // High-precision scroll tracking for text lighting effect
  const { scrollYProgress } = useScroll({
    target: textContainerRef,
    offset: ["start end", "center center"] 
  })

  // Header lights up as it approaches the middle
  const headerColor = useTransform(
    scrollYProgress,
    [0.1, 0.4],
    [d ? "rgb(60, 60, 60)" : "rgb(200, 200, 200)", d ? "rgb(255, 255, 255)" : "rgb(15, 23, 42)"]
  )

  // Opacity for the stats and button
  const opacityFade = useTransform(scrollYProgress, [0.8, 1], [0.3, 1])

  return (
    <section className="relative mt-24 md:mt-32 lg:mt-48 pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Left Side: Image with "Pop from Left" Entry */}
          <motion.div 
            ref={imageRef}
            initial={{ opacity: 0, x: -100, scale: 0.9 }}
            animate={imageVisible ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: -100, scale: 0.9 }}
            transition={{ 
              type: "spring", 
              stiffness: 40, 
              damping: 15,
              delay: 0.1 
            }}
            className="relative group order-1 lg:order-1"
            style={{ willChange: "transform, opacity", zIndex: 1 }}
          >
            {/* Ambient Glow behind image */}
            <div className={cn(
              "absolute -inset-4 rounded-[40px] blur-3xl transition-opacity duration-700 opacity-0 group-hover:opacity-100 pointer-events-none",
              d ? "bg-blue-500/10" : "bg-blue-600/5"
            )} />
            
            <div className={cn(
              "relative rounded-[32px] md:rounded-[48px] overflow-hidden border transition-all duration-500 shadow-2xl",
              d ? "border-white/10 bg-slate-900/50 shadow-black/50" : "border-slate-200 bg-white shadow-blue-900/10",
              "lg:group-hover:scale-[1.02] lg:group-hover:-rotate-1"
            )}>
              <img 
                src="/AboutUs.png" 
                alt="About ACLC Northbay" 
                className="w-full h-auto object-cover"
              />
              
            </div>
          </motion.div>

          {/* Right Side: Description with Scroll Light-up */}
          <div className="space-y-8 md:space-y-10 order-2 lg:order-2" ref={textContainerRef}>
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.3em]",
                  d ? "border-blue-500/20 bg-blue-500/5 text-blue-400" : "border-blue-200 bg-blue-50 text-blue-700"
                )}
              >
                Legacy of Excellence
              </motion.div>
              
              <motion.h2 
                style={{ color: headerColor }}
                className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-[0.9]"
              >
                About <br /> <span className="text-blue-600">ACLC Northbay</span>
              </motion.h2>
            </div>

            <div className="space-y-6">
              <p className="text-lg md:text-xl font-medium leading-relaxed">
                <ScrollRevealedText 
                  text="Empowering the Next Generation of Digital Learning" 
                  progress={scrollYProgress} 
                  range={[0.1, 0.4]} 
                  isDark={d} 
                />
              </p>
              
              <motion.div 
                style={{ scaleX: scrollYProgress }}
                className={cn(
                  "h-px w-20 origin-left",
                  d ? "bg-blue-500/60" : "bg-blue-600/40"
                )} 
              />

              <p className="text-base md:text-lg leading-relaxed">
                <ScrollRevealedText 
                  text="ACLC Northbay is a premier institution under the AMA Education System, dedicated to providing high-quality, technology-driven Senior High School education. We focus on bridging the gap between academic learning" 
                  progress={scrollYProgress} 
                  range={[0.4, 0.8]} 
                  isDark={d} 
                />
                {" "}
                <ScrollRevealedText 
                  text="and industry demands, ensuring our graduates are ready for both college and the global workforce." 
                  progress={scrollYProgress} 
                  range={[0.8, 1.0]} 
                  isDark={d} 
                />
              </p>

              <motion.div 
                style={{ opacity: opacityFade }}
                className="grid grid-cols-2 gap-6 pt-4"
              >
                <div className="space-y-1">
                  <p className={cn("text-2xl font-black", d ? "text-white" : "text-slate-900")}>40+</p>
                  <p className={cn("text-[10px] font-black uppercase tracking-widest opacity-50", d ? "text-white" : "text-slate-900")}>Years of Innovation</p>
                </div>
                <div className="space-y-1">
                  <p className={cn("text-2xl font-black", d ? "text-white" : "text-slate-900")}>100%</p>
                  <p className={cn("text-[10px] font-black uppercase tracking-widest opacity-50", d ? "text-white" : "text-slate-900")}>Tech-Integrated</p>
                </div>
              </motion.div>
            </div>
            
            <motion.div 
              style={{ opacity: opacityFade }}
              className="pt-4"
            >
              <button className={cn(
                "px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all duration-300 border shadow-lg",
                d 
                  ? "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 shadow-black/50" 
                  : "bg-slate-900 border-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20"
              )}>
                Explore Our Campus
              </button>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  )
}
