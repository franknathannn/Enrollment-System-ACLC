"use client"

import React, { useState } from "react"
import { Users, History } from "lucide-react"
import { AttendanceSidebar } from "./AttendanceSidebar"

interface AttendanceScannerLayoutProps {
  children: React.ReactNode
  leftContent: React.ReactNode
  rightContent: React.ReactNode
  isDarkMode: boolean
}

export function AttendanceScannerLayout({
  children,
  leftContent,
  rightContent,
  isDarkMode,
}: AttendanceScannerLayoutProps) {
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)

  return (
    <div className="flex h-[calc(100vh-120px)] overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 shadow-sm transition-all duration-500">
      {/* Left Sidebar: Student List */}
      <AttendanceSidebar
        side="left"
        title="Student List"
        icon={Users}
        isCollapsed={leftCollapsed}
        onToggle={setLeftCollapsed}
        isDarkMode={isDarkMode}
      >
        {leftContent}
      </AttendanceSidebar>

      {/* Main Scanner Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>

      {/* Right Sidebar: Scan History */}
      <AttendanceSidebar
        side="right"
        title="Scan History"
        icon={History}
        isCollapsed={rightCollapsed}
        onToggle={setRightCollapsed}
        isDarkMode={isDarkMode}
      >
        {rightContent}
      </AttendanceSidebar>
    </div>
  )
}
