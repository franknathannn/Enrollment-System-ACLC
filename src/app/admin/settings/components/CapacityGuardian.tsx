"use client"

import { Users, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemedCard } from "@/components/ThemedCard"
import { ThemedText } from "@/components/ThemedText"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { themeColors } from "@/lib/themeColors"

interface CapacityGuardianProps {
  capacity: string | number
  currentAccepted: number
  capacityPercentage: number
  isDarkMode: boolean
  updating: boolean
  onCapacityChange: (value: string | number) => void
  onIntegrityScan: () => void
}

export function CapacityGuardian({
  capacity,
  currentAccepted,
  capacityPercentage,
  isDarkMode,
  updating,
  onCapacityChange,
  onIntegrityScan
}: CapacityGuardianProps) {
  return (
    <ThemedCard
      className="p-10 rounded-[48px] space-y-8 border transition-all duration-500"
      style={{
        backgroundColor: isDarkMode ? themeColors.dark.surface : '#ffffff',
        borderColor: isDarkMode ? themeColors.dark.border : 'rgb(226 232 240)'
      }}
    >
      <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: '#9333ea', color: 'white' }}>
            <Users size={20} />
          </div>
          <ThemedText variant="h3" className="text-xs font-bold uppercase tracking-wide" isDarkMode={isDarkMode}>
            School Student Capacity
          </ThemedText>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onIntegrityScan}
              disabled={updating}
              variant="outline"
              className="rounded-full text-[9px] font-bold uppercase border-red-100 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shadow-sm transition-all active:scale-95"
            >
              <ShieldAlert size={14} className="mr-2" /> Integrity Scan
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800">
            <p>Check if current enrollment exceeds capacity</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="space-y-8">
        <div className="space-y-3">
          <ThemedText variant="label" className="text-[10px] font-bold uppercase tracking-wide" isDarkMode={isDarkMode}>
            School Capacity (MORE THAN 50)
          </ThemedText>
          <Input
            type="text"
            value={capacity === 0 || capacity === null ? "" : capacity}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || val === " ") {
                onCapacityChange("");
              } else {
                const parsed = parseInt(val);
                if (!isNaN(parsed)) onCapacityChange(parsed);
              }
            }}
            className="h-16 rounded-3xl border-none font-bold text-2xl px-8 focus-visible:ring-indigo-500 shadow-inner transition-all duration-500"
            placeholder="50+"
            style={{ backgroundColor: isDarkMode ? 'rgb(30 41 59)' : 'rgb(241 245 249)', color: isDarkMode ? '#ffffff' : '#000000' }}
          />
        </div>

        <div className="w-full bg-slate-950 p-8 rounded-[36px] text-white relative overflow-hidden shadow-2xl border border-slate-700">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -mr-10 -mt-10" />
          <div className="flex justify-between items-end mb-4 relative z-10">
            <div>
              <span className="text-[10px] font-bold uppercase text-blue-400 tracking-wide">Current Capacity</span>
              <p className="text-2xl font-bold mt-1">
                {currentAccepted} <span className="text-slate-500 text-sm">/ {capacity || "—"} Seats</span>
              </p>
            </div>
            <span className="text-xl font-bold text-white">{Math.round(capacityPercentage)}%</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden shadow-inner relative z-10">
            <div
              className={`h-full transition-all duration-1000 ease-out ${capacityPercentage > 95 ? 'bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
                  capacityPercentage > 80 ? 'bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)]' :
                    'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                }`}
              style={{ width: `${capacityPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </ThemedCard>
  )
}

