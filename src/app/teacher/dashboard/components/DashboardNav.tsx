// app/teacher/dashboard/components/DashboardNav.tsx
"use client"

import { LogOut, Sun, Moon, WifiOff } from "lucide-react"

interface DashboardNavProps {
  dm: boolean
  online: boolean
  onToggleDark: () => void
  onLogout: () => void
}

export function DashboardNav({ dm, online, onToggleDark, onLogout }: DashboardNavProps) {
  const sub = dm ? "text-slate-400" : "text-slate-500"

  return (
    <nav className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl border overflow-hidden flex items-center justify-center shrink-0 shadow-sm ${dm ? "bg-slate-800 border-slate-700/80" : "bg-white border-slate-200"}`}>
          <img src="/logo-aclc.png" alt="AMA ACLC" className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] bg-gradient-to-r from-blue-500 to-blue-400 bg-clip-text text-transparent">Teacher Portal</p>
          <p className={`text-[8px] font-bold uppercase tracking-widest ${sub}`}>ACLC NORTHBAY</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Realtime indicator */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-colors
          ${online
            ? (dm ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600")
            : (dm ? "bg-red-500/10 border-red-500/25 text-red-400" : "bg-red-50 border-red-200 text-red-500")
          }`}>
          {online
            ? <span className="relative flex shrink-0"><span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-50" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
            : <WifiOff size={10} />
          }
          <span className="hidden md:inline">{online ? "Live" : "Offline"}</span>
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={onToggleDark}
          className={`flex items-center gap-1.5 h-9 w-9 md:w-auto md:px-3 justify-center rounded-2xl border transition-all duration-200
            ${dm ? "bg-slate-800 border-slate-700/80 text-amber-400 hover:bg-slate-700 hover:border-slate-600" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"}`}
        >
          {dm ? <Sun size={13} /> : <Moon size={13} />}
          <span className="hidden md:inline text-[9px] font-black uppercase tracking-widest">{dm ? "Light" : "Dark"}</span>
        </button>

        {/* Sign out */}
        <button
          onClick={onLogout}
          className={`flex items-center gap-1.5 h-9 px-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all duration-200
            ${dm ? "text-slate-400 border-transparent hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20" : "text-slate-500 border-transparent hover:text-red-600 hover:bg-red-50 hover:border-red-200"}`}
        >
          <LogOut size={11} /><span className="hidden md:inline">Sign Out</span>
        </button>
      </div>
    </nav>
  )
}