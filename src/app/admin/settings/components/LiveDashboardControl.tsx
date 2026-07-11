"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"

export function LiveDashboardControl({ isDarkMode }: { isDarkMode: boolean }) {
  const [showLiveDashboard, setShowLiveDashboard] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSetting() {
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'show_live_dashboard').single()
      if (data) {
        setShowLiveDashboard(data.value !== 'false')
      } else {
        // Create it if it doesn't exist
        await supabase.from('site_settings').insert([{ key: 'show_live_dashboard', value: 'true' }])
      }
      setLoading(false)
    }
    loadSetting()
  }, [])

  const handleToggle = async (checked: boolean) => {
    setUpdating(true)
    setShowLiveDashboard(checked)
    try {
      const { error } = await supabase.from('site_settings').update({ value: checked ? 'true' : 'false' }).eq('key', 'show_live_dashboard')
      if (error) throw error
      toast.success(`Live Dashboard ${checked ? 'SHOWN' : 'HIDDEN'} on landing page`)
    } catch {
      setShowLiveDashboard(!checked)
      toast.error("Failed to update Live Dashboard setting")
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return null

  return (
    <div className={`p-6 rounded-[32px] border transition-all duration-500 ${isDarkMode ? "bg-slate-900 border-slate-700/60" : "bg-white border-slate-200"}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${showLiveDashboard ? "bg-blue-500/10" : isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={showLiveDashboard ? "text-blue-500" : "text-slate-400"}><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
          </div>
          <div>
            <p className={`text-xs font-black uppercase tracking-[0.2em] ${isDarkMode ? "text-white" : "text-slate-900"}`}>Live Dashboard Visibility</p>
            <p className={`text-[9px] mt-0.5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
              {showLiveDashboard
                ? "Live Dashboard is visible to visitors on the landing page"
                : "Live Dashboard is hidden from the landing page"}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={updating}
          onClick={() => handleToggle(!showLiveDashboard)}
          role="switch"
          aria-checked={showLiveDashboard}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 flex-shrink-0 disabled:opacity-50
            ${showLiveDashboard ? "bg-blue-500" : isDarkMode ? "bg-slate-600" : "bg-slate-300"}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
            ${showLiveDashboard ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>
    </div>
  )
}
