"use client"

import React, { useRef } from "react"
import { motion, useScroll, useTransform, useSpring } from "framer-motion"
import { cn } from "@/lib/utils"

interface PathData {
  d: string
  range?: [number, number]
  strokeWidth?: number
  strokeColor?: string
}

interface ScrollSVGProps {
  paths: PathData[]
  className?: string
  viewBox?: string
  width?: number | string
  height?: number | string
  defaultStrokeWidth?: number
  defaultStrokeColor?: string
}

export function ScrollSVG({
  paths,
  className,
  viewBox = "0 0 100 100",
  width = "100%",
  height = "100%",
  defaultStrokeWidth = 2,
  defaultStrokeColor = "currentColor",
}: ScrollSVGProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.8", "end 0.2"],
  })

  // We use useSpring to smooth out the scroll-driven animation
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <svg
        viewBox={viewBox}
        width={width}
        height={height}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {paths.map((path, index) => {
          const range = path.range || [0, 1]
          const length = useTransform(smoothProgress, range, [0, 1])
          const opacity = useTransform(smoothProgress, [range[0], range[0] + 0.05], [0, 1])

          return (
            <motion.path
              key={index}
              d={path.d}
              stroke={path.strokeColor || defaultStrokeColor}
              strokeWidth={path.strokeWidth || defaultStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                pathLength: length,
                opacity: opacity,
              }}
            />
          )
        })}
      </svg>
    </div>
  )
}
