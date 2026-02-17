"use client"

import { Globe } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { ThemedCard } from "@/components/ThemedCard"
import { ThemedText } from "@/components/ThemedText"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { themeColors } from "@/lib/themeColors"

interface ManualPortalOverrideProps {
  isOpen: boolean
  controlMode: "automatic" | "manual"
  isDarkMode: boolean
  updating: boolean
  onToggle: (checked: boolean) => void
}

export function ManualPortalOverride({ 
  isOpen, 
  controlMode, 
  isDarkMode, 
  updating, 
  onToggle 
}: ManualPortalOverrideProps) {
  return (
    <ThemedCard 
      className={`p-8 rounded-[40px] flex items-center justify-between transition-all duration-500 border ${controlMode !== 'manual' ? 'opacity-30 grayscale pointer-events-none' : (isOpen ? 'opacity-100 border border-green-400' : 'opacity-100 border border-green-200')}`}
      style={{
        backgroundColor: isDarkMode ? themeColors.dark.surface : '#ffffff',
        borderColor: (controlMode === 'manual' && isOpen) ? undefined : (isDarkMode ? themeColors.dark.border : 'rgb(226 232 240)')
      }}
    >
      <div className="flex items-center gap-4">
        <div className={`p-4 rounded-2xl ${isOpen ? 'bg-green-500 text-white' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
          <Globe size={24} />
        </div>
        <div>
          <ThemedText variant="h3" className="font-bold uppercase tracking-wide" style={{ fontSize: '14px', lineHeight: '20px' }} isDarkMode={isDarkMode}>
            Manual Portal Override
          </ThemedText>
          <ThemedText variant="caption" className="italic font-medium text-[10px]" isDarkMode={isDarkMode}>
            Forced Bypass Control
          </ThemedText>
        </div>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Switch 
              checked={isOpen} 
              onCheckedChange={onToggle} 
              disabled={updating} 
              className="data-[state=checked]:bg-green-500 shadow-sm border border-slate-200 dark:border-slate-700" 
            />
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white border-slate-800">
          <p>Force open/close the enrollment portal immediately</p>
        </TooltipContent>
      </Tooltip>
    </ThemedCard>
  )
}

