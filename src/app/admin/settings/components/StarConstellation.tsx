"use client"

import { useEffect, useState, memo } from "react"

export const StarConstellation = memo(function StarConstellation() {
  const [stars, setStars] = useState<Array<{x: number, y: number, size: number}>>([])
  useEffect(() => {
    const newStars = Array.from({ length: 30 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1
    }))
    setStars(newStars)
  }, [])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <svg className="w-full h-full opacity-20">
        {stars.map((star, i) => (
          <circle key={i} cx={`${star.x}%`} cy={`${star.y}%`} r={star.size} fill="rgb(59 130 246)" className="animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </svg>
    </div>
  )
})

