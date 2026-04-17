"use client"

import { Settings2 } from "lucide-react"

interface SettingsHeaderProps {
  isDarkMode: boolean
}

export function SettingsHeader({ isDarkMode }: SettingsHeaderProps) {
  return (
    <div
      className="relative overflow-hidden rounded-[32px] border p-6 md:p-10 transition-colors duration-500"
      style={{
        backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.85)' : '#ffffff',
        borderColor: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : '#e2e8f0',
      }}
    >
      {/* Top accent strip */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400" />
      {/* Ambient glow */}
      <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px] pointer-events-none ${isDarkMode ? 'bg-blue-500/6' : 'bg-blue-400/5'}`} />

      <div className="relative flex items-center gap-5">
        <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl ${isDarkMode ? 'bg-gradient-to-br from-blue-600 to-violet-700 shadow-blue-500/30' : 'bg-gradient-to-br from-slate-800 to-slate-900 shadow-slate-500/20'}`}>
          <Settings2 size={26} className="text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${isDarkMode ? 'bg-blue-400' : 'bg-blue-500'}`} />
            <p className={`text-[9px] font-black uppercase tracking-[0.4em] ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>System Control</p>
          </div>
          <h1 className={`text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Configuration
          </h1>
          <p className={`text-[9px] sm:text-[11px] font-semibold mt-1.5 italic ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            ACLC NORTHBAY Enrollment Customization
          </p>
        </div>
      </div>
    </div>
  )
}

