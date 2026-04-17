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
  closePortalWhenFull?: boolean
  slotDisplayMode?: string
  onClosePortalChange?: (v: boolean) => void
  onSlotDisplayChange?: (v: string) => void
}

export function CapacityGuardian({
  capacity,
  currentAccepted,
  capacityPercentage,
  isDarkMode,
  updating,
  onCapacityChange,
  onIntegrityScan,
  closePortalWhenFull = true,
  slotDisplayMode = "grade11",
  onClosePortalChange,
  onSlotDisplayChange
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
            Per-Grade Capacity (G11/G12 independently)
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <ThemedText variant="label" className="text-[10px] font-bold uppercase tracking-wide" isDarkMode={isDarkMode}>
              Auto-Close Threshold
            </ThemedText>
            <div className={`p-4 rounded-3xl border transition-all duration-500 flex items-center justify-between gap-4 ${isDarkMode ? "bg-slate-900 border-slate-700/60" : "bg-white border-slate-200"}`}>
              <div className="flex flex-col">
                <span className={`text-xs font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Close Portal When Full</span>
                <span className={`text-[9px] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Automatically lock enrollment if limit reached</span>
              </div>
              <button
                type="button"
                disabled={updating}
                onClick={() => onClosePortalChange?.(!closePortalWhenFull)}
                role="switch"
                aria-checked={closePortalWhenFull}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 flex-shrink-0 disabled:opacity-50 ${closePortalWhenFull ? "bg-red-500" : isDarkMode ? "bg-slate-600" : "bg-slate-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${closePortalWhenFull ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <ThemedText variant="label" className="text-[10px] font-bold uppercase tracking-wide" isDarkMode={isDarkMode}>
              Slot Display Mode
            </ThemedText>
            <div className={`p-1.5 rounded-3xl border flex transition-all duration-500 ${isDarkMode ? "bg-slate-900 border-slate-700/60" : "bg-white border-slate-200"}`}>
              {[{ id: 'grade11', label: 'G11 Only' }, { id: 'grade11_12', label: 'G11+12' }, { id: 'total', label: 'Total' }].map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  disabled={updating}
                  onClick={() => onSlotDisplayChange?.(mode.id)}
                  className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-[20px] transition-all duration-300 ${slotDisplayMode === mode.id ? (isDarkMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-500 text-white shadow-md') : (isDarkMode ? 'text-slate-500 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full bg-slate-950 p-8 rounded-[36px] text-white relative overflow-hidden shadow-2xl border border-slate-700">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -mr-10 -mt-10" />
          <div className="flex justify-between items-end mb-4 relative z-10">
            <div>
              <span className="text-[10px] font-bold uppercase text-blue-400 tracking-wide">System Total (G11 + G12)</span>
              <p className="text-2xl font-bold mt-1">
                {currentAccepted} <span className="text-slate-500 text-sm">/ {capacity ? Number(capacity) * 2 : "—"} Seats</span>
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

