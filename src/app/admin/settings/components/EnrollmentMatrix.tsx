"use client"

import { CalendarDays, Eraser } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemedCard } from "@/components/ThemedCard"
import { ThemedText } from "@/components/ThemedText"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { themeColors } from "@/lib/themeColors"

interface EnrollmentMatrixProps {
  schoolYear: string
  startDate: string
  endDate: string
  controlMode: "automatic" | "manual"
  isDarkMode: boolean
  onSchoolYearChange: (value: string) => void
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onClearFields: () => void
}

export function EnrollmentMatrix({
  schoolYear,
  startDate,
  endDate,
  controlMode,
  isDarkMode,
  onSchoolYearChange,
  onStartDateChange,
  onEndDateChange,
  onClearFields
}: EnrollmentMatrixProps) {
  return (
    <ThemedCard 
      className={`p-10 rounded-[48px] space-y-8 transition-all duration-500 border ${controlMode !== 'automatic' ? 'opacity-60 border-blue-900 pointer-events-none' : 'opacity-100 border-blue-400'}`}
      style={{
        backgroundColor: isDarkMode ? themeColors.dark.surface : '#ffffff',
        borderColor: controlMode === 'automatic' ? 'rgb(96 165 250)' : (isDarkMode ? 'rgb(30 58 138)' : 'rgb(191 219 254)')
      }}
    >
      <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500 text-white rounded-xl">
            <CalendarDays size={20} />
          </div>
          <ThemedText variant="h3" className="text-xs font-bold uppercase tracking-wide" isDarkMode={isDarkMode}>
            Enrollment Matrix
          </ThemedText>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearFields} 
              className="text-[9px] font-bold uppercase text-slate-400 hover:text-red-600 transition-colors"
            >
              <Eraser size={14} className="mr-2"/> Clear Fields
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800">
            <p>Reset date and year fields</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <ThemedText variant="label" className="text-[10px] font-bold uppercase tracking-wide" isDarkMode={isDarkMode}>
            Target School Year
          </ThemedText>
          <Input 
            value={schoolYear} 
            onChange={(e) => onSchoolYearChange(e.target.value)} 
            className="h-14 rounded-2xl border-slate-200 dark:border-slate-800 font-bold text-base uppercase focus-visible:ring-blue-500 transition-all duration-500" 
            placeholder="2025-2026" 
            style={{ backgroundColor: isDarkMode ? 'rgb(30 41 59)' : 'rgb(241 245 249)', color: isDarkMode ? '#ffffff' : '#000000' }}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <ThemedText variant="label" className="text-[10px] font-bold uppercase tracking-wide" isDarkMode={isDarkMode}>
              Enrollment Launch
            </ThemedText>
            <Input 
              type="date" 
              value={startDate} 
              onChange={(e) => onStartDateChange(e.target.value)} 
              className="h-12 rounded-xl border-none font-bold text-xs transition-all duration-500" 
              style={{ backgroundColor: isDarkMode ? 'rgb(30 41 59)' : 'rgb(241 245 249)', color: isDarkMode ? '#ffffff' : '#000000' }}
            />
          </div>
          <div className="space-y-2">
            <ThemedText variant="label" className="text-[10px] font-bold uppercase tracking-wide" isDarkMode={isDarkMode}>
              Enrollment Expiration
            </ThemedText>
            <Input 
              type="date" 
              value={endDate} 
              onChange={(e) => onEndDateChange(e.target.value)} 
              className="h-12 rounded-xl border-none font-bold text-xs transition-all duration-500" 
              style={{ backgroundColor: isDarkMode ? 'rgb(30 41 59)' : 'rgb(241 245 249)', color: isDarkMode ? '#ffffff' : '#000000' }}
            />
          </div>
        </div>
      </div>
    </ThemedCard>
  )
}

