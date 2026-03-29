"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react"

interface AttendanceSidebarProps {
  side: "left" | "right"
  title: string
  icon: LucideIcon
  children: React.ReactNode
  defaultCollapsed?: boolean
  className?: string
  /** If provided, will use this state instead of internal state */
  isCollapsed?: boolean
  onToggle?: (collapsed: boolean) => void
  isDarkMode?: boolean
}

export function AttendanceSidebar({
  side,
  title,
  icon: Icon,
  children,
  defaultCollapsed = false,
  className,
  isCollapsed: externalIsCollapsed,
  onToggle,
  isDarkMode = false,
}: AttendanceSidebarProps) {
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(defaultCollapsed)
  
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed
  
  const handleToggle = () => {
    const newCollapsed = !isCollapsed
    if (onToggle) {
      onToggle(newCollapsed)
    } else {
      setInternalIsCollapsed(newCollapsed)
    }
  }

  const surfaceColor = isDarkMode ? "rgb(15, 23, 42)" : "rgb(255, 255, 255)"
  const borderColor = isDarkMode ? "rgb(30, 41, 59)" : "rgb(226, 232, 240)"
  const textColor = isDarkMode ? "rgb(241, 245, 249)" : "rgb(15, 23, 42)"
  const mutedTextColor = isDarkMode ? "rgb(148, 163, 184)" : "rgb(100, 116, 139)"

  return (
    <aside
      className={cn(
        "flex flex-col h-full z-40 transition-all duration-300 ease-in-out border-slate-200 dark:border-slate-800",
        side === "left" ? "border-r" : "border-l",
        isCollapsed ? "w-14" : "w-80",
        className
      )}
      style={{
        backgroundColor: surfaceColor,
        borderColor: borderColor,
      }}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center p-4 shrink-0 overflow-hidden h-16",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
              <Icon size={18} />
            </div>
            <h3 className="font-black text-xs uppercase tracking-widest truncate" style={{ color: textColor }}>
              {title}
            </h3>
          </div>
        )}
        
        {isCollapsed && (
          <button 
            onClick={handleToggle}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            style={{ color: mutedTextColor }}
          >
            <Icon size={20} />
          </button>
        )}
        
        {!isCollapsed && (
          <button 
            onClick={handleToggle}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            style={{ color: mutedTextColor }}
          >
            {side === "left" ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        )}
      </div>

      {/* Toggle button when collapsed (on the edge) */}
      {isCollapsed && (
        <button
          onClick={handleToggle}
          className={cn(
            "absolute top-20 w-6 h-12 rounded-full flex items-center justify-center z-50 shadow-md transition-all border border-slate-200 dark:border-slate-700 hover:scale-105 active:scale-95 bg-white dark:bg-slate-900",
            side === "left" ? "-right-3" : "-left-3"
          )}
        >
          {side === "left" ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      )}

      {/* Content */}
      <div className={cn(
        "flex-1 overflow-hidden transition-opacity duration-200",
        isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        {children}
      </div>
    </aside>
  )
}
