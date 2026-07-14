"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/admin-client"
import { useTheme } from "@/hooks/useTheme"
import { EnrollmentFormControl } from "../settings/components/EnrollmentFormControl"
import { Loader2 } from "lucide-react"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function EnrollmentSettingsPage() {
  const { isDarkMode } = useTheme()
  const [configId, setConfigId] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadConfig() {
      try {
        const { data, error } = await supabase
          .from("system_config")
          .select("id")
          .maybeSingle()
          
        if (data && data.id) {
          setConfigId(data.id)
        } else if (error) {
          console.error("Error fetching system config ID:", error)
        }
      } catch (err) {
        console.error("Unexpected error fetching config:", err)
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [])

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <Loader2 className="animate-spin text-emerald-500 w-8 h-8" />
      </div>
    )
  }

  return (
    <div className={`min-h-screen p-4 md:p-8 pt-24 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className="max-w-6xl mx-auto space-y-6">
        <TooltipProvider>
          <EnrollmentFormControl configId={configId} isDarkMode={isDarkMode} />
        </TooltipProvider>
      </div>
    </div>
  )
}
