"use client"

import { Loader2, Save, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface SettingsActionsProps {
  isSaving: boolean
  isSyncing: boolean
  onSave: () => void
  onSync: () => void
}

export function SettingsActions({
  isSaving,
  isSyncing,
  onSave,
  onSync
}: SettingsActionsProps) {
  return (
    <div className="pt-6">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            onClick={onSave} 
            disabled={isSaving} 
            className="w-full h-20 rounded-[32px] bg-blue-600 dark:bg-slate-900 hover:bg-blue-700 dark:hover:bg-black text-white font-bold uppercase tracking-widest text-xs shadow-2xl transition-all hover:-translate-y-1 active:scale-95 shadow-blue-500/20"
          >
            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={20} />} 
            Commit Protocol Configuration
          </Button>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white border-slate-800">
          <p>Save changes to system configuration</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

