"use client"

import { Cpu } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { ThemedCard } from "@/components/ThemedCard"
import { ThemedText } from "@/components/ThemedText"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { themeColors } from "@/lib/themeColors"

interface SystemLogicModeProps {
  controlMode: "automatic" | "manual"
  isDarkMode: boolean
  updating: boolean
  onModeToggle: (isManual: boolean) => void
}

export function SystemLogicMode({ 
  controlMode, 
  isDarkMode, 
  updating, 
  onModeToggle 
}: SystemLogicModeProps) {
  return (
    <ThemedCard 
      className={`p-8 rounded-[40px] flex items-center justify-between group transition-all duration-500 ${controlMode === 'manual' ? 'border border-purple-500' : 'border border-blue-400'}`}
      style={{
        backgroundColor: isDarkMode ? themeColors.dark.surface : '#ffffff',
        borderColor: controlMode === 'manual' ? undefined : (isDarkMode ? themeColors.dark.border : 'rgb(96 165 250)')
      }}
    >
      <div className="flex items-center gap-4">
        <div className={`p-4 rounded-2xl transition-all duration-500 ${controlMode === 'automatic' ? 'bg-blue-400 text-white' : 'bg-purple-600 text-white'}`}>
          <Cpu size={24} />
        </div>
        <div>
          <ThemedText variant="h3" className="font-bold uppercase tracking-wide" style={{ fontSize: '14px', lineHeight: '20px' }} isDarkMode={isDarkMode}>
            System Logic Mode
          </ThemedText>
          <ThemedText variant="caption" className="italic font-medium text-[10px]" isDarkMode={isDarkMode}>
            {controlMode === 'automatic' ? 'Schedule Automation' : 'Administrative Override'}
          </ThemedText>
        </div>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Switch 
              checked={controlMode === 'manual'} 
              onCheckedChange={onModeToggle} 
              disabled={updating} 
              className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-slate-400 dark:data-[state=unchecked]:bg-slate-600 shadow-sm border border-slate-200 dark:border-slate-700" 
            />
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white border-slate-800">
          <p>Toggle between automatic scheduling and manual control</p>
        </TooltipContent>
      </Tooltip>
    </ThemedCard>
  )
}

