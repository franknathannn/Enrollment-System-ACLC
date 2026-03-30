// app/admin/teachers/components/RealtimeIndicator.tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/admin-client"
import { Wifi, WifiOff } from "lucide-react"

interface RealtimeIndicatorProps {
  isDarkMode: boolean
}

export function RealtimeIndicator({ isDarkMode }: RealtimeIndicatorProps) {
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting")

  useEffect(() => {
    const ch = supabase
      .channel("teachers_rt_status")
      .subscribe(s => {
        if (s === "SUBSCRIBED") setStatus("live")
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("offline")
        else setStatus("connecting")
      })

    const handleOnline  = () => setStatus("live")
    const handleOffline = () => setStatus("offline")
    window.addEventListener("online",  handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      supabase.removeChannel(ch)
      window.removeEventListener("online",  handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const config = {
    live:       { label: "Live",        dot: "bg-emerald-400 animate-pulse", text: "text-emerald-400", border: isDarkMode ? "border-emerald-500/20 bg-emerald-500/5" : "border-emerald-200 bg-emerald-50" },
    connecting: { label: "Connecting…", dot: "bg-amber-400 animate-pulse",   text: "text-amber-400",   border: isDarkMode ? "border-amber-500/20 bg-amber-500/5"   : "border-amber-200 bg-amber-50"   },
    offline:    { label: "Offline",     dot: "bg-red-400",                   text: "text-red-400",     border: isDarkMode ? "border-red-500/20 bg-red-500/5"       : "border-red-200 bg-red-50"       },
  }[status]

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest shadow-sm ${config.border}`}>
        {status === "offline"
          ? <WifiOff size={10} className={config.text} />
          : <Wifi    size={10} className={config.text} />
        }
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        <span className={config.text}>{config.label}</span>
      </div>
    </div>
  )
}