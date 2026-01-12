// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\enrolled\components\OptimizedImage.tsx

import { useState, useEffect, useRef } from 'react'

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  fallback?: string
  onClick?: (e: React.MouseEvent) => void
}

export const OptimizedImage = ({ 
  src, 
  alt, 
  className = '', 
  fallback = "https://api.dicebear.com/7.x/shapes/svg?seed=default",
  onClick
}: OptimizedImageProps) => {
  const [imageSrc, setImageSrc] = useState(fallback)
  const [isLoading, setIsLoading] = useState(true)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const img = new Image()
          img.onload = () => {
            setImageSrc(src)
            setIsLoading(false)
          }
          img.onerror = () => {
            setImageSrc(fallback)
            setIsLoading(false)
          }
          img.src = src
          observer.disconnect()
        }
      },
      { rootMargin: '100px' }
    )

    if (imgRef.current) observer.observe(imgRef.current)
    return () => observer.disconnect()
  }, [src, fallback])

  return (
    <div className="relative w-full h-full">
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        onClick={onClick}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse" />
      )}
    </div>
  )
}
